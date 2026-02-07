#!/usr/bin/env node
/**
 * Secret Leak Scanner
 *
 * Scans tracked source files for patterns that look like hardcoded secrets.
 * Fails CI if any are found in code or migration files.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PATTERNS = [
  // Common secret variable names with inline values
  /client_secret\s*[:=]\s*["'][^"']+["']/gi,
  /api_key\s*[:=]\s*["'][^"']+["']/gi,
  /secret_key\s*[:=]\s*["'][^"']+["']/gi,
  /private_key\s*[:=]\s*["'][^"']+["']/gi,
  // Bearer tokens hardcoded
  /Bearer\s+[A-Za-z0-9\-_.]{20,}/g,
  // Supabase service role key pattern (starts with eyJ and is long)
  /service_role_key\s*[:=]\s*["'][^"']+["']/gi,
];

// Allowlisted files/patterns
const ALLOW_LIST = [
  'scripts/secret-scan.cjs',     // this file
  '.env.example',                 // placeholder values
  'node_modules',
  'dist/',
  '.git/',
  'bun.lockb',
  'package-lock.json',
];

function shouldSkip(filePath) {
  return ALLOW_LIST.some(a => filePath.includes(a));
}

function getTrackedFiles() {
  try {
    const output = execSync('git ls-files', { encoding: 'utf-8' });
    return output.trim().split('\n').filter(f => f.length > 0);
  } catch {
    // Fallback: scan common directories
    const exts = ['.ts', '.tsx', '.js', '.json', '.sql', '.toml', '.yml', '.yaml'];
    const dirs = ['src', 'supabase', 'scripts', '.github'];
    const files = [];
    for (const dir of dirs) {
      if (fs.existsSync(dir)) {
        walkDir(dir, files, exts);
      }
    }
    return files;
  }
}

function walkDir(dir, files, exts) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!shouldSkip(full)) walkDir(full, files, exts);
    } else if (exts.some(e => full.endsWith(e))) {
      files.push(full);
    }
  }
}

function run() {
  const files = getTrackedFiles();
  const findings = [];

  for (const filePath of files) {
    if (shouldSkip(filePath)) continue;
    if (!fs.existsSync(filePath)) continue;

    let content;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      continue; // binary file
    }

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pattern of PATTERNS) {
        pattern.lastIndex = 0; // reset regex state
        if (pattern.test(line)) {
          findings.push({ file: filePath, line: i + 1, match: line.trim().substring(0, 120) });
        }
      }
    }
  }

  if (findings.length > 0) {
    console.error('❌ Secret Leak Scan FAILED — potential secrets found:\n');
    for (const f of findings) {
      console.error(`  ${f.file}:${f.line}`);
      console.error(`    ${f.match}\n`);
    }
    process.exit(1);
  }

  console.log(`✅ Secret Leak Scan PASSED — ${files.length} files scanned, no secrets found.`);
  process.exit(0);
}

run();
