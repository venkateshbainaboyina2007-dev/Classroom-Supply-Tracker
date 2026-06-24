import { sqliteTable, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { classroomsTable } from "./classrooms";
import { suppliesTable } from "./supplies";
export const classroomSuppliesTable = sqliteTable("classroom_supplies", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    classroomId: integer("classroom_id").notNull().references(() => classroomsTable.id, { onDelete: "cascade" }),
    supplyId: integer("supply_id").notNull().references(() => suppliesTable.id, { onDelete: "cascade" }),
    quantity: real("quantity").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export const insertClassroomSupplySchema = createInsertSchema(classroomSuppliesTable).omit({ id: true, createdAt: true, updatedAt: true });
