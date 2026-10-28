# QA 2026-10-28: Deck + PC replay — invisible players, invisible enemies, no co-op damage, Foundry UI

**Status:** diagnosed; client fixes committed on `dev/sprint-53` (`8619b72d`, `9a0594a6`, not pushed);
relay candidate image built, **owner deploy pending**; two Foundry design decisions open (§9).

## 1. The owner's report

> look at the recent logs from the steam deck and pc pvp and pve, the models and game really broke on
> replay. I couldn't see the deck on the PC, just their shadow; the enemies that killed one in pvp I
> couldn't see, and the enemy was attacking the deck in pve, I couldn't see it and it wasn't doing
> damage. These problems were fixed earlier. The UI for the overlays breaks the Foundry; it's got a bad
> basic model and shouldn't just work, it needs a part to be gathered. The WASD/arrow controls should
> work and we need to make it clear that you can move up/down with a scroll. Also in PvP the video on
> the PC stalled really bad on load. Why did these regress?

The asks, as tickets:

| # | Ask | Status |
|---|---|---|
| T1 | PC sees only the Deck player's shadow (and the reverse) | Not reproduced on the dev GPU. Self-check and sprite fallback shipped in `8619b72d`. Logs will now name the cause (§4) |
| T2 | PvP: enemies that killed a player were invisible to the other player | Root cause: stale relay (§3). Fixed by the relay deploy |
| T3 | PvE: an enemy attacked without being seen and without doing damage | Root cause: stale relay (§3). Client fallback shipped in `8619b72d`; the relay deploy restores the intended path |
| T4 | Foundry kiosk overlays break the Foundry UI | Fixed in `9a0594a6` (§5) |
| T5 | WASD/arrows must work in the Foundry; make clear it scrolls | Fixed in `9a0594a6` (§5) |
| T6 | Foundry is a basic model | Open, needs owner choice (§9) |
| T7 | Foundry should need a gathered part before it works | Open, needs owner choice (§9) |
| T8 | PvP: the video on the PC stalled badly on load | Diagnosed; fix plan in §6 |
| T9 | Why did these regress? | §7 |

## 2. The captures

From `https://steam.tuesdaycinema.club/logs/session` (all on 2.4.18-beta, so there was no client version skew this time):

| Capture | Device | Mode / role | Build |
|---|---|---|---|
| `…2026-10-27T21-28-01-802Z-mvr75wfh-gkk7.json` | Steam Deck (VIPER-4, Scout) | PvP host | `7c19a7f88a62` |
| `…2026-10-27T21-28-09-253Z-mvr762h3-6pc2.json` | Windows PC (SHADOW-5, Tank) | PvP guest | `7c19a7f88a62` |
| `…2026-10-28T18-08-18-460Z-mvsfgwqm-6mvx.json` | Steam Deck (SPECTRE-3, Scout→Engineer) | PvP host, then co-op host | `d8f48f5a4ec2` |
| `…2026-10-28T18-08-26-261Z-mvsfh2xi-g51u.json` | Windows PC (SHADOW-5, Tank) | PvP guest, then co-op guest | `d8f48f5a4ec2` |

Today's pair covers two rooms. `STEAM-…873637` was PvP; the relay log shows
`MATCH_DEPLOY … "mode":"pvp"`, and the Deck died to a cybersnail at 11:03:38. `STEAM-…300081` was
co-op, deployed at 11:05:17.

**The relay, from `docker ps` / `/health`:** container `hunker-bunker-backend`, image
`hunker-bunker-backend:local` = `candidate-02710831`, created **2026-10-07 07:13**, `uptimeSeconds`
1 828 750. The relay serving these matches is three weeks older than the client.

## 3. T2 + T3: enemies unseen and harmless — the relay was never redeployed

### Evidence

- **Co-op, host side (Deck):** 55 × `enemy-contact-hit-sent`, 11:07:16 → 11:07:53. Every one targets
  the PC (`AhRdR2s03umJNN-NAAAe`), from the two `arrival:1833479190:{0,1}` cryosnails.
- **Co-op, guest side (PC):** no `enemy-contact-hit-applied`, no health change after deploy.
- **Relay log for the same minutes:** no `ENEMY_CONTACT_HIT` lines at all, because the deployed relay has
  no handler for that event.
- **PvP (both days):** the 10-07 relay's `enemyState` handler still begins
  `if (!player.roomCode || !player.isHost || player.mode === 'pvp') return;`. It discards every
  host enemy snapshot in PvP, so each screen runs its own enemies. The cybersnail that killed the Deck
  at 11:03:38 (`pvp-round-completed … "reason": "cybersnail"`) was chasing the Deck on the Deck. The
  PC's copy of the same enemy was elsewhere.
- **Why the PC never saw the snails biting it:** the PC opened the Foundry at 11:07:19
  (`fabrication-bay-opened`), three seconds into the bites, and stayed in the kiosk until after they
  stopped. The kiosk covers the whole screen (§5). The Deck, meanwhile, watched snails chew a
  squadmate who took no damage.

### Code

- `server/relay.js:1075` — the `enemyContactHit` route. Added in `2dcaa27a` (10-26), never deployed.
- `server/relay.js:1002` — `enemyState`; the PvP drop was removed in `36dbe55d` (10-15), never deployed.
- `src/threeGame.js:7957` `reportEnemyContactHit` → relay → `src/threeGame.js:7979` `handleEnemyContactHit`.
- `2dcaa27a` also **deleted** the guest's own replica bite in `updateRemoteEnemyReplica`
  (`src/threeGame.js:46289`). The new client therefore depended on the new relay, and against the old
  relay co-op contact damage to guests became zero.

### Fix

1. **Client (shipped, `8619b72d`):** the relay now names the routes it carries. `RELAY_FEATURES`
   (`server/relay.js:73`) is sent in both `matchStarted` emits; the lobby carries it into the session
   (`src/multiplayerLobby.js:1260`, `:1277`), and the game reads it (`src/threeGame.js:7051`).
   When `enemyContactHit` is missing, the host sends no bite and the guest's replica bites again, as
   before `2dcaa27a` (`src/threeGame.js:46320`). Every match logs `relay-features` with a `missing`
   list, so a stale relay shows up in the first lines of a capture. Tests: `src/threeGame.coopSync.test.js`
   ("bites the guest from its replica when the relay cannot route host bites", "sends no host bite the
   relay would drop") and `server/relayPvPAuthority.test.js` (matchStarted carries the list).
2. **Relay (owner step):** deploy the candidate built from `9a0594a6`. That restores host-authoritative
   bites in co-op and host enemy snapshots in PvP (T2). See §8.

## 4. T1: only the other player's shadow showed

### Evidence

Both sides built the remote 3D body (`remote-avatar-created … "visual": "sprite-fallback"`, then
`remote-avatar-3d-ready`). The PC→Deck Scout body was ready at 14:26:10, the Deck→PC Tank at 14:26:18.
No `remote-avatar-3d-fallback` was logged, so the code believed the body showed and hid the sprite.

A body whose colour pass draws nothing still casts a shadow, because the shadow pass renders with its
own depth material. That is the signature of a material program that never linked, or of a body that
was never drawn. `renderer.debug.checkShaderErrors` is off in builds (see
`tests/e2e/probes/runtime-errors.spec.js`), so such a failure is silent.

### What was ruled out (GPU harness, Xvfb + Vulkan ANGLE, RTX 2070 SUPER)

| Probe | Result |
|---|---|
| Remote Tank/Scout/Engineer, standard loadout, PvP and co-op | All draw; programs linked |
| Remote with every class-legal chassis skin (20 cases) | All draw; world height 1.47–1.77, on the player |
| Fragment samplers per remote program (16-unit D3D11 limit; see `4ff2dc00`) | ≤ 9; not the cause |
| Root scale 148/138 on Tank/Engineer | Same on the local player; normal for those GLBs |

The remaining differences from the field are the Windows D3D11 and Deck GL/Vulkan drivers, the packed
Steam build, and avatars that were created *before* the deployment world restore. The probe created
them mid-gameplay.

### Fix (shipped, `8619b72d`)

`src/threeGame.js:7572` `armRemoteAvatarRenderCheck` / `:7591` `checkRemoteAvatarRender`, using
`src/remoteAvatarRenderCheck.js`. A few seconds into gameplay each remote body is checked:
- the colour pass drew it (an `onAfterRender` stamp);
- every program reports `LINK_STATUS`;
- its world height is 0.4–6;
- it stands within 2 units of its player.

The result is logged as `remote-avatar-render-ok` or `remote-avatar-render-failed`, with `problems`,
`unlinked`, `noProgram`, `height`, `offset` and `maxTextures`. On failure the body is hidden and the
sprite comes back, so the player is never invisible again. Verified on the GPU harness: healthy bodies
stay 3D; a body pushed 10 units off its player falls back to the sprite.

**Next capture:** grep `remote-avatar-render` and fix the named cause.

## 5. T4 + T5: the Foundry kiosk

### Evidence

- **Deck, 11:06:29–11:06:32:** `focus-route … "root": "fabrication-modal" … "to": "bezel-hex-screw screw-tr"`,
  then `screw-tl`, `screw-br`. The d-pad walked the bezel's decorative screws. At 11:06:36 a tap
  beside the machine (`Click -> <div#fabrication-modal.modal>`) closed the bay (`MENU close`).
- **PC, 11:07:24–11:07:51:** the same aisle clicked three times, then the keypad, the
  screws and the coin lever. The player was poking the painted machine for 30 s.
- **GPU probe, before the fix:** ArrowDown/S/D/W moved only between `bezel-coin-lever`, keypad `ENT`
  and the screws. The machine screen is 339 px tall with 600 px of content, it scrolled by mouse
  wheel only, and nothing on screen said so.

### Cause

The kiosk work (`9df5e396`, `77ac1e5b`, 10-27) seats `src/terminalBezelInteractivity.js`'s buttons (screws,
keypad, coin lever, DIP switches) on the painting. Real `<button>`s, so
`getVisibleControllerFocusables` (`main.js:912`) offered them to spatial focus. Arrows and WASD were
already mapped (`main.js:1425`); they just had the wrong targets.

### Fix (shipped, `9a0594a6`)

- `data-controller-skip` on the bezel layer (`src/terminalBezelInteractivity.js:145`) and on every
  control `seatBezel` moves out of it (`src/kioskTerminals.js:86`). Those elements are filtered out
  at `main.js:943`, so mouse and touch still reach them but the pad and keys never stop on them.
- `scrollFocusedRegion` (`main.js:1411`): up/down at the last control scrolls the region it sits in.
  W/S/arrows/d-pad now read the whole list.
- `seat()` (`src/kioskTerminals.js:148`) restores focus after an aisle swaps machines (Lotto → Slot-O-Mart).
  Before, it dropped focus to `<body>`.
- The world Fab Bay ignores outside clicks (`main.js:14036`); EXIT closes it.
- `attachScrollCue` (`src/kioskTerminals.js:36`): a sticky "▼ MORE BELOW · SCROLL · W / S · ↑ / ↓ · D-PAD"
  pill above the painted lip, shown only while there is more below (`ui.kiosk.scroll_more`, 7 locales).

Verified on the GPU harness: Left/A reach the aisles; Down/S and Up/W scroll the screen to the bottom
and back; focus survives the Lotto swap; the cue shows on open and hides at the end.

**Suggestions not done:**
- Disabled "NEED 12 TECH / 6 COIN" buttons are skipped by the pad, so a pad player reads them by
  scrolling. Making them `aria-disabled` + `data-controller-focusable` (as the Armory's locked tiles do)
  would let the pad land on and explain them.
- Add a `foundry-kiosk` journey to `tests/e2e/probes/controller-journey.spec.js`. That probe would
  have caught the screws.

## 6. T8: the PvP video stall on the PC

| Moment | PC long task | Attributed phase |
|---|---|---|
| "Armory departure" video, 10-27 14:25:13 | 1 313 ms | none |
| "Armory departure", 10-28 11:01:35 | 2 064 ms, then 3 229 ms at 11:01:48 | none |
| Before the second departure, 11:04:37 | 3 594 ms | none |
| Deploy `startup:first-frame`, 10-27 | 5 038 ms (whole deploy 37 s) | `startup:present` |
| Deploy `startup:first-frame`, 10-28 | **5 523 ms** (build has `69091b8c`) | `startup:present` |

The departure video plays while the main thread blocks for 1–3.6 s at a time, and nothing tags those
tasks. The 10-27 deploy took 37 s on the PC; today's, with the deploy-stall fix `69091b8c`, took 16 s and
then 5 s (warm caches). The 5.5 s first-frame task on D3D11 is still there.

**Plan:**
1. Wrap the Armory departure path (clip load, embark walk-off, pre-deploy model clones) in
   `perfPhase` marks, so the next capture attributes those 2–3.6 s tasks.
2. Do the D3D11 first-frame shader compile while the doors are closed and the video is *not* playing,
   or hold the video on a still frame until `startup:first-frame` ends. A `<video>` on the same main
   thread visibly freezes during multi-second tasks.
3. Measure on the owner's Windows PC, since the dev box's Vulkan never shows the D3D11 link cost
   (see the GPU harness notes).

## 7. T9: why it regressed

1. **Client and relay shipped out of step.** Fixes "made earlier" were two-sided:
   - `36dbe55d` (10-15): PvP host enemy snapshots;
   - `2dcaa27a` (10-26): host-authoritative co-op bites, which also deleted the guest's own bite.

   Both reached players through the Steam client. The relay was last deployed on 10-07
   (`candidate-02710831`), so both halves were missing on the server. The season-ledger rule "deploy the
   backend before the client" was not applied to relay changes.
2. **No contract check between them.** The relay gated client *builds* against each other
   (`build_mismatch`), but nothing compared the client with the relay. A missing route failed silently:
   the host logged `enemy-contact-hit-sent` 55 times, and nobody saw a reply. `RELAY_FEATURES`
   now closes that: a stale relay is named in `relay-features` and the old path runs.
3. **Kiosk UI landed without a controller pass.** The 10-27 machine overlays added real buttons to a
   focus root, and no probe walks the Fab Bay with a pad.
4. **Silent rendering failures.** With shader checks off, a body that does not draw leaves no trace
   unless the game checks for itself, which it now does for remote players.

**Process suggestions:**
- Any `server/relay.js` change goes in the same PR as a relay redeploy item.
- Append the deployed relay commit to `/health`, and compare it in the session-log upload.
- Every new route gets a `RELAY_FEATURES` entry and a client fallback.

## 8. Owner steps

1. **Deploy the relay** (prod swap; the classifier keeps this with the owner):
   ```bash
   ROLLBACK=rollback-02710831 ~/server/deploy-backend.sh candidate-9a0594a6
   ```
   `candidate-9a0594a6` was built from the committed tree with `git archive` (no worktree). It was
   smoke-run on a spare port, reported healthy, and its image contains `RELAY_FEATURES` and the
   `enemyContactHit` route. `rollback-02710831` is the image live now. The script's built-in defaults
   (`candidate-7783278f` / `rollback-2cac8504`) are stale, so pass both explicitly as above.
2. **Push `dev/sprint-53`** and cut a Steam build, so the client sends `relay-features` and the avatar
   self-check. The client fallback also works against the old relay, so the two can ship in either order.
3. **Replay the same pair** (Deck host + PC guest, PvP then co-op) and upload both logs. Look for:
   - `relay-features` with `"missing": []`;
   - `ENEMY_CONTACT_HIT` in `docker logs hunker-bunker-backend`;
   - `remote-avatar-render-ok`, or `remote-avatar-render-failed` with its `problems` list.

## 9. Open decisions (T6, T7)

- **T6, the model.** The world Foundry is seven primitives (`src/foundry.js:32` `build`: a socket,
  slab, box body, marquee, panel and keypad). Shipped GLBs that could stand on its socket are
  `public/3d/runtime/new3ds/life_vending_machine.glb` (matches the Auto-Mart the player opens),
  `prop_fabricator_workstation.glb` (reads as a printer), and `corp_debt_severing_kiosk.glb`. The
  first two are also room dressing, so the Foundry needs its socket and glow to stand apart. A
  bespoke GLB is the other route.
- **T7, a part to gather.** Today the Foundry is revealed when the base powers up, and it opens straight
  away (`src/threeGame.js:20339` `interactWithFoundry`). Activation is a resource tally
  ("FOUNDRY ACTIVATION: TECH 0/20 / COIN 0/8 / MED 0/5"). The cargo-carry flow the first-night cot uses
  ("CARGO LIFTED — BOTH HANDS OCCUPIED. RETURN TO THE CAMP BERTH") could carry a *Fabricator Core* from
  a seeded salvage site to the socket. Install it and the machine boots and opens. Questions: does the
  core replace the TECH/COIN/MED activation or come before it; is it per run or once per campaign;
  and in co-op, does one player's install count for the squad (`squad-progress`)?

## 10. Other findings

- **Deck frame rate:** 7 fps in PvP on 10-27 (`graphics-auto-lowered … "fps": 7, "bound": "cpu"`).
  Auto-adjust stepped `worldDetail` and `landmarks` down on both machines within 25 s.
- **Unarmed at start (10-27 PvP):** the Deck's 7 `no_weapon` blocks were fixed by `69091b8c` (today's
  build equips `sector-zero-loadout` in both modes). The gun arrives when the mission intro ends,
  31–38 s after gameplay starts, a few seconds apart on the two machines. Skipping the mission intro
  in PvP would arm both at the doors.
- **WebGL context lost at boot** on both machines today (`webgl-context-lost`, 10:58:54 Deck,
  11:00:25 PC). The game recovered, but it is new in these captures and worth watching.

## Status log

- 2026-10-28: diagnosis; `8619b72d` (relay features + guest fallback + avatar self-check),
  `9a0594a6` (Fab Bay pad/keys/scroll). vitest 786 files / 6 687 tests pass; eslint clean;
  `i18n:audit` unchanged. Relay candidate `candidate-9a0594a6` built and smoke-run. Not pushed;
  relay not deployed.
