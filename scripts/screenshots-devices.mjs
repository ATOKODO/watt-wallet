import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { captureFeatureScreenshots } from './capture-features.mjs';
const devices = [
  { id: 'ipad-pro-11', name: 'iPad Pro 11 pouces', width: 834, height: 1194, touch: true },
  { id: 'macbook-pro-14', name: 'MacBook Pro 14 pouces', width: 1512, height: 982 },
  { id: 'desktop', name: 'Desktop', width: 1920, height: 1080 },
];
const selected = devices.filter((device) => !process.argv[2] || device.id === process.argv[2]);
const languages = process.argv[3] ? [process.argv[3]] : ['fr', 'en'];
if (!selected.length || languages.some((language) => !['fr', 'en'].includes(language)))
  throw new Error('Usage: node scripts/screenshots-devices.mjs [ipad-pro-11|macbook-pro-14|desktop] [fr|en]');
const browser = await chromium.launch({
  headless: true,
  args: process.env.WATT_WALLET_SOFTWARE_GPU
    ? ['--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
    : [],
});
try {
  for (const device of selected)
    for (const language of languages)
      await captureFeatureScreenshots(
        browser,
        device,
        language,
        'docs/screenshots/' + device.id + '/' + language,
      );
  await mkdir('docs/screenshots', { recursive: true });
  const rows = devices
    .map(
      (device) =>
        '| ' +
        device.name +
        ' | ' +
        device.width +
        ' × ' +
        device.height +
        ' | [FR](' +
        device.id +
        '/fr/README.md) | [EN](' +
        device.id +
        '/en/README.md) |',
    )
    .join('\n');
  await writeFile(
    'docs/screenshots/README.md',
    '# Captures Walletricity\n\nCaptures de viewport PNG pour le README, avec une galerie HTML et un manifeste par série.\n\n| Appareil | Dimensions | Français | English |\n| --- | --- | --- | --- |\n' +
      rows +
      '\n\n[Captures iPhone 16 Pro déjà réalisées](iphone-16-pro/README.md) · 402 × 874 px.\n\nChaque nouvelle série contient 21 captures. Pour régénérer les six séries, démarrer l’application puis exécuter \u0060node scripts/screenshots-devices.mjs\u0060. Les arguments facultatifs sélectionnent un appareil et une langue.\n',
  );
} finally {
  await browser.close();
}
