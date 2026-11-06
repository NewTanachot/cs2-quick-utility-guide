# CS2 Quick Smoke Guide

A quick-reference site for **smoke** spots by Competitive map — click a spot to open the guide video at the right timestamp. Use the **วิดีโอโดย** switch in the header to choose whose videos to watch:

- [CS Tactics (@CS2Tactics)](https://www.youtube.com/@CS2Tactics/videos) — English, smokes
- [NXZ (@nxznxznxz)](https://www.youtube.com/playlist?list=PLX-fCrB2FJLqmFLQ0dvM_yl8wHRgsQPNG) — Thai (สอนปาควัน), smokes, molotovs and flashes

## Supported maps

| Creator | Maps |
| --- | --- |
| CS Tactics | Mirage, Inferno, Ancient, Nuke, Dust II, Overpass, Train, Vertigo, Anubis |
| NXZ | Cache, Mirage, Inferno, Ancient, Nuke, Dust II, Overpass, Train, Anubis (no Vertigo video yet) |

A map a creator has no video for shows an empty card, and its page links to the other creator.

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
- `js/creators.js` — the creators in the header switch and which data file each one uses
- `data/smokes.json` — CS Tactics: maps, smoke spots, `videoId`, start seconds
- `data/nxz.json` — NXZ, same format
- `css/styles.css`, `js/app.js`

Map links carry the creator as `?by=<id>`, e.g. `#/map/mirage?by=nxz`. Links without it open CS Tactics, so links shared before the switch existed still work. The last choice is remembered in `localStorage`.

## Updating smoke data

Edit the creator's file in `data/`, or run a script to pull chapters from YouTube (requires `yt-dlp`) and merge into the file format.

Where the NXZ timestamps come from:

- **Cache** — the chapters in the video description (exact).
- **Every other map** — those videos have no chapters, so each lineup's start was read from the name NXZ shows in the top-right of the video (e.g. `A-LONG CORNER SMOKE`), using YouTube's seek-preview frames (one every 2–10 s depending on the video). Each start is set one frame before the name first appears, so a lineup can start up to ~10 s early but never cuts off its beginning.

When you change JSON, **increment the `version` field** in the file, and bump `STATIC_CACHE` / `DATA_CACHE` in `sw.js` if you want users to get a fresh shell immediately.

### Adding a creator

1. Add a data file in `data/` in the same format as `data/smokes.json`
2. Add an entry to `CREATORS` in `js/creators.js` (`id`, `name`, `url`, `dataUrl`, `units`)
3. Add the new file to `PRECACHE_URLS` in `sw.js` and bump the cache versions

## Map caching

- **Service Worker** (`sw.js`) — caches `index.html`, CSS, JS, and every `data/*.json` (stale-while-revalidate for JSON)
- **localStorage** — keeps a copy of each creator's data file for offline use or failed fetches

Note: the service worker only runs on HTTPS or `localhost`.
