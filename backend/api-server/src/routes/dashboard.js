import { Router } from "express";
import { eq, sql, desc } from "drizzle-orm";
import { db, suppliesTable, usageLogsTable } from "@workspace/db";
import { GetRecentActivityQueryParams } from "@workspace/api-zod";
import { authenticate } from "../middlewares/auth";
const router = Router();
router.get("/summary", authenticate, async (req, res) => {
    try {
        const allSupplies = await db.select().from(suppliesTable);
        const totalSupplies = allSupplies.length;
        const lowStockCount = allSupplies.filter((s) => Number(s.quantity) <= Number(s.reorderThreshold) && Number(s.quantity) > 0).length;
        const outOfStockCount = allSupplies.filter((s) => Number(s.quantity) === 0).length;
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
        const logsToday = await db
            .select({ count: sql `count(*)` })
            .from(usageLogsTable)
            .where(sql `${usageLogsTable.usedAt} >= ${startOfToday.toISOString()}`);
        const totalUsageToday = Number(logsToday[0]?.count ?? 0);
        const logsWeek = await db
            .select({ count: sql `count(*)` })
            .from(usageLogsTable)
            .where(sql `${usageLogsTable.usedAt} >= ${startOfWeek.toISOString()}`);
        const totalUsageThisWeek = Number(logsWeek[0]?.count ?? 0);
        const categoryMap = {};
        for (const s of allSupplies) {
            categoryMap[s.category] = (categoryMap[s.category] ?? 0) + 1;
        }
        const categoryCounts = Object.entries(categoryMap).map(([category, count]) => ({ category, count }));
        return res.json({
            totalSupplies,
            lowStockCount,
            outOfStockCount,
            totalUsageToday,
            totalUsageThisWeek,
            categoryCounts,
        });
    }
    catch (err) {
        req.log.error({ err }, "getDashboardSummary error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
router.get("/recent-activity", authenticate, async (req, res) => {
    try {
        const query = GetRecentActivityQueryParams.safeParse({
            limit: req.query.limit ? Number(req.query.limit) : undefined,
        });
        if (!query.success)
            return res.status(400).json({ error: "Invalid query params" });
        const limit = query.data.limit ?? 20;
        const rows = await db
            .select({
            id: usageLogsTable.id,
            supplyId: usageLogsTable.supplyId,
            supplyName: suppliesTable.name,
            quantityUsed: usageLogsTable.quantityUsed,
            usedBy: usageLogsTable.usedBy,
            notes: usageLogsTable.notes,
            usedAt: usageLogsTable.usedAt,
            type: usageLogsTable.type,
        })
            .from(usageLogsTable)
            .innerJoin(suppliesTable, eq(usageLogsTable.supplyId, suppliesTable.id))
            .orderBy(desc(usageLogsTable.usedAt))
            .limit(limit);
        return res.json(rows.map((r) => ({
            ...r,
            quantityUsed: Number(r.quantityUsed),
            usedAt: r.usedAt.toISOString(),
        })));
    }
    catch (err) {
        req.log.error({ err }, "getRecentActivity error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
export default router;
