<template>
  <div class="tc-land" id="top">
    <header class="tc-term" role="banner" :class="{ 'tc-term--solid': navSolid }">
      <Brand />
      <span class="tc-term__ca">
        <b>{{ ca ? 'CA' : 'LAUNCH' }}</b>
        <span class="tc-mono">{{ ca ? short(ca) : '19 Oct · 13:00 UTC' }}</span>
        <button v-if="ca" type="button" aria-label="Copy contract address" @click="copy(ca, 'Contract address copied')">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>
        </button>
      </span>
      <span class="tc-term__glyphs">
        <a class="tc-glyph" :href="cfg.x" target="_blank" rel="noopener" aria-label="Receiva on X"><XIcon /></a>
        <a class="tc-glyph" :href="cfg.telegram" target="_blank" rel="noopener" aria-label="Receiva on Telegram"><TelegramIcon /></a>
        <a class="tc-glyph" :href="cfg.github" target="_blank" rel="noopener" aria-label="Receiva source on GitHub"><GithubIcon /></a>
      </span>
    </header>

    <div class="tc-land__body">
      <nav class="tc-index" aria-label="Primary">
        <a class="tc-index__mark" href="/" aria-label="Receiva home"><img src="/assets/receiva-mark.svg" alt="" width="22" height="22"></a>
        <a href="#how"><i>01</i><span>How it works</span></a>
        <a href="#proof"><i>02</i><span>Proof</span></a>
        <a href="#token"><i>03</i><span>Token</span></a>
        <a href="/transparency"><i>04</i><span>Transparency</span></a>
        <a href="#faq"><i>05</i><span>FAQ</span></a>
        <a class="tc-term__go" href="/receive"><span>Open app</span></a>
     </nav>

      <main class="tc-doc">
        <section class="tc-hero tc-record" aria-label="Receiva on Robinhood Chain">
          <div class="tc-hero__copy">
            <div class="tc-hero__eyebrow">
              <span class="tc-label tc-label--hot"><span class="tc-dot tc-dot--hot"></span> Live on Robinhood Chain</span>
              <span class="tc-label">Private receive links · Robinhood Chain</span>
              <span class="tc-label tc-mono">ERC-5564 / 4663</span>
            </div>
            <h1>Your wallet is a public statement. <em>Put a hood on it.</em></h1>
            <p class="tc-hero__lead">Receiva gives you a private receive link. Every payment lands in a fresh address that only you can open. No pool, no custody, no mixer.</p>
            <div class="tc-hero__acts">
              <a class="tc-btn tc-btn--go" href="/receive">Create your link <span class="tc-btn__arrow">→</span></a>
              <a class="tc-btn tc-btn--quiet" href="#how">How it works</a>
            </div>
            <div class="tc-hero__proof">
              <a :href="links.router" target="_blank" rel="noopener"><i class="tc-dot tc-dot--ok"></i>Source verified</a>
              <a href="#proof"><i class="tc-dot tc-dot--ok"></i>Tested on mainnet</a>
              <span><i class="tc-dot tc-dot--ok"></i>Holds 0 ETH</span>
              <span><i class="tc-dot tc-dot--ok"></i>0% fee</span>
              <a :href="cfg.github" target="_blank" rel="noopener"><i class="tc-dot tc-dot--ok"></i>Open source</a>
            </div>
          </div>

          <div class="tc-stage">
            <div class="tc-stage__bar">
              <span class="tc-dot tc-dot--hot"></span>
              <span>Receiva</span>
              <span class="tc-stage__grow"></span>
              <span>Chain 4663 · Non-custodial</span>
            </div>
            <div class="tc-stage__body">
              <img ref="heroFigureEl" class="tc-stage__fallback" src="/assets/hood-sm.webp" alt="">
              <canvas ref="scene" class="tc-hood-canvas" aria-hidden="true"></canvas>
              <div class="tc-stage__corners" aria-hidden="true"></div>
              <div class="tc-stage__hint"><span>Move to turn the vault</span></div>
            </div>
            <div class="tc-stage__foot">
              <span>Put a hood on your wallet</span>
            </div>
          </div>
        </section>

        <section class="tc-record" aria-label="Receiva token">
          <div class="tc-metrics" id="stats">
            <div class="tc-metric"><span class="tc-label">Payments via Receiva Router</span><b :class="{ 'tc-flash': flash.viaReceiva }">{{ stats.viaReceiva == null ? '—' : stats.viaReceiva.toLocaleString('en-US') }}</b></div>
            <div class="tc-metric"><span class="tc-label">ERC-5564 payments · all apps</span><b :class="{ 'tc-flash': flash.announcements }">{{ stats.announcements == null ? '—' : stats.announcements.toLocaleString('en-US') }}</b></div>
            <div class="tc-metric"><span class="tc-label">Funds held by Receiva</span><b>0</b></div>
            <div class="tc-metric"><span class="tc-label">Receiva fee</span><b>0%</b></div>
            <div class="tc-metric"><span class="tc-label">Latest block</span><b>{{ stats.head == null ? '—' : stats.head.toLocaleString('en-US') }}</b></div>
          </div>
        </section>

        <section ref="storyEl" class="tc-record tc-story" id="story" aria-label="How a hood works" :class="{ 'is-sending': sending }">
          <div class="tc-story__steps">
            <div class="tc-record__head"><span class="tc-record__id">01</span></div>
            <div class="tc-acts">
              <article class="tc-act" :class="{ 'is-on': act === 0 }">
                <span class="tc-label tc-label--hot">01 · Exposed</span>
                <h2>This is what <em>everyone</em> sees.</h2>
                <p>On Robinhood Chain an address is an open brokerage statement. Pay someone once and they can read every share you hold, every trade you made, every wallet you touch.</p>
              </article>
              <article class="tc-act" :class="{ 'is-on': act === 1 }">
                <span class="tc-label tc-label--hot">02 · Hooded</span>
                <h2>Share a link, <em>not an address.</em></h2>
                <p>Your Receiva link carries public receive keys, not your wallet. Senders pay the link. Your statement locks away.</p>
                <button ref="holdEl" class="tc-hold" type="button" :style="{ '--h': hold }" @pointerdown="holdDown" @pointerup="holdUp" @pointerleave="holdUp" @pointercancel="holdUp" @keydown="holdKey" @keyup="holdKeyUp">
                  <span class="tc-hold__ring"></span><span class="tc-hold__label">{{ sending ? 'Release to put it back' : 'Hold to see what a sender sees' }}</span>
                </button>
              </article>
              <article class="tc-act" :class="{ 'is-on': act === 2 }">
                <span class="tc-label tc-label--hot">03 · Landed</span>
                <h2>Every payment lands <em>somewhere new.</em></h2>
                <p>Each payment creates a one-time address, derived on the spot. Ten payments, ten addresses, and no thread between them.</p>
              </article>
              <article class="tc-act" :class="{ 'is-on': act === 3 }">
                <span class="tc-label tc-label--hot">04 · Only you</span>
                <h2>Only <em>your key</em> can find them.</h2>
                <p>Your browser checks every public announcement with your viewing key. The ones that light up are yours. Move them wherever you choose.</p>
              </article>
              <div class="tc-rail" aria-hidden="true"><i v-for="i in 4" :key="i" :style="{ '--fill': railFill(i - 1) }"></i></div>
            </div>
          </div>
          <div aria-hidden="true">
            <div ref="statementEl" class="tc-sheet" :class="{ 'is-hooded': hooded, 'is-landed': landedOn, 'is-mine': mineOn, 'is-sender': sending }">
             <div class="tc-sheet__head">
                <div><span class="tc-label">Wallet</span><b class="tc-mono">0x9A3f…e21C</b></div>
                <div class="tc-sheet__total"><span class="tc-label">Portfolio</span><b>{{ hooded ? mask('$48,212.40') : '$48,212.40' }}</b></div>
              </div>
              <div class="tc-sheet__rows">
                <div class="tc-sheet__row"><span class="tc-tok">NVDA</span><span>NVIDIA</span><b>{{ hooded ? mask('42.18') : '42.18' }}</b><b>{{ hooded ? mask('$7,941.30') : '$7,941.30' }}</b></div>
                <div class="tc-sheet__row"><span class="tc-tok">TSLA</span><span>Tesla</span><b>{{ hooded ? mask('31.02') : '31.02' }}</b><b>{{ hooded ? mask('$13,420.08') : '$13,420.08' }}</b></div>
                <div class="tc-sheet__row"><span class="tc-tok">SPCX</span><span>SpaceX</span><b>{{ hooded ? mask('118.40') : '118.40' }}</b><b>{{ hooded ? mask('$9,812.44') : '$9,812.44' }}</b></div>
                <div class="tc-sheet__row"><span class="tc-tok">AAPL</span><span>Apple</span><b>{{ hooded ? mask('27.75') : '27.75' }}</b><b>{{ hooded ? mask('$6,903.21') : '$6,903.21' }}</b></div>
                <div class="tc-sheet__row"><span class="tc-tok tc-tok--eth">ETH</span><span>Ether</span><b>{{ hooded ? mask('4.120') : '4.120' }}</b><b>{{ hooded ? mask('$10,135.37') : '$10,135.37' }}</b></div>
              </div>
              <div class="tc-sheet__tx">
                <span class="tc-label">Recent</span>
                <div><span>Received 1,200 USDG</span><span>{{ hooded ? mask('from 0x51C7…2a7F') : 'from 0x51C7…2a7F' }}</span></div>
                <div><span>Sold 12 TSLA</span><span>{{ hooded ? mask('to 0x8366…0951') : 'to 0x8366…0951' }}</span></div>
              </div>
              <div class="tc-landed" aria-hidden="true">
                <span v-for="x in landed" :key="x.a" :class="{ me: x.me }">{{ x.a }}</span>
              </div>
              <div class="tc-sheet__sender"><span class="tc-label">What the sender sees</span><b>Paid → 0x7f3e…b91a</b><span>Owner: unknown · first seen just now</span></div>
            </div>
          </div>
        </section>

        <section class="tc-record" id="how">
          <div class="tc-record__head"><span class="tc-record__id">02</span><span class="tc-label">How it works</span></div>
          <h2>Three moves. <em>No new wallet.</em></h2>
          <div class="tc-moves">
            <article class="tc-move">
              <span class="tc-move__no">01</span>
              <h3>Unlock</h3>
              <p>Sign one fixed message with the wallet you already use. Free, no transaction. Your browser derives a viewing key and a spending key.</p>
              <div class="tc-mini"><div class="tc-mini__row"><span>Signature</span><b class="tc-good">Free · 0 gas</b></div><div class="tc-mini__row"><span>Keys leave browser</span><b class="tc-good">Never</b></div></div>
            </article>
            <article class="tc-move">
              <span class="tc-move__no">02</span>
              <h3>Share your link</h3>
              <p>Post it in your bio, send it to a client, print it as a QR. Anyone with ETH or a stock token on Robinhood Chain can pay it.</p>
              <div class="tc-mini"><div class="tc-mini__link tc-mono">receiva.xyz/pay/0x9A3f…e21C</div><div class="tc-mini__row"><span>Your wallet in the payment</span><b class="tc-good">Not on-chain</b></div></div>
            </article>
            <article class="tc-move">
              <span class="tc-move__no">03</span>
              <h3>Withdraw anywhere</h3>
              <p>Your Inbox finds each payment and moves it in one click, gas included by the sender. Send it to a fresh wallet to stay hooded.</p>
              <div class="tc-mini"><div class="tc-mini__row"><span><span class="tc-tok" style="width:22px;height:22px;font-size:8px">NVDA</span> 1.5 NVDA</span><b>Withdraw →</b></div><div class="tc-mini__row"><span>Receiva fee</span><b>0</b></div></div>
            </article>
          </div>
          <div class="tc-tools">
            <article class="tc-tool">
              <span class="tc-label">New · Payment requests</span>
              <h3>Ask for an exact amount.</h3>
              <p>Set 0.05 ETH, 2 NVDA or any amount, add a note like "Invoice #12", share the link or its QR. The payer opens it and everything is filled in.</p>
              <div class="tc-mini"><div class="tc-mini__row"><span>Invoice #12 · logo design</span><b>0.05 ETH</b></div><div class="tc-mini__row"><span>Note written on-chain</span><b class="tc-good">Never</b></div></div>
              <a class="tc-btn tc-btn--sm" href="/receive">Create a request <span class="tc-btn__arrow">→</span></a>
            </article>
            <article class="tc-tool">
              <span class="tc-label">New · Pay me privately button</span>
              <h3>Put it on your site or profile.</h3>
              <p>One line of HTML for your website, Markdown for GitHub, a short line for your bio. Anyone who clicks it pays a one-time address, not your wallet.</p>
              <div class="tc-badges"><img src="/assets/badge-dark.svg" alt="Pay me privately with Receiva, dark" width="232" height="48" loading="lazy"><img src="/assets/badge-light.svg" alt="Pay me privately with Receiva, light" width="232" height="48" loading="lazy"></div>
              <a class="tc-btn tc-btn--sm" href="/receive">Get your button <span class="tc-btn__arrow">→</span></a>
            </article>
          </div>
          <div class="tc-assets">
            <span class="tc-label">Send ETH, any ERC-20, and every Robinhood stock token</span>
            <div class="tc-chips">
              <span><span class="tc-tok tc-tok--eth">ETH</span>Ether</span>
              <span v-for="s in assets" :key="s.address"><span class="tc-tok">{{ s.symbol.slice(0, 4) }}</span>{{ s.symbol }}</span>
              <span style="padding-left:14px">+{{ extraStocks }} more stock tokens</span>
              <span style="padding-left:14px">any ERC-20</span>
            </div>
          </div>
        </section>

        <section class="tc-record" id="proof">
          <div class="tc-record__head"><span class="tc-record__id">03</span><span class="tc-label">Proof, not promises</span></div>
          <div class="tc-proof__lead">
            <h2>Don't trust us. <em>Verify it.</em></h2>
            <p>Everything below is live on Robinhood Chain. Every claim links to the block explorer, so you can check it without asking us.</p>
          </div>
          <div class="tc-proof-grid">
            <article class="tc-panel">
              <span class="tc-label"><i class="tc-dot tc-dot--ok"></i> Source verified</span>
              <h3>Read the whole contract. <em>It is short.</em></h3>
              <p>The Receiva Router is under 80 lines. No owner, no fee, no admin switch, no upgrade path. It forwards a payment and logs one announcement. That is all it can do.</p>
              <div class="tc-row"><span>Router</span><a class="tc-mono" :href="links.router" target="_blank" rel="noopener">{{ short(cfg.router) }} ↗</a></div>
              <div class="tc-row"><span>Functions</span><b class="tc-mono">sendEth · sendToken</b></div>
              <div class="tc-row"><span>Owner / admin</span><b class="tc-good">None</b></div>
            </article>
            <article class="tc-panel">
              <span class="tc-label"><i class="tc-dot tc-dot--ok"></i> Tested with real money</span>
              <h3>Sent, found, withdrawn. <em>On mainnet.</em></h3>
              <ol class="tc-steps">
                <li><span class="tc-mono">{{ proofTime('routerDeployedAt', '18 Oct · 20:44 UTC') }}</span><div><b>Router deployed</b><a class="tc-mono" :href="links.routerDeployTx" target="_blank" rel="noopener">tx ↗</a></div></li>
                <li><span class="tc-mono">{{ proofTime('firstSendAt', '18 Oct · 20:45 UTC') }}</span><div><b>0.0002 ETH sent to a one-time address</b><a class="tc-mono" :href="links.firstSendTx" target="_blank" rel="noopener">tx ↗</a> <a class="tc-mono" :href="links.firstStealth" target="_blank" rel="noopener">address ↗</a></div></li>
                <li><span class="tc-mono">{{ proofTime('firstWithdrawAt', '18 Oct · 20:45 UTC') }}</span><div><b>Found with the viewing key, withdrawn</b><a class="tc-mono" :href="links.firstWithdrawTx" target="_blank" rel="noopener">tx ↗</a></div></li>
              </ol>
              <p class="tc-foot-note">Network cost of the whole round trip: under one cent. Before mainnet, the router and the full app flow passed tests on a fork of Robinhood Chain with real NVDA stock tokens.</p>
            </article>
            <article class="tc-panel">
              <span class="tc-label"><i class="tc-dot tc-dot--ok"></i> Open standards</span>
              <h3>Not our invention. <em>That's the point.</em></h3>
              <p>Receiva is a thin layer over two Ethereum standards whose contracts were already live on Robinhood Chain before Receiva existed.</p>
              <div class="tc-row"><span><a href="https://eips.ethereum.org/EIPS/eip-5564" target="_blank" rel="noopener">ERC-5564</a> Announcer</span><a class="tc-mono" :href="links.announcer" target="_blank" rel="noopener">{{ short(cfg.announcer) }} ↗</a></div>
              <div class="tc-row"><span><a href="https://eips.ethereum.org/EIPS/eip-6538" target="_blank" rel="noopener">ERC-6538</a> Registry</span><a class="tc-mono" :href="links.registry" target="_blank" rel="noopener">{{ short(cfg.registry) }} ↗</a></div>
              <div class="tc-row"><span>Payments through the Receiva Router</span><b>{{ stats.viaReceiva == null ? '—' : stats.viaReceiva.toLocaleString('en-US') }}</b></div>
              <div class="tc-row"><span>ERC-5564 payments on the chain, every app <a href="/transparency">why both</a></span><b>{{ stats.announcements == null ? '—' : stats.announcements.toLocaleString('en-US') }}</b></div>
            </article>
            <article class="tc-panel tc-panel--deep">
              <span class="tc-label tc-label--hot">Verify it yourself in 60 seconds</span>
              <h3>Four checks. <em>No trust required.</em></h3>
              <div class="tc-verify">
                <ol>
                  <li><b>01</b><span>Open the Router on Blockscout and read the Code tab, or the full source on <a :href="cfg.github" target="_blank" rel="noopener">GitHub</a>. Look for an owner or a fee. There is none.</span></li>
                  <li><b>02</b><span>Check its balance. It is zero, and it stays zero after every payment.</span></li>
                  <li><b>03</b><span>Create your link and send yourself 0.0001 ETH from another wallet. Watch it land at an address that has never touched yours.</span></li>
                  <li><b>04</b><span>Open your Inbox and withdraw it. Your keys came from one signature and never left the tab.</span></li>
                </ol>
              </div>
            </article>
          </div>
        </section>

        <TokenSection />

        <section class="tc-record" id="honest">
          <div class="tc-record__head"><span class="tc-record__id">05</span><span class="tc-label">Honest by design</span></div>
          <h2>A hood hides a face, <em>not a crowd.</em></h2>
          <p class="tc-lead">Privacy tools fail when they overpromise. Here is exactly what Receiva changes on-chain and what it does not.</p>
          <div class="tc-ledger">
            <div class="tc-ledger__col"><span class="tc-label tc-label--hot">Hidden</span>
              <div class="tc-ledger__row"><b>Who received</b><span>Funds land in a one-time address, not your wallet.</span></div>
              <div class="tc-ledger__row"><b>Links between payments</b><span>Every payment gets its own address.</span></div>
              <div class="tc-ledger__row"><b>Your keys</b><span>Derived and used only inside your browser.</span></div>
            </div>
            <div class="tc-ledger__col tc-ledger__col--open"><span class="tc-label">Still public</span>
              <div class="tc-ledger__row"><b>Amount and asset</b><span>Visible on Blockscout like any transfer.</span></div>
              <div class="tc-ledger__row"><b>The sender's wallet</b><span>The payer is not hidden.</span></div>
              <div class="tc-ledger__row"><b>Your short link</b><span>The 0x short link names your wallet to whoever you share it with. The long link does not.</span></div>
              <div class="tc-ledger__row"><b>Where you withdraw to</b><span>Withdraw to your main wallet and the link is back.</span></div>
            </div>
          </div>
          <div class="tc-contracts">
            <div><span class="tc-label">ERC-5564 Announcer</span><a class="tc-mono" :href="links.announcer" target="_blank" rel="noopener">{{ short(cfg.announcer) }}</a><small>Standard contract, already live</small></div>
            <div><span class="tc-label">ERC-6538 Registry</span><a class="tc-mono" :href="links.registry" target="_blank" rel="noopener">{{ short(cfg.registry) }}</a><small>Standard contract. Maps a wallet to its public receive keys.</small></div>
            <div><span class="tc-label">Receiva Router</span><a class="tc-mono" :href="links.router" target="_blank" rel="noopener">{{ short(cfg.router) }}</a><small>No owner · no fee · holds nothing</small></div>
            <div><span class="tc-label">Audit</span><b>Not yet</b><small>Source verified and <a :href="cfg.github" target="_blank" rel="noopener">open on GitHub</a>.</small></div>
          </div>
        </section>

        <section class="tc-record" id="faq">
          <div class="tc-record__head"><span class="tc-record__id">06</span><span class="tc-label">FAQ</span></div>
          <h2>Questions, <em>answered plainly.</em></h2>
          <div class="tc-faq">
            <details><summary>Is Receiva a mixer?</summary><p>No. There is no shared pool and nothing is mixed. Each payment goes straight from the sender to a one-time address that belongs to the receiver. Receiva never holds funds.</p></details>
            <details><summary>Can Receiva take or freeze my money?</summary><p>No. The router has no owner and no admin functions, and it never holds a balance. Only your spending key can move funds out of your one-time addresses. Note that stock token issuers can still pause their own tokens.</p></details>
            <details><summary>What if receiva.xyz goes offline?</summary><p>Your funds stay where they are. Announcements live on Robinhood Chain, and your keys come back from one signature, so any ERC-5564 tool can find and move them.</p></details>
            <details><summary>Which wallets work?</summary><p>Any regular EVM wallet: MetaMask, Rabby, Phantom (enable Robinhood Chain under Active Networks) and others. Smart-contract wallets may sign differently each time, so they are not recommended.</p></details>
            <details><summary>Who pays gas to withdraw a token?</summary><p>The sender. Each token payment carries a tiny amount of ETH (0.00002) to the one-time address, so you can withdraw without funding it first.</p></details>
            <details><summary>What does $RECEIVA do?</summary><p>$RECEIVA is the community token for the project. The app is free and does not require it. Creator fees fund servers and, next, a relayer so withdrawals need no ETH at all.</p></details>
          </div>
        </section>

        <section ref="finalEl" class="tc-final tc-record">
          <div ref="finalSpaceEl" class="tc-final__space" aria-hidden="true"></div>
          <h2>Put a hood on <em>your wallet.</em></h2>
          <p>One signature. One link. Every payment, under the hood.</p>
          <a class="tc-btn tc-btn--go" href="/receive">Create your link <span class="tc-btn__arrow">→</span></a>
        </section>
      </main>

      <aside class="tc-live" aria-label="Receiva token">
        <article class="tc-card">
          <div class="tc-row"><span class="tc-token-tick">$RECEIVA</span><span class="tc-pill" :class="{ 'tc-pill--ok': statusLive }"><span class="tc-dot" :class="{ 'tc-dot--ok': statusLive }"></span> <span>{{ statusLive ? 'Live on Pons' : 'Launch 19 Oct · 13:00 UTC' }}</span></span></div>
          <div class="tc-big">{{ countdown.main }} <small>{{ countdown.small }}</small></div>
          <span class="tc-label">Contract address</span>
          <div class="tc-linkline">
            <code class="tc-linkline__url">{{ ca || 'Appears here at launch' }}</code>
            <button v-if="ca" type="button" class="tc-copy" aria-label="Copy contract address" @click="copy(ca, 'Contract address copied')"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg></button>
          </div>
          <p class="tc-note">Verify this address before you buy. We only post it here and on <a :href="cfg.x" target="_blank" rel="noopener">@receiva</a>.</p>
          <div class="tc-acts-row">
            <a class="tc-btn tc-btn--sm tc-btn--go" :href="links.pons" :aria-disabled="!ca" target="_blank" rel="noopener">Buy on Pons</a>
            <a class="tc-btn tc-btn--sm" :href="links.dex" :aria-disabled="!ca" target="_blank" rel="noopener">Chart</a>
            <a class="tc-btn tc-btn--sm" :href="links.token" :aria-disabled="!ca" target="_blank" rel="noopener">Contract</a>
          </div>
        </article>

        <article class="tc-panel tc-panel--deep">
          <span class="tc-label"><span class="tc-dot tc-dot--plate"></span> Live balance</span>
          <h3>Funds held by Receiva</h3>
          <div class="tc-big">{{ routerBalance }} <small>ETH</small></div>
          <p>Read from the chain every few seconds. Payments go straight from the sender to a one-time address. Nothing waits in a pool.</p>
          <a class="tc-side-more" :href="links.routerBalance" target="_blank" rel="noopener">Check it on Blockscout ↗</a>
        </article>
      </aside>
    </div>

    <SiteFooter />
  </div>
</template>
