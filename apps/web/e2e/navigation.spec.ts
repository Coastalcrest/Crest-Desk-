import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('login page is accessible', async ({ page }) => {
    const response = await page.goto('/login');
    expect(response?.status()).toBeLessThan(500);
  });

  test('home page redirects or renders', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(500);
  });

  test('404 page handles unknown routes', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist');
    // Should either show 404 page or redirect
    expect(response?.status()).toBeLessThanOrEqual(404);
  });
});
