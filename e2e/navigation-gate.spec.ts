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
  // Removed /admin as consultants might not have full access, tested in permission gate if needed
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
  const pageErrors: string[] = [];
  
  // Listen for console errors specifically for this route
  const consoleListener = (msg: import('@playwright/test').ConsoleMessage) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon') && !text.includes('ResizeObserver') && !text.includes('net::ERR')) {
        pageErrors.push(`[${route}] Console Error: ${text}`);
      }
    }
  };
  page.on('console', consoleListener);

  try {
    await page.goto(route);
    await page.waitForTimeout(2000);

    // Should not show "Not Found" or 404 text (unless it correctly redirected)
    const body = await page.locator('body').textContent();
    const isNotFound = body?.includes('404') || body?.includes('Not Found') || body?.includes('Página não encontrada');
    const wasRedirected = !page.url().includes(route);

    // If it didn't redirect and shows 404, that's a failure
    if (isNotFound && !wasRedirected) {
      errors.push(`Route ${route} shows 404/Not Found without redirect`);
    }

    // Check for blank screen (main must have some content unless redirected)
    if (!wasRedirected) {
      const mainEl = page.locator('main').first();
      if (await mainEl.isVisible({ timeout: 3000 }).catch(() => false)) {
        const content = await mainEl.textContent();
        if (!content || content.trim().length < 5) {
          errors.push(`Route ${route} has blank main element`);
        }
      } else {
        // If main is not visible, check if we are on a known page structure that doesn't use main?
        // Assume failure if no main content found
        errors.push(`Route ${route} has no visible main element`);
      }
    }
  } catch (e) {
    errors.push(`Route ${route} failed to load: ${e}`);
  } finally {
    page.off('console', consoleListener);
    errors.push(...pageErrors);
  }
}

test.describe('Navigation Gate — Consultant', () => {
  test('all consultant routes render without errors', async ({ consultantPage: page }) => {
    const navErrors: string[] = [];

    for (const route of CONSULTANT_ROUTES) {
      await checkRoute(page, route, navErrors);
    }

    expect(navErrors, `Navigation errors found:\n${navErrors.join('\n')}`).toHaveLength(0);
  });
});

test.describe('Navigation Gate — Founder', () => {
  test('all founder routes render without errors', async ({ founderPage: page }) => {
    const navErrors: string[] = [];

    for (const route of FOUNDER_ROUTES) {
      await checkRoute(page, route, navErrors);
    }

    expect(navErrors, `Navigation errors found:\n${navErrors.join('\n')}`).toHaveLength(0);
  });
});
