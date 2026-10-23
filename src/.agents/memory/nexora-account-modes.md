---
name: Nexora account modes
description: The intended same-email behavior for personal and company administrator access.
---

Use one Clerk identity per email. The Personal sign in and Company sign in tabs authenticate that same identity, then select which workspace to open. A user can access the administrator workspace only when the application database confirms an administrator membership; selecting the company tab never grants that role. Company registration must be started from the signed-out welcome flow, not inside the signed-in personal workspace.

**Why:** The user explicitly requires one email to work in both sign-in tabs without creating a second Clerk account, and later clarified that personal users must sign out before registering a company.

**How to apply:** Keep role authorization server-side and based on organization membership. Treat the client-side mode only as a workspace-selection hint. Provide company registration from the public signed-out flow, and route successful registration through Company sign in.

Company sign-in must never display the personal-account pages or use company registration as a fallback for an existing administrator. Registered administrators should see the dedicated Company administration pages.

**Why:** The user explicitly corrected the personal-sidebar/registration screen appearing after administrator sign-in; the dedicated administrator workspace is the expected result.

**How to apply:** Keep company entry separate from personal entry. Membership lookup failures or missing administrator links must show a company-access error, not learner pages or a new registration. Only an explicit registration flow may submit a saved company draft.

Copied company records do not establish production administrator access: development and production Clerk identities differ even for the same email.

**Why:** A company retained its development owner reference after publishing, so the published sign-in had no matching administrator membership.

**How to apply:** Require an owner-approved, verified target identity and an unchanged original-owner guard for any cross-environment recovery. Never infer ownership from the editable company contact email. Recovery must preserve company data and must not restore permissions revoked after completion.
