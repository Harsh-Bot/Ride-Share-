import { test, expect } from '@playwright/test';

const shouldSkip = !process.env.PLAYWRIGHT_BASE_URL;

test.describe('Home screen (web)', () => {
  test.skip(shouldSkip, 'Requires Expo web server. Set PLAYWRIGHT_BASE_URL to enable.');

  test('renders greeting header', async ({ page }) => {
    await page.goto('/');
    const heading = await page.getByText('Hey');
    await expect(heading).toBeVisible();
  });
});
