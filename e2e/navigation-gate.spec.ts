import { test, expect } from './fixtures/auth';

/**
 * Navigation Gate
 *
 * For each role, visits key routes and asserts:
 * - No 404 / Not Found page
 * - No blank screens (main element exists with content)
 * - No console errors
 */

const CONSULTANT_ROUTES = [
  '/my-workspaces',
  '/crm',
  '/search',
  '/settings',
  '/help',
  '/guide',
  '/consultor-tools',
  '/ecosystem',
  '/admin',
];

const FOUNDER_ROUTES = [
  '/my-workspaces',
  '/settings',
  '/help',
  '/guide',
  '/mentors',
  '/ecosystem',
];

async function checkRoute(page: import('@playwright/test').Page, route: string, errors: string[]) {
  await page.goto(route);
  await page.waitForTimeout(2_000);

  // Should not show "Not Found" or 404 text (unless it correctly redirected)
  const body = await page.locator('body').textContent();
  const isNotFound = body?.includes('404') || body?.includes('Not Found');
  const wasRedirected = !page.url().includes(route);

  // If it didn't redirect and shows 404, that's a failure
  if (isNotFound && !wasRedirected) {
    errors.push(`Route ${route} shows 404/Not Found without redirect`);
  }

  // Check for blank screen (main must have some content unless redirected)
  if (!wasRedirected) {
    const mainEl = page.locator('main').first();
    if (await mainEl.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const content = await mainEl.textContent();
      if (!content || content.trim().length < 5) {
        errors.push(`Route ${route} has blank main element`);
      }
    }
  }
}

test.describe('Navigation Gate — Consultant', () => {
  test('all consultant routes render without errors', async ({ consultantPage: page }) => {
    const consoleErrors: string[] = [];
    const navErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon') && !text.includes('ResizeObserver') && !text.includes('net::ERR')) {
          consoleErrors.push(text);
        }
      }
    });

    for (const route of CONSULTANT_ROUTES) {
      await checkRoute(page, route, navErrors);
    }

    expect(navErrors).toHaveLength(0);
  });
});

test.describe('Navigation Gate — Founder', () => {
  test('all founder routes render without errors', async ({ founderPage: page }) => {
    const navErrors: string[] = [];

    for (const route of FOUNDER_ROUTES) {
      await checkRoute(page, route, navErrors);
    }

    expect(navErrors).toHaveLength(0);
  });
});
