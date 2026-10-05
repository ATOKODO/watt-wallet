import { test, expect, capture, storybookUrl } from './fixtures';

const stories = [
  'design-system--introduction',
  'design-system--colors',
  'design-system--typography',
  'design-system--spacing',
  'components-button--primary',
  'components-button--secondary',
  'components-button--small',
  'components-button--disabled',
  'components-button--text-only',
  'components-icon--single',
  'components-icon--fallback',
  'components-icon--catalogue',
  'components-metric--annual-energy',
  'components-metric--annual-budget',
  'components-metric--monthly-average',
  'components-metric--zero-consumption',
  'components-metric--large-value',
  'features-device-editor--power-profile',
  'features-device-editor--cycle-profile',
  'features-device-editor--annual-profile',
  'features-device-editor--installed-device',
  'features-device-editor--json-valid',
  'features-device-editor--json-invalid',
  'features-device-editor--saving',
  'features-diorama--consumption',
  'features-diorama--placement',
  'features-diorama--empty',
  'features-diorama--zero-consumption',
  'features-diorama--selected',
];

for (const mode of [
  { theme: 'light', language: 'fr', accent: '#315b43' },
  { theme: 'dark', language: 'en', accent: '#7050a1' },
]) {
  for (const id of stories) {
    test(id + ' ' + mode.theme, async ({ visualPage: page }) => {
      const globals =
        'theme:' + mode.theme + ';language:' + mode.language + ';accent:!hex(' + mode.accent.slice(1) + ')';
      await page.goto(
        storybookUrl + '/iframe.html?id=' + id + '&viewMode=story&globals=' + encodeURIComponent(globals),
      );
      await page.waitForFunction(
        () => (window as any).__STORYBOOK_ADDONS_CHANNEL__?.last('storyFinished')?.[0],
      );
      const status = await page.evaluate(
        () => (window as any).__STORYBOOK_ADDONS_CHANNEL__.last('storyFinished')[0],
      );
      expect(status.status, JSON.stringify(status)).toBe('success');
      await expect(page.locator('html')).toHaveAttribute('data-theme', mode.theme);
      await expect(page.locator('.sb-errordisplay')).toBeHidden();
      await expect(page.locator('#storybook-root .ww-story')).toBeVisible();
      if (id.startsWith('features-diorama')) {
        await expect(page.locator('.webgl-fallback')).toHaveCount(0);
        await expect(page.locator('canvas')).toBeVisible();
        await expect(page.locator('.object-label')).toHaveCount(id.endsWith('--empty') ? 0 : 6);
      }
      await capture(
        page,
        id + '-' + mode.theme + '-' + mode.language + '.png',
        page.locator('#storybook-root .ww-story'),
        id.startsWith('components-icon--') ? { maxDiffPixels: 0 } : {},
      );
    });
  }
}

test('story inventory', async ({ request }) => {
  const response = await request.get(storybookUrl + '/index.json');
  expect(response.ok()).toBe(true);
  const index = await response.json();
  const actual = Object.values(index.entries)
    .filter((entry: any) => entry.type === 'story')
    .map((entry: any) => entry.id);
  // Adding a story requires deliberately extending the visual coverage.
  expect(actual.sort()).toEqual([...stories].sort());
});
