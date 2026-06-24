import { db } from "./index";
import { usersTable } from "./schema/users";
import { classroomsTable } from "./schema/classrooms";
import { suppliesTable } from "./schema/supplies";
import { eq } from "drizzle-orm";
import crypto from "crypto";
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
}
async function main() {
    console.log("Seeding database users...");
    // Check if admin user exists
    const [existingAdmin] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.username, "admin"));
    if (!existingAdmin) {
        const adminPasswordHash = hashPassword("admin123");
        await db.insert(usersTable).values({
            username: "admin",
            passwordHash: adminPasswordHash,
            role: "admin",
            name: "Admin Principal",
            approved: true,
        });
        console.log("Admin user created (username: admin, password: admin123)");
    }
    else {
        console.log("Admin user already exists");
    }
    // Check if teacher user exists
    const [existingTeacher] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.username, "teacher"));
    if (!existingTeacher) {
        const teacherPasswordHash = hashPassword("teacher123");
        await db.insert(usersTable).values({
            username: "teacher",
            passwordHash: teacherPasswordHash,
            role: "teacher",
            name: "Jane Doe",
            approved: true,
        });
        console.log("Teacher user created (username: teacher, password: teacher123)");
    }
    else {
        console.log("Teacher user already exists");
    }
    // Force approved state on default accounts
    await db.update(usersTable).set({ approved: true }).where(eq(usersTable.username, "admin"));
    await db.update(usersTable).set({ approved: true }).where(eq(usersTable.username, "teacher"));
    // Seed sample classrooms if empty
    const classrooms = await db.select().from(classroomsTable);
    if (classrooms.length === 0) {
        console.log("Seeding sample classrooms...");
        await db.insert(classroomsTable).values([
            {
                name: "Kindergarten A",
                grade: "K",
                teacher: "Jane Doe",
                roomNumber: "101",
                notes: "Assigned to primary teacher Jane Doe",
            },
            {
                name: "First Grade B",
                grade: "1",
                teacher: "John Smith",
                roomNumber: "102",
                notes: "Next door classroom",
            },
        ]);
    }
    // Seed sample supplies if empty
    const supplies = await db.select().from(suppliesTable);
    if (supplies.length === 0) {
        console.log("Seeding sample supplies...");
        await db.insert(suppliesTable).values([
            {
                name: "Dry Erase Markers (Black)",
                category: "Writing Utensils",
                quantity: 45,
                unit: "pack",
                reorderThreshold: 10,
                reorderQuantity: 30,
                notes: "Chisel tip, pack of 4",
            },
            {
                name: "A4 White Copy Paper",
                category: "Paper Products",
                quantity: 8,
                unit: "ream",
                reorderThreshold: 5,
                reorderQuantity: 20,
                notes: "80gsm white printing paper",
            },
            {
                name: "Glue Sticks",
                category: "Art Supplies",
                quantity: 3,
                unit: "piece",
                reorderThreshold: 15,
                reorderQuantity: 50,
                notes: "Washable school glue stick, 22g",
            },
        ]);
    }
    console.log("Database seed operation complete!");
}
main().catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
});
