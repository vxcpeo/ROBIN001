// Capture the rebuilt site full-page and report section geometry.
import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { chromium } from '../node_modules/playwright-core/index.mjs';

const ROOT = path.resolve('E:/workspace/chuangye/ROBIN/ROBIN001/website');
const DIST = path.join(ROOT, 'dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const file = path.join(DIST, decodeURIComponent(url.pathname));
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
await new Promise((r) => server.listen(4321, '127.0.0.1', r));

const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const width = Number(process.argv[2] || 1440);
const route = process.argv[3] || '/';
const out = process.argv[4] || '.reskin/review/shot.png';
const page = await browser.newPage({ viewport: { width, height: 900 } });
await page.goto(`http://127.0.0.1:4321${route}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const geo = await page.evaluate(() => {
  const rows = [];
  for (const sel of ['.tc-hero', '.tc-metrics', '.tc-story', '#how', '#proof', '#token', '#honest', '#faq', '.tc-final', '.tc-foot']) {
    const el = document.querySelector(sel);
    if (!el) { rows.push([sel, 'missing']); continue; }
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    rows.push([sel, Math.round(r.top + window.scrollY), Math.round(r.height), cs.opacity, cs.visibility, cs.display]);
  }
  return { docH: document.documentElement.scrollHeight, rows };
});
console.log(JSON.stringify(geo, null, 1));
await page.screenshot({ path: out, fullPage: true });
console.log('shot', out);
await browser.close();
server.close();
