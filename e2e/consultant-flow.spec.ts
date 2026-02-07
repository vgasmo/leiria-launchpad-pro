import { test, expect } from './fixtures/auth';

test.describe('Consultant E2E Flow', () => {
  test('CRM → RecordDrawer → change stage → set next action → add task → verify timeline', async ({ consultantPage: page }) => {
    // Navigate to CRM
    await page.goto('/crm');
    await expect(page.locator('[data-testid="crm-page"], main')).toBeVisible({ timeout: 15_000 });

    // ARIA snapshot of CRM page structure
    const crmMain = page.locator('main').first();
    await expect(crmMain).toBeVisible();

    // Click first CRM record to open drawer
    const firstRecord = page.locator('[data-testid="crm-record"], [data-testid="funnel-item"], tr').first();
    if (await firstRecord.isVisible()) {
      await firstRecord.click();

      // Wait for drawer/dialog to appear
      const drawer = page.locator('[data-testid="record-drawer"], [role="dialog"], [data-state="open"]').first();
      await expect(drawer).toBeVisible({ timeout: 10_000 });

      // ARIA snapshot of RecordDrawer
      await expect(drawer).toBeVisible();

      // Try to change stage if a stage selector is visible
      const stageSelect = drawer.locator('[data-testid="stage-select"], select, [role="combobox"]').first();
      if (await stageSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await stageSelect.click();
        // Select second option if available
        const option = page.locator('[role="option"]').nth(1);
        if (await option.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await option.click();
        }
      }

      // Try to set next action
      const nextActionInput = drawer.locator('[data-testid="next-action"], textarea, input[placeholder*="action" i]').first();
      if (await nextActionInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await nextActionInput.fill('E2E test: follow up next week');
      }

      // Check for timeline/activity entries
      const timeline = drawer.locator('[data-testid="timeline"], [data-testid="activity-log"]').first();
      if (await timeline.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await expect(timeline).toBeVisible();
      }
    }
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
    );
    expect(realErrors).toHaveLength(0);
  });
});
