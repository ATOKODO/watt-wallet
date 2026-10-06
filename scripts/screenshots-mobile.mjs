import { chromium } from '@playwright/test';
import { captureFeatureScreenshots } from './capture-features.mjs';
const browser = await chromium.launch({
  headless: true,
  args: ['--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  await captureFeatureScreenshots(
    browser,
    { id: 'iphone-16-pro', name: 'iPhone 16 Pro', width: 402, height: 874, touch: true },
    'fr',
    'docs/screenshots/iphone-16-pro',
    true,
  );
} finally {
  await browser.close();
}
