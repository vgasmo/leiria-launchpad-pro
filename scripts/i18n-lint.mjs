#!/usr/bin/env node
/**
 * i18n lint:
 * - Detect duplicate top-level keys (JSON overwrites) in locale files.
 * - Ensure critical namespaces exist in both locales.
 * - Scan TSX files for t('...') usages and verify keys exist in both locales.
 *
 * Usage: node scripts/i18n-lint.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const LOCALES = [
  { code: 'en', file: path.join(ROOT, 'src/i18n/locales/en.json') },
  { code: 'pt', file: path.join(ROOT, 'src/i18n/locales/pt.json') },
];

function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

function findTopLevelKeyOccurrences(jsonText) {
  const occurrences = new Map();
  let depth = 0;
  let inString = false;
  let escape = false;
  let token = '';
  let lastString = null;

  for (let i = 0; i < jsonText.length; i++) {
    const ch = jsonText[i];

    if (inString) {
      token += ch;
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === '"') {
        inString = false;
        lastString = token;
        token = '';
      }
      continue;
    }

    if (ch === '"') { inString = true; token = '"'; continue; }
    if (ch === '{') { depth++; continue; }
    if (ch === '}') { depth--; continue; }

    if (depth === 1 && ch === ':' && lastString) {
      const key = JSON.parse(lastString);
      const count = occurrences.get(key) ?? 0;
      occurrences.set(key, count + 1);
      lastString = null;
      continue;
    }

    if (depth === 1 && ch === ',') { lastString = null; }
  }

  return occurrences;
}

function parseJson(file) {
  try {
    return JSON.parse(readText(file));
  } catch (e) {
    throw new Error(`Invalid JSON: ${file} (${e?.message || e})`);
  }
}

// Recursively get a nested key from an object
function getNestedKey(obj, keyPath) {
  const parts = keyPath.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
}

// Find all TSX/TS files recursively in src
function findTsxFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      files.push(...findTsxFiles(fullPath));
    } else if (entry.isFile() && /\.(tsx|ts)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

// Extract t('...') keys from file content
function extractTranslationKeys(content) {
  const keys = [];
  const regex = /\bt\(\s*['"`]([^'"`]+)['"`]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    keys.push(match[1]);
  }
  return keys;
}

function main() {
  const problems = [];
  const warnings = [];

  // Duplicate top-level keys
  for (const loc of LOCALES) {
    const text = readText(loc.file);
    const occurrences = findTopLevelKeyOccurrences(text);
    const dups = [...occurrences.entries()].filter(([, n]) => n > 1);
    if (dups.length) {
      warnings.push(
        `[${loc.code}] Duplicate top-level keys (last wins): ` + dups.map(([k, n]) => `${k}(${n})`).join(', ')
      );
    }
  }

  const en = parseJson(LOCALES[0].file);
  const pt = parseJson(LOCALES[1].file);

  // Critical namespaces parity
  const critical = ['templates', 'sessions', 'common', 'nextBestAction', 'health', 'consultor'];
  for (const ns of critical) {
    if (!(ns in en)) problems.push(`[en] Missing namespace: ${ns}`);
    if (!(ns in pt)) problems.push(`[pt] Missing namespace: ${ns}`);
  }

  // Critical key parity inside templates (minimum)
  const templateKeys = [
    'catalog', 'categories', 'aiCoach', 'reanalyze', 'copiedToNotes',
    'applyAndApprove', 'applyAndRequestChanges', 'aiCoachNotes',
    'severity', 'priority', 'ownerHint', 'dueInDaysShort', 'dueAndOwner', 'canvas',
  ];

  for (const k of templateKeys) {
    if (!(k in (en.templates || {}))) problems.push(`[en] Missing templates.${k}`);
    if (!(k in (pt.templates || {}))) problems.push(`[pt] Missing templates.${k}`);
  }

  // Check for English text in PT templates catalog (blacklist scan)
  const englishBlacklist = [
    'Fundraising Readiness', 'Business Model Canvas', 'Value Proposition',
    'Growth Loops', 'Sales Pipeline', 'Customer Segments',
  ];
  
  const ptCatalog = pt.templates?.catalog || {};
  const ptCatalogStr = JSON.stringify(ptCatalog);
  for (const phrase of englishBlacklist) {
    if (ptCatalogStr.includes(`"title":"${phrase}"`) || ptCatalogStr.includes(`"desc":"${phrase}"`)) {
      problems.push(`[pt] English phrase found in templates.catalog: "${phrase}"`);
    }
  }

  // Scan TSX files for missing translation keys
  const srcDir = path.join(ROOT, 'src');
  const tsxFiles = findTsxFiles(srcDir);
  
  const missingInEn = new Map();
  const missingInPt = new Map();
  
  for (const file of tsxFiles) {
    const content = readText(file);
    const keys = extractTranslationKeys(content);
    const relPath = path.relative(ROOT, file);
    
    for (const key of keys) {
      if (key.includes('${') || key.includes('{{')) continue;
      
      const enValue = getNestedKey(en, key);
      const ptValue = getNestedKey(pt, key);
      
      if (enValue === undefined) {
        if (!missingInEn.has(key)) missingInEn.set(key, []);
        missingInEn.get(key).push(relPath);
      }
      if (ptValue === undefined) {
        if (!missingInPt.has(key)) missingInPt.set(key, []);
        missingInPt.get(key).push(relPath);
      }
    }
  }
  
  const MAX_MISSING_TO_SHOW = 20;
  
  if (missingInEn.size > 0) {
    const keys = [...missingInEn.keys()].slice(0, MAX_MISSING_TO_SHOW);
    for (const key of keys) {
      const files = missingInEn.get(key).slice(0, 2).join(', ');
      warnings.push(`[en] Missing key: "${key}" (used in: ${files})`);
    }
    if (missingInEn.size > MAX_MISSING_TO_SHOW) {
      warnings.push(`[en] ... and ${missingInEn.size - MAX_MISSING_TO_SHOW} more missing keys`);
    }
  }
  
  if (missingInPt.size > 0) {
    const keys = [...missingInPt.keys()].slice(0, MAX_MISSING_TO_SHOW);
    for (const key of keys) {
      const files = missingInPt.get(key).slice(0, 2).join(', ');
      warnings.push(`[pt] Missing key: "${key}" (used in: ${files})`);
    }
    if (missingInPt.size > MAX_MISSING_TO_SHOW) {
      warnings.push(`[pt] ... and ${missingInPt.size - MAX_MISSING_TO_SHOW} more missing keys`);
    }
  }

  // Print warnings (non-fatal)
  if (warnings.length) {
    console.warn('i18n:lint WARNINGS');
    for (const w of warnings) console.warn(' ⚠ ' + w);
    console.warn('');
  }

  if (problems.length) {
    console.error('i18n:lint FAILED');
    for (const p of problems) console.error(' - ' + p);
    process.exit(1);
  }

  console.log(`i18n:lint OK (scanned ${tsxFiles.length} files, ${warnings.length} warnings)`);
}

main();
