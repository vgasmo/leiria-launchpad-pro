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

# 2. Extract credentials
API_URL=$(supabase status --output json 2>/dev/null | jq -r '.API_URL' || echo "http://127.0.0.1:54321")
ANON_KEY=$(supabase status --output json 2>/dev/null | jq -r '.ANON_KEY' || echo "")
SERVICE_ROLE_KEY=$(supabase status --output json 2>/dev/null | jq -r '.SERVICE_ROLE_KEY' || echo "")

export SUPABASE_URL="$API_URL"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
export VITE_SUPABASE_URL="$API_URL"
export VITE_SUPABASE_PUBLISHABLE_KEY="$ANON_KEY"
export VITE_SUPABASE_PROJECT_ID="local"

echo "   API URL: $API_URL"

# 3. Seed test data
echo ""
echo "2️⃣  Seeding test data..."
npx tsx scripts/e2e/seed-local-supabase.ts

# 4. Build app
echo ""
echo "3️⃣  Building app..."
npm run build

# 5. Start preview server
echo ""
echo "4️⃣  Starting preview server..."
npx vite preview --port 5173 &
SERVER_PID=$!
trap "kill $SERVER_PID 2>/dev/null" EXIT

# Wait for server
npx wait-on http://localhost:5173 --timeout 15000

# 6. Run Playwright
echo ""
echo "5️⃣  Running Playwright tests..."
PLAYWRIGHT_BASE_URL=http://localhost:5173 npx playwright test --reporter=line

echo ""
echo "✅ E2E tests complete"
