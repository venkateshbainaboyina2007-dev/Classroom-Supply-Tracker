import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, classroomsTable, usersTable } from "@workspace/db";
import { CreateClassroomBody, UpdateClassroomBody, GetClassroomParams, UpdateClassroomParams, DeleteClassroomParams, } from "@workspace/api-zod";
import { authenticate, requireRole } from "../middlewares/auth";
import { hashPassword } from "../lib/auth";
const router = Router();
const serialize = (r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
});
router.get("/", authenticate, async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: "Unauthorized" });
        let rows;
        if (req.user.role === "teacher") {
            if (!req.user.classroomId) {
                return res.json([]);
            }
            rows = await db
                .select()
                .from(classroomsTable)
                .where(eq(classroomsTable.id, req.user.classroomId));
        }
        else {
            rows = await db.select().from(classroomsTable).orderBy(classroomsTable.name);
        }
        return res.json(rows.map(serialize));
    }
    catch (err) {
        req.log.error({ err }, "listClassrooms error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
router.post("/", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
        const body = CreateClassroomBody.safeParse(req.body);
        if (!body.success)
            return res.status(400).json({ error: body.error.message });
        const { name, grade, teacher, roomNumber, notes, teacherUsername, teacherPassword } = body.data;
        // Check if teacher user already exists
        const [existingUser] = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.username, teacherUsername.toLowerCase()));
        if (existingUser) {
            return res.status(400).json({ error: "Teacher username is already taken" });
        }
        // Insert classroom
        const [classroom] = await db
            .insert(classroomsTable)
            .values({
            name,
            grade,
            teacher,
            roomNumber,
            notes: notes ?? null,
        })
            .returning();
        // Create the teacher user account
        const passwordHash = hashPassword(teacherPassword);
        await db.insert(usersTable).values({
            username: teacherUsername.toLowerCase(),
            passwordHash,
            role: "teacher",
            name: teacher,
            approved: true, // Enabled by default
            classroomId: classroom.id,
        });
        return res.status(201).json(serialize(classroom));
    }
    catch (err) {
        req.log.error({ err }, "createClassroom error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
router.get("/public", async (req, res) => {
    try {
        const rows = await db
            .select({
            id: classroomsTable.id,
            name: classroomsTable.name,
            grade: classroomsTable.grade,
        })
            .from(classroomsTable)
            .orderBy(classroomsTable.name);
        return res.json(rows);
    }
    catch (err) {
        req.log.error({ err }, "listPublicClassrooms error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
router.get("/:id", authenticate, async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: "Unauthorized" });
        const params = GetClassroomParams.safeParse({ id: Number(req.params.id) });
        if (!params.success)
            return res.status(400).json({ error: "Invalid id" });
        if (req.user.role === "teacher" && req.user.classroomId !== params.data.id) {
            return res.status(403).json({ error: "Forbidden: You do not have access to this classroom" });
        }
        const [row] = await db
            .select()
            .from(classroomsTable)
            .where(eq(classroomsTable.id, params.data.id));
        if (!row)
            return res.status(404).json({ error: "Classroom not found" });
        return res.json(serialize(row));
    }
    catch (err) {
        req.log.error({ err }, "getClassroom error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
router.patch("/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
        const params = UpdateClassroomParams.safeParse({ id: Number(req.params.id) });
        if (!params.success)
            return res.status(400).json({ error: "Invalid id" });
        const body = UpdateClassroomBody.safeParse(req.body);
        if (!body.success)
            return res.status(400).json({ error: body.error.message });
        const [classroom] = await db
            .select()
            .from(classroomsTable)
            .where(eq(classroomsTable.id, params.data.id));
        if (!classroom)
            return res.status(404).json({ error: "Classroom not found" });
        const updates = { updatedAt: new Date() };
        if (body.data.name !== undefined)
            updates.name = body.data.name;
        if (body.data.grade !== undefined)
            updates.grade = body.data.grade;
        if (body.data.teacher !== undefined)
            updates.teacher = body.data.teacher;
        if (body.data.roomNumber !== undefined)
            updates.roomNumber = body.data.roomNumber;
        if (body.data.notes !== undefined)
            updates.notes = body.data.notes;
        const [row] = await db
            .update(classroomsTable)
            .set(updates)
            .where(eq(classroomsTable.id, params.data.id))
            .returning();
        // Sync user updates
        const [teacherUser] = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.classroomId, params.data.id));
        const userUpdates = { updatedAt: new Date() };
        if (body.data.teacher !== undefined)
            userUpdates.name = body.data.teacher;
        if (body.data.approved !== undefined)
            userUpdates.approved = body.data.approved;
        if (body.data.teacherUsername !== undefined) {
            userUpdates.username = body.data.teacherUsername.toLowerCase();
        }
        if (body.data.teacherPassword !== undefined) {
            userUpdates.passwordHash = hashPassword(body.data.teacherPassword);
        }
        if (teacherUser) {
            // Check username collision
            if (body.data.teacherUsername && body.data.teacherUsername.toLowerCase() !== teacherUser.username) {
                const [collision] = await db
                    .select()
                    .from(usersTable)
                    .where(eq(usersTable.username, body.data.teacherUsername.toLowerCase()));
                if (collision) {
                    return res.status(400).json({ error: "Teacher username is already taken" });
                }
            }
            await db
                .update(usersTable)
                .set(userUpdates)
                .where(eq(usersTable.id, teacherUser.id));
        }
        else if (body.data.teacherUsername && body.data.teacherPassword) {
            // Create teacher if not exists
            const [collision] = await db
                .select()
                .from(usersTable)
                .where(eq(usersTable.username, body.data.teacherUsername.toLowerCase()));
            if (collision) {
                return res.status(400).json({ error: "Teacher username is already taken" });
            }
            await db.insert(usersTable).values({
                username: body.data.teacherUsername.toLowerCase(),
                passwordHash: hashPassword(body.data.teacherPassword),
                role: "teacher",
                name: body.data.teacher || classroom.teacher,
                approved: body.data.approved !== undefined ? body.data.approved : true,
                classroomId: params.data.id,
            });
        }
        return res.json(serialize(row));
    }
    catch (err) {
        req.log.error({ err }, "updateClassroom error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
router.delete("/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
        const params = DeleteClassroomParams.safeParse({ id: Number(req.params.id) });
        if (!params.success)
            return res.status(400).json({ error: "Invalid id" });
        // Delete associated teacher user
        await db.delete(usersTable).where(eq(usersTable.classroomId, params.data.id));
        // Delete classroom
        await db.delete(classroomsTable).where(eq(classroomsTable.id, params.data.id));
        return res.status(204).end();
    }
    catch (err) {
        req.log.error({ err }, "deleteClassroom error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
export default router;
