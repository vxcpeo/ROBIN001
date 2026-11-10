import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';

const account = '0x1234567890abcdef1234567890abcdef12345678';
const signature = '0x' + '11'.repeat(32) + '22'.repeat(32) + '1b';
await fs.mkdir('..\\_shots', { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.route('https://robinhood-rpc.publicnode.com/**', (route) => {
  const body = JSON.parse(route.request().postData() || '{}');
  const reqs = Array.isArray(body) ? body : [body];
  const result = (m) => m === 'eth_call' ? '0x' : m === 'eth_getBalance' ? '0x0' : m === 'eth_blockNumber' ? '0x5a1b2c3d' : null;
  const out = reqs.map((r) => ({ jsonrpc: '2.0', id: r.id, result: result(r.method) }));
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(Array.isArray(body) ? out : out[0]) });
});
await page.addInitScript(({ account, signature }) => {
  const provider = {
    async request({ method }) {
      if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [account];
      if (method === 'eth_chainId') return '0x1237';
      if (method === 'personal_sign') return signature;
      if (method === 'wallet_switchEthereumChain' || method === 'wallet_addEthereumChain') return null;
      if (method === 'eth_call') return '0x';
      if (method === 'eth_getBalance') return '0x0';
      if (method === 'eth_blockNumber') return '0x5a1b2c3d';
      return null;
    },
    on() {}, removeListener() {},
  };
  window.ethereum = provider;
  const announce = () => window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: { info: { name: 'Mock Wallet', rdns: 'mock', icon: '' }, provider } }));
  window.addEventListener('eip6963:requestProvider', announce);
  setTimeout(announce, 250);
}, { account, signature });
await page.goto('http://127.0.0.1:5180/receive', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
await page.getByRole('button', { name: /Connect wallet/ }).first().click();
await page.getByRole('button', { name: /Mock Wallet/ }).click();
await page.waitForTimeout(800);
await page.getByRole('button', { name: /Sign to unlock/ }).click();
await page.waitForTimeout(2000);
console.log('UNLOCKED', await page.locator('.pane h1').first().innerText());
await page.evaluate(() => { window.__spaMarker = 'alive'; });
await page.getByRole('link', { name: /Open Inbox/ }).click();
await page.waitForTimeout(3200);
console.log('MARKER', await page.evaluate(() => window.__spaMarker));
console.log('INBOX', await page.locator('.pane h1').first().innerText());
console.log('SCAN', await page.locator('.scan').last().innerText());
await page.screenshot({ path: '..\\_shots\\verify-inbox-unlocked.png' });
console.log('ERRORS', JSON.stringify(errors));
await browser.close();
