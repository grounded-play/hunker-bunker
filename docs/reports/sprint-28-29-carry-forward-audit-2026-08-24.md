# Sprint 28–29 Carry-Forward Audit

**Status:** Current audit / Sprint 30 input

**Last verified:** 2026-08-24

**Evidence base:** current `dev/sprint-30` branch, Sprint 28/29 plans and closeout material, PR #40 / PR #43, current runtime call sites, and `PRODUCT_STATE.md`.

## Purpose

Sprint 28 and Sprint 29 both produced substantial real work, but their original plans and their merged outcomes were not identical. This audit prevents planned-but-unaccepted work from disappearing merely because a sprint number advanced.

Use the project evidence vocabulary consistently:

**Designed → Coded → Connected → Tested → Live-verified → Packaged-verified → Accepted**

A later implementation may invalidate an older gap. Conversely, an automated test does not close a human, hardware, Steam-account, or packaged-build acceptance promise.

## Executive carry-forward

The largest remaining debt is not missing feature count. It is **acceptance and runtime convergence**:

1. Real two-account packaged Steam co-op certification has survived several sprint boundaries without acceptance evidence.
2. Real packaged desktop / Steam Deck visual and frame-pacing sign-off remains open.
3. A human Proof Run / first-hour comprehension route remains unaccepted.
4. Wanderer quest data exists but quest advancement is not connected to normal gameplay.
5. Steam Cloud is wired but still lacks a recorded real two-machine round-trip in repository evidence.
6. Several older Steam/commercial docs still describe superseded product assumptions, including mandatory real-money economy, Fly.io production deployment, LAN claims, and a retain-every-feature review strategy.
7. Asset provenance/governance has not kept pace with the current 3D/audio/generated-asset footprint.

## Carry-forward ledger

| Area / original promise | Current evidence | Highest honest state | Sprint 30 disposition |
|---|---|---|---|
| **One More Ring / Depth Contract** | O2 pressure, crossing deltas, salvage multiplier, and director aggression are runtime-wired. `eliteSpawnChance` still has no runtime consumer outside the Depth Contract module/tests/design docs. Human readability of the risk/reward decision remains unaccepted. | **Connected/Tested**, partial design contract | Keep player-readability acceptance in Proof Run. Track elite promotion as an explicit optional gap; do not describe the entire design table as fully consumed. |
| **Transformative relic set** | All 8 named Sprint 28 relics are now runtime-wired after incremental follow-up work. | **Connected/Tested** | Do not add more merely for count. Human build-identity / balance acceptance remains part of Proof Run. |
| **Packaged gameplay performance** | GPU timing/memory diagnostics and multiple optimizations exist. Earlier real packaged logs demonstrated severe frame-pacing stalls. Later sandbox investigations had SwiftShader limits. Sprint 29 added presentation/perf instrumentation but did not close physical packaged acceptance. | **Instrumented/Tested; partially live-verified** | **P0:** capture same-route packaged physical-hardware evidence; fix measured blocker rather than assuming KTX2/Basis is the answer. |
| **KTX2/Basis texture compression** | Named repeatedly as a likely memory optimization; no verified shipped pipeline in current Product State. | **Designed/Research** | Measure first. Implement only if texture upload/memory is still a dominant physical-hardware bottleneck; otherwise document deferral. |
| **35–45 minute Proof Run** | Sprint 28 explicitly required one excellent end-to-end expedition and human acceptance. Current repo contains many supporting systems but no completed human Proof Run report was found. | **Designed** | **P0:** execute a complete route and write a dated acceptance report. |
| **First-hour comprehension** | `docs/first-hour-acceptance-plan.md` exists; repository search still resolves to plans rather than a completed blind-player evidence artifact. | **Designed** | Combine with Proof Run / newcomer test. Do not mark onboarding complete from E2E automation alone. |
| **Combat feel** | Existing hit feedback, boss grammar, stagger work, Sprint 29 reticle/dry-fire/audio/locomotion polish are real. The broader combat-feel plan was never equivalent to a human feel pass. | **Connected/Tested**, human acceptance open | **P1:** representative Scout/Tank/Engineer human combat pass; tune only observed problems. |
| **Wanderer/companion encounters** | Six archetype families, dialogue, companion data, buffs and assist behavior exist. | **Connected/Tested** for encounters/companions | Preserve. |
| **Wanderer quest progression** | Quest definitions and `advanceQuest()` exist, but current code search finds no non-test runtime caller. | **Coded/Tested, not Connected** | **P1 / Sprint 30 Lane D:** map objectives to game events, persistence, rewards and UI; live-verify one complete family. |
| **Mid-run crash recovery** | `runCheckpoint.js` shipped in Sprint 28 and current Product State records it as active. | **Connected/Tested** | Resolved as implementation debt; still exercise during release-candidate smoke routes. |
| **Steam Lobby create/invite/join** | Native Steam Lobby wrapper is connected; lobby metadata remains party/discovery only while relay is authoritative for gameplay. | **Connected/Tested; partial live evidence** | Keep current architecture; finish real-account acceptance rather than redesign. |
| **Cross-region public lobby browse** | Earlier two-machine investigation documented Steam's default region filtering and the installed `steamworks.js` binding's missing distance-filter control. Current `steamLobbyClient.js` still delegates listing directly to the Electron Steam API and contains no backend public-discovery fallback. | **Known limitation** | Do not hide this inside a generic "browse implemented" claim. Decide whether launch needs worldwide public browse; Friends/Invite can remain the primary social path, or add backend discovery if required. |
| **Two-real-Steam-account co-op** | Has been an acceptance criterion since the Steam multiplayer work. No current repository report demonstrates the full packaged production route through extraction/results. | **Not Accepted** | **P0:** package → Steam auth → invite/join → ready/deploy → meaningful combat → reconnect/host case → extraction → results/stats/save. |
| **PvP** | Functional server-computed damage path exists; remains experimental and not a premium-launch core pillar. | **Connected/Tested; limited acceptance** | Keep subordinate. No ranked/competitive expansion in Sprint 30. |
| **Steam auth production service** | Self-hosted Docker/Caddy backend at `steam.tuesdaycinema.club` has health evidence. Older Fly.io plans remain in repo. | **Live service health verified** | Document deployment truth and secret-recovery procedure; classify Fly path as legacy unless intentionally retained. |
| **Steam Cloud** | Game-side save bridge is connected and stats sync is implemented. | **Connected/Tested** | **P0 release gate:** real Machine A → Cloud → clean Machine B → change → Machine A round-trip evidence. |
| **Steam review remediation** | Old Aug 14 docs describe a retain-all-features strategy, LAN claims, mandatory IAP, and reviewer content assumptions that no longer safely represent current product direction. | **Historical plan** | Create one current Steam review/status ledger. Mark old remediation docs Historical/Reference rather than silently editing their history. |
| **Real-money IAP / Cache Keys / Community Market** | Older `steam-v1-product-brief.md` calls them mandatory launch features. Later premium-game strategy deemphasized live-service breadth, and prior Valve review blocked an unavailable Store flow. Current commercial decision is not expressed as one canonical policy. | **Conflicting product policy** | **Decision required before next Steam review:** explicitly launch-with vs defer/remove claim. Do not let old docs choose by inertia. |
| **Full Controller / Steam Deck** | Substantial runtime and Steam Input work exists, including right-stick pointer/twin-stick aim. Sprint 29 automated checks do not substitute for the full physical controller-only route. | **Connected/Tested; physical acceptance open** | Fold into packaged desktop/Deck acceptance route. |
| **Accessibility** | Reduced-motion is partial; colorblind support has undergone multiple wiring corrections; subtitles/captions and complete text-scale evidence are not established. | **Partial** | **P1:** explicit accessibility acceptance matrix. Do not market a toggle as support without live verification. |
| **Localization** | No project-wide string externalization/i18n runtime found. | **Not started** | Decide architecture before RC; broad translation itself can remain later. |
| **3D/Armory asset expansion** | Sprint 28 integrated 46 community/Season assets; Sprint 29 integrated additional runtime assets and presentation calibration. | **Connected/Tested; visual acceptance open** | Freeze broad asset-family expansion until packaged visual/perf acceptance. Treat backlog as catalog, not ship gate. |
| **Asset provenance** | Root `ASSET_PROVENANCE.md` currently covers a small subset of the asset footprint compared with current GLB, generated-art, synthesized-audio and marketing pipelines. | **Incomplete governance** | **P1/P2:** establish structured provenance ledger with creator/source/method/license/AI/retail status; unknowns must be explicit. |
| **E2E startup** | Sprint 29 recorded feature assertions that passed alongside runs that failed before gameplay readiness. | **Partial / flaky** | **P1:** one authoritative app-ready signal and deterministic fixtures. Separate harness failures from feature failures. |
| **Runtime monoliths** | `main.js`, `style.css`, `index.html`, and especially `src/threeGame.js` continue to concentrate unrelated ownership. | **Known architecture risk** | Map ownership now; at most one low-risk extraction in Sprint 30 after P0 gates. No rewrite. |

## Documentation that should not remain current authority

These documents may remain useful historical evidence, but they should not be used as current ship instructions without reconciliation:

- `docs/sprint28plan.md` — excellent evidence/reasoning; historical sprint plan after Sprint 28 closeout.
- `docs/sprint29plan.md` and Sprint 29 working plans — planned scope diverged materially from merged PR #43.
- `docs/steam-review-failures-and-action-plan.md` — original August 14 remediation plan, including assumptions later invalidated.
- `docs/steam-review-remediation-master-guide.md` — later than the original plan but still carries old retain-all-features/LAN/IAP strategy and should be superseded by a current review-status ledger.
- `docs/steam-v1-product-brief.md` — July scope lock says co-op is out of scope while real-money cache keys/Community Market are mandatory and Fly.io is production; current game/repo has materially diverged.
- `docs/sprint25.checkin.md` — design transcript/source material, not product truth.

Historical documents should get explicit headers or move to `docs/archive/` in link-safe batches. Preserve their point-in-time reasoning; do not rewrite history to make them look retrospectively correct.

## New Sprint 30 decisions required

### Commercial identity

Record one canonical answer to each:

- Is launch a premium solo/co-op game with optional Steam inventory/cosmetics, or does launch require a live real-money economy?
- Is PvP a supported experimental side mode or a co-equal store promise?
- Is worldwide public matchmaking required at launch, or are Steam Friends/Invite + party play sufficient?
- Which mature-content survey boxes correspond to content the team actually wants to ship, rather than content added to justify a prior checkbox?

### Release evidence

For every Steam/store claim, name the proof route and evidence owner. A claim with no accepted proof route should be removed/deferred or explicitly remain a blocker.

## Recommended Sprint 30 carry-forward order

1. **Two-account packaged Steam certification.**
2. **Physical packaged performance + visual route.**
3. **Human Proof Run / first-hour comprehension.**
4. **Wanderer quest runtime connection.**
5. **Steam Cloud real round-trip.**
6. **Current Steam review/store-claims ledger and commercial-scope decision.**
7. **Asset provenance/deployment truth.**
8. **E2E readiness + small architecture ownership extraction.**
9. **Accessibility/localization architecture.**
10. **Only then consider new breadth.**

## Closeout rule

Every unresolved row above must end Sprint 30 with one of four explicit dispositions:

- **Accepted** — evidence exists;
- **Carry forward** — still needed, with priority and acceptance route;
- **Deferred** — intentionally outside the near-term ship target;
- **Cut / invalidated** — no longer part of the product promise.

No fifth state of "it was in an old sprint plan and we stopped mentioning it."
