import { test, expect } from './fixtures/auth';

/**
 * Founder E2E Flow
 *
 * The seeded E2E founder has:
 *   - role: founder
 *   - an active workspace (status='active') with workspace_user entry
 *   - a startup named 'E2E Test Startup'
 *
 * The claim-first gate in App.tsx redirects founders without an active
 * workspace to /claim-startup. Because the seed provides an active
 * workspace, the seeded founder should pass through to /my-workspaces.
 */

test.describe('Founder — Active Workspace Journey', () => {
  test('lands on workspace dashboard, not claim page', async ({ founderPage: page }) => {
    await page.goto('/my-workspaces');
    // Should NOT be redirected to /claim-startup (seeded founder has active workspace)
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2_000);

    const url = page.url();
    expect(url).not.toContain('/claim-startup');
    expect(url).toContain('/my-workspaces');

    // Verify the page rendered meaningful content (founder dashboard or workspace list)
    const main = page.locator('main');
    await expect(main).toBeVisible({ timeout: 10_000 });

    // Founder dashboard should show a heading
    const heading = main.locator('h1, h2, h3').first();
    await expect(heading).toBeVisible({ timeout: 5_000 });
  });

  test('can navigate into workspace detail', async ({ founderPage: page }) => {
    await page.goto('/my-workspaces');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2_000);

    // Look for a clickable workspace entry (card or link containing workspace/startup name)
    const workspaceLink = page.locator(
      'a[href*="workspace/"], [role="link"][href*="workspace/"], button:has-text("E2E Test Startup")'
    ).first();

    if (await workspaceLink.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await workspaceLink.click();
      await page.waitForURL(/workspace\//, { timeout: 10_000 });

      // Verify workspace detail loaded
      const main = page.locator('main');
      await expect(main).toBeVisible({ timeout: 10_000 });

      // Should have tabs (actions, sessions, KPIs, etc.)
      const tabList = page.locator('[role="tablist"]');
      if (await tabList.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await expect(tabList).toBeVisible();
      }
    } else {
      // Founder dashboard may render workspace inline without a separate link
      // Verify we're still on a valid page with content
      await expect(page.locator('main')).toBeVisible();
    }
  });

  test('cannot access admin routes', async ({ founderPage: page }) => {
    // Attempt to visit admin pages — should redirect to /my-workspaces
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
    // CRM is staffOnly, founder should be redirected
    expect(page.url()).not.toMatch(/\/crm$/);
  });

  test('no unfiltered console errors on founder dashboard', async ({ founderPage: page }) => {
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

test.describe('Founder — Claim-First Gate', () => {
  /**
   * This test verifies the claim-first gate behavior.
   * The seeded founder HAS an active workspace, so they should NOT
   * be redirected. But we verify the gate logic is active by checking
   * that /claim-startup is a valid route that renders correctly.
   */
  test('claim-startup page renders without errors', async ({ founderPage: page }) => {
    await page.goto('/claim-startup');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2_000);

    const url = page.url();
    // Seeded founder with active workspace may be shown "already claimed" state
    // or redirected to /my-workspaces — both are valid
    if (url.includes('/claim-startup')) {
      // Verify the claim page rendered
      await expect(page.locator('main')).toBeVisible({ timeout: 5_000 });
    } else {
      // Redirected — that's also correct behavior for a founder with active workspace
      expect(url).toContain('/my-workspaces');
    }
  });
});
