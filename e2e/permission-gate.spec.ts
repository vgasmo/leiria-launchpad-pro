import { test, expect } from './fixtures/auth';

/**
 * Permission Gate
 *
 * Verifies that restricted routes redirect non-authorized roles.
 */

const ADMIN_ONLY_ROUTES = ['/admin/data-import', '/admin/programs/new'];
const STAFF_ONLY_ROUTES = ['/crm', '/admin'];

test.describe('Permission Gate — Founder blocked from admin', () => {
  test('founder is redirected from admin-only routes', async ({ founderPage: page }) => {
    for (const route of ADMIN_ONLY_ROUTES) {
      await page.goto(route);
      await page.waitForTimeout(2_000);
      // Should have been redirected away
      expect(page.url()).not.toContain(route);
    }
  });

  test('founder is redirected from staff-only routes', async ({ founderPage: page }) => {
    for (const route of STAFF_ONLY_ROUTES) {
      await page.goto(route);
      await page.waitForTimeout(2_000);
      expect(page.url()).not.toContain(route);
    }
  });
});

test.describe('Permission Gate — Mentor blocked from admin', () => {
  test('mentor is redirected from admin-only routes', async ({ mentorPage: page }) => {
    for (const route of ADMIN_ONLY_ROUTES) {
      await page.goto(route);
      await page.waitForTimeout(2_000);
      expect(page.url()).not.toContain(route);
    }
  });

  test('mentor is redirected from staff-only routes', async ({ mentorPage: page }) => {
    for (const route of STAFF_ONLY_ROUTES) {
      await page.goto(route);
      await page.waitForTimeout(2_000);
      expect(page.url()).not.toContain(route);
    }
  });
});
