import {
  test,
  expect,
  openHome,
  capture,
  sceneReady,
  translate,
  type Language,
  type Theme,
} from './fixtures';

for (const language of ['fr', 'en'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    test('responsive ' + language + ' ' + theme, async ({ visualPage: page }) => {
      const t = (source: string) => translate(language, source);
      await openHome(page, language, theme);
      await sceneReady(page, 6);
      const sceneBounds = await page.locator('ww-diorama').boundingBox();
      const stageBounds = await page.locator('.stage').boundingBox();
      const navigationBounds = await page.locator('.scene-navigation').boundingBox();
      expect(sceneBounds).not.toBeNull();
      expect(stageBounds).not.toBeNull();
      expect(navigationBounds).not.toBeNull();
      expect(sceneBounds!.height).toBeLessThanOrEqual(stageBounds!.height + 0.5);
      expect(navigationBounds!.y + navigationBounds!.height).toBeLessThanOrEqual(
        stageBounds!.y + stageBounds!.height,
      );
      await capture(page, 'home-' + language + '-' + theme + '.png');
      await capture(page, 'diorama-' + language + '-' + theme + '.png', page.locator('.diorama-card'));
      await page.getByRole('button', { name: t('Bibliothèque'), exact: true }).click();
      await page.getByRole('button', { name: t('Nouvelle fiche'), exact: true }).click();
      const dialog = page.getByRole('dialog');
      await dialog
        .getByLabel(t('Nom de l’appareil'))
        .fill(language === 'fr' ? 'Lampe de bureau' : 'Desk lamp');
      await dialog.getByRole('tab', { name: 'JSON', exact: true }).click();
      await expect(dialog.locator('.json-validation')).toHaveClass(/valid/);
      await capture(page, 'json-' + language + '-' + theme + '.png');
    });
  }
}

for (const [language, theme] of [
  ['fr', 'light'],
  ['en', 'dark'],
] as [Language, Theme][]) {
  test('features ' + language + ' ' + theme, async ({ visualPage: page }, info) => {
    test.skip(
      !['app-iphone', 'app-desktop'].includes(info.project.name),
      'Feature details on mobile and desktop',
    );
    const t = (source: string, values: string[] = []) => translate(language, source, values);
    const prefix = language + '-' + theme;
    await openHome(page, language, theme);
    await sceneReady(page, 6);
    await page.getByRole('button', { name: t('Mes scénarios'), exact: true }).click();
    await page
      .getByRole('button', {
        name: language === 'fr' ? 'Chauffage plus sobre' : 'Lower heating use',
        exact: true,
      })
      .click();
    await page.locator('.category-comparison summary').click();
    await expect(page.locator('.comparison-grid')).toBeVisible();
    await capture(page, 'scenario-' + prefix + '.png', page.locator('.scenario-section'));
    await page.getByRole('button', { name: t('Référence'), exact: true }).click();
    await page.getByRole('button', { name: t('Mon logement'), exact: true }).click();
    await page
      .locator('.device-row')
      .filter({ hasText: t('Radiateur électrique') })
      .getByRole('button', { name: t('Modifier {0}', [t('Radiateur électrique')]), exact: true })
      .click();
    await capture(page, 'inspector-' + prefix + '.png', page.locator('.inspector'));
    await page.getByRole('button', { name: t('Fermer les paramètres de l’appareil'), exact: true }).click();
    await page.getByRole('button', { name: t('Tout en marche'), exact: true }).click();
    await page
      .getByRole('group', { name: t('État simulé de {0}', [t('Radiateur électrique')]), exact: true })
      .getByRole('button', { name: t('Arrêt'), exact: true })
      .click();
    await capture(page, 'power-' + prefix + '.png', page.locator('.power-simulator'));
    await page.getByRole('button', { name: t('Ajuster mon tarif'), exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(t('Option tarifaire')).selectOption('hp-hc');
    await capture(page, 'tariff-' + prefix + '.png');
    await dialog.getByRole('button', { name: t('Fermer la fenêtre'), exact: true }).click();
    await page.getByRole('button', { name: t('Choisir la couleur du thème'), exact: true }).click();
    await capture(page, 'palette-' + prefix + '.png');
    await dialog.getByRole('button', { name: t('Fermer la fenêtre'), exact: true }).click();
    await page.getByRole('button', { name: t('Bibliothèque'), exact: true }).click();
    await capture(page, 'library-' + prefix + '.png', page.locator('.catalog-grid'));
  });
}

test('empty home', async ({ visualPage: page }, info) => {
  test.skip(info.project.name !== 'app-desktop', 'Empty state on desktop');
  await openHome(page, 'fr', 'light', true);
  await sceneReady(page, 0);
  await expect(page.locator('.empty-stage')).toBeVisible();
  await capture(page, 'empty-board.png', page.locator('.diorama-card'));
});

test('without WebGL', async ({ visualPage: page }, info) => {
  test.skip(info.project.name !== 'app-iphone', 'Accessible fallback on mobile');
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: any[]
    ) {
      if (String(type).startsWith('webgl')) return null;
      return original.apply(this, [type, ...args] as any);
    } as typeof original;
  });
  await openHome(page, 'fr', 'light');
  await expect(page.locator('.webgl-fallback')).toBeVisible();
  await capture(page, 'webgl-fallback.png', page.locator('.diorama-card'));
  await capture(page, 'fallback-device-list.png', page.locator('.device-list'));
});

test('library follows the summary on narrow screens', async ({ visualPage: page }, info) => {
  test.skip(info.project.name !== 'app-iphone', 'Responsive relocation across breakpoints');
  await page.setViewportSize({ width: 685, height: 892 });
  await openHome(page, 'en', 'light');
  const library = page.locator('.library-panel');
  const search = library.getByRole('textbox', { name: 'Search for a device' });
  const assertMobileOrder = async () => {
    await expect(library).toHaveCount(1);
    await expect(page.locator('.main-content > .library-panel + .diorama-card')).toHaveCount(1);
    const bounds = await library.boundingBox();
    const scene = await page.locator('.diorama-card').boundingBox();
    const summary = await page.locator('.power-preview').boundingBox();
    expect(bounds).not.toBeNull();
    expect(scene).not.toBeNull();
    expect(summary).not.toBeNull();
    expect(bounds!.y).toBeGreaterThanOrEqual(summary!.y + summary!.height);
    expect(scene!.y - bounds!.y - bounds!.height).toBeCloseTo(17, 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  };
  await assertMobileOrder();
  await capture(page, 'mobile-library-en-light.png', library);
  await search.fill('Television');
  await expect(library.locator('.library-item')).toHaveCount(1);
  for (const width of [834, 1512, 1920]) {
    await page.setViewportSize({ width, height: 1080 });
    await expect(page.locator('.workspace > .library-panel')).toHaveCount(1);
    await expect(library).toHaveCount(1);
    await expect(search).toHaveValue('Television');
  }
  for (const width of [760, 402]) {
    await page.setViewportSize({ width, height: 874 });
    await assertMobileOrder();
    await expect(search).toHaveValue('Television');
  }
  await page.getByRole('button', { name: 'My scenarios', exact: true }).click();
  await assertMobileOrder();
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await expect(page.locator('.main-panel > .library-panel + .catalog-heading')).toHaveCount(1);
  await library.getByRole('button', { name: 'Add Television', exact: true }).click();
  await expect(page.locator('.device-row')).toHaveCount(7);
  await assertMobileOrder();
});
