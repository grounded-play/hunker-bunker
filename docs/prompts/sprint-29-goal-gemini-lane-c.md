# Sprint 29 — Goal Prompt: Gemini (Lane C — Audio, combat telemetry, locomotion, verification)

## Prompt

You are the Lane C agent for Sprint 29 on branch `dev/sprint-29`.

Read these before writing code:
- `docs/sprint-29-visual-feedback-and-presentation-fix-plan-2026-08-24.md` — the sprint plan. Your scope is §4 (chroma-green audit), §10 (locomotion), §13 (validation matrix), §14 (tooling), and §18's final verification route.
- `docs/sprint-29-agent-lane-assignment-2026-08-24.md` — your file ownership, the `src/player3dOverlay.js` function-level split with Codex, and the audio event names you must publish first.
- `docs/sfx-design-manifest.md` — the existing SFX contract. New stings conform to it; run `npm run audio:plan-sfx:check` after changes.
- `docs/animation-actions-master-catalog.md` — the authored clip catalog. Diagnose the walk glide against the authored stride length before adding correction code.
- `docs/logs/log16.json` — many canvas clicks but almost no weapon-fire events; explicit combat is mostly melee. One audio fetch failed: `Kaelens Sleeping Machine.mp3`.

Own exclusively: `src/audio.js`, `scripts/` (new chroma-green/alpha audit script), `tests/e2e/**`, and your verification reports in `docs/`. In `src/player3dOverlay.js` you own only `selectOverlayAnimation`, `selectLocomotionActionName`, `computeLocomotionWeights`, `INJURED_LOCOMOTION_VARIANTS`, `makeClipInPlace`, `retargetMixamoClip`, and mixer timeScale — not the weapon constants, which are Codex's. **Codex lands in that file first; you rebase onto their work**, because weapon scale changes the rig proportions locomotion gets tuned against. In `main.js` touch only audio routing and weapon-fire instrumentation.

Publish on day 1: the audio event names for XP tick, level-up/bonus, per-reward-category stings, and menu/reveal mix. Claude and Codex fire them by name through `src/presentationTelemetry.js` — no direct `audio.js` calls from UI or render code.

Answer early, because it may be a bigger bug than the sprint assumes: **are log16's canvas clicks producing shots at all?** Add explicit `fire-input`, `shot-accepted`, `shot-blocked`, and `projectile` events separately from melee, then say plainly whether the gap is input, weapon state, aim state, or only missing logging.

For the walk glide, diagnose before fixing: measure actual horizontal speed against the authored stride length and frames-per-step, and check whether root motion is double-applied or missing. Do not add a stride-correction hack on top of an unmeasured mixer timeScale.

For chroma-green: scan the season, achievement, community, decal, and reward-presentation image trees; identify whether the green is baked into the source, introduced in processing, or a missing alpha channel; then add a build audit that names the offending filename and fails loudly. Allowlist intentionally-green UI art.

You own final verification. Run the plan §13 matrix and §18 route at desktop 16:9 and 1280x800, capture before/after for reticle, lighting, XP, reward reveal, weapon/charm fit, and locomotion, and file one cross-lane integration report with reproducible pass/fail results. Separate new regressions from pre-existing failures.

Verify with `npm test`, `npm run test:e2e`, `npm run build`, and `npm run presubmit`.

---

## Addendum — log16 second-pass findings (2026-08-24)

Read `§20` of the plan (`docs/sprint-29-visual-feedback-and-presentation-fix-plan-2026-08-24.md`) before starting. It supersedes §16 where they disagree, and it materially changes two of your tasks.

**1. Build provenance caveat.** log16 is a packaged **v2.2.0** Electron build; `dev/sprint-29` is at **2.3.1-beta**, two releases newer. Reproduce every symptom on the current branch before fixing it.

**2. The weapon-fire question is half-answered — re-scope your task.** All 8 logged melee events carry `"source": "empty-fire-fallback"`, a string emitted from exactly one place, `src/threeGame.js:5616`, reached only when clip ammo is 0 **and** reserve ammo is 0. So fire input *was* reaching `fireWeaponAtCurrentAim()` and the fire path was refusing it. This is not purely a logging gap.

Your remaining question is therefore not "are clicks producing shots" but: **why was the player at zero clip and zero reserve from 243s onward, and why is that state completely silent?** Instrument the fire path first (`fire-input`, `shot-accepted`, `shot-blocked` with reason, `projectile`), then answer it with evidence. Do not assume a wiring bug — `getAvailableAmmo()` reads `window.pickupCounterState?.ammo`, which is populated at `main.js:2767` and exported at `main.js:3084`, so the wiring exists and this may be ordinary ammo starvation. If it is balance rather than wiring, say so and hand it off; do not absorb a balance pass into this sprint.

**3. The audio failure has a specific root cause.** The single FETCH error targets a path **inside** `app.asar`:

```
file:///.../resources/app.asar/dist/audio/ost/Kaelens%20Sleeping%20Machine.mp3  -> Failed to fetch
```

Assets listed under `asarUnpack` resolve at `app.asar.unpacked/...`, so requesting them through the `app.asar` path fails. Route the request through `src/assetUrl.js` and confirm the `asarUnpack` globs in `package.json` cover the OST directory. This was the *only* fetch error in the session — 3D assets loaded fine — so scope it as an audio-path fix, not a general packaging break. The `package.json` edit is small and isolated; flag it to Codex so it does not collide with build config work.

**4. Corrected numbers for your locomotion evidence.** **141** dash triggers across the session — roughly one every 3.5 seconds of gameplay. Combined with Finding 2 (the player had no working offensive option), it reads as avoidance of on-foot traversal. Treat it as *supporting* evidence for §10, not proof: a player with no ammo dashes past enemies for reasons that have nothing to do with the walk cycle.

**5. Coordinate on the delta source.** Codex will likely migrate `THREE.Clock` → `THREE.Timer` (deprecated, fires at `[9ms]`). That changes the delta feeding the locomotion mixer you are tuning. Agree the sequencing with them before you tune stride speed against the old delta behaviour.
