/**
 * i18n Parity Gate
 *
 * Runs i18n-sync.cjs to ensure locales are in sync, then verifies
 * EN and PT locale files have identical key sets and no empty values.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

const LOCALES_DIR = path.resolve(__dirname, '../i18n/locales');
const EN_PATH = path.join(LOCALES_DIR, 'en.json');
const PT_PATH = path.join(LOCALES_DIR, 'pt.json');

function flattenKeys(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return { ...acc, ...flattenKeys(value as Record<string, unknown>, fullKey) };
    }
    acc[fullKey] = value;
    return acc;
  }, {} as Record<string, unknown>);
}

// Read-only parity gate: does NOT run sync.
// Run `node scripts/i18n-sync.cjs` separately if keys are missing.

describe('i18n strict parity', () => {
  let enFlat: Record<string, unknown>;
  let ptFlat: Record<string, unknown>;
  let enKeys: Set<string>;
  let ptKeys: Set<string>;

  beforeAll(() => {
    const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf-8'));
    const pt = JSON.parse(fs.readFileSync(PT_PATH, 'utf-8'));
    enFlat = flattenKeys(en);
    ptFlat = flattenKeys(pt);
    enKeys = new Set(Object.keys(enFlat));
    ptKeys = new Set(Object.keys(ptFlat));
  });

  it('EN and PT have identical key sets', () => {
    const missingInPt = [...enKeys].filter(k => !ptKeys.has(k));
    const missingInEn = [...ptKeys].filter(k => !enKeys.has(k));

    if (missingInPt.length > 0) {
      console.error('Missing in PT:', missingInPt.slice(0, 20));
    }
    if (missingInEn.length > 0) {
      console.error('Missing in EN:', missingInEn.slice(0, 20));
    }

    expect(missingInPt, 'Keys in EN missing from PT — run: node scripts/i18n-sync.cjs').toEqual([]);
    expect(missingInEn, 'Keys in PT missing from EN — run: node scripts/i18n-sync.cjs').toEqual([]);
  });

  it('no empty values in EN', () => {
    const empty = Object.entries(enFlat).filter(([, v]) => v === '' || v === null);
    if (empty.length > 0) console.error('Empty EN keys:', empty.slice(0, 10).map(([k]) => k));
    expect(empty, 'Empty values in en.json — fix manually or via sync').toEqual([]);
  });

  it('no empty values in PT', () => {
    const empty = Object.entries(ptFlat).filter(([, v]) => v === '' || v === null);
    if (empty.length > 0) console.error('Empty PT keys:', empty.slice(0, 10).map(([k]) => k));
    expect(empty, 'Empty values in pt.json — fix manually or via sync').toEqual([]);
  });

  it('key counts match', () => {
    expect(enKeys.size).toBe(ptKeys.size);
  });
});
