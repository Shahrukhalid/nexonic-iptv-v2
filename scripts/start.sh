#!/usr/bin/env bash
# ==============================================================================
# Nexonic IPTV v2 — Local Startup Script (macOS / Linux)
# Starts Nexonic IPTV v2 Engine & Web Application
# ==============================================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "============================================================"
echo "                   STARTING NEXONIC IPTV V2                       "
echo "        100% Local Worldwide IPTV & Xtream Codes Server     "
echo "============================================================"

# Stop any previous instances
bash "$PROJECT_ROOT/scripts/stop.sh" > /dev/null 2>&1 || true

# Load optional settings from .env (see .env.example)
if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a; . "$PROJECT_ROOT/.env"; set +a
fi
HOST="${NEXONIC_HOST:-127.0.0.1}"
PORT="${NEXONIC_PORT:-8000}"

mkdir -p "$PROJECT_ROOT/local-data/logs"

echo "Starting Nexonic IPTV v2 server on $HOST:$PORT..."
export PYTHONPATH="$PROJECT_ROOT"
nohup "$PROJECT_ROOT/backend/.venv/bin/python" -m uvicorn backend.app.main:app --host "$HOST" --port "$PORT" > "$PROJECT_ROOT/local-data/logs/backend.log" 2>&1 &
BACKEND_PID=$!
echo "$BACKEND_PID" > "$PROJECT_ROOT/local-data/backend.pid"

# Wait briefly and verify backend process is still alive
sleep 2
if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
  echo "ERROR: Backend failed to start. Check $PROJECT_ROOT/local-data/logs/backend.log" >&2
  exit 1
fi

if [ "${NEXONIC_DEV:-0}" = "1" ]; then
  echo "Starting Vite dev server on 127.0.0.1:5173..."
  cd "$PROJECT_ROOT/frontend"
  CI=1 nohup ./node_modules/.bin/vite --host 127.0.0.1 --port 5173 > "$PROJECT_ROOT/local-data/logs/frontend.log" 2>&1 &
  FRONTEND_PID=$!
  echo "$FRONTEND_PID" > "$PROJECT_ROOT/local-data/frontend.pid"
  cd "$PROJECT_ROOT"
  sleep 1
  if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo "ERROR: Frontend failed to start. Check $PROJECT_ROOT/local-data/logs/frontend.log" >&2
    exit 1
  fi
fi

echo "============================================================"
echo "Nexonic IPTV v2 is running: http://localhost:$PORT"
if [ "$HOST" = "127.0.0.1" ]; then
  echo "Only this computer can connect. To use a Smart TV on your home"
  echo "network, set NEXONIC_HOST=0.0.0.0 in .env and restart."
else
  echo "Shared on your local network. Your TV login (server URL,"
  echo "username, password) is shown in the app under Connect Smart TV."
fi
echo "Stop with: bash scripts/stop.sh"
echo "============================================================"
