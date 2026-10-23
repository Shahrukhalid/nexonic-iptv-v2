# Nexonic IPTV v2: architecture

Nexonic IPTV v2 is a self-hosted web app. One Python process serves the API, the Xtream Codes endpoints and the built React app on a single port.

```
 Smart TV app (Xtream / M3U)        Browser (React app)
            │                              │
            └──────────────┬───────────────┘
                           ▼
              FastAPI server (default 127.0.0.1:8000)
     ┌──────────────┬───────────┴──────────┬────────────────┐
     ▼              ▼                      ▼                ▼
 SQLite (WAL)   Verification engine   Stream relay      EPG / XMLTV
 local-data/    HTTP, HLS, ffprobe    allowlisted hosts  parser
```

## Backend (`backend/app`)

- **API** (`api/`): channels, sources, verification, playlists, EPG, settings, offline media and the stream relay.
- **Xtream Codes server** (`api/xtream.py`, `services/xtream_service.py`): `player_api.php`, `get.php`, `xmltv.php` and `/live/...` redirects. Credentials are compared in constant time, and requests are refused when no password is set.
- **Importer** (`services/playlist_importer.py`): parses M3U playlists, normalises countries and categories, detects TV series channels, merges duplicates into fallback URLs and skips adult-oriented entries. Local `file://` sources are limited to `local-data/playlists/`.
- **Verification engine** (`services/verification_engine.py`):
  1. HTTP status and latency
  2. HLS manifest and first-segment checks, DRM (`#EXT-X-KEY`) detection
  3. Optional `ffprobe` codec and resolution probe
- **Scheduler** (`services/scheduler_service.py`): an optional background audit and periodic source refresh.
- **Stream relay** (`api/proxy.py`): lets the browser play streams that lack CORS headers. It only forwards hosts that appear in your catalogue (plus hosts referenced by manifests it has rewritten), re-checks every redirect, blocks private, loopback, link-local and metadata addresses, verifies TLS and caps manifest size.
- **Settings** (`api/settings.py`): TV credentials are only returned to, and only changeable from, the computer running the server.

## Frontend (`frontend/src`)

React 18, TypeScript, Vite, Tailwind CSS and hls.js. The main pages are Home, Live TV, Dish & Satellite, Offline & VOD, Countries, Categories, TV Series, TV Guide, Favourites, Recently Watched, Channel Health, Sources & Playlists, Connect Smart TV and Settings.

## Data

Everything is stored under `NEXONIC_DATA_DIR` (default `local-data/`), which is excluded from git:

| Path | Contents |
| --- | --- |
| `database/nexonic_iptv.db` | channels, sources, settings, favourites, history |
| `playlists/` | uploaded playlists |
| `epg/` | XMLTV cache |
| `offline_media/` | your own video files |
| `logs/` | server logs |

## Security model

- Binds to `127.0.0.1` unless you set `NEXONIC_HOST`.
- CORS is limited to the app's own origin and the Vite dev server, so other websites you visit cannot read the API.
- No hard-coded credentials: the TV password is random per install or comes from `.env`.
- No telemetry.
