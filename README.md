# Receiva · Vue front end

A Vue 3 + Vite implementation of the Receiva site and app: private receive links on Robinhood Chain using ERC-5564 stealth addresses.

The landing page, Transparency page, Receive / Send / Inbox flow, three.js vault, token chart, and ERC-6538 registration are all ported into a single-page Vue application.

## Stack

- **Vue 3** with `<script setup>` single-file components
- **Vue Router** with history mode
- **Vite 6** for dev/build
- **ethers 6** for wallet + chain access
- **@noble/curves + @noble/hashes** for secp256k1 stealth-key cryptography
- **three.js** for the landing vault and HDR bloom
- **qrcode-generator** for receive-link / payment-request QR codes
- A dependency-free Node server for static hosting + the public announcement index

## Routes

| Route | View |
|---|---|
| `/` | Landing page with live stats, 3D vault, story, token, proof, FAQ |
| `/transparency` | What the hood hides and what stays public |
| `/receive` | Connect, sign once, create/share a private link, payment requests, badge snippets |
| `/send` | Pay a link, stealth meta-address, or registered wallet |
| `/inbox` | Scan public announcements with the viewing key, load balances, withdraw |
| `/pay/:recipient` | Send view prefilled from a Receiva link, with optional `amount`, `asset`, `memo` query params |

## Quick start

```bash
cd website
npm install
npm run dev            # http://127.0.0.1:5180
```

Vite serves the bundled `public/fallback/*.json` snapshots for `/api/*` so the landing page and app remain complete without a running indexer. Fonts are self-hosted, so no Google Fonts request is required.

## Production

```bash
cd website
npm run build
npm start              # http://127.0.0.1:4791
```

`server/server.mjs` serves `dist/`, injects SPA history fallbacks, and exposes:

- `GET /api/announcements?since=N` — public ERC-5564 announcements
- `GET /api/stats` — announcement counters and latest block
- `GET /api/token` — $RECEIVA market/trade snapshot from the Pons curve
- `GET /api/health` — indexer health

Environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4791` | HTTP port |
| `HOST` | `127.0.0.1` | Bind address |
| `RECEIVA_DIST` | `website/dist` | Built front end |
| `RECEIVA_DATA` | `website/.data` | Persisted indexer state |
| `RECEIVA_CONFIG` | `website/public/config.json` | Network configuration |
| `RECEIVA_RPC` | `indexerRpcs` from config | Comma-separated RPC override |

The server seeds itself from the bundled snapshot on first run, then extends the index from the live chain. If the RPC is unreachable it keeps serving the snapshot.

## Deploy on Vercel

Vue Router runs in history mode, so the host must serve `index.html` for unknown paths. Vercel does not do that by default: `/` works while `/receive`, `/send`, `/inbox`, `/transparency` and `/pay/…` return `404 NOT_FOUND`.

[`vercel.json`](vercel.json) fixes it:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

Static files are matched before rewrites are applied, so `/assets/*` (hashed bundles and brand assets), `/config.json`, `/live.json` and `/fallback/*.json` keep being served as themselves; only paths with no file fall through to the app shell.

Project settings:

| Setting | Value |
|---|---|
| Root Directory | `website` |
| Framework Preset | Vite (build `npm run build`, output `dist`) |

A second `vercel.json` sits at the repository root with the same rewrite, for the case where the Vercel project uses the repository root as its Root Directory and sets the build command to `cd website && npm install && npm run build` with output `website/dist`.

The optional indexer (`server/server.mjs`) is not deployed here. On Vercel `/api/*` has no handler, so `src/lib/runtime.js` falls back to the bundled `public/fallback/*.json` snapshots: the counters and token chart render, but they are a snapshot rather than live data.

Verify a deployment by opening `https://<domain>/receive` directly, not by clicking through from `/` — a hard load is what the rewrite covers.


## Project layout

```
website/
  index.html
  vite.config.js
  public/
    config.json, live.json
    fallback/              offline API snapshots
    assets/                fonts, mark, badges, hood imagery, HDR
  src/
    main.js, router.js, App.vue
    fonts.css
    styles/
      reskin.css           blueprint design system (tokens, rail, plates, dapp, responsive)
    views/                 LandingView, TransparencyView, DappView
    components/            brand, footer, token section, toast, dapp panes/modals
    lib/
      chain.js             config, providers, EIP-6963 wallets, ERC-20 helpers
      stealth.js           ERC-5564 scheme-1 cryptography
      store.js             reactive Receive/Send/Inbox state and transactions
      vault3d.js           three.js vault scene
      runtime.js           API + formatting helpers
  server/server.mjs
  tests/stealth.test.mjs   Node crypto tests
  scripts/                 Playwright verification scripts
```

The UI is one design system: `src/styles/reskin.css` (Cobalt Blueprint / Command Rail). The retired
pre-reskin shell (`styles-base.css`, `styles-landing.css`, `styles-app.css`, `components/LandingNav.vue`)
is kept for reference under `.reskin/retired/` and is not imported or rendered.

## What stays in the browser

The signing message is fixed in `src/lib/stealth.js`. The wallet signature derives a spending key and a viewing key locally. No key, signature, or payment ownership is sent to the server. The server only relays public `Announcement` logs and public token data.

This is the same security model and message as the reference Receiva implementation. Changing the message would produce new keys and lose access to existing inboxes.

## Verification

Unit tests for the stealth cryptography:

```bash
npm test
```

Browser checks (requires `npm run dev` in another terminal, Chrome at the default Windows path):

```bash
node scripts/verify.mjs
node scripts/verify-wallet.mjs
```

`verify.mjs` saves landing / proof / token / story / app / transparency screenshots and reports page errors. `verify-wallet.mjs` installs a mock EIP-6963 wallet, connects, signs the fixed message, renders the Receive view, creates a payment request, opens `/pay/...`, and exercises navigation.

The Router source in `contracts/` compiles with solc 0.8.26 to the exact deployed runtime hash `0xb52f6af5…ef692b`; see `../contracts/README.md`.

## Credits

Front-end design and the original Receiva source are MIT-licensed, copyright (c) 2026 Receiva. The HDRI `public/assets/studio.hdr` is "Studio Small 09" from [Poly Haven](https://polyhaven.com) (CC0). Fonts are Geist, Geist Mono, and Instrument Serif via Google Fonts (SIL Open Font License).
