import { clerkClient } from "@clerk/express";
import { pool } from "@workspace/db";
import { logger } from "./logger";
import { AdminRecoveryError, parseAdminRecoveryConfig, recoverCompanyAdmin, verifiedRecoveryUser } from "./company-admin-recovery";

// An owner-approved role seed, configured only in the target deployment environment.
// It does not create users, change passwords, run schema migrations, or expose an HTTP recovery endpoint.
export async function runConfiguredCompanyAdminRecovery(): Promise<void> {
  try {
    const config = parseAdminRecoveryConfig(process.env.NEXORA_COMPANY_ADMIN_RECOVERY);
    if (!config) return;
    const users = await clerkClient.users.getUserList({ emailAddress: [config.administratorEmail], limit: 2 });
    const target = verifiedRecoveryUser(users.data, config.administratorEmail);
    const connection = await pool.connect();
    try {
      const status = await recoverCompanyAdmin(connection, config, target);
      if (status === "not-reapplied") {
        logger.warn({ status }, "Company administrator recovery was already consumed; revoked permissions were not restored");
      } else {
        logger.info({ status }, "Configured company administrator recovery finished");
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    // Do not log email addresses, user identifiers, provider responses, or configuration values.
    logger.error({ code: error instanceof AdminRecoveryError ? error.code : "recovery-service-error" },
      "Company administrator recovery did not run; no administrator access was granted");
  }
}
