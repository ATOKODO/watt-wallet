import { expect } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const english = JSON.parse(await readFile(new URL('../src/app/ui/i18n/en.json', import.meta.url), 'utf8'));
const captions = [
  ['Accueil mobile, bibliothèque rapide et navigation', 'Home, quick device library and navigation'],
  [
    'Consommation annuelle, budget et moyenne mensuelle',
    'Annual consumption, electricity budget and monthly average',
  ],
  ['Diorama 3D et parts de consommation', '3D diorama and consumption shares'],
  [
    'Placement uniforme, rangement en grille et accrochage',
    'Uniform placement, grid arrangement and snapping',
  ],
  [
    'Répartition annuelle par catégorie et repère de facture',
    'Annual breakdown by category and bill benchmark',
  ],
  ['Bibliothèque de fiches génériques et personnalisables', 'Library of editable generic device profiles'],
  ['Création manuelle d’une fiche d’appareil', 'Manual creation of a device profile'],
  ['Éditeur JSON synchronisé et statut de validation', 'Synchronized JSON editor and validation status'],
  [
    'Prévisualisation des données et estimation annuelle de la fiche',
    'Complete JSON example, data preview and annual estimate',
  ],
  ['Paramètres de l’appareil et quantité', 'Device settings and quantity'],
  [
    'Puissance moyenne, heures, jours et placement de l’appareil',
    'Average power, hours, days and device placement',
  ],
  [
    'Explication du calcul et séparation fonctionnement/veille',
    'Calculation explained with active use and standby separated',
  ],
  [
    'Total des appareils en marche, en veille ou arrêtés',
    'Total power of running, standby and switched-off devices',
  ],
  [
    'Scénario indépendant, économies et retour sur le surcoût',
    'Independent scenario, savings and simple payback',
  ],
  [
    'Tarif heures pleines/heures creuses et abonnement séparé',
    'Peak/off-peak tariff and separate standing charge',
  ],
  [
    'Comparaison facultative avec les kWh de douze mois de factures',
    'Optional comparison with twelve months of actual consumption',
  ],
  [
    'Aperçu avant import d’un logement et de ses scénarios',
    'Preview before importing a home and its scenarios',
  ],
  ['Palette et couleur personnalisée appliquées à l’interface', 'Theme palette and custom accent color'],
  ['Estimation annuelle en thème sombre lavande', 'Annual estimate with a dark lavender theme'],
  ['Plateau 3D en thème sombre lavande', '3D board with a dark lavender theme'],
  ['Interface anglaise et formats numériques localisés', 'English interface and localized numbers'],
  [
    'Choix de langue français/anglais sans rechargement',
    'Switch between French and English without reloading',
  ],
];
const englishCaptions = new Map(captions);
export async function captureFeatureScreenshots(
  browser,
  device,
  language,
  output,
  legacyEnglishFinal = false,
) {
  const { width, height, touch = false } = device;
  const baseURL = process.env.WATT_WALLET_URL ?? 'http://127.0.0.1:4200';
  output = path.resolve(output);
  await mkdir(output, { recursive: true });
  const t = (source, parameters = []) =>
    (language === 'en' ? (english[source] ?? source) : source).replace(/\{(\d+)\}/g, (_, index) =>
      String(parameters[index] ?? ''),
    );
  const caption = (source) => (language === 'en' ? (englishCaptions.get(source) ?? source) : source);
  const shots = [];
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    isMobile: touch,
    hasTouch: touch,
    colorScheme: 'light',
    reducedMotion: 'reduce',
    locale: language === 'en' ? 'en-GB' : 'fr-FR',
  });
  try {
    await context.addInitScript(
      (language) => localStorage.setItem('watt-wallet-language', language),
      language,
    );
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.goto(baseURL);
    await expect(page.locator('.workspace-footer')).toContainText(t('Enregistré sur cet appareil'));
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
      await expect(page.locator('.webgl-fallback')).toHaveCount(0);
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
        throw new Error('Horizontal overflow in ' + file);
      await page.screenshot({
        path: path.join(output, file),
        fullPage: false,
        animations: 'disabled',
        scale: 'css',
      });
      const bytes = await readFile(path.join(output, file));
      if (bytes.readUInt32BE(16) !== width || bytes.readUInt32BE(20) !== height)
        throw new Error('Unexpected PNG dimensions: ' + file);
      shots.push({ file, title: caption(title), width, height });
      console.log(device.id + '/' + language + '/' + file);
    };
    const home = async () => {
      await page.getByRole('button', { name: t('Mon logement'), exact: true }).click();
      await page.evaluate(() => window.scrollTo(0, 0));
    };
    if (language === 'en') {
      await page.getByRole('button', { name: t('Renommer le logement'), exact: true }).click();
      await dialog.getByLabel(t('Nom'), { exact: true }).fill('My little home');
      await dialog.getByRole('button', { name: t('Enregistrer'), exact: true }).click();
      await expect(dialog).not.toBeVisible();
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    await capture('01-accueil-clair.png', 'Accueil mobile, bibliothèque rapide et navigation');
    await capture(
      '02-estimation-annuelle.png',
      'Consommation annuelle, budget et moyenne mensuelle',
      '.page-heading',
    );
    await capture('03-plateau-consommation.png', 'Diorama 3D et parts de consommation', '.diorama-card');
    await page.getByRole('button', { name: t('Placement'), exact: true }).click();
    await page.getByRole('button', { name: t('Ranger en grille'), exact: true }).click();
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
    await page.getByRole('button', { name: t('Bibliothèque'), exact: true }).click();
    await capture(
      '06-bibliotheque.png',
      'Bibliothèque de fiches génériques et personnalisables',
      '.page-heading',
    );
    await page.getByRole('button', { name: t('Nouvelle fiche'), exact: true }).click();
    await dialog.getByLabel(t('Nom de l’appareil')).fill(language === 'en' ? 'Desk lamp' : 'Lampe de bureau');
    await dialog
      .getByLabel(t('Marque'), { exact: true })
      .fill(language === 'en' ? 'My equipment' : 'Mon équipement');
    await capture('07-fiche-formulaire.png', 'Création manuelle d’une fiche d’appareil');
    await dialog.getByRole('tab', { name: t('JSON'), exact: true }).click();
    await expect(dialog.locator('.json-validation')).toHaveClass(/valid/);
    await dialog.evaluate((element) => {
      element.scrollTop = 0;
    });
    await capture('08-fiche-json.png', 'Éditeur JSON synchronisé et statut de validation');
    if (!legacyEnglishFinal) await dialog.locator('.json-example summary').click();
    await dialog
      .locator('.definition-json-preview')
      .evaluate((element) => element.scrollIntoView({ block: 'end', behavior: 'instant' }));
    await capture(
      '09-fiche-json-apercu.png',
      'Prévisualisation des données et estimation annuelle de la fiche',
    );
    await dialog.getByRole('button', { name: t('Fermer la fenêtre'), exact: true }).click();
    await home();
    await page
      .locator('.device-row')
      .filter({ hasText: t('Radiateur électrique') })
      .getByRole('button', { name: t('Modifier {0}', [t('Radiateur électrique')]), exact: true })
      .click();
    if (language === 'en') {
      await page
        .locator('.inspector [formcontrolname="notes"]')
        .fill('Editable example; adjust the values for your own equipment.');
      await page
        .locator('.inspector')
        .getByRole('button', { name: t('Appliquer les modifications'), exact: true })
        .click();
      await expect(page.locator('.workspace-footer')).toContainText(t('Enregistré sur cet appareil'));
    }
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
    await page.getByRole('button', { name: t('Fermer les paramètres de l’appareil'), exact: true }).click();
    await page.getByRole('button', { name: t('Tout en marche'), exact: true }).click();
    await page
      .getByRole('group', { name: t('État simulé de {0}', [t('Radiateur électrique')]), exact: true })
      .getByRole('button', { name: t('Arrêt'), exact: true })
      .click();
    await page
      .getByRole('group', { name: t('État simulé de {0}', [t('Télévision')]), exact: true })
      .getByRole('button', { name: t('Veille'), exact: true })
      .click();
    await capture(
      '12-puissance-simulee.png',
      'Total des appareils en marche, en veille ou arrêtés',
      '.power-simulator',
    );
    await page.getByRole('button', { name: t('Mes scénarios'), exact: true }).click();
    await page.getByRole('button', { name: t('Créer un scénario'), exact: true }).click();
    await dialog
      .getByLabel(t('Nom'), { exact: true })
      .fill(language === 'en' ? 'Lower heating use' : 'Chauffage plus sobre');
    await dialog.getByRole('button', { name: t('Créer'), exact: true }).click();
    await page
      .locator('.device-row')
      .filter({ hasText: t('Radiateur électrique') })
      .getByRole('button', { name: t('Modifier {0}', [t('Radiateur électrique')]), exact: true })
      .click();
    await page.locator('.inspector').getByLabel(t('Heures / jour')).fill('4');
    await page
      .locator('.inspector')
      .getByRole('button', { name: t('Appliquer les modifications'), exact: true })
      .click();
    await expect(page.locator('.workspace-footer')).toContainText(t('Enregistré sur cet appareil'));
    await page.getByLabel(t('Surcoût initial en euros')).fill('120');
    await page
      .locator('.scenario-cost')
      .getByRole('button', { name: t('Enregistrer'), exact: true })
      .click();
    await page.locator('.category-comparison summary').click();
    await capture(
      '13-comparaison-scenario.png',
      'Scénario indépendant, économies et retour sur le surcoût',
      '.scenario-section',
    );
    await page.getByRole('button', { name: t('Référence'), exact: true }).click();
    await home();
    await page.getByRole('button', { name: t('Ajuster mon tarif'), exact: true }).click();
    await dialog.getByLabel(t('Option tarifaire')).selectOption('hp-hc');
    await capture('14-tarif-heures-creuses.png', 'Tarif heures pleines/heures creuses et abonnement séparé');
    await dialog.getByRole('button', { name: t('Fermer la fenêtre'), exact: true }).click();
    await page.getByRole('button', { name: t('Saisir ma consommation'), exact: true }).click();
    await dialog.getByLabel(t('Consommation constatée sur 12 mois')).fill('5600');
    await capture('15-repere-facture.png', 'Comparaison facultative avec les kWh de douze mois de factures');
    await dialog.getByRole('button', { name: t('Fermer la fenêtre'), exact: true }).click();
    await page.evaluate(() => window.scrollTo(0, 0));
    const chooser = page.waitForEvent('filechooser', { timeout: 30000 });
    await page
      .locator('.library-file-actions')
      .getByRole('button', { name: t('Importer'), exact: true })
      .click();
    await (await chooser).setFiles('examples/logement.wattpack');
    await expect(dialog).toBeVisible();
    await capture('16-import-wattpack.png', 'Aperçu avant import d’un logement et de ses scénarios');
    await dialog.getByRole('button', { name: t('Fermer la fenêtre'), exact: true }).click();
    await home();
    await page.getByRole('button', { name: t('Choisir la couleur du thème'), exact: true }).click();
    await dialog.getByRole('button', { name: t('Couleur {0}', [t('Lavande')]), exact: true }).click();
    await capture('17-palette-theme.png', 'Palette et couleur personnalisée appliquées à l’interface');
    await dialog.getByRole('button', { name: t('Terminer'), exact: true }).click();
    await page.getByRole('button', { name: t('Activer le mode sombre'), exact: true }).click();
    await capture('18-accueil-sombre.png', 'Estimation annuelle en thème sombre lavande', '.page-heading');
    await capture('19-plateau-sombre.png', 'Plateau 3D en thème sombre lavande', '.diorama-card');
    await page.getByRole('button', { name: t('Choisir la langue'), exact: true }).click();
    if (legacyEnglishFinal) {
      await dialog.getByRole('button', { name: 'English', exact: true }).click();
      await dialog.getByRole('button', { name: 'Done', exact: true }).click();
      await capture(
        '20-interface-anglaise.png',
        'Interface anglaise et formats numériques localisés',
        '.page-heading',
      );
    } else {
      await capture('20-choix-langue.png', 'Choix de langue français/anglais sans rechargement');
    }
    await writeGallery(output, device, language, shots, legacyEnglishFinal);
    console.log('Saved ' + shots.length + ' captures to ' + output);
    return shots;
  } finally {
    await context.close();
  }
}

async function writeGallery(output, device, language, shots, legacyEnglishFinal) {
  const { width, height } = device;
  const english = language === 'en';
  await writeFile(
    path.join(output, 'manifest.json'),
    JSON.stringify(
      { device: device.id, language, viewport: { width, height }, screenshots: shots },
      null,
      2,
    ) + '\n',
  );
  const rows = shots.map((s) => '| [' + s.file + '](' + s.file + ') | ' + s.title + ' |').join('\n');
  const text = english
    ? '# Walletricity screenshots — ' +
      device.name +
      '\n\n' +
      shots.length +
      ' PNG screenshots at **' +
      width +
      ' × ' +
      height +
      ' pixels**, in English. Viewport captures without a device frame or full-page stitching.\n\nChromium at scale 1 with isolated demo data. These are responsive layout captures, not Safari or native Apple device validation.\n\n[Open the gallery](index.html)\n\n| File | Feature |\n| --- | --- |\n'
    : '# Captures Walletricity — ' +
      device.name +
      '\n\n' +
      shots.length +
      ' captures PNG de **' +
      width +
      ' × ' +
      height +
      ' pixels**, en français. Captures du viewport, sans cadre d’appareil ni assemblage de page entière.\n\nRendu Chromium à l’échelle 1, avec des données de démonstration isolées. Ces captures montrent les dispositions responsives, sans validation Safari ou appareil Apple natif.\n\n[Ouvrir la galerie](index.html)\n\n| Fichier | Fonctionnalité |\n| --- | --- |\n';
  const command =
    device.id === 'iphone-16-pro'
      ? 'node scripts/screenshots-mobile.mjs ' + language
      : 'node scripts/screenshots-devices.mjs ' + device.id + ' ' + language;
  await writeFile(
    path.join(output, 'README.md'),
    text +
      rows +
      '\n\n' +
      (english ? '## Regenerate' : '## Régénérer') +
      '\n\n' +
      "\u0060\u0060\u0060powershell\nnpm start\n# In another terminal / Dans un autre terminal :\n$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.cache/playwright'\n" +
      command +
      '\n\u0060\u0060\u0060\n',
  );
  const cards = shots
    .map(
      (s) =>
        '<figure><img loading="lazy" src="' +
        s.file +
        '" width="' +
        width +
        '" height="' +
        height +
        '"><figcaption>' +
        s.title +
        '</figcaption></figure>',
    )
    .join('');
  await writeFile(
    path.join(output, 'index.html'),
    '<!doctype html><html lang="' +
      language +
      '"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Walletricity — ' +
      device.name +
      '</title><style>body{margin:30px;background:#edf0e9;color:#263d30;font:14px system-ui}h1{font-size:24px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(' +
      (width > 1200 ? '420' : '230') +
      'px,1fr));gap:24px}figure{margin:0}img{display:block;width:100%;height:auto;border:1px solid #d4ddcd;border-radius:10px}figcaption{margin-top:10px;line-height:1.5}@media(max-width:500px){main{grid-template-columns:1fr}}</style><h1>Walletricity · ' +
      device.name +
      ' · ' +
      width +
      ' × ' +
      height +
      ' px · ' +
      language.toUpperCase() +
      '</h1><main>' +
      cards +
      '</main></html>',
  );
}
