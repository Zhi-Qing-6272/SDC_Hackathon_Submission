# Run Nexora with real Clerk sign-in and PostgreSQL (local)

You need Node.js 24, pnpm, PostgreSQL and a free Clerk account.

## 1. PostgreSQL
Create an empty database and user (any PostgreSQL works: local install, Docker, Neon, Supabase):

```sh
# Docker example
docker run -d --name nexora-db -e POSTGRES_USER=nexora -e POSTGRES_PASSWORD=change-me -e POSTGRES_DB=nexora -p 5432:5432 postgres:16
```

## 2. Clerk
1. Sign up at https://dashboard.clerk.com and create an application.
2. Enable **Email address** and **Password** as sign-in methods (Configure -> User & authentication). For a real deployment
   also require email verification and a strong password.
3. Open **API keys** and copy the Publishable key (`pk_test_...`) and Secret key (`sk_test_...`).

## 3. Environment
```sh
cp .env.example .env     # then edit .env with your database URL and Clerk keys
```

## 4. Install, create tables, run
```sh
pnpm install --frozen-lockfile
set -a; source .env; set +a
pnpm --filter @workspace/db run push          # creates the tables

# terminal 1: API on :8080
cd artifacts/api-server && pnpm run build && PORT=8080 node --enable-source-maps ./dist/index.mjs

# terminal 2: web app on :5173 (proxies /api to :8080)
cd artifacts/future-ready-workforce && set -a; source ../../.env; set +a && PORT=5173 BASE_PATH=/ pnpm run dev
```
Team invitations are emailed only if the SMTP variables in `.env` are filled in (see `.env.example`); otherwise the inviter gets a link to share.

Open http://localhost:5173. Register a company at `/register-company`, or create a normal account at `/sign-up`.

Keep the page on the same host you opened (`localhost:5173`): the API rejects cross-origin writes.

## Using Supabase as the PostgreSQL database
Nexora only needs a PostgreSQL connection string; it does not use Supabase Auth (Clerk handles sign-in).

1. Create a project at https://supabase.com/dashboard and save the database password you choose.
2. Click **Connect** (top of the project) and copy the **Session pooler** connection string (port 5432). The pooler works over
   IPv4; the "Direct connection" is IPv6-only on many plans.
3. Replace `[YOUR-PASSWORD]` with your password. URL-encode special characters (`@` -> `%40`, `#` -> `%23`, `/` -> `%2F`).
4. Put it in `.env` as `DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require`
   (if you see "self-signed certificate in certificate chain", change `sslmode=require` to `sslmode=no-verify`).
5. Run `pnpm --filter @workspace/db run push`; the tables appear under **Table Editor**.
6. **Lock the tables.** Supabase exposes the `public` schema through its REST API. Open **SQL Editor**, run the block below once.
   Nexora's server connects as the `postgres` role, which bypasses these rules, so the app keeps working.

```sql
alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
alter table public.org_teams enable row level security;
alter table public.org_recommendations enable row level security;
alter table public.learner_profiles enable row level security;
alter table public.team_members enable row level security;
alter table public.learning_progress enable row level security;
```

## Production
Build with `pnpm run build`, serve the web app's `dist/public` and the API behind one domain that routes `/api` to the API,
use Clerk **production** keys (`pk_live_` / `sk_live_`) and add your domain in the Clerk dashboard.
