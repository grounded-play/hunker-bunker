# Sprint 29 — Goal Prompt: Claude (Lane A — UI, reticle, menus, XP, reward-reveal shell)

## Prompt

You are the Lane A agent for Sprint 29 on branch `dev/sprint-29`.

Read these before writing code:
- `docs/sprint-29-visual-feedback-and-presentation-fix-plan-2026-08-24.md` — the sprint plan. Your scope is §1 (reticle/menus), §3 (reward-family ending *selection*), §6 (XP feedback), §7 (reward reveal shell). §16 lists the instrumentation gaps you must close.
- `docs/sprint-29-agent-lane-assignment-2026-08-24.md` — your file ownership, the `main.js` seam rules, and the cross-lane interfaces you must publish.
- `docs/log2-ui-transitions-and-menu-isolation-plan-2026-08-19.md` — prior menu-isolation work; do not re-solve what already landed.
- `docs/latest-asset-loading-and-season-audit-2026-08-21.md` and `docs/armory-vault-progression-audit-2026-08-23.md` — current season/ownership state; the reveal shell must not contradict the grant path described there.
- `docs/logs/log16.json` — the 2026-08-24 session. The claim at ~63.1s emits no grant/reveal/preview/burst/audio event, and `menuRenderSnapshot` is `null`. Confirm both before assuming any fix.

Own exclusively: `index.html`, `style.css`, `src/seasonPassUi.js`, `src/seasonPass.js`, `src/itemOwnership.js`, `src/armoryOptions.js`, `src/armoryUi.js`, and the new modules `src/reticleState.js`, `src/xpFeedback.js`, `src/rewardReveal.js`, `src/presentationTelemetry.js`. In `main.js` touch only HUD/reticle wiring, menu open/close, XP hooks, and the claim handler — wiring only, no new subsystems, no reformatting.

Do first, before anything else, because two other lanes are blocked on them:
1. Land `src/presentationTelemetry.js` with the event-name constants for all six categories in §3 of the assignment doc.
2. Land a stub of `mountRewardPreview({ container, itemId, category }) -> { ready: Promise, dispose() }` so Lane B can replace it without you being blocked.
3. Extend `captureMenuRenderSnapshot()` (`main.js:13110`) to emit regardless of `performanceProfile`.

Then deliver, in order: visible reticle with reactive states; menu visibility + world-input isolation; event-driven XP box with aggregation and cleanup; reward-reveal shell with duplicate-grant protection, reward-family ending selection driven by the item definition, and a 2D fallback path.

Verify with `npm test` (vitest) and targeted Playwright specs under `tests/e2e/`, plus a live browser check for actual pixels — computed-style assertions alone do not prove the reticle is visible. Report unrelated pre-existing failures separately from your own regressions.

## Notes on scope
Items needing a human eye — "does the burst read as celebratory", final visual sign-off at 1280x800 — are **not** yours to close. Report them as evidence for Gemini's Phase 4 validation pass.

---

## Addendum — log16 second-pass findings (2026-08-24)

Read `§20` of the plan (`docs/sprint-29-visual-feedback-and-presentation-fix-plan-2026-08-24.md`) before starting. It supersedes §16 where they disagree. Three things change your lane:

**1. Build provenance caveat — applies to everything.** log16 is a packaged **v2.2.0** Electron build; `dev/sprint-29` is at **2.3.1-beta**, two releases newer. Reproduce every symptom on the current branch before fixing it. Do not fix a bug that Sprint 28 already closed.

**2. You have exact selectors for the reveal shell.** The claim path is `<div.progression-reward-panel>` → `<button#progression-claim-btn.start-btn.progression-claim-btn>`. The log confirms nothing at all follows that click — no grant, reveal, preview, burst, or audio event, just baseline render frames resuming. Build the §7 shell against these real elements.

**3. New task — kill the silent-failure class.** This is your lane because it is a feedback problem, and it is the same defect the whole sprint is about. Two paths in `src/threeGame.js` refuse player input with **no cue whatsoever**:
- `fireWeaponAtCurrentAim()` returns `false` silently when `weaponFireCooldown > 0`.
- `triggerGameplayMelee()` returns `false` silently on melee cooldown or inside a no-fire zone.

An out-of-ammo player clicking in a no-fire zone gets nothing — no sound, no reticle change, no HUD response. Your reticle state machine must expose a **blocked/unavailable** state (plan §1 already requires "muted state, never invisible") driven by these refusal reasons, and the HUD must show ammo state legibly. The threeGame.js side is Codex's file — agree the refusal-reason signal with them; you consume it, you do not edit it.

Related: log16 shows the player at zero clip and zero reserve for most of the session (see §20 Finding 2). `pickupCounterState.ammo` is populated in your file at `main.js:2767` and exported at `main.js:3084`. Verify that grant actually runs at run start on the current branch — if it does not, the fix is yours; if it does, it is an economy-balance question and you hand it off rather than absorbing a balance pass.
