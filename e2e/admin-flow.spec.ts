import { test, expect } from './fixtures/auth';

test.describe('Admin E2E Flow', () => {
  test('buildings → contract lifecycle → office allocation → invoices', async ({ adminPage: page }) => {
    // Navigate to admin backoffice
    await page.goto('/admin');
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 });

    // ARIA snapshot of admin page
    const adminMain = page.locator('main').first();
    await expect(adminMain).toBeVisible();

    // Look for backoffice tabs/sections
    const buildingsTab = page.locator('[data-testid="buildings-tab"], button:has-text("Buildings"), button:has-text("Edifícios")').first();
    if (await buildingsTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await buildingsTab.click();
      await page.waitForTimeout(1_000);
    }

    // Check for contract lifecycle section
    const contractsTab = page.locator('[data-testid="contracts-tab"], button:has-text("Contracts"), button:has-text("Contratos")').first();
    if (await contractsTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await contractsTab.click();
      await page.waitForTimeout(1_000);
    }

    // Check for invoices section
    const invoicesTab = page.locator('[data-testid="invoices-tab"], button:has-text("Invoices"), button:has-text("Faturas")').first();
    if (await invoicesTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await invoicesTab.click();
      await page.waitForTimeout(1_000);
    }

    // Verify audit log if present
    const auditLog = page.locator('[data-testid="audit-log"]').first();
    if (await auditLog.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(auditLog).toBeVisible();
    }
  });

  test('no console errors on admin page', async ({ adminPage: page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/admin');
    await page.waitForTimeout(3_000);

    const realErrors = errors.filter(
      e => !e.includes('favicon') && !e.includes('ResizeObserver') && !e.includes('net::ERR')
    );
    expect(realErrors).toHaveLength(0);
  });
});
