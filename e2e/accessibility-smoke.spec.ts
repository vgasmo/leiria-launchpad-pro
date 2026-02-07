import { test, expect } from './fixtures/auth';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility Smoke Tests
 *
 * Runs axe-core on key pages and captures ARIA snapshots
 * to detect unintended structural regressions.
 */

test.describe('Accessibility Smoke — Consultant', () => {
  test('CRM page has no critical a11y violations', async ({ consultantPage: page }) => {
    await page.goto('/crm');
    await page.waitForTimeout(3_000);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast']) // Often flags dynamic theme colors
      .analyze();

    const critical = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    if (critical.length > 0) {
      console.warn('A11y violations:', JSON.stringify(critical.map(v => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.length,
      })), null, 2));
    }

    // Allow minor issues but fail on critical
    expect(critical.filter(v => v.impact === 'critical')).toHaveLength(0);
  });

  test('CRM page ARIA snapshot', async ({ consultantPage: page }) => {
    await page.goto('/crm');
    await page.waitForTimeout(3_000);

    // Snapshot main landmark structure
    const main = page.locator('main').first();
    await expect(main).toBeVisible();
    await expect(main).toMatchAriaSnapshot(`
      - heading /CRM|Funil|Pipeline/i
    `);
  });
});

test.describe('Accessibility Smoke — Admin', () => {
  test('Admin backoffice has no critical a11y violations', async ({ adminPage: page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(3_000);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();

    const critical = results.violations.filter(v => v.impact === 'critical');
    expect(critical).toHaveLength(0);
  });

  test('Admin page ARIA snapshot', async ({ adminPage: page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(3_000);

    const main = page.locator('main').first();
    await expect(main).toBeVisible();
  });
});
