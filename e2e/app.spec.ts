import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { zipSync, strToU8 } from 'fflate';
import { oversizedGeometryGlb } from '../tests/fixtures';
import { seedLibrary, seedWorkspace, makeInstance } from '../src/app/domain/seed';
import { encodePack, decodePack } from '../src/app/data/wattpack';

test('licences accessibles en développement, reprise après erreur et traduction', async ({ page }) => {
  const notice = await page.request.get('/3rdpartylicenses.txt');
  expect(notice.ok()).toBe(true);
  expect(notice.headers()['content-type']).toContain('text/plain');
  expect(await notice.text()).toContain('Package: three@');
  const license = await page.request.get('/LICENSE.txt');
  expect(await license.text()).toBe(await readFile('LICENSE', 'utf8'));

  await page.goto('/');
  const rows = page.locator('.device-row');
  await expect(rows).toHaveCount(6);
  const button = page.getByRole('button', { name: 'Licences', exact: true });
  await button.scrollIntoViewIfNeeded();
  await expect(button).toBeInViewport();
  await page.route('**/3rdpartylicenses.txt', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><html></html>' }),
  );
  await button.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('alert')).toHaveText('Les licences n’ont pas pu être chargées.');
  await page.unroute('**/3rdpartylicenses.txt');
  await dialog.getByRole('button', { name: 'Réessayer', exact: true }).click();
  await expect(dialog.locator('.license-notice')).toHaveCount(5);
  await dialog.getByText('Bibliothèques tierces', { exact: true }).click();
  await expect(dialog.locator('pre').nth(1)).toContainText('Package: three@');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(rows).toHaveCount(6);

  await page.setViewportSize({ width: 402, height: 874 });
  await page.getByRole('button', { name: 'Choisir la langue', exact: true }).click();
  await dialog.getByRole('button', { name: 'English', exact: true }).click();
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Enable dark mode', exact: true }).click();
  await page.getByRole('button', { name: 'Licenses', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Licenses', exact: true })).toBeVisible();
  await expect(dialog.getByText('Third-party libraries', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(402);
});

test('ajout, déplacement et orbite autour du plateau', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Créer un logement', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Nom', { exact: true }).fill('Test du plateau');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer', exact: true }).click();
  await page.getByRole('button', { name: 'Placement', exact: true }).click();
  const stage = page.locator('ww-diorama .scene-canvas');
  await page
    .locator('.library-item')
    .filter({ hasText: 'Réfrigérateur' })
    .dragTo(stage, { sourcePosition: { x: 20, y: 20 } });
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
  await page.getByRole('button', { name: 'Exporter le logement' }).click();
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

test('grille, accrochage et éditeur JSON synchronisé', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Accrochage activé/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Ranger en grille' }).click();
  await expect(page.locator('.scene-grid-message')).toHaveCount(0);
  await page.getByRole('button', { name: /Accrochage activé/ }).click();
  await expect(page.getByRole('button', { name: /Accrochage désactivé/ })).toHaveAttribute(
    'aria-pressed',
    'false',
  );

  await page.getByRole('button', { name: 'Créer un appareil', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('tab', { name: 'JSON' }).click();
  await dialog.getByText('Voir un exemple JSON complet').click();
  await dialog.getByRole('button', { name: 'Charger cet exemple' }).click();
  const editor = dialog.getByLabel('JSON de la fiche');
  await expect(editor).toHaveValue(/Radiateur du salon/);
  const example = JSON.parse(await editor.inputValue());
  await expect(dialog.locator('.json-validation')).toContainText('JSON valide');
  await expect(dialog.locator('.definition-json-preview')).toContainText('675 kWh/an');
  await dialog.screenshot({ path: 'test-results/watt-wallet-json.png' });

  await editor.fill('{');
  await expect(dialog.locator('.json-validation')).toContainText('Syntaxe JSON invalide');
  await expect(dialog.getByRole('button', { name: 'Enregistrer la fiche' })).toBeDisabled();
  await editor.fill(JSON.stringify({ id: example.id }));
  await expect(dialog.locator('.json-validation')).toContainText('Champ requis');
  await editor.fill(JSON.stringify({ ...example, energy: { method: 'power', activeW: -1, standbyW: 0 } }));
  await expect(dialog.locator('.json-validation')).toContainText('Valeur invalide');

  await editor.fill(
    JSON.stringify({
      ...example,
      name: 'Mon radiateur JSON',
      energy: { method: 'power', activeW: 100, standbyW: 0 },
    }),
  );
  await expect(dialog.locator('.json-validation')).toContainText('JSON valide');
  await expect(dialog.locator('.definition-json-preview')).toContainText('75 kWh/an');
  await dialog.getByRole('tab', { name: 'Formulaire' }).click();
  await expect(dialog.getByLabel('Nom de l’appareil')).toHaveValue('Mon radiateur JSON');
  await dialog.getByLabel('Nom de l’appareil').fill('Nom via formulaire');
  await dialog.getByRole('tab', { name: 'JSON' }).click();
  await expect(editor).toHaveValue(/Nom via formulaire/);
  await dialog.getByRole('button', { name: 'Enregistrer la fiche' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.library-item').filter({ hasText: 'Nom via formulaire' })).toHaveCount(1);
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
  // Use uniform sizes: the flat example can extend beyond the camera in consumption mode.
  await page.getByRole('button', { name: 'Placement', exact: true }).click();
  await expect(page.locator('.object-label').filter({ hasText: 'Mon appareil GLB' })).toBeVisible();
  await expect(page.locator('.scene-warning')).toHaveCount(0);
  await page.locator('.inspector').getByLabel('Position X').fill('5');
  await page.locator('.inspector').getByLabel('Position Z').fill('3');
  await page.getByRole('button', { name: 'Appliquer les modifications' }).click();
  await page.getByRole('button', { name: 'Dupliquer', exact: true }).click();
  await expect(page.locator('.device-row').filter({ hasText: 'Mon appareil GLB' })).toHaveCount(2);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter le logement' }).click();
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

test('retirer un appareil d’un scénario conserve la référence', async ({ page }) => {
  await page.goto('/');
  const referenceKwh = await page.locator('.metric-value').first().textContent();
  await page.getByRole('button', { name: 'Mes scénarios', exact: true }).click();
  await page.getByRole('button', { name: 'Créer un scénario', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Nom', { exact: true }).fill('Sans chauffage');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer', exact: true }).click();
  await page.getByRole('button', { name: 'Retirer de ce scénario : Radiateur électrique' }).click();
  await expect(page.locator('.device-row').filter({ hasText: 'Radiateur électrique' })).toHaveCount(0);
  await expect(page.locator('.comparison-grid')).toContainText('3 375');
  await page.getByRole('button', { name: 'Référence', exact: true }).click();
  await expect(page.locator('.device-row').filter({ hasText: 'Radiateur électrique' })).toHaveCount(1);
  await expect(page.locator('.metric-value').first()).toHaveText(referenceKwh!);
});

test('éditeur JSON mobile et retrait du scénario au clavier', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Créer un appareil', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('tab', { name: 'JSON' }).click();
  await expect(dialog.locator('.definition-json-layout')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await dialog.screenshot({ path: 'test-results/watt-wallet-json-mobile.png' });
  await dialog.getByRole('button', { name: 'Fermer la fenêtre' }).click();

  await page.getByRole('button', { name: 'Mes scénarios', exact: true }).click();
  await page.getByRole('button', { name: 'Créer un scénario', exact: true }).click();
  await dialog.getByLabel('Nom', { exact: true }).fill('Sans radiateur au clavier');
  await dialog.getByRole('button', { name: 'Créer', exact: true }).click();
  const remove = page.getByRole('button', { name: 'Retirer de ce scénario : Radiateur électrique' });
  await remove.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.device-row').filter({ hasText: 'Radiateur électrique' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Référence', exact: true }).click();
  await expect(page.locator('.device-row').filter({ hasText: 'Radiateur électrique' })).toHaveCount(1);
});

test('theme sombre, preference systeme et persistance locale', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Activer le mode clair' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const darkBackground = await page
    .locator('.app-header')
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  await page.getByRole('button', { name: 'Activer le mode clair' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const lightBackground = await page
    .locator('.app-header')
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(lightBackground).not.toBe(darkBackground);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Activer le mode sombre' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('ww-diorama canvas')).toBeVisible();
  await page.screenshot({ path: 'test-results/watt-wallet-dark.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Créer un appareil', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/watt-wallet-dark-mobile.png', fullPage: true });
  await page.getByRole('dialog').getByRole('tab', { name: 'JSON' }).click();
  await page.screenshot({ path: 'test-results/watt-wallet-dark-json-mobile.png', fullPage: true });
});

test('puissance simulee, detail annuel et repere de facture partageable', async ({ page, browser }) => {
  await page.goto('/');
  const annual = await page.locator('.metric').first().locator('.metric-value').innerText();
  await expect(page.locator('.power-total')).toContainText('0 W');
  await page.getByRole('button', { name: 'Tout en marche' }).click();
  await expect(page.locator('.power-total')).toContainText('7,39 kW');
  await expect(page.locator('.metric').first().locator('.metric-value')).toHaveText(annual);
  await page
    .getByRole('group', { name: 'État simulé de Réfrigérateur' })
    .getByRole('button', { name: 'Arrêt' })
    .click();
  await expect(page.locator('.power-total')).toContainText('7,24 kW');
  await page
    .getByRole('group', { name: 'État simulé de Réfrigérateur' })
    .getByRole('button', { name: 'Veille' })
    .click();
  await expect(page.locator('.power-warning')).toContainText('1 appareil(s)');
  await page
    .getByRole('group', { name: 'État simulé de Réfrigérateur' })
    .getByRole('button', { name: 'Arrêt' })
    .click();
  await expect(page.locator('.power-warning')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/watt-wallet-power.png', fullPage: true });

  await page.getByRole('button', { name: 'Mes scénarios', exact: true }).click();
  await page.getByRole('button', { name: 'Créer un scénario', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Nom', { exact: true }).fill('Simulation distincte');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer', exact: true }).click();
  await expect(page.locator('.power-total')).toContainText('0 W');
  await page.getByRole('button', { name: 'Référence', exact: true }).click();
  await expect(page.locator('.power-total')).toContainText('7,24 kW');
  await page
    .locator('.device-row')
    .filter({ hasText: 'Radiateur électrique' })
    .getByRole('button', { name: 'Modifier Radiateur électrique' })
    .click();
  await page.locator('.calculation-detail summary').click();
  await expect(page.locator('.calculation-detail')).toContainText('3 375 kWh/an');
  await page.getByRole('button', { name: 'Saisir ma consommation' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Consommation constatée sur 12 mois').fill('6000');
  await dialog.getByRole('button', { name: 'Enregistrer le repère' }).click();
  await expect(page.locator('.bill-reference')).toContainText('6 000 kWh saisis');

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.power-simulator').screenshot({ path: 'test-results/watt-wallet-power-mobile.png' });
  await page.reload();
  await expect(page.locator('.bill-reference')).toContainText('6 000 kWh saisis');
  await expect(page.locator('.power-total')).toContainText('0 W');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter le logement' }).click();
  const download = await downloadPromise;
  const buffer = await readFile((await download.path())!);
  const context = await browser.newContext();
  const fresh = await context.newPage();
  await fresh.goto('http://127.0.0.1:4200/');
  const chooserPromise = fresh.waitForEvent('filechooser');
  await fresh.locator('.heading-actions').getByRole('button', { name: 'Importer', exact: true }).click();
  await (await chooserPromise).setFiles({ name: 'repere.wattpack', mimeType: 'application/zip', buffer });
  await fresh.getByRole('button', { name: 'Importer ces données' }).click();
  await expect(fresh.locator('.bill-reference')).toContainText('6 000 kWh saisis');
  await context.close();
});

test('palette globale, couleur personnalisée et persistance clair sombre', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const accentButton = page.getByRole('button', { name: 'Choisir la couleur du thème' });
  const exportButton = page.getByRole('button', { name: 'Exporter le logement' });
  const color = (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((element) => getComputedStyle(element).backgroundColor);
  const originalButton = await exportButton.evaluate((element) => getComputedStyle(element).backgroundColor);
  const originalHeader = await color('.app-header');
  await accentButton.click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Couleur Lavande' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-accent', '#7050a1');
  expect(await color('.app-header')).not.toBe(originalHeader);
  expect(await exportButton.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(
    originalButton,
  );
  await expect(dialog.getByRole('button', { name: 'Couleur Lavande' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await dialog.getByRole('button', { name: 'Terminer' }).click();
  await page.screenshot({ path: 'test-results/watt-wallet-palette-light.png', fullPage: true });
  await page.getByRole('button', { name: 'Activer le mode sombre' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-accent', '#7050a1');
  await accentButton.click();
  for (const accent of ['#ffff00', '#000000', '#0000ff']) {
    await dialog.getByLabel('Couleur personnalisée', { exact: true }).evaluate((element, value) => {
      const input = element as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, accent);
    await expect(page.locator('html')).toHaveAttribute('data-accent', accent);
    const contrast = await exportButton.evaluate((element) => {
      const context = document.createElement('canvas').getContext('2d')!;
      const luminance = (css: string) => {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = css;
        context.fillRect(0, 0, 1, 1);
        const [r, g, b] = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map((c) => {
          const value = c / 255;
          return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const css = getComputedStyle(element);
      const a = luminance(css.color),
        b = luminance(css.backgroundColor);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });
    expect(contrast).toBeGreaterThanOrEqual(4.5);
  }
  await dialog.getByRole('button', { name: 'Terminer' }).click();
  await page.screenshot({ path: 'test-results/watt-wallet-palette-dark.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await accentButton.click();
  await expect(dialog).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/watt-wallet-palette-mobile.png', fullPage: true });
  await dialog.getByRole('button', { name: 'Revenir au vert d’origine' }).click();
  await dialog.getByRole('button', { name: 'Terminer' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-accent', '#315b43');
});

test('plateau adaptatif, grande grille et positions sauvegardées', async ({ page }) => {
  const home = seedWorkspace().homes[0];
  home.id = 'large-home';
  home.name = 'Grand logement';
  home.devices = Array.from({ length: 120 }, (_, index) => {
    const device = makeInstance(seedLibrary()[3], index);
    device.position = { x: 0, z: 0 };
    return device;
  });
  const pack = encodePack({ format: 'watt-wallet', version: 1, kind: 'home', home }, {});
  await page.goto('/');
  const chooserPromise = page.waitForEvent('filechooser');
  await page.locator('.heading-actions').getByRole('button', { name: 'Importer', exact: true }).click();
  await (
    await chooserPromise
  ).setFiles({ name: 'grand-logement.wattpack', mimeType: 'application/zip', buffer: Buffer.from(pack) });
  await page.getByRole('button', { name: 'Importer ces données' }).click();
  await expect(page.locator('.device-row')).toHaveCount(120);
  await page.getByRole('button', { name: 'Placement', exact: true }).click();
  const stage = page.locator('ww-diorama .scene-canvas');
  await expect
    .poll(async () => {
      const width = Number(await stage.getAttribute('data-plateau-width'));
      const depth = Number(await stage.getAttribute('data-plateau-depth'));
      return width * depth;
    })
    .toBeGreaterThan(16 * 12);
  await page.getByRole('button', { name: 'Ranger en grille' }).click();
  await expect(page.locator('.scene-grid-message')).toHaveCount(0);
  await expect(page.locator('.workspace-footer')).toContainText('Enregistré sur cet appareil');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter le logement' }).click();
  const downloaded = await downloadPromise;
  const prepared = decodePack(new Uint8Array(await readFile((await downloaded.path())!)));
  if (prepared.manifest.kind !== 'home') throw new Error('Logement attendu');
  const positions = prepared.manifest.home.devices.map((device) => device.position);
  expect(new Set(positions.map((position) => JSON.stringify(position))).size).toBe(120);
  expect(positions.some((position) => Math.abs(position.x) > 10 || Math.abs(position.z) > 8)).toBe(true);
  await page.getByRole('button', { name: 'Recentrer le plateau' }).click();
  await stage.screenshot({ path: 'test-results/watt-wallet-adaptive-board.png' });
  await page.reload();
  await expect(page.locator('.device-row')).toHaveCount(120);
  await expect(page.locator('.error-banner')).toHaveCount(0);
  await page.getByRole('button', { name: 'Placement', exact: true }).click();
  await expect
    .poll(
      async () =>
        Number(await stage.getAttribute('data-plateau-width')) *
        Number(await stage.getAttribute('data-plateau-depth')),
    )
    .toBeGreaterThan(16 * 12);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Recentrer le plateau' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await stage.screenshot({ path: 'test-results/watt-wallet-adaptive-board-mobile.png' });
});

test('langues français/anglais, formulaires, scénarios, erreurs, données et persistance', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const metricBefore = await page.locator('.metric-value').first().innerText();
  await page.getByRole('button', { name: 'Choisir la langue', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(dialog.getByRole('heading')).toHaveText('App language');
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'A little world. A clearer picture of energy.' }),
  ).toBeVisible();
  await expect(page.locator('.workspace-footer')).toContainText('Saved on this device');
  await expect(page.getByRole('button', { name: 'Add Electric heater', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Choose the theme color', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Color Lavender', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Color Lavender', exact: true }).click();
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Enable dark mode', exact: true }).click();
  await page.getByLabel('Search for a device', { exact: true }).fill('heater');
  await expect(page.locator('.library-item')).toHaveCount(1);
  await page.getByLabel('Search for a device', { exact: true }).fill('no such device');
  await expect(page.locator('.empty-small').first()).toContainText('No devices found.');
  await page.getByLabel('Search for a device', { exact: true }).fill('');
  await page.getByLabel('Filter by category').selectOption({ label: 'Cooking' });
  await expect(page.locator('.library-item')).toHaveCount(2);
  await page.getByLabel('Filter by category').selectOption({ label: 'All' });
  await page.getByRole('button', { name: 'Create a device', exact: true }).click();
  await dialog.getByLabel('Device name').fill('Bibliothèque');
  await dialog.getByLabel('Average running power').fill('100');
  await dialog.getByRole('tab', { name: 'JSON', exact: true }).click();
  const json = dialog.getByLabel('Profile JSON', { exact: true });
  const original = await json.inputValue();
  await json.fill('{');
  await expect(dialog.locator('.json-validation')).toContainText('Invalid JSON syntax');
  await expect(dialog.getByRole('button', { name: 'Save profile', exact: true })).toBeDisabled();
  await json.fill('{}');
  await expect(dialog.locator('.json-validation')).toContainText('Missing or incomplete required field:');
  await json.fill(original);
  await expect(dialog.locator('.definition-json-preview')).toContainText('182.5 kWh/year');
  await expect(dialog.locator('.definition-json-preview h3')).toHaveText('Bibliothèque');
  await dialog.getByRole('button', { name: 'Save profile', exact: true }).click();
  await page.getByRole('button', { name: 'Add Bibliothèque', exact: true }).click();
  await expect(page.locator('.inspector h2')).toHaveText('Bibliothèque');
  await page.locator('.inspector').getByLabel('Source or notes').fill('Notes françaises personnelles');
  await page.getByRole('button', { name: 'Apply changes', exact: true }).click();
  await expect(page.locator('.inspector').getByLabel('Source or notes')).toHaveClass(/ng-pristine/);
  await expect(page.locator('.workspace-footer')).toContainText('Saved on this device');
  await page.getByRole('button', { name: 'Choose language', exact: true }).click();
  await dialog.getByRole('button', { name: 'Français', exact: true }).click();
  await dialog.getByRole('button', { name: 'Terminer', exact: true }).click();
  await expect(page.locator('.inspector h2')).toHaveText('Bibliothèque');
  await expect(page.locator('.inspector').getByLabel('Source ou notes')).toHaveValue(
    'Notes françaises personnelles',
  );
  // Keep an unsaved usage draft through a language switch.
  await page.locator('.inspector').getByLabel('Heures / jour', { exact: true }).fill('7');
  await page.getByRole('button', { name: 'Choisir la langue', exact: true }).click();
  await dialog.getByRole('button', { name: 'English', exact: true }).click();
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('.inspector').getByLabel('Hours / day', { exact: true })).toHaveValue('7');
  await page.getByRole('button', { name: 'My scenarios', exact: true }).click();
  await page.getByRole('button', { name: 'Create a scenario', exact: true }).click();
  await expect(dialog.getByLabel('Name', { exact: true })).toHaveValue('Scenario 1');
  await dialog.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.locator('.comparison-grid')).toContainText('No payback');
  await page.getByRole('button', { name: 'Remove from this scenario: Bibliothèque', exact: true }).click();
  await expect(page.locator('.comparison-grid')).toContainText('No extra cost');
  await page.getByRole('button', { name: 'Reference', exact: true }).click();
  await expect(page.locator('.device-row').filter({ hasText: 'Bibliothèque' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Arrange in a grid', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Snapping enabled', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Adjust my tariff', exact: true }).click();
  await dialog.getByLabel('Tariff option').selectOption('hp-hc');
  await dialog.getByLabel('Peak hours (€/kWh)', { exact: true }).fill('0.3');
  await dialog.getByLabel('Off-peak hours (€/kWh)', { exact: true }).fill('0.2');
  await dialog.getByRole('button', { name: 'Save my tariff', exact: true }).click();
  await expect(page.locator('.tariff-strip')).toContainText('Peak €0.3 · Off-peak €0.2 / kWh');
  await page.getByRole('button', { name: 'Enter my consumption', exact: true }).click();
  await dialog.getByLabel('Actual consumption over 12 months').fill('0');
  await dialog.getByRole('button', { name: 'Save benchmark', exact: true }).click();
  await expect(dialog.locator('.inline-error')).toContainText('greater than zero');
  await dialog.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your device library', exact: true })).toBeVisible();
  await expect(page.locator('.catalog-card').first()).toContainText('Generic device');
  await page.getByRole('button', { name: 'My scenarios', exact: true }).click();
  await page.getByRole('button', { name: 'Run all devices', exact: true }).click();
  await expect(page.locator('.power-total')).not.toContainText('0 W');
  await page.screenshot({ path: 'test-results/watt-wallet-english-dark.png', fullPage: true });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('data-accent', '#7050a1');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(
    page.getByRole('heading', { name: 'A little world. A clearer picture of energy.' }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Choose language', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'English', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.screenshot({ path: 'test-results/watt-wallet-language-mobile.png', fullPage: true });
  await dialog.getByRole('button', { name: 'Français', exact: true }).click();
  await dialog.getByRole('button', { name: 'Terminer', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.locator('.workspace-footer')).toContainText('Enregistré sur cet appareil');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
  expect(errors).toEqual([]);
  expect(metricBefore).toContain('kWh');
});

test('anglais hors WebGL, langue au clavier et conservation des données', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('watt-wallet-language', 'en');
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: any[]) {
      if (type.startsWith('webgl')) return null;
      return original.apply(this, [type, ...args] as any);
    } as any;
  });
  await page.goto('/');
  await expect(page.locator('.webgl-fallback')).toContainText('The 3D view is unavailable');
  const count = await page.locator('.device-row').count();
  const chooser = page.getByRole('button', { name: 'Choose language', exact: true });
  await chooser.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Français', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(dialog.getByRole('heading')).toHaveText('Langue de l’application');
  await dialog.getByRole('button', { name: 'Terminer', exact: true }).click();
  await expect(page.locator('.webgl-fallback')).toContainText('La vue 3D n’est pas disponible');
  await expect(page.locator('.device-row')).toHaveCount(count);
});

test('brouillon conservé lors du rangement et positions actualisées après application', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Modifier Radiateur électrique', exact: true }).click();
  const inspector = page.locator('.inspector');
  const hours = inspector.getByLabel('Heures / jour', { exact: true });
  await hours.fill('7');
  await page.getByRole('button', { name: 'Ranger en grille', exact: true }).click();
  await expect(hours).toHaveValue('7');
  const x = await inspector.getByLabel('Position X', { exact: true }).inputValue();
  const z = await inspector.getByLabel('Position Z', { exact: true }).inputValue();
  await page.getByRole('button', { name: 'Appliquer les modifications', exact: true }).click();
  await expect(page.locator('.workspace-footer')).toContainText('Enregistré sur cet appareil');
  await page.reload();
  await page.getByRole('button', { name: 'Modifier Radiateur électrique', exact: true }).click();
  await expect(hours).toHaveValue('7');
  await expect(inspector.getByLabel('Position X', { exact: true })).toHaveValue(x);
  await expect(inspector.getByLabel('Position Z', { exact: true })).toHaveValue(z);
});

test('deux onglets refusent un écrasement concurrent et permettent le rechargement', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.workspace-footer')).toContainText('Enregistré sur cet appareil');
  const second = await page.context().newPage();
  await second.goto('/');
  await expect(second.locator('.device-row')).toHaveCount(6);
  await page.getByRole('button', { name: 'Ajouter Box Internet', exact: true }).click();
  await expect(page.locator('.workspace-footer')).toContainText('Enregistré sur cet appareil');
  await expect(page.locator('.device-row')).toHaveCount(7);
  await second.getByRole('button', { name: 'Ajouter Climatiseur', exact: true }).click();
  await expect(second.locator('.error-banner')).toContainText('autre fenêtre');
  await expect(second.locator('.toast')).toHaveCount(0);
  await expect(second.locator('.device-row').filter({ hasText: 'Climatiseur' })).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.device-row').filter({ hasText: 'Box Internet' })).toHaveCount(1);
  await expect(page.locator('.device-row').filter({ hasText: 'Climatiseur' })).toHaveCount(0);
  second.once('dialog', (dialog) => dialog.accept());
  await second
    .locator('.workspace-footer')
    .getByRole('button', { name: 'Recharger les données', exact: true })
    .click();
  await expect(second.locator('.device-row').filter({ hasText: 'Box Internet' })).toHaveCount(1);
  await expect(second.locator('.error-banner')).toHaveCount(0);
  await second.getByRole('button', { name: 'Ajouter Climatiseur', exact: true }).click();
  await expect(second.locator('.toast')).toContainText('ajouté au logement');
  await page.reload();
  await expect(page.locator('.device-row')).toHaveCount(8);
  await second.close();
});

async function replaceStoredWorkspace(
  page: import('@playwright/test').Page,
  workspace: ReturnType<typeof seedWorkspace>,
) {
  await expect(page.locator('.workspace-footer')).toContainText('Enregistré sur cet appareil');
  await page.evaluate(async (workspace) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('watt-wallet', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction('workspace', 'readwrite');
      t.objectStore('workspace').put(workspace, 'current');
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
    db.close();
  }, workspace);
  await page.reload();
}

test('fiche refusée à la capacité conserve le formulaire sans annoncer de réussite', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: any, ...args: any[]) {
      if (String(type).startsWith('webgl')) return null;
      return original.apply(this, [type, ...args] as any);
    };
  });
  await page.goto('/');
  const workspace = seedWorkspace();
  workspace.library = Array.from({ length: 2000 }, (_, i) => ({
    ...structuredClone(workspace.library[0]),
    id: 'capacity-' + i,
    name: 'Device ' + i,
  }));
  await replaceStoredWorkspace(page, workspace);
  await page.getByRole('button', { name: 'Créer un appareil', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nom de l’appareil').fill('Brouillon à conserver');
  await dialog.getByRole('button', { name: 'Enregistrer la fiche', exact: true }).click();
  await expect(dialog.locator('.inline-error')).toContainText('2 000');
  await expect(dialog.getByLabel('Nom de l’appareil')).toHaveValue('Brouillon à conserver');
  await expect(page.locator('.toast')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Fermer la fenêtre', exact: true }).click();
  const pack = seedWorkspace();
  pack.homes[0].devices[0].definition.visual = { kind: 'glb', assetId: 'mesh', fallback: 'radiator' };
  const bytes = await readFile('examples/triangle.glb');
  const buffer = Buffer.from(
    encodePack(
      {
        format: 'watt-wallet',
        version: 1,
        kind: 'library',
        definitions: [pack.homes[0].devices[0].definition],
      },
      { mesh: new Uint8Array(bytes) },
    ),
  );
  const chooser = page.waitForEvent('filechooser');
  await page.locator('.heading-actions').getByRole('button', { name: 'Importer', exact: true }).click();
  await (await chooser).setFiles({ name: 'capacity.wattpack', mimeType: 'application/zip', buffer });
  await dialog.getByRole('button', { name: 'Importer ces données', exact: true }).click();
  await expect(dialog.locator('.inline-error')).toContainText('2 000');
  const count = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open('watt-wallet', 1);
      r.onsuccess = () => resolve(r.result);
    });
    const count = await new Promise<number>((resolve) => {
      const r = db.transaction('assets').objectStore('assets').count();
      r.onsuccess = () => resolve(r.result);
    });
    db.close();
    return count;
  });
  expect(count).toBe(0);
});

test('accrochage évite les objets hors grille avec leurs dimensions affichées', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('ww-diorama canvas')).toBeVisible();
  await expect(page.locator('.object-label')).toHaveCount(6);
  const violations = await page.evaluate(() => {
    const scene = (window as any).ng.getComponent(document.querySelector('ww-diorama'));
    const items = scene.footprints();
    const violations = [];
    for (const moving of items)
      for (const target of scene.slots) {
        const position = scene.nearestAvailable(target, moving.id);
        if (!position) continue;
        for (const other of items) {
          if (other.id === moving.id) continue;
          const placed = scene.objects.get(other.id).position;
          const gapX = Math.abs(position.x - placed.x) - (moving.width + other.width) / 2;
          const gapZ = Math.abs(position.z - placed.z) - (moving.depth + other.depth) / 2;
          if (gapX < 0.439 && gapZ < 0.439) violations.push({ gapX, gapZ });
        }
      }
    return violations;
  });
  expect(violations).toEqual([]);
});

test('libellés accessibles du catalogue anglais traduits avec les noms personnels préservés', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('watt-wallet-language', 'en'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add Refrigerator to the home', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add Refrigerator to the home', exact: true }).click();
  await expect(page.locator('.inspector h2')).toHaveText('Refrigerator');
});

async function failWorkspaceSaves(page: import('@playwright/test').Page, count = 2) {
  await page.evaluate((count) => {
    const repository = (window as any).ng.getComponent(document.querySelector('ww-app')).store.repository;
    const save = repository.save.bind(repository);
    repository.save = async (workspace: unknown) => {
      if (count-- > 0) throw new DOMException('Quota de test dépassé', 'QuotaExceededError');
      return save(workspace);
    };
  }, count);
}
async function disableWebGl(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: any, ...args: any[]) {
      return String(type).startsWith('webgl') ? null : original.apply(this, [type, ...args] as any);
    };
  });
}
for (const kind of ['home', 'scenario'] as const) {
  test('reprise de création ' + kind + ' sans doublon après deux échecs de stockage', async ({ page }) => {
    await disableWebGl(page);
    await page.goto('/');
    await expect(page.locator('.workspace-footer')).toContainText('Enregistré sur cet appareil');
    await failWorkspaceSaves(page);
    if (kind === 'scenario') await page.getByRole('button', { name: 'Mes scénarios', exact: true }).click();
    const open = () =>
      page
        .getByRole('button', {
          name: kind === 'home' ? 'Créer un logement' : 'Créer un scénario',
          exact: true,
        })
        .click();
    await open();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Nom', { exact: true }).fill('Copie unique');
    await dialog.getByRole('button', { name: 'Créer', exact: true }).click();
    await expect(dialog.locator('.inline-error')).toContainText('Quota de test');
    const createdId = await page.evaluate((kind) => {
      const s = (window as any).ng.getComponent(document.querySelector('ww-app')).store;
      return kind === 'home' ? s.home().id : s.scenario().id;
    }, kind);
    await dialog.getByLabel('Nom', { exact: true }).fill('Nom corrigé');
    await dialog.getByRole('button', { name: 'Créer', exact: true }).click();
    await expect(dialog.locator('.inline-error')).toContainText('Quota de test');
    await expect(page.locator('.toast')).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Créer', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await page.reload();
    await expect(page.locator('.workspace-footer')).toContainText('Enregistré sur cet appareil');
    const copies = () =>
      page.evaluate((kind) => {
        const s = (window as any).ng.getComponent(document.querySelector('ww-app')).store;
        return kind === 'home' ? s.workspace().homes : s.home().scenarios;
      }, kind);
    const saved = await copies();
    expect(saved).toHaveLength(kind === 'home' ? 2 : 1);
    expect(saved.at(-1)).toMatchObject({ id: createdId, name: 'Nom corrigé' });
    if (kind === 'scenario') await page.getByRole('button', { name: 'Mes scénarios', exact: true }).click();
    await open();
    await dialog.getByLabel('Nom', { exact: true }).fill('Nouvelle demande');
    await dialog.getByRole('button', { name: 'Créer', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    const separate = await copies();
    expect(separate).toHaveLength(saved.length + 1);
    expect(separate.at(-1).id).not.toBe(createdId);
  });
}
for (const kind of ['home', 'library'] as const) {
  test(
    'reprise import ' + kind + ' avec GLB sans recopier les données ni les ressources',
    async ({ page }) => {
      await disableWebGl(page);
      await page.goto('/');
      await expect(page.locator('.workspace-footer')).toContainText('Enregistré sur cet appareil');
      const w = seedWorkspace();
      const home = w.homes[0];
      home.devices[0].definition.visual = { kind: 'glb', assetId: 'mesh', fallback: 'radiator' };
      home.scenarios.push({
        id: 's',
        name: 'Scénario importé',
        initialCost: 120,
        devices: structuredClone(home.devices),
        tariff: structuredClone(home.tariff),
      });
      const manifest =
        kind === 'home'
          ? { format: 'watt-wallet' as const, version: 1 as const, kind, home }
          : {
              format: 'watt-wallet' as const,
              version: 1 as const,
              kind,
              definitions: [home.devices[0].definition],
            };
      const glb = await readFile('examples/triangle.glb');
      const buffer = Buffer.from(encodePack(manifest, { mesh: new Uint8Array(glb) }));
      await failWorkspaceSaves(page);
      await page.evaluate(() => {
        const repository = (window as any).ng.getComponent(document.querySelector('ww-app')).store.repository;
        const putAsset = repository.putAsset.bind(repository);
        let first = true;
        repository.putAsset = async (id: string, bytes: Uint8Array) => {
          if (first) {
            first = false;
            throw new Error('Ressource de test indisponible');
          }
          return putAsset(id, bytes);
        };
      });
      const open = async () => {
        const chooser = page.waitForEvent('filechooser');
        await page.locator('.heading-actions').getByRole('button', { name: 'Importer', exact: true }).click();
        await (await chooser).setFiles({ name: 'retry.wattpack', mimeType: 'application/zip', buffer });
      };
      const snapshot = () =>
        page.evaluate(async () => {
          const s = (window as any).ng.getComponent(document.querySelector('ww-app')).store;
          const db = await new Promise<IDBDatabase>((resolve) => {
            const r = indexedDB.open('watt-wallet', 1);
            r.onsuccess = () => resolve(r.result);
          });
          const assets = await new Promise<{ key: IDBValidKey; bytes: number[] }[]>((resolve) => {
            const entries: { key: IDBValidKey; bytes: number[] }[] = [];
            const r = db.transaction('assets').objectStore('assets').openCursor();
            r.onsuccess = () => {
              const cursor = r.result;
              if (cursor) {
                entries.push({ key: cursor.key, bytes: Array.from(cursor.value) });
                cursor.continue();
              } else resolve(entries);
            };
          });
          db.close();
          return { workspace: s.workspace(), assets };
        });
      const initial = await snapshot();
      await open();
      const dialog = page.getByRole('dialog');
      const submit = () => dialog.getByRole('button', { name: 'Importer ces données', exact: true }).click();
      await submit();
      await expect(dialog.locator('.inline-error')).toContainText('Ressource de test');
      expect((await snapshot()).workspace).toEqual(initial.workspace);
      await submit();
      await expect(dialog.locator('.inline-error')).toContainText('Quota de test');
      const first = await snapshot();
      await submit();
      await expect(dialog.locator('.inline-error')).toContainText('Quota de test');
      expect(await snapshot()).toEqual(first);
      await expect(page.locator('.toast')).toHaveCount(0);
      await submit();
      await expect(dialog).not.toBeVisible();
      await page.reload();
      await expect(page.locator('.workspace-footer')).toContainText('Enregistré sur cet appareil');
      const saved = await snapshot();
      expect(saved).toEqual(first);
      expect(saved.assets).toHaveLength(1);
      expect(saved.assets[0].bytes).toEqual(Array.from(glb));
      expect(saved.workspace.homes).toHaveLength(kind === 'home' ? 2 : 1);
      expect(saved.workspace.library).toHaveLength(
        initial.workspace.library.length + (kind === 'library' ? 1 : 0),
      );
      if (kind === 'home') expect(saved.workspace.homes[1].scenarios).toHaveLength(1);
      await open();
      await submit();
      await expect(dialog).not.toBeVisible();
      const separate = await snapshot();
      expect(separate.assets).toHaveLength(2);
      expect(kind === 'home' ? separate.workspace.homes.length : separate.workspace.library.length).toBe(
        (kind === 'home' ? saved.workspace.homes.length : saved.workspace.library.length) + 1,
      );
    },
  );
}

test('limite de géométrie GLB : rejet avant stockage, formulaire intact et erreur traduite', async ({
  page,
}) => {
  await disableWebGl(page);
  await page.goto('/');
  await expect(page.locator('.workspace-footer')).toContainText('Enregistré sur cet appareil');
  const assetKeys = () =>
    page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve) => {
        const request = indexedDB.open('watt-wallet', 1);
        request.onsuccess = () => resolve(request.result);
      });
      const keys = await new Promise<IDBValidKey[]>((resolve) => {
        const request = db.transaction('assets').objectStore('assets').getAllKeys();
        request.onsuccess = () => resolve(request.result);
      });
      db.close();
      return keys;
    });
  await page.getByRole('button', { name: 'Créer un appareil', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nom de l’appareil').fill('Fiche conservée');
  const chooseGlb = async (file: Parameters<import('@playwright/test').FileChooser['setFiles']>[0]) => {
    const chooser = page.waitForEvent('filechooser');
    await dialog.getByRole('button', { name: 'Importer un GLB', exact: true }).click();
    await (await chooser).setFiles(file);
  };
  await chooseGlb({
    name: 'expanded.glb',
    mimeType: 'model/gltf-binary',
    buffer: Buffer.from(oversizedGeometryGlb()),
  });
  await expect(dialog.locator('.inline-error')).toContainText(
    'La géométrie décodée du GLB dépasse la limite de 64 Mio.',
  );
  await expect(dialog.getByLabel('Nom de l’appareil')).toHaveValue('Fiche conservée');
  expect(await assetKeys()).toEqual([]);
  await chooseGlb('examples/triangle.glb');
  await expect(dialog.getByText('Modèle personnalisé associé à cette fiche.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Enregistrer la fiche', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(await assetKeys()).toHaveLength(1);
  await page.getByRole('button', { name: 'Choisir la langue', exact: true }).click();
  await dialog.getByRole('button', { name: 'English', exact: true }).click();
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  const snapshot = () =>
    page.evaluate(() => (window as any).ng.getComponent(document.querySelector('ww-app')).store.workspace());
  const before = await snapshot();
  const definition = seedLibrary()[0];
  definition.visual = { kind: 'glb', assetId: 'expanded', fallback: 'radiator' };
  const buffer = Buffer.from(
    zipSync({
      'manifest.json': strToU8(
        JSON.stringify({ format: 'watt-wallet', version: 1, kind: 'library', definitions: [definition] }),
      ),
      'assets/expanded.glb': oversizedGeometryGlb(),
    }),
  );
  const chooser = page.waitForEvent('filechooser');
  await page.locator('.heading-actions').getByRole('button', { name: 'Import', exact: true }).click();
  await (await chooser).setFiles({ name: 'expanded.wattpack', mimeType: 'application/zip', buffer });
  await expect(page.locator('.error-banner')).toContainText(
    'The decoded GLB geometry exceeds the 64 MiB limit.',
  );
  await expect(dialog).not.toBeVisible();
  expect(await snapshot()).toEqual(before);
  expect(await assetKeys()).toHaveLength(1);
});

for (const width of [402, 996, 1480]) {
  test('crayon ouvre les paramètres sans changer le clic sur le nom (' + width + 'px)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: width === 996 ? 'no-preference' : 'reduce' });
    await page.setViewportSize({ width, height: 892 });
    await page.goto('/');
    const row = page.locator('.device-row').filter({ hasText: 'Radiateur électrique' });
    const name = row.locator('.table-device');
    const edit = row.getByRole('button', { name: 'Modifier Radiateur électrique', exact: true });
    const inspector = page.locator('.inspector');
    await expect(row).toBeVisible();
    await name.scrollIntoViewIfNeeded();
    const beforeSelection = await page.evaluate(() => scrollY);
    await name.click();
    await expect(inspector.locator('h2')).toHaveText('Radiateur électrique');
    expect(await page.evaluate(() => scrollY)).toBeCloseTo(beforeSelection, 0);
    await expect(inspector).not.toBeFocused();
    await expect(edit.locator('ww-icon')).toHaveAttribute('name', 'edit');
    // Activate the edit action even when the same device is already selected.
    await edit.focus();
    await page.keyboard.press('Enter');
    await expect(inspector).toBeFocused();
    await expect(inspector.locator('h2')).toBeInViewport();
    await expect.poll(async () => (await inspector.boundingBox())!.y).toBeLessThan(100);
    const bounds = await inspector.boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y).toBeLessThan(100);
    await page.getByRole('button', { name: 'Fermer les paramètres de l’appareil', exact: true }).click();
    await name.click();
    await edit.click();
    await expect(inspector).toBeFocused();
    await expect(inspector.locator('h2')).toHaveText('Radiateur électrique');
    await expect(inspector.locator('h2')).toBeInViewport();
  });
}

test('devise EUR USD persistante, sans conversion, indépendante de la langue', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: any[]) {
      if (type.startsWith('webgl')) return null;
      return original.apply(this, [type, ...args] as any);
    } as any;
  });
  await page.goto('/');
  const metrics = page.locator('.metric-value');
  await expect(metrics).toHaveCount(3);
  const energy = await metrics.nth(0).innerText();
  const budget = await metrics.nth(1).innerText();
  const rowCost = page.locator('.device-row').first().locator(':scope > span').nth(2);
  const deviceCost = await rowCost.innerText();
  const chooser = page.getByRole('button', { name: 'Choisir la devise', exact: true });
  await expect(chooser).toContainText('EUR');
  await chooser.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Aucune conversion de change');
  await dialog.getByRole('button', { name: 'Dollar américain ($) USD', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Dollar américain ($) USD', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await dialog.getByRole('button', { name: 'Terminer', exact: true }).click();
  await expect(chooser).toContainText('USD');
  await expect(metrics.nth(0)).toHaveText(energy);
  await expect(metrics.nth(1)).toHaveText(budget.replace('€', '$'));
  await expect(metrics.nth(2)).toContainText('$');
  await expect(rowCost).toHaveText(deviceCost.replace('€', '$'));
  await expect(page.locator('.table-heading')).toContainText('$ / AN');
  await expect(page.locator('.tariff-strip')).toContainText('$');
  await page.getByRole('button', { name: 'Ajuster mon tarif', exact: true }).click();
  await expect(dialog.getByLabel('Prix du kWh TTC ($)', { exact: true })).toHaveValue('0.25');
  await expect(dialog.getByLabel('Abonnement annuel TTC ($)', { exact: true })).toHaveValue('180');
  await dialog.getByLabel('Option tarifaire').selectOption('hp-hc');
  await expect(dialog.getByLabel('Heures pleines ($/kWh)', { exact: true })).toHaveValue('0.27');
  await expect(dialog.getByLabel('Heures creuses ($/kWh)', { exact: true })).toHaveValue('0.2');
  await dialog.getByRole('button', { name: 'Fermer la fenêtre', exact: true }).click();
  await page.reload();
  await expect(chooser).toContainText('USD');
  await expect(metrics.nth(1)).toHaveText(budget.replace('€', '$'));
  await page.getByRole('button', { name: 'Choisir la langue', exact: true }).click();
  await dialog.getByRole('button', { name: 'English', exact: true }).click();
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Choose currency', exact: true })).toContainText('USD');
  await expect(metrics.nth(1)).toContainText('$');
  await expect(page.locator('.table-heading')).toContainText('$ / YEAR');
  await page.getByRole('button', { name: 'Enable dark mode', exact: true }).click();
  await page.setViewportSize({ width: 402, height: 874 });
  await page.getByRole('button', { name: 'Choose currency', exact: true }).click();
  await expect(dialog).toContainText('No exchange-rate conversion');
  const bounds = await dialog.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(402);
  await page.screenshot({ path: 'test-results/watt-wallet-currency-mobile.png' });
  await dialog.getByRole('button', { name: 'Euro (€) EUR', exact: true }).click();
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(metrics.nth(1)).toContainText('€');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(402);
});

test('nom public Walletricity et sauvegardes compatibles avec le nom technique', async ({ page }) => {
  const existingWorkspace = seedWorkspace();
  existingWorkspace.homes[0].name = 'Logement conservé';
  await page.route('**/__branding_setup__.html', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><html></html>' }),
  );
  await page.goto('/__branding_setup__.html');
  await page.evaluate(
    async (workspace) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('watt-wallet', 1);
        request.onupgradeneeded = () => {
          request.result.createObjectStore('workspace');
          request.result.createObjectStore('assets');
        };
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('workspace', 'readwrite');
          tx.objectStore('workspace').put(workspace, 'current');
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
        request.onerror = () => reject(request.error);
      }),
    existingWorkspace,
  );
  await page.goto('/');
  await expect(page.locator('.breadcrumb select option:checked')).toHaveText('Logement conservé');
  await expect(page.getByRole('link', { name: 'Walletricity, accueil', exact: true })).toBeVisible();
  await expect(page.locator('.brand')).toContainText('Walletricity');
  await expect(page).toHaveTitle('Walletricity · Votre énergie, en clair');
  await expect(page.locator('.workspace-footer')).toContainText('Enregistré sur cet appareil');
  const manifest = await (await page.request.get('/manifest.webmanifest')).json();
  expect(manifest.name).toBe('Walletricity');
  expect(manifest.short_name).toBe('Walletricity');
  const legacyStorage = await page.evaluate(
    async () =>
      new Promise<boolean>((resolve, reject) => {
        const request = indexedDB.open('watt-wallet', 1);
        request.onsuccess = () => {
          const db = request.result;
          const read = db.transaction('workspace').objectStore('workspace').get('current');
          read.onsuccess = () => {
            resolve(Boolean(read.result?.homes?.length));
            db.close();
          };
          read.onerror = () => reject(read.error);
        };
        request.onerror = () => reject(request.error);
      }),
  );
  expect(legacyStorage).toBe(true);
  await page.getByRole('button', { name: 'Choisir la langue', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Walletricity, home', exact: true })).toBeVisible();
  await expect(page).toHaveTitle('Walletricity · Your energy, made clear');
  const downloadEvent = page.waitForEvent('download');
  await page.locator('.library-panel').getByRole('button', { name: 'Export', exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('bibliotheque-walletricity.wattpack');
  const pack = decodePack(new Uint8Array(await readFile((await download.path())!)));
  expect(pack.manifest.format).toBe('watt-wallet');
  expect(await page.locator('body').innerText()).not.toMatch(/watt[ -]?wallet/i);
});
