# XP Ledger — Sword × Staff

A self-contained normal-level and Season Level XP calculator. Built for **GitHub Pages**: plain HTML, CSS, and native JavaScript modules. No backend, web API, frameworks, build step, or account needed. All XP data is bundled; it makes no runtime data requests.

## Features

- Exact cumulative XP across normal levels **1–250** and all five configured Season Level ladders (Season 1–5).
- Correctly separates **normal XP** from **Season XP**. The numbers are **not interchangeable**.
- Enter XP already earned toward the next level; see exact XP remaining, next-level XP, progress, levels remaining, and an optional daily-XP completion estimate.
- Readable shorthand (`1.5M`, `2B`) for XP inputs; output shows both a compact number and an exact comma-separated value.
- Quick targets, a searchable level reference, copyable numbers, shareable URL parameters, responsive layout, and on-device saved settings.
- No external image requests, tracking, or third-party JavaScript.

## Host on GitHub Pages

1. Create a **public** GitHub repository (e.g. `sword-staff-xp`).
2. Upload **all contents** of this folder to the repository root, including `index.html`, `assets/`, and `.github/`.
3. Open **Settings → Pages**, set **Build and deployment → Deploy from a branch**, then select `main` and `/ (root)`; save.
4. Visit `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/` once Pages reports that the site has deployed.

For local development, run `python3 -m http.server 4173` in this folder and open `http://localhost:4173/`. Native JS modules require HTTP; double-clicking `index.html` may fail because of browser file-access restrictions.

Tests: `npm test` (Node 22+; no `npm install` needed).

## XP mechanics

The referenced guide uses two separate ladders. Normal XP is cumulative from level 0. Once the player holds the promotion’s top subrank and reaches its cap, Season Levels use a separate Season XP pool, with displayed level equal to **promotion cap + Season Level**. For example, Expert cap 100 plus Season Level 30 is displayed level 130. The user enters **Season Level 30**, not displayed level 130, while in Season XP mode. That season-specific progression expires at season end. Normal level 1 and Season Level 0 represent the start of their respective progressions. XP entered in “XP into current level” is XP accrued **after reaching** the current level, toward the next one.

Season 1's guide includes data beyond its configured cap, but its supported limit is **70 Season Levels**, so this calculator stops there. Season 6 (Ethereal) has normal levels 221–250 but no configured Season Level ladder in the source, so the calculator does not invent one.

The tool calculates **XP requirements only**. Its date estimate divides XP remaining by the user-entered daily XP; it does not model XP caps, changing gain rates, season resets, quests, XP conversion, or promotions.

## Source & updates

Source: [Purrwikimania — XP requirements](https://www.purrwikimania.com/xp.html). Data captured **September 29, 2026** and baked into `assets/xp-data.js` for reliable static hosting. The site is unofficial and is not affiliated with the game or the guide.

To refresh the data in the future, install `beautifulsoup4` (`python3 -m pip install beautifulsoup4`) and run:

```sh
python3 scripts/refresh_data.py
npm test
```

The updater parses the source HTML tables, verifies the published checkpoints/season totals, and regenerates the local module. If the source values change, it stops instead of silently replacing the table: verify changes and update the expected totals in `scripts/refresh_data.py` and `tests/calculator.test.js`. The updater is **never** run by site visitors or by the live website.

## Structure

- `index.html` — semantic UI and content.
- `assets/styles.css` — responsive design.
- `assets/app.js` — UI state, rendering, sharing, and browser storage.
- `assets/calculator.js` — testable, DOM-independent XP logic and formatting.
- `assets/xp-data.js` — bundled exact source values.
- `scripts/refresh_data.py` — optional local source refresh.
- `tests/calculator.test.js` — unit and published-checkpoint verification.