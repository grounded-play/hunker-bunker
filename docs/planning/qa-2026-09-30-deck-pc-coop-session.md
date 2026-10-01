# QA 2026-09-30: Deck + PC co-op session findings

Two session captures uploaded to the shared log drop box (`GET https://steam.tuesdaycinema.club/logs/session`) after a co-op session on the evening of 2026-09-30. They are input for Sprint 49 planning. The previous session's write-up is [qa-2026-09-24-deck-pc-coop-game-plan.md](qa-2026-09-24-deck-pc-coop-game-plan.md).

## Sources

| | PC | Deck |
|---|---|---|
| Log | `hunker-bunker-session-2026-10-01T00-14-42-479Z-muos88zm-5cdy.json` | `hunker-bunker-session-2026-10-01T00-15-01-825Z-muos8ndi-cult.json` |
| Build | **`v2.4.13-beta-95ff72858d39`** (log schema 3) | **`v2.4.9-beta-22369342f38e`** (log schema 2) |
| Account | Deadman's Hand, **host** | tuesday-cinema-club, guest |
| Hardware | RTX 2070 SUPER (D3D11/ANGLE), 64 threads, 32 GB | Steam Deck (vangogh), 8 threads, 16 GB |
| Length | 11.1 min, 1,216 entries, none dropped | 8.6 min, 1,473 entries, none dropped |
| Class | TANK (plasma carbine) | ENGINEER (plasma carbine) |
| Room | `STEAM-109775243508304374`, co-op, run seed `run-STEAM-109775243508304374:3293006093` | same |

### Timeline (UTC)

| Time | PC (host) | Deck (guest) |
|---|---|---|
| 00:05:00 | hosts lobby, readies | still booting |
| 00:07:31 | | joins from Steam lobby list, readies |
| 00:07:41 | START SQUAD, deploy | deploy |
| 00:08:01 | control handed over (20 s load) | control handed over (19 s load) |
| 00:10:03 | **downed by cryosnail (0 HP)**, not revived | at 2 HP from a crawler, heals to 3/3 at 00:10:13 |
| 00:10:48 | after 45 s down, ABORT MISSION; TRY AGAIN in the same room | keeps playing |
| 00:11:10 | recovers own black box (both screens see it) | |
| 00:12:28–00:13:03 | finds CAMP MERIDIAN (3 authored rooms), O2 refilled to 99% | |
| 00:12:53 | | **dies of O2 depletion near spawn; recorded as `squad-wipe`** |
| 00:13:05–00:14:15 | lore drop, Overseer Kaelen dialogue, supports camp (bond 1) | game over screen |
| 00:14:31–00:14:34 | **killed by three cryosnail hits whose source is ~102 m away**, recorded as `squad-wipe` | |

Neither player completed the mission (`CONTAINMENT: CLEAR SIX HOSTILES`). Kills across 11 minutes: 2 snails (PC), 0 (Deck). Revives: 0. Trades: 0.

## Findings

### P0: The two machines ran different builds, and nothing stopped it

The host ran 2.4.13-beta, published that afternoon. The guest ran 2.4.9-beta from 2026-09-23. There are 208 commits between them, including most of the co-op networking work since the 9-24 QA (`39a7375` networked deaths, `42c4bbc`/`caf5816` TRY AGAIN map carry, `8da53dee` boss authority, `712d0f75` companions).

- The Deck was on **v2.4.12** in the 9-24 session, so it went backwards. The likeliest explanation is that the Deck dropped off the Steam `beta` branch onto the default branch, which still serves 2.4.9. Uploads go to `beta` (see the leaderboard-fix notes). Check the Deck's Betas setting and what the default branch is set to.
- `server/relay.js` has no build or protocol version check. The relay matched a 2.4.9 client with a 2.4.13 host and both sides behaved as if that were fine.
- **Most co-op behaviour in this session cannot be trusted as evidence about 2.4.13.** The squad-wipe misattribution below is a direct consequence.

**Sprint 49 ask (S49-05 / S49-15):** send `build.version` and a protocol number in `relay-join`. Have the relay refuse a mismatched join with a message the player can act on ("Host is on 2.4.13-beta, you are on 2.4.9-beta. Update or switch the Steam beta branch"). Show both builds in the lobby roster.

### P0: Enemies attacking a dead or downed squadmate damage the local player instead (confirmed in current code)

The PC's last three hits (00:14:31–00:14:34) came from cryosnail positions (12.1, 13.9), (12.0, 14.4) and (12.8, 14.7). The PC was at about (114, 2). Those positions are where the Deck's operator died at 00:12:53, at (12.86, 14.77). The snail was attacking the Deck's body, and the PC lost all three hearts from about 102 m away.

The cause is in the 2.4.13 code the host was running:

- `selectSnailTarget` (`src/threeGame.js`) adds every remote player as `{ type: 'player', id: peerId }`. It skips only `remote.isDead`, which nothing ever sets. A dead squadmate gets `isDown = true` (`applyRemotePlayerDeath`, `handleRemotePlayerDowned`), so a dead or downed body stays a valid target.
- The snail attack branch then calls `this.takeDamage(damage, …)` whenever `target.type === 'player'`, without checking `target.id === 'local'`. Any snail that reaches a remote player hurts the local one.
- This also happens with both players alive. A snail chewing on your partner anywhere on the map takes your hearts. In 2.4.13 co-op this is a host-side, run-ending bug.

**Fix:** only call `takeDamage` when `target.id === 'local'` (remote players get no local damage, since their own client is authoritative for their HP), and skip `isDown` remotes when picking a target. Add a regression test. Check the other enemy types' attack paths for the same pattern.

### P0: Squad-wipe triggered while a squadmate was alive (version-skew artifact, verify on matched builds)

- The PC went down at 00:10:03. It stayed at 0 HP for 45 s with no revive, then aborted and redeployed with TRY AGAIN.
- On the Deck (2.4.9), the PC never stopped being "down". 2.4.9 does not have `applyRemotePlayerRedeploy` / `player-redeployed`, which came in `39a7375`. So when the Deck reached 0 HP at 00:12:53, `resolveCoopSquadWipe` saw every remote down and ended the Deck's run immediately as `squad-wipe`. The PC was at 3/3 HP at the time.
- The PC's own death at 00:14:34 was also an instant `squad-wipe`, because the Deck was on its game over screen.

On matched 2.4.13 builds the redeploy message should clear this. It needs a re-test, not a code change yet.

**Design question for the owner:** the PC was down for 45 s and the Deck never revived. Did the Deck player see a SQUADMATE DOWN prompt, and know how to revive? `squadRevives: 0` in both scores.

### P1: Deck operator suffocated next to spawn

The Deck's O2 went from 99% at 00:08:10 to 0% at 00:12:49 (about 4.6 min). Below 20% the drain ran at about 1% every 2.3 s, roughly 1.5× the earlier rate. It died at (12.9, 14.8), a few metres from its spawn at (13, 9) and the bunker door, with no refill. The PC only survived because it found Camp Meridian, which refilled it to 99%.

Questions: does the bunker refill O2 for a co-op guest? Did the Deck player have any warning or route to air? The O2 economy in co-op needs a pass (S49-17 / S49-28).

### P1: Deploy load is gated by the Deck's shader compile

Both machines handed over control at 00:08:01. The PC presented its first frame at 00:07:48 and then waited 13 s. Its capture records this as one 13.6 s long task with no phase attribution. The Deck spent about 12.4 s compiling shaders (direct-compile 4.4 s, direct-render 2.1 s, composer-compile 5.6 s), then a 1.5 s `frame:render` stall right after SKIP INTRO. The PC's own warmup was 4.4 s.

On redeploy (TRY AGAIN) the PC's warmup dropped to 0.5 s total because the programs were cached. That shows the shader cache works within a session, but the first deploy costs the whole squad the Deck's cold compile. Persisting the program cache across launches, or warming during the lobby, would shorten every co-op start (S49-31).

### P1: PC frame pacing is CPU-bound and degrades as the world fills in

On an RTX 2070 SUPER, gameplay frame intervals were p50 21.6 ms / p95 64.5 ms / p99 89.9 ms. The GPU averaged about 11 ms. Adaptive quality engaged at 00:08:25 (`sustained-low-fps`, 32.5 fps) and dropped the pixel ratio to 0.85, which can't help a CPU-bound frame.

- Rolling p50 rose from 30.9 ms to 37.5 ms as the run grew: geometries 158 → 1,470, scatter 378 → 876, active chunks 9 → 36.
- Hitches: 5.76 s around the black-box recovery cutscene (00:11:10), 3.6 s at game over, 4.1 s at the final death, and a 2.1 s window in the middle of the cryo crossing (00:12:19).
- In total, 73 s of main-thread long tasks in 11 min on the PC. The Deck logged 72 s over 149 windows.
- GPU memory estimate: 1.76 GB, of which textures are 1.61 GB. 4,469 unique materials against 2,779 unique geometries suggests materials are being cloned per instance.
- The Deck was steadier than the PC (gameplay p50 28.5 / p95 31.9 ms; it is capped at 30 fps).

Per the standing rule, these call for profiling and output-identical fixes, not quality cuts (S49-31).

### P1: Deck firing feels broken

The Deck fired 33 accepted shots against 116 blocked ones (68 `fire_cooldown`, 48 `reloading`), with `ui_error` played on blocked shots (52 plays). The PC's ratio was 16:24. All Deck fire input arrived as `source: "pointer"` (trackpad or touch emulating a mouse), not as the controller fire action. On 2.4.9 the Deck player was presumably holding or mashing a trigger mapped to mouse-click faster than the carbine's rate, and hearing an error buzz on most presses.

Re-check on 2.4.13. Consider auto-fire while held and no error sound on cooldown (S49-10 / S49-18).

### P2: Biome boundary flicker

The PC crossed the cryo/bio boundary 5 times in 2.5 min at `distance` 103 ↔ 104. Each crossing fires the ENTERING … SECTOR toast and swaps the O2 drain multiplier (1.15 ↔ 1.3). The boundary needs hysteresis (S49-20).

### P2: Telemetry gaps found while reading these logs

- **Draw calls read as 1 and triangles as 1 during gameplay** on 2.4.13 (`renderer.calls`, the perf timeline's `drawCalls`). The counter is read after the final composer pass resets it, so S49-31's draw-call budget can't be measured from captures yet.
- The 13.6 s deploy long task has no `activePhases` or `lastPhase`. The deploy barrier or wait isn't instrumented.
- `sampled-events` aggregates most WEAPON and AUDIO entries, so the shot and kill counts above are lower bounds.
- 2.4.13 dropped nothing (`droppedEntries: 0`), and the schema-3 `route` block (expedition seed `3082285546`, condition `glacial_gale`, layout v2, multiplayer role) is useful. Keep it.

### P2: Other observations

- **XP scale:** one `depth` XP gain of **3,250** on first entering cryo, against 50 for an objective. Check whether that is intended (S49-24).
- **Dev surfaces on a Steam build:** the PC's Armory showed `DEV UNLOCK` badges ("Amber Bio-Flask", "Void Horizon Sigil"), so the dev UNLOCK ALL flag is on for that profile. Confirm it can't be reached by players. The `HUD: DOCK / CLASSIC` toggle (`armory-debug-hud-layout-btn`) renders for everyone.
- **Solo state on a co-op client (2.4.9):** the Deck restored `foundry-discovered` from `o2-bubble-state-restore` at boot. This is presumably fixed by `de618608` (fresh story in co-op). Verify on 2.4.13.
- **Missing audio (2.4.9):** `terminal_deny` once on the Deck's game over.
- **TANK block works:** two `player-blocked` cryosnail events on the PC.
- **Content that landed well:** camp discovery → lore drop → Kaelen deep-sync dialogue → camp support (bond 1, 5 cost) all fired in order on 2.4.13, with the song interstitial.
- **Boot:** PC 9.7 s to boot-ready (10 long tasks, 2.3 s); Deck 12.0 s (3.1 s, including a single 1.9 s task).

## Fix status (2026-10-01)

| Finding | Status | Where |
|---|---|---|
| Enemies attacking a remote squadmate damage the local player | **Fixed.** Remote targets never call `takeDamage`/`applyPlayerSlow` locally; downed squadmates are not snail targets | `src/threeGame.js` (`selectSnailTarget`, snail attack, corrupted-engineer jam); `src/threeGame.remoteTargetDamage.test.js` |
| No relay build gate | **Fixed.** Joins carry `buildVersion`; the relay locks a room to its host's build and rejects others with `build_mismatch`; the toast names both builds (7 locales) | `server/relay.js`, `src/multiplayerLobby.js`, `server/relayBuildVersionGate.test.js`, `src/multiplayerLobby.buildGate.test.js` |
| Squad-wipe while a partner is alive | Expected fixed by 2.4.13's `player-redeployed` and now impossible to reproduce across builds. Re-test on matched builds | — |
| Biome flicker, draw-call counter, deploy wait attribution, Deck fire feedback, XP scale, guest O2 | Open | — |

The relay gate needs a backend redeploy (`docker compose up -d --build --no-deps hunker-bunker-backend` in `~/server`) to take effect.

## What to do before the next co-op QA

1. Put both machines on the same build: check the Deck's Steam beta branch, and decide whether the default branch should move off 2.4.9.
2. Fix the remote-target damage bug (P0 above). It will end runs on matched builds too.
3. Add the relay version gate so a skewed session can't happen silently again.
4. Fix the draw-call counter so the next capture measures S49-31.
5. Re-run the same script on matched builds: down → revive, down → abort/TRY AGAIN → partner dies, guest O2 near the bunker, Deck trigger fire.
