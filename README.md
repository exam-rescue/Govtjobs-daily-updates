# GovtJobs Daily — Website

Modern government jobs alert website. Data is auto-generated from govtjobsalert.in via LLM processing on our VPS.

## Structure
- `index.html` — Main page (SPA)
- `style.css` — Styling
- `app.js` — Frontend logic (filter, search, render)
- `data/jobs.json` — Auto-generated job data (do not edit manually)

## Deployment
Push to `main` branch → Cloudflare Pages auto-deploys to govtjobs-daily-updates.pages.dev

## Data Updates
Run `generate_data.py` on VPS to fetch latest jobs and regenerate `data/jobs.json`.