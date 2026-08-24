# Sprint 29 — Lane A Plan (UI, reticle, menus, XP, reward-reveal shell)

**Agent:** Claude · **Branch:** `dev/sprint-29` (v2.3.1-beta) · **Date:** 2026-08-24
**Scope:** plan §1, §3 (ending *selection*), §6, §7, plus the silent-refusal P0 row added after the second-pass log review.
**Baseline:** `npm test` → **246 files / 2,031 tests green**, 20.2s. Clean starting point; any failure I introduce is mine.

## 1. Reproduction results — what is still broken versus already fixed

log16 is a packaged **v2.2.0** build; this branch is **2.3.1-beta**. Everything below was re-checked against current source rather than inherited from the log.

### Already fixed — do not re-solve

| Item | Evidence |
|---|---|
| **Menu isolation / world-reactive mouse under modals** | `handleCanvasPointerMove` gates on `isGameplayInputActive()` → `hasBlockingGameplayOverlay()` (`src/threeGame.js:5080-5106`), covering ~20 named modal IDs plus a generic `.modal:not(.hidden)` catch-all. `docs/log2-ui-transitions-and-menu-isolation-plan-2026-08-19.md` §3 already enumerated all 49 modals in `index.html` and found no gameplay-time modal uncovered. Both leading hypotheses were ruled out there. **Plan §1's menu-isolation task is largely closed**; what remains is a suspected one-frame staleness gap, which needs a live repro, not more static reading. |
| **Reticle z-order above the canvas** | `#gameplay-crosshair` sits at `z-index: 210000` (`style.css:3716`); modals and loaders occupy 250000+. The stack is already correct — the reticle is above the world and below blocking UI, exactly as §1 requires. Layering is **not** the bug. |
| **Tier-up ceremony, XP bar, particle burst, claim persistence** | Landed 2026-08-23 (`docs/armory-vault-progression-audit-2026-08-23.md`, follow-up section). `src/seasonPassUi.js` has `ensureProgressionCeremony()`, `queueProgressionCeremony()`, `showNextProgressionReward()`, an animated `#progression-xp-bar`, an 18-particle `.progression-reward-burst`, and stable selectors. log16 predates all of it. |
| **Claim duplicate-grant protection** | `claimProgressionReward()` guards on `progressionCeremonyActive` and runs synchronously, clearing the flag before returning; a double-click's second call short-circuits. `seasonPass.claim()` returning falsy is a second guard. **Plan §7's "duplicate protection" is already satisfied** — I will add a regression test rather than a mechanism. |

### Still broken — confirmed on this branch

**A. The reticle only appears after the first mouse movement.** `#gameplay-crosshair` ships with `class="hidden"` (`index.html:107`) and the *only* thing that clears it is `updateGameplayCrosshair()` (`main.js:1654`), called from three places: the `mousemove` handler (`main.js:12191`), the Steam controller poll (`main.js:1693`), and the canvas pointer-move handler (`src/threeGame.js:5254`). All three are movement-driven. **Entering gameplay and pressing WASD without moving the mouse leaves the player with no reticle at all.** Nothing centers or reveals it on gameplay entry. This is the single most likely explanation for "the crosshair is invisible" and it is a real defect, not a v2.2.0 artifact.

**B. `mix-blend-mode: screen` erases the reticle on bright backgrounds.** `style.css:3719`. Screen-blending the default `#ff9f1c` over a bright floor or lit cave wall drives it toward white and it vanishes. This is precisely §1's "being rendered in a color that disappears against the scene," and it also creates a stacking context as a side effect.

**C. Reactive crosshair states do not exist.** Not broken — *absent*. `style.css` defines `.gameplay-crosshair` plus `__dot`, `__ring`, `__tick`, and exactly one state class, `.hidden`. There is no hostile, interactable, pickup, or blocked modifier anywhere in CSS or JS. All of §1's reactive-state requirement is greenfield.

**D. The reticle tracks the mouse, not the aim ray.** Under pointer lock the canvas handler recenters it (`src/threeGame.js:5226-5234`) but only inside `if (movementX || movementY)`, so nothing centers it at the moment lock is acquired. Outside lock it is pinned to raw `clientX/clientY`. §1 requires it to follow the actual aim ray.

**E. Claim is transactional and silent.** `claimProgressionReward()` (`src/seasonPassUi.js:158`) calls `seasonPass.claim()`, calls `grantReward()`, then immediately adds `.hidden` to the overlay and schedules the next queued tier 260ms later. There is **no reveal, no 3D preview, no burst on claim, no audio sting, no "Added to inventory" confirmation, and no telemetry.** The existing burst fires on tier-up *display*, not on claim. This is the real §7 gap and it matches log16 exactly.

**F. One generic ending for every reward.** `showNextProgressionReward()` writes the same panel for all rewards, branching only between "ITEM SECURED FOR VAULT CLAIM" and "CURRENCY CREDIT READY". §3's reward-family endings are unbuilt.

**G. The green XP box is `.achievement-toast`.** `style.css:9950` — dark-green gradient, `rgba(125,255,90,…)` borders. `.season-pass-toast` rides that layout (`src/seasonPassUi.js:60`). It *does* carry `autoDismissMs = 4200`, so "always visible" is almost certainly **queue saturation**, not a stuck element: XP fires per objective/kill, toasts stack faster than they expire. That reframes §6 from "make it hidden at rest" to "aggregate, then make it hidden at rest." No sound is wired anywhere on this path.

**H. Refusals are silent (the new P0).** `fireWeaponAtCurrentAim()` returns `false` with no cue on `weaponFireCooldown > 0` (`src/threeGame.js:5610-5612`); `triggerGameplayMelee()` returns `false` with no cue on melee cooldown or no-fire zone (`src/threeGame.js:5656-5658`). Out of ammo, in a no-fire zone, the player clicks and receives nothing.

## 2. Files and functions I own

**Exclusive:** `index.html`, `style.css`, `src/seasonPassUi.js`, `src/seasonPass.js`, `src/itemOwnership.js`, `src/armoryOptions.js`, `src/armoryUi.js`; new `src/presentationTelemetry.js`, `src/reticleState.js`, `src/xpFeedback.js`, `src/rewardReveal.js`.

**`main.js` — named seams only, wiring not logic:**
- `updateGameplayCrosshair()` (:1654) and its call sites (:346, :1693, :12181, :12191)
- `captureMenuRenderSnapshot()` (:13110)
- `pickupCounterState` (:2178, :2767, :3084) — read-only verification, see §6
- the season-pass XP event wiring

**Read-only, never edited by me:** `src/threeGame.js` (Codex), `src/audio.js` (Gemini), `tests/e2e/**` (Gemini).

## 3. Day-one deliverables (both other lanes are blocked on these)

1. **`src/presentationTelemetry.js`** — event-name constants and thin emit helpers over `debugLog` (`src/debugConsole.js:1162`) for all six categories in the assignment doc: `RETICLE`, `MENU`, `XP`, `REWARD`, `LIGHTING`, `WEAPON`. Lanes B and C import it instead of calling `debugLog` directly.
2. **`mountRewardPreview()` stub** in `src/rewardReveal.js` — signature `({ container, itemId, category }) -> { ready: Promise, dispose() }`, resolving `{ ok: false, reason: 'stub' }` so my shell can render its fallback path and Codex can drop in the real implementation without touching my file.
3. **`captureMenuRenderSnapshot()` fix** (`main.js:13110`) — currently returns `null` unless `game.performanceProfile === 'menu'`, which is exactly why log16 could not distinguish a hidden menu from a missing one. Make it emit on demand regardless of profile, and add computed visibility (`display`, `visibility`, `opacity`, bounding box) for the menu surfaces.

## 4. Task order and cross-lane dependencies

**Phase 1 — readability (no dependencies, start immediately)**
1. Day-one deliverables above.
2. Reticle lifecycle: show on gameplay entry rather than on first mouse movement; centre on the aim ray; restore correctly after menu close, respawn, death, weapon change, and cinematic return.
3. Replace `mix-blend-mode: screen` with an explicitly contrasting treatment — dark outline plus light core, so it survives both bright and dark backdrops without relying on colour alone.
4. Reactive state machine in `src/reticleState.js`: neutral / interactable / hostile / pickup / blocked, driven by target class, with telemetry per §3 above.

**Phase 1b — XP (no dependencies)**
5. Aggregate rapid XP into a single rolling burst instead of one stacked toast per event; enter/hold/exit lifecycle with cancellation on death, blocking menu, and scene transition.
6. Restyle off the flat green rectangle; emit the XP sound *event* — **Gemini owns the actual sound and its name**, I fire it by name.

**Phase 2 — reward reveal (depends on B and C)**
7. Reveal shell on claim: grant confirmation first, then reveal, then card, then continue/close. Reduced-motion path preserving layer order.
8. Reward-family ending selection driven by the item definition, never by a generic completion callback.
9. **Dependency on Lane B:** real `mountRewardPreview`, and the answer to whether the burst is DOM/CSS or three.js. If DOM, the stacking fix is mine in `style.css`; if three.js, it is Codex's render order. **I will not touch burst layering until Codex answers** — both of us fixing it independently is the likeliest way to waste a day.
10. **Dependency on Lane C:** reward-category sting names.

**Phase 2b — silent refusals (depends on B)**
11. **Dependency on Lane B:** Codex exposes a refusal-reason signal from `fireWeaponAtCurrentAim()` / `triggerGameplayMelee()`. I consume it to drive the reticle's blocked state and a legible ammo readout. I do not edit `src/threeGame.js`.

## 5. How each item is tested

Unit (vitest, the reliable layer here):
- reticle state selection, reset-after-each-transition, and blocked-reason mapping — new `src/reticleState.test.js`
- XP aggregation, lifecycle cleanup, and no-double-sound on duplicate state updates — new `src/xpFeedback.test.js`
- reward-family ending selection per item definition, and claim idempotency as a regression test over the existing guard — extends `src/seasonPassUi` coverage
- telemetry: exactly one event per user-visible action

Browser: computed-style assertions are **not** proof the reticle is visible — `opacity`, `visibility`, and z-index can all read correct while `mix-blend-mode` erases the pixels. Every reticle claim needs an actual screenshot check.

**e2e caveat, inherited and still live:** `docs/armory-vault-progression-audit-2026-08-23.md` E1 records that Playwright cannot reliably reach gameplay or the Armory — `startRunAndSkipIntro()` never clicks `#armory-btn-embark`, and three consecutive runs stranded at three different points. `tests/e2e/gameplay-aim-cursor.spec.js` depends on that helper. I will verify whether E1 still holds before promising any e2e coverage; if it does, unit tests plus manual browser capture are my verification floor, and repairing the helper belongs to Gemini, who owns `tests/e2e/**`.

## 6. Handed off, not mine to close

**To Gemini (Phase 4 human-eye validation):** whether the reticle *reads* well against real scenes; whether the burst *feels* celebratory; whether the reward hold time is long enough to read; final sign-off at desktop 16:9 and 1280x800; reduced-motion and controller parity passes.

**To whoever owns economy:** `pickupCounterState.ammo` is populated at `main.js:2767` from `STARTING_RUN_AMMO + ammoReserve` and exported at `main.js:3084`, so the wiring exists. I will verify the run-start grant actually fires on this branch. If it does, the empty-reserve condition in log16 is ammo *balance*, not wiring — and per the plan's amended priority note, a balance pass is out of scope for this sprint and gets handed off rather than absorbed.

**To Codex:** the refusal-reason signal, the burst DOM-vs-three.js determination, and `mountRewardPreview`.

## 7. Open questions I cannot resolve from code alone

1. **"NIO menu"** has no counterpart anywhere in `index.html`, `main.js`, or `style.css`. Plan §1 says to reconcile the term with the implementation rather than assume a DOM ID. I need the user to name the surface or screenshot it; until then I treat it as one of the 49 existing modals and cannot confirm which.
2. **"The green XP box is always visible"** — my evidence points at `.season-pass-toast` queue saturation, since the element does carry a 4.2s auto-dismiss. A screenshot would confirm it is that element and not a different green panel.
3. **Menu-isolation one-frame gap** — log2 §3 left this needing a live repro. If the user has not seen it recently on this branch, I would rather close it as fixed than build a speculative guard.

---

# Lane A delivery log — 2026-08-24

Built test-first throughout: every module below had a failing test watched fail before the implementation existed.

## Shipped

**Day-one deliverables (both other lanes were blocked on these)**

| Deliverable | File | Tests |
|---|---|---|
| Shared telemetry contract, closed event names, once-per-action dedupe | `src/presentationTelemetry.js` | 6 |
| `mountRewardPreview()` interface stub for Lane B | `src/rewardReveal.js` | 2 |
| Menu visibility snapshot, no longer profile-gated | `src/menuVisibility.js` + `main.js:13110` seam | 6 |

The telemetry contract is deliberately **closed**: emitting an undeclared category or event throws rather than silently entering the log under a new spelling. That is what stops three lanes inventing three names for the same thing, which is how log16 became unqueryable in the first place.

**§1 — reticle**

- `src/reticleState.js` (24 tests): state selection (neutral / interactable / hostile / pickup / blocked), placement resolution, refusal-reason parsing, and look-target derivation.
- Reticle now shows **on gameplay entry** rather than on first mouse movement — the confirmed cause of "the crosshair is invisible."
- `mix-blend-mode: screen` removed; readability now comes from a dark outline under a light core, so it survives bright and dark backdrops.
- Five reactive state classes added to `style.css`, each with a shape or weight change as well as a hue, so state is legible without colour discrimination.
- A 200ms re-evaluation restores the reticle after menu close, respawn, death, weapon change, and cinematic return — none of which change phase or move the mouse, which is why it previously stayed hidden.

**§6 — XP**

- `src/xpFeedback.js` (9 tests): windowed aggregation, `flushPending()` that can only hand over a burst once, cancellation, and sound selection.
- `awardXp()` now collapses a run of gains into one burst instead of one toast per gain. Cancelled on death, blocking menu, and leaving gameplay.

**§3 / §7 — reward reveal**

- `src/rewardReveal.js` (21 tests): the claim → grant → reveal → preview → burst → audio sequence, with grant confirmed *before* anything is revealed, and an in-flight guard on top of the existing claim guard.
- Reward-family endings resolved from the item catalog by `itemdefid`. Weapon, chassis, charm, module, decal, HUD, and voice each end differently; unknown items fall back to a generic ending rather than throwing.
- Reveal shell: preview mount point, "ADDED TO INVENTORY" confirmation, Continue button, keyboard routing that claims before the reveal and continues after it, and preview disposal on close.

**§5 — burst layering (Lane B confirmed this is DOM/CSS and handed it over)**

Root cause found: `.progression-reward-burst` and `.progression-reward-card` were both positioned with `z-index: auto`, so they painted in DOM order — and the card comes later in the markup, so it covered the burst. The reveal now declares its stack explicitly: preview (1) under burst (2) under card (3) under prompt (4). A reduced-motion path keeps the layer order and drops only the movement.

The burst was also firing at the **wrong moment**: it was generated when the tier-up ceremony opened, not when the reward was claimed, which is a second reason it never read as celebrating anything. It now fires on the reveal's burst stage — after the reward object is up, before the card settles — and its particles are torn down and reflowed each time so a replay cannot stack stale animation state.

**Honest failure states**

A 2D-only reward, or a 3D reward whose model is missing, now renders a labelled `preview unavailable` / `2D requisition` state inside the preview frame rather than an empty box. The reward is still named and the grant still confirmed, per §7.

**XP visual treatment**

`.season-pass-toast` no longer borrows the green achievement card wholesale. It is narrower, carries its own cyan accent, uses tabular numerals so a counting gain does not jitter, and pulses once on arrival — with the pulse dropped under `prefers-reduced-motion`. Achievements keep the green card, so the two stop looking identical.

## Verification

- `npm test` — **254 files / 2105 tests green** (includes Lane B and Lane C work landing concurrently in this tree).
- `npm run build` — green, build-media audit passes.
- `npx eslint` — clean across every file I own.
- Playwright (`tests/e2e/gameplay-aim-cursor.spec.js`, the spec closest to my changes) — **1 failed, 1 flaky, 2 passed** in 8.9 minutes.

### The failing e2e test is stale, and it fails identically without my changes

`clicking the game canvas engages pointer lock and hides the mouse-look prompt` asserts `document.pointerLockElement !== null`. It fails because **the game no longer requests pointer lock at all** — `requestPointerLock` appears nowhere in the repo. It was added in `a62e8d1` ("drive facingYaw from pointer-locked mouse-look", 2026-08-14 10:53) and removed three hours later in `e4ec7ec` ("restore in-game tactical cursor with camp and station hover reticle transitions", same day 12:31). The game deliberately moved from pointer-lock mouse-look to the tactical-cursor model; the test asserting the abandoned design was never updated.

Measured against a clean baseline rather than asserted:

| Tree | Result |
|---|---|
| `dev/sprint-29` with all Lane A/B/C work | 1 failed, 1 flaky, 2 passed (8.9m) |
| Detached worktree at `e8ed5fa` — last commit before any Sprint 29 lane work | 1 failed, 3 passed (8.1m) |

The same single test fails in both, on the original attempt and the retry. The first half of it passes even so — `#mouse-look-prompt` does gain `hidden`, so the click lands; only the lock assertion fails.

The flaky one — `Execution context was destroyed, most likely because of a navigation` — is the known Vite dev-server auto-reload interfering with the first interaction. It passed on retry.

Neither failure is Lane A's, and neither is a regression. **Updating or retiring the stale pointer-lock assertion belongs to Gemini**, who owns `tests/e2e/**`.

Note that `src/threeGame.js:5224` still carries a pointer-lock branch, and my `resolveReticlePlacement` keeps a matching one. Both are currently unreachable in gameplay. I left mine in place rather than deleting it, because removing half of a symmetric pair while the other half stands would be the worse outcome — but it is worth a deliberate decision about whether pointer lock is coming back.

## Corrections to my own plan

**E1 is fixed, not still blocking.** My plan carried forward the armory audit's claim that `startRunAndSkipIntro()` never clicks `#armory-btn-embark`. It does now (`tests/e2e/helpers.js:63`), inside a readiness poll with a 75s deadline. The e2e blocker as described no longer holds.

**The reward-ending selector was wrong on first pass.** I keyed it off a `category` field that season-pass rewards do not have — they carry `{ kind, itemdefid, qty, label }`, and the equip type lives in the item catalog. Caught by writing tests against real reward shapes; the selector now resolves through `getCatalogEntry(itemdefid)`.

**`window.playSfx` does not exist.** I invented it. The real API is `window.AudioManager.play(key, options)`, and Lane C had already registered every key I needed in `main.js`.

## Cross-lane state at hand-off

Both dependencies my plan listed are **closed**, and both were answered by the other lanes rather than assumed:

- **Lane B answered the burst question: it is DOM/CSS, not three.js** (`docs/sprint-29-lane-b-lane-plan-2026-08-24.md`). The stacking fix was therefore mine, and Lane B explicitly declined to build a competing three.js burst. That is the day it was worth spending a morning to avoid.
- **Lane B shipped the real `src/rewardPreview.js`** and rewired my stub to delegate to it. The interface held unchanged — `ready` resolves rather than rejecting, `dispose()` is idempotent — so the shell needed no edit. My contract tests now guard the real implementation.
- **Lane C published the audio keys and registered them** in `main.js` before I needed them, and emits `WEAPON` refusal reasons (`out_of_ammo`, `no_fire_zone`, `reloading`, `fire_cooldown`, `invalid_aim`) from `src/threeGame.js`. The reticle consumes those through the telemetry bus, so neither lane had to reach into the other's files.

Lane B committed the shared tree at `051228b` while I was mid-flight, so Lane A's work is in that commit alongside theirs. Nothing was lost, but note that this branch has three agents writing to it live.

## Handed off, not done here

- **Reactive states do not fire under pointer lock.** `handleCanvasPointerMove` returns early on the pointer-lock branch before `checkHoverInteractable` ever runs, so no look-target is resolved while locked. The reticle correctly shows neutral rather than a wrong state, but hostile/pickup/interactable will not appear until that path resolves a target. The fix belongs in `src/threeGame.js`, which is Lane B's file.
- **`src/armoryScene.js:411`** has an unused `maxDim` that fails lint. That is Lane B's in-flight file; flagged, not touched.
- **Everything requiring a human eye** — whether the reticle reads well against real scenes, whether the burst feels celebratory, reward hold time, 1280x800 sign-off — belongs to Gemini's Phase 4.

## Still open

The two questions from §7 of the plan above are unchanged and still need the user: **what surface "NIO menu" refers to** (no counterpart exists in the markup, styles, or code), and **confirmation that the green box is the season-pass toast** rather than a different green panel.
