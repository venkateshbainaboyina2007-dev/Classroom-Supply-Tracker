import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { classroomsTable } from "./classrooms";
import { suppliesTable } from "./supplies";
export const requestsTable = sqliteTable("requests", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    classroomId: integer("classroom_id").notNull().references(() => classroomsTable.id, { onDelete: "cascade" }),
    supplyId: integer("supply_id").notNull().references(() => suppliesTable.id, { onDelete: "cascade" }),
    requestedQuantity: real("requested_quantity").notNull(),
    approvedQuantity: real("approved_quantity"),
    status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected'
    remarks: text("remarks"),
    requestedAt: integer("requested_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    approvedAt: integer("approved_at", { mode: "timestamp" }),
});
export const insertRequestSchema = createInsertSchema(requestsTable).omit({ id: true, requestedAt: true, approvedAt: true });
