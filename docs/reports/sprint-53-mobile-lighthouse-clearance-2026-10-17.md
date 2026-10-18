# Sprint 53 Mobile Lighthouse Clearance — 2026-10-17

## Result

Issue #106's mobile performance gate passed on two consecutive runs with pessimistic Lighthouse CI assertions enabled.

| Run | Performance | FCP | LCP | TBT | CLS | Transfer |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 93 | 1,215 ms | 3,252 ms | 0 ms | 0.0147 | 328,410 bytes |
| 2 | 93 | 1,207 ms | 3,237 ms | 0 ms | 0.0147 | 328,410 bytes |

Required thresholds were Performance ≥ 80, LCP < 4,000 ms, and TBT < 200 ms. Both runs passed every threshold.

## Measured Build

- Branch: `dev/sprint-53`
- Node: `v22.22.1`
- Chrome: `154.0.8037.97`
- Lighthouse CI: `0.15.1`
- Profile: 390×844 mobile viewport, device scale factor 2, simulated mobile throttling
- Assertion aggregation: `pessimistic` (the worse of both runs must pass)

## Clearance Changes

- Google Fonts and application stylesheets load without blocking the loading-shell paint.
- Critical loading and title-screen layout CSS is inlined in `index.html`.
- Full operator walk atlases are absent from the boot manifest; only the selected class is requested after deployment.
- Phone-width clients use the existing 25 KB `menu_bg.webp`; desktop retains `title_key_art_v2.webp`.
- The Lighthouse first-paint probe avoids importing the full game graph that it never executes.
- `.github/workflows/lighthouse.yml` runs both desktop and mobile configurations.

## Reproduction

```bash
npm run build
CHROME_PATH=/usr/bin/google-chrome npx lhci autorun --config=./lighthouserc.mobile.json
```

The raw local reports are intentionally not committed because `.lighthouseci/` is generated output. The durable thresholds, run count, viewport, and pessimistic aggregation live in `lighthouserc.mobile.json` and are regression-tested by `src/mobileLighthouseGate.test.js`.

## Repository Verification

- `npm run lint`: passed.
- `npm test`: 762 files and 6,473 tests passed.
- `npm run i18n:audit`: passed with zero unlocalized runtime strings.
- `npm run audit:docs`: passed.
- `npm run build`: passed; required media audit passed.
- Targeted Playwright run: 7/7 HUD layout and deferred-screen probes passed.
- Generated catalog, soundtrack, chroma-key, and economy-icon checks passed.
- `npm run presubmit` remains blocked by the pre-existing retail-asset baseline: stale generated retail reports, public payload above 5,557,452,800 bytes, more than 160 unknown assets, and more than 140 duplicate groups. No retail payload was changed as part of this clearance.
