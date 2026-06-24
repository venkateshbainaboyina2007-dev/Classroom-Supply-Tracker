import { Router } from "express";
import { eq, or, isNull, desc } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import { authenticate } from "../middlewares/auth";
import { ReadNotificationParams } from "@workspace/api-zod";
const router = Router();
// GET /api/notifications
router.get("/", authenticate, async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: "Unauthorized" });
        let conditions;
        if (req.user.role === "admin") {
            conditions = or(eq(notificationsTable.userId, req.user.id), isNull(notificationsTable.userId));
        }
        else {
            conditions = eq(notificationsTable.userId, req.user.id);
        }
        const rows = await db
            .select()
            .from(notificationsTable)
            .where(conditions)
            .orderBy(desc(notificationsTable.createdAt));
        return res.json(rows.map((r) => ({
            ...r,
            createdAt: r.createdAt.toISOString(),
        })));
    }
    catch (err) {
        req.log.error({ err }, "listNotifications error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
// POST /api/notifications/read-all
router.post("/read-all", authenticate, async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: "Unauthorized" });
        let conditions;
        if (req.user.role === "admin") {
            conditions = or(eq(notificationsTable.userId, req.user.id), isNull(notificationsTable.userId));
        }
        else {
            conditions = eq(notificationsTable.userId, req.user.id);
        }
        await db
            .update(notificationsTable)
            .set({ read: true })
            .where(conditions);
        return res.json({ message: "All notifications marked as read" });
    }
    catch (err) {
        req.log.error({ err }, "readAllNotifications error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
// POST /api/notifications/:id/read
router.post("/:id/read", authenticate, async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: "Unauthorized" });
        const params = ReadNotificationParams.safeParse({ id: Number(req.params.id) });
        if (!params.success)
            return res.status(400).json({ error: "Invalid ID" });
        const [notification] = await db
            .select()
            .from(notificationsTable)
            .where(eq(notificationsTable.id, params.data.id));
        if (!notification)
            return res.status(404).json({ error: "Notification not found" });
        // Validate ownership
        if (notification.userId !== null && notification.userId !== req.user.id) {
            return res.status(403).json({ error: "Forbidden: Not your notification" });
        }
        await db
            .update(notificationsTable)
            .set({ read: true })
            .where(eq(notificationsTable.id, params.data.id));
        return res.json({ message: "Notification marked as read" });
    }
    catch (err) {
        req.log.error({ err }, "readNotification error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
export default router;
