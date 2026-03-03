DEPLOY.md

This document explains exactly how to deploy the project using a combo setup: backend on Railway (persistent Node process) and frontend on Vercel (fast static CDN). It contains exact commands, environment variable names, and suggested screenshots to capture while you follow the steps.

Prerequisites
- GitHub account (or Git provider). The repository must be pushed to a remote (public or private) on GitHub.
- Railway account (https://railway.app)
- Vercel account (https://vercel.com)
- Local: Node.js 18+ and npm installed

Quick repository push (if not already pushed)
1. From the project root locally:

```powershell
cd 'C:\Users\Araby\Desktop\tms11-main'
# initialize git (if not already)
git init
git add -A
git commit -m "Initial commit: prepare for deploy"
# create GitHub repo then push; replace <your-github-repo-url>
git remote add origin <your-github-repo-url>
git branch -M main
git push -u origin main
```

Railway — Backend (Express TypeScript server)

Overview: We'll deploy the backend service to Railway. The repo already contains a `start` script ("start": "tsx server.ts") and includes `tsx` in `dependencies` so Railway can run the TypeScript server directly.

1. Create a Railway project
- Go to https://railway.app and sign in.
- Click "New Project" -> "Deploy from GitHub" (or "Deploy from Repo").
- Select the GitHub repository where you pushed this project.

Screenshot suggestion: capture the Railway "New Project -> Deploy from GitHub" screen.

2. Railway service settings
- Railway will detect a Node service. If Railway asks for a start command, ensure it is exactly:

```
npm start
```

- If Railway prompts for a build command you can leave it blank; the backend has no build step by default.

3. Environment variables
- (Optional) Add env vars in Railway > Settings if you plan to use them.
- Important: by default the server listens on port 3001 in source (`server.ts`). In hosted environments Railway sets a `PORT` environment variable you should bind to. Recommend patching `server.ts` to use `process.env.PORT || 3001` before deploying (see snippet below). If you can't change the code, set an environment variable `PORT` value to 3001 in Railway settings (not recommended — better to update code).

Recommended `server.ts` change (small patch to bind to Railway port):

```ts
// change this line at the bottom of server.ts
-const PORT = 3001;
+const PORT = Number(process.env.PORT) || 3001;
```

Commit and push this change before deploy.

Screenshot suggestion: capture Railway service settings where start command is set.

4. Deploy and get the backend URL
- Trigger a deploy in Railway (via UI or push a commit).
- After the build succeeds Railway will show the service URL, e.g. `https://my-backend.up.railway.app`.
- Copy this URL; you'll use it in the next section when deploying the frontend.

Railway: optional Postgres (recommended for production)
- If you want durable storage instead of `db.json` (filesystem), add a Postgres plugin in Railway:
  - Railway > Add Plugin > PostgreSQL
  - Railway will provide a `DATABASE_URL` environment variable automatically.
- Migrating `db.json` to Postgres: I can add a migration script. If you want that now, pick the "Migrate DB to Postgres" follow-up in the repo.

Vercel — Frontend (Vite React static site)

Overview: We'll deploy the static frontend to Vercel. `vercel.json` is already added and configured to build the `dist` folder and route SPA paths to `index.html`.

1. Create a Vercel project and import the repo
- Go to https://vercel.com and sign in.
- Click "New Project" -> Import Git Repository -> select your repository.

Screenshot suggestion: capture the Vercel "Import Project" screen where you select the repo.

2. Project settings (build & output)
- In the Vercel project settings, set (if Vercel doesn't auto-detect):
  - Build Command: `npm run build`
  - Output Directory: `dist`
- Vercel will use your `vercel.json` but will also accept the above settings.

3. Environment variables — wire the backend URL
- In the Vercel dashboard for your project, go to Settings -> Environment Variables.
- Add the following env var:
  - Key: `VITE_API_URL`
  - Value: the Railway backend URL you copied earlier (for example `https://my-backend.up.railway.app`)
  - Environment: set for `Preview` and `Production` as needed

Why `VITE_API_URL`? The frontend code (in `src/lib/api.ts`) reads `import.meta.env.VITE_API_URL || "http://localhost:3001"`.

Screenshot suggestion: capture the Vercel env var screen after adding `VITE_API_URL`.

4. Deploy the frontend
- Trigger a deploy (Vercel will run `npm run build` and publish the `dist` contents). After the deployment completes you will have a Vercel URL like `https://my-frontend.vercel.app`.
- Visit the frontend URL and verify it can talk to the backend by signing in or hitting features that request `/api/*` paths.

Troubleshooting & checks

1. CORS errors in the browser console
- The backend uses `cors()` with default wide-open settings, so CORS should not block requests.
- If you lock down CORS later, allow your Vercel domain (e.g. `https://my-frontend.vercel.app`).

2. Backend not responding after deploy
- Check Railway logs for errors during startup (missing deps, crash on start, unhandled exception).
- Ensure the server binds to the assigned port. If you haven't patched `server.ts`, Railway's `PORT` env var might be ignored — update server to use `process.env.PORT || 3001`.

3. Frontend uses wrong API URL
- Locally the frontend falls back to `http://localhost:3001`. If the deployed frontend is still trying to call localhost, ensure `VITE_API_URL` is set in Vercel's Environment Variables and that the deployment used those vars (re-deploy if you added them after the last deploy).

4. Persistent data (db.json)
- Running on Railway container with file-based `db.json` will work for testing but is fragile for production (containers can be re-created). Add a managed Postgres on Railway and migrate.

Useful commands (PowerShell)

- Build frontend locally:
```powershell
npm run build
# dist/ will be created
```

- Start the server locally (dev/test):
```powershell
npm start
# runs `tsx server.ts` per package.json
```

- Test an API endpoint locally (PowerShell):
```powershell
curl http://localhost:3001/api/users
```

Checklist before going live
- [ ] Repo pushed to GitHub
- [ ] `server.ts` listens on `process.env.PORT || 3001` (recommended)
- [ ] Railway project created and backend deployed
- [ ] (Optional) Add Postgres plugin and migrate data from `db.json`
- [ ] Vercel project created, `VITE_API_URL` env var added and deployment successful
- [ ] Smoke test user login / create wish / list users to verify end‑to‑end

If you want I can:
- Create a small `migrate-to-postgres.ts` migration utility and wire the server to use `DATABASE_URL` (Railway Postgres).
- Add `server.ts` patch (to use `process.env.PORT`) and commit it for you.
- Create `DEPLOY_SCREENSHOTS.md` that contains sample screenshots (annotated) you can take and attach while you follow the steps.



