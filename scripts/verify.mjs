import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = '..\\_shots';
await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--no-first-run', '--disable-background-networking'],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, timezoneId: 'Asia/Shanghai' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text().slice(0, 240)); });

await page.goto('http://127.0.0.1:5180/', { waitUntil: 'networkidle' });
await page.waitForTimeout(4500);
await page.screenshot({ path: `${OUT}\\verify-hero.png` });
console.log('TITLE', await page.title());
console.log('H1', await page.locator('h1').first().innerText());
console.log('SECTIONS', await page.locator('main > section').count());

for (const [id, name] of [['how', 'how'], ['proof', 'proof'], ['token', 'token'], ['honest', 'honest'], ['faq', 'faq']]) {
  await page.locator(`#${id}`).scrollIntoViewIfNeeded();
  await page.waitForTimeout(1700);
  await page.locator(`#${id}`).screenshot({ path: `${OUT}\\verify-${name}.png` });
}
await page.evaluate(() => window.scrollTo(0, document.querySelector('#story').offsetTop + innerHeight * 1.25));
await page.waitForTimeout(1800);
await page.screenshot({ path: `${OUT}\\verify-story.png` });
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(1400);
await page.screenshot({ path: `${OUT}\\verify-footer.png` });

// App shell without a wallet.
await page.goto('http://127.0.0.1:5180/receive', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}\\verify-app-connect.png` });
console.log('APP_H1', await page.locator('.pane h1').first().innerText());
console.log('BODY_CLASS', await page.locator('body').getAttribute('class'));

await page.goto('http://127.0.0.1:5180/transparency', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}\\verify-transparency.png` });
console.log('TRANSPARENCY_H1', await page.locator('h1').first().innerText());

console.log('ERRORS', JSON.stringify(errors, null, 2));
await browser.close();
