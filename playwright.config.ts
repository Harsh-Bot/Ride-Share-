import { defineConfig } from '@playwright/test';

const webPort = Number.parseInt(process.env.PLAYWRIGHT_WEB_PORT ?? '19006', 10);

export default defineConfig({
  testDir: './playwright',
  reporter: [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${webPort}`
  },
  webServer: {
    command: process.env.PLAYWRIGHT_WEB_COMMAND ?? `CI=1 npx expo start --web --port ${webPort}`,
    url: `http://localhost:${webPort}`,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      EXPO_PUBLIC_TEST_AUTO_AUTH: 'true'
    },
    timeout: 180_000
  }
});
