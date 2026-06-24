import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { usersTable } from "./users";
export const notificationsTable = sqliteTable("notifications", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }), // if null, it's for admins
    message: text("message").notNull(),
    type: text("type").notNull(), // 'low_stock', 'new_request', 'request_approved', 'request_rejected', 'stock_assigned'
    read: integer("read", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true, createdAt: true });
