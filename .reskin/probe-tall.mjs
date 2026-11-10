// Find the elements that make the mobile page extremely tall.
import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { chromium } from '../node_modules/playwright-core/index.mjs';

const ROOT = path.resolve('E:/workspace/chuangye/ROBIN/ROBIN001/website');
const DIST = path.join(ROOT, 'dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  let rel = decodeURIComponent(url.pathname);
  let file = path.join(DIST, rel);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    try {
      const body = await readFile(path.join(DIST, 'index.html'));
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(body);
    } catch { res.writeHead(404).end(); }
  }
});
await new Promise((r) => server.listen(4319, '127.0.0.1', r));

const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
for (const route of process.argv.slice(2)) {
  await page.goto(`http://127.0.0.1:4319${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const info = await page.evaluate(() => {
    const rows = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.height > 3000) rows.push({ tag: el.tagName.toLowerCase(), cls: el.className?.toString().slice(0, 60), h: Math.round(r.height) });
    }
    return { docH: document.documentElement.scrollHeight, rows: rows.slice(0, 15) };
  });
  console.log(route, 'docH', info.docH, JSON.stringify(info.rows));
}
await browser.close();
server.close();

