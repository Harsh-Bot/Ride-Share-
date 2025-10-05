import { test, expect } from '@playwright/test';

const STATUS_SELECTOR = '[data-testid="map-loader-placeholder"], [data-testid="map-loader-ready"], [data-testid="map-loader-error"]';
test.describe.skip('@maps-loader Google Maps bootstrap', () => {
  test('@maps-loader displays placeholder while SDK loads', async ({ page }) => {
    test.setTimeout(120_000);
    page.on('pageerror', (error) => console.error('[web-error]', error.stack ?? error.message));

    await page.goto('/', { waitUntil: 'commit' });
    await page.locator('#root').waitFor({ state: 'attached', timeout: 90_000 });
    await page.waitForFunction(() => document.querySelector('#root')?.children.length, null, {
      timeout: 90_000
    });

    try {
      const statusLocator = page.locator(STATUS_SELECTOR);
      await statusLocator.first().waitFor({ state: 'visible', timeout: 30_000 });
      await expect(statusLocator.first()).toBeVisible();
    } catch (error) {
      await page.screenshot({ path: 'playwright-output.png', fullPage: true });
      console.error('[debug-html]', (await page.content()).slice(0, 2000));
      throw error;
    }
  });
});
