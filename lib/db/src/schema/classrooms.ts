import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const classroomsTable = pgTable("classrooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  grade: text("grade").notNull(),
  teacher: text("teacher").notNull(),
  roomNumber: text("room_number").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertClassroomSchema = createInsertSchema(classroomsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertClassroom = z.infer<typeof insertClassroomSchema>;
export type Classroom = typeof classroomsTable.$inferSelect;
