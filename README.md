# OrgScreen

> AI-powered applicant screening built for the realities of African hiring.

OrgScreen helps a recruiter go from a pile of two hundred résumés to a defensible shortlist in a single sitting — without flattening cultural nuance into a checkbox. Set up your organization's profile (mission, culture values, ideal candidate personas), post a role, drop in candidates by résumé, CSV, or hand, and let Google's Gemini 2.5 Flash do the heavy lifting of ranking and reasoning.

Built at the African Leadership University for the Umurava AI Hackathon.

---

## Why this exists

Across the continent, the same two hundred résumés cycle through the same five recruiters every Monday morning. Most "AI hiring" stacks were trained on someone else's labor market and someone else's idea of fit — they rank a Kigali-trained engineer against a San Francisco template and call the mismatch a candidate's fault.

OrgScreen is a small bet on a tool that takes the heavy lifting off recruiters while staying shaped by the cultures it's hiring into. It is the recruiter's calculator, not their replacement.

## Features

- **Organization profile** — Encode mission, culture values, and ideal candidate personas as first-class data, not as free-text the model has to guess at.
- **Job creation** — Define a role with structured requirements, must-have skills, and nice-to-haves.
- **Three intake methods**:
  - Bulk PDF résumé upload (parsed server-side with `pdf-parse`)
  - Structured CSV import with semicolon-separated skill cells
  - Manual entry for the one walk-in
- **Gemini-powered ranking** — Each candidate gets a score, a rank, and a written rationale tied to your job + culture.
- **Results dashboard** — Filter, sort, and read why each candidate was placed where they were.
- **Team page** — Public-facing "humans behind it" page with the project's small team.

## Tech stack

| Layer | Tooling |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, lucide-react, Tailwind v4, custom CSS variable design system |
| Backend | Express 4, TypeScript, Mongoose 8 (MongoDB Atlas), Multer, `pdf-parse` |
| AI | Google Gemini 2.5 Flash (`@google/generative-ai`) |
| Hosting | Vercel (frontend), Railway + Nixpacks (backend), MongoDB Atlas |
| Runtime | Node.js 20 |

## Architecture

```
                 ┌─────────────────────────┐
                 │  Next.js client         │
                 │  (Vercel)               │
                 └──────────┬──────────────┘
                            │ axios
                            ▼
                 ┌─────────────────────────┐
                 │  Express API            │
                 │  (Railway · Nixpacks)   │
                 └─────┬─────────────┬─────┘
                       │             │
                       ▼             ▼
              ┌────────────┐  ┌─────────────────┐
              │ MongoDB    │  │ Gemini 2.5 Flash│
              │ Atlas      │  │ (Google)        │
              └────────────┘  └─────────────────┘
```

The frontend never talks to Gemini directly. All scoring requests go through the Express API, which holds the API key, normalises candidate data, and writes results back to MongoDB.

## Project structure

```
orgscreen/
├── frontend/                 # Next.js app (App Router)
│   ├── app/                  # Routes & pages
│   │   ├── page.tsx          # Home / dashboard
│   │   ├── setup/            # Organization profile builder
│   │   ├── jobs/             # Job list + creation
│   │   ├── candidates/       # Three-way candidate intake
│   │   ├── screen/           # Trigger a screening run
│   │   ├── results/          # Score dashboard
│   │   └── team/             # Public team page
│   ├── components/           # Shared UI (BrandMark, etc.)
│   ├── lib/api.ts            # Axios client + endpoint wrappers
│   └── public/
├── backend/
│   ├── src/
│   │   ├── routes/           # Express routers
│   │   ├── controllers/      # HTTP handlers
│   │   ├── services/         # Business logic, Gemini calls, file parsers
│   │   ├── models/           # Mongoose schemas
│   │   └── index.ts          # App entry
│   ├── nixpacks.toml         # Railway / Nixpacks pin (Node 20 + build override)
│   └── package.json
└── README.md
```

## Getting started

### Prerequisites

- Node.js **20.19** or later
- A MongoDB connection string (Atlas free tier works)
- A Google Gemini API key

### Local setup

```bash
git clone https://github.com/nuakedev10/orgscreen.git
cd orgscreen
```

**Backend:**

```bash
cd backend
npm install
cp .env.example .env        # then fill in the values listed below
npm run dev                 # starts on port 5000 by default
```

**Frontend** (in a second terminal):

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev                 # http://localhost:3000
```

### Environment variables

**`backend/.env`:**

| Key | Purpose |
|---|---|
| `MONGODB_URI` | Mongo Atlas connection string |
| `GEMINI_API_KEY` | Google Gemini API key |
| `PORT` | Defaults to `5000` |
| `CORS_ORIGIN` | Your frontend URL (e.g. `http://localhost:3000` locally, your Vercel URL in production) |

**`frontend/.env.local`:**

| Key | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the backend API (e.g. `http://localhost:5000` locally, your Railway URL in production) |

## CSV import format

The CSV intake expects a header row. Required columns are `fullName` and `email`; everything else is optional. Skills are semicolon-separated within a single cell.

```csv
fullName,email,phone,location,skills,experience,degree,field,institution
Ada Lovelace,ada@example.com,+250-000-0000,Kigali,JavaScript;React;Node,5,BSc,Computer Science,University of London
Kwame Mensah,kwame@example.com,+233-000-0000,Accra,Python;Django;Postgres,3,BSc,Software Engineering,KNUST
```

Rows missing `fullName` or `email` are silently dropped at the parser level.

## Deployment

### Frontend on Vercel

1. Connect the GitHub repo.
2. Set **Root Directory** to `frontend`.
3. Add `NEXT_PUBLIC_API_URL` in Project Settings → Environment Variables.
4. Push to `main`. Vercel auto-deploys on every commit.

### Backend on Railway

1. Create a new service → connect the repo → set **Root Directory** to `backend`.
2. Add the four backend env vars listed above.
3. Railway uses the included `backend/nixpacks.toml`, which:
   - Pins Node 20 (`mongoose@8` and `mongodb@7` need >=20.19).
   - Overrides the auto-generated build phase so it doesn't run a duplicate `npm ci` against a Docker cache mount (which throws `EBUSY`).
4. Push to `main`. Railway auto-builds.

## API surface (selected)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/organizations` | Create or update an organization profile |
| `GET` | `/organizations/:id` | Fetch one |
| `POST` | `/jobs` | Create a job |
| `GET` | `/jobs` | List jobs |
| `POST` | `/candidates/upload/csv` | Bulk CSV intake (multipart/form-data) |
| `POST` | `/candidates/upload/pdf` | Single résumé intake |
| `POST` | `/candidates/upload/pdfs` | Bulk résumé intake |
| `POST` | `/candidates` | Manual candidate creation |
| `GET` | `/candidates` | List candidates (filterable by `jobId`, `organizationId`) |
| `POST` | `/screen` | Run scoring on a job's candidate pool |
| `GET` | `/results/:jobId` | Fetch ranked results for a job |

## Scripts

**Backend:**

```bash
npm run dev      # ts-node + nodemon
npm run build    # tsc → dist/
npm run start    # node dist/index.js (production)
```

**Frontend:**

```bash
npm run dev      # next dev
npm run build    # next build
npm run start    # next start (production)
npm run lint     # eslint
```

## Roadmap

- Persona-fit explanations on every result row.
- Multi-language candidate intake (French, Kinyarwanda, Swahili).
- Team accounts with role-based access control.
- ATS-friendly export (CSV + simple JSON).
- Recruiter feedback loop to tune ranking weights over time.

## Team

| | |
|---|---|
| **Nuake Tsekpo** | Founder & builder. African Leadership University, Kigali. [GitHub @nuakedev10](https://github.com/nuakedev10) |

Want to build with us on the African AI hiring stack? Open an issue or email **silogrp1@gmail.com**.

## Contributing

This is a hackathon project, not a closed shop. Pull requests welcome — please open an issue first if you're adding a feature so we can align on direction.

1. Fork the repo.
2. Create a branch (`git checkout -b feat/your-feature`).
3. Commit with a clear message.
4. Open a PR against `main`.

## License

MIT — see `LICENSE` file (or treat the absence of one as "shared in good faith for hackathon evaluation").

## Contact

- **Email:** silogrp1@gmail.com
- **GitHub:** [@nuakedev10](https://github.com/nuakedev10)
- **Built at:** African Leadership University, Kigali, Rwanda
- **For:** Umurava AI Hackathon

---

_Built fast because the problem isn't waiting._
