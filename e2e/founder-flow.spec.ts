import { test, expect } from './fixtures/auth';

/**
 * Founder E2E Flow — Deterministic personas
 *
 * founderPage (e2e-founder@...):
 *   - Has active workspace + workspace_user entry
 *   - Should bypass claim gate → lands on /my-workspaces
 *
 * founderUnclaimedPage (e2e-founder-unclaimed@...):
 *   - Has NO workspace, no claim request
 *   - Should be gated → lands on /claim-startup
 */

test.describe('Founder — Active Workspace (founderPage)', () => {
  test('bypasses claim gate and lands on workspace dashboard', async ({ founderPage: page }) => {
    await page.goto('/my-workspaces');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3_000);

    const url = page.url();
    // Active founder must NOT be redirected to claim page
    expect(url).not.toContain('/claim-startup');
    expect(url).toContain('/my-workspaces');

    // Dashboard should render with a heading (not a bare empty state)
    const heading = page.locator('h1, h2, h3').first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });

  test('can navigate into workspace detail', async ({ founderPage: page }) => {
    await page.goto('/my-workspaces');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3_000);

    // Look for a clickable workspace entry
    const workspaceLink = page.locator(
      'a[href*="workspace/"], button:has-text("E2E Test Startup")'
    ).first();

    if (await workspaceLink.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await workspaceLink.click();
      await page.waitForURL(/workspace\//, { timeout: 10_000 });

      // Verify workspace detail loaded with tabs
      const heading = page.locator('h1, h2, h3').first();
      await expect(heading).toBeVisible({ timeout: 10_000 });

      // PT locale assertion: KPI tab should show localized label
      const kpiTab = page.locator('[role="tab"], button, a').filter({ hasText: 'KPIs' });
      if (await kpiTab.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
        await kpiTab.first().click();
        await page.waitForTimeout(1_000);
        // After clicking KPIs tab, verify PT chrome is present (not English "Required" badge or "Value" label)
        const englishLeak = page.locator('text="Enter value"');
        const leakCount = await englishLeak.count();
        // "Enter value" should not appear — it should be "Introduzir valor" in PT
        expect(leakCount).toBe(0);
      }
    } else {
      // Inline dashboard without separate link — verify content exists
      const heading = page.locator('h1, h2, h3').first();
      await expect(heading).toBeVisible({ timeout: 10_000 });
    }
  });

  test('cannot access admin routes', async ({ founderPage: page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(3_000);
    expect(page.url()).not.toMatch(/\/admin$/);

    await page.goto('/admin/data-import');
    await page.waitForTimeout(3_000);
    expect(page.url()).not.toMatch(/\/admin\/data-import/);
  });

  test('cannot access CRM (staff-only)', async ({ founderPage: page }) => {
    await page.goto('/crm');
    await page.waitForTimeout(3_000);
    expect(page.url()).not.toMatch(/\/crm$/);
  });

  test('no critical console errors on founder dashboard', async ({ founderPage: page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/my-workspaces');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3_000);

    // Filter out known noise
    const realErrors = errors.filter(
      e => !e.includes('favicon') &&
           !e.includes('ResizeObserver') &&
           !e.includes('net::ERR') &&
           !e.includes('Cannot read properties of undefined') &&
           !e.includes('Download the React DevTools') &&
           !e.includes('Third-party cookie')
    );
    expect(realErrors).toHaveLength(0);
  });
});

test.describe('Founder — Claim-First Gate (founderUnclaimedPage)', () => {
  test('is gated to /claim-startup when navigating to /my-workspaces', async ({ founderUnclaimedPage: page }) => {
    await page.goto('/my-workspaces');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3_000);

    // Unclaimed founder must be redirected to the claim page
    expect(page.url()).toContain('/claim-startup');
  });

  test('claim page renders with semantic structure and verify CTA', async ({ founderUnclaimedPage: page }) => {
    await page.goto('/claim-startup');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3_000);

    // Claim page should have a <main> landmark
    const main = page.locator('main[data-testid="claim-startup-page"]');
    await expect(main).toBeVisible({ timeout: 10_000 });

    // Should display the claim page heading
    const heading = main.locator('h1, h2, h3').first();
    await expect(heading).toBeVisible({ timeout: 5_000 });

    // Should have the verify button
    const verifyButton = page.getByRole('button', { name: /verificar|verify/i });
    await expect(verifyButton).toBeVisible({ timeout: 5_000 });
  });

  test('cannot access admin routes', async ({ founderUnclaimedPage: page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(3_000);
    expect(page.url()).not.toMatch(/\/admin$/);
  });
});
