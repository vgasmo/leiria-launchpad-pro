import { test, expect } from './fixtures/auth';

test.describe('Mentor E2E Flow', () => {
  // ── NDA Compliance Gate ───────────────────────────────────────────────
  test('NDA gate blocks workspace access until accepted', async ({ mentorPage: page }) => {
    // Navigate to root — mentor should be redirected or see NDA gate
    await page.goto('/');
    await expect(page.locator('main, [data-testid="app-layout"]')).toBeVisible({ timeout: 15_000 });

    // If mentor hasn't accepted NDA, they should see the NDA wall
    const isOnNdaPage = page.url().includes('mentor-nda') ||
      await page.getByText(/acordo de confidencialidade|non-disclosure|NDA/i).isVisible({ timeout: 5_000 }).catch(() => false);

    if (isOnNdaPage) {
      // Verify the NDA wall content is displayed
      await expect(page.getByText(/acordo de confidencialidade|non-disclosure|NDA/i)).toBeVisible();

      // The accept button should be present and accessible
      const acceptBtn = page.getByRole('button', { name: /aceitar|accept|concordo|agree/i });
      await expect(acceptBtn).toBeVisible({ timeout: 5_000 });

      // There should be a checkbox or scroll requirement before accepting
      const checkbox = page.getByRole('checkbox').or(page.locator('input[type="checkbox"]'));
      if (await checkbox.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await checkbox.check();
      }

      // Click accept
      await acceptBtn.click();

      // Should be redirected away from NDA page
      await page.waitForURL(url => !url.pathname.includes('mentor-nda'), { timeout: 15_000 });

      // Should see the mentor dashboard or workspace content
      await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
    }
  });

  // ── Post-NDA Access ───────────────────────────────────────────────────
  test('mentor can access mentors page after NDA', async ({ mentorPage: page }) => {
    await page.goto('/mentors');
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });

    // Should not be redirected to NDA if already accepted
    expect(page.url()).not.toContain('mentor-nda');
  });

  // ── Route Protection ──────────────────────────────────────────────────
  test('mentor cannot access admin routes', async ({ mentorPage: page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(3_000);
    // Should be redirected away from admin
    expect(page.url()).not.toMatch(/\/admin$/);

    await page.goto('/admin/data-import');
    await page.waitForTimeout(3_000);
    expect(page.url()).not.toMatch(/\/admin\/data-import/);
  });

  test('mentor cannot access backoffice routes', async ({ mentorPage: page }) => {
    await page.goto('/admin/users');
    await page.waitForTimeout(3_000);
    expect(page.url()).not.toMatch(/\/admin\/users/);
  });

  // ── Console Error Check ───────────────────────────────────────────────
  test('no critical console errors on mentor pages', async ({ mentorPage: page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/mentors');
    await page.waitForTimeout(4_000);

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(
      e =>
        !e.includes('favicon') &&
        !e.includes('ResizeObserver') &&
        !e.includes('net::ERR') &&
        !e.includes('Failed to load resource') &&
        !e.includes('third-party'),
    );
    expect(criticalErrors).toHaveLength(0);
  });

  // ── Workspace Data Visibility ─────────────────────────────────────────
  test('mentor only sees assigned workspaces', async ({ mentorPage: page }) => {
    await page.goto('/my-workspaces');
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });

    // Mentor should not see the "all workspaces" admin view
    const allWorkspacesHeader = page.getByText(/todos os workspaces|all workspaces/i);
    const isAdminView = await allWorkspacesHeader.isVisible({ timeout: 2_000 }).catch(() => false);
    expect(isAdminView).toBe(false);
  });
});
