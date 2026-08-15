# Discipline Desk — Daily Habit Tracker

A single-user daily habit tracker styled like a trading blotter. Built for tracking
morning routine, exercise, meditation, yoga, reading, sleep discipline, and weekend
running/live-sessions.

## Run locally

```
npm install
npm start
```

Then open http://localhost:3000

## Data storage

Data is stored in `data/store.json` — a single JSON file with your habit list and
daily logs. No database setup required. No login — it's a single-user tracker.

## Deploying to Railway

1. Push this folder to a GitHub repo.
2. On [railway.com](https://railway.com), create a New Project → Deploy from GitHub repo → select the repo.
3. Railway auto-detects Node.js and runs `npm install` + `npm start`. No extra config needed.
4. **Important — persistent storage:** Railway's filesystem resets on every redeploy.
   To keep your daily data across deploys, add a **Volume** in the Railway dashboard
   (Service → Settings → Volumes) and mount it at `/app/data`. That makes
   `data/store.json` persist.
5. Once deployed, Railway gives you a public URL — open it and start logging.

## Customizing habits

Use the "+ Add" row on the page to add/remove habits any time — no code changes
needed. Default habits match: wake by 6am, calisthenics, meditation, yoga, reading,
sleep by 11pm (daily), plus weekend live session and weekend run.
