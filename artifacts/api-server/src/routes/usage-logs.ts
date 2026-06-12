import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, usageLogsTable, suppliesTable } from "@workspace/db";
import {
  CreateUsageLogBody,
  ListUsageLogsQueryParams,
  GetUsageLogParams,
  DeleteUsageLogParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const query = ListUsageLogsQueryParams.safeParse({
      supplyId: req.query.supplyId ? Number(req.query.supplyId) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    if (!query.success) return res.status(400).json({ error: "Invalid query params" });

    const { supplyId, limit } = query.data;

    let q = db
      .select({
        id: usageLogsTable.id,
        supplyId: usageLogsTable.supplyId,
        supplyName: suppliesTable.name,
        quantityUsed: usageLogsTable.quantityUsed,
        usedBy: usageLogsTable.usedBy,
        notes: usageLogsTable.notes,
        usedAt: usageLogsTable.usedAt,
      })
      .from(usageLogsTable)
      .innerJoin(suppliesTable, eq(usageLogsTable.supplyId, suppliesTable.id))
      .orderBy(desc(usageLogsTable.usedAt))
      .$dynamic();

    if (supplyId) {
      q = q.where(eq(usageLogsTable.supplyId, supplyId));
    }
    if (limit) {
      q = q.limit(limit);
    }

    const rows = await q;
    return res.json(
      rows.map((r) => ({
        ...r,
        quantityUsed: Number(r.quantityUsed),
        usedAt: r.usedAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "listUsageLogs error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = CreateUsageLogBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: body.error.message });

    const [supply] = await db
      .select()
      .from(suppliesTable)
      .where(eq(suppliesTable.id, body.data.supplyId));
    if (!supply) return res.status(404).json({ error: "Supply not found" });

    const currentQty = Number(supply.quantity);
    if (currentQty < body.data.quantityUsed) {
      return res.status(400).json({ error: "Insufficient stock" });
    }

    const newQuantity = currentQty - body.data.quantityUsed;

    await db
      .update(suppliesTable)
      .set({ quantity: String(newQuantity), updatedAt: new Date() })
      .where(eq(suppliesTable.id, body.data.supplyId));

    const [log] = await db
      .insert(usageLogsTable)
      .values({
        supplyId: body.data.supplyId,
        quantityUsed: String(body.data.quantityUsed),
        usedBy: body.data.usedBy,
        notes: body.data.notes ?? null,
        type: "usage",
      })
      .returning();

    return res.status(201).json({
      id: log.id,
      supplyId: log.supplyId,
      supplyName: supply.name,
      quantityUsed: Number(log.quantityUsed),
      usedBy: log.usedBy,
      notes: log.notes,
      usedAt: log.usedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "createUsageLog error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const params = GetUsageLogParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) return res.status(400).json({ error: "Invalid id" });

    const [row] = await db
      .select({
        id: usageLogsTable.id,
        supplyId: usageLogsTable.supplyId,
        supplyName: suppliesTable.name,
        quantityUsed: usageLogsTable.quantityUsed,
        usedBy: usageLogsTable.usedBy,
        notes: usageLogsTable.notes,
        usedAt: usageLogsTable.usedAt,
      })
      .from(usageLogsTable)
      .innerJoin(suppliesTable, eq(usageLogsTable.supplyId, suppliesTable.id))
      .where(eq(usageLogsTable.id, params.data.id));

    if (!row) return res.status(404).json({ error: "Usage log not found" });

    return res.json({
      ...row,
      quantityUsed: Number(row.quantityUsed),
      usedAt: row.usedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "getUsageLog error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const params = DeleteUsageLogParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) return res.status(400).json({ error: "Invalid id" });

    await db.delete(usageLogsTable).where(eq(usageLogsTable.id, params.data.id));
    return res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "deleteUsageLog error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
