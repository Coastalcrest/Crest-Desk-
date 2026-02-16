/**
 * Shared test fixtures for E2E tests.
 *
 * Provides authenticated page context, test data, and helper functions.
 */
import { test as base, expect, type Page } from '@playwright/test';

// Demo credentials (from seed data)
export const DEMO_BROKER = {
  email: 'broker@demo.crestdesk.com',
  password: 'Demo1234!',
};

export const DEMO_AGENT = {
  email: 'alex@demo.crestdesk.com',
  password: 'Demo1234!',
};

/**
 * Helper to log in via the UI.
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');

  const emailInput = page.locator('input[type="email"], input[name="email"]');
  const passwordInput = page.locator('input[type="password"], input[name="password"]');

  await emailInput.fill(email);
  await passwordInput.fill(password);

  const submitButton = page.locator('button[type="submit"]');
  await submitButton.click();

  // Wait for navigation to dashboard
  await page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {});
}

/**
 * Extended test fixture with authenticated page.
 */
export const test = base.extend<{
  authenticatedPage: Page;
}>({
  authenticatedPage: async ({ page }, use) => {
    await login(page, DEMO_BROKER.email, DEMO_BROKER.password);
    await use(page);
  },
});

export { expect };
