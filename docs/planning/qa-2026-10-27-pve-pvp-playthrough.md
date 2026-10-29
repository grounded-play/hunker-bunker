# QA 2026-10-27: PvE and PvP playthrough (server logs)

Status: findings; #3, #5 and #6 addressed 2026-10-27 | Owner: QA | Updated: 2026-10-27 | Review: after the next two-machine session

Three session logs uploaded from the in-game console on 2026-10-27, fetched with `npm run logs:fetch -- --latest 3` and read with `npm run logs:analyze`. **All three are the same build, `2.4.18-beta` at `7c19a7f88a62`** (today's clean build, which includes the kiosks and the Armory departure), so nothing below is version skew.

| Log | Machine | Persona | Time (PDT) | What it covers |
| :--- | :--- | :--- | :--- | :--- |
| `…T21-23-36-427Z-mvr707yw-5cz2` | Windows PC, 2304 × 1440, mouse/keyboard | Deadman's Hand | 14:14–14:23 | **PvE co-op**, as host (TANK, BUNKER-1) |
| `…T21-28-01-802Z-mvr75wfh-gkk7` | Steam Deck, 1280 × 800, Deck controls | tuesday-cinema-club | 14:24–14:28 | **PvP**, as host (SCOUT, VIPER-4) |
| `…T21-28-09-253Z-mvr762h3-6pc2` | Windows PC | Deadman's Hand | 14:24–14:28 | **PvP**, as guest (TANK, SHADOW-5) |

The PvE guest (TITAN-2, ENGINEER) has no log: the Deck's capture restarts at 14:24, so its PvE session was not uploaded.

## The setups

**PvE.** The PC hosted room `STEAM-…046750`; TITAN-2 joined (roster 2), both readied within three seconds, and the PC deployed at 14:15:14. Gameplay began at 14:16:38. The players broke props and walls, killed two bosses (two `+500 XP boss` awards, boss shells), and the guest chose **Abort Mission** at 14:22:52 and the host aborted too at 14:22:57. Both returned to the Armory.

**PvP.** The PC first opened its own room (the PvE room code), left it after 18 s (`io client disconnect`), and joined the Deck's room `STEAM-…841777`. Both readied, deployed at 14:26:03 and reached gameplay at 14:26:38. One round: the PC's Tank won at 14:27:18, the results screen showed on both, and both went back through the Armory to the menu. No rematch was tried.

## What worked

- **Join, ready, deploy, remote 3D avatars** on both runs, one relay join each, no stale rosters, no errors logged.
- **PvE co-op state stays in sync**: a boss smashing walls on the guest shows on the host (`wall-destroyed fromRemote: true`), the guest's death and redeploy reach the host, and the run ends for both together.
- **PvP damage and attribution (#51)**: each rival hit removed exactly one heart on the Deck (4/4 → 0 in four hits), the server's cadence guard rejected one over-fast hit (`hit_cadence`), and both clients report the **same round with the same winner and loser** (`roundId 2cc95cae…`, PC winner, Deck loser). Results appeared on both and both returned to the menu.
- **No version skew, no relay failures**, Steam, achievements and Cloud all active.

## Problems, by priority

| # | Priority | Finding | Evidence |
| :--- | :--- | :--- | :--- |
| 1 | **P0** | **Frame rate.** Deck averaged 106 ms a frame (**9.4 fps**, p95 201 ms) in PvP; the PCs 38–49 ms (20–26 fps) at 2304 × 1440. GPU time is tiny (Deck 0.5 ms, PC 1.4–2.7 ms), so the main thread is the bottleneck. PvE logged 1,369 long tasks, with 50–130 tasks in every 10-second window during play. | `presented gameplay`, `performance`, `longTasks` in the analyzer output |
| 2 | **P0** | **Deploy stall.** One 36.5-second main-thread block during PvE deployment (84 s from deploy to gameplay); 3.4 s (Deck) and 5.0 s (PC) in PvP. All of it falls in the `startup:ready` stage, the first live frames after the loading screen, right after the world models (dead boss bodies last) are cloned in. On Windows/D3D11 that is the signature of shader programs compiling on first render; `compileAsync` pre-warm exists (`src/threeGame.js` ~46879), so either something escapes it or a light/material change after it forces a recompile. | `Long task window … max 36523ms, lastPhase startup:ready` |
| 3 | **P1** | **PvP players can deploy unarmed.** A run starts with the class gun on the Sector Zero weapon rack. The Deck Scout never picked it up and punched for 22 s (`shot-blocked: no_weapon`) until the armed Tank killed them in one second. In PvP the gun should be in hand at deploy, or the rack must be impossible to miss (prompt + marker, especially on controller). The PvE host was also unarmed for the first minutes. | `WEAPON shot-blocked no_weapon`, Deck 14:26:50–14:27:12 |
| 4 | **P1** | **Spawned into crawlers.** 1.2 s after PvE gameplay began, the host took two crawler hits 0.13 s apart (3 → 1 heart) at the spawn point. | `player-damaged reason crawler` 14:16:50.085 and .220 |
| 5 | **P2** | ~~One player's Abort Mission ends the other's run.~~ **Corrected:** abort is per-player. The host log shows the host pressing ABORT MISSION themselves at 14:22:55, five seconds after the guest's abort marked the guest down. The confirm dialog now says so: in co-op only you leave and the squad keeps the expedition; in PvP the relay awards the round to the rival. | `remote-player-died mission-abort` 14:22:52, then the host's own `Click -> #abort-mission` 14:22:55 and `#confirm-yes` 14:22:57 |
| 6 | **P2** | **No telemetry for picking up the rack gun**, so "when was the player armed" has to be inferred from the first `no_weapon` block ending. Log `field-weapon-equipped`. | absence in all three logs |
| 7 | **P3** | Deck flagged a possibly stale remote avatar after the round (roster 1, avatar 1). | analyzer `possibleStaleAvatars=yes` |

## Ticket status from this session

| Ticket | Evidence here | Can it close? |
| :--- | :--- | :--- |
| **#51** PvP certification | one heart per hit ✔, correct attribution ✔, results ✔, return to menu ✔ | **Not yet**: rematch and return-to-lobby untested, and finding 3 (unarmed deploy) should be fixed first |
| **#85 / #77** co-op | join, ready, deploy, host damage, two bosses, synced run end ✔ | **No**: no extraction, companion, camp quest, suspend/resume or Game Over layout check, and the guest log is missing |
| **#52** performance | Deck 9.4 fps, 36.5 s deploy stall | **No**: fails the bar (Deck p95 ≤ 33.3 ms, PC ≤ 16.7 ms, no stall over 250 ms) |
| **#53** Deck controller-only | Deck played PvP on its controls | **No**: needs the full controller-only route |

## Next

1. Fix finding 3 (PvP deploys armed) and add the equip telemetry (finding 6); both are small.
2. Profile the deploy stall on Windows: capture which programs compile in `startup:ready` and fold them into the pre-warm behind the loading doors.
3. Profile the per-frame main-thread cost on the Deck (the long-walk notes in memory point at enemy pathing; check what dominates these 50–130 long tasks per window).
4. Next two-machine session: upload **both** logs per run, add extraction, a companion recruit, a camp quest, a rematch, and a Deck suspend/resume.
