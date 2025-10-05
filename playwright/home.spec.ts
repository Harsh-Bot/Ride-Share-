import { test, expect } from '@playwright/test';

test.describe.skip('Home screen (web)', () => {
  test('renders greeting header', async ({ page }) => {
    await page.goto('/');
    const heading = await page.getByText('Hey');
    await expect(heading).toBeVisible();
  });
});
