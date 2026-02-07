import { test, expect } from './fixtures/auth';

test.describe('Mentor E2E Flow', () => {
  test('NDA gate → limited workspace access', async ({ mentorPage: page }) => {
    // Mentor should land somewhere after login
    await expect(page.locator('main, [data-testid="app-layout"]')).toBeVisible({ timeout: 15_000 });

    // If NDA gate is present, verify it shows
    if (page.url().includes('mentor-nda')) {
      await expect(page.locator('main')).toBeVisible();
      // NDA page should have accept button
      const acceptBtn = page.getByRole('button', { name: /accept|aceitar|agree/i });
      if (await acceptBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        // Don't actually accept in tests to keep idempotent
        await expect(acceptBtn).toBeEnabled();
      }
    }

    // Try to access mentors page
    await page.goto('/mentors');
    await page.waitForTimeout(3_000);
    await expect(page.locator('main')).toBeVisible();
  });

  test('mentor cannot access admin routes', async ({ mentorPage: page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(2_000);
    expect(page.url()).not.toMatch(/\/admin$/);

    await page.goto('/admin/data-import');
    await page.waitForTimeout(2_000);
    expect(page.url()).not.toMatch(/\/admin\/data-import/);
  });

  test('no console errors on mentor pages', async ({ mentorPage: page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/mentors');
    await page.waitForTimeout(3_000);

    const realErrors = errors.filter(
      e => !e.includes('favicon') && !e.includes('ResizeObserver') && !e.includes('net::ERR')
    );
    expect(realErrors).toHaveLength(0);
  });
});
