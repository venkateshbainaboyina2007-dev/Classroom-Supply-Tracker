import { Router } from "express";
import { eq, ilike, and, lte } from "drizzle-orm";
import { db, suppliesTable } from "@workspace/db";
import { CreateSupplyBody, UpdateSupplyBody, GetSupplyParams, UpdateSupplyParams, DeleteSupplyParams, RestockSupplyParams, RestockSupplyBody, ListSuppliesQueryParams, } from "@workspace/api-zod";
import { authenticate, requireRole } from "../middlewares/auth";
const router = Router();
router.get("/", authenticate, async (req, res) => {
    try {
        const query = ListSuppliesQueryParams.safeParse(req.query);
        if (!query.success) {
            return res.status(400).json({ error: "Invalid query params" });
        }
        const { category, search } = query.data;
        const conditions = [];
        if (category)
            conditions.push(eq(suppliesTable.category, category));
        if (search)
            conditions.push(ilike(suppliesTable.name, `%${search}%`));
        const rows = conditions.length
            ? await db.select().from(suppliesTable).where(and(...conditions))
            : await db.select().from(suppliesTable);
        return res.json(rows.map((r) => ({
            ...r,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(),
        })));
    }
    catch (err) {
        req.log.error({ err }, "listSupplies error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
router.get("/low-stock", authenticate, async (req, res) => {
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
        req.log.error({ err }, "getLowStockSupplies error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
router.get("/categories", authenticate, async (req, res) => {
    try {
        const rows = await db
            .selectDistinct({ category: suppliesTable.category })
            .from(suppliesTable);
        return res.json(rows.map((r) => r.category).sort());
    }
    catch (err) {
        req.log.error({ err }, "listCategories error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
router.get("/:id", authenticate, async (req, res) => {
    try {
        const params = GetSupplyParams.safeParse({ id: Number(req.params.id) });
        if (!params.success)
            return res.status(400).json({ error: "Invalid id" });
        const [row] = await db
            .select()
            .from(suppliesTable)
            .where(eq(suppliesTable.id, params.data.id));
        if (!row)
            return res.status(404).json({ error: "Supply not found" });
        return res.json({
            ...row,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
        });
    }
    catch (err) {
        req.log.error({ err }, "getSupply error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
router.post("/", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
        const body = CreateSupplyBody.safeParse(req.body);
        if (!body.success)
            return res.status(400).json({ error: body.error.message });
        const [row] = await db
            .insert(suppliesTable)
            .values({
            name: body.data.name,
            category: body.data.category,
            quantity: body.data.quantity,
            unit: body.data.unit,
            reorderThreshold: body.data.reorderThreshold,
            reorderQuantity: body.data.reorderQuantity,
            notes: body.data.notes ?? null,
        })
            .returning();
        return res.status(201).json({
            ...row,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
        });
    }
    catch (err) {
        req.log.error({ err }, "createSupply error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
router.patch("/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
        const params = UpdateSupplyParams.safeParse({ id: Number(req.params.id) });
        if (!params.success)
            return res.status(400).json({ error: "Invalid id" });
        const body = UpdateSupplyBody.safeParse(req.body);
        if (!body.success)
            return res.status(400).json({ error: body.error.message });
        const updates = { updatedAt: new Date() };
        if (body.data.name !== undefined)
            updates.name = body.data.name;
        if (body.data.category !== undefined)
            updates.category = body.data.category;
        if (body.data.quantity !== undefined)
            updates.quantity = body.data.quantity;
        if (body.data.unit !== undefined)
            updates.unit = body.data.unit;
        if (body.data.reorderThreshold !== undefined)
            updates.reorderThreshold = body.data.reorderThreshold;
        if (body.data.reorderQuantity !== undefined)
            updates.reorderQuantity = body.data.reorderQuantity;
        if (body.data.notes !== undefined)
            updates.notes = body.data.notes;
        const [row] = await db
            .update(suppliesTable)
            .set(updates)
            .where(eq(suppliesTable.id, params.data.id))
            .returning();
        if (!row)
            return res.status(404).json({ error: "Supply not found" });
        return res.json({
            ...row,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
        });
    }
    catch (err) {
        req.log.error({ err }, "updateSupply error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
router.delete("/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
        const params = DeleteSupplyParams.safeParse({ id: Number(req.params.id) });
        if (!params.success)
            return res.status(400).json({ error: "Invalid id" });
        await db.delete(suppliesTable).where(eq(suppliesTable.id, params.data.id));
        return res.status(204).end();
    }
    catch (err) {
        req.log.error({ err }, "deleteSupply error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
router.post("/:id/restock", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
        const params = RestockSupplyParams.safeParse({ id: Number(req.params.id) });
        if (!params.success)
            return res.status(400).json({ error: "Invalid id" });
        const body = RestockSupplyBody.safeParse(req.body);
        if (!body.success)
            return res.status(400).json({ error: body.error.message });
        const [existing] = await db
            .select()
            .from(suppliesTable)
            .where(eq(suppliesTable.id, params.data.id));
        if (!existing)
            return res.status(404).json({ error: "Supply not found" });
        const newQuantity = existing.quantity + body.data.quantity;
        const [row] = await db
            .update(suppliesTable)
            .set({ quantity: newQuantity, updatedAt: new Date() })
            .where(eq(suppliesTable.id, params.data.id))
            .returning();
        return res.json({
            ...row,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
        });
    }
    catch (err) {
        req.log.error({ err }, "restockSupply error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
export default router;
