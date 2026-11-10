<script setup>
import { computed, onMounted, onBeforeUnmount } from 'vue';
import Brand from '../components/Brand.vue';
import XIcon from '../components/XIcon.vue';
import TelegramIcon from '../components/TelegramIcon.vue';
import GithubIcon from '../components/GithubIcon.vue';
import SiteFooter from '../components/SiteFooter.vue';
import { runtime } from '../lib/chain.js';

const cfg = computed(() => runtime.config);
const ex = computed(() => cfg.value.explorer || 'https://robinhoodchain.blockscout.com');
const proof = computed(() => cfg.value.proof || {});
const addr = (key) => `${ex.value}/address/${cfg.value[key]}${key === 'router' ? '?tab=contract' : ''}`;
const tx = (h) => `${ex.value}/tx/${h}`;
const fmtTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getUTCDate()} ${mon[d.getUTCMonth()]} ${d.getUTCFullYear()} · ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`;
};

onMounted(() => document.body.classList.add('tc-doc-mode'));
onBeforeUnmount(() => document.body.classList.remove('tc-doc-mode'));
</script>

<template>
  <div class="tc-land">
    <header class="tc-term" role="banner">
      <Brand />
      <span class="tc-term__glyphs">
        <a class="tc-glyph" :href="cfg.x" target="_blank" rel="noopener" aria-label="Receiva on X"><XIcon /></a>
        <a class="tc-glyph" :href="cfg.telegram" target="_blank" rel="noopener" aria-label="Receiva on Telegram"><TelegramIcon /></a>
        <a class="tc-glyph" :href="cfg.github" target="_blank" rel="noopener" aria-label="Receiva source on GitHub"><GithubIcon /></a>
      </span>
    </header>

    <div class="tc-docpage">
      <nav class="tc-index" aria-label="Primary">
        <a class="tc-index__mark" href="/" aria-label="Receiva home"><img src="/assets/receiva-mark.svg" alt="" width="22" height="22"></a>
        <a href="/#how"><span>How it works</span></a>
        <a href="/transparency" aria-current="page"><span>Transparency</span></a>
        <a href="/#faq"><span>FAQ</span></a>
        <a class="tc-term__go" href="/receive"><span>Open app</span></a>
      </nav>

      <main class="tc-docpage__body">
        <div class="tc-runhead">
          <div>
            <span class="tc-label tc-label--hot">Transparency</span>
            <h1>What the hood hides. <span class="tc-faint">And what it doesn't.</span></h1>
          </div>
          <p>Receiva uses stealth addresses (ERC-5564). It breaks the on-chain link between a payment and the person who receives it. It does not make transactions invisible. Here is the full picture.</p>
        </div>

        <section aria-labelledby="v-vis">
          <h2 id="v-vis">On-chain visibility</h2>
          <div class="tc-tablewrap"><table class="tc-table">
            <thead><tr><th>Information</th><th>Status</th><th>Why</th></tr></thead>
            <tbody>
              <tr><td>Receiver's main wallet</td><td class="tc-good">Hidden</td><td>Funds go to a one-time address derived from the receiver's public keys and a random value only the sender knows.</td></tr>
              <tr><td>Link between two payments</td><td class="tc-good">Hidden</td><td>Each payment uses a new one-time address.</td></tr>
              <tr><td>Receiver's private keys</td><td class="tc-good">Never shared</td><td>Derived from a wallet signature inside the browser. Never sent to any server.</td></tr>
              <tr><td>Amount and asset</td><td class="tc-warn">Public</td><td>Transfers on Robinhood Chain are public. Receiva does not encrypt amounts.</td></tr>
              <tr><td>Sender's wallet</td><td class="tc-warn">Public</td><td>The payer signs a normal transaction from their own wallet.</td></tr>
              <tr><td>Withdrawal destination</td><td class="tc-warn">Public</td><td>Withdrawing to your main wallet links that payment to it. Withdraw to a fresh wallet to stay hidden.</td></tr>
              <tr><td>Short link (0x…)</td><td class="tc-warn">Names your wallet</td><td>The short link is your wallet address. Whoever you share it with knows the payment is for that wallet. The chain still does not link the payment to it. Share the long link to avoid this.</td></tr>
              <tr><td>Registered receive keys</td><td class="tc-warn">Public</td><td>Registering a short link publishes your public keys next to your address. Incoming payments are still unlinkable.</td></tr>
            </tbody>
          </table></div>
        </section>

        <section aria-labelledby="v-usage">
          <h2 id="v-usage">Usage numbers on receiva.xyz</h2>
          <p>The site shows two counters, and they measure different things. <b>Payments via Receiva Router</b> counts only payments sent through the Receiva Router. <b>ERC-5564 payments · all apps</b> counts every stealth payment announced on Robinhood Chain by any app, because the Announcer is a shared standard contract. Receiva is new; most of the second number is not Receiva.</p>
        </section>

        <section aria-labelledby="v-contracts">
          <h2 id="v-contracts">Contracts</h2>
          <div class="tc-tablewrap"><table class="tc-table">
            <tbody>
              <tr><td>ERC-5564 Announcer</td><td><a class="u" :href="addr('announcer')" target="_blank" rel="noopener"><code>{{ cfg.announcer }}</code></a><br>Standard contract, deployed with the canonical CREATE2 address. Logs each payment.</td></tr>
              <tr><td>ERC-6538 Registry</td><td><a class="u" :href="addr('registry')" target="_blank" rel="noopener"><code>{{ cfg.registry }}</code></a><br>Standard contract. Maps a wallet to its public receive keys.</td></tr>
              <tr><td>Receiva Router</td><td><a class="u" :href="addr('router')" target="_blank" rel="noopener"><code>{{ cfg.router || 'Deploying' }}</code></a><br>Sends ETH or a token to the one-time address and calls the Announcer in the same transaction. No owner, no fee, no admin functions, never holds a balance. Source verified on Blockscout.</td></tr>
            </tbody>
          </table></div>
        </section>

        <section aria-labelledby="v-open">
          <h2 id="v-open">Open source</h2>
          <p>The full code behind receiva.xyz is public: the router, the cryptography, the app and the indexer. The router compiled from that repository is byte-for-byte identical to the one deployed on Robinhood Chain; the README shows how to check it in one command. <a class="u" :href="cfg.github" target="_blank" rel="noopener">github.com/receivapro/receiva</a></p>
        </section>

        <section aria-labelledby="v-proof">
          <h2 id="v-proof">Mainnet proof</h2>
          <p>Before launch, the router was deployed and tested with real funds on Robinhood Chain. Every step is public.</p>
          <div class="tc-tablewrap"><table class="tc-table">
            <tbody>
              <tr><td>Router deployed</td><td>{{ fmtTime(proof.routerDeployedAt) }} · <a class="u" target="_blank" rel="noopener" :href="proof.routerDeployTx ? tx(proof.routerDeployTx) : '#'"><code>0x66dc…aaa1</code></a></td></tr>
              <tr><td>Source verified</td><td>Blockscout, solc 0.8.26, optimizer 1,000,000 runs · <a class="u" :href="addr('router')" target="_blank" rel="noopener">read the code</a></td></tr>
              <tr><td>First private payment</td><td>0.0002 ETH to one-time address <a class="u" target="_blank" rel="noopener" :href="proof.firstStealth ? ex + '/address/' + proof.firstStealth : '#'"><code>0x7711…e22</code></a> · <a class="u" target="_blank" rel="noopener" :href="proof.firstSendTx ? tx(proof.firstSendTx) : '#'">tx</a></td></tr>
              <tr><td>First withdrawal</td><td>Found with the viewing key, moved with the one-time key · <a class="u" target="_blank" rel="noopener" :href="proof.firstWithdrawTx ? tx(proof.firstWithdrawTx) : '#'">tx</a></td></tr>
              <tr><td>Pre-mainnet tests</td><td>Router unit tests and the full app flow (register, send ETH, send NVDA, scan, withdraw) passed on a fork of Robinhood Chain using the live Announcer and real NVDA stock tokens.</td></tr>
            </tbody>
          </table></div>
        </section>

        <section aria-labelledby="v-message">
          <h2 id="v-message">The message you sign</h2>
          <p>Your keys come from your wallet's signature of this exact text. Signing it costs nothing and authorizes nothing. If any site asks you to sign it, it can derive your Receiva keys, so sign it only on receiva.xyz.</p>
          <pre class="tc-pre">Receiva · Unlock your private receive keys

Signing is free. It sends nothing and moves nothing.
This signature stays in your browser.

Network: Robinhood Chain (4663)
Key version: 1</pre>
        </section>

        <section aria-labelledby="v-todo">
          <h2 id="v-todo">Not done yet</h2>
          <ul>
            <li><b>Independent audit:</b> not yet. The router is short and verified; the cryptography follows ERC-5564 scheme 1 with the audited <code>@noble/curves</code> library.</li>
            <li><b>Relayer:</b> withdrawals currently use a small amount of ETH sent along by the payer. A relayer is next.</li>
            <li><b>Hidden amounts:</b> not planned without zero-knowledge proofs and an audit. We will not claim it.</li>
          </ul>
        </section>

        <section aria-labelledby="v-outside">
          <h2 id="v-outside">Outside Receiva's control</h2>
          <p>Robinhood stock tokens are issued with controls: the issuer can pause transfers or block addresses. Receiva cannot override this. Timing and amount patterns can also hint at who received a payment; vary them if that matters to you.</p>
        </section>
      </main>
    </div>
    <SiteFooter compact />
  </div>
</template>
