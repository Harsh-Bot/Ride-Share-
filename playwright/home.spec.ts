import { test, expect } from '@playwright/test';

test.describe('Home screen (web)', () => {
  test.skip(!process.env.PLAYWRIGHT_BASE_URL, 'Requires Expo web server.');

  test('renders greeting header', async ({ page }) => {
    await page.goto('/');
    const heading = await page.getByText('Hey');
    await expect(heading).toBeVisible();
  });
});
