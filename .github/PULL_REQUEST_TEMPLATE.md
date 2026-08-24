## Summary

<!-- What changes, and what player/repository problem does it solve? Keep this outcome-oriented. -->

Fixes # (issue, when applicable)

## Scope

### Type of change

- [ ] Bug fix
- [ ] Player-facing feature/change
- [ ] Platform / Steam / multiplayer
- [ ] Performance / reliability
- [ ] Refactor / ownership extraction
- [ ] Asset / content / audio / 3D
- [ ] Documentation / release governance
- [ ] Breaking change / migration

### Explicit non-goals

<!-- What nearby work is intentionally NOT part of this PR? -->

-

## System ownership & runtime wiring

Read `docs/architecture/system-map.md` for the current domain map.

- **Canonical state owner:**
- **Producer / command / event that changes it:**
- **Live runtime consumer:**
- **Persistence boundary (if any):**
- **Multiplayer authority (if applicable):**
- **Old/replaced path removed or intentionally retained:**

<!-- If this is docs/assets only and fields are N/A, say so. Do not leave a gameplay module's consumer implicit. -->

## Evidence reached

Check only the highest states actually demonstrated by this PR. “Coded” is not “done.”

- [ ] **Designed** — spec/decision exists
- [ ] **Coded** — implementation exists
- [ ] **Connected** — live runtime calls/consumes it
- [ ] **Tested** — automated assertions cover it
- [ ] **Live-verified** — observed in a running development build
- [ ] **Packaged-verified** — observed in packaged Electron/Steam-target build
- [ ] **Accepted** — promised player/hardware/account route passed

**Highest honest evidence state:**

## Verification performed

### Automated

- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run presubmit`
- [ ] `npm run build`
- [ ] `npm run coverage` where appropriate
- [ ] targeted / full `npm run test:e2e` where appropriate
- [ ] other targeted audit/test:

### Environment-specific / human

Check only what this change actually requires and what was actually run.

- [ ] Browser/dev live verification
- [ ] Packaged Electron verification
- [ ] Steam-launched installed build
- [ ] Two real Steam accounts
- [ ] Production backend/service
- [ ] Steam Cloud round trip
- [ ] Physical Steam Deck / 1280×800
- [ ] Physical desktop GPU performance route
- [ ] Controller-only route
- [ ] Human visual/audio acceptance
- [ ] New-player / first-hour acceptance
- [ ] Not applicable

### Reproduction / acceptance route

<!-- Exact route, build/commit, hardware/account context, and expected outcome. Link dated docs/reports evidence for ship gates. -->

1.

## Performance / lifecycle impact

- [ ] No new per-frame/per-shot/per-particle allocation path, or measured/justified
- [ ] GPU objects/materials/textures have explicit reuse/disposal where applicable
- [ ] No new synchronous package/world/asset work on a critical gameplay frame, or measured/justified
- [ ] Save/checkpoint/reconnect behavior considered where state changed
- [ ] Not applicable

## Multiplayer / Steam trust boundary

- [ ] Client data is not treated as server-authoritative where it should not be
- [ ] Steam lobby metadata is not used as damage/grant/result authority
- [ ] Secrets/publisher keys/tokens remain outside renderer/repository
- [ ] Store/platform claim matches the evidence level reached
- [ ] Not applicable

## Asset / AI / provenance

If this PR adds or materially changes player-facing or marketing art/audio/3D/video/content:

- [ ] `ASSET_PROVENANCE.md` / relevant provenance ledger updated
- [ ] creator/source/method recorded
- [ ] commercial-use/license basis recorded where required
- [ ] generative-AI / AI-assisted status recorded where applicable
- [ ] source/master and runtime derivative are distinguishable
- [ ] package path audited where applicable
- [ ] Not applicable

## Documentation impact

- [ ] `PRODUCT_STATE.md` updated if current truth changed
- [ ] `README.md` updated if public setup/status/claim changed
- [ ] active sprint evidence matrix updated if sprint state changed
- [ ] release roadmap/release notes updated if release state changed
- [ ] historical docs preserved/classified rather than rewritten as current truth
- [ ] no documentation change required

## Integration audit

Before merge for a cross-system or sprint integration PR:

- [ ] orphan-module check performed
- [ ] producer/consumer wiring checked
- [ ] declared telemetry/events confirmed to emit from real paths
- [ ] duplicate/legacy owner path checked
- [ ] cross-lane dependencies verified
- [ ] not a cross-system integration PR

## Known gaps / carry-forward

<!-- Anything not accepted must be explicit. If a required environment could not be exercised, say so here rather than implying completion. -->

-

## Reviewer focus

<!-- Name the 1–3 places most likely to hide a regression or false-complete state. -->

-
