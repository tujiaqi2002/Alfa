# Alfa — Jiaqi Tu

Personal website of **Jiaqi Tu**, Data Engineer in Toronto.

**Live:** https://tujiaqi2002.github.io/Alfa/

A minimal, editorial layout with a data/gamer layer:

- Interactive isometric “data landscape” hero (canvas) with a HUD
- Player card with live XP, stats and a skills loadout
- Quest-log career timeline
- Medallion pipeline diagram (Bronze → Silver → Gold) with a simulated run log
- Draggable project carousel with procedurally drawn artwork
- Unlockable achievements, a hidden terminal (press <kbd>~</kbd>), and a Konami-code arcade mode
- Light/dark theme, reduced-motion support, responsive layout

## Stack

Plain HTML, CSS and vanilla JavaScript — no build step, no dependencies.

```
index.html
404.html
assets/
  css/style.css
  js/landscape.js   hero canvas
  js/art.js         project card artwork
  js/main.js        interactions, terminal, achievements
  Jiaqi_Tu_Resume.pdf
  favicon.svg
```

## Run locally

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Deploy

Published with GitHub Pages from the `main` branch (root). Push to `main` and Pages redeploys automatically.

## Edit content

Content lives directly in `index.html` (profile, quests, projects, archive, contact). Terminal commands and links are in `assets/js/main.js`.
