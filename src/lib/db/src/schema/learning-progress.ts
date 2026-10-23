import { pgTable, text, boolean, primaryKey, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const learningProgress = pgTable("learning_progress", {
  userId: text("user_id").notNull(),
  stepKey: text("step_key").notNull(),
  completed: boolean("completed").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [primaryKey({ columns: [table.userId, table.stepKey] })]);
export const insertLearningProgressSchema = createInsertSchema(learningProgress);
export type InsertLearningProgress = z.infer<typeof insertLearningProgressSchema>;
export type LearningProgress = typeof learningProgress.$inferSelect;
