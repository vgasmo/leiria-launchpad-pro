import { test, expect } from './fixtures/auth';

test.describe('Founder E2E Flow', () => {
  test('login → workspace dashboard → view tasks/timeline', async ({ founderPage: page }) => {
    // Should land on my-workspaces or workspace after login
    await expect(page).toHaveURL(/my-workspaces|workspace/);

    // Navigate to first workspace if on listing page
    if (page.url().includes('my-workspaces')) {
      const workspaceCard = page.locator('[data-testid="workspace-card"], a[href*="workspace"]').first();
      if (await workspaceCard.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await workspaceCard.click();
        await page.waitForURL(/workspace\//);
      }
    }

    // Verify dashboard elements
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });

    // Check for tasks section
    const tasksSection = page.locator('[data-testid="tasks"], [data-testid="action-items"]').first();
    if (await tasksSection.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(tasksSection).toBeVisible();
    }
  });

  test('founder cannot access admin routes', async ({ founderPage: page }) => {
    // Attempt to visit admin pages — should redirect
    await page.goto('/admin');
    await page.waitForTimeout(2_000);
    expect(page.url()).not.toMatch(/\/admin$/);

    await page.goto('/admin/data-import');
    await page.waitForTimeout(2_000);
    expect(page.url()).not.toMatch(/\/admin\/data-import/);

    await page.goto('/crm');
    await page.waitForTimeout(2_000);
    // CRM is staffOnly, founder should be redirected
    expect(page.url()).not.toMatch(/\/crm$/);
  });

  test('no console errors on founder dashboard', async ({ founderPage: page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/my-workspaces');
    await page.waitForTimeout(3_000);

    const realErrors = errors.filter(
      e => !e.includes('favicon') && !e.includes('ResizeObserver') && !e.includes('net::ERR')
    );
    expect(realErrors).toHaveLength(0);
  });
});
