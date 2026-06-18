# CPF Forecast Calculator

Singapore CPF retirement forecast calculator built on 2026 official CPF Board rates.
Projects your CPF accounts month-by-month from your current age through the full
CPF LIFE payout phase.

## Features
- Full lifecycle simulation: accumulation → age-55 transformation → post-55 → CPF LIFE payouts
- All 5 contribution schemes (SC, PR 1st/2nd/3rd yr)
- BRS / FRS / ERS retirement sum targets with property pledge
- Standard, Escalating, Basic CPF LIFE plan comparison
- Deferral analysis (ages 65–70)
- Inflation-adjusted view
- Year-by-year detailed table

## Tech stack
- React 18 + TypeScript + Vite
- Chart.js for visualizations
- Pure client-side — no backend, no data leaves your browser

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Deploy to Vercel (recommended — free)

### Option A: GitHub + Vercel (automatic deployments)
1. Push this folder to a new GitHub repository
2. Go to https://vercel.com → New Project → Import your repo
3. Framework preset: **Vite** (auto-detected)
4. Build command: `npm run build`
5. Output directory: `dist`
6. Click Deploy → live in ~60 seconds

### Option B: Vercel CLI (one command)
```bash
npm install -g vercel
vercel --prod
```

### Option C: Netlify drag-and-drop
```bash
npm run build
```
Then drag the `dist/` folder to https://app.netlify.com/drop

## Disclaimer
Estimates only. Based on CPF rules effective 1 January 2026.
CPF LIFE payouts are indicative, calibrated against CPF Board's published estimator examples.
Not financial advice. Always verify with the official CPF Board tools at https://www.cpf.gov.sg
