import { chromium, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'node:net';
const exe = path.resolve(process.argv[2] ?? 'src-tauri/target/release/watt-wallet.exe');
await mkdir('.cache', { recursive: true });
const root = await mkdtemp(path.resolve('.cache/native-smoke-'));
await mkdir('test-results', { recursive: true });
async function launch() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  const child = spawn(exe, ['--smoke-test'], {
    windowsHide: true,
    stdio: 'pipe',
    env: {
      ...process.env,
      WATT_WALLET_SMOKE_DIR: root,
      WEBVIEW2_USER_DATA_FOLDER: path.join(root, 'webview'),
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port}`,
    },
  });
  child.stderr.on('data', (d) => process.stderr.write(d));
  let endpoint;
  for (let n = 0; n < 100; n++) {
    if (child.exitCode !== null) throw new Error(`Application fermée: ${child.exitCode}`);
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      endpoint = (await r.json()).webSocketDebuggerUrl;
      if (endpoint) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  if (!endpoint) {
    child.kill();
    throw new Error('WebView2 ne répond pas au débogage local.');
  }
  const browser = await chromium.connectOverCDP(endpoint);
  let page;
  for (let n = 0; n < 100; n++) {
    page = browser
      .contexts()
      .flatMap((c) => c.pages())
      .find((p) => p.url().includes('tauri'));
    if (page) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!page) {
    await browser.close();
    child.kill();
    throw new Error('Page Tauri introuvable.');
  }
  return { child, browser, page };
}
let run;
try {
  run = await launch();
  const { page } = run;
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await expect(page.getByRole('heading', { name: 'Un petit monde. Une énergie plus claire.' })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.locator('ww-diorama canvas')).toBeAttached();
  await expect(page.locator('.app-header')).toHaveCSS('display', 'flex');
  await expect(page.locator('.brand-mark ww-icon')).toHaveCSS('width', '26px');
  await expect(page.locator('ww-diorama .scene-canvas')).toHaveCSS('position', 'absolute');
  if ((await page.locator('html').getAttribute('data-theme')) !== 'dark')
    await page.getByRole('button', { name: 'Activer le mode sombre' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Activer le mode clair' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  if (pageHeight > 5000) throw new Error(`Mise en page native incorrecte : ${pageHeight}px.`);
  const originalHeader = await page
    .locator('.app-header')
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  await page.getByRole('button', { name: 'Choisir la couleur du thème' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Couleur Lavande' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Terminer' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-accent', '#7050a1');
  await expect
    .poll(() => page.locator('.app-header').evaluate((element) => getComputedStyle(element).backgroundColor))
    .not.toBe(originalHeader);
  const annualKwh = await page.locator('.metric').first().locator('.metric-value').innerText();
  await page.getByRole('button', { name: 'Tout en marche' }).click();
  await expect(page.locator('.power-total')).toContainText('7,39 kW');
  await expect(page.locator('.metric').first().locator('.metric-value')).toHaveText(annualKwh);
  await expect(page.locator('.object-label').first()).toBeVisible();
  const scene = page.locator('ww-diorama .scene-canvas');
  await scene.scrollIntoViewIfNeeded();
  const sceneBox = await scene.boundingBox();
  if (!sceneBox) throw new Error('La scène 3D native est introuvable.');
  const labelLeftBeforeOrbit = await page
    .locator('.object-label')
    .evaluateAll((labels) => (labels.length ? labels[0].style.left : ''));
  await page.mouse.move(sceneBox.x + sceneBox.width * 0.82, sceneBox.y + sceneBox.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(sceneBox.x + sceneBox.width * 0.62, sceneBox.y + sceneBox.height * 0.34, {
    steps: 12,
  });
  await page.mouse.up();
  await expect
    .poll(() =>
      page.locator('.object-label').evaluateAll((labels) => (labels.length ? labels[0].style.left : '')),
    )
    .not.toBe(labelLeftBeforeOrbit);
  await page.getByRole('button', { name: 'Ranger en grille' }).click();
  await expect(page.locator('.scene-grid-message')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Accrochage activé/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: /Accrochage activé/ }).click();
  await expect(page.getByRole('button', { name: /Accrochage désactivé/ })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await page
    .locator('.library-item')
    .filter({ hasText: 'Réfrigérateur' })
    .dragTo(page.locator('ww-diorama .scene-canvas'));
  await expect(page.locator('.device-row')).toHaveCount(7);
  await page.getByRole('button', { name: 'Ajouter Télévision', exact: true }).click();
  await page.locator('.inspector').getByLabel('Quantité', { exact: true }).fill('4');
  await page.locator('.inspector').getByLabel('Position X', { exact: true }).fill('20');
  await page.locator('.inspector').getByLabel('Position Z', { exact: true }).fill('12');
  await page.getByRole('button', { name: 'Appliquer les modifications' }).click();
  await expect(page.locator('.workspace-footer')).toContainText('Enregistré sur cet appareil');
  await page.getByRole('button', { name: 'Saisir ma consommation' }).click();
  const billDialog = page.getByRole('dialog');
  await billDialog.getByLabel('Consommation constatée sur 12 mois').fill('6000');
  await billDialog.getByRole('button', { name: 'Enregistrer le repère' }).click();
  await expect(page.locator('.bill-reference')).toContainText('6 000 kWh saisis');
  const saved = JSON.parse(await readFile(path.join(root, 'workspace.json'), 'utf8'));
  if (saved.homes[0].devices.at(-1).quantity !== 4) throw new Error('Sauvegarde native incorrecte.');
  if (saved.homes[0].devices.at(-1).position.x !== 20)
    throw new Error('Position du plateau agrandi non sauvegardée.');
  await expect.poll(async () => Number(await scene.getAttribute('data-plateau-width'))).toBeGreaterThan(40);
  if (saved.homes[0].observedAnnualKwh !== 6000) throw new Error('Repère de facture natif non sauvegardé.');
  await page.getByRole('button', { name: 'Fermer les paramètres de l’appareil' }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/watt-wallet-native.png', fullPage: true });
  await run.browser.close();
  run.child.kill();
  run = undefined;
  await new Promise((r) => setTimeout(r, 1000));
  run = await launch();
  await expect(run.page.locator('.device-row').last()).toContainText('× 4', { timeout: 30000 });
  await expect(run.page.locator('.error-banner')).toHaveCount(0);
  await expect(run.page.locator('.bill-reference')).toContainText('6 000 kWh saisis');
  await expect(run.page.locator('.power-total')).toContainText('0 W');
  await expect(run.page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(run.page.locator('html')).toHaveAttribute('data-accent', '#7050a1');
  const nativePage = run.page;
  nativePage.on('pageerror', (error) => errors.push(error.message));
  await nativePage.getByRole('button', { name: 'Créer un appareil', exact: true }).click();
  const dialog = nativePage.getByRole('dialog');
  await dialog.getByRole('tab', { name: 'JSON' }).click();
  await dialog.getByText('Voir un exemple JSON complet').click();
  await dialog.getByRole('button', { name: 'Charger cet exemple' }).click();
  await expect(dialog.locator('.json-validation')).toContainText('JSON valide');
  await expect(dialog.locator('.definition-json-preview')).toContainText('675 kWh/an');
  await dialog.getByRole('button', { name: 'Enregistrer la fiche' }).click();
  await expect(dialog).not.toBeVisible();
  await nativePage.getByRole('button', { name: 'Mes scénarios', exact: true }).click();
  await nativePage.getByRole('button', { name: 'Créer un scénario', exact: true }).click();
  await dialog.getByLabel('Nom', { exact: true }).fill('Sans radiateur');
  await dialog.getByRole('button', { name: 'Créer', exact: true }).click();
  await nativePage.getByRole('button', { name: 'Retirer de ce scénario : Radiateur électrique' }).click();
  await expect(nativePage.locator('.device-row').filter({ hasText: 'Radiateur électrique' })).toHaveCount(0);
  await nativePage.getByRole('button', { name: 'Référence', exact: true }).click();
  await expect(nativePage.locator('.device-row').filter({ hasText: 'Radiateur électrique' })).toHaveCount(1);
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(
    'WebView2 natif : mode sombre, palette persistante, scène 3D, plateau adaptatif, grille, JSON, scénario, puissance simulée, facture, glisser-déposer, sauvegarde et redémarrage OK.',
  );
} finally {
  if (run) {
    await run.browser.close();
    run.child.kill();
  }
}
