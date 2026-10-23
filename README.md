# Nexora
AI-powered career readiness and reskilling platform serves working adults, fresh graduates, career switchers, HR and learning-and-development managers, university centres.

## Team Information
| FIELDS                 | Details                                                                                     |
|------------------------|---------------------------------------------------------------------------------------------|
|**Team Name**           | Nexora                                                                                      |
|**Team Domain**         | Domain 1                                                                                    |
|**SDC Track (1-17)**    | SDG 4 - Quality Education, SDG 5 - Gender Equality, SDG 8 - Decent work and Economic Growth,|
|                        | SDG 9 -Industry Innovation and Infrastructure, SDG 10 - Reduced Inequalities                |
|**Team Leader**         | Chang Zhi Qing                                                                              |
|**University**          | Universiti Tunku Abdul Raman (Sungai Long)                                                  |
|**Number of Members**   |2                                                                                            |

## Links
| Resource                | Links                                                                              |
|-------------------------|------------------------------------------------------------------------------------|
| GitHub Repository       | https://github.com/Zhi-Qing-6272/SDC_Hackathon_Submission                          |
| Replit Project          | https://nexora-2.replit.app                                                        |
| Live Demo               | https://nexora-2.replit.app                                                        |
| Slide Deck              | https://drive.google.com/file/d/10GpeyZjiWhJtuaKFY4sX5kzkKWYsbB0N/view?usp=sharing |
| Demo video              | https://youtu.be/6ILReXxpRDg                                                       |


# Nexora — source code

This archive contains Nexora's current web frontend, Express API, PostgreSQL
schema, OpenAPI contract, generated API clients, shared packages, and workspace
configuration. The internal package and folder names remain
`future-ready-workforce` so existing imports and routing continue to work.

## Included

- `artifacts/future-ready-workforce/` — React, TypeScript, Vite, CSS, and public assets.
- `artifacts/api-server/` — Express API, authentication middleware, market signals,
  and account-owned workspace endpoints.
- `lib/db/` — Drizzle schema and PostgreSQL access.
- `lib/api-spec/` — OpenAPI contract and code generation configuration.
- `lib/api-client-react/` and `lib/api-zod/` — generated clients and validators.
- Workspace package manifests, lockfile, TypeScript configuration, and scripts.

## Requirements

- Node.js 24 and pnpm compatible with the included lockfile.
- PostgreSQL.
- Your own configured Clerk application, or Clerk provisioned in your Replit project.

Configure these variables using your environment's secret manager:

- `DATABASE_URL` — database connection.
- `CLERK_SECRET_KEY` — server-side Clerk key.
- `CLERK_PUBLISHABLE_KEY` — Clerk publishable key.
- `VITE_CLERK_PUBLISHABLE_KEY` — matching frontend publishable key.

No real variable values or credentials are included. Do not commit secret files.
An existing Clerk application's users are not copied into this archive.

**Step-by-step local setup (PostgreSQL + Clerk): see `LOCAL_SETUP.md` and `.env.example`.**

## Install and check

From the extracted project root:

```sh
pnpm install --frozen-lockfile
pnpm run typecheck
```

To create tables in a NEW, empty development database after configuring
`DATABASE_URL`:

```sh
pnpm --filter @workspace/db run push
```

Review schema changes before applying them to a populated database. The archive
contains table definitions, not user records or database backups.

## Help chat (AI support box)

A round **Help** button sits at the bottom-right of every page (before and after sign-in, personal and administrator). It opens a chat
for people who hit a problem or are unsure what to do. Code: `src/components/support-chat.tsx` (UI), `api-server/src/routes/support.ts`
(`POST /api/support/chat`), `api-server/src/lib/support-faq.ts` (product facts and built-in answers).
- **Free option:** set `GEMINI_API_KEY` (Google AI Studio, free tier, no card) and Google Gemini answers instead (model `GEMINI_MODEL`, default
  `gemini-flash-latest`) with Google Search grounding. Free-tier limits are set by Google and shown in AI Studio; Google may use free-tier
  content to improve its products, so avoid it for confidential use or switch to a paid key. If both keys are set, Claude is used unless
  `AI_PROVIDER=gemini`. The rest of this section describes the Claude option, which behaves the same way.
- With `ANTHROPIC_API_KEY` set on the server, Claude answers **any** question (Nexora help, careers, study, writing, coding, general
  knowledge, casual chat) and can **search the web** (Anthropic's built-in web search tool, up to 3 searches per answer) for anything
  current: news, prices, job-market figures. Answers show their source links under the message. Model: `ANTHROPIC_MODEL`
  (default `claude-haiku-5-5`). Web search must be allowed for your organisation in the Anthropic Console (Settings > Privacy); if it is
  not, or if you set `AI_WEB_SEARCH=off`, the assistant answers without searching. Searches and long answers cost more than plain
  replies, so watch your Console usage. For Nexora questions it relies on the product facts and says when it is not sure; it never asks
  for passwords and gives general information only for medical, legal and financial matters. Without the key, or if the AI service is
  unreachable, it only gives built-in quick answers about using Nexora (English, Bahasa Malaysia, Chinese) and says the AI assistant is
  not connected. There is no AI without the key.
- It replies in the language chosen in the app (the administrator workspace and the personal workspace each keep their own choice).
- Privacy: only the typed messages (last 12), the page name, account kind and language are sent. No profile, CV, skills or company data.
  Nothing is stored or logged; the conversation disappears on reload. Limit: 30 messages per person (or IP) per hour per server instance.
- The AI cannot see or change accounts, and is not a substitute for the company administrator. The crash screen has an "Ask for help" button too.

## Run on Replit

See **REPLIT_SETUP.md** for the Repl setup (`.replit`, Secrets, Run, Autoscale deployment). One port serves the site and `/api`.

## Run in the existing Replit routing environment (Agent artifacts)

Service configuration is preserved in each app's `.replit-artifact/artifact.toml`.
The web app is mounted at `/` and the API is mounted at `/api`.

The configured service commands are:

```sh
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/future-ready-workforce run dev
```

The service environment supplies `PORT`; the frontend also requires
`BASE_PATH=/`. Authentication and database services must be configured separately
in a different project.

## Running outside Replit

The source retains its existing routing configuration; this is not a newly
verified standalone deployment template. Supply `PORT` for each service and
`BASE_PATH=/` for Vite. Configure a same-origin reverse proxy that routes `/api`
to the API service and all other paths to the frontend. For local development,
a Vite `server.proxy` entry for `/api` can provide that routing.

Use Clerk keys and permitted origins appropriate to the new host. Production
build and routing instructions are in the artifact manifests. Do not reuse the
original project's identity keys or assume its users will migrate automatically.

## Excluded

Installed dependencies, compiled output, caches, Git history, chat/history files,
uploaded reference documents, database records, local environment files, and the
unrelated mockup sandbox are intentionally excluded.

The source includes the current navy/indigo theme, Inter and JetBrains Mono
typography, Nexora branding, private accounts, persisted learning progress, and
account-owned team planning.

## Himalayas job postings (vacancies, skill signals and market page)

Vacancy matching on the Discover page and the skill signals on the Overview/Signals pages read public remote postings
from the [Himalayas remote-jobs API](https://himalayas.app/docs/remote-jobs-api) through the server
(`artifacts/api-server/src/lib/himalayas.ts`). The API key is optional but gives higher rate limits. Set it **on the
server only**, never in browser code, source control or logs:

```
HIMALAYAS_API_KEY=hml_...your key...
```

- Himalayas refreshes its data every 24 hours, so results are cached for 6 hours (one refresh is about 10 requests; the
  limit with a key is 60 per minute and 10,000 per day). If Himalayas fails, the last snapshot is served.
- The Market signals page (`/api/market/himalayas`) summarises the same cached sample, so it makes no extra API calls. Adzuna is no longer used.
- Himalayas jobs have categories, not a skills list, so skills are matched from categories, titles and excerpts.
- Terms of the API: the app shows a visible Himalayas credit with a link to himalayas.app, every apply button uses the
  job's `applicationLink`, and jobs must not be redistributed to other job boards.

## Company workspace (administrator accounts)

Companies **register** with real details; nothing is pre-filled and there is no demo data.

1. The administrator creates a sign-in at `/register-company` (Clerk: email + password; the password lives only with Clerk).
2. They then complete the registration form on the **Company** page: company name, **company registration number**,
   **business licence number**, industry, size, registered address, contact name/email/phone, optional website, and two
   required confirmations (authorised to register; employee data used only for training planning).
3. They become the company administrator and receive a join code for employees. The **Company details** tab lets them
   update everything except the legal name and registration number. Administrators have **Sign out** and
   **Account & password** buttons in the dashboard header.

Registration and licence numbers are checked for **format and uniqueness only** (one company per registration number); they
are not verified against an official registry such as SSM. If you need real verification, add a review step or a registry API.

**Database:** this adds four tables (`organizations`, `org_members`, `org_teams`, `org_recommendations`). If you already ran
an earlier version of this feature, `organizations` gained required columns, so run `pnpm --filter @workspace/db run push`
and accept its prompts (on a database with no real companies it is safe to let it recreate that table).

Set in Clerk: enable email + password, require a strong password and email verification for production.

- Employees choose whether their administrator can see them. Sharing is off by default and can be switched off at any time.
- When sharing is on the administrator sees only: name, current role, skills, chosen direction and learning-step counts.
  Never interests, experience notes or CV text (CVs are read in the browser and are not uploaded).
- Administrators define teams and the skills each team needs, see skill gaps for employees who share, and recommend training
  for a team or the whole company. Employees mark recommended training complete from their Company page.
- Authorisation is enforced on the server (`artifacts/api-server/src/routes/org.ts`): the company and role come from the
  signed-in user's membership row, never from the request. Join codes are rate limited and can be rotated.
- Deleting a workspace removes the person from their company; if the last administrator leaves, the company and its data are removed.
- These `/api/org/*` routes are plain Express routes and are not yet part of the OpenAPI spec / generated client.

## Forgot password

Both sign-in pages (personal and company) show a **Forgot your password?** link (`/forgot-password`, `/company-forgot-password`).
Steps: enter the account email, then Clerk emails a 6-digit verification code (Gmail or any inbox), enter the code, then choose a new
password; the person is signed in afterwards (company administrators land in the company workspace). The code can be re-sent after 30
seconds. An unknown email gets the same screens as a known one, so the page does not reveal which emails have accounts.
Requirements: Clerk with Email + Password enabled and **Email verification code** on. No SMTP is needed for this; SMTP is only for team invitations.
In the downloadable preview file the code is shown in a "Preview mailbox" box because it cannot send email.

## Company sign-in and learning teams

**Two kinds of account.** The sign-in and sign-up pages each offer both: *Personal sign in / Create personal account* (employees and
learners; a personal account can only **join** a company with a join code) and *Company sign in / Register a company*. A
company account is created from `/register-company` (the sign-up form records `unsafeMetadata.accountType = "company"` in Clerk);
only company accounts see the register-company form, and `POST /api/org` returns 403 for personal accounts. This marks the
*intent* chosen at sign-up; it is not a hard security boundary (a Clerk user can edit their own unsafe metadata), so add a
review step if you need real vetting. A company registration is also checked for format and uniqueness only, as above.
Accounts that registered a company before this change keep working; a personal account that wants to register a company
must create a separate company account (another email).

**Registering a company** is one page with two steps at `/register-company` ("Register a company" tab on the sign-up page):
1) the company details (name, registration number, business licence number, industry, size, address, contact, two confirmations),
2) create the administrator sign-in (email prefilled from the contact email). The details are held in that browser tab only
(`sessionStorage`) and are sent to the server automatically right after the account exists; if the server rejects them (for
example the registration number is already registered) the same form opens inside the workspace, prefilled, with the error.
Remember that email and password: they are the company login. Later, **Company sign in** (`/company-sign-in`) takes the
administrator straight to their company dashboard, and a normal sign-in with the same account also opens the company first.
Employees never register the company again: they join with the join code.

**Administrator workspace.** When a company administrator signs in they get their own menu and pages instead of the personal ones:
Overview, Skill gaps, Teams, Training, Employees and Company details (`components/admin-shell.tsx`, pages in `components/admin-pages.tsx`).
Discover, Market signals, Learning pathway, My profile and Team view are for personal accounts only. Removing the company
and its data is under Company details.

**Languages (administrator).** The administrator workspace is available in **English, Bahasa Malaysia and Chinese (Simplified)**.
Use the language selector in the top bar; the choice is remembered in that browser (`localStorage`, key `nexora-admin-language`).
Menu, page text, table headings, buttons, confirmations, plurals, skill / role / industry names and the test teams' names and job
titles are translated. All translations live in one file, `src/lib/admin-dict.ts` (English text -> [Bahasa Malaysia, Chinese]);
a missing entry falls back to English, and to add a language or fix a phrase you only edit that file (plus `Lang`/`LANGS` in
`src/lib/admin-i18n.ts`). Not translated: the sign-in / registration pages, member (employee) pages, server error messages,
anything people typed (company, team and employee names, notes), and course titles and provider search terms, which stay English
because the providers' catalogues are English. The Bahasa Malaysia and Chinese wording was written by Claude, not a professional
translator: have a native speaker review it before relying on it.

**Skill gaps, test data and training (administrator).**
- *Skill gaps* ranks every team from the biggest gap (rank 1) to the smallest. Coverage = required skills present ÷ required skills,
  counted across the team's sharing employees; equal coverage shares a rank. A team-by-skill matrix compares teams side by side;
  teams with no sharing employees or no required skills are listed as "not ranked". Self-reported skills, for planning only.
- *Test data*: **Load test data** (Overview, Teams, Employees or Skill gaps when empty) adds **30 synthetic employees in 10 synthetic
  teams** (`api-server/src/lib/synthetic-data.ts`, invented names,). Remove them under Company details.
  `POST/DELETE /api/org/admin/sample-data` are administrator-only; real employees and teams are never touched. Run
  `pnpm --filter @workspace/db run push` once: `org_teams` gained a `synthetic` column (safe, defaults to false).
- *Training* → **Find online training**: choose a team (starts from its skill gaps and most common target role), a role and skills,
  or type any topic. Nexora shows hand-picked starting points (`src/lib/training-catalog.ts`: Google/Coursera certificates, Kaggle,
  CS50, freeCodeCamp, AWS, Microsoft Learn, HubSpot Academy, etc.) and links that open each provider's own search results
  (Coursera, edX, Udemy, LinkedIn Learning, FutureLearn, Class Central, YouTube). It does **not** call a course-search API,
  scrape sites or rank results; featured links are suggestions to re-check. A chosen course is stored with its link in the
  recommendation note and shown to employees.

**Learning teams (reskill together).** In **Team view** a person must first **create a team**; only then can they invite people.

- An invitation is addressed to an email address. The invited person is **not** a member yet (shown as *Pending*).
- They are added only when they click **Accept**, either in their own Team view or on the invitation link
  (`/invite/<token>`), signed in with the invited email address. Declining, expiry (7 days) and cancelling add nobody.
- Server rules (`artifacts/api-server/src/routes/teams.ts`): the link token is stored only as a SHA-256 hash; accepting
  needs a **verified** email on the Clerk account that matches the invitation; the owner sees only a member's name, current
  role, skills and chosen direction (never interests, experience notes or CV text); a member can leave at any time.
- **Email sending:** set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` and `APP_BASE_URL` (see `.env.example`).
  With no SMTP settings the invitation is still created and the inviter is shown the private link to send themselves.
- **Database:** adds `learning_teams`, `learning_team_members`, `team_invitations`; run `pnpm --filter @workspace/db run push`.
  New dependency `nodemailer`: run `pnpm install`.
- The new Team view / invitation wording is English only for now.

## Progress, levels and badges

The Pathway page shows a progress bar for the chosen direction, a level with an XP bar and ten badges; the Overview page
shows a summary card. Everything is derived from existing progress data (`src/lib/achievements.ts`). Badges are remembered
in the browser's local storage so they stay earned on that device; they are for motivation only, not a qualification.
