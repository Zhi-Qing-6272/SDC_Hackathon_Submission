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


## Overview

### Problem

AI is changing job requirements faster than training programmes and skills frameworks can keep up. In Malaysia, 56% of professionals already use AI tools at work, yet only 26% have received formal training (Hays Asia Salary Guide 2025), and the Ministry of Science, Technology and Innovation estimates that more than 600,000 workers will need reskilling within three to five years. Workers lack awareness of which jobs and skills are rising or declining, and personalised, affordable reskilling guidance is hard to find. Employers face the same gap: they cannot easily see which skills their teams are missing or what training to plan.

### Solution

Nexora is a web-based career and workforce planning platform that takes a person from "who I am today" to "where I can be in the AI era":

1. Users build a skills profile by uploading a CV, pasting their experience or answering a short questionnaire. The CV is read in the browser and never uploaded.
2. Nexora pulls live job postings from the Himalayas remote-jobs API and turns them into skill-demand signals, always shown with their source and date. US Bureau of Labor Statistics (BLS) occupational data adds projected job growth and median pay for each role.
3. Each future role gets an explainable match score (70% skills, 30% interests), a list of matched skills and a clear skills gap. Real vacancies are matched to the profile too.
4. Users get an ordered learning plan with estimated hours, free or low-cost course links and progress tracking, with each role and skill linked to the UN Sustainable Development Goals.

Nexora is designed to **support** human career decisions, not replace them. Every signal cites its source, predictions are labelled as estimates, several future scenarios are shown side by side, and name, age, gender and background are never used for matching. An optional AI Help chat (Google Gemini or Anthropic Claude) answers questions, but the matching, scoring and pathways themselves are transparent, rule-based calculations, so the system cannot invent jobs, courses or statistics.

### Key Features

- **Skills profile intake** — Upload a CV (.docx, .txt or .md), paste text or answer a questionnaire; skills and interests are extracted in the browser, and the user chooses which to keep.
- **Live job-market signal layer** — Server-side client for the [Himalayas remote-jobs API](https://himalayas.app/docs/remote-jobs-api), cached for 6 hours with a last-good-snapshot fallback. The Market signals page shows the top in-demand skills with source name, link and fetch date.
- **Explainable future-role matching** — 21 career directions (from Data Analyst and Cybersecurity Analyst to Sustainability/Clean-energy Analyst and Agri-tech Data Specialist) ranked by match score, with matched skills and missing skills listed for each.
- **Vacancy matching** — Live Himalayas postings ranked against the profile, showing matched and missing skills, with every apply button linking to the employer's own application page.
- **Possible futures (handling uncertainty)** — The same profile is re-ranked under five scenarios: *Gradual change*, *Faster change*, *Routine tasks automated*, *AI-driven build-out* and *Cautious hiring*. Each scenario weights skills, interests, live demand and AI exposure differently, and all results are labelled as planning estimates.
- **AI risk to jobs and pay** — BLS Occupational Outlook Handbook figures (projected employment change 2025–35 and median pay) matched to each direction, with links to the BLS source.
- **Personalised reskilling pathway** — Step-by-step plan for the chosen direction with provider, estimated hours, cost label (free / provider pricing varies) and course links (Khan Academy, Kaggle Learn, Microsoft Learn, HubSpot Academy, Salesforce Trailhead, AWS Skill Builder, OpenLearn, Coursera and more). Progress is saved to the user's account.
- **SDG mapping** — Roles and skills are tagged to SDGs (for example SQL → SDG 4, 8, 9; Process improvement → SDG 8, 9, 12) with full official labels, and a disclosure that tags are associations, not measured impact.
- **Progress, levels and badges** — Progress bar, XP level and ten badges to keep learners motivated.
- **Company workspace (HR view)** — Companies register, invite employees with a join code and define teams and required skills. A skill-gap ranking and team-by-skill matrix show where training is needed, and administrators recommend online training. Employees decide whether to share their data, and sharing is off by default.
- **Learning teams** — Users create a team and invite others by email to reskill together. Invitations use hashed tokens, require a verified email and expire after 7 days.
- **AI Help chat** — A Help button on every page, powered by Google Gemini (free tier) or Anthropic Claude with optional web search and source links. Without an API key it falls back to built-in answers in English, Bahasa Malaysia and Chinese.
- **Multi-language** — The administrator workspace and Help chat are available in English, Bahasa Malaysia and Chinese (Simplified).

### Tech Stack

| Layer           | Technology                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------ |
| Frontend        | React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4, Radix UI / shadcn components, TanStack Query, Wouter |
| Backend         | Node.js 24, Express 5, REST API defined in OpenAPI (Orval-generated React Query client and Zod validators), Pino logging, Nodemailer |
| Database        | PostgreSQL 16 with Drizzle ORM                                                              |
| Authentication  | Clerk (email + password, email verification codes for password reset)                     |
| Data sources    | Himalayas remote-jobs API (live postings), US BLS Occupational Outlook Handbook (job growth and pay) |
| AI              | Optional Google Gemini (`gemini-flash-latest`) or Anthropic Claude (`claude-haiku-5-5`) for the Help chat |
| AI / Compute    | RunPod (GPU) — *see [How We Use RunPod](#how-we-use-runpod-required)*                      |
| Hosting / Dev   | Replit (development and Autoscale deployment)                                              |
| Tooling         | pnpm workspaces (monorepo), esbuild, Node test runner                                      |

---

## Project Structure

```
.
├── artifacts/
│   ├── future-ready-workforce/          # Web app (React + Vite). Internal name kept for imports/routing
│   │   ├── src/
│   │   │   ├── App.tsx                  # App shell, routing, overview, profile, pathway & SDG mapping
│   │   │   ├── components/
│   │   │   │   ├── discover.tsx         # CV / text / questionnaire intake, direction & vacancy matching
│   │   │   │   ├── market-signals.tsx   # Himalayas skill-demand signals with source and date
│   │   │   │   ├── futures.tsx          # Possible-futures scenarios and AI risk to jobs and pay
│   │   │   │   ├── pathway.tsx          # Personalised reskilling pathway and progress
│   │   │   │   ├── gamify.tsx           # Levels, XP and badges
│   │   │   │   ├── admin-shell.tsx      # Company administrator workspace
│   │   │   │   ├── admin-pages.tsx      # Overview, Skill gaps, Teams, Training, Employees, Company details
│   │   │   │   ├── team-manager.tsx     # Learning teams and invitations
│   │   │   │   ├── support-chat.tsx     # AI Help chat
│   │   │   │   └── ui/                  # shadcn/Radix UI components
│   │   │   └── lib/
│   │   │       ├── discovery.ts         # Skill extraction, 21 directions, match scores, scenarios
│   │   │       ├── ai-risk.ts           # BLS occupation data and AI-exposure rules
│   │   │       ├── sdg.ts               # Official SDG labels
│   │   │       ├── training-catalog.ts  # Curated training providers
│   │   │       ├── achievements.ts      # Badge and level logic
│   │   │       └── admin-dict.ts        # EN / BM / ZH translations for the admin workspace
│   │   ├── tests/                       # Workspace-routing unit tests
│   │   └── vite.config.ts
│   └── api-server/                      # Express API
│       ├── src/
│       │   ├── routes/                  # health, trends, vacancies, market, workspace, org, teams, support
│       │   ├── lib/                     # himalayas.ts, market-stats.ts, mailer.ts, support-faq.ts, synthetic-data.ts
│       │   └── middlewares/             # Clerk proxy middleware
│       ├── tests/                       # Unit and integration tests
│       └── build.mjs                    # esbuild bundle
├── lib/
│   ├── db/                              # Drizzle schema + PostgreSQL access (drizzle-kit push)
│   ├── api-spec/                        # OpenAPI contract + Orval code-generation config
│   ├── api-client-react/                # Generated React Query client
│   └── api-zod/                         # Generated Zod validators
├── scripts/                             # Replit run / build / start scripts
├── .env.example                         # Example environment variables
├── .replit                              # Replit run and deployment configuration
├── LOCAL_SETUP.md                       # Local setup guide (PostgreSQL, Clerk, Supabase)
├── REPLIT_SETUP.md                      # Replit setup guide (Secrets, Run, Autoscale)
├── package.json                         # Workspace root (pnpm only)
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── README.md
```

### Architecture

```
                         ┌──────────────────────────────────────────┐
User (browser) ─────────►│  React web app (Vite)                    │
  • CV read locally      │  matching, scenarios, pathway, SDG tags  │
                         └───────────────┬──────────────────────────┘
                                         │ /api (same origin)
                         ┌───────────────▼──────────────────────────┐
                         │  Express API (Node.js 24) on Replit       │
                         │  Clerk auth · REST routes · 6 h cache     │
                         └──┬──────────┬───────────┬──────────┬─────┘
                            │          │           │          │
                 PostgreSQL ◄┘  Himalayas API ◄─┘  Clerk ◄──┘  Gemini / Claude
               (Drizzle ORM)   (live job postings) (sign-in)   (optional Help chat)
```

The CV is parsed in the browser, and only the skills and interests the user keeps are sent to the server. In development, Vite serves the web app on port 8080 and proxies `/api` to the API on port 3001. In deployment, a single Node process serves both the built web app and `/api` on port 8080.

### Main API Routes

| Area        | Routes                                                                                   |
| ----------- | ---------------------------------------------------------------------------------------- |
| Health      | `GET /api/healthz`                                                                       |
| Signals     | `GET /api/trends`, `GET /api/vacancies`, `GET /api/market/himalayas`                     |
| Workspace   | `GET/DELETE /api/workspace`, `PUT /api/profile`, `PUT /api/progress/:stepKey`, `PUT /api/goal` |
| Company     | `/api/org/*` — registration, join codes, teams, skill gaps, training recommendations, sample data |
| Teams       | `/api/teams/*`, `/api/invitations/*` — learning teams and email invitations              |
| Help chat   | `POST /api/support/chat`                                                                 |

---

## How to Run

**Requirements:** Node.js 24, pnpm, PostgreSQL and a free [Clerk](https://dashboard.clerk.com) application with **Email address + Password** sign-in enabled.

### Option 1 — Run on Replit (Recommended)

1. Open the [Replit Project](https://replit.com/@your-username/your-project), or import this repository via **Create Repl → Import from GitHub**. Replit reads `.replit` and selects Node.js 24 and PostgreSQL 16.
2. Open **Tools → PostgreSQL** and create the database. Replit adds `DATABASE_URL` to Secrets automatically.
3. Open the **Secrets** tab (🔒) and add the variables listed in `.env.example`:
   - `CLERK_SECRET_KEY` — required (`sk_test_...`)
   - `CLERK_PUBLISHABLE_KEY` — required (`pk_test_...`, the web app reuses it)
   - `HIMALAYAS_API_KEY` — optional, raises the job-feed rate limit
   - `GEMINI_API_KEY` or `ANTHROPIC_API_KEY` — optional, enables the AI Help chat
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` — optional, emails team invitations
4. Click **Run**. `scripts/replit-dev.sh` installs packages, creates the database tables and starts the API and web app. The first start takes about a minute.
5. To deploy, choose **Deploy → Autoscale**. The build and run scripts are already set in `.replit`. Add the same Secrets to the deployment.

See [`REPLIT_SETUP.md`](REPLIT_SETUP.md) for details, including Clerk live keys on a `*.replit.app` domain.

### Option 2 — Run Locally

```bash
# 1. Clone the repository
git clone https://github.com/your-username/your-project.git
cd your-project

# 2. Install dependencies (pnpm only)
pnpm install --frozen-lockfile

# 3. Configure environment variables
cp .env.example .env            # then fill in DATABASE_URL and Clerk keys
set -a; source .env; set +a

# 4. Create the database tables
pnpm --filter @workspace/db run push

# 5. Terminal 1 — start the API on :8080
cd artifacts/api-server && pnpm run build && PORT=8080 node --enable-source-maps ./dist/index.mjs

# 6. Terminal 2 — start the web app on :5173 (proxies /api to :8080)
cd artifacts/future-ready-workforce && set -a; source ../../.env; set +a && PORT=5173 BASE_PATH=/ pnpm run dev
```

Open http://localhost:5173. Create a personal account at `/sign-up`, or register a company at `/register-company`.

> On Windows, run these commands in Git Bash or WSL. For a quick PostgreSQL database, use Docker, or a hosted service such as Neon or Supabase (see [`LOCAL_SETUP.md`](LOCAL_SETUP.md)).

### Run Tests

```bash
pnpm run typecheck                                        # type-check all packages
pnpm --filter @workspace/future-ready-workforce run test  # web app unit tests
pnpm --filter @workspace/api-server run test              # API unit tests
pnpm --filter @workspace/api-server run test:integration  # API integration tests
```

---

## How We Use Replit *(Required)*

- **Development:** Nexora was built in a Replit pnpm workspace. `.replit` selects Node.js 24 and PostgreSQL 16, and the **Run** button starts `scripts/replit-dev.sh`, which runs the API and the Vite web app together on one preview port.
- **Database:** Replit's built-in PostgreSQL stores learner profiles, learning progress, career goals, companies, teams and invitations. Tables are created or updated automatically on every Run and deployment build.
- **Hosting:** The app is deployed with **Replit Autoscale Deployments** at the Live Demo link above. `scripts/replit-build.sh` builds the web app and API, and `scripts/replit-start.sh` serves both from one Node process.
- **Secrets:** Clerk keys, the database URL and optional API keys (Himalayas, Gemini/Claude, SMTP) are stored in Replit Secrets, never in the code.
- **Credits:** Development and deployment use the SDC sponsor-provided Replit promotional credits.

📄 Proof of use: https://drive.google.com/file/d/1zFw_-PBCefOb1V0EW6Wsr1Q1WM_R6Qkw/view?usp=sharing


---

## Challenges & Learnings

- **Getting updatable trend data without hard-coded lists.** Himalayas postings have categories, not a skills list, so we built a skill-alias dictionary that matches skills from categories, job titles and summaries, and ignores ambiguous words (such as "go" or "data") in free text. We cache results for 6 hours and serve the last good snapshot if the API fails.
- **Stopping the AI from inventing jobs, courses or statistics.** We kept matching, scoring, scenarios and pathways as transparent rule-based calculations, with every signal showing its source and date. The language model is limited to the optional Help chat.
- **Showing uncertainty honestly.** Instead of one prediction, we re-rank the same profile under five future scenarios and label all scores, BLS-based risk arrows and SDG tags as estimates or associations.
- **Privacy and fairness.** CVs are read in the browser and never uploaded. Name, age, gender and background are never used for matching, and employees must opt in before their company administrator can see their skills.
- **Authentication on Replit.** Clerk live keys on a `*.replit.app` domain needed Clerk's proxy, so the server enables it automatically for live keys.
- **Learning:** We learned to design a full-stack TypeScript monorepo with an OpenAPI contract, generated clients and server-side authorisation, and to build for transparency and human control rather than black-box recommendations.

## Future Improvements

- [ ] Read PDF CVs in the browser (currently .docx, .txt and .md only).
- [ ] Integrate RunPod for GPU-hosted model inference.
- [ ] Add more updatable trend sources (news or research feeds, Malaysian job-market data) and automatic re-planning when signals change.
- [ ] Extend SDG mapping to every role and skill, with a person, company and regional SDG contribution view.
- [ ] Translate personal and sign-in pages into Bahasa Malaysia and Chinese, with native-speaker review.
- [ ] Add HRD Corp-claimable programmes to the training catalogue.
- [ ] Verify company registration numbers against an official registry such as SSM.
- [ ] Add the `/api/org/*` and `/api/teams/*` routes to the OpenAPI spec and generated client.
- [ ] Add automated fairness checks on recommendations.

## Team

| Name           | Role                | GitHub                                   |
| -------------- | ------------------- | ---------------------------------------- |
| Chang Zhi Qing | Team Lead / Backend | Zhi-Qing-6272                            |
| Chai Xiu Yi    | Frontend            | chaixiuyi7-dev                           |

---

## Submission Checklist

- [x] Team name, domain (Domain 1 / Domain 2) and SDG track filled in
- [x] Slide deck link added
- [x] Demo video link added
- [x] Replit used, with proof of use in `submission/`
- [ ] RunPod used, with proof of use in `submission/`
- [x] Preliminary submission completed (`SDC2026_DuoLogic_Preliminary.pdf`)
- [x] Technology declaration completed (`SDC2026_DuoLogic_TechDeclaration.pdf`)
- [x] Submission files renamed with your team name (replace `TeamName`)
- [x] "How to Run" steps verified
- [x] No API keys or secrets committed to the repository

## License

This project is licensed under the [Apache License 2.0](LICENSE).
