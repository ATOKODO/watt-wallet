import { chromium, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('dist/watt-wallet/browser');
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
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
  await context.setOffline(true);
  await page.reload();
  try {
    await expect(page.locator('.device-row').filter({ hasText: 'Box Internet' })).toHaveCount(1);
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
  expect(requests).toEqual([]);
  console.log(
    'SPA production : cache complet, rechargement hors connexion, persistance et absence de requêtes externes OK.',
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
