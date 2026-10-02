import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const baseURL = process.env.WATT_WALLET_URL ?? 'http://127.0.0.1:4200';
const output = path.resolve('docs/screenshots/iphone-16-pro');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const shots = [];
try {
  const context = await browser.newContext({
    viewport: { width: 402, height: 874 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    colorScheme: 'light',
    locale: 'fr-FR',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  await page.goto(baseURL);
  await expect(page.locator('.workspace-footer')).toContainText('Enregistré sur cet appareil');
  await expect(page.locator('.object-label')).toHaveCount(6);
  const dialog = page.getByRole('dialog');
  const settle = async () => {
    await page.locator('.toast').waitFor({ state: 'hidden' });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });
  };
  const capture = async (file, title, selector = null) => {
    await settle();
    if (selector)
      await page
        .locator(selector)
        .first()
        .evaluate((element) => {
          window.scrollTo({
            top: window.scrollY + element.getBoundingClientRect().top - 18,
            behavior: 'instant',
          });
        });
    await settle();
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
      throw new Error('Horizontal overflow in ' + file);
    await page.screenshot({
      path: path.join(output, file),
      fullPage: false,
      animations: 'disabled',
      scale: 'css',
    });
    const bytes = await readFile(path.join(output, file));
    if (bytes.readUInt32BE(16) !== 402 || bytes.readUInt32BE(20) !== 874)
      throw new Error('Unexpected PNG dimensions: ' + file);
    shots.push({ file, title, width: 402, height: 874 });
    console.log(file);
  };
  const home = async () => {
    await page.getByRole('button', { name: 'Mon logement', exact: true }).click();
    await page.evaluate(() => window.scrollTo(0, 0));
  };
  await capture('01-accueil-clair.png', 'Accueil mobile, bibliothèque rapide et navigation');
  await capture(
    '02-estimation-annuelle.png',
    'Consommation annuelle, budget et moyenne mensuelle',
    '.page-heading',
  );
  await capture('03-plateau-consommation.png', 'Diorama 3D et parts de consommation', '.diorama-card');
  await page.getByRole('button', { name: 'Placement', exact: true }).click();
  await page.getByRole('button', { name: 'Ranger en grille', exact: true }).click();
  await capture(
    '04-placement-grille.png',
    'Placement uniforme, rangement en grille et accrochage',
    '.diorama-card',
  );
  await capture(
    '05-repartition-categories.png',
    'Répartition annuelle par catégorie et repère de facture',
    '.inspector',
  );
  await page.getByRole('button', { name: 'Bibliothèque', exact: true }).click();
  await capture(
    '06-bibliotheque.png',
    'Bibliothèque de fiches génériques et personnalisables',
    '.page-heading',
  );
  await page.getByRole('button', { name: 'Nouvelle fiche', exact: true }).click();
  await dialog.getByLabel('Nom de l’appareil').fill('Lampe de bureau');
  await dialog.getByLabel('Marque', { exact: true }).fill('Mon équipement');
  await capture('07-fiche-formulaire.png', 'Création manuelle d’une fiche d’appareil');
  await dialog.getByRole('tab', { name: 'JSON', exact: true }).click();
  await expect(dialog.locator('.json-validation')).toHaveClass(/valid/);
  await dialog.evaluate((element) => {
    element.scrollTop = 0;
  });
  await capture('08-fiche-json.png', 'Éditeur JSON synchronisé et statut de validation');
  await dialog
    .locator('.definition-json-preview')
    .evaluate((element) => element.scrollIntoView({ block: 'end', behavior: 'instant' }));
  await capture(
    '09-fiche-json-apercu.png',
    'Prévisualisation des données et estimation annuelle de la fiche',
  );
  await dialog.getByRole('button', { name: 'Fermer la fenêtre', exact: true }).click();
  await home();
  await page
    .locator('.device-row')
    .filter({ hasText: 'Radiateur électrique' })
    .getByRole('button', { name: 'Modifier Radiateur électrique', exact: true })
    .click();
  await capture('10-usages-appareil.png', 'Paramètres de l’appareil et quantité', '.inspector');
  await capture(
    '10b-puissance-et-duree.png',
    'Puissance moyenne, heures, jours et placement de l’appareil',
    '.inspector .form-divider',
  );
  await page.locator('.calculation-detail summary').click();
  await capture(
    '11-detail-calcul.png',
    'Explication du calcul et séparation fonctionnement/veille',
    '.inspector',
  );
  await page.getByRole('button', { name: 'Fermer les paramètres de l’appareil', exact: true }).click();
  await page.getByRole('button', { name: 'Tout en marche', exact: true }).click();
  await page
    .getByRole('group', { name: 'État simulé de Radiateur électrique', exact: true })
    .getByRole('button', { name: 'Arrêt', exact: true })
    .click();
  await page
    .getByRole('group', { name: 'État simulé de Télévision', exact: true })
    .getByRole('button', { name: 'Veille', exact: true })
    .click();
  await capture(
    '12-puissance-simulee.png',
    'Total des appareils en marche, en veille ou arrêtés',
    '.power-simulator',
  );
  await page.getByRole('button', { name: 'Mes scénarios', exact: true }).click();
  await page.getByRole('button', { name: 'Créer un scénario', exact: true }).click();
  await dialog.getByLabel('Nom', { exact: true }).fill('Chauffage plus sobre');
  await dialog.getByRole('button', { name: 'Créer', exact: true }).click();
  await page
    .locator('.device-row')
    .filter({ hasText: 'Radiateur électrique' })
    .getByRole('button', { name: 'Modifier Radiateur électrique', exact: true })
    .click();
  await page.locator('.inspector').getByLabel('Heures / jour').fill('4');
  await page
    .locator('.inspector')
    .getByRole('button', { name: 'Appliquer les modifications', exact: true })
    .click();
  await expect(page.locator('.workspace-footer')).toContainText('Enregistré sur cet appareil');
  await page.getByLabel('Surcoût initial en euros').fill('120');
  await page.locator('.scenario-cost').getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await page.locator('.category-comparison summary').click();
  await capture(
    '13-comparaison-scenario.png',
    'Scénario indépendant, économies et retour sur le surcoût',
    '.scenario-section',
  );
  await page.getByRole('button', { name: 'Référence', exact: true }).click();
  await home();
  await page.getByRole('button', { name: 'Ajuster mon tarif', exact: true }).click();
  await dialog.getByLabel('Option tarifaire').selectOption('hp-hc');
  await capture('14-tarif-heures-creuses.png', 'Tarif heures pleines/heures creuses et abonnement séparé');
  await dialog.getByRole('button', { name: 'Fermer la fenêtre', exact: true }).click();
  await page.getByRole('button', { name: 'Saisir ma consommation', exact: true }).click();
  await dialog.getByLabel('Consommation constatée sur 12 mois').fill('5600');
  await capture('15-repere-facture.png', 'Comparaison facultative avec les kWh de douze mois de factures');
  await dialog.getByRole('button', { name: 'Fermer la fenêtre', exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  const chooser = page.waitForEvent('filechooser', { timeout: 30000 });
  await page.locator('.library-file-actions').getByRole('button', { name: 'Importer', exact: true }).click();
  await (await chooser).setFiles('examples/logement.wattpack');
  await expect(dialog).toBeVisible();
  await capture('16-import-wattpack.png', 'Aperçu avant import d’un logement et de ses scénarios');
  await dialog.getByRole('button', { name: 'Fermer la fenêtre', exact: true }).click();
  await home();
  await page.getByRole('button', { name: 'Choisir la couleur du thème', exact: true }).click();
  await dialog.getByRole('button', { name: 'Couleur Lavande', exact: true }).click();
  await capture('17-palette-theme.png', 'Palette et couleur personnalisée appliquées à l’interface');
  await dialog.getByRole('button', { name: 'Terminer', exact: true }).click();
  await page.getByRole('button', { name: 'Activer le mode sombre', exact: true }).click();
  await capture('18-accueil-sombre.png', 'Estimation annuelle en thème sombre lavande', '.page-heading');
  await capture('19-plateau-sombre.png', 'Plateau 3D en thème sombre lavande', '.diorama-card');
  await page.getByRole('button', { name: 'Choisir la langue', exact: true }).click();
  await dialog.getByRole('button', { name: 'English', exact: true }).click();
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await capture(
    '20-interface-anglaise.png',
    'Interface anglaise et formats numériques localisés',
    '.page-heading',
  );
  await writeFile(
    path.join(output, 'manifest.json'),
    JSON.stringify({ viewport: { width: 402, height: 874 }, screenshots: shots }, null, 2) + '\n',
  );
  const rows = shots.map((s) => '| [' + s.file + '](' + s.file + ') | ' + s.title + ' |').join('\n');
  await writeFile(
    path.join(output, 'README.md'),
    '# Captures mobiles Watt Wallet\n\nCaptures PNG de 402 × 874 pixels, préparées pour illustrer le README. Chaque image correspond au viewport, sans cadre de téléphone ni capture de page entière.\n\nDimensions demandées pour iPhone 16 Pro ; rendu Chromium en émulation mobile, échelle 1, sans validation Safari/iOS. Données de démonstration dans un profil navigateur isolé.\n\n| Fichier | Fonctionnalité |\n| --- | --- |\n' +
      rows +
      '\n\n## Régénérer\n\nDepuis la racine du dépôt, avec l’application démarrée :\n\n' +
      "\u0060\u0060\u0060powershell\nnpm start\n# Dans un autre terminal :\n$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.cache/playwright'\nnode scripts/screenshots-mobile.mjs\n\u0060\u0060\u0060" +
      '\n',
  );
  const cards = shots
    .map(
      (s) =>
        '<figure><img src="' +
        s.file +
        '" width="402" height="874"><figcaption>' +
        s.title +
        '</figcaption></figure>',
    )
    .join('');
  await writeFile(
    path.join(output, 'index.html'),
    '<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Watt Wallet — Captures mobiles</title><style>body{margin:30px;background:#edf0e9;color:#263d30;font:14px system-ui}h1{font-size:24px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:24px}figure{margin:0}img{display:block;width:100%;height:auto;border:1px solid #d4ddcd;border-radius:10px}figcaption{margin-top:10px;line-height:1.5}</style><h1>Watt Wallet · 402 × 874 px</h1><main>' +
      cards +
      '</main></html>',
  );
  console.log('Saved ' + shots.length + ' captures to ' + output);
} finally {
  await browser.close();
}
