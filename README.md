# Sword × Staff XP calculator

Calculate XP for normal levels 1–250 or Season Levels 1–5. These use separate XP pools.

Enter your current level, target, XP earned in your current level, and optional **XP per hour**. The calculator shows XP needed, XP for the next level, and time to your goal. It also saves your inputs and lets you share a link.

For Season XP, enter the **season level** (for example, 30), not the displayed player level (for example, 130).

## GitHub Pages

In **Settings → Pages**, choose **Deploy from a branch**, then **main** and **/ (root)**. The site runs without a backend or build step.

To test locally: `npm test` (Node 22+). To preview: `python3 -m http.server 4173`.

## XP data

Source: [Purrwikimania](https://www.purrwikimania.com/xp.html). Snapshot: September 29, 2026. Season 6 has no published Season XP ladder in this dataset. Time estimates assume a steady XP/hour rate.

To refresh the bundled XP tables:

```sh
python3 -m pip install beautifulsoup4
python3 scripts/refresh_data.py
npm test
```

If the source changes, verify the new values before updating the expected totals in the refresh script and tests.

Unofficial fan project.
