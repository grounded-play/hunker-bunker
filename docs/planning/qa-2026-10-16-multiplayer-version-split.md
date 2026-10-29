# QA 2026-10-16: multiplayer never started (version split)

Two session logs, uploaded at 2026-10-16 02:19 UTC:
- `hunker-bunker-session-2026-10-16T02-19-15-870Z-mvaca8p6-g3q.json`, the Steam Deck;
- `hunker-bunker-session-2026-10-16T02-19-47-731Z-mvacawaj-1ryw.json`, the second player.

## What happened

| Capture | Build | Branch |
|---|---|---|
| Steam Deck (TITAN-2) | 2.4.16-beta `4faf9b315e7a` | dev/sprint-52 |
| Second player (CYPHER-5) | 2.4.17-beta `5836d305f54e` | dev/sprint-53 |

1. The Deck hosted a PvP lobby (`STEAM-…844044`).
2. The 2.4.17 player pressed JOIN on it six times, between 02:13:34 and 02:14:15. Every attempt logged `relay-connected`, `relay-join-sent` and then `relay-disconnected` with reason `io client disconnect` within 40–210 ms.
3. The 2.4.17 player then hosted co-op (`STEAM-…949801`). The Deck's JOIN at 02:14:48 failed the same way.
4. Both went solo.

The relay's build gate (`server/relay.js`) correctly refused each join with `joinRejected { reason: 'build_mismatch', hostBuild, clientBuild }`. The client handled it by disconnecting and calling `window.showToastNotification(...)`.

## Why it was silent

`window.showToastNotification` was never defined in the shipped game; only tests stubbed it. Every optional-chained call was a no-op. That silenced:
- lobby join rejections (version and password);
- Steam invite errors;
- the in-run co-op notices (squadmate down, revived, host reassigned, you are downed).

Two further gaps:
- The rejection was not logged, so the logs showed only a bare disconnect.
- Lobbies never advertised the host's build: `createSteamLobby` was not passed one, so `hb_build` was always empty.

## Fix

- **`src/toastNotification.js`** installs `window.showToastNotification`. It is a top-centre live-region stack created on demand and removed when empty (the Steam Input action-set trap). It takes no pointer or focus, and a repeated notice refreshes instead of stacking.
- **A rejected join** is logged as `relay-join-rejected` with both builds. The localized message ("HOST IS ON 2.4.16-beta, YOU ARE ON 2.4.17-beta — UPDATE OR SWITCH YOUR STEAM BETA BRANCH TO MATCH") shows as a toast and stays in the lobby status line.
- **Hosts now advertise their build** on the Steam lobby. The public lobby list shows each lobby's version and marks a mismatch, and JOIN on a mismatched lobby explains the problem without trying the join.
- **A deploy refused for a mismatched squad** now names the cause.

## Limits

Both players need a build with this fix to see it. A 2.4.16 client still fails silently, and its lobbies advertise no version, so they list without one.

## The solo runs that followed

Both machines were **Steam Decks**: `tuesday-cinema-club` on 2.4.16 and `s1nAck` on 2.4.17. Each played about four minutes solo after giving up on multiplayer.

| | Deck A, 2.4.16, Engineer, Daily Ops | Deck B, 2.4.17, Tank, empty co-op lobby |
|---|---|---|
| Median frame time | 47.5 ms (**21 fps**) | 35.5 ms (**28 fps**) |
| Worst window | 9.4 fps | 5 fps (02:19:05, near the Meridian perimeter camp) |
| Auto-adjust | `graphics-auto-nothing-left` at every check: settings were already at the floor before this run | lowered world detail, landmarks, effects, shadows (reduced, not off) and resolution 100→85 in 3 minutes, then nothing left |
| Bound | CPU, every time | CPU, except one GPU-bound resolution step |
| Freezes over 0.5 s in play | 3.87 s, 0.81 s, 0.93 s, all in `world-model:prepare` | 1.42 s (`frame:render`), 0.91 s (`world-model:prepare`) |
| Typical frame | render submit ~27 ms, updateScatter 6.5 ms, updateCamps 2.8 ms, updatePlayer 2.7 ms, updateDayNightCycle 2.3 ms | render submit ~22 ms, updateScatter 4.0 ms, updatePlayer 2.6 ms, updateCamps 2.1 ms |

### What this says

- **The Deck is far from playable rates on either build.** 2.4.17 is better (28 vs 21 fps), but its auto-adjust also ran out of steps within three minutes. The cost is CPU:
  - the render submit (draw calls through ANGLE on the Deck) is over half the frame;
  - scatter, camps and the day/night cycle add another 10 ms or more every frame.
- **The multi-second freezes are GLB model preparation on the main thread** (`world-model:prepare`), not shader compiles. 2.4.17 had fewer mid-run freezes. The 2026-10-15 room activation pass (b12f0f89) places more GLBs, so preparation cost is worth watching on the Deck.
- **Deck A's death:**
  - At 3:21 the Engineer went from 3 HP to 0 in three seconds: two `mycelium_stalker` hits, then a `poison` tick.
  - Shots were firing (plasma carbine, 25 fire inputs in the last 10 s, many `fire_cooldown` blocks), but the projectiles mostly struck walls (`wall-impact source: player`).
  - At 9–15 fps that is an aiming and readability problem as much as a balance one.
- **Deck B:**
  - It was body-blocked by a sporesnail twice (`player-blocked`) and took one hit.
  - It regenerated to full and collected three shells.
  - The early O2 hint is consistent: about 10% per 40 s (59% after four minutes).
- **Camera settings:** both players opened Settings → Camera & HUD within the first minute and clicked the camera-mode dropdown (Deck B three times in one second). The camera `change` handler logs nothing, so the logs cannot show whether it changed. Log it, and check that the native `<select>` is operable with Deck controls.

### Follow-ups worth taking

1. Deck CPU frame budget: render submit, then updateScatter, updateCamps and updateDayNightCycle per frame.
2. Move GLB `world-model:prepare` off the critical frame, or spread it out, to remove the 1–4 s freezes.
3. Log camera and other settings changes, and verify the camera dropdown on Deck.
4. Read the 2.4.17 Deck numbers again after these, since that build is what testers have now.

## Follow-up work, 2026-10-16

Commits `1959b52c` (settings) and `5926e68b` (performance).

### What changed

1. **Freezes.** The 3.8 s stall was inside the render submit, not model preparation: `renderFrame` max 3843.7 ms in the 02:16:05 frame breakdown. A probe that times every WebGL call inside each render call put long renders down to work three.js does on first draw:
   - shader links for variants never compiled ahead;
   - every new texture uploading in the same frame (up to 39).
   
   Fixes:
   - a texture upload queue spreads `initTexture` over frames at 3 ms each;
   - chunks mounted during play are compiled in the background and their textures queued;
   - late models wait for their own uploads, bounded at 4 s, and only in gameplay.
2. **Per-frame CPU waste:**
   - transparent double-sided materials that need only one pass (flat rain splashes; additive, no-depth-write beacons and light shafts) no longer draw twice with two program lookups each;
   - fog-of-war visibility raycasts once, not twice, near the player.
3. **Settings:**
   - every `setting-*` change is logged (`SETTINGS setting-changed`);
   - on the Deck a touch or trackpad press on a dropdown opens the in-game picker. Gamescope never shows Chromium's native popup, which is why the camera dropdown did nothing.

### What was measured, and what this machine cannot show

- **Hardware path.** On this desktop the real-GPU path is ANGLE over Vulkan on an RTX 2070 SUPER. At 4× CPU throttle it shows no texture-upload or shader-link stalls at all, before or after the change. ANGLE over OpenGL under Xvfb is Mesa `llvmpipe` (software), so its multi-second link times are not a Deck proxy. They only confirm the mechanism.
- **CPU per frame** (V8 profile, 40 s walk): program lookups fell (`getProgram` 0.85 → 0.63 ms, `getParameters` 0.45 → 0.32 ms, `setProgram` 3.5 → 3.2 ms). Total frame CPU varied more between runs than these savings, because enemy AI and position differed. Setting `fixedRunEntropy` before deploy does not give identical worlds.
- **Frame gaps at 4× throttle:** no gap over 1 s with 20+ chunks streamed, and the upload queue drained to empty. One large texture can still take 50–117 ms through the queue.

### Deck capture needed

On a build containing `5926e68b`, play 5 minutes on each Deck: walk through several new chunks and fight once. Then upload the session log. Compare with the 2026-10-15 captures:
- `PERF frame-breakdown`: median `avgFrameMs`, and max `renderFrame` per window;
- long tasks over 500 ms with `lastPhase` `frame:render`;
- `graphics-auto-*` events;
- the new `SETTINGS setting-changed` lines when the camera mode is changed by touch.

Install the same build on both Decks; the relay refuses mismatched builds, and now says so.
