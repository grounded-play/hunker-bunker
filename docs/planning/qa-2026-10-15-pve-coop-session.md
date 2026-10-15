# QA 2026-10-15: PvE co-op session, Windows PC + Steam Deck

Two captures from one co-op expedition (lobby `STEAM-109775240979333717`). Both machines ran the same build: `4faf9b31` on `dev/sprint-52`, clean, reporting 2.4.16-beta because it predates the 2.4.17 bump.

| Capture | Machine | Account | Class | Span |
| :--- | :--- | :--- | :--- | :--- |
| `hunker-bunker-session-2026-10-15T18-22-45-117Z-mv9v9evf-k938` | Windows, 2304×1440, keyboard + mouse | Deadman's Hand (guest, ZERO-9) | Scout | 17:56–18:22 UTC |
| `hunker-bunker-session-2026-10-15T18-23-02-135Z-mv9v9ryn-gi` | Steam Deck, 1280×800 | tuesday-cinema-club (host, TITAN-2) | Tank | 18:07–18:23 UTC |

## 1. Why the game froze, and why the retry played better

**The freezes are WebGL shader compilation, and they are a regression on this branch.**

On the PC (Windows, ANGLE on D3D11) the main thread blocked three times:

| When | Freeze | What was happening | Shader programs |
| :--- | :--- | :--- | :--- |
| 18:11:52 | **32.0 s** | Startup render after deploy, under "warming materials and lighting" | 160 → 236 |
| 18:14:00 | **35.6 s** | The first real gameplay frame after closing the Mothership dialogue (the player had not moved; `render:effect-composer-submit` 35.4 s) | 236 → 309 |
| 18:20:09 | **38.4 s** | Startup render of the retry; the relay dropped the socket (`transport close`) and rejoined | 308 → 458 |

Each jump in the renderer's program count lines up with a freeze. That works out to about 0.4–0.5 s per program on this PC.

The Deck (Vulkan/Mesa) shows the same three moments, much shorter:
- 9.3 s at startup (206 programs);
- 7.3 s on the first frame after the dialogue (270);
- 5.1 s on the retry (422).

**Why the retry was playable.** Compiled programs stay cached in the renderer for the session.
- **First life:** the startup warm-up missed most of what the world actually draws, so they compiled on the first frame (35 s), and then in smaller 0.5–2.6 s hitches as new props came into view.
- **Retry:** the warm-up froze once (38 s), but by then almost every program existed. The rest of the run had no task over 330 ms.

**It is getting worse with each Sprint 52 build** (worst main-thread task and peak programs, from earlier uploads):

| Build | Date | Worst task | Programs |
| :--- | :--- | ---: | ---: |
| `920f2406` (v2.4.16 release) | 10-12 | 3.2 s | 206 |
| `6bc5ba60` | 10-13 | 4.3 s / 17.2 s | ~240 |
| `a7abbb17` | 10-14 | 22.5 s | 346 |
| `4faf9b31` | 10-15 | **38.4 s** | **468** |

Over the same span the scene grew too. At the end of the PC run:
- 7.6 M triangles and 890 draw calls, against 0.7 M at deploy;
- a 3.6 GB JS heap peak.

Gameplay averaged about 16 fps on the PC (62.8 ms per presented frame) and about 14 fps on the Deck.

**Likely sources of the extra programs (to confirm before fixing):**
- the ~100 new world-story and expansion models, each with its own material and map combination, plus shadow-depth variants;
- props with practical lights: adding a light changes the scene's light count, and every lit material recompiles (the point-light count trap fixed for vent lights in `4a9d7fa6`);
- materials patched with `onBeforeCompile` but without a shared program cache key.

**Fix direction:**
1. Measure: list `renderer.info.programs` by cache key on the release build and on the head build, and count programs per source.
2. Collapse needless variants: a shared cache key for patched materials, and a fixed light budget so streaming props never change the light count.
3. Make the warm-up compile what the world really draws: render the actual start view, plus the prop and light set, with `compileAsync` and `KHR_parallel_shader_compile` before control is handed over.
4. Re-measure on the Windows machine against the [remediation plan](playtest-remediation-steam-deck-and-pc-2026-10-12.md) targets (PC p95 ≤ 16.7 ms, no stall over 250 ms).

## 2. Other findings

- **Both players died 5 minutes in, to O2.**
  - The Tank was downed by snails at 18:16:34 and lay downed for 2.5 minutes.
  - The Scout went north into the cryo chunks (0,−2) and (1,−2) and drained from 100% to 0% between 18:14 and 18:19. Then the squad wiped (`squad-wipe`, `o2-depletion` ×5).
  - The game behaved as designed. Worth a design look: a new player who picked "run me through protocols" can wipe on O2 before the tutorial teaches the bubble.
- **The retry starts with 2 hearts on the Deck.** This is the fatigue scar (`src/fatigue.js`, −1 max heart after a death), intended.
- **Relay reconnect works.** The PC's 38 s freeze closed its socket. It reconnected with a new id, and the Deck rebuilt its avatar (`spawn-relocated`, `remote-avatar-3d-ready`). The Deck ended with exactly one remote player, so the analyzer's "possible stale avatar" flag is a false positive.
- **Deck input is logged as keyboard although only the Deck's controls were used** (owner, 2026-10-15). The input mode flipped between controller and keyboard 13 times, and both deploys record `mode: keyboard`. Controller A presses arrive as clicks, and something in the Steam Input path reads as keyboard: a misclassification to fix, not a player using a keyboard.
- **Class swap shows the previous class** (owner, 2026-10-15). On the Deck the hero select still showed the Scout after switching to the Tank. The capture has the exact route:
  1. 18:09:18 pick the Scout, then ENTER ARMORY;
  2. 18:09:30 RETURN TO MAIN MENU;
  3. 18:09:33 pick the Tank, then ENTER ARMORY at 18:09:36.
  The deployed class was the Tank (`opClass: TANK` in the relay join), so the stale model is presentation only.

## 3. Branch fixes and tickets this session can speak to

| Item | What the session shows |
| :--- | :--- |
| #85 Two-account co-op | **Strong evidence, not closure.** The same build on both machines: lobby, ready, deploy, 3D remote avatars, damage, downed, squad wipe, black box recovered, joint redeploy, and a relay reconnect mid-run. Missing: an extraction, and a session without the freezes. |
| #52 GPU / frame pacing | **Fails and regressed.** 32–38 s freezes and about 15 fps. T10's 5×5 residency holds (`retainedChunks` 25). See §1. |
| #53 Deck controller-only | **Played controller-only (owner), but not yet provable from the log.** Menus route by controller (163 `focus-route` events, including Armory slots), yet the input-mode record says keyboard (§2). Fix the classification first, then the log can carry the evidence. |
| Armory picks survive launch (`822a27cf`) | **Exercised.** On the Deck the Tank equipped the Trench Warden chassis, the Tectonic Driller then the Deep Core Melter, the Scout Victory Patch, the Amber CRT HUD, the Soviet voice bank and two modules (all DEV-unlocked). The PC loaded the Queen's Carapace Carbine in the Armory, and the Deck loaded the Chrono-Drifter for the remote Scout at deploy. The owner saw a non-standard chassis (Mayor Tina) in game in another play. The fetch log records only first loads, so it cannot list every model in the run. |
| T8 Hero Select and Armory D-pad edges | **Working.** Controller `focus-route` moves through the Armory slots on the Deck. |
