import { test as base, expect, type Page } from '@playwright/test';

/**
 * Role-based authentication fixtures for Playwright E2E tests.
 *
 * Uses environment variables for credentials:
 *   E2E_CONSULTANT_EMAIL / E2E_CONSULTANT_PASSWORD
 *   E2E_FOUNDER_EMAIL   / E2E_FOUNDER_PASSWORD
 *   E2E_MENTOR_EMAIL    / E2E_MENTOR_PASSWORD
 *   E2E_ADMIN_EMAIL     / E2E_ADMIN_PASSWORD
 *
 * Falls back to skip if credentials are not set.
 */

type RoleCredentials = {
  email: string;
  password: string;
};

function getCredentials(role: string): RoleCredentials | null {
  const email = process.env[`E2E_${role.toUpperCase()}_EMAIL`];
  const password = process.env[`E2E_${role.toUpperCase()}_PASSWORD`];
  if (!email || !password) return null;
  return { email, password };
}

async function loginAs(page: Page, creds: RoleCredentials) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(creds.email);
  await page.getByLabel(/password|senha/i).fill(creds.password);
  await page.getByRole('button', { name: /sign in|entrar|log in/i }).click();
  // Wait for redirect away from login
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15_000 });
}

type AuthFixtures = {
  consultantPage: Page;
  founderPage: Page;
  mentorPage: Page;
  adminPage: Page;
};

export const test = base.extend<AuthFixtures>({
  consultantPage: async ({ page }, use, testInfo) => {
    const creds = getCredentials('consultant');
    if (!creds) {
      testInfo.skip(true, 'E2E_CONSULTANT_EMAIL/PASSWORD not set');
      return;
    }
    await loginAs(page, creds);
    await use(page);
  },

  founderPage: async ({ page }, use, testInfo) => {
    const creds = getCredentials('founder');
    if (!creds) {
      testInfo.skip(true, 'E2E_FOUNDER_EMAIL/PASSWORD not set');
      return;
    }
    await loginAs(page, creds);
    await use(page);
  },

  mentorPage: async ({ page }, use, testInfo) => {
    const creds = getCredentials('mentor');
    if (!creds) {
      testInfo.skip(true, 'E2E_MENTOR_EMAIL/PASSWORD not set');
      return;
    }
    await loginAs(page, creds);
    await use(page);
  },

  adminPage: async ({ page }, use, testInfo) => {
    const creds = getCredentials('admin');
    if (!creds) {
      testInfo.skip(true, 'E2E_ADMIN_EMAIL/PASSWORD not set');
      return;
    }
    await loginAs(page, creds);
    await use(page);
  },
});

export { expect };
