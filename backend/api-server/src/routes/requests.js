import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, requestsTable, suppliesTable, classroomSuppliesTable, classroomsTable, notificationsTable, usersTable } from "@workspace/db";
import { CreateRequestBody, ApproveRequestBody, RejectRequestBody, ListRequestsQueryParams } from "@workspace/api-zod";
import { authenticate, requireRole } from "../middlewares/auth";
const router = Router();
// GET /api/requests
router.get("/", authenticate, async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: "Unauthorized" });
        const query = ListRequestsQueryParams.safeParse({
            classroomId: req.query.classroomId ? Number(req.query.classroomId) : undefined,
            status: req.query.status,
        });
        if (!query.success)
            return res.status(400).json({ error: "Invalid query params" });
        const { classroomId, status } = query.data;
        const conditions = [];
        if (req.user.role === "teacher") {
            conditions.push(eq(requestsTable.classroomId, req.user.classroomId || 0));
        }
        else if (classroomId) {
            conditions.push(eq(requestsTable.classroomId, classroomId));
        }
        if (status) {
            conditions.push(eq(requestsTable.status, status));
        }
        const rows = await db
            .select({
            id: requestsTable.id,
            classroomId: requestsTable.classroomId,
            classroomName: classroomsTable.name,
            supplyId: requestsTable.supplyId,
            supplyName: suppliesTable.name,
            requestedQuantity: requestsTable.requestedQuantity,
            approvedQuantity: requestsTable.approvedQuantity,
            status: requestsTable.status,
            remarks: requestsTable.remarks,
            requestedAt: requestsTable.requestedAt,
            approvedAt: requestsTable.approvedAt,
        })
            .from(requestsTable)
            .innerJoin(classroomsTable, eq(requestsTable.classroomId, classroomsTable.id))
            .innerJoin(suppliesTable, eq(requestsTable.supplyId, suppliesTable.id))
            .where(conditions.length ? (conditions.length === 1 ? conditions[0] : and(...conditions)) : undefined)
            .orderBy(desc(requestsTable.requestedAt));
        return res.json(rows.map((r) => ({
            ...r,
            requestedAt: r.requestedAt.toISOString(),
            approvedAt: r.approvedAt ? r.approvedAt.toISOString() : null,
        })));
    }
    catch (err) {
        req.log.error({ err }, "listRequests error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
// POST /api/requests
router.post("/", authenticate, async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: "Unauthorized" });
        if (req.user.role !== "teacher" && req.user.role !== "admin") {
            return res.status(403).json({ error: "Forbidden: Only teachers or admins can submit supply requests" });
        }
        let targetClassroomId;
        if (req.user.role === "admin") {
            const cid = req.body.classroomId ? Number(req.body.classroomId) : undefined;
            if (!cid) {
                return res.status(400).json({ error: "classroomId is required for admin requests" });
            }
            targetClassroomId = cid;
        }
        else {
            if (!req.user.classroomId) {
                return res.status(400).json({ error: "No classroom assigned to this teacher account" });
            }
            targetClassroomId = req.user.classroomId;
        }
        const body = CreateRequestBody.safeParse(req.body);
        if (!body.success)
            return res.status(400).json({ error: body.error.message });
        const { supplyId, requestedQuantity } = body.data;
        // Check if supply exists
        const [supply] = await db.select().from(suppliesTable).where(eq(suppliesTable.id, supplyId));
        if (!supply)
            return res.status(404).json({ error: "Supply not found" });
        const [newRequest] = await db
            .insert(requestsTable)
            .values({
            classroomId: targetClassroomId,
            supplyId,
            requestedQuantity,
            status: "pending",
        })
            .returning();
        // Create notification for admin
        const [classroomNameRow] = await db
            .select({ name: classroomsTable.name })
            .from(classroomsTable)
            .where(eq(classroomsTable.id, targetClassroomId));
        await db.insert(notificationsTable).values({
            userId: null, // Broadcast to admin
            message: `New request for ${requestedQuantity} ${supply.unit}(s) of ${supply.name} submitted by ${classroomNameRow?.name || "classroom"}`,
            type: "new_request",
        });
        // Query request details to return properly serialized
        const [row] = await db
            .select({
            id: requestsTable.id,
            classroomId: requestsTable.classroomId,
            classroomName: classroomsTable.name,
            supplyId: requestsTable.supplyId,
            supplyName: suppliesTable.name,
            requestedQuantity: requestsTable.requestedQuantity,
            approvedQuantity: requestsTable.approvedQuantity,
            status: requestsTable.status,
            remarks: requestsTable.remarks,
            requestedAt: requestsTable.requestedAt,
            approvedAt: requestsTable.approvedAt,
        })
            .from(requestsTable)
            .innerJoin(classroomsTable, eq(requestsTable.classroomId, classroomsTable.id))
            .innerJoin(suppliesTable, eq(requestsTable.supplyId, suppliesTable.id))
            .where(eq(requestsTable.id, newRequest.id));
        return res.status(201).json({
            ...row,
            requestedAt: row.requestedAt.toISOString(),
            approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
        });
    }
    catch (err) {
        req.log.error({ err }, "createRequest error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
// POST /api/requests/:id/approve
router.post("/:id/approve", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
        const requestId = Number(req.params.id);
        if (isNaN(requestId))
            return res.status(400).json({ error: "Invalid request ID" });
        const body = ApproveRequestBody.safeParse(req.body);
        const parsedData = body.success ? body.data : {};
        const [request] = await db.select().from(requestsTable).where(eq(requestsTable.id, requestId));
        if (!request)
            return res.status(404).json({ error: "Request not found" });
        if (request.status !== "pending") {
            return res.status(400).json({ error: "Request has already been processed" });
        }
        const approvedQuantity = parsedData.approvedQuantity !== undefined ? parsedData.approvedQuantity : request.requestedQuantity;
        const remarks = parsedData.remarks ?? null;
        // Check inventory stock
        const [supply] = await db.select().from(suppliesTable).where(eq(suppliesTable.id, request.supplyId));
        if (!supply)
            return res.status(404).json({ error: "Supply not found" });
        if (supply.quantity < approvedQuantity) {
            return res.status(400).json({ error: `Insufficient inventory stock. Only ${supply.quantity} ${supply.unit}(s) available.` });
        }
        // Decrease global supply quantity
        const newGlobalQty = supply.quantity - approvedQuantity;
        await db
            .update(suppliesTable)
            .set({ quantity: newGlobalQty, updatedAt: new Date() })
            .where(eq(suppliesTable.id, request.supplyId));
        // Increase classroom local stock (classroomSuppliesTable)
        const [existingAlloc] = await db
            .select()
            .from(classroomSuppliesTable)
            .where(and(eq(classroomSuppliesTable.classroomId, request.classroomId), eq(classroomSuppliesTable.supplyId, request.supplyId)));
        if (existingAlloc) {
            await db
                .update(classroomSuppliesTable)
                .set({
                quantity: existingAlloc.quantity + approvedQuantity,
                updatedAt: new Date(),
            })
                .where(eq(classroomSuppliesTable.id, existingAlloc.id));
        }
        else {
            await db.insert(classroomSuppliesTable).values({
                classroomId: request.classroomId,
                supplyId: request.supplyId,
                quantity: approvedQuantity,
            });
        }
        // Update request status to approved
        await db
            .update(requestsTable)
            .set({
            status: "approved",
            approvedQuantity,
            remarks,
            approvedAt: new Date(),
        })
            .where(eq(requestsTable.id, requestId));
        // Find teacher associated with this classroom
        const [teacher] = await db
            .select({ id: usersTable.id })
            .from(usersTable)
            .where(eq(usersTable.classroomId, request.classroomId));
        if (teacher) {
            // Create notification for teacher
            await db.insert(notificationsTable).values({
                userId: teacher.id,
                message: `Your request for ${request.requestedQuantity} ${supply.unit}(s) of ${supply.name} has been APPROVED (Allocated: ${approvedQuantity}).`,
                type: "request_approved",
            });
            await db.insert(notificationsTable).values({
                userId: teacher.id,
                message: `${approvedQuantity} ${supply.unit}(s) of ${supply.name} assigned to your classroom.`,
                type: "stock_assigned",
            });
        }
        // Trigger low stock warning if applicable
        if (newGlobalQty <= supply.reorderThreshold) {
            await db.insert(notificationsTable).values({
                userId: null,
                message: `Global inventory alert: ${supply.name} is low on stock (${newGlobalQty} ${supply.unit}(s) remaining).`,
                type: "low_stock",
            });
        }
        const [row] = await db
            .select({
            id: requestsTable.id,
            classroomId: requestsTable.classroomId,
            classroomName: classroomsTable.name,
            supplyId: requestsTable.supplyId,
            supplyName: suppliesTable.name,
            requestedQuantity: requestsTable.requestedQuantity,
            approvedQuantity: requestsTable.approvedQuantity,
            status: requestsTable.status,
            remarks: requestsTable.remarks,
            requestedAt: requestsTable.requestedAt,
            approvedAt: requestsTable.approvedAt,
        })
            .from(requestsTable)
            .innerJoin(classroomsTable, eq(requestsTable.classroomId, classroomsTable.id))
            .innerJoin(suppliesTable, eq(requestsTable.supplyId, suppliesTable.id))
            .where(eq(requestsTable.id, requestId));
        return res.json({
            ...row,
            requestedAt: row.requestedAt.toISOString(),
            approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
        });
    }
    catch (err) {
        req.log.error({ err }, "approveRequest error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
// POST /api/requests/:id/reject
router.post("/:id/reject", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
        const requestId = Number(req.params.id);
        if (isNaN(requestId))
            return res.status(400).json({ error: "Invalid request ID" });
        const body = RejectRequestBody.safeParse(req.body);
        const parsedData = body.success ? body.data : {};
        const remarks = parsedData.remarks ?? null;
        const [request] = await db.select().from(requestsTable).where(eq(requestsTable.id, requestId));
        if (!request)
            return res.status(404).json({ error: "Request not found" });
        if (request.status !== "pending") {
            return res.status(400).json({ error: "Request has already been processed" });
        }
        // Update request status to rejected
        await db
            .update(requestsTable)
            .set({
            status: "rejected",
            remarks,
            approvedAt: new Date(),
        })
            .where(eq(requestsTable.id, requestId));
        const [supply] = await db.select({ name: suppliesTable.name }).from(suppliesTable).where(eq(suppliesTable.id, request.supplyId));
        // Find teacher
        const [teacher] = await db
            .select({ id: usersTable.id })
            .from(usersTable)
            .where(eq(usersTable.classroomId, request.classroomId));
        if (teacher) {
            await db.insert(notificationsTable).values({
                userId: teacher.id,
                message: `Your request for ${request.requestedQuantity} of ${supply?.name || "supplies"} has been REJECTED.${remarks ? ` Remarks: ${remarks}` : ""}`,
                type: "request_rejected",
            });
        }
        const [row] = await db
            .select({
            id: requestsTable.id,
            classroomId: requestsTable.classroomId,
            classroomName: classroomsTable.name,
            supplyId: requestsTable.supplyId,
            supplyName: suppliesTable.name,
            requestedQuantity: requestsTable.requestedQuantity,
            approvedQuantity: requestsTable.approvedQuantity,
            status: requestsTable.status,
            remarks: requestsTable.remarks,
            requestedAt: requestsTable.requestedAt,
            approvedAt: requestsTable.approvedAt,
        })
            .from(requestsTable)
            .innerJoin(classroomsTable, eq(requestsTable.classroomId, classroomsTable.id))
            .innerJoin(suppliesTable, eq(requestsTable.supplyId, suppliesTable.id))
            .where(eq(requestsTable.id, requestId));
        return res.json({
            ...row,
            requestedAt: row.requestedAt.toISOString(),
            approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
        });
    }
    catch (err) {
        req.log.error({ err }, "rejectRequest error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
export default router;
