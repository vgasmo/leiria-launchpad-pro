import { test, expect } from './fixtures/auth';

test.describe('Backoffice E2E Flow', () => {
  test('backoffice can access /admin staff routes', async ({ backofficePage: page }) => {
    await page.goto('/admin');
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 });

    // Should stay on /admin (not redirected)
    expect(page.url()).toMatch(/\/admin/);

    // Check for backoffice tabs (buildings, contracts, invoices)
    const buildingsTab = page
      .locator('button:has-text("Buildings"), button:has-text("Edifícios"), [data-testid="buildings-tab"]')
      .first();
    if (await buildingsTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await buildingsTab.click();
      await page.waitForTimeout(1_000);
    }

    const contractsTab = page
      .locator('button:has-text("Contracts"), button:has-text("Contratos"), [data-testid="contracts-tab"]')
      .first();
    if (await contractsTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await contractsTab.click();
      await page.waitForTimeout(1_000);
    }

    const invoicesTab = page
      .locator('button:has-text("Invoices"), button:has-text("Faturas"), [data-testid="invoices-tab"]')
      .first();
    if (await invoicesTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await invoicesTab.click();
      await page.waitForTimeout(1_000);
    }
  });

  test('backoffice can access /crm', async ({ backofficePage: page }) => {
    await page.goto('/crm');
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 });
    // Should stay on /crm (staff route)
    expect(page.url()).toMatch(/\/crm/);
  });

  test('backoffice cannot access admin-only routes', async ({ backofficePage: page }) => {
    // /admin/data-import is adminOnly
    await page.goto('/admin/data-import');
    await page.waitForTimeout(3_000);
    // Should be redirected away
    expect(page.url()).not.toMatch(/\/admin\/data-import/);
  });

  test('no console errors on backoffice pages', async ({ backofficePage: page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/admin');
    await page.waitForTimeout(3_000);

    const realErrors = errors.filter(
      e => !e.includes('favicon') && !e.includes('ResizeObserver') && !e.includes('net::ERR'),
    );
    expect(realErrors).toHaveLength(0);
  });
});
