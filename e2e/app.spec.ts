import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('ajout, déplacement et orbite autour du plateau', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Créer un logement', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Nom', { exact: true }).fill('Test du plateau');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer', exact: true }).click();
  await page.getByRole('button', { name: 'Placement', exact: true }).click();
  const stage = page.locator('ww-diorama .scene-canvas');
  await page.locator('.library-item').filter({ hasText: 'Réfrigérateur' }).dragTo(stage);
  await expect(page.locator('.device-row')).toHaveCount(1);
  await expect(page.locator('.inspector h2')).toHaveText('Réfrigérateur');
  const xInput = page.locator('.inspector').getByLabel('Position X', { exact: true });
  const before = await xInput.inputValue();
  const label = await page.locator('.object-label').boundingBox();
  if (!label) throw new Error('Étiquette 3D absente.');
  const x = label.x + label.width / 2,
    y = label.y + label.height + 28;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 80, y + 25, { steps: 12 });
  await page.mouse.up();
  await expect(xInput).not.toHaveValue(before);

  const scene = await stage.boundingBox();
  const objectLabel = page.locator('.object-label');
  const labelBeforeOrbit = await objectLabel.evaluateAll(
    (labels) => (labels[0] as HTMLElement)?.style.left ?? '',
  );
  if (!scene || !labelBeforeOrbit) throw new Error('Plateau 3D absent.');
  await page.mouse.move(scene.x + scene.width - 55, scene.y + 65);
  await page.mouse.down();
  await page.mouse.move(scene.x + scene.width - 180, scene.y + 95, { steps: 12 });
  await page.mouse.up();
  await expect
    .poll(async () => objectLabel.evaluateAll((labels) => (labels[0] as HTMLElement)?.style.left ?? ''))
    .not.toBe(labelBeforeOrbit);
  await expect(page.locator('.workspace-footer')).toContainText('Enregistré sur cet appareil');
});

test('logement, fiche, scénario, persistance et partage sur profil vierge', async ({ page, browser }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Un petit monde. Une énergie plus claire.' })).toBeVisible();
  await expect(page.locator('ww-diorama canvas')).toBeVisible();
  await expect(page.locator('.object-label')).toHaveCount(6);
  await page.screenshot({ path: 'test-results/watt-wallet-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Créer un appareil', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Nom de l’appareil').fill('Lampe test');
  await dialog.getByLabel('Puissance moyenne en marche').fill('100');
  await dialog.getByRole('button', { name: 'Enregistrer la fiche' }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Ajouter Lampe test', exact: true }).click();
  await expect(page.locator('.inspector h2')).toHaveText('Lampe test');
  await expect(page.locator('.selected-stats strong')).toContainText('183');
  await page.locator('.inspector').getByLabel('Quantité', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Appliquer les modifications' }).click();
  await expect(page.locator('.selected-stats strong')).toContainText('365');
  await page.getByRole('button', { name: 'Ajuster mon tarif' }).click();
  await dialog.getByLabel('Option tarifaire').selectOption('hp-hc');
  await dialog.getByLabel('Heures pleines (€/kWh)').fill('0.3');
  await dialog.getByLabel('Heures creuses (€/kWh)').fill('0.2');
  await dialog.getByRole('button', { name: 'Enregistrer mon tarif' }).click();
  await page.getByRole('button', { name: 'Mes scénarios', exact: true }).click();
  await page.getByRole('button', { name: 'Créer un scénario', exact: true }).click();
  await dialog.getByLabel('Nom', { exact: true }).fill('Lampes économes');
  await dialog.getByRole('button', { name: 'Créer', exact: true }).click();
  await page
    .locator('.device-row')
    .filter({ hasText: 'Lampe test' })
    .getByRole('button', { name: 'Modifier Lampe test' })
    .click();
  await page.locator('.inspector').getByLabel('Puissance moyenne en marche').fill('10');
  await page.getByRole('button', { name: 'Appliquer les modifications' }).click();
  await expect(page.locator('.comparison-grid').first()).toContainText('328,5');
  await page.getByLabel('Surcoût initial en euros').fill('40');
  await page.locator('.scenario-cost').getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.locator('.workspace-footer')).toContainText('Enregistré sur cet appareil');
  await page.reload();
  await page.getByRole('button', { name: 'Mes scénarios', exact: true }).click();
  await page.getByRole('button', { name: 'Lampes économes', exact: true }).click();
  await expect(page.locator('.comparison-grid')).toContainText('328,5');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Partager le logement' }).click();
  const download = await downloadPromise;
  const buffer = await readFile((await download.path())!);
  const context = await browser.newContext({ viewport: { width: 1480, height: 1000 } });
  const fresh = await context.newPage();
  await fresh.goto('http://127.0.0.1:4200');
  const chooserPromise = fresh.waitForEvent('filechooser');
  await fresh.locator('.heading-actions').getByRole('button', { name: 'Importer', exact: true }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({ name: 'test.wattpack', mimeType: 'application/zip', buffer });
  await expect(fresh.getByRole('dialog')).toContainText('1 scénarios');
  await fresh.getByRole('button', { name: 'Importer ces données' }).click();
  await expect(fresh.getByLabel('Choisir un logement')).toHaveValue(/.+/);
  await expect(fresh.locator('.diorama-header h2')).toContainText('(importé)');
  await fresh.getByRole('button', { name: 'Mes scénarios', exact: true }).click();
  await fresh.getByRole('button', { name: 'Lampes économes', exact: true }).click();
  await expect(fresh.locator('.comparison-grid')).toContainText('328,5');
  await context.close();
  expect(errors).toEqual([]);
});

test('mode sans WebGL et interface étroite', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: any, ...args: any[]): any {
      if (String(type).startsWith('webgl')) return null;
      return original.apply(this, [type, ...args] as any);
    };
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByText('La vue 3D n’est pas disponible')).toBeVisible();
  await page.getByRole('button', { name: 'Ajouter Télévision', exact: true }).click();
  await expect(page.locator('.inspector h2')).toHaveText('Télévision');
  await page.locator('.inspector').getByLabel('Quantité', { exact: true }).fill('3');
  await page.getByRole('button', { name: 'Appliquer les modifications' }).click();
  await expect(page.locator('.inspector').getByLabel('Quantité', { exact: true })).toHaveValue('3');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/watt-wallet-mobile-fallback.png', fullPage: true });
});

test('GLB personnalisé partagé avec sa fiche et placement sans glisser-déposer', async ({
  page,
  browser,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Créer un appareil', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nom de l’appareil').fill('Mon appareil GLB');
  const chooserPromise = page.waitForEvent('filechooser');
  await dialog.getByRole('button', { name: 'Importer un GLB', exact: true }).click();
  await (await chooserPromise).setFiles('examples/triangle.glb');
  await expect(dialog.getByText('Modèle personnalisé associé à cette fiche.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Enregistrer la fiche' }).click();
  await page.getByRole('button', { name: 'Ajouter Mon appareil GLB', exact: true }).click();
  await expect(page.locator('.object-label').filter({ hasText: 'Mon appareil GLB' })).toBeVisible();
  await expect(page.locator('.scene-warning')).toHaveCount(0);
  await page.getByRole('button', { name: 'Placement', exact: true }).click();
  await page.locator('.inspector').getByLabel('Position X').fill('5');
  await page.locator('.inspector').getByLabel('Position Z').fill('3');
  await page.getByRole('button', { name: 'Appliquer les modifications' }).click();
  await page.getByRole('button', { name: 'Dupliquer', exact: true }).click();
  await expect(page.locator('.device-row').filter({ hasText: 'Mon appareil GLB' })).toHaveCount(2);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Partager le logement' }).click();
  const download = await downloadPromise;
  const buffer = await readFile((await download.path())!);
  const context = await browser.newContext({ viewport: { width: 1480, height: 1000 } });
  const fresh = await context.newPage();
  await fresh.goto('http://127.0.0.1:4200');
  const importPromise = fresh.waitForEvent('filechooser');
  await fresh.locator('.heading-actions').getByRole('button', { name: 'Importer', exact: true }).click();
  await (await importPromise).setFiles({ name: 'glb.wattpack', mimeType: 'application/zip', buffer });
  await expect(fresh.getByRole('dialog')).toContainText('1 modèles 3D personnalisés');
  await fresh.getByRole('button', { name: 'Importer ces données' }).click();
  await expect(fresh.locator('.object-label').filter({ hasText: 'Mon appareil GLB' })).toHaveCount(2);
  await expect(fresh.locator('.scene-warning')).toHaveCount(0);
  await context.close();
});
