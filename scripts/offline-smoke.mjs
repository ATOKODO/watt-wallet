import { chromium, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('dist/watt-wallet/browser');
const manifest = JSON.parse(await readFile(path.join(root, 'ngsw.json'), 'utf8'));
const prefetchUrls = [
  ...new Set(
    manifest.assetGroups.filter((group) => group.installMode === 'prefetch').flatMap((group) => group.urls),
  ),
];
expect(prefetchUrls).toContain('/index.html');
for (const file of ['LICENSE.txt', '3rdpartylicenses.txt']) expect(prefetchUrls).toContain('/' + file);
expect(await readFile(path.join(root, 'LICENSE.txt'))).toEqual(await readFile('LICENSE'));
expect(await readFile(path.join(root, '3rdpartylicenses.txt'))).toEqual(
  await readFile(path.join(root, '../3rdpartylicenses.txt')),
);
const prefetchResources = prefetchUrls.map((url) => {
  expect(manifest.hashTable[url], 'Missing service worker hash for ' + url).toMatch(/^[a-f0-9]{40}$/);
  return [url, manifest.hashTable[url]];
});
const slowPrefetch = process.argv.includes('--slow-prefetch');
const gatedUrl = '/manifest.webmanifest';
let releasePrefetch;
const prefetchGate = new Promise((resolve) => (releasePrefetch = resolve));
let checkedIncompleteCache = false;
if (slowPrefetch) expect(prefetchUrls).toContain(gatedUrl);

async function missingPrefetchResources(page) {
  return page.evaluate(async (resources) => {
    // A fresh browser context has no previous app version. Check the bytes as well
    // as the URL so a metadata entry cannot be mistaken for a cached asset.
    const stores = await Promise.all((await caches.keys()).map((name) => caches.open(name)));
    const missing = [];
    for (const [url, expectedHash] of resources) {
      let found = false;
      for (const store of stores) {
        const response = await store.match(new URL(url, location.origin).href);
        if (!response?.ok) continue;
        const digest = await crypto.subtle.digest('SHA-1', await response.arrayBuffer());
        const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(
          '',
        );
        if (hash === expectedHash) {
          found = true;
          break;
        }
      }
      if (!found) missing.push(url);
    }
    return missing;
  }, prefetchResources);
}
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    const target = path.resolve(
      root,
      '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname),
    );
    if (!target.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    if (slowPrefetch && url.pathname === gatedUrl) await prefetchGate;
    const bytes = await readFile(target);
    res.writeHead(200, {
      'Content-Type': types[path.extname(target)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(bytes);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(4301, '127.0.0.1', r));
const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const requests = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('CONSOLE', msg.text());
  });
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  page.on('requestfailed', (r) => console.log('FAILED', r.url(), r.failure()?.errorText));
  page.on('request', (r) => {
    if (
      !r.url().startsWith('http://127.0.0.1:4301') &&
      !r.url().startsWith('blob:') &&
      !r.url().startsWith('data:')
    )
      requests.push(r.url());
  });
  await page.goto('http://127.0.0.1:4301');
  await expect(page.locator('.object-label')).toHaveCount(6);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null), { timeout: 30000 })
    .toBe(true);
  await page.getByRole('button', { name: 'Ajouter Box Internet', exact: true }).click();
  await expect(page.locator('.device-row').filter({ hasText: 'Box Internet' })).toHaveCount(1);
  await expect(page.locator('.inspector h2')).toHaveText('Box Internet');
  await expect(page.locator('.workspace-footer')).toContainText('Enregistré sur cet appareil');
  await page.getByRole('button', { name: 'Choisir la langue', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Done', exact: true }).click();
  // An activated/controlling worker can still be fetching its prefetch group.
  // Read Cache Storage directly: fetching resources here would hide an incomplete cache.
  await expect
    .poll(
      async () => {
        const missing = await missingPrefetchResources(page);
        if (slowPrefetch && !checkedIncompleteCache) {
          expect(missing).toContain(gatedUrl);
          checkedIncompleteCache = true;
          releasePrefetch();
        }
        return missing;
      },
      { timeout: 30000, message: 'Every prefetched resource must be fully cached before disconnecting.' },
    )
    .toEqual([]);
  console.log('Service worker: all ' + prefetchResources.length + ' prefetched resources verified in cache.');
  await context.setOffline(true);
  await page.reload();
  try {
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('.device-row').filter({ hasText: 'Internet router' })).toHaveCount(1);
  } catch (e) {
    console.log('OFFLINE HTML', await page.locator('body').innerText());
    console.log(
      'WORKER',
      await page.evaluate(() =>
        fetch('/ngsw/state')
          .then((r) => r.text())
          .catch(String),
      ),
    );
    await page.screenshot({ path: 'test-results/offline-failed.png' });
    throw e;
  }
  await expect(page.locator('.object-label')).toHaveCount(7);
  const fontStatus = await page.evaluate(async () => {
    await document.fonts.ready;
    const faces = [
      ['Inter', 400],
      ['Inter', 500],
      ['Inter', 600],
      ['Inter', 700],
      ['Lora', 400],
      ['Roboto Mono', 400],
      ['Roboto Mono', 600],
    ];
    const loaded = await Promise.all(
      faces.map(async ([family, weight]) => {
        const fonts = await document.fonts.load(weight + ' 14px "' + family + '"', 'Électricité œ Ā');
        return {
          family,
          weight,
          loaded: fonts.length > 0 && fonts.every((font) => font.status === 'loaded'),
        };
      }),
    );
    return {
      loaded,
      ui: getComputedStyle(document.body).fontFamily,
      heading: getComputedStyle(document.querySelector('h1')).fontFamily,
    };
  });
  expect(
    fontStatus.loaded.every((font) => font.loaded),
    JSON.stringify(fontStatus),
  ).toBe(true);
  expect(fontStatus.ui).toContain('Inter');
  expect(fontStatus.heading).toContain('Lora');
  // Open notices for the first time while offline, without leaving the workspace.
  await page.setViewportSize({ width: 402, height: 874 });
  await page.getByRole('button', { name: 'Licenses', exact: true }).click();
  const licenses = page.getByRole('dialog');
  await expect(licenses.getByRole('heading', { name: 'Licenses', exact: true })).toBeVisible();
  await expect(licenses.locator('.license-notice')).toHaveCount(5);
  expect(await licenses.locator('pre').first().textContent()).toBe(await readFile('LICENSE', 'utf8'));
  await licenses.getByText('Third-party libraries', { exact: true }).click();
  expect(await licenses.locator('pre').nth(1).textContent()).toBe(
    await readFile(path.join(root, '../3rdpartylicenses.txt'), 'utf8'),
  );
  await licenses.getByText('Inter — SIL Open Font License', { exact: true }).click();
  await expect(licenses.locator('pre').nth(2)).toContainText('SIL OPEN FONT LICENSE');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(402);
  await page.screenshot({ path: 'test-results/licenses-mobile-light.png' });
  await page.keyboard.press('Escape');
  await expect(licenses).not.toBeVisible();
  await page.getByRole('button', { name: 'Enable dark mode', exact: true }).click();
  await page.getByRole('button', { name: 'Choose language', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Français', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Terminer', exact: true }).click();
  await page.getByRole('button', { name: 'Licences', exact: true }).click();
  await expect(licenses.getByRole('heading', { name: 'Licences', exact: true })).toBeVisible();
  await expect(licenses.getByText('Bibliothèques tierces', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/licenses-mobile-dark.png' });
  await page.keyboard.press('Escape');
  await expect(page.locator('.device-row').filter({ hasText: 'Box Internet' })).toHaveCount(1);
  await expect(page.locator('.webgl-fallback')).not.toBeVisible();
  expect(requests).toEqual([]);
  console.log(
    'SPA production : cache complet, rechargement hors connexion, langue anglaise persistante, données, polices, licences FR/EN et absence de requêtes externes OK.',
  );
} finally {
  releasePrefetch();
  await browser.close();
  await new Promise((r) => server.close(r));
}
