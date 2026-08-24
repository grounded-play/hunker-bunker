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
