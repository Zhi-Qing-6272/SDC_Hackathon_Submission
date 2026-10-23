import { pgTable, uuid, text, index, uniqueIndex, timestamp } from "drizzle-orm/pg-core";

// A learning team: one person creates it, invites others by email, and the team plans reskilling together.
// Someone becomes a member only after they accept an invitation (see team_invitations). Members decide what to
// share by accepting; the team owner then sees their name, current role, skills and chosen direction, nothing else.
export const learningTeams = pgTable("learning_teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: text("owner_user_id").notNull(),
  name: text("name").notNull(),
  // Optional shared reskilling direction. When null, each member is planned against their own chosen direction.
  targetRoleId: text("target_role_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [index("learning_teams_owner_idx").on(table.ownerUserId)]);

export const learningTeamMembers = pgTable("learning_team_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").notNull(),
  userId: text("user_id").notNull(),
  displayName: text("display_name").notNull(), // fallback when the member has no saved skills profile yet
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [uniqueIndex("learning_team_members_unique_idx").on(table.teamId, table.userId), index("learning_team_members_user_idx").on(table.userId)]);

// status: pending | accepted | declined | revoked | left. Only the SHA-256 hash of the emailed token is stored.
export const teamInvitations = pgTable("team_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").notNull(),
  email: text("email").notNull(), // lower-case
  tokenHash: text("token_hash").notNull(),
  status: text("status").notNull().default("pending"),
  invitedByUserId: text("invited_by_user_id").notNull(),
  inviterName: text("inviter_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  acceptedByUserId: text("accepted_by_user_id"),
}, table => [uniqueIndex("team_invitations_token_idx").on(table.tokenHash), index("team_invitations_team_idx").on(table.teamId), index("team_invitations_email_idx").on(table.email)]);

export type LearningTeam = typeof learningTeams.$inferSelect;
export type TeamInvitation = typeof teamInvitations.$inferSelect;
