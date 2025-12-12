# Judging App - Full Stack (Backend + Frontend)

This repo contains a full-stack judging app backend (Node/Express) ready for deployment. The frontend (React) should be placed inside `public/` (build output). The backend supports SQLite for local/dev and Postgres for production.

## Files to create
- `server.js` (backend)
- `knexfile.js` (db config)
- `init_db.js` (create tables + seed)
- `package.json`
- `Dockerfile`
- `Procfile` (optional)

## Local development (quick)
1. Install dependencies:
```bash
npm install
```
2. Initialize DB (dev uses sqlite at ./judging.db):
```bash
npm run init-db
```
3. Copy frontend build into `public/` (or develop React separately and use preview mode)
4. Start server:
```bash
npm start
```
Open http://localhost:3000

## Deploy to Render (recommended — one repo)
1. Push this repo to GitHub.
2. Create a new **Web Service** on Render.
3. Connect your GitHub repo and choose the branch.
4. Build command: `npm ci && npm run init-db`
5. Start command: `npm start`.
6. **Important (Postgres)**: In Render set `NODE_ENV=production` and add the `DATABASE_URL` environment variable (Render provides `DATABASE_URL` when you add a managed Postgres database). Update `knexfile.js` to use `process.env.DATABASE_URL` (already configured).

## Frontend
Replace the `public/` folder contents with the React build (`npm run build` from the React project) so the backend serves the static files. Alternatively, host the React site separately (Vercel) and point API calls to this backend's URL.

## Security & improvements
- Add authentication (JWT or OAuth / Google Sign-In) for judges.
- Use HTTPS (Render gives HTTPS automatically).
- Add rate-limiting & input validation.
- Add migrations (knex migrations) for production schema versioning.
- Add backups for Postgres.
