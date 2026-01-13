#!/usr/bin/env node
/**
 * i18n lint:
 * - Detect duplicate top-level keys (JSON overwrites) in locale files.
 * - Ensure critical namespaces exist in both locales.
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
  // This is a lightweight heuristic parser for top-level keys.
  // It scans for "<key>": at depth 1.
  const occurrences = new Map();

  let depth = 0;
  let inString = false;
  let escape = false;
  let token = '';
  let collectingKey = false;
  let lastString = null;

  for (let i = 0; i < jsonText.length; i++) {
    const ch = jsonText[i];

    if (inString) {
      token += ch;
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
        // token contains the closing quote
        lastString = token;
        token = '';
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      token = '"';
      continue;
    }

    if (ch === '{') {
      depth++;
      continue;
    }
    if (ch === '}') {
      depth--;
      continue;
    }

    // Only look for keys at top-level object (depth === 1)
    if (depth === 1 && ch === ':' && lastString) {
      // lastString is like "templates"
      const key = JSON.parse(lastString);
      const count = occurrences.get(key) ?? 0;
      occurrences.set(key, count + 1);
      lastString = null;
      continue;
    }

    // reset lastString if we hit comma at top level without a colon
    if (depth === 1 && ch === ',') {
      lastString = null;
    }
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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function main() {
  const problems = [];

  // Duplicate top-level keys
  for (const loc of LOCALES) {
    const text = readText(loc.file);
    const occurrences = findTopLevelKeyOccurrences(text);
    const dups = [...occurrences.entries()].filter(([, n]) => n > 1);
    if (dups.length) {
      problems.push(
        `[${loc.code}] Duplicate top-level keys found: ` + dups.map(([k, n]) => `${k}(${n})`).join(', ')
      );
    }
  }

  const en = parseJson(LOCALES[0].file);
  const pt = parseJson(LOCALES[1].file);

  // Critical namespaces parity
  const critical = ['templates', 'sessions', 'common', 'nextBestAction'];
  for (const ns of critical) {
    if (!(ns in en)) problems.push(`[en] Missing namespace: ${ns}`);
    if (!(ns in pt)) problems.push(`[pt] Missing namespace: ${ns}`);
  }

  // Critical key parity inside templates (minimum)
  const templateKeys = [
    'catalog',
    'categories',
    'aiCoach',
    'reanalyze',
    'copiedToNotes',
    'applyAndApprove',
    'applyAndRequestChanges',
    'aiCoachNotes',
    'severity',
    'priority',
    'ownerHint',
    'dueInDaysShort',
    'dueAndOwner',
  ];

  for (const k of templateKeys) {
    if (!(k in (en.templates || {}))) problems.push(`[en] Missing templates.${k}`);
    if (!(k in (pt.templates || {}))) problems.push(`[pt] Missing templates.${k}`);
  }

  if (problems.length) {
    console.error('i18n:lint FAILED');
    for (const p of problems) console.error(' - ' + p);
    process.exit(1);
  }

  console.log('i18n:lint OK');
}

main();
