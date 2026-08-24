# Sprint 29 — Goal Prompt: Codex (Lane B — Rendering, lighting, FX depth, weapons, charms)

## Prompt

You are the Lane B agent for Sprint 29 on branch `dev/sprint-29`.

Read these before writing code:
- `docs/sprint-29-visual-feedback-and-presentation-fix-plan-2026-08-24.md` — the sprint plan. Your scope is §2 (lighting), §5 (burst depth order), §7's 3D preview rules, §8 (weapon scale), §9 (charm sockets). §16's performance evidence is your lighting-investigation starting point.
- `docs/sprint-29-agent-lane-assignment-2026-08-24.md` — your file ownership, the `src/player3dOverlay.js` function-level split with Gemini, and the interface you owe Lane A.
- `docs/3d-skin-and-weapon-reference-bible.md` — the existing weapon/skin contract. Calibrate against this, not against each source asset.
- `docs/latest-asset-loading-and-season-audit-2026-08-21.md` — asset-loading and caching policy the reward preview must follow.
- `docs/logs/log16.json` — ~4M triangles, 900+ draw calls, 1.16GB estimated GPU memory, 970 dropped frames, worst long tasks 1.34s/1.31s/846ms.

Own exclusively: `src/threeGame.js` (nobody else edits it — route other lanes' requests through you), `src/baseLights.js`, `src/armoryScene.js`, and the new modules `src/weaponCalibration.js`, `src/charmSockets.js`, `src/rewardPreview.js`. In `src/player3dOverlay.js` you own only `WEAPON_ARCHETYPES`, `WEAPON_SKIN_MESHES`, `CHASSIS_SKIN_MODELS`, `createClassWeapon`, `normalizeModel`, and the weapon position/scale constants — do not touch the locomotion/mixer functions, which are Gemini's. In `main.js` touch only renderer/adaptive-quality and lighting wiring.

Answer this on day 1 and publish the answer, because Lane A is holding on it: **is the reward burst DOM/CSS or three.js?** Plan §5 leaves it open. If it is DOM, the stacking fix is Claude's in `style.css` and you hand it off. If it is three.js, render order and depth test/write are yours. Both of you fixing it independently wastes a day.

Also on day 1: replace Claude's `mountRewardPreview` stub with the real implementation resolving `{ ok: true }` or `{ ok: false, reason }`, and always releasing GPU resources on `dispose()`.

A known root cause you can start from: `src/armoryScene.js:340-342` sets **one hardcoded `charmSocket.position.set(0.18, -0.05, 0.06)` reused for every weapon**. That is plan §9's "shared coordinate that is not valid for the weapon". Fix it with a per-archetype named socket registry — do not paper over it with per-charm offsets.

For lighting: do not treat it as an isolated art bug. Compare the visual state against the adaptive-performance state on a repeatable movement route (boot → first move → room boundary → door → return). The log16 frame data makes a too-aggressive quality fallback a credible cause of the reported "lights turning off".

Emit telemetry through `src/presentationTelemetry.js` (Claude's, landing day 1) under `LIGHTING` and the preview/burst `REWARD` events — do not call `debugLog` directly.

Verify with `npm test`, `npm run build`, and rendering tests for reward layer order, preview framing, and attachment transforms. Record the performance impact of the reward preview.

---

## Addendum — log16 second-pass findings (2026-08-24)

Read `§20` of the plan (`docs/sprint-29-visual-feedback-and-presentation-fix-plan-2026-08-24.md`) before starting. It supersedes §16 where they disagree, and it hands you the strongest lead in the log.

**1. Build provenance caveat.** log16 is a packaged **v2.2.0** Electron build; `dev/sprint-29` is at **2.3.1-beta**. Reproduce before fixing.

**2. Start here — the shadow map is re-initialised on every armory entry.** This is your first check for §2, ahead of the general lighting sweep:

```
[18515ms]  WARN THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead.
[368388ms] WARN THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead.
```

Both firings land within ~80ms of a phase transition into armory (`menu→armory` at 18,467ms; `gameover→armory` at 368,310ms). Two consequences:
- The authored soft-shadow mode is being **silently downgraded** to hard `PCFShadowMap`. What ships to the screen is not what was authored — a direct candidate for "lighting looks worse than at boot."
- Reassigning `shadowMap.type` invalidates shadow-dependent materials and forces a recompile, which is a credible mechanism for the long tasks clustered near transitions.

Find why it is being set twice, set it once to a supported type, and confirm the phase transition no longer triggers a recompile.

**3. Corrected performance numbers.** 2,106 long-task records; **26** over 100ms, **12** over 250ms; worst at 1,340ms / 1,306ms / 846ms / 808ms / 552ms. A secondary review described gameplay CPU as "occasional 83ms spikes" — that understates it. GPU frame time was healthy on the reporter's RTX 2070 SUPER while the CPU still stalled for over a second. Diagnose against the timestamps, not the averages.

**4. New task — `THREE.Clock` → `THREE.Timer`.** Deprecated at `[9ms]` in the log. `Timer` clamps delta spikes across tab-switch and window-blur; given this build's long tasks, a delta spike after a stall plausibly contributes to animation hitching. Low-risk, and it is renderer-adjacent so it is yours — but coordinate with Gemini before landing it, because it changes the delta feeding the locomotion mixer they are tuning.

**5. Refusal-reason signal owed to Lane A.** `fireWeaponAtCurrentAim()` and `triggerGameplayMelee()` in your `src/threeGame.js` both return `false` silently — on fire cooldown, melee cooldown, and no-fire zone. Claude needs those refusal reasons to drive the reticle's blocked state. Expose them; Claude consumes them and does not edit your file.
