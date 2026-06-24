import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
export const suppliesTable = sqliteTable("supplies", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    category: text("category").notNull(),
    quantity: real("quantity").notNull().default(0),
    unit: text("unit").notNull(),
    reorderThreshold: real("reorder_threshold").notNull().default(5),
    reorderQuantity: real("reorder_quantity").notNull().default(10),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export const insertSupplySchema = createInsertSchema(suppliesTable).omit({ id: true, createdAt: true, updatedAt: true });
