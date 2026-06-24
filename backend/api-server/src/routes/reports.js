import { Router } from "express";
import { eq, and, sql, desc, lte } from "drizzle-orm";
import { db, usageLogsTable, suppliesTable, classroomsTable, requestsTable } from "@workspace/db";
import { authenticate, requireRole } from "../middlewares/auth";
import { GetUsageReportQueryParams } from "@workspace/api-zod";
const router = Router();
// GET /api/reports/usage (admin only)
router.get("/usage", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
        const query = GetUsageReportQueryParams.safeParse({
            period: req.query.period,
            classroomId: req.query.classroomId ? Number(req.query.classroomId) : undefined,
        });
        if (!query.success)
            return res.status(400).json({ error: "Invalid query parameters" });
        const { period, classroomId } = query.data;
        const conditions = [];
        if (classroomId) {
            conditions.push(eq(usageLogsTable.classroomId, classroomId));
        }
        const rows = await db
            .select({
            id: usageLogsTable.id,
            supplyId: usageLogsTable.supplyId,
            supplyName: suppliesTable.name,
            classroomId: usageLogsTable.classroomId,
            classroomName: classroomsTable.name,
            quantityUsed: usageLogsTable.quantityUsed,
            usedAt: usageLogsTable.usedAt,
        })
            .from(usageLogsTable)
            .innerJoin(suppliesTable, eq(usageLogsTable.supplyId, suppliesTable.id))
            .leftJoin(classroomsTable, eq(usageLogsTable.classroomId, classroomsTable.id))
            .where(conditions.length ? (conditions.length === 1 ? conditions[0] : and(...conditions)) : undefined)
            .orderBy(desc(usageLogsTable.usedAt));
        // Group logs based on period
        const groups = {};
        for (const r of rows) {
            const date = new Date(r.usedAt);
            let dateKey = date.toISOString().split("T")[0]; // Daily default
            if (period === "weekly") {
                // Find start of week (Sunday)
                const day = date.getDay();
                const diff = date.getDate() - day;
                const sunday = new Date(date.setDate(diff));
                dateKey = sunday.toISOString().split("T")[0];
            }
            else if (period === "monthly") {
                const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
                dateKey = firstOfMonth.toISOString().split("T")[0];
            }
            if (!groups[dateKey]) {
                groups[dateKey] = {
                    date: dateKey,
                    quantityUsed: 0,
                    supplyName: r.supplyName,
                    classroomName: r.classroomName || "General / Admin",
                };
            }
            groups[dateKey].quantityUsed += Number(r.quantityUsed);
        }
        const formatted = Object.values(groups).sort((a, b) => a.date.localeCompare(b.date));
        return res.json(formatted);
    }
    catch (err) {
        req.log.error({ err }, "getUsageReport error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
// GET /api/reports/low-stock (admin only)
router.get("/low-stock", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
        const rows = await db
            .select()
            .from(suppliesTable)
            .where(lte(suppliesTable.quantity, suppliesTable.reorderThreshold));
        return res.json(rows.map((r) => ({
            ...r,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(),
        })));
    }
    catch (err) {
        req.log.error({ err }, "getLowStockReport error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
// GET /api/reports/most-requested (admin only)
router.get("/most-requested", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
        const rows = await db
            .select({
            supplyId: requestsTable.supplyId,
            supplyName: suppliesTable.name,
            totalRequested: sql `sum(${requestsTable.requestedQuantity})`,
            totalApproved: sql `sum(coalesce(${requestsTable.approvedQuantity}, 0))`,
        })
            .from(requestsTable)
            .innerJoin(suppliesTable, eq(requestsTable.supplyId, suppliesTable.id))
            .groupBy(requestsTable.supplyId, suppliesTable.name)
            .orderBy(desc(sql `sum(${requestsTable.requestedQuantity})`));
        return res.json(rows.map((r) => ({
            supplyId: r.supplyId,
            supplyName: r.supplyName,
            totalRequested: Number(r.totalRequested),
            totalApproved: Number(r.totalApproved),
        })));
    }
    catch (err) {
        req.log.error({ err }, "getMostRequestedReport error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
export default router;
