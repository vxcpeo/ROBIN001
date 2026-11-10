# Reskin inventory — receiva-website

Generated: 2026-11-10T06:48:43.824Z

## Project

| Field | Value |
|---|---|
| Root | `E:/workspace/chuangye/ROBIN/ROBIN001/website` |
| Vue | 3.5.13 |
| Package manager | npm |
| Nuxt | no |
| CSS frameworks | none detected |
| Files scanned | 30 (20 SFCs) |

## Original skeleton

- Archetype: **sidebar-workspace** (shell)
- Traits: sidebar, cards, hero, table, grid, tabs, modal, charts, sticky
- Max template depth: 10
- Top-level tags: routerview, toasthost, a, svg, div, div, svg, div, section, svg, div, div, span, span, span, basemodal, dialog, accountgate, div, accountgate, template, div, div, basemodal, basemodal, div, div, div

The replacement skeleton must not be `sidebar-workspace` and must not be in the same family (`shell`).

## Routes

- `/`
- `/app`
- `/app/`
- `/inbox`
- `/pay/:recipient` _(dynamic)_
- `/receive`
- `/send`
- `/transparency`

## Palette (most used first)

`#ffffff` (38) · `#0a0b0d` (12) · `#067a4e` (5) · `#0000ff` (4) · `#7bd6ff` (4) · `#8a5a00` (4) · `#14161a` (3) · `#8f8fff` (3) · `#f2f4f7` (3) · `#050608` (2)

## Content lock

- Static visible text tokens: **475**
- Binding expressions: **250**
- Event handlers: **42**
- Contract hash: `8e2fd3550fcae3675baf63d0dc1634aceaddd87f7f2987180c4982ca132428f8`

Everything in `.reskin/content-contract.json` is immutable: visible copy, placeholders, labels, routes, link targets, asset sources, bindings, handlers, API endpoints and i18n values. A reskin may move these tokens to new markup but may not rewrite, remove or hide them.

## Next

```bash
node scripts/choose-style.mjs --project "E:/workspace/chuangye/ROBIN/ROBIN001/website" --out .reskin
node scripts/verify.mjs baseline --project "E:/workspace/chuangye/ROBIN/ROBIN001/website" --out .reskin
```

Then rewrite the UI and run `verify.mjs check`.
