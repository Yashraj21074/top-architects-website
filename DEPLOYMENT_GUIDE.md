# Deployment Guide (beginner friendly)

## 1. What you need
- **Node.js 20 or newer** (https://nodejs.org) — check with `node -v`.
- This project folder. No database and no other software.

## 2. Install and run locally
```
npm install
npm run dev        # website at http://localhost:5173
```
`npm run dev` serves the website only; the AI endpoint (`/api/reception`) does not run there, so the Reception uses its built-in answers. To test the AI locally, install the Vercel CLI (`npm i -g vercel`) and run `vercel dev` with your `.env.local` (see §5).

## 3. Quality checks and production build
```
npm run check      # lint + 76 automated tests + production build
npm run build      # build only; output goes to dist/
npm run preview    # serve dist/ locally at http://localhost:4173
```

## 4. Deploying the website
The website is static, so any static host works. **For the AI Reception, use a host that also runs the `api/` folder as serverless functions; Vercel works with no extra setup** (`vercel.json` already routes every page to `index.html`, as a single-page app needs).
1. Push the project to GitHub (do not commit `.env*` files — `.gitignore` already excludes them).
2. In Vercel: *Add New → Project →* import the repository. Framework preset: **Vite**. Build command `npm run build`, output `dist`.
3. Add environment variables (next section), then deploy.
Other static hosts (Netlify, GitHub Pages, S3) will serve the website fine but will **not** run `/api/reception`; the Reception then simply uses its built-in engine. On those hosts make sure all unknown URLs rewrite to `/index.html`.

## 5. Environment variables
| Name | Where | Meaning |
|---|---|---|
| `AI_PROVIDER` | server | `anthropic` or `openai` (OpenAI-compatible) |
| `AI_API_KEY` | server | your provider secret key — never put it in code |
| `AI_MODEL` | server | model name from your provider's documentation |
| `AI_BASE_URL` | server, optional | override the provider URL |
| `AI_TIMEOUT_MS` | server, optional | provider timeout, default 12000 |
| `SITE_URL` | **build time**, optional | your real address, e.g. `https://www.yourdomain.com` (no trailing slash). Enables canonical URLs, social-share URL/image and `sitemap.xml`. Without it none of these are emitted — nothing is guessed. |
Copy `.env.example` to `.env.local` for local work. In Vercel use *Settings → Environment Variables*.

## 6. Theme schedule
Day 07:00–18:00 (visitor's local time), Night otherwise. Change only `src/config/theme.json`; the pre-paint script, the runtime watcher and the tests all read it.

## 7. Verify the deployed site
1. Open it at ~12:00 and ~22:00 (or change your computer clock): Day = ivory, Night = navy, no flash on reload.
2. Desktop: header links. Phone/tablet width: **Explore TOP** opens, search "house" finds Residential, Esc closes.
3. Projects → pick a category → open a project → **Return to …** goes back to the same category and scroll position.
4. `https://your-site/robots.txt` and (if `SITE_URL` set) `/sitemap.xml` load.
5. AI (only after §5): open 3D Reception, type "do u guys make houses?". A grounded answer in your tone = working. In the browser's Network tab you should see `POST /api/reception` returning 200. A 503 means the variables are missing/misspelled; the Reception keeps working with its built-in answers.
6. Confirm your key does not appear in *View source* or the Network tab responses (it must not).

## 8. Contact form
It opens the visitor's email app addressed to the studio email; nothing is sent from the page. If you want server-side delivery, a form service or endpoint has to be chosen and added — none is configured.
