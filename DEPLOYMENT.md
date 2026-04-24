# OrgScreen — Deployment Guide

Deploy the **backend to Railway** (Node + MongoDB Atlas) and the **frontend to Vercel** (Next.js). End-to-end time: ~20 minutes.

> Deploy the **backend first** so you have a live API URL to plug into the frontend's environment variable.

---

## 0. Prerequisites (5 min, do once)

1. Push the repo to GitHub (public or private is fine).
2. **Rotate the exposed secrets.** Your local `backend/.env` has a real MongoDB password and Gemini API key. Any collaborator with access to that file has full access to your database.
   - MongoDB Atlas → Database Access → reset the `orgscreen-admin` password.
   - https://aistudio.google.com/apikey → delete the old Gemini key, create a new one.
   - Update your local `backend/.env` with the new values and do **not** commit them (your `.gitignore` already excludes `.env`, so this stays local).
3. Sign up (free tier is enough for a hackathon):
   - [railway.app](https://railway.app) — log in with GitHub.
   - [vercel.com](https://vercel.com) — log in with GitHub.

---

## 1. Prepare MongoDB Atlas for production access (2 min)

Railway's outbound IPs are dynamic, so your Atlas cluster must accept connections from anywhere.

1. Atlas → **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`) → Confirm.
2. Copy your connection string from **Database → Connect → Drivers**. It looks like:
   ```
   mongodb+srv://orgscreen-admin:<new-password>@cluster0.qcafd9o.mongodb.net/orgscreen?retryWrites=true&w=majority
   ```
   Save this — you'll paste it into Railway in step 2.

---

## 2. Deploy the backend to Railway (7 min)

1. Railway dashboard → **New Project** → **Deploy from GitHub repo** → select your `orgscreen` repo.
2. Railway will try to build from the repo root. Click the new service → **Settings**:
   - **Root Directory**: `backend`
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm run start`
   - **Healthcheck Path**: `/api/health`
   (The `backend/railway.json` I added already sets these, but confirm in the UI.)
3. Go to **Variables** and add each of these (paste values; do not quote them):

   | Key                | Value                                                              |
   | ------------------ | ------------------------------------------------------------------ |
   | `MONGODB_URI`      | your Atlas connection string from step 1                           |
   | `GEMINI_API_KEY`   | your new Gemini key                                                |
   | `NODE_ENV`         | `production`                                                       |
   | `ALLOWED_ORIGINS`  | leave blank for now — we'll fill it in step 4                      |
   | `EMAIL_USER`       | your Gmail address (only if you want the email feature)            |
   | `EMAIL_PASS`       | a Gmail **app password** (not your login) — myaccount.google.com/apppasswords |
   | `EMAIL_FROM_NAME`  | `OrgScreen Hiring`                                                 |

   Do **not** set `PORT` — Railway injects this automatically and the code already reads it.

4. Settings → **Networking** → **Generate Domain**. Railway gives you something like `https://orgscreen-backend-production.up.railway.app`. Copy it.
5. Deployments tab → watch the build. Once it turns green, test in your browser:
   ```
   https://<your-railway-domain>/api/health
   ```
   You should see `{"status":"OrgScreen backend is running", ...}`. If you see an error, open the **Deployments → View Logs** panel — most likely the Mongo URI is wrong or Atlas IP allow-list hasn't propagated yet.

---

## 3. Deploy the frontend to Vercel (4 min)

1. vercel.com → **Add New** → **Project** → import the same `orgscreen` GitHub repo.
2. Configure the project:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `frontend` (click **Edit** next to Root Directory and pick it)
   - **Build Command**, **Output Directory**, **Install Command**: leave default
3. Expand **Environment Variables** and add:

   | Key                    | Value                                                |
   | ---------------------- | ---------------------------------------------------- |
   | `NEXT_PUBLIC_API_URL`  | `https://<your-railway-domain>/api`  ← include `/api` |

   Apply to all three environments (Production / Preview / Development).
4. Click **Deploy**. First build takes 2–3 min.
5. When it's green, Vercel shows you a URL like `https://orgscreen.vercel.app`. Click it — the dashboard should load. If it loads but API calls fail, move to step 4.

---

## 4. Connect the two: set backend CORS to allow the Vercel domain (1 min)

The backend I shipped already auto-allows every `*.vercel.app` preview URL, so Vercel previews work out of the box. For your production domain (and any custom domain later), do this:

1. Railway → your backend service → **Variables** → edit `ALLOWED_ORIGINS`:
   ```
   https://orgscreen.vercel.app
   ```
   Add multiple origins comma-separated, no spaces, e.g.:
   ```
   https://orgscreen.vercel.app,https://www.orgscreen.com
   ```
2. Railway auto-redeploys on variable change. Wait ~30 seconds.
3. Open your Vercel URL → **Hard refresh** (Ctrl+Shift+R). Create an organization. If the dashboard saves without errors, you're live.

---

## 5. Smoke test the full flow (2 min)

On the deployed app:

1. Complete the org setup wizard — confirms POST `/organizations` works.
2. Create a job — confirms POST `/jobs` and the Gemini job-description generator.
3. Upload 2–3 resume PDFs — confirms the bulk PDF pipeline I fixed (POST `/candidates/upload/pdfs`).
4. Trigger AI screening — confirms Gemini + DB write.
5. (Optional) Send decision emails — only works if `EMAIL_USER`/`EMAIL_PASS` are set.

---

## Troubleshooting

**"CORS: origin https://... not allowed"** — add that exact origin to `ALLOWED_ORIGINS` on Railway and wait for the redeploy.

**"MONGODB_URI is not set. Aborting startup."** — the variable isn't set on Railway, or you pasted it with surrounding quotes. Remove quotes and redeploy.

**`fetch failed` on the frontend** — almost always `NEXT_PUBLIC_API_URL` is missing, has a typo, or doesn't end with `/api`. Fix it in Vercel → Settings → Environment Variables, then **redeploy** (changes to env vars don't take effect until the next build).

**Railway build fails with "Cannot find module '@google/generative-ai'"** — Root Directory isn't set to `backend`. Settings → Root Directory → `backend`.

**Vercel build fails with "Module not found: @/lib/api"** — Root Directory isn't set to `frontend`. Settings → General → Root Directory → `frontend`.

**Screening times out** — Railway's default timeout is 5 min, which is fine for ~25 candidates. If you screen more at once, reduce `shortlistSize` or batch the upload.

**Uploaded PDFs are parsed but then disappear** — expected. Railway's filesystem is ephemeral; resumes are parsed in memory and the file is deleted after parsing. The extracted candidate data is saved to MongoDB, which is persistent.

---

## What changed in the code to enable this deploy

For reference, the fixes applied before this guide:

- **`backend/src/routes/candidateRoutes.ts`** + **`backend/src/controllers/candidateController.ts`**: added the missing `POST /candidates/upload/pdfs` bulk endpoint. The frontend was calling this URL (plural), but only `/upload/pdf` (singular) existed — the entire resume-upload UX was broken.
- **`backend/src/index.ts`**: CORS now reads `ALLOWED_ORIGINS` from env, auto-allows `*.vercel.app` previews, and includes a JSON 404 + global error handler so failures no longer return HTML.
- **`backend/src/config/db.ts`**: fail fast if `MONGODB_URI` is missing instead of crashing with a cryptic Mongoose error.
- **`backend/src/models/Candidate.ts`**: removed `null` from the `decisionStatus` enum (Mongoose rejects that shape on newer versions; the field is still nullable via `default: null`).
- **`backend/railway.json`**: Railway build/start/healthcheck config.
- **`backend/.env.example`** + **`frontend/.env.example`**: documents the required env vars so anyone cloning the repo (or your future self on a new machine) knows what to fill in.
