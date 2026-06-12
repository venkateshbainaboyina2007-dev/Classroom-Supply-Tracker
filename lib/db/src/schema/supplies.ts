import { pgTable, serial, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const suppliesTable = pgTable("supplies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("0"),
  unit: text("unit").notNull(),
  reorderThreshold: numeric("reorder_threshold", { precision: 10, scale: 2 }).notNull().default("5"),
  reorderQuantity: numeric("reorder_quantity", { precision: 10, scale: 2 }).notNull().default("10"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSupplySchema = createInsertSchema(suppliesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSupply = z.infer<typeof insertSupplySchema>;
export type Supply = typeof suppliesTable.$inferSelect;
