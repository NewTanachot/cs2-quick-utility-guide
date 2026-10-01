# CS2 Quick Smoke Guide

A quick-reference site for **smoke** spots by Competitive map — click a spot to open the guide video from [CS Tactics (@CS2Tactics)](https://www.youtube.com/@CS2Tactics/videos) at the right timestamp.

## Supported maps

Mirage, Inferno, Ancient, Nuke, Dust II, Overpass, Train, Vertigo, Anubis

Timestamps come from video chapters in the channel’s guides (edit `data/smokes.json` to update).

## Run locally

You need a local server (`fetch` loads JSON) — **do not open `index.html` via `file://`**

**Node (recommended — no Python required):**

```bash
cd cs2-quick-utility-guide
npm start
```

Or one-off without relying on `package.json`:

```bash
npx --yes serve . -l 8080
```

**Python (if you already have it):**

```bash
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080)

## GitHub Pages

1. Push the project to GitHub
2. **Settings → Pages → Build and deployment → Source:** choose **GitHub Actions**
3. Push to `main` (or `master`) — workflow `.github/workflows/pages.yml` deploys the site

If the repo is named `cs2-quick-smoke-guide`, the URL will be  
`https://<username>.github.io/cs2-quick-smoke-guide/`

## Structure

- `index.html` — single page (hash routing)
- `data/smokes.json` — maps, smoke spots, `videoId`, start seconds
- `css/styles.css`, `js/app.js`

## Updating smoke data

Edit `data/smokes.json`, or run a script to pull chapters from YouTube (requires `yt-dlp`) and merge into the file format.

When you change JSON, **increment the `version` field** in the file, and bump `STATIC_CACHE` / `DATA_CACHE` in `sw.js` if you want users to get a fresh shell immediately.

## Map caching

- **Service Worker** (`sw.js`) — caches `index.html`, CSS, JS, and `data/smokes.json` (stale-while-revalidate for JSON)
- **localStorage** — keeps a copy of `smokes.json` for offline use or failed fetches

Note: the service worker only runs on HTTPS or `localhost`.
