import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const learnerProfiles = pgTable("learner_profiles", {
  userId: text("user_id").primaryKey(),
  name: text("name").notNull(),
  currentRole: text("current_role").notNull(),
  experience: text("experience").notNull(),
  skills: text("skills").array().notNull(),
  interests: text("interests").array().notNull(),
  goalRoleId: text("goal_role_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertLearnerProfileSchema = createInsertSchema(learnerProfiles);
export type InsertLearnerProfile = z.infer<typeof insertLearnerProfileSchema>;
export type LearnerProfile = typeof learnerProfiles.$inferSelect;
