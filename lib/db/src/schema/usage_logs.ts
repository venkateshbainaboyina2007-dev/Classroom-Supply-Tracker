import { pgTable, serial, integer, numeric, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { suppliesTable } from "./supplies";
import { classroomsTable } from "./classrooms";

export const usageLogsTable = pgTable("usage_logs", {
  id: serial("id").primaryKey(),
  supplyId: integer("supply_id").notNull().references(() => suppliesTable.id, { onDelete: "cascade" }),
  classroomId: integer("classroom_id").references(() => classroomsTable.id, { onDelete: "set null" }),
  quantityUsed: numeric("quantity_used", { precision: 10, scale: 2 }).notNull(),
  usedBy: text("used_by").notNull(),
  notes: text("notes"),
  type: text("type").notNull().default("usage"),
  usedAt: timestamp("used_at").notNull().defaultNow(),
});

export const insertUsageLogSchema = createInsertSchema(usageLogsTable).omit({ id: true, usedAt: true });
export type InsertUsageLog = z.infer<typeof insertUsageLogSchema>;
export type UsageLog = typeof usageLogsTable.$inferSelect;
