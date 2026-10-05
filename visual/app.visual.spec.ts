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
