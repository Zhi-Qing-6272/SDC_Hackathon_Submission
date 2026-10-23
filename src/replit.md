# Nexora

An evidence-led career transition workspace that connects skills profiles to changing public job-market signals, future-role matches, SDG contributions, and practical learning plans.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/future-ready-workforce run dev` — run the web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `GET /api/trends` — aggregate current skill tags from the Remote OK public job API; `?refresh=true` bypasses the five-minute cache
- Private APIs: `GET/DELETE /api/workspace`, `PUT /api/profile`, `PUT /api/goal`, `PUT /api/progress/:stepKey`, and team-member CRUD under `/api/team-members`.
- Clerk authenticates private workspaces. Profiles, career directions, learning progress, and account-owned team records persist in PostgreSQL; browser storage holds only the language preference.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/future-ready-workforce/` — learner and employer-facing web app
- `artifacts/api-server/src/routes/trends.ts` — public job-posting signal aggregation
- `lib/api-spec/openapi.yaml` — source of truth for the API and generated clients
- `artifacts/future-ready-workforce/src/` — authenticated workspace, transparent scoring, account entry pages, and team planning

## Architecture decisions

- Live trend evidence comes from Remote OK's global remote-job feed; it is a directional sample, not a representative forecast of the Malaysian labour market.
- Role scoring is an explainable heuristic across five curated role profiles, based on skill overlap, explicit role-interest associations and current public-source signals. It is not a validated employment prediction or a language-model judgment.
- Treat this as a real system, not a demo. Start new accounts with an empty profile and team. Never invent users, team capabilities, or measured SDG impact.
- Use account ownership from the verified Clerk session for every private API read/write. Do not accept an owner or user ID from browser input.
- Team planning is account-owned, not a shared organisation or employee invitation system. Request permission before saving others' details.

## Product

Learners create a real skills profile, compare role matches under multiple planning scenarios, inspect evidence and SDG associations, and track a cited learning pathway. Team managers can add, edit and remove consented team records; gaps, shared learning priorities and SDG counts derive from those records. The workspace supports English, Bahasa Malaysia, and Chinese.

## User preferences

- Real learner and consented workforce details are supported. Minimise personal data; a preferred name is sufficient. Do not collect sensitive identity or financial information.
- Every trend-driven match and learning recommendation must show its source; label forecasts as estimates and keep human judgment in control.

## Visual guidelines

- Use navy `#0F1B2D` for headers, indigo `#4F46E5` for buttons/active states, cyan `#22D3EE` for data highlights, background `#F8FAFC`, white cards, and borders `#E2E8F0`.
- Use green `#10B981` for success/rising, amber `#F59E0B` for warning/moderate, and red `#EF4444` for danger/declining. Never imply trends unsupported by the source data.
- Use Inter for headings/body and JetBrains Mono for scores/dates. Headings use sentence case; cards have 14px corners and soft shadows.
- Amber/red planning panels must include visible “This is an estimate” text. Keep factual privacy/fairness/info notices neutral rather than presenting them as estimates.
- SDG chips retain official UN hexes (4 `#C5192D`, 8 `#A21942`, 9 `#FD6925`) and always show both the goal number and full label, never color alone.

## Gotchas

- Remote OK requires attribution: mention Remote OK as the source and keep a standard follow link to `https://remoteok.com`.
- The source feed can be unavailable; show that state explicitly rather than presenting stale sample signals as live.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
