import { pgTable, uuid, text, boolean, integer, index, uniqueIndex, timestamp } from "drizzle-orm/pg-core";

// A registered company. The user who registers it becomes its administrator. The sign-in password belongs to the
// administrator's Clerk account and is never stored here. Registration and licence numbers are checked for format
// only; they are not verified against any official registry.
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  registrationNumber: text("registration_number").notNull(),
  registrationKey: text("registration_key").notNull(), // upper-cased, separators removed: one company per registration number
  licenseNumber: text("license_number").notNull(),
  industry: text("industry").notNull(),
  companySize: text("company_size").notNull(),
  addressLine: text("address_line").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  postcode: text("postcode").notNull(),
  country: text("country").notNull(),
  website: text("website"),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone").notNull(),
  joinCode: text("join_code").notNull(),
  createdByUserId: text("created_by_user_id").notNull(),
  termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [uniqueIndex("organizations_join_code_idx").on(table.joinCode), uniqueIndex("organizations_registration_key_idx").on(table.registrationKey)]);

// One row per person in a company. `role` is "admin" or "member". Employees are only visible to the
// administrator while `shareWithAdmin` is true; the employee controls it and can switch it off at any time.
export const orgMembers = pgTable("org_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull(),
  userId: text("user_id").notNull(),
  role: text("role").notNull().default("member"),
  shareWithAdmin: boolean("share_with_admin").notNull().default(false),
  teamId: uuid("team_id"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  sharedAt: timestamp("shared_at", { withTimezone: true }),
}, table => [uniqueIndex("org_members_user_idx").on(table.userId), index("org_members_org_idx").on(table.orgId)]);

// A team and the skills the company wants it to have. Skill gaps are computed against `requiredSkills`.
export const orgTeams = pgTable("org_teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull(),
  name: text("name").notNull(),
  requiredSkills: text("required_skills").array().notNull(),
  synthetic: boolean("synthetic").notNull().default(false), // made-up test team created by "Load test data"
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [index("org_teams_org_idx").on(table.orgId)]);

// Training the administrator recommends. `teamId` null means the whole company.
// Employees mark these complete through the normal progress API using the key "org:<recommendation id>".
export const orgRecommendations = pgTable("org_recommendations", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull(),
  teamId: uuid("team_id"),
  skill: text("skill").notNull(),
  note: text("note").notNull().default(""),
  hours: integer("hours").notNull().default(6),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [index("org_recs_org_idx").on(table.orgId)]);

export type Organization = typeof organizations.$inferSelect;
export type OrgMember = typeof orgMembers.$inferSelect;
export type OrgTeam = typeof orgTeams.$inferSelect;
export type OrgRecommendation = typeof orgRecommendations.$inferSelect;
