# Reskin verification — PASS

Generated: 2026-11-10T07:12:29.470Z

- Project: **receiva-website**
- URL: http://127.0.0.1:4317/
- Original skeleton: `sidebar-workspace` (shell)
- New skeleton: `orbital` (spatial)
- Accent: #067a4e -> #ff0000 (130.7 ΔE; min 30)
- Source contract: intact (`4a0ba305aba9`)

| Route | Result | DOM similarity | Landmark similarity | Axe serious | Screenshot |
|---|---|---:|---:|---:|---|
| `/` | PASS | 0.347 | 0.375 | 0 | [desktop](current/home-desktop.png) |
| `/app` | PASS | 0.312 | 0.4 | 0 | [desktop](current/app-desktop.png) |
| `/app/` | PASS | 0.312 | 0.4 | 0 | [desktop](current/app-desktop.png) |
| `/inbox` | PASS | 0.312 | 0.4 | 0 | [desktop](current/inbox-desktop.png) |
| `/pay/:recipient` | PASS | — | — | — | — |
| `/receive` | PASS | 0.312 | 0.4 | 0 | [desktop](current/receive-desktop.png) |
| `/send` | PASS | 0.243 | 0.4 | 0 | [desktop](current/send-desktop.png) |
| `/transparency` | PASS | 0.073 | 0.5 | 0 | [desktop](current/transparency-desktop.png) |

## Blocking issues

- None.

## Warnings

- attributes: "src=/assets" count increased 10 -> 12
- assets: "src:/assets" count increased 10 -> 12
- /app: mobile nav: 1 baseline target(s) no longer visible (/transparency)
- /app/: mobile nav: 1 baseline target(s) no longer visible (/transparency)
- /inbox: mobile nav: 1 baseline target(s) no longer visible (/transparency)
- /receive: mobile nav: 1 baseline target(s) no longer visible (/transparency)
- /send: mobile nav: 1 baseline target(s) no longer visible (/transparency)

## Thresholds

- DOM fingerprint similarity <= 0.5
- Landmark sequence similarity <= 0.68
- CSS class overlap <= 0.1
- Accent distance >= 30 ΔE
- Contrast failures <= 0
- Axe serious/critical <= 0

All content is compared as a multiset of visible words plus rendered attribute values. Reordering is allowed, rewriting/removing/adding visible copy is not. Dynamic numeric values are reported as warnings, never silently accepted.
