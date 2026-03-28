# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A static tea recommendation web app ("Tea Time") with no build step or dependencies. Deployed to GitHub Pages on push to `main`.

## Development

Serve locally with any static file server, e.g.:

```
python3 -m http.server 8000
```

There is no build, lint, or test tooling.

## Architecture

- **`index.html`** — Single page with two views: "Recommend" and "Browse", toggled via nav buttons
- **`app.js`** — All logic in one ES module. Fetches `teas.csv` at startup, parses it with a hand-written CSV parser, and renders everything via DOM manipulation (no framework)
- **`style.css`** — All styles; CSS custom properties for theming (colors in `:root`)
- **`teas.csv`** — Tea catalog data. Columns: Name, Brand, Type, Origin, Theme, Daytime, Temp, Brew, Quantity, Repurchase?, Collection, Since, Description, Additives, Aroma Notes

### Key concepts in app.js

- **Recommend view**: Filters teas by time of day (Morning/Day/Evening based on clock), stock status, and optional Christmas/Specials toggles. Uses weighted random selection (favoring Testing collection and full stock). Tracks shown teas to avoid repeats.
- **Browse view**: Filterable grid with expand-on-click cards. Filter state is persisted in the URL hash.
- Christmas teas auto-enable in December.
