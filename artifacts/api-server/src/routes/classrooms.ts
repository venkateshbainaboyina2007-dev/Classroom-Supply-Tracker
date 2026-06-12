import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, classroomsTable } from "@workspace/db";
import {
  CreateClassroomBody,
  UpdateClassroomBody,
  GetClassroomParams,
  UpdateClassroomParams,
  DeleteClassroomParams,
} from "@workspace/api-zod";

const router = Router();

const serialize = (r: typeof classroomsTable.$inferSelect) => ({
  ...r,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

router.get("/", async (req, res) => {
  try {
    const rows = await db.select().from(classroomsTable).orderBy(classroomsTable.name);
    return res.json(rows.map(serialize));
  } catch (err) {
    req.log.error({ err }, "listClassrooms error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = CreateClassroomBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: body.error.message });

    const [row] = await db
      .insert(classroomsTable)
      .values({
        name: body.data.name,
        grade: body.data.grade,
        teacher: body.data.teacher,
        roomNumber: body.data.roomNumber,
        notes: body.data.notes ?? null,
      })
      .returning();

    return res.status(201).json(serialize(row));
  } catch (err) {
    req.log.error({ err }, "createClassroom error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const params = GetClassroomParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) return res.status(400).json({ error: "Invalid id" });

    const [row] = await db
      .select()
      .from(classroomsTable)
      .where(eq(classroomsTable.id, params.data.id));

    if (!row) return res.status(404).json({ error: "Classroom not found" });
    return res.json(serialize(row));
  } catch (err) {
    req.log.error({ err }, "getClassroom error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const params = UpdateClassroomParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) return res.status(400).json({ error: "Invalid id" });

    const body = UpdateClassroomBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: body.error.message });

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.data.name !== undefined) updates.name = body.data.name;
    if (body.data.grade !== undefined) updates.grade = body.data.grade;
    if (body.data.teacher !== undefined) updates.teacher = body.data.teacher;
    if (body.data.roomNumber !== undefined) updates.roomNumber = body.data.roomNumber;
    if (body.data.notes !== undefined) updates.notes = body.data.notes;

    const [row] = await db
      .update(classroomsTable)
      .set(updates)
      .where(eq(classroomsTable.id, params.data.id))
      .returning();

    if (!row) return res.status(404).json({ error: "Classroom not found" });
    return res.json(serialize(row));
  } catch (err) {
    req.log.error({ err }, "updateClassroom error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const params = DeleteClassroomParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) return res.status(400).json({ error: "Invalid id" });

    await db.delete(classroomsTable).where(eq(classroomsTable.id, params.data.id));
    return res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "deleteClassroom error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
