import { sqliteTable, integer, real, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { suppliesTable } from "./supplies";
import { classroomsTable } from "./classrooms";
export const usageLogsTable = sqliteTable("usage_logs", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    supplyId: integer("supply_id").notNull().references(() => suppliesTable.id, { onDelete: "cascade" }),
    classroomId: integer("classroom_id").references(() => classroomsTable.id, { onDelete: "set null" }),
    quantityUsed: real("quantity_used").notNull(),
    usedBy: text("used_by").notNull(),
    notes: text("notes"),
    type: text("type").notNull().default("usage"),
    usedAt: integer("used_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export const insertUsageLogSchema = createInsertSchema(usageLogsTable).omit({ id: true, usedAt: true });
