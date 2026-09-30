import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

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
  await page.getByRole('button', { name: 'Partager le logement' }).click();
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
  const primary = page.getByRole('button', { name: 'Partager le logement' });
  const color = (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((element) => getComputedStyle(element).backgroundColor);
  const originalButton = await primary.evaluate((element) => getComputedStyle(element).backgroundColor);
  const originalHeader = await color('.app-header');
  await accentButton.click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Couleur Lavande' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-accent', '#7050a1');
  expect(await color('.app-header')).not.toBe(originalHeader);
  expect(await primary.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(
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
    const contrast = await primary.evaluate((element) => {
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
