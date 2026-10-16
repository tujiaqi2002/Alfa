# Alfa — Jiaqi Tu

Personal website of **Jiaqi Tu**, Data Engineer in Toronto — amplified by a personal multi-provider AI agent network.

**Live:** https://tujiaqi2002.github.io/Alfa/

A minimal, editorial layout with a data / AI / gamer layer:

- **Console (front page):** a 3D retro PC on a desk (Three.js) whose CRT runs a live, interactive terminal with a small read-only filesystem (`ls`, `cd`, `cat`, `tree`, `grep`, `man` …) — click the screen or press <kbd>~</kbd>. The intro is a sticky note lying on the desk in the lamp light; click it to zoom in and read
- Player card with photo, live XP, stats and a skills loadout
- Quest-log career timeline
- Medallion pipeline diagram (Bronze → Silver → Gold) with a simulated run log
- Photo mode gallery and a Konami-code arcade mode
- Light/dark theme, reduced-motion support, responsive layout

## Stack

Plain HTML, CSS and vanilla JavaScript — no build step. Three.js (r169, MIT) is vendored in `assets/vendor/` and loaded by the console module; without WebGL the terminal falls back to a flat CRT.

```
index.html
404.html
assets/
  css/style.css
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

Content lives directly in `index.html` (profile, quests, pipeline, photos, contact; the desk note's intro text is the hidden `[data-pc-note]` block in the console section). Terminal commands, projects and links are in `assets/js/terminal.js`.
