import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './playwright',
  reporter: [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:19006'
  }
});
