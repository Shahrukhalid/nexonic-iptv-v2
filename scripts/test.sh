#!/usr/bin/env bash
# ==============================================================================
# Nexonic IPTV v2 — Automated Test Suite Runner
# ==============================================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "=== Running Backend Tests (pytest) ==="
export PYTHONPATH="$PROJECT_ROOT"
"$PROJECT_ROOT/backend/.venv/bin/pytest" "$PROJECT_ROOT/backend/tests" -v

echo ""
echo "=== Running Frontend Tests (vitest) ==="
cd "$PROJECT_ROOT/frontend"
npm test

echo ""
echo "=== Testing Production Frontend Build ==="
npm run build

echo ""
echo "All tests passed successfully!"
