# Expedition coherence and presentation execution plan

Date: 2026-09-09. Baseline: `93ff756`, clean `dev/sprint-33`, version 2.3.2-beta.
Owner: repository maintainers / Codex implementation. This is an execution supplement to the canonical Sprint 30 acceptance program, not a replacement release gate.

## Review method and current truth

Inventoried all 380 tracked Markdown documents (75,200 lines, 587 unchecked historical checklist entries). Indexed titles, open tasks and gap/placeholder/presentation signals, then read the canonical status, roadmap, active acceptance plan, design pillars, Proof Run, combat plan and September reports against their actual runtime call sites. Historical checkboxes are not 587 current defects. Documentation has lagged behind merged code and contains mutually contradictory completion claims.

- Patches are finished in `ff14ea8`: five illustrated RGBA designs, shallow physical backing, torso parenting and depth occlusion. Preserve this work.
- Depth elites are connected through `eliteEnemies.js`; wounded enemies no longer receive elite loot. The Product State claim of no consumer is stale.
- Foxhole, Hacker and Chrysalis have live, persistent companion contracts. Three other families have no offered contract. The blanket no-runtime-caller claim is stale.
- Ten reward items are live; nine inert catalog entries are withheld. Eight transformative relics work. Synergy descriptions still promise two absent effects.
- Run reset exists, but occurs after vitals reconstruction. Pending world relics are not cleared. Duplicate equips can compound costs and benefits.
- The director receives `o2Frac` but ignores it; the caller divides by 100 instead of current maximum capacity.
- Tilt-shift's seven weights sum to 1.30; two passes amplify constant color to 1.69 before other display transforms. Blur begins almost immediately outside the focus line and is resolution/aspect dependent.
- Bullet impacts are four flat discs; world relics are a flat shared glow geometry. Pickup disposal also disposes that shared geometry.
- Branch name is `dev/sprint-33`, but documentation still calls the acceptance milestone Sprint 30. Record both honestly rather than silently inventing a new completed sprint.

## Player-facing target

Prepare with a clear purpose, establish oxygen security, discover a reason to descend, form a build, feel a readable escalation, and return with a consequence. The story remains about custody of the changing body; each crossing invites a choice rather than simply announcing numbers. Death should teach a next attempt. Relics must deliver useful, unique run decisions. The miniature look should strengthen scale and atmosphere while keeping the operator and aiming lane readable.

## Ordered implementation

### E1 — trustworthy run boundaries and rewards (P1)

Clear run-only equipment and pending pickups before reconstructing vitals on a full reset. Preserve gear on a non-reset respawn. Dispose only owned VFX resources. Reject duplicate/inert equipment before applying side effects; exclude equipped and pending items from reward rolls. If a rarity is exhausted, choose another implemented unowned item; if the entire pool is exhausted, return no gear. Do not alter banked currency, cosmetics, companion progress or drop chance. Remove active synergy claims until their effects actually exist.

Acceptance: costly relic cannot reduce the next run's oxygen, repeated equips cannot charge twice, no prior-run pickup survives, no owned/inert roll, no invented combo announcement. Regression tests exercise actual ThreeGame methods.

### E2 — oxygen-aware pressure and narrative payoff (P1/P2)

Use current oxygen capacity to judge remaining reserve. At critical oxygen, suppress extra director harassment while normal world danger and oxygen drain remain; preserve low-health mercy. Add concise, contextual crossing guidance and a factual debrief explaining temporary build loss, retained banked progress and the next practical action. Use existing notifications/report surfaces, no extra blocking modal or competing objective system.

Acceptance: capacity-changing builds get the same pressure decision at the same oxygen fraction; safe fields remain safe; crossing guidance varies with oxygen; death and victory copy differ and never promises unbanked loot is retained.

### E3 — strong, readable tilt-shift and faithful lighting (P1/P2)

Normalize blur weights to conserve brightness. Define a genuinely sharp central band that includes both operator and aim lead, with smoothly stronger edge blur. Use pixel-based offsets corrected for both viewport axes. Keep perspective aiming legible and preserve loading/adaptive-performance exclusions. Concurrent presentation work enables focus in both cameras; retain that policy while protecting the operator and aim band. Preserve existing lighting colors/exposure; fix the accidental brightening before arbitrary light increases.

Acceptance: constant-color render is unchanged after both passes, operator/aim lie in protected band, landscape and handheld resolutions have consistent blur radius, no shader errors. Compare real browser captures. Actual hardware frame-pacing sign-off stays open.

### E4 — replace two visible placeholder effects (P2)

Replace flat bullet discs with short directional spark shards and an expanding contact ring, with bounded geometry/lifetime and no added point lights. Replace flat relic markers with distinct 3D overclock/relic cores, an orbit ring and a thin rarity beacon; animate subtly and use proper depth occlusion. Preserve existing pickup distance and rarity colors, while shape also distinguishes type.

Acceptance: effects are visible from perspective/isometric views, cleanly expire/collect/reset, do not dispose shared geometry, and introduce no external media payload. These are finished procedural effects; this does not claim bespoke enemy, weapon or ending models were produced.

### E5 — evidence and documentation reconciliation (P1)

Run focused regression tests, full suite, lint, build/media, generated presubmit and docs audit. Exercise actual game loading, Armory to deployment, gear pickup, reset, crossing, both camera modes and visual effects in browser. Update Product State and link the plan/report from maintained indexes. Record failures and limitations without promoting automation to human proof.

## Following production work, in dependency order

1. **35–45 minute Proof Run:** a fresh player identifies purpose by minute 1, explains oxygen and the first crossing, uses three contrasting builds, identifies three enemy verbs, and explains loss/retention at the end. Record confusion at 5/15/45 minutes. Owner: maintainer/playtester; schedule next packaged playtest. Tune pressure/rewards from observed deaths and choices rather than guessing that code changes establish fun.
2. **Companion consequences:** implemented September 10 for Corpo, Crash Queen and Tripper using existing terminal, camp-job and depth events. Individual progress survives companion switches; completed work changes reunion dialogue. See the [continuation report](../reports/companion-contract-continuation-2026-09-10.md). Human pacing and balance acceptance remain open.
3. **Build expansion:** implement the nine withheld effects one at a time with actual damage/status/network consumers, caps, interaction/removal/reset tests and distinct feedback. Only then restore their pool flags and synergy claims. Prioritize cryo slow and shock interaction because they can support existing class verbs.
4. **Enemy readability:** elite audio cue, pre-attack tells, armor/exposed grammar and death silhouettes; prove fairness at normal zoom with reduced VFX. Avoid more particles masking hostile tells.
5. **Art completion:** five reward models and finished Talon-C remain genuine model-production tasks; review camp/hive dressing, corpse states and most-reached ending stills in context. Existing assets must pass framing, provenance and payload gates before more bulk generation.
6. **Lighting/hardware:** physical Deck 1280×800 and desktop 16:9; compare isometric miniatures versus perspective threat readability, darkest biome navigation, color-independent cues, real GPU timing and dense combat. Capture before/after at fixed camera/exposure; preserve adaptive fallback.
7. **Release acceptance:** two-account Steam expedition, reconnect/host migration, two-machine Cloud and packaged crash/recovery. No web/unit result certifies these. Owners: maintainer with devices/accounts. Keep commerce, store claims and publishing outside this implementation.

## Completion ledger

E1–E5: implemented and checked. See [implementation evidence](../reports/expedition-coherence-2026-09-09.md) for test counts, real-browser capacity/reset results, constant-color shader readback, screenshots and concurrent-edit limitations. Following production items remain open acceptance/content work until their named evidence exists.


## September 10 continuation — companion consequence slice

User authorized continuation. Scope: finish the three withheld companion contracts against existing events, preserving current graphics work. Corpo: decrypt two distinct terminals, then complete a camp assistance job (Severance Package). Crash Queen: complete two distinct camp assistance jobs (Beacon in the Dark). Tripper: cross two distinct depth tiers, then decrypt a terminal to relay the route (VIP Access). Rewards: 16, 16 and 14 banked shells respectively; no unsupported new item/model promises. Add individual completion dialogue and next-stage feedback.

Persist partial progress and deduplication receipts per contract when switching companions; migrate existing saves; resume without duplicate rewards. New depth progress must come from actual gameplay crossings, not title preview or forced HUD re-announcements. Only the active companion's events count. Reconcile active objective rows when companions change.

Verification: staged/out-of-order/repeated-event tests, save/reload/switch tests, old-save migration, bank idempotency, actual ThreeGame crossing/tracker wiring, full tests/lint/build/presubmit/docs. The fresh-player Proof Run remains open; this continuation implements the existing-interaction slice without claiming its pacing accepted.

September 10 outcome: all six families offer live contracts; new staged contracts, migration, separate progress/replay receipts, banked rewards, HUD switching and reunion dialogue are implemented. Automated results and remaining acceptance are recorded in the continuation report.


## September 10 continuation — elite contact and Carapace Membrane

Implement the first-contact warning for nearby promoted elites: screen-frustum and wall checks, no friendly/dead/display/boss contacts, twice-per-second eligibility scans, twelve-second global cadence, one warning per enemy per run. Provide a text suit cue independently of muted audio, and a short two-tone procedural SFX-bus warning with released audio nodes. No new asset payload.

Activate Carapace Membrane only with its runtime consumer and tests. Bio-slime means actual slime scatter or an active toxic-spore footprint, not rainwater or hazards on another floor. Health uses whole hearts, so carry 30% protection forward and spend only whole hearts; ten one-heart attacks must cost seven hearts. Apply after shields, exclude oxygen depletion/falls/abyss/Queen's Milk backlash, clear credit on removal and run reset, and preserve the attack cooldown on a fully absorbed hit. Local victim-side mitigation naturally applies to received multiplayer hits without inventing shared enemy status.

Remaining: eight withheld relic/overclock effects, real elemental synergies, other enemy tells, five reward models and finished Talon-C, environment/ending review, Proof Run and hardware/Steam acceptance. These are still open; this continuation does not complete the overall plan.
