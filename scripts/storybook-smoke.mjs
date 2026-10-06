import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

const project = fileURLToPath(new URL('../', import.meta.url));
const root = path.join(project, 'storybook-static');
const index = JSON.parse(await readFile(path.join(root, 'index.json'), 'utf8'));
const stories = Object.values(index.entries).filter((entry) => entry.type === 'story');
assert.ok(stories.length >= 29, 'Missing component stories');
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const file = path.resolve(
      root,
      '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname),
    );
    assert.ok(file.startsWith(root + path.sep));
    const bytes = await readFile(file);
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream' });
    response.end(bytes);
  } catch {
    response.writeHead(404).end('Not found');
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
let browser;
let page;
const captures = path.join(project, '.cache/storybook-review');
await mkdir(captures, { recursive: true });
const errors = [];
let context;
// Each story gets its own browser process and storage fixture.
// Reusing compositor/WebGL resources across pages can crash Windows headless Chromium.
async function resetBrowser() {
  await context?.close();
  await browser?.close();
  browser = await chromium.launch({
    headless: true,
    // Software compositing plus SwiftShader keeps WebGL enabled without the host GPU driver.
    args: ['--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  context = await browser.newContext({ viewport: { width: 1200, height: 900 }, reducedMotion: 'reduce' });
  await context.addInitScript(() => {
    // A story must not read/write the real application database or its preferences.
    localStorage.setItem('watt-wallet-theme', 'dark');
    localStorage.setItem('watt-wallet-accent', '#3459a1');
    localStorage.setItem('watt-wallet-language', 'en');
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('watt-wallet-')) throw Error('Story wrote application preferences');
      return write.call(this, key, value);
    };
    const open = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function (name, ...args) {
      if (name === 'watt-wallet') throw Error('Story opened application storage');
      return open.call(this, name, ...args);
    };
  });
  page = await context.newPage();
  observePage();
}
function observePage() {
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && /WebGL|CONTEXT_LOST|GPU/.test(message.text()))
      console.error('GPU diagnostic:', message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(response.status() + ' ' + response.url());
  });
}
try {
  await resetBrowser();
  async function openStory(id, globals = 'theme:light;language:fr') {
    await resetBrowser();
    await page.goto(
      serverUrl + '/iframe.html?id=' + id + '&viewMode=story&globals=' + encodeURIComponent(globals),
    );
    await page
      .waitForFunction(() => window.__STORYBOOK_ADDONS_CHANNEL__?.last('storyFinished')?.[0], null, {
        timeout: 30000,
      })
      .catch(async (error) => {
        console.log(
          'Render diagnostic',
          await page.evaluate(() => ({
            preview: !!window.__STORYBOOK_PREVIEW__,
            renders: window.__STORYBOOK_PREVIEW__?.storyRenders?.map((r) => ({ id: r.id, phase: r.phase })),
            body: document.body.innerText.slice(0, 2500),
          })),
          errors,
        );
        throw error;
      });
    const status = await page.evaluate(() => window.__STORYBOOK_ADDONS_CHANNEL__.last('storyFinished')[0]);
    assert.equal(status.status, 'success', JSON.stringify(status));
    const render = await page.evaluate(() =>
      window.__STORYBOOK_PREVIEW__.storyRenders.map((r) => ({ id: r.id, phase: r.phase })),
    );
    assert.ok(
      render.some((r) => r.id === id && ['completed', 'afterEach', 'finished'].includes(r.phase)),
      JSON.stringify(render),
    );
    await expect(page.locator('#storybook-root .ww-story')).toBeVisible();
    await expect(page.locator('.sb-errordisplay')).not.toBeVisible();
  }
  const serverUrl = 'http://127.0.0.1:' + server.address().port;
  for (const story of stories) {
    console.log('Render ' + story.id);
    await openStory(story.id);
    const references = await page.evaluate(
      (id) =>
        window.__STORYBOOK_PREVIEW__.storyRenders.find((render) => render.id === id).storyContext().parameters
          .design,
      story.id,
    );
    assert.equal(references.length, 1, story.id + ' must have one named reference');
    const design = references[0];
    assert.equal(design?.type, 'figma', story.id + ' must have a Figma reference');
    const designUrl = new URL(design.url);
    assert.equal(designUrl.origin, 'https://www.figma.com');
    assert.equal(designUrl.pathname, '/design/PhlVkNsx0CCQVXAhQIHXss/watt-wallet');
    assert.match(designUrl.searchParams.get('node-id') ?? '', /^\d+-\d+$/, story.id);
    assert.ok(design.name, story.id + ' must name its reference');
    if (story.id === 'features-device-editor--json-invalid')
      await expect(page.locator('.json-validation')).toHaveClass(/invalid/);
    if (story.title === 'Features/Diorama') {
      await expect(page.locator('.object-label')).toHaveCount(story.name === 'Empty' ? 0 : 6, {
        timeout: 20000,
      });
      await expect(page.locator('.webgl-fallback')).not.toBeVisible();
    }
    if (story.id === 'features-diorama--consumption') {
      await expect(page.locator('.object-label')).toHaveCount(6, { timeout: 20000 });
      await expect(page.locator('canvas')).toBeVisible();
      await page.getByRole('button', { name: 'Ranger en grille', exact: true }).click();
      await expect(page.locator('.scene-grid-message')).not.toBeVisible();
    }
    assert.deepEqual(errors, [], story.id);
  }
  for (const entry of Object.values(index.entries).filter((entry) => entry.type === 'docs')) {
    await resetBrowser();
    await page.goto(serverUrl + '/iframe.html?id=' + entry.id + '&viewMode=docs');
    await expect(page.locator('.sbdocs-wrapper')).toBeVisible();
    await page.waitForFunction(
      () =>
        window.__STORYBOOK_PREVIEW__?.storyRenders?.length > 0 &&
        window.__STORYBOOK_PREVIEW__.storyRenders.every((r) => r.phase === 'finished'),
      null,
      { timeout: 30000 },
    );
    await expect(page.locator('.ww-story').first()).toBeVisible();
    await expect(page.locator('.sb-errordisplay')).not.toBeVisible();
  }
  await resetBrowser();
  await openStory('components-button--secondary', 'theme:dark;language:en;accent:!hex(7050a1)');
  await expect(page.getByRole('button', { name: 'Adjust my tariff', exact: true })).toBeVisible();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
  assert.equal(await page.evaluate(() => document.documentElement.dataset.accent), '#7050a1');
  await page.screenshot({ path: path.join(captures, 'button-dark-en.png') });
  await openStory('design-system--colors', 'theme:dark;language:fr;accent:!hex(7050a1)');
  await page.screenshot({ path: path.join(captures, 'palette-dark.png') });
  await openStory('features-device-editor--json-valid');
  await page.setViewportSize({ width: 402, height: 874 });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
    'Mobile JSON overflow',
  );
  await page.screenshot({ path: path.join(captures, 'editor-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1512, height: 982 });
  await resetBrowser();
  await openStory('features-diorama--consumption', 'theme:dark;language:en');
  await page.setViewportSize({ width: 1512, height: 982 });
  await expect(page.locator('.object-label')).toHaveCount(6, { timeout: 20000 });
  await page.screenshot({ path: path.join(captures, 'diorama-dark-en.png') });
  assert.deepEqual(
    await page.evaluate(() =>
      Object.fromEntries(
        ['theme', 'accent', 'language'].map((key) => [key, localStorage.getItem('watt-wallet-' + key)]),
      ),
    ),
    { theme: 'dark', accent: '#3459a1', language: 'en' },
  );
  assert.deepEqual(errors, []);
  await resetBrowser();
  // Exercise the real addon without depending on Figma access or network in CI.
  await page.route(/^https:\/\/(?:embed\.|www\.)?figma\.com\//, (route) =>
    route.fulfill({ contentType: 'text/html', body: '<p>Figma embed test fixture</p>' }),
  );
  await page.goto(serverUrl + '/?path=/story/components-button--secondary');
  const preview = page.frameLocator('#storybook-preview-iframe');
  await expect(preview.getByRole('button', { name: 'Ajuster mon tarif', exact: true })).toBeVisible({
    timeout: 30000,
  });
  await page.getByRole('button', { name: 'Application theme Light', exact: true }).click();
  await page.getByText('Dark', { exact: true }).click();
  await expect(preview.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Application accent palette Forêt', exact: true }).click();
  await page.getByText('Lavande', { exact: true }).click();
  await expect(preview.locator('html')).toHaveAttribute('data-accent', '#7050a1');
  await page.getByRole('button', { name: 'Application language Français', exact: true }).click();
  await page.getByText('English', { exact: true }).click();
  await expect(preview.getByRole('button', { name: 'Adjust my tariff', exact: true })).toBeVisible();
  const label = page.getByRole('row').filter({ hasText: 'label' }).getByRole('textbox');
  await label.fill('A custom action');
  await label.blur();
  await expect(preview.getByRole('button', { name: 'A custom action', exact: true })).toBeVisible();
  await page.screenshot({ path: path.join(captures, 'manager-controls.png') });
  await page.getByRole('tab', { name: 'Design (1)', exact: true }).click();
  const figmaEmbed = page.locator('iframe[src^="https://embed.figma.com/"]');
  await expect(figmaEmbed).toBeVisible();
  const embedUrl = new URL(await figmaEmbed.getAttribute('src'));
  assert.equal(embedUrl.searchParams.get('node-id'), '122-31008');
  assert.ok(embedUrl.searchParams.get('embed-host'));
  await page.screenshot({ path: path.join(captures, 'manager-designs.png') });
  assert.deepEqual(errors, []);
  console.log(
    'Storybook: ' +
      stories.length +
      ' stories, play functions, autodocs, themes, language, palette, WebGL, mobile, isolated storage and Figma design references passed.',
  );
  await context.close();
} catch (error) {
  console.error(error);
  if (page && !page.isClosed()) {
    console.log(
      'Failed page',
      await page.evaluate(() => ({
        body: document.body.innerText.slice(0, 3000),
        renders: window.__STORYBOOK_PREVIEW__?.storyRenders?.map((r) => ({
          id: r.id,
          phase: r.phase,
          args: r.storyContext().args,
        })),
      })),
    );
    await page.screenshot({ path: path.join(captures, 'failure.png') });
  }
  throw error;
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
