#!/usr/bin/env bash
# ==============================================================================
# Nexonic IPTV v2 — Local Setup Script
# ==============================================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "Setting up Nexonic IPTV v2 on local machine..."

# 1. Setup Python Venv
echo "Setting up Python virtual environment in backend/.venv..."
python3 -m venv backend/.venv
backend/.venv/bin/pip install --upgrade pip
backend/.venv/bin/pip install -r backend/requirements.txt

# 2. Setup Node / NPM packages
echo "Installing frontend dependencies..."
cd frontend
npm install
npm run build
cd "$PROJECT_ROOT"

echo "Setup completed successfully! Start the app with: bash scripts/start.sh"
