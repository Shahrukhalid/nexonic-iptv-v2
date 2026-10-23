"""Runtime configuration. Everything machine- or user-specific comes from environment variables (see .env.example)."""

import os
import socket
from pathlib import Path

# Base paths
BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
LOCAL_DATA_DIR = Path(os.environ.get("NEXONIC_DATA_DIR", PROJECT_ROOT / "local-data"))
DATABASE_DIR = LOCAL_DATA_DIR / "database"
DATABASE_PATH = DATABASE_DIR / "nexonic_iptv.db"
PLAYLISTS_DIR = LOCAL_DATA_DIR / "playlists"
EPG_DIR = LOCAL_DATA_DIR / "epg"
CACHE_DIR = LOCAL_DATA_DIR / "cache"
LOGOS_DIR = LOCAL_DATA_DIR / "logos"
BACKUPS_DIR = LOCAL_DATA_DIR / "backups"
REPORTS_DIR = LOCAL_DATA_DIR / "reports"

for p in [DATABASE_DIR, PLAYLISTS_DIR, EPG_DIR, CACHE_DIR, LOGOS_DIR, BACKUPS_DIR, REPORTS_DIR]:
    p.mkdir(parents=True, exist_ok=True)

APP_NAME = "Nexonic IPTV v2"
APP_VERSION = "2.0.0"

# Networking. Default is this computer only; set NEXONIC_HOST=0.0.0.0 to let devices on your home network
# (for example a Smart TV) connect.
HOST = os.environ.get("NEXONIC_HOST", "127.0.0.1")
PORT = int(os.environ.get("NEXONIC_PORT", "8000"))


def get_local_ip() -> str:
    """LAN address shown to Smart TV apps when the server is shared on the home network."""
    if HOST in ("127.0.0.1", "localhost", "::1"):
        return "127.0.0.1"
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))  # no packet is sent; this only selects the outgoing interface
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


LOCAL_IP = get_local_ip()

# Smart TV (Xtream Codes API) login. If not set, a random password is generated on first run and stored in the
# local database; see it in Settings on this computer.
XTREAM_USER_ENV = os.environ.get("NEXONIC_XTREAM_USER", "").strip()
XTREAM_PASS_ENV = os.environ.get("NEXONIC_XTREAM_PASS", "").strip()
DEFAULT_XTREAM_USER = XTREAM_USER_ENV or "nexonic"

# Verification and stream testing defaults
DEFAULT_VERIFICATION_CONCURRENCY = 6
HTTP_TIMEOUT_SECONDS = 8.0
FFPROBE_TIMEOUT_SECONDS = 8.0
MAX_TEST_RETRIES = 1
