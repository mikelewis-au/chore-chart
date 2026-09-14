# Chore Chart

A small, fun weekly chore chart for kids. Runs as an installable web app (PWA), stores everything locally on the device, and needs no account or server.

Live: https://mikelewis-au.github.io/chore-chart/

## Features

- Multiple kids, one tap to switch between them, with pixel-art characters or emoji as avatars
- Daily chores and weekly chores per kid, each with a searchable emoji picker
- Daily chores can be set to Mon–Fri only (homework, school bag), so weekends don't show them or count them towards the prize
- Weekly prize with a percentage goal; the week starts on Monday
- Tap a day to catch up on earlier days this week
- Random celebrations when a chore is ticked, and a big one when the prize unlocks
- Optional matching sound effects (on by default, toggle in Settings)
- Celebration cooldown, so unticking and re-ticking a chore doesn't replay the animation (10 minutes by default)
- Optional grown-up lock: a times-table question guards Settings
- Optional toilet chart per kid (off by default): a sticker for every go and a reward when the card is full, with at most one sticker every 10 minutes, a quick undo, and new cards started by a grown-up from Settings
- Kids pick their own sticker from superhero, battle top, speedy hedgehog, pocket monster and mushroom kingdom packs, or tap Surprise me
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
