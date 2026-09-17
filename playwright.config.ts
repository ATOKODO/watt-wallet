import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4200',
    viewport: { width: 1480, height: 1000 },
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  webServer: {
    command: 'npm start',
    url: 'http://127.0.0.1:4200',
    reuseExistingServer: true,
    timeout: 120000,
  },
  reporter: 'list',
});
