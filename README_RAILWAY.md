Railway deployment README

This repository contains a Vite frontend and a TypeScript Express backend that uses a local `db.json` file.

Quick deploy steps (Railway - fullstack)

1. Push this repo to GitHub (or connect Railway to your repository provider).

2. Create a new project on Railway and connect your repository.

3. In Railway's service settings, set the "Start Command" to:

   npm start

   Railway will run `npm install` (installing `tsx` from dependencies) and then `npm start` which runs `tsx server.ts`.

4. Railway will expose a public URL for your backend. Copy that URL (for example https://my-app.up.railway.app).

5. Configure the frontend to use the backend URL for API calls (set an environment variable in Vercel or use the URL directly during testing). If you deploy the frontend separately, set an environment variable `VITE_API_URL` to your Railway backend URL.

Combined deployment (Frontend on Vercel, Backend on Railway)

- Deploy backend to Railway following the steps above. After deploy you will have a public backend URL, for example: `https://my-backend.up.railway.app`.
- Deploy the frontend to Vercel (the project already contains `vercel.json` configured to build the Vite `dist` folder):
   1. Push the repo to GitHub.
   2. On Vercel, create a new project and import the repository.
   3. Set the Build Command to: `npm run build` (Vercel usually detects this automatically).
   4. Set the Output Directory to: `dist`.
   5. In the Vercel project > Settings > Environment Variables, add:
       - Key: `VITE_API_URL`
       - Value: your Railway backend URL (e.g. `https://my-backend.up.railway.app`)
       - Environment: (choose Preview and Production as needed)
   6. Deploy the frontend. The built app will call the backend URL via `import.meta.env.VITE_API_URL` (the code falls back to `http://localhost:3001` when the env var is not set).

Notes for this combo setup

- CORS: the backend already uses `cors()` (wide-open). If you want to lock it down, configure CORS to only allow your Vercel domain.
- Persistence: `db.json` is still used by the backend. For durable production storage, migrate to a managed DB (Railway offers Postgres). I can add a migration script and DB wiring if you want.
- Environment variables: Keep secrets (DB credentials, API keys) in platform env vars — do not commit them to the repo.

If you want, I can automate the Railway + Vercel deployment docs into a single `DEPLOY.md`, add CI settings, or convert the server to a compiled `dist-server` flow for a smaller runtime footprint. Tell me what you'd like me to do next.

Notes and important caveats

- The server currently stores data in `db.json` on the filesystem. Container filesystems are ephemeral: containers may be recreated or scaled, and filesystem changes may be lost. For production data persistence, migrate to a managed database (Postgres/Mongo/Supabase).

- If you prefer a compiled server build, I can add a `tsconfig.server.json` and `build:server` script that compiles `server.ts` to `dist-server/` and a `start:prod` script that runs the compiled JS. Right now, running the server with `tsx` keeps the workflow simple.

- If you want the frontend and backend on the same domain, deploy the frontend to Vercel (or Railway static) and set the frontend `VITE_API_URL` env var to the Railway backend URL.

If you'd like, I can:
- Add an optional `build:server` + `start:prod` flow that compiles the server with `tsc`.
- Create a small migration utility to move data from `db.json` to Postgres on Railway.
- Convert the backend to use Postgres and ENV-based DB config now.

Tell me which of the above you'd like next.