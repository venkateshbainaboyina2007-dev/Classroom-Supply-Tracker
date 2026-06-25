import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, classroomsTable } from "@workspace/db";
import { LoginBody, RegisterUserBody } from "@workspace/api-zod";
import { verifyPassword, signToken, hashPassword } from "../lib/auth";
import { authenticate } from "../middlewares/auth";
const router = Router();
// POST /auth/login
router.post("/login", async (req, res) => {
    try {
        const parseResult = LoginBody.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.message });
        }
        const { username, password } = parseResult.data;
        const [user] = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.username, username.toLowerCase()));
        if (!user || !verifyPassword(password, user.passwordHash)) {
            return res.status(401).json({ error: "Invalid username or password" });
        }
        if (!user.approved) {
            return res.status(403).json({ error: "Your account is disabled. Please contact the administrator." });
        }
        // Generate token
        const token = signToken({
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            approved: user.approved,
            classroomId: user.classroomId,
        });
        // Set cookie
        res.cookie("session_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });
        return res.json({
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            approved: user.approved,
            classroomId: user.classroomId,
        });
    }
    catch (err) {
        req.log.error({ err }, "Login error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
// POST /auth/logout
router.post("/logout", (req, res) => {
    res.clearCookie("session_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });
    return res.json({ message: "Logged out successfully" });
});
// GET /auth/me
router.get("/me", authenticate, (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    return res.json(req.user);
});
// POST /auth/register
router.post("/register", async (req, res) => {
    try {
        const parseResult = RegisterUserBody.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.message });
        }
        const { username, name, password, classroomId } = parseResult.data;
        // Check if username already exists (case insensitive)
        const [existingUser] = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.username, username.toLowerCase()));
        if (existingUser) {
            return res.status(400).json({ error: "Username/Email is already taken" });
        }
        // Verify classroom exists
        const [classroom] = await db
            .select()
            .from(classroomsTable)
            .where(eq(classroomsTable.id, classroomId));
        if (!classroom) {
            return res.status(400).json({ error: "Selected classroom does not exist" });
        }
        // Insert user with approved = false
        const passwordHash = hashPassword(password);
        const [user] = await db
            .insert(usersTable)
            .values({
            username: username.toLowerCase(),
            passwordHash,
            role: "teacher",
            name,
            approved: false, // requires admin approval
            classroomId,
        })
            .returning();
        return res.status(201).json({
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            approved: user.approved,
            classroomId: user.classroomId,
        });
    }
    catch (err) {
        req.log.error({ err }, "Register error");
        return res.status(500).json({ error: "Internal server error" });
    }
});
export default router;
