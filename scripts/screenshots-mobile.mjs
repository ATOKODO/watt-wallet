import { chromium } from '@playwright/test';
import { captureFeatureScreenshots } from './capture-features.mjs';
const language = process.argv[2] ?? 'fr';
if (!['fr', 'en'].includes(language)) throw new Error('Usage: node scripts/screenshots-mobile.mjs [fr|en]');
const browser = await chromium.launch({
  headless: true,
  args: ['--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  await captureFeatureScreenshots(
    browser,
    { id: 'iphone-16-pro', name: 'iPhone 16 Pro', width: 402, height: 874, touch: true },
    language,
    language === 'fr' ? 'docs/screenshots/iphone-16-pro' : 'docs/screenshots/iphone-16-pro/en',
    language === 'fr',
  );
} finally {
  await browser.close();
}
