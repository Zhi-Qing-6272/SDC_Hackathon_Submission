# Recover a company administrator after publishing copied workspace data

Development and production Clerk users have different IDs. Copying a company and its
membership records does not link them to the production account with the same email.
Never recover access from a client-selected mode, company contact email, or Clerk
unsafe metadata.

## Owner-approved configuration

Only after the project owner confirms the intended administrator email and the
original company ownership is verified, set the server-only
`NEXORA_COMPANY_ADMIN_RECOVERY` environment variable in the target environment:

```json
{
  "companyId": "<existing company UUID>",
  "expectedOwnerFingerprint": "<MD5 fingerprint of the original Clerk owner ID>",
  "administratorEmail": "<owner-confirmed sign-in email>"
}
```

The fingerprint is an optimistic ownership guard, not a password or authorization
token. The intended account is resolved through that environment's Clerk backend;
it must already exist, be active, and have the matching email verified. The seed
does not create accounts, verify addresses, or assign passwords.

On server startup, the seed moves only the original administrator membership and
company owner link in one transaction. Company details, join code, teams, other
memberships, and training remain unchanged. An unexpected owner, multiple admins,
or an existing membership on the target account blocks the transfer.

An already-transferred owner link marks completion. Subsequent starts do not
recreate a removed membership or restore a demoted role. After confirming recovery
in the published app, remove the environment variable to disable future attempts.
Never copy production secrets into the workspace or write production database
records directly from the workspace.

## Verification

- `pnpm --filter @workspace/api-server test`
- `pnpm --filter @workspace/api-server test:integration`

The integration test uses only connection-local temporary tables in development.
Startup logs report `recovered`, `already-linked`, `not-reapplied`, or a fixed
failure code without logging account identifiers, email addresses, or secrets.
After the user republishes, inspect startup recovery status, then verify the
published account opens Company administration and Company details.
