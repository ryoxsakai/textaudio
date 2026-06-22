# DKE Medical English (textaudio)

A static PWA "medical English listening player" (`index.html`, `setting/index.html`) backed by a
Cloudflare Worker (`worker.js`) that proxies audio files stored in an R2 bucket (binding `BUCKET`,
configured in `wrangler.jsonc`). There is no build step or framework — the frontend is plain
HTML/CSS/JS, and the Worker is a single ES module.

## Cursor Cloud specific instructions

### Services

- **Static frontend** — plain static files served from the repo root. Run `npm run serve`
  (`python3 -m http.server 8000`) and open `http://127.0.0.1:8000/` (settings page at
  `http://127.0.0.1:8000/setting/`). There is no compile/build/lint step for the frontend.
- **Cloudflare Worker (audio/R2 backend)** — run `npm run dev:worker` (`wrangler dev`). It serves on
  `http://127.0.0.1:8787` with a **local** R2 bucket (miniflare); no Cloudflare account/login is
  needed for local dev. Local R2 state persists under `.wrangler/` (gitignored).

### Connecting the frontend to a local Worker

The frontend defaults to the production Worker URL (`DEFAULTS.r2BaseUrl` in `index.html`). To use the
local Worker, open the settings page and set **R2 Base URL** to `http://127.0.0.1:8787` and save
(this only writes to `localStorage`; it does NOT upload `settings.json` unless an R2 Worker URL or
full R2 credentials are also filled in). The main page then reads `settings.json` and audio from
that URL. Config (`settings.json`) and audio live in R2 — seed them by `PUT`ing to the Worker, e.g.:

```
curl -X PUT --data-binary @file.mp3 -H "Content-Type: audio/mpeg" \
  http://127.0.0.1:8787/<year>/<term>/<level>/lesson<N>.mp3
```

Audio object key format is `<year.tag>/<term.tag>/<level.tag>/lesson<N>.mp3`. Lesson titles in
`settings.json` are keyed by `<yearId>_<termId>_<levelId>_<N>` (e.g. `y1_t1_l1_1`).

### Gotchas

- A service worker (`sw.js`) caches the app shell. If frontend edits don't appear, hard-reload or
  clear the service worker / site data in DevTools.
- Lesson "play" buttons stay disabled until a `HEAD` request to the audio URL succeeds, so the
  matching object must exist in R2 before a lesson becomes playable.
