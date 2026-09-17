import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('http://127.0.0.1:4200');
  await page.getByRole('button', { name: 'Ajouter Télévision', exact: true }).click();
  console.log(
    await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      overflow: [...document.querySelectorAll('body *')]
        .map((e) => ({
          tag: e.tagName,
          cls: e.className,
          x: e.getBoundingClientRect().x,
          right: e.getBoundingClientRect().right,
          width: e.getBoundingClientRect().width,
        }))
        .filter((e) => e.width > innerWidth || e.right > innerWidth + 2)
        .slice(0, 35),
    })),
  );
} finally {
  await browser.close();
}
