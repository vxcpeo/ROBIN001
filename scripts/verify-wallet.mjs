import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';
import { keysFromSignature } from '../src/lib/stealth.js';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = '..\\_shots';
const account = '0x1234567890abcdef1234567890abcdef12345678';
const signature = '0x' + '11'.repeat(32) + '22'.repeat(32) + '1b';
const meta = keysFromSignature(signature).metaAddress;
const fakeTx = '0x' + 'ab'.repeat(32);
const blockNumber = '0x5a1b2c3d';
const receipt = {
  transactionHash: fakeTx, transactionIndex: '0x0', blockHash: '0x' + 'cd'.repeat(32), blockNumber, from: account,
  to: '0x5a254fe1f65e5cbbe978095ab4632e7446bd8590', cumulativeGasUsed: '0x5208', gasUsed: '0x5208',
  contractAddress: null, logs: [], logsBloom: '0x' + '00'.repeat(256), status: '0x1', type: '0x2',
  effectiveGasPrice: '0x3b9aca00', root: '0x' + '00'.repeat(32),
};
const tx = {
  hash: fakeTx, blockHash: '0x' + 'cd'.repeat(32), blockNumber, transactionIndex: '0x0', from: account,
  to: '0x5a254fe1f65e5cbbe978095ab4632e7446bd8590', value: '0x2386f26fc10000', gas: '0x5208',
  gasPrice: '0x3b9aca00', input: '0x', nonce: '0x0', type: '0x2',
};

function rpcResult(method) {
  switch (method) {
    case 'eth_chainId': return '0x1237';
    case 'net_version': return '4663';
    case 'eth_blockNumber': return blockNumber;
    case 'eth_getBalance': return '0xde0b6b3a7640000';
    case 'eth_call': return '0x';
    case 'eth_estimateGas': return '0x5208';
    case 'eth_gasPrice': return '0x3b9aca00';
    case 'eth_getTransactionCount': return '0x0';
    case 'eth_sendTransaction': return fakeTx;
    case 'eth_sendRawTransaction': return fakeTx;
    case 'eth_getTransactionReceipt': return receipt;
    case 'eth_getTransactionByHash': return tx;
    case 'eth_getBlockByNumber': return { number: blockNumber, hash: '0x' + 'cd'.repeat(32), parentHash: '0x' + '00'.repeat(32), timestamp: '0x68f80000', baseFeePerGas: '0x3b9aca00', gasLimit: '0x1c9c380', gasUsed: '0x5208', miner: '0x' + '00'.repeat(20), difficulty: '0x0', extraData: '0x', transactions: [], nonce: '0x0000000000000000', mixHash: '0x' + '00'.repeat(32), stateRoot: '0x' + '00'.repeat(32), receiptsRoot: '0x' + '00'.repeat(32), logsBloom: '0x' + '00'.repeat(256), sha3Uncles: '0x' + '00'.repeat(32), size: '0x1', totalDifficulty: '0x0', uncles: [] };
    case 'eth_feeHistory': return { oldestBlock: blockNumber, baseFeePerGas: ['0x3b9aca00', '0x3b9aca00'], gasUsedRatio: [0.1], reward: [['0x3b9aca00']] };
    case 'eth_maxPriorityFeePerGas': return '0x3b9aca00';
    case 'eth_getCode': return '0x';
    case 'eth_accounts': return [account];
    default: return null;
  }
}

async function installMock(page) {
  await page.route('https://robinhood-rpc.publicnode.com/**', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    const reqs = Array.isArray(body) ? body : [body];
    const out = reqs.map((r) => ({ jsonrpc: '2.0', id: r.id, result: r.method === 'eth_getLogs' ? [] : rpcResult(r.method) }));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(Array.isArray(body) ? out : out[0]) });
  });
  for (const host of ['robinhood.api.pocket.network', 'robinhood.drpc.org']) {
    await page.route(`https://${host}/**`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ jsonrpc: '2.0', id: 1, result: null }) }));
  }
  await page.addInitScript(({ account, signature }) => {
    const provider = {
      isMock: true,
      async request({ method }) {
        console.log('MOCK_RPC', method);
        if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [account];
        if (method === 'eth_chainId') return '0x1237';
        if (method === 'eth_blockNumber') return '0x5a1b2c3d';
        if (method === 'personal_sign') return signature;
        if (method === 'wallet_switchEthereumChain' || method === 'wallet_addEthereumChain') return null;
        if (method === 'eth_estimateGas') return '0x5208';
        if (method === 'eth_sendTransaction' || method === 'eth_sendRawTransaction') return '0x' + 'ab'.repeat(32);
        if (method === 'eth_getBalance') return '0xde0b6b3a7640000';
        if (method === 'eth_call') return '0x';
        if (method === 'eth_gasPrice') return '0x3b9aca00';
        if (method === 'eth_getTransactionCount') return '0x0';
        if (method === 'eth_getTransactionReceipt') return {
          transactionHash: '0x' + 'ab'.repeat(32), transactionIndex: '0x0', blockHash: '0x' + 'cd'.repeat(32), blockNumber: '0x5a1b2c3d', from: account,
          to: '0x5a254fe1f65e5cbbe978095ab4632e7446bd8590', cumulativeGasUsed: '0x5208', gasUsed: '0x5208', contractAddress: null,
          logs: [], logsBloom: '0x' + '00'.repeat(256), status: '0x1', type: '0x2', effectiveGasPrice: '0x3b9aca00', root: '0x' + '00'.repeat(32),
        };
        if (method === 'eth_getTransactionByHash') return {
          hash: '0x' + 'ab'.repeat(32), blockHash: '0x' + 'cd'.repeat(32), blockNumber: '0x5a1b2c3d', transactionIndex: '0x0', from: account,
          to: '0x5a254fe1f65e5cbbe978095ab4632e7446bd8590', value: '0x2386f26fc10000', gas: '0x5208', gasPrice: '0x3b9aca00', input: '0x', nonce: '0x0', type: '0x2',
        };
        if (method === 'eth_getBlockByNumber') return { number: '0x5a1b2c3d', hash: '0x' + 'cd'.repeat(32), parentHash: '0x' + '00'.repeat(32), timestamp: '0x68f80000', baseFeePerGas: '0x3b9aca00', gasLimit: '0x1c9c380', gasUsed: '0x5208', miner: '0x' + '00'.repeat(20), difficulty: '0x0', extraData: '0x', transactions: [], nonce: '0x0000000000000000', mixHash: '0x' + '00'.repeat(32), stateRoot: '0x' + '00'.repeat(32), receiptsRoot: '0x' + '00'.repeat(32), logsBloom: '0x' + '00'.repeat(256), sha3Uncles: '0x' + '00'.repeat(32), size: '0x1', totalDifficulty: '0x0', uncles: [] };
        throw new Error('Unsupported mock method: ' + method);
      },
      on() {},
      removeListener() {},
    };
    window.ethereum = provider;
    const announce = () => window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
      detail: { info: { name: 'Mock Wallet', rdns: 'mock.wallet', icon: '' }, provider },
    }));
    window.addEventListener('eip6963:requestProvider', announce);
    setTimeout(announce, 200);
    setTimeout(announce, 800);
  }, { account, signature });
}

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--no-first-run', '--disable-background-networking'],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text().slice(0, 300)); if (m.text().startsWith('MOCK_RPC')) console.log(m.text()); });
await installMock(page);

async function connectAndUnlock() {
  if (await page.getByRole('button', { name: /Connect wallet/ }).count()) {
    await page.getByRole('button', { name: /Connect wallet/ }).first().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Mock Wallet/ }).click();
    await page.waitForTimeout(900);
  }
  if (await page.getByRole('button', { name: /Sign to unlock/ }).count()) {
    await page.getByRole('button', { name: /Sign to unlock/ }).click();
    await page.waitForTimeout(2200);
  }
}

await page.goto('http://127.0.0.1:5180/receive', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
console.log('BEFORE_CONNECT', await page.locator('.pane h1').first().innerText());
await page.getByRole('button', { name: /Connect wallet/ }).first().click();
await page.waitForTimeout(500);
await page.getByRole('button', { name: /Mock Wallet/ }).click();
await page.waitForTimeout(900);
console.log('AFTER_CONNECT', await page.locator('.pane h1').first().innerText());
await page.getByRole('button', { name: /Sign to unlock/ }).click();
await page.waitForTimeout(2200);
console.log('AFTER_UNLOCK', await page.locator('.pane h1').first().innerText());
console.log('LINK', await page.locator('.link-box .url').first().innerText().catch(() => 'none'));
await page.screenshot({ path: `${OUT}\\verify-receive.png` });

// Payment request interaction.
await page.locator('#req-card input[inputmode="decimal"]').fill('0.05');
await page.locator('#req-memo').fill('Invoice #12 璺?logo design');
await page.waitForTimeout(300);
console.log('REQ_URL', await page.locator('#req-card .url').innerText());
await page.getByRole('button', { name: 'QR code' }).nth(1).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}\\verify-receive-request.png` });

// Send to a stealth meta-address with a prefilled request.
await page.goto(`http://127.0.0.1:5180/pay/${encodeURIComponent(meta)}?amount=0.01&asset=ETH&memo=Invoice%20%2312`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await connectAndUnlock();
console.log('PAY_H1', await page.locator('.pane h1').first().innerText());
console.log('RESOLVE', await page.locator('.resolve').innerText().catch(() => 'none'));
await page.getByRole('button', { name: /Send privately/ }).click();
await page.waitForTimeout(9000);
console.log('AFTER_SEND', await page.locator('.pane h1').first().innerText());
await page.screenshot({ path: `${OUT}\\verify-send.png` });

await page.evaluate(() => { window.__spaMarker = 'alive'; });
await page.getByRole('link', { name: /Inbox/ }).click();
await page.waitForTimeout(2500);
console.log('SPA_MARKER', await page.evaluate(() => window.__spaMarker));
console.log('INBOX_H1', await page.locator('.pane h1').first().innerText());
await page.screenshot({ path: `${OUT}\\verify-inbox.png` });

console.log('META', meta);
console.log('ERRORS', JSON.stringify(errors, null, 2));
await browser.close();


