# Chore Chart

A small, fun weekly chore chart for kids. Runs as an installable web app (PWA), stores everything locally on the device, and needs no account or server.

Live: https://mikelewis-au.github.io/chore-chart/

## Features

- Multiple kids, one tap to switch between them
- Daily chores (every day, Monday to Sunday) and weekly chores per kid
- Weekly prize with a percentage goal; the week starts on Monday
- Tap a day to catch up on earlier days this week
- Random celebrations when a chore is ticked, and a big one when the prize unlocks
- Optional matching sound effects (on by default, toggle in Settings)
- Mobile first, scales up to a two-column layout on iPad
- Works offline once installed

## Install on a phone

Open the live URL in Safari (iOS) or Chrome (Android), then use **Share → Add to Home Screen** (iOS) or **Install app** (Android).

## Develop

```sh
npm install
npm start          # http://localhost:4200
npm run build:pages
```

Pushes to `main` deploy to GitHub Pages via `.github/workflows/deploy.yml`.

## Data

Everything lives in `localStorage` under the key `chore-chart.v1`. Clearing site data resets the app.
