# QA 2026-10-07: enemies not hitting the player, and frame stalls at shots

Owner reports:
- "enemy were not hitting my player in the last long run ... we need to take damage";
- "huge frame drops and slowdowns at shots and things plus no damage".

## Evidence

| Capture | Build | Platform | What it shows |
|---|---|---|---|
| `hunker-bunker-session-2026-10-07T20-04-50-090Z-muyjdw7z-k6ad.json` (drop box) | 2.4.16-beta `6d5fc7ed` | Deck, Engineer, **Act 2** | 17 minutes, 5–13 enemies loaded, a boss telegraph, and zero `player-damaged` events |
| Pasted desktop log, 00:18–00:21 UTC | `ca80d122` (dirty) | Windows, RTX 2070, ANGLE/D3D11, Tank, Act 1 | Single frames of 2–10 s (`renderFrame` max 10.5 s); shader programs 151 → 312 during play; no damage in 3.5 minutes |

## Causes and fixes

### 1. Act 2 enemies ignored the player (fixed in 4a9d7fa6)

- **Cause:** `isHiveKinPassive` (hive kinship, July) returned true for every wild enemy for the whole of Act 2 unless the player shot it first. The Deck save was in Act 2.
- **Fix:** wild enemies hunt again.
  - Act 2 snails still open their talk-or-fight encounter on contact.
  - Killing kin still costs the queen's obedience.
  - Only a companion stays passive.

### 2. Multi-second stalls (fixed in 4a9d7fa6)

- **Cause:** three bakes the count of visible point lights into every lit shader.
  - The Sprint 53 vent lights (`ambientVentsAndFog.js`, d7e51ee9) toggled `.visible`.
  - Every vent burst therefore recompiled every material in view.
  - The probe found the same material compiled at 25, 26 and 27 point lights.
  - On ANGLE/D3D11 each compile takes seconds.
  - This is the same failure documented on `ThreeGame._ensureEnvLightPool`.
- **Fix:** the vent lights stay visible and idle at intensity 0. The rendered image is unchanged.

### 3. Hitch on a kill (fixed in 4a9d7fa6)

- **Cause:** the corpse model was prewarmed while opaque, then made transparent. Transparency is part of the shader program, so the real program compiled on the frame after the kill.
- **Fix:** the corpse is made transparent first, then prewarmed.

## Verification (GPU headless, `playwright.gpu.config.mjs`)

- `tests/e2e/probes/shot-shader-stalls.spec.js`:
  - before: a kill added 11 programs, worst frame 400 ms;
  - after: a kill adds 3 programs, worst frame 133 ms;
  - the steady-state program count dropped from 251 to 154–186.
- `tests/e2e/probes/enemy-damage-sweep.spec.js`: hits land at 8 of 8 spots 40 tiles out, in Act 1 and in Act 2 (`SWEEP_ACT2=1`).
- `tests/e2e/probes/natural-enemy-damage.spec.js`: six of the world's own enemies (cryosnail, spore vent, stalker) bite a Tank in Act 1.

## Still open

- **The desktop run's Act 1 no-damage is not reproduced.** Every Act 1 probe takes hits. The most likely factor is the stalls themselves: the game barely advanced through them. Re-check in the next desktop capture on this build.
- **The remaining 3 programs on a kill** are first-draw compiles (the corpse model and a streamed cliff variant). Prewarm them at load if they still show on Windows.
