#!/usr/bin/env bash
set -euo pipefail

# ─── E2E Test Runner ───
# Runs deterministic E2E tests against local Supabase.
# Usage: bash scripts/e2e/test-e2e.sh
#
# Prerequisites: Docker running, supabase CLI installed
# If SUPABASE_SERVICE_ROLE_KEY is not set and local Supabase is unavailable,
# E2E is skipped gracefully (exit 0).

echo "🚀 E2E Test Runner"
echo ""

# ── Guard: check if we can obtain credentials ──
if [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  # Try to extract from local Supabase
  if command -v supabase &>/dev/null; then
    echo "1️⃣  Starting local Supabase..."
    supabase start 2>/dev/null || echo "   (already running or unavailable)"

    echo ""
    echo "2️⃣  Extracting Supabase keys..."
    if KEYS_OUTPUT=$(node scripts/e2e/get-supabase-keys.cjs 2>/dev/null); then
      eval "$(echo "$KEYS_OUTPUT" | sed 's/^/export /')"
    fi
  fi

  # Final check: if still missing, skip E2E
  if [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
    echo ""
    echo "⏭️  E2E skipped: SUPABASE_SERVICE_ROLE_KEY not set."
    echo "   This is expected in Lovable Cloud or environments without local Supabase."
    echo "   To run E2E locally: install supabase CLI, run 'supabase start', then re-run this script."
    exit 0
  fi
fi

# Export VITE vars for the build
export VITE_SUPABASE_URL="${SUPABASE_URL:-http://127.0.0.1:54321}"
export VITE_SUPABASE_PUBLISHABLE_KEY="${SUPABASE_ANON_KEY:-}"
export VITE_SUPABASE_PROJECT_ID="${VITE_SUPABASE_PROJECT_ID:-local}"

echo "   API URL: ${SUPABASE_URL:-$VITE_SUPABASE_URL}"

# 3. Seed test data
echo ""
echo "3️⃣  Seeding test data..."
bunx tsx scripts/e2e/seed-local-supabase.ts

# 4. Build app
echo ""
echo "4️⃣  Building app..."
bun run build

# 5. Start preview server
echo ""
echo "5️⃣  Starting preview server..."
bunx vite preview --port 5173 &
SERVER_PID=$!
trap "kill $SERVER_PID 2>/dev/null" EXIT

# Wait for server
bunx wait-on http://localhost:5173 --timeout 15000

# 6. Run Playwright
echo ""
echo "6️⃣  Running Playwright tests..."
PLAYWRIGHT_BASE_URL=http://localhost:5173 bunx playwright test --reporter=line

echo ""
echo "✅ E2E tests complete"
