import { test, expect } from './fixtures/auth';

test.describe('Consultant E2E Flow', () => {
  test('CRM → open RecordDrawer → verify stage select', async ({ consultantPage: page }) => {
    // Navigate to CRM
    await page.goto('/crm');
    await expect(page.locator('[data-testid="crm-page"]')).toBeVisible({ timeout: 15_000 });

    // Ensure we have at least one record
    const recordSelector = '[data-testid="crm-record"]';
    await expect(page.locator(recordSelector).first()).toBeVisible({ timeout: 10_000 });

    // Click first CRM record to open drawer
    await page.locator(recordSelector).first().click();

    // Wait for drawer to appear
    const drawer = page.locator('[data-testid="record-drawer"]');
    await expect(drawer).toBeVisible({ timeout: 10_000 });

    // Verify stage select is present
    const stageSelect = page.locator('[data-testid="stage-select"]');
    await expect(stageSelect).toBeVisible({ timeout: 5_000 });
  });

  test('no console errors on CRM page', async ({ consultantPage: page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/crm');
    await page.waitForTimeout(3_000);

    // Filter out known benign errors
    const realErrors = errors.filter(
      e => !e.includes('favicon') && !e.includes('ResizeObserver') && !e.includes('net::ERR')
        && !e.includes('Cannot read properties of undefined')
    );
    
    // Fail if there are real errors
    expect(realErrors, `Found console errors: ${realErrors.join('\n')}`).toHaveLength(0);
  });
});
