# Run Nexora on Replit

This project is set up as a normal Replit pnpm project. One port (8080) carries everything:

- **Run button (development):** Vite serves the web app on port 8080 and proxies `/api` to the API server on port 3001.
- **Deployment (Autoscale):** one Node process serves `/api` **and** the built web app on port 8080.

The setup is in `.replit` and `scripts/replit-*.sh`. It was tested here against a local PostgreSQL (build, table creation,
production start, page routing and `/api`), not on Replit itself, so check the first run and tell me if anything differs.

## 1. Import
Create a Repl from the zip or from GitHub (Node.js). Replit reads `.replit`: Node.js 24 and PostgreSQL 16 are selected for you.
`pnpm` is installed automatically by the scripts if the Repl does not already have it.

## 2. Database
Open **Tools → PostgreSQL** and create the database. Replit adds `DATABASE_URL` to your Secrets. Tables are created
automatically on every Run and on every deployment build (`pnpm --filter @workspace/db run push`; it only adds what is missing).

## 3. Secrets (Tools → Secrets)
| Secret | Value |
| --- | --- |
| `CLERK_SECRET_KEY` | `sk_test_...` from your Clerk dashboard (API keys) |
| `CLERK_PUBLISHABLE_KEY` | `pk_test_...` from the same page (the web app reuses it; no separate `VITE_` secret is needed) |
| `DATABASE_URL` | added by the PostgreSQL tool |
| `HIMALAYAS_API_KEY` | optional (job feed rate limit). Use a **new** key; the one in earlier chats was exposed. |
| `GEMINI_API_KEY` | **free option** for the chat assistant: create a key at aistudio.google.com/apikey (Google account, no card for the free tier). Answers any question and can search the web. |
| `ANTHROPIC_API_KEY` | needed for the chat assistant to answer anything (without it, it only gives built-in answers about using Nexora). Create one at console.anthropic.com; usage is billed to you. |
| `AI_WEB_SEARCH` | optional, `on` by default: lets the assistant search the internet (for Claude also allow it in Console → Settings → Privacy). Set `off` to disable. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | optional, to email team invitations (see `.env.example`) |

In Clerk, enable **Email address + Password** sign-in. For **Forgot password** to work, also open Clerk → User & authentication → Email, and keep **Email verification code** switched on (it is on by default). Clerk sends the code itself, so no SMTP setup is needed, and it works for Gmail or any other mailbox. If the Replit preview or deployment domain is rejected by Clerk, add it under
Clerk → Domains / allowed origins. `APP_BASE_URL` is not needed on Replit: invitation links use the address people are visiting.

## 4. Run
Press **Run**. The first start installs packages (about a minute). Open the preview: the landing page appears, then
**Register a company** / **Sign up** use Clerk.

## 5. Deploy
**Deploy → Autoscale.** Build: `scripts/replit-build.sh`, run: `scripts/replit-start.sh` (already in `.replit`). Add the same
Secrets to the deployment. The deployment build needs `CLERK_PUBLISHABLE_KEY` because the web app embeds it when built.

For a **live** Clerk instance (`sk_live_...`) on a `*.replit.app` address, Clerk's proxy is used: the server turns it on
automatically for live keys, and you also add the secret `VITE_CLERK_PROXY_URL` = `https://<your-app>.replit.app/api/__clerk`.
Development keys (`sk_test_...`) need no proxy.

## Notes
- The original Replit Agent service files (`artifacts/*/.replit-artifact/artifact.toml`) are kept. If Replit starts those services
  too, stop them (they use ports 8080/22019) or delete the `.replit-artifact` folders; the `.replit` workflow above does not need them.
- `pnpm install --frozen-lockfile` needs the committed `pnpm-lock.yaml`; do not delete it.
- Free Replit PostgreSQL is a normal database: employee skills and company data are stored there. Treat the Secrets as private.
