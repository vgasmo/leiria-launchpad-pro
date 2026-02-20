#!/bin/bash
set -e

echo "🚀 Starting Release Check..."

echo "1️⃣  Linting..."
npm run lint

echo "2️⃣  Type Checking..."
npx tsc --noEmit -p tsconfig.typecheck.json

echo "3️⃣  Building..."
npm run build

echo "4️⃣  Running Unit Tests..."
npx vitest run

echo "5️⃣  Syncing i18n keys..."
node scripts/i18n-sync.cjs

echo "6️⃣  Verifying i18n sync is committed (no pending changes)..."
if ! git diff --exit-code src/i18n/locales > /dev/null 2>&1; then
  echo "❌ i18n locales have uncommitted changes after sync!"
  echo "   Run: node scripts/i18n-sync.cjs && git add src/i18n/locales && git commit"
  git diff --stat src/i18n/locales
  exit 1
fi
echo "   ✅ No uncommitted i18n changes."

echo "7️⃣  Checking i18n Parity..."
node scripts/i18n-check.cjs

echo "8️⃣  Running i18n Lint (strict)..."
node scripts/i18n-lint.mjs

echo "9️⃣  Scanning for Secrets..."
node scripts/secret-scan.cjs

echo "✅ Release Check Passed!"
