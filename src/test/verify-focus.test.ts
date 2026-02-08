/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('verify FocusModeToggle test', () => {
  it('runs vitest on FocusModeToggle and all tests pass', () => {
    let out = '';
    try {
      out = execSync('npx vitest run src/test/FocusModeToggle.test.tsx 2>&1', {
        encoding: 'utf-8',
        timeout: 60000,
      });
    } catch (e: any) {
      out = e.stdout || '';
      console.log('VITEST OUTPUT:', out);
      if (!out.includes('passed')) {
        throw new Error('FocusModeToggle tests failed:\n' + out);
      }
    }
    console.log('VITEST OUTPUT:', out);
    expect(out).toContain('3 passed');
  });
});
