#!/usr/bin/env bash
# ==============================================================================
# Nexonic IPTV v2 — Local Shutdown Script
# ==============================================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Stopping Nexonic IPTV v2 services..."

if [ -f "$PROJECT_ROOT/local-data/backend.pid" ]; then
    PID=$(cat "$PROJECT_ROOT/local-data/backend.pid")
    if ps -p "$PID" > /dev/null 2>&1; then
        kill "$PID" 2>/dev/null || true
        echo "Stopped Backend (PID $PID)"
    fi
    rm -f "$PROJECT_ROOT/local-data/backend.pid"
fi

if [ -f "$PROJECT_ROOT/local-data/frontend.pid" ]; then
    PID=$(cat "$PROJECT_ROOT/local-data/frontend.pid")
    if ps -p "$PID" > /dev/null 2>&1; then
        kill "$PID" 2>/dev/null || true
        echo "Stopped Frontend (PID $PID)"
    fi
    rm -f "$PROJECT_ROOT/local-data/frontend.pid"
fi

# Kill any leftover node or uvicorn processes on port 8000 and 5173
lsof -ti:"${NEXONIC_PORT:-8000}" -sTCP:LISTEN | xargs kill 2>/dev/null || true
lsof -ti:5173 -sTCP:LISTEN | xargs kill 2>/dev/null || true

echo "Nexonic IPTV v2 stopped successfully."
