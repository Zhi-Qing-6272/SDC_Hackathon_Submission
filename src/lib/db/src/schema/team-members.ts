import { pgTable, uuid, text, integer, index, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const teamMembers = pgTable("team_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: text("owner_user_id").notNull(),
  name: text("name").notNull(),
  currentRole: text("current_role").notNull(),
  skills: text("skills").array().notNull(),
  targetRoleId: text("target_role_id").notNull(),
  weeklyHours: integer("weekly_hours").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [index("team_members_owner_idx").on(table.ownerUserId)]);
export const insertTeamMemberSchema = createInsertSchema(teamMembers);
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
