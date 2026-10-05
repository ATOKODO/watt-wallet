import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './visual',
  globalTeardown: './visual/teardown.ts',
  testMatch: '**/*.visual.spec.ts',
  timeout: 90000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  // Missing or changed references must fail; updating them is an explicit command.
  updateSnapshots: 'none',
  snapshotPathTemplate: '{testDir}/baselines/{platform}/{projectName}/{testFilePath}/{arg}{ext}',
  outputDir: 'test-results/visual',
  expect: {
    timeout: 20000,
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      threshold: 0.15,
      maxDiffPixels: 100,
    },
  },
  use: {
    headless: true,
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    timezoneId: 'Europe/Paris',
    serviceWorkers: 'block',
  },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/visual', open: 'never' }]],
  projects: [
    ...[
      { name: 'app-iphone', viewport: { width: 402, height: 874 } },
      { name: 'app-ipad', viewport: { width: 834, height: 1194 } },
      { name: 'app-macbook', viewport: { width: 1512, height: 982 } },
      { name: 'app-desktop', viewport: { width: 1920, height: 1080 } },
    ].map((project) => ({
      name: project.name,
      testMatch: 'app.visual.spec.ts',
      use: { viewport: project.viewport },
    })),
    {
      name: 'storybook',
      testMatch: 'storybook.visual.spec.ts',
      use: { viewport: { width: 1200, height: 900 } },
    },
  ],
  webServer: [
    {
      command: 'node scripts/visual-server.mjs dist/watt-wallet/browser 4310',
      url: 'http://127.0.0.1:4310',
      reuseExistingServer: false,
      timeout: 180000,
    },
    {
      command: 'node scripts/visual-server.mjs storybook-static 4311',
      url: 'http://127.0.0.1:4311',
      reuseExistingServer: false,
      timeout: 180000,
    },
  ],
});
