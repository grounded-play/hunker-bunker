# Session Log Analysis: Steam Deck Solo + PvP Session, 2026-09-23 (evening)

Status: evidence report · Updated: 2026-09-23 · Feeds: [master gaps register](master-known-gaps-and-debt-register-2026-09-23.md) §9 and the [Sprint 45.2 plan](../planning/sprint-45.2-release-hardening-plan.md)

## Provenance

| Field | Value |
| --- | --- |
| Log | `logs/hunker-bunker-session-2026-09-23T21-41-56-139Z-muemotn6-gfn2.json` (fetched with `npm run logs:fetch -- --name …`) |
| Capture | 2026-09-23 21:29:47Z → 21:41:56Z (728 s, 3,726 entries, 0 dropped) |
| Build | `v2.4.11-beta`, commit `aafe429fae34`, branch `dev/sprint-45`, clean, built 21:11:59Z — packaged Steam install (`app.asar`) |
| Runtime | Electron 44.4.4, Chrome 152 |
| Hardware | Steam Deck (AMD Custom GPU 0405, radeonsi/ACO via ANGLE-GL), 16 GB, stage 1280×800, drawing buffer 1086×678 (pixel ratio 0.85) |
| Steam | active, AppID 4957040, Cloud enabled (app + account), backend auth configured |
| Operator | ENGINEER, callsign BUNKER-1; campaign seed 3712041748 |
| Route | Solo deploy (seed `expedition-1074867409`) → pit-fall death → solo redeploy (`expedition-586569448`) → mapping objective complete → mission abort → Armory → **PvP room `STEAM-109775242580143121`** vs `AGENT` (TANK) → two PvP deaths → export |

**Scope.** One client only. The rival's (TANK) log was not uploaded, so every PvP statement below is from the Deck's side. What the log shows is marked **observed**; causes traced in code are marked **traced**; the rest is **inferred**.

---

## 1. Performance — still not playable on Deck

| Profile | Intervals | p50 | p95 | p99 | Max |
| --- | --- | --- | --- | --- | --- |
| gameplay | 4,706 | **84.7 ms** (~12 fps) | 223.6 ms | 519.5 ms | **4,613.7 ms** |
| menu | 216 | 48.9 ms | 50.6 ms | 152.4 ms | 961.1 ms |

428 long-task windows, 25 of them ≥ 700 ms; worst 2,655 ms at 21:39:19. JS heap 239 MB (stable; no leak signal). **Transient effects stayed at 3–13** — the 64 cap holds on hardware, and the September 23 morning failure mode (3,277 effects) is gone. The remaining cost is elsewhere:

1. **Shader-program storms at deploy (observed + traced).** The program count jumps with the worst stalls: 5 → 130 (21:31:57–21:32:02), 169 → 294 → 434 (21:39:09–21:40:12, entering PvP). Each spike follows chunk mounts and lands in `frame:render`. `setPerformanceProfile` toggles `shadowMap.enabled` on every gameplay↔menu switch (`src/threeGame.js` ~8685), and shadows are a shader cache key; new PvP/remote-avatar materials add more variants. The staging prewarm covers the scene at load, not materials that arrive with later chunks or the remote avatar.
2. **Results screen renders the world at 0.5–1.7 s/frame (observed + traced).** 21:37:42–21:38:08: after the mission-abort death the profile stays `gameplay` with 28 active chunks while the game-over screen is up — 12 consecutive windows of 816–1,679 ms. Nothing is visible to render.
3. **Deck profile keeps the expensive path on (observed).** `adaptive-gameplay-quality-engaged` reports `shadows: true, postprocessing: true` with 20 PointLights; frames sit at ~85 ms even with no stall. Adaptive mode lowered only the pixel ratio.
4. Geometry count grows with explored chunks (0 → 1,753 at 28 chunks, back to ~1,300 after reset) — bounded, released on reset.

## 2. PvP — works end to end, several rules wrong

Observed working: Steam lobby join, roster, ready gate (including a guest un-ready/re-ready), deploy, remote 3D avatar, PvP damage (`pvp-rival` hits on the Deck in the log; the tester reports landing shots on the rival), death, respawn, relay door sync.

| # | Finding | Evidence | State |
| --- | --- | --- | --- |
| P1 | **Campaign fatigue carries into PvP.** Max HP went 5 → 4 → 2 across the two solo deaths; the Deck entered PvP with 2 hearts against a fresh rival and died to two hits 177 ms apart. | `player-health-changed` 21:33:47 (4/4), 21:39:08 (2/2); `getMaxHp` applies `fatigueMaxHealthPenalty` | observed + traced |
| P2 | **Spawn camping / no respawn protection.** Died at the spawn point (9.7, 3.7) 48 s after deploy; respawned on the same spot and was depenetrated there. | `player-death` 21:39:56 at spawn; `spawn-relocated` ×2; `depenetrated` 21:40:11 | observed |
| P3 | **PvP deaths drop a Black Box that pays XP.** Box dropped at spawn, recovered 13 s after respawn for +50 objective XP — farmable by dying. | `black-box-recovered` 21:40:15, `XP gain 50 source objective` | observed |
| P4 | **PvP runs post to the PvE leaderboards.** A PvP death scored 400 and was accepted as a normal run. | `Run score finalized … mode: pvp`, `leaderboard payload accepted (…run-STEAM-…)` 21:40:10; submit path has no mode guard (`main.js` ~16447) | observed + traced |
| P5 | **PvE systems run inside PvP.** A mapping mission ("SCAN A ROUTE TO THE RELAY") and run cards (`camp_paranoia`) were active in the PvP run. | `state.runStats.missionType`, `run-cards-drawn` ×2 | observed; intent unclear |
| P6 | **Bunker door ping-pong.** Both players toggling produced 11 toggles in 19 s, with remote `open:true` arriving twice per toggle. Door toggles are not deduped (`handleSharedWorldEvent` streams them). | `bunker-door-toggled` 21:40:58–21:41:17 | observed + traced |
| P7 | **No outgoing-hit telemetry.** The Deck fired 75 accepted shots; nothing records whether any hit the rival, so hit registration cannot be judged from one side. | only incoming `player-damaged` logged | observed gap |

## 3. Input

- **All 607 fire inputs arrived as `source: pointer`**, and `lastInputMode` was `keyboard` through the PvP portion (observed). The Deck was driving the game through a desktop/mouse layout rather than the game's Steam Input `fire` action — consistent with the Steam Input manifest not being live on the Steam dashboard ([steam-dashboard-handoff](../steam-dashboard-handoff.md)). Needs the tester to confirm which layout was active.
- The tactical map now switches Steam Input to the menu set and back (observed: paired `menu`/`gameplay` transitions around map use) — first hardware evidence for the GAP-GP-01 fix.
- 532 of 607 fire attempts were blocked by `fire_cooldown` (455) or `reloading` (77): held-trigger repeats, not a defect, but each is logged — 1,321 WEAPON + 445 RETICLE + 867 AUDIO entries are 70% of the log.

## 4. Other

- Pit-fall death on the first solo run (21:33:35) — chasms still kill.
- `terminal_deny` audio missing ×3.
- Two depenetrations beside a broken prop (21:32:43).
- No crash, no errors, no dropped entries, suspend/resume survived.

---

## Ticket updates

| Ticket / gap | Update from this session |
| --- | --- |
| #52 / GAP-RN-01 | Cap verified on hardware (≤13 effects). Frame pacing still fails: p50 84.7 ms, max 4.6 s. New causes: shader storms on profile switch/new materials (GAP-RN-09), results screen rendering the world (GAP-RN-10), Deck profile keeps shadows+post (GAP-RN-11). **Stays open.** |
| #85 / GAP-MP-03 | First packaged Steam-lobby PvP session reached gameplay with damage both ways. Co-op (PvE) still unwitnessed; rival log missing. **Stays open.** |
| #51 (PvP certification) | Partial evidence: lobby, ready, deploy, remote avatar, damage, death, respawn observed on Deck. Rules defects P1–P6 block certification. |
| #84 / GAP-GP-01 | Map action-set switching observed on hardware. Fire input via pointer indicates the Steam Input gameplay layout was not active (GAP-GP-11). |
| #86 | This report is a second ingested capture. |

New gap IDs are defined in the register, §9.
