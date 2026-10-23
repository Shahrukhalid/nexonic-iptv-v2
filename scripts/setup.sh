#!/usr/bin/env bash
# ==============================================================================
# Nexonic IPTV v2 — Local Setup Script
# ==============================================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "Setting up Nexonic IPTV v2 on local machine..."

# 0. Check requirements
PYTHON="${PYTHON:-}"
if [ -z "$PYTHON" ]; then
  for candidate in python3.13 python3.12 python3.11 python3.10 python3; do
    if command -v "$candidate" >/dev/null 2>&1 && "$candidate" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)'; then
      PYTHON="$candidate"; break
    fi
  done
fi
if [ -z "$PYTHON" ]; then
  echo "Python 3.10 or newer is required. Install it from https://www.python.org/downloads/ (or: brew install python@3.12) and run this again."
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js 18 or newer is required. Install it from https://nodejs.org/ (or: brew install node) and run this again."
  exit 1
fi
echo "Using $($PYTHON --version) and Node.js $(node --version)"

# 1. Setup Python Venv
echo "Setting up Python virtual environment in backend/.venv..."
"$PYTHON" -m venv backend/.venv
backend/.venv/bin/pip install --upgrade pip
backend/.venv/bin/pip install -r backend/requirements.txt

# 2. Setup Node / NPM packages
echo "Installing frontend dependencies..."
cd frontend
npm install --no-audit --no-fund
npm run build
cd "$PROJECT_ROOT"

echo "Setup completed successfully! Start the app with: bash scripts/start.sh"
