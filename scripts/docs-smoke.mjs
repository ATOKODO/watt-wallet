import { readFile, readdir, stat, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

const project = fileURLToPath(new URL('../', import.meta.url));
const root = path.join(project, 'docs/.vitepress/dist');
const basePart = (process.env.DOCS_BASE_PATH ?? '').replace(/^\/+|\/+$/g, '');
const base = basePart ? '/' + basePart + '/' : '/';
const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(file);
    else files.push(file);
  }
}
await walk(root);
const html = new Map(
  await Promise.all(
    files.filter((f) => f.endsWith('.html')).map(async (file) => [file, await readFile(file, 'utf8')]),
  ),
);
let checked = 0;
async function resolvePage(url) {
  const pathname = decodeURIComponent(url.pathname);
  assert.ok(pathname.startsWith(base), 'Link escapes the site base: ' + pathname);
  const file = path.resolve(root, '.' + '/' + pathname.slice(base.length));
  assert.ok(file.startsWith(root + path.sep) || file === root, 'Link escapes output folder');
  const info = await stat(file).catch(() => null);
  if (info?.isDirectory()) return path.join(file, 'index.html');
  if (info?.isFile()) return file;
  // The generated navigation uses .html; reject URLs that depend on a server rewrite.
  throw new Error('Missing generated target: ' + pathname);
}
for (const [file, source] of html) {
  const current = new URL(base + path.relative(root, file).split(path.sep).join('/'), 'http://docs.local');
  for (const tag of source.matchAll(/<(?:a|link|script|img|source)\b[^>]*>/g)) {
    for (const attribute of tag[0].matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      const href = attribute[1].replaceAll('&amp;', '&');
      if (!href || /^(?:https?:|data:|mailto:|tel:)/.test(href)) continue;
      const url = new URL(href, current);
      const target = await resolvePage(url);
      assert.ok(files.includes(target), 'Missing output file: ' + href + ' in ' + file);
      if (url.hash && html.has(target)) {
        const anchor = decodeURIComponent(url.hash.slice(1));
        assert.ok(
          [...html.get(target).matchAll(/id="([^"]+)"/g)].some(
            (match) => decodeURIComponent(match[1]) === anchor,
          ),
          'Missing anchor: ' + href + ' in ' + file,
        );
      }
      checked++;
    }
  }
}
console.log(
  `Static docs: ${html.size} HTML pages and ${checked} local links/assets/anchors verified at ${base}`,
);
if (process.argv.includes('--static')) process.exit(0);

const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.wattpack': 'application/zip',
  '.glb': 'model/gltf-binary',
};
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const file = await resolvePage(url);
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream' });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404).end('Not found');
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1512, height: 982 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('response', (response) => {
  if (response.status() >= 400) errors.push(response.status() + ' ' + response.url());
});
const screenshotDir = path.join(project, '.cache/docs-review');
await mkdir(screenshotDir, { recursive: true });
try {
  await page.goto(origin + base, { waitUntil: 'networkidle' });
  await expect(page.locator('.VPHomeHero')).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDir, 'landing.png'), animations: 'disabled' });
  for (const lang of ['fr', 'en']) {
    await page.goto(origin + base + lang + '/', { waitUntil: 'networkidle' });
    await expect(page.locator('h1')).toHaveText(
      lang === 'fr' ? 'Bienvenue dans Watt Wallet' : 'Welcome to Watt Wallet',
    );
    await expect(page.locator('.VPSidebar')).toBeVisible();
    await page.screenshot({
      animations: 'disabled',
      path: path.join(screenshotDir, 'introduction-' + lang + '.png'),
    });
    await page
      .locator('.VPSidebar')
      .getByRole('link', {
        name: lang === 'fr' ? 'Scénarios et économies' : 'Scenarios and savings',
        exact: true,
      })
      .click();
    const anchor = lang === 'fr' ? 'comparer-un-scénario' : 'compare-a-scenario';
    await expect(page.locator('[id="' + anchor + '"]')).toBeInViewport();
    await page.locator('.VPNavBarSearch button').click();
    const search = page.locator('.VPLocalSearchBox input');
    await search.fill(lang === 'fr' ? 'veille' : 'standby');
    await expect(page.locator('.VPLocalSearchBox .results a').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await page
      .locator('.VPSidebar')
      .getByRole('link', {
        name: lang === 'fr' ? 'Exemples et captures' : 'Examples and screenshots',
        exact: true,
      })
      .click();
    const downloadPromise = page.waitForEvent('download');
    await page.locator('.vp-doc a[href$="/examples/logement.wattpack"]').click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), 'logement.wattpack');
    assert.deepEqual(
      await readFile(await download.path()),
      await readFile(path.join(project, 'examples/logement.wattpack')),
    );
    await page.locator('.vp-doc a[href$="/screenshots/desktop/' + lang + '/index.html"]').click();
    await expect(page.locator('h1')).toContainText('1920 × 1080 px · ' + lang.toUpperCase());
    await expect
      .poll(() =>
        page
          .locator('img')
          .first()
          .evaluate((image) => image.complete && image.naturalWidth === 1920),
      )
      .toBe(true);
    await page.goBack({ waitUntil: 'networkidle' });
    await expect(page.locator('h1')).toHaveText(
      lang === 'fr' ? 'Exemples et captures' : 'Examples and screenshots',
    );
    await page.locator('.VPSwitchAppearance').click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.screenshot({
      animations: 'disabled',
      path: path.join(screenshotDir, 'examples-dark-' + lang + '.png'),
    });
    await page.locator('.VPSwitchAppearance').click();
  }
  await page.goto(origin + base + 'fr/user-guide.html');
  await page.getByRole('button', { name: 'Choisir la langue', exact: true }).click();
  await page.locator('.VPNavBarTranslations').getByRole('link', { name: 'English', exact: true }).click();
  await expect(page.locator('h1')).toHaveText('User guide');
  await page.setViewportSize({ width: 402, height: 874 });
  await page.goto(origin + base + 'fr/');
  await page.locator('.VPLocalNav').getByRole('button', { name: 'Menu', exact: true }).click();
  await expect(page.locator('.VPSidebar')).toBeVisible();
  await page.screenshot({ animations: 'disabled', path: path.join(screenshotDir, 'sidebar-mobile-fr.png') });
  await page.locator('.VPSidebar').getByRole('link', { name: 'Fiches et JSON', exact: true }).click();
  await expect(page.locator('[id="créer-une-fiche-réutilisable"]')).toBeInViewport();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ animations: 'disabled', path: path.join(screenshotDir, 'guide-mobile-fr.png') });
  assert.deepEqual(errors, []);
  console.log(
    'Browser docs: FR/EN sidebar, anchors, search, language switch, dark mode, downloads, galleries and mobile navigation passed.',
  );
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
