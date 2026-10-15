# Alfa — Jiaqi Tu

Personal website of **Jiaqi Tu**, Data Engineer in Toronto — amplified by a personal multi-provider AI agent network.

**Live:** https://tujiaqi2002.github.io/Alfa/

A minimal, editorial layout with a data / AI / gamer layer:

- Interactive isometric “data landscape” hero (canvas) with a HUD
- **Console:** a 3D retro PC on a desk (Three.js) whose CRT runs a live, interactive terminal — click the screen or press <kbd>~</kbd>
- Player card with photo, live XP, stats and a skills loadout
- AI agent network diagram (orchestrator → research / code / review / data / docs agents → multiple providers)
- Quest-log career timeline
- Medallion pipeline diagram (Bronze → Silver → Gold) with a simulated run log
- Draggable project carousel with procedurally drawn artwork
- Photo mode gallery and a Konami-code arcade mode
- Light/dark theme, reduced-motion support, responsive layout

## Stack

Plain HTML, CSS and vanilla JavaScript — no build step. Three.js (r169, MIT) is vendored in `assets/vendor/` and lazy-loaded only when the console scrolls into view; without WebGL the terminal falls back to a flat CRT.

```
index.html
404.html
assets/
  css/style.css
  js/landscape.js   hero canvas
  js/art.js         project card artwork + AI network diagram
  js/main.js        interactions, theme, arcade mode
  js/pc.js          console section bootstrap (module)
  js/pc-scene.js    Three.js desk / retro PC scene
  js/terminal.js    canvas terminal + commands
  vendor/           three.module.min.js + license
  img/              photos (resized, metadata stripped)
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

Content lives directly in `index.html` (profile, AI, quests, pipeline, projects, photos, contact). Terminal commands and links are in `assets/js/terminal.js`.
