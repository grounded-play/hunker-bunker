# Sprint 29 — Agent Lane Assignment (Claude / Codex / Gemini)

**Date:** 2026-08-24
**Parent plan:** `docs/sprint-29-visual-feedback-and-presentation-fix-plan-2026-08-24.md` (§17 defines Lanes A/B/C; this doc binds each lane to an agent, names file ownership, and fixes the shared contracts.)
**Branch:** `dev/sprint-29`

## 1. Assignment

| Lane | Agent | Scope | Why this agent |
|---|---|---|---|
| **A — UI, reticle, menus, XP, reward-reveal shell** | **Claude** | Plan §1, §3 (selection logic), §6, §7 (shell + grant idempotency) | Already owns the season/inventory runtime from Sprint 28 (`itemOwnership.js`, `armoryOptions.js`, `armoryUi.js` wiring). The reveal shell hangs off grant confirmation, so shell + grant idempotency must sit in one head. |
| **B — Rendering, lighting, FX depth, weapons, charms** | **Codex** | Plan §2, §5, §7 (3D preview), §8, §9 | Convention from prior lane splits: Codex takes rendering/platform/pipeline hardening. Also lands the 3D-asset work continuing commit `34fbc5a`. |
| **C — Audio, combat telemetry, locomotion, verification** | **Gemini** | Plan §4, §10, §13, §14, §18 final route | Convention: Gemini takes input feel, audio, verification and capture docs. Locomotion glide is a feel problem judged by capture, not by unit test. |

Deviation from the plan's §17 text: the **chroma-green 2D audit (§4) moves from Lane B to Gemini**. It is a scripted scan + build audit + visual sweep, not three.js work, and Lane B is already the heaviest lane (lighting + perf + previews + weapon scale + charm sockets).

## 2. File ownership matrix

Exclusive owner = only that agent edits the file this sprint. Shared files are split by *seam*, listed below.

### Claude (exclusive)
- `index.html` — HUD/reticle/menu/reveal markup
- `style.css` — reticle, XP, menu, reveal layering (owns all z-index/stacking-context decisions)
- `src/seasonPassUi.js`, `src/seasonPass.js`
- `src/itemOwnership.js`, `src/armoryOptions.js`, `src/armoryUi.js`
- New: `src/reticleState.js`, `src/xpFeedback.js`, `src/rewardReveal.js`, `src/presentationTelemetry.js`

### Codex (exclusive)
- `src/threeGame.js` (30k lines — nobody else touches it; route requests through Codex)
- `src/baseLights.js`
- `src/armoryScene.js` — including the charm socket bug at `src/armoryScene.js:340-342`, where **one hardcoded `charmSocket.position.set(0.18, -0.05, 0.06)` is reused for every weapon**. That is the root cause behind plan §9; fix it with a per-archetype socket registry, not per-charm offsets.
- New: `src/weaponCalibration.js`, `src/charmSockets.js`, `src/rewardPreview.js`

### Gemini (exclusive)
- `src/audio.js`
- `scripts/` — new chroma-green/alpha audit script
- `tests/e2e/**` — all Playwright specs and capture routes
- `docs/` verification reports and before/after capture notes

### Shared files — seam rules

**`main.js` (13.5k lines).** All three lanes must edit it. Rules:
- Keep every edit inside a *named seam* and put logic in your own module — `main.js` gets wiring only, never new subsystems.
- Claude: HUD/reticle wiring, menu open/close, XP hooks, the claim handler.
- Codex: renderer/adaptive-quality and lighting wiring only.
- Gemini: audio routing and weapon-fire instrumentation only.
- Never reformat, reorder imports, or "tidy" adjacent code. Rebase before pushing; merge conflicts here are the sprint's main schedule risk.

**`src/player3dOverlay.js` (597 lines) — split by function:**
- Codex owns: `WEAPON_ARCHETYPES`, `WEAPON_SKIN_MESHES`, `CHASSIS_SKIN_MODELS`, `createClassWeapon`, `normalizeModel`, and the weapon position/scale constants (plan §8).
- Gemini owns: `selectOverlayAnimation`, `selectLocomotionActionName`, `computeLocomotionWeights`, `INJURED_LOCOMOTION_VARIANTS`, `makeClipInPlace`, `retargetMixamoClip`, and mixer timeScale (plan §10).
- Neither edits the other's functions. If both need the file in the same window, **Codex lands first**, Gemini rebases — weapon scale changes the rig proportions locomotion is tuned against, not the reverse.

**`src/debugConsole.js`** — Claude only, and only to register new telemetry categories.

## 3. Shared telemetry contract — Claude lands this first, day 1

Every event in the plan's §16 "instrumentation gaps" goes through the existing `debugLog` (`src/debugConsole.js:1162`, exposed as `window.hbLog`). To stop three lanes hand-rolling event names into `main.js`, **Claude publishes `src/presentationTelemetry.js` before anyone else starts**: event-name constants plus thin emit helpers for all three lanes. Codex and Gemini import it rather than calling `debugLog` directly.

Categories to reserve:

| Category | Events | Emitted by |
|---|---|---|
| `RETICLE` | `state`, `hidden-reason`, `target`, `screen-pos` | Claude |
| `MENU` | `open`, `close`, `visibility-snapshot`, `input-blocked` | Claude |
| `XP` | `gain`, `aggregate`, `ui-show`, `ui-hide`, `sound`, `cleanup` | Claude (UI) / Gemini (sound) |
| `REWARD` | `claim-start`, `grant-confirmed`, `reveal-open`, `preview-ready`, `preview-failed`, `burst-fired`, `audio-fired`, `reveal-close` | Claude (shell) / Codex (preview, burst) / Gemini (audio) |
| `LIGHTING` | `snapshot`, `tier-change`, `light-dropped` | Codex |
| `WEAPON` | `fire-input`, `shot-accepted`, `shot-blocked`, `projectile` | Gemini |

`captureMenuRenderSnapshot()` (`main.js:13110`) currently returns `null` unless `performanceProfile === 'menu'` — which is exactly why log16 could not distinguish a hidden menu from a missing one. **Claude extends it to emit on demand regardless of profile.**

## 4. Cross-lane interfaces (publish before implementing against them)

1. **Reveal shell ↔ 3D preview (Claude ← Codex).** Codex exports from `src/rewardPreview.js`:
   `mountRewardPreview({ container, itemId, category }) -> { ready: Promise, dispose() }`, resolving to `{ ok: true }` or `{ ok: false, reason }`. Claude's shell renders the honest "preview unavailable" state on `ok: false` and always calls `dispose()` on close. Claude ships a stub of this signature on day 1 so Lane A is never blocked.
2. **Reward-family endings (Claude ← item defs).** The ending is selected from the item definition, never from a generic completion callback (plan §3). Claude owns the selector; Codex owns whatever hero-beat the 3D layer performs for it.
3. **Audio hooks (Claude/Codex ← Gemini).** Gemini publishes the sting names; Claude and Codex fire them by name through `presentationTelemetry` — no direct `audio.js` calls from UI or render code.
4. **Burst layering (Claude ↔ Codex).** Claude owns the DOM stacking contract (`style.css`); Codex owns depth test/write/render order if the burst is three.js. **Decide which one the burst actually is before either starts** — plan §5 leaves it open, and both fixing it independently is the likeliest way to waste a day.

## 5. Sequencing

- **Day 1 (all, read-only + contracts).** Each agent reproduces its symptoms and records the exact files/functions it will own. Claude lands `presentationTelemetry.js` + the `rewardPreview` stub. Codex answers the burst DOM-vs-three.js question. Gemini publishes audio event names.
- **Phase 1.** Claude: reticle + menu visibility + XP event lifecycle. Codex: lighting movement-route diagnosis (compare against adaptive-quality state — log16's 970 dropped frames and 1.34s long tasks make perf a credible cause, so don't treat lighting as an isolated art bug). Gemini: weapon-fire instrumentation, which answers whether log16's canvas clicks are producing shots at all.
- **Phase 2.** Claude reveal shell + endings; Codex burst depth + turntable; Gemini audio stings. This is the tightest coupling window — integrate daily.
- **Phase 3.** Codex weapon scale + charm sockets; Gemini chroma-green audit.
- **Phase 4.** Gemini owns final validation matrix (plan §13) and the before/after captures at desktop 16:9 and 1280x800.

## 6. Per-lane done

A lane is done when its events fire exactly once per user-visible action, its failure states show up in telemetry rather than as stale UI/audio/models, its tests pass, and it passes the plan §18 final verification route. Art blockers get named by item ID — never silently rendered as complete.
