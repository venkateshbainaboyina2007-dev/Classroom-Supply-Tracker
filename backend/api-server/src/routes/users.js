import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, usersTable, classroomsTable } from "@workspace/db";
import { ResetPasswordBody, SetUserStatusBody } from "@workspace/api-zod";
import { authenticate, requireRole } from "../middlewares/auth";
import { hashPassword } from "../lib/auth";
const router = Router();
// GET /api/users/pending (admin only)
router.get("/pending", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
        const rows = await db
            .select({
            id: usersTable.id,
            username: usersTable.username,
            name: usersTable.name,
            role: usersTable.role,
            approved: usersTable.approved,
            createdAt: usersTable.createdAt,
            classroomId: usersTable.classroomId,
            classroomName: classroomsTable.name,
        })
            .from(usersTable)
            .leftJoin(classroomsTable, eq(usersTable.classroomId, classroomsTable.id))
            .where(and(eq(usersTable.role, "teacher"), eq(usersTable.approved, false)));
        return res.json(rows.map((r) => ({
            ...r,
            createdAt: r.createdAt.toISOString(),
        })));
    }
    catch (err) {
        req.log.error({ err }, "listPendingUsers error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
// POST /api/users/:id/approve (admin only)
router.post("/:id/approve", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
        const userId = Number(req.params.id);
        if (isNaN(userId)) {
            return res.status(400).json({ error: "Invalid user ID" });
        }
        const [user] = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, userId));
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        await db
            .update(usersTable)
            .set({ approved: true, updatedAt: new Date() })
            .where(eq(usersTable.id, userId));
        // Also update the classroom's teacher name if classroomId is present!
        if (user.classroomId) {
            await db
                .update(classroomsTable)
                .set({ teacher: user.name, updatedAt: new Date() })
                .where(eq(classroomsTable.id, user.classroomId));
        }
        return res.json({ message: "User approved successfully" });
    }
    catch (err) {
        req.log.error({ err }, "approveUser error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
// DELETE /api/users/:id (admin only)
router.delete("/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
        const userId = Number(req.params.id);
        if (isNaN(userId)) {
            return res.status(400).json({ error: "Invalid user ID" });
        }
        const [user] = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, userId));
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        await db
            .delete(usersTable)
            .where(eq(usersTable.id, userId));
        return res.status(204).end();
    }
    catch (err) {
        req.log.error({ err }, "deleteUser error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
// GET /api/users/teachers (admin only)
router.get("/teachers", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
        const teachers = await db
            .select({
            id: usersTable.id,
            username: usersTable.username,
            name: usersTable.name,
            role: usersTable.role,
            approved: usersTable.approved,
            createdAt: usersTable.createdAt,
        })
            .from(usersTable)
            .where(and(eq(usersTable.role, "teacher"), eq(usersTable.approved, true)));
        const classrooms = await db.select().from(classroomsTable);
        const result = teachers.map((teacher) => {
            const classroom = classrooms.find((c) => c.teacher.trim().toLowerCase() === teacher.name.trim().toLowerCase());
            return {
                id: teacher.id,
                username: teacher.username,
                name: teacher.name,
                role: teacher.role,
                approved: teacher.approved,
                createdAt: teacher.createdAt.toISOString(),
                classroomName: classroom ? classroom.name : null,
                classroomId: classroom ? classroom.id : null,
            };
        });
        return res.json(result);
    }
    catch (err) {
        req.log.error({ err }, "listTeachers error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
// POST /api/users/:id/reset-password (admin only)
router.post("/:id/reset-password", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
        const userId = Number(req.params.id);
        if (isNaN(userId)) {
            return res.status(400).json({ error: "Invalid user ID" });
        }
        const body = ResetPasswordBody.safeParse(req.body);
        if (!body.success) {
            return res.status(400).json({ error: body.error.message });
        }
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        const passwordHash = hashPassword(body.data.password);
        await db
            .update(usersTable)
            .set({ passwordHash, updatedAt: new Date() })
            .where(eq(usersTable.id, userId));
        return res.json({ message: "Password reset successfully" });
    }
    catch (err) {
        req.log.error({ err }, "resetPassword error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
// POST /api/users/:id/status (admin only)
router.post("/:id/status", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
        const userId = Number(req.params.id);
        if (isNaN(userId)) {
            return res.status(400).json({ error: "Invalid user ID" });
        }
        const body = SetUserStatusBody.safeParse(req.body);
        if (!body.success) {
            return res.status(400).json({ error: body.error.message });
        }
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        await db
            .update(usersTable)
            .set({ approved: body.data.approved, updatedAt: new Date() })
            .where(eq(usersTable.id, userId));
        return res.json({ message: "User status updated successfully" });
    }
    catch (err) {
        req.log.error({ err }, "setUserStatus error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
export default router;
