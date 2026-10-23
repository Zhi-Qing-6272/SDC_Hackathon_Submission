import { createHash } from "node:crypto";

export type AdminRecoveryConfig = {
  companyId: string;
  expectedOwnerFingerprint: string;
  administratorEmail: string;
};
export type RecoveryUser = {
  id: string;
  banned?: boolean;
  locked?: boolean;
  emailAddresses: { emailAddress: string; verification?: { status: string } | null }[];
};
export type RecoveryConnection = {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    sql: string, values?: unknown[],
  ): Promise<{ rows: Row[]; rowCount: number | null }>;
};
export type RecoveryResult = "recovered" | "already-linked" | "not-reapplied";

export class AdminRecoveryError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

export function parseAdminRecoveryConfig(raw: string | undefined): AdminRecoveryConfig | null {
  if (!raw) return null;
  let v: Partial<AdminRecoveryConfig>;
  try { v = JSON.parse(raw); } catch { throw new AdminRecoveryError("invalid-configuration"); }
  if (!v || typeof v !== "object"
    || typeof v.companyId !== "string" || !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(v.companyId)
    || typeof v.expectedOwnerFingerprint !== "string" || !/^[a-f0-9]{32}$/i.test(v.expectedOwnerFingerprint)
    || typeof v.administratorEmail !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.administratorEmail.trim())) {
    throw new AdminRecoveryError("invalid-configuration");
  }
  return {
    companyId: v.companyId,
    expectedOwnerFingerprint: v.expectedOwnerFingerprint.toLowerCase(),
    administratorEmail: v.administratorEmail.trim().toLowerCase(),
  };
}

export function verifiedRecoveryUser(users: RecoveryUser[], email: string): RecoveryUser {
  const matching = users.filter(u => u.emailAddresses.some(e =>
    e.emailAddress.trim().toLowerCase() === email.trim().toLowerCase()
    && e.verification?.status === "verified"));
  if (matching.length !== 1 || !matching[0].id || matching[0].banned || matching[0].locked) {
    throw new AdminRecoveryError("verified-administrator-not-found");
  }
  return matching[0];
}

// The only mutable records are the existing administrator membership and the company owner link.
// No email from the company contact form, client request, or Clerk unsafeMetadata can authorize this.
export async function recoverCompanyAdmin(
  connection: RecoveryConnection, config: AdminRecoveryConfig, target: RecoveryUser,
): Promise<RecoveryResult> {
  // Recheck at the transaction boundary, even when the caller already resolved the account.
  verifiedRecoveryUser([target], config.administratorEmail);
  await connection.query("BEGIN");
  try {
    const company = (await connection.query<{ id: string; created_by_user_id: string }>(
      "SELECT id, created_by_user_id FROM organizations WHERE id = $1 FOR UPDATE", [config.companyId],
    )).rows[0];
    if (!company) throw new AdminRecoveryError("company-not-found");

    // Ownership is the completion marker: never recreate an admin grant removed after recovery.
    if (company.created_by_user_id === target.id) {
      const membership = (await connection.query<{ org_id: string; role: string }>(
        "SELECT org_id, role FROM org_members WHERE user_id = $1", [target.id],
      )).rows[0];
      await connection.query("COMMIT");
      return membership?.org_id === company.id && membership.role === "admin" ? "already-linked" : "not-reapplied";
    }
    const fingerprint = createHash("md5").update(company.created_by_user_id).digest("hex");
    if (fingerprint !== config.expectedOwnerFingerprint) throw new AdminRecoveryError("original-owner-changed");

    const administrators = (await connection.query<{ id: string; user_id: string }>(
      "SELECT id, user_id FROM org_members WHERE org_id = $1 AND role = 'admin' FOR UPDATE", [company.id],
    )).rows;
    if (administrators.length !== 1 || administrators[0].user_id !== company.created_by_user_id) {
      throw new AdminRecoveryError("administrator-membership-changed");
    }
    const existing = await connection.query(
      "SELECT id FROM org_members WHERE user_id = $1 FOR UPDATE", [target.id],
    );
    if (existing.rows.length) throw new AdminRecoveryError("target-already-has-membership");

    const moved = await connection.query(
      "UPDATE org_members SET user_id = $1 WHERE id = $2 AND user_id = $3 AND org_id = $4 AND role = 'admin'",
      [target.id, administrators[0].id, company.created_by_user_id, company.id],
    );
    const owner = await connection.query(
      "UPDATE organizations SET created_by_user_id = $1 WHERE id = $2 AND created_by_user_id = $3",
      [target.id, company.id, company.created_by_user_id],
    );
    if (moved.rowCount !== 1 || owner.rowCount !== 1) throw new AdminRecoveryError("concurrent-ownership-change");
    await connection.query("COMMIT");
    return "recovered";
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  }
}
