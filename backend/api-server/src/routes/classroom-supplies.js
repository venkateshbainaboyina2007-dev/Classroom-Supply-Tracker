import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, classroomSuppliesTable, classroomsTable, suppliesTable } from "@workspace/db";
import { ListClassroomSuppliesQueryParams } from "@workspace/api-zod";
import { authenticate } from "../middlewares/auth";
const router = Router();
// GET /api/classroom-supplies
router.get("/", authenticate, async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: "Unauthorized" });
        const query = ListClassroomSuppliesQueryParams.safeParse({
            classroomId: req.query.classroomId ? Number(req.query.classroomId) : undefined,
        });
        if (!query.success)
            return res.status(400).json({ error: "Invalid query parameters" });
        let targetClassroomId = query.data.classroomId;
        if (req.user.role === "teacher") {
            targetClassroomId = req.user.classroomId || 0;
        }
        const conditions = [];
        if (targetClassroomId) {
            conditions.push(eq(classroomSuppliesTable.classroomId, targetClassroomId));
        }
        const rows = await db
            .select({
            id: classroomSuppliesTable.id,
            classroomId: classroomSuppliesTable.classroomId,
            classroomName: classroomsTable.name,
            supplyId: classroomSuppliesTable.supplyId,
            supplyName: suppliesTable.name,
            quantity: classroomSuppliesTable.quantity,
            unit: suppliesTable.unit,
        })
            .from(classroomSuppliesTable)
            .innerJoin(classroomsTable, eq(classroomSuppliesTable.classroomId, classroomsTable.id))
            .innerJoin(suppliesTable, eq(classroomSuppliesTable.supplyId, suppliesTable.id))
            .where(conditions.length ? (conditions.length === 1 ? conditions[0] : and(...conditions)) : undefined);
        return res.json(rows);
    }
    catch (err) {
        req.log.error({ err }, "listClassroomSupplies error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
export default router;
