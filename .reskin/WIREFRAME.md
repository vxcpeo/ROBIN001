# Wireframe — Abyss Liquidity / Terminal Console

Committed plan for the rebuild. The content contract (475 static tokens, 250 bindings,
42 handlers, hash `8e2fd3550fca`) stays byte-identical: every visible word is carried over,
only its container changes.

## New shell

| Piece | Where | Notes |
|---|---|---|
| `.tc-status` | `App.vue`, fixed 30 px | Decorative OS-style strip: three dots, mark, scan line, status glyphs. No text tokens. `aria-hidden`. |
| `.tc-term` | per route, sticky under the status bar | Command bar: brand lockup, CA chip or launch stamp, route commands, social glyphs. |
| `.tc-index` | `/`, `/transparency` | Sticky left index built from the route's existing nav labels. |
| `.tc-app__nav` | `/receive`, `/send`, `/inbox`, `/pay/:recipient` | Vertical command list, same three route labels. |
| `.tc-hint` | every route, sticky bottom | Micro status strip built only from existing labels and numeric values. |
| `.tc-foot` | `/` (full), `/transparency` (slim) | Footer columns as plain `<div>`s so the landmark map is not the old one. |

Landmark sequence changes from `nav, div[banner], main, aside, div[contentinfo], nav×3`
to `header, nav, main, aside, footer` — the old sidebar/command-bar/card-rail composition
is gone.

## Route compositions

| Route | Old | New |
|---|---|---|
| `/` | fixed 76 px icon rail + floating command bar + centred hero + stacked marketing plates + card rail | 3-column console: sticky index · records stream · live data rail. Hero becomes record 01 with the 3D scene inside a bordered "stage" plate; story acts become a transcript with a state sheet; moves/tools become console cards; proof becomes a 2-column evidence grid; token becomes chart + side facts; ledger, FAQ and final CTA become records. |
| `/receive`, `/send`, `/inbox`, `/pay/:recipient` | top command bar + rail + card stack + right chain card | Console: left command list, centre pane stack, right "what the chain sees" instrument panel, bottom hint strip. Modals become `dialog` telemetry panels. |
| `/transparency` | rail + command bar + runhead + tables in a doc column | Doc console: index rail · numbered sections with sticky table headers · right "at a glance" column. |

## Component map

- Kept as content-only children, re-templated: `Brand`, `SiteFooter`, `ToastHost`,
  `TokenSection`, `AccountGate`, `ReceivePane`, `SendPane`, `InboxPane`, `BaseModal`,
  `WalletModal`, `AssetModal`, `WithdrawModal`, `AssetIcon`.
- Removed from the render path: the old rail/command markup in every view (it lives only
  in this rewrite), and `styles/reskin.css` (kept on disk, no longer imported).

## CSS

- New file `src/styles/terminal.css`; `main.js` imports it instead of `reskin.css`.
- Tokens: `--bg #000`, `--surface #111a24`, `--accent #ff0000`, `--accent-2 #ff00ff`,
  `--ink #f4f7fa`, `--muted #8fa3b5`, `--line #1e2a36`, `--font-mono "Cascadia Mono"`.
- Breakpoints: 1180 px (drop right rails), 900 px (single column stacks), 760 px
  (index/nav become horizontal command strips), 420 px (tight metrics).

## Presentation-only script deltas

- `LandingView`: scene host class, parallax selector, no-webgl body flag, hold-button class.
- `SendPane`: the resolve note class prefix.
- `TokenSection`: canvas palette colours only.
