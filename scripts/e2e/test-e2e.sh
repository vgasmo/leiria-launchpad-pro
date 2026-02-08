#!/usr/bin/env bash
set -euo pipefail

# ─── E2E Test Runner ───
# Runs deterministic E2E tests against local Supabase.
# Usage: bash scripts/e2e/test-e2e.sh
#
# Prerequisites: Docker running, supabase CLI installed

echo "🚀 E2E Test Runner"
echo ""

# 1. Start local Supabase (if not already running)
echo "1️⃣  Starting local Supabase..."
supabase start 2>/dev/null || echo "   (already running)"

# 2. Extract credentials using Node (no jq dependency)
echo ""
echo "2️⃣  Extracting Supabase keys..."
KEYS_OUTPUT=$(node scripts/e2e/get-supabase-keys.cjs)
eval "$(echo "$KEYS_OUTPUT" | sed 's/^/export /')"

echo "   API URL: $SUPABASE_URL"

# 3. Seed test data
echo ""
echo "3️⃣  Seeding test data..."
npx tsx scripts/e2e/seed-local-supabase.ts

# 4. Build app
echo ""
echo "4️⃣  Building app..."
npm run build

# 5. Start preview server
echo ""
echo "5️⃣  Starting preview server..."
npx vite preview --port 5173 &
SERVER_PID=$!
trap "kill $SERVER_PID 2>/dev/null" EXIT

# Wait for server
npx wait-on http://localhost:5173 --timeout 15000

# 6. Run Playwright
echo ""
echo "6️⃣  Running Playwright tests..."
PLAYWRIGHT_BASE_URL=http://localhost:5173 npx playwright test --reporter=line

echo ""
echo "✅ E2E tests complete"
