# Nexonic IPTV v2

**Website: <https://shahrukhalid.github.io/nexonic-iptv-v2/>**

**A self-hosted IPTV player and Xtream Codes server for free, legal TV channels. Runs on your own computer, verifies every stream, and lets you watch on a Smart TV.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB)
![React](https://img.shields.io/badge/React-18-61DAFB)
![FastAPI](https://img.shields.io/badge/FastAPI-async-009688)

Nexonic IPTV v2 is the desktop and Smart TV companion to [Nexonic IPTV](https://github.com/Shahrukhalid/nexonic-iptv), the curated list of official free-to-air channels. Run it on your computer to browse thousands of free channels by country, category or language, see which streams are working right now, and send them to IPTV Smarters, TiviMate or any other Xtream Codes player.

---

## Features

- **Worldwide live TV browser**: search by channel, country, language or category, with country flags and A–Z category navigation.
- **Real stream checks**: HTTP status, latency, HLS manifest and segment checks, DRM detection and optional `ffprobe` codec and resolution probing. Dead links are flagged, not hidden.
- **Channel health center**: working, unstable, offline and region-restricted counts, with CSV and JSON exports.
- **Xtream Codes API and M3U server**: `player_api.php`, `get.php` and `xmltv.php` endpoints, so Smart TV apps can log in to your own computer.
- **TV guide (EPG)**: XMLTV import with now and next listings.
- **TV series channels, favourites and watch history**, all stored locally.
- **Offline library**: play video files you put in `local-data/offline_media/`.
- **Bring your own playlists**: add any M3U URL or upload a file from the Sources page.

## Privacy and safety by design

- **Local only by default.** The server listens on `127.0.0.1`, so only your computer can reach it until you choose to share it on your home network.
- **No telemetry**: no analytics, tracking or account. Your database, history and playlists stay in `local-data/`.
- **Generated credentials**: each install gets a random Smart TV password, which you can change in Settings. Nothing is hard-coded.
- **Not an open proxy**: the stream relay only forwards hosts that belong to channels in your catalogue, blocks private and cloud-metadata addresses, and checks TLS certificates.
- **Family-friendly**: adult-oriented entries are skipped when playlists are imported.

## What this project is not

Nexonic IPTV v2 does not host any streams. It does not unlock paid channels, bypass DRM or get around regional restrictions, and it is not a subscription service. The default sources are [Nexonic IPTV](https://github.com/Shahrukhalid/nexonic-iptv) (official broadcaster streams) and the public [iptv-org](https://github.com/iptv-org/iptv) playlists. Only watch channels you are entitled to in your country.

---

## Quick start

Requirements: **Python 3.10+**, **Node.js 18+**, and optionally **ffmpeg** (for `ffprobe` checks).

```bash
git clone https://github.com/Shahrukhalid/nexonic-iptv-v2.git
cd nexonic-iptv-v2
bash scripts/setup.sh   # creates backend/.venv, installs packages, builds the web app
bash scripts/start.sh   # starts the server
```

Open **http://localhost:8000**. The first start imports the default playlists in the background; use the **Channel Health** page to check streams.

To confirm everything works on your network (channel import, live stream checks, Smart TV login and playback relay), run this while the server is running:

```bash
python3 scripts/smoke_test.py
```

```bash
bash scripts/stop.sh    # stop the server
bash scripts/test.sh    # backend tests, frontend tests and production build
```

For frontend development with hot reload, set `NEXONIC_DEV=1` before `bash scripts/start.sh` and open http://localhost:5173.

## Configuration

Copy `.env.example` to `.env` and edit it. All settings are optional.

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXONIC_HOST` | `127.0.0.1` | Set to `0.0.0.0` to let a TV on your home network connect |
| `NEXONIC_PORT` | `8000` | Server port |
| `NEXONIC_DATA_DIR` | `./local-data` | Database, playlists, EPG cache and logs |
| `NEXONIC_XTREAM_USER` | `nexonic` | Smart TV username |
| `NEXONIC_XTREAM_PASS` | random | Smart TV password (at least 8 characters) |

## Watching on a Smart TV

1. Set `NEXONIC_HOST=0.0.0.0` in `.env` and restart. Keep this on your home network only; don't forward the port on your router.
2. On the computer running the server, open **Connect Smart TV** in the app to see your server URL, username and password.
3. In IPTV Smarters, TiviMate or a similar app, choose **Xtream Codes API** and enter those details.

Step-by-step instructions are in [docs/SMART_TV_SETUP.md](docs/SMART_TV_SETUP.md).

---

## Project structure

```
backend/            FastAPI app (API, Xtream server, verification engine, EPG, relay)
  app/api/          HTTP endpoints
  app/services/     importer, verification, scheduler, Xtream and EPG logic
  tests/            pytest suite
frontend/           React 18 + TypeScript + Vite + Tailwind web app
scripts/            setup, start, stop and test helpers
docs/               architecture and Smart TV guides
local-data/         created at runtime, never committed
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

## Contributing

Issues and pull requests are welcome. To suggest a channel, open it on [Nexonic IPTV](https://github.com/Shahrukhalid/nexonic-iptv) with the broadcaster's official stream page. Please don't submit links to paid, pirated or adult content.

## License

[MIT](LICENSE). Channel names and logos belong to their owners.
