import { test as base, expect, type Page, type Locator } from '@playwright/test';
import { seedWorkspace } from '../src/app/domain/seed';
import { readFileSync } from 'node:fs';
const english: Record<string, string> = JSON.parse(
  readFileSync(new URL('../src/app/ui/i18n/en.json', import.meta.url), 'utf8'),
);

export { expect };
export type Language = 'fr' | 'en';
export type Theme = 'light' | 'dark';
export const appUrl = 'http://127.0.0.1:4310';
export const storybookUrl = 'http://127.0.0.1:4311';
export const translate = (language: Language, source: string, values: string[] = []) =>
  (language === 'en' ? ((english as Record<string, string>)[source] ?? source) : source).replace(
    /\{(\d+)\}/g,
    (_, index) => values[Number(index)] ?? '',
  );

// A separate browser per test avoids accumulating software WebGL/compositor contexts.
export const test = base.extend<{ visualPage: Page }>({
  visualPage: async ({ playwright }, use, info) => {
    const browser = await playwright.chromium.launch({
      headless: true,
      args: ['--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    });
    const context = await browser.newContext({
      viewport: info.project.use.viewport,
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
      timezoneId: 'Europe/Paris',
      locale: 'fr-FR',
      colorScheme: 'light',
      serviceWorkers: 'block',
    });
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      let nextId = 0;
      Object.defineProperty(crypto, 'randomUUID', {
        value: () => '00000000-0000-4000-8000-' + String(++nextId).padStart(12, '0'),
      });
    });
    try {
      await use(page);
      expect(errors, 'Uncaught browser errors').toEqual([]);
    } finally {
      if (info.status !== info.expectedStatus) {
        await context.tracing.stop({ path: info.outputPath('trace.zip') });
        await info.attach('trace', { path: info.outputPath('trace.zip'), contentType: 'application/zip' });
        await page.screenshot({ path: info.outputPath('failure.png') }).catch(() => {});
      } else await context.tracing.stop();
      await context.close();
      await browser.close();
    }
  },
});

export async function openHome(page: Page, language: Language, theme: Theme, empty = false) {
  const workspace = seedWorkspace();
  const home = workspace.homes[0];
  home.id = 'visual-home';
  workspace.activeHomeId = home.id;
  home.name = language === 'fr' ? 'Mon petit chez-moi' : 'My little home';
  home.devices.forEach((device, index) => {
    device.id = 'visual-device-' + index;
  });
  home.scenarios = [
    {
      id: 'visual-scenario',
      name: language === 'fr' ? 'Chauffage plus sobre' : 'Lower heating use',
      initialCost: 120,
      tariff: structuredClone(home.tariff),
      devices: structuredClone(home.devices),
    },
  ];
  home.scenarios[0].devices[0].usage.hoursPerDay = 4;
  if (empty) {
    home.devices = [];
    home.scenarios = [];
  }
  await page.goto(appUrl + '/__visual_setup__.html');
  await page.evaluate(
    async ({ workspace, language, theme }) => {
      localStorage.setItem('watt-wallet-language', language);
      localStorage.setItem('watt-wallet-theme', theme);
      localStorage.setItem('watt-wallet-accent', theme === 'dark' ? '#7050a1' : '#315b43');
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('watt-wallet', 1);
        request.onupgradeneeded = () => {
          request.result.createObjectStore('workspace');
          request.result.createObjectStore('assets');
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction('workspace', 'readwrite');
        transaction.objectStore('workspace').put(workspace, 'current');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      db.close();
    },
    { workspace, language, theme },
  );
  await page.goto(appUrl);
  await expect(page.locator('.workspace-footer')).toContainText(
    translate(language, 'Enregistré sur cet appareil'),
  );
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('.device-row')).toHaveCount(empty ? 0 : 6);
}

export async function settled(page: Page) {
  await expect(page.locator('.toast')).toBeHidden();
  await page.evaluate(async () => {
    await document.fonts.ready;
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    'Horizontal overflow',
  ).toBe(false);
}

export async function capture(
  page: Page,
  name: string,
  target?: Locator,
  options: { maxDiffPixels?: number } = {},
) {
  if (target) await target.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await settled(page);
  await expect(target ?? page).toHaveScreenshot(name, options);
}

export async function sceneReady(page: Page, count: number) {
  await expect(page.locator('.webgl-fallback')).toHaveCount(0);
  await expect(page.locator('ww-diorama canvas')).toBeVisible();
  await expect(page.locator('.object-label')).toHaveCount(count);
}
