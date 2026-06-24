import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
export const classroomsTable = sqliteTable("classrooms", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    grade: text("grade").notNull(),
    teacher: text("teacher").notNull(),
    roomNumber: text("room_number").notNull(),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export const insertClassroomSchema = createInsertSchema(classroomsTable).omit({ id: true, createdAt: true, updatedAt: true });
