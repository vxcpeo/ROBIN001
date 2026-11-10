import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';

const OUT = '..\\_shots';
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text().slice(0, 200)); });

for (const [path, name] of [['/', 'mobile-home'], ['/transparency', 'mobile-transparency'], ['/receive', 'mobile-app']]) {
  await page.goto('http://127.0.0.1:5180' + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3200);
  await page.screenshot({ path: `${OUT}\\${name}.png` });
  console.log(name, await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth, body: document.body.className })));
  if (path === '/') {
    await page.evaluate(() => window.scrollTo(0, document.querySelector('#story').offsetTop + innerHeight * 1.25));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}\\mobile-story.png` });
  }
}
console.log('ERRORS', JSON.stringify(errors, null, 2));
await browser.close();

