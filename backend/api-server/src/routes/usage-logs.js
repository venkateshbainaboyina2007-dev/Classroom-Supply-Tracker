import { Router } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, usageLogsTable, suppliesTable, classroomsTable, classroomSuppliesTable } from "@workspace/db";
import { CreateUsageLogBody, ListUsageLogsQueryParams, GetUsageLogParams, DeleteUsageLogParams, } from "@workspace/api-zod";
import { authenticate, requireRole } from "../middlewares/auth";
const router = Router();
router.get("/", authenticate, async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: "Unauthorized" });
        const query = ListUsageLogsQueryParams.safeParse({
            supplyId: req.query.supplyId ? Number(req.query.supplyId) : undefined,
            classroomId: req.query.classroomId ? Number(req.query.classroomId) : undefined,
            limit: req.query.limit ? Number(req.query.limit) : undefined,
        });
        if (!query.success)
            return res.status(400).json({ error: "Invalid query params" });
        const { supplyId, classroomId, limit } = query.data;
        const conditions = [];
        if (supplyId)
            conditions.push(eq(usageLogsTable.supplyId, supplyId));
        if (req.user.role === "teacher") {
            conditions.push(eq(usageLogsTable.classroomId, req.user.classroomId || 0));
        }
        else if (classroomId) {
            conditions.push(eq(usageLogsTable.classroomId, classroomId));
        }
        let q = db
            .select({
            id: usageLogsTable.id,
            supplyId: usageLogsTable.supplyId,
            supplyName: suppliesTable.name,
            classroomId: usageLogsTable.classroomId,
            classroomName: classroomsTable.name,
            quantityUsed: usageLogsTable.quantityUsed,
            usedBy: usageLogsTable.usedBy,
            notes: usageLogsTable.notes,
            usedAt: usageLogsTable.usedAt,
        })
            .from(usageLogsTable)
            .innerJoin(suppliesTable, eq(usageLogsTable.supplyId, suppliesTable.id))
            .leftJoin(classroomsTable, eq(usageLogsTable.classroomId, classroomsTable.id))
            .orderBy(desc(usageLogsTable.usedAt))
            .$dynamic();
        if (conditions.length > 0) {
            q = q.where(conditions.length === 1 ? conditions[0] : and(...conditions));
        }
        if (limit) {
            q = q.limit(limit);
        }
        const rows = await q;
        return res.json(rows.map((r) => ({
            ...r,
            usedAt: r.usedAt.toISOString(),
        })));
    }
    catch (err) {
        req.log.error({ err }, "listUsageLogs error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
router.post("/", authenticate, async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: "Unauthorized" });
        const body = CreateUsageLogBody.safeParse(req.body);
        if (!body.success)
            return res.status(400).json({ error: body.error.message });
        const [supply] = await db
            .select()
            .from(suppliesTable)
            .where(eq(suppliesTable.id, body.data.supplyId));
        if (!supply)
            return res.status(404).json({ error: "Supply not found" });
        const classroomId = req.user.role === "teacher" ? req.user.classroomId : (body.data.classroomId ?? null);
        const type = req.body.type || "usage"; // Supports 'usage' or 'damaged'
        if (classroomId) {
            // Teachers (or admins specifying classroomId) decrement from classroom supplies stock
            const [classroomAlloc] = await db
                .select()
                .from(classroomSuppliesTable)
                .where(and(eq(classroomSuppliesTable.classroomId, classroomId), eq(classroomSuppliesTable.supplyId, body.data.supplyId)));
            if (!classroomAlloc || classroomAlloc.quantity < body.data.quantityUsed) {
                return res.status(400).json({
                    error: `Insufficient classroom allocation. Available: ${classroomAlloc?.quantity ?? 0} ${supply.unit}(s).`,
                });
            }
            await db
                .update(classroomSuppliesTable)
                .set({
                quantity: classroomAlloc.quantity - body.data.quantityUsed,
                updatedAt: new Date(),
            })
                .where(eq(classroomSuppliesTable.id, classroomAlloc.id));
        }
        else {
            // General usage (Admins only) decreases global inventory directly
            if (req.user.role !== "admin") {
                return res.status(403).json({ error: "Forbidden: Teachers must log usage against their classroom allocation." });
            }
            if (supply.quantity < body.data.quantityUsed) {
                return res.status(400).json({ error: `Insufficient inventory stock. Available: ${supply.quantity} ${supply.unit}(s).` });
            }
            await db
                .update(suppliesTable)
                .set({
                quantity: supply.quantity - body.data.quantityUsed,
                updatedAt: new Date(),
            })
                .where(eq(suppliesTable.id, body.data.supplyId));
        }
        const [log] = await db
            .insert(usageLogsTable)
            .values({
            supplyId: body.data.supplyId,
            classroomId,
            quantityUsed: body.data.quantityUsed,
            usedBy: body.data.usedBy,
            notes: body.data.notes ?? null,
            type,
        })
            .returning();
        let classroomName = null;
        if (classroomId) {
            const [cls] = await db
                .select({ name: classroomsTable.name })
                .from(classroomsTable)
                .where(eq(classroomsTable.id, classroomId));
            classroomName = cls?.name ?? null;
        }
        return res.status(201).json({
            id: log.id,
            supplyId: log.supplyId,
            supplyName: supply.name,
            classroomId: log.classroomId,
            classroomName,
            quantityUsed: log.quantityUsed,
            usedBy: log.usedBy,
            notes: log.notes,
            usedAt: log.usedAt.toISOString(),
        });
    }
    catch (err) {
        req.log.error({ err }, "createUsageLog error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
router.get("/:id", authenticate, async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: "Unauthorized" });
        const params = GetUsageLogParams.safeParse({ id: Number(req.params.id) });
        if (!params.success)
            return res.status(400).json({ error: "Invalid id" });
        const [row] = await db
            .select({
            id: usageLogsTable.id,
            supplyId: usageLogsTable.supplyId,
            supplyName: suppliesTable.name,
            classroomId: usageLogsTable.classroomId,
            classroomName: classroomsTable.name,
            quantityUsed: usageLogsTable.quantityUsed,
            usedBy: usageLogsTable.usedBy,
            notes: usageLogsTable.notes,
            usedAt: usageLogsTable.usedAt,
        })
            .from(usageLogsTable)
            .innerJoin(suppliesTable, eq(usageLogsTable.supplyId, suppliesTable.id))
            .leftJoin(classroomsTable, eq(usageLogsTable.classroomId, classroomsTable.id))
            .where(eq(usageLogsTable.id, params.data.id));
        if (!row)
            return res.status(404).json({ error: "Usage log not found" });
        // Teacher visibility check
        if (req.user.role === "teacher" && row.classroomId !== req.user.classroomId) {
            return res.status(403).json({ error: "Forbidden: You do not have access to this log entry" });
        }
        return res.json({
            ...row,
            usedAt: row.usedAt.toISOString(),
        });
    }
    catch (err) {
        req.log.error({ err }, "getUsageLog error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
router.delete("/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
        const params = DeleteUsageLogParams.safeParse({ id: Number(req.params.id) });
        if (!params.success)
            return res.status(400).json({ error: "Invalid id" });
        await db.delete(usageLogsTable).where(eq(usageLogsTable.id, params.data.id));
        return res.status(204).end();
    }
    catch (err) {
        req.log.error({ err }, "deleteUsageLog error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
export default router;
