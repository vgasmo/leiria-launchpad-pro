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

echo "5️⃣  Checking i18n Parity..."
node scripts/i18n-check.cjs

echo "6️⃣  Scanning for Secrets..."
node scripts/secret-scan.cjs

echo "✅ Release Check Passed!"
