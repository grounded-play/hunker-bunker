# QA 2026-09-24 — Deck + PC co-op session: findings and game plan

Status: plan from one QA session · Updated: 2026-09-24

The owner played the packaged Steam build on a Steam Deck and a Windows PC, two Steam accounts, in co-op. This plan takes every issue they reported, checks each against the exported session logs, and orders the work. Each item says whether the logs **confirm** it, **partly** show it, or do **not** record it (reported by the player only). Nothing here was fixed yet.

## Sources

| | Deck | PC |
|---|---|---|
| Log | `logs/hunker-bunker-session-2026-09-24T21-11-38-478Z-mug11pto-kmzk.json` | `logs/hunker-bunker-session-2026-09-24T21-11-45-579Z-mug11v9w-lew5.json` |
| Build | `v2.4.12-beta-1631488fb33a`, packaged (Steam, Electron 44) | same |
| Account | tuesday-cinema-club (host) | Deadman's Hand (guest) |
| Length | 62 min, 5,529 entries | 4.7 min, 726 entries |
| Play | solo TANK (4 min, ended by mission abort), solo ENGINEER (25 min, died of poison), co-op SCOUT twice (died by pit-fall both times) | co-op TANK (died by pit-fall), redeployed |
| Stage | 1280×800, Steam Deck controller | 2304×1440, keyboard/mouse |

The `logs/` directory is git-ignored; the numbers below are quoted from the logs so this document stands alone. The build is `1631488`, which predates `d0227a0` (Phase 4 transit binding) and the later report fixes on the release branch.

**What the session proves:** two separate Steam accounts joined one relay room, readied, deployed together, saw each other's 3D avatars and redeployed after death on packaged builds — the first real evidence for the two-account co-op gate. No errors were logged on either machine. The leaderboard accepted the co-op run payload.

## Findings

### P0 — Frame rate on the Deck (confirmed)

- Main-thread render (`frame:render`) median **29.4 ms**, p95 41 ms, over 8,495 samples: the render alone caps the Deck near 34 fps before anything else runs.
- 1,527 long-task windows totalling **1,308 s of a 3,723 s session** (35 %); 35 windows had a single task ≥ 500 ms, the worst 2,583 ms. Largest ones are in `frame:render` and chunk mounts (`chunk:mount:*` median 54–60 ms).
- The GPU timer reports 0.39 ms average on the Deck — not credible against the above; treat it as broken on this device.
- Adaptive quality **engaged on the PC but not on the Deck** (`adaptive=no`), which is backwards.
- PC: render median 19.8 ms at 2304×1440; freezes of **10.3 s** (`world-model:prepare`, 3:16 in) and 4.2 s (0:52).
- `scripts/analyze-session-logs.mjs` reports `longTasks count=0` for both logs: it no longer parses the "Long task window" entries. Its performance line cannot be trusted until fixed.

Plan: profile what `frame:render` spends 29 ms on (draw calls, shadow passes, the invisible-model count below); make adaptive quality engage on the Deck; move chunk mounts and `world-model:prepare` off the frame or split them; fix the analyzer so every future log reports this automatically. Acceptance: a Deck log with render median ≤ 16 ms and no task ≥ 500 ms after the first minute.

### P0 — Co-op spawns next to a lethal pit (confirmed)

All three co-op deaths were **pit-falls a few metres from spawn**: Deck at (0.9, −2.3), again 30 s after redeploying at (−0.3, −3.3); PC Tank at (1.4, −1.9). The spawn chunk `0,0` is a "field" with **1,852 void tiles of ~2,336**. Solo spawns elsewhere (the two solo deaths were an abort and poison, far from spawn).

Plan: co-op spawn points must be on walkable ground with a clear margin; add a spawn-safety check (and a unit test over seeds) that no void lies within N tiles of either co-op spawn.

### P0 — A partner's death is not shown to the other player (partly confirmed)

- The PC player died at 21:09:41; the Deck host logged **nothing** at that moment — no remote death, downed or body state. The remote avatar stays a standing character (the reported bug).
- Three seconds after the Deck host itself died, it logged `black-box-recovered` for a TANK black box at exactly the PC player's death spot — the guest's black box ended up on the host and was "recovered" after the host was already dead.

Plan: replicate death/downed state to the remote avatar (pose + black-box marker) through `src/coopTransitions.js`; black boxes in co-op belong to their owner and must not be recoverable by the partner's death sequence. Add a log line for remote death so the next session can confirm it.

### P1 — The map never changes (confirmed) and is the wrong shape (confirmed)

- All four deployments — two solo (expedition seeds `expedition-86397314`, `expedition-1961912786`) and two co-op — generated the **same landforms around spawn** (`0,0` field; `1,0`, `−1,0`, `0,1` canyon; `−1,−3`, `−2,−2` canyon; the rest maze).
- Solo campaign geography is fixed per campaign **by design** (conditions re-roll per deployment; see `src/threeGame.expeditionProgression.test.js`). Co-op pins `runEntropy` to 0 and derives the layout from the room seed `run-STEAM-109775242703783293`, so every co-op session in the same Steam room is the same world. Why the solo campaign and the co-op room produce the same spawn neighbourhood is not yet traced.
- **Big square rooms with no hallways:** 15 of 62 generated chunks are "canyon" chunks that are entirely floor (2,030–2,049 floor tiles, 0 walls, **0 portals**) — three of them surround spawn. Another 23 maze chunks use the `large-room` architecture.
- **No camps:** in 62 minutes there is no camp contact, discovery or quest event; only camp props were broken (crates, sandbags at z 33–66).

**Owner's rule (2026-09-24):** after a death, **TRY AGAIN keeps the same map** — right there, with its changes; **MAIN MENU resets the run**, and the next deployment gets a new map. Against the logs: the co-op TRY AGAIN kept the same map (as intended) but restored the destroyed walls (not intended); the Deck's first solo death → MAIN MENU → next deployment produced the **same** spawn neighbourhood (not intended). The cause is a design decision, not a glitch: solo geography is keyed to the campaign (`campaignWorld.js`, route layout per campaign), and only New Campaign changes it. This rule replaces that: the map belongs to the run, not the campaign.

Plan: key the layout to the run — TRY AGAIN reuses the run's seed and saved maze state, MAIN MENU (and a fresh co-op session) draws a new one; keep campaign progress (bank, goals, unlocks) separate from geography; replace all-floor canyon chunks near spawn with rooms joined by corridors (portals on every chunk edge that has a route); grow Ring 1 so the first route has somewhere to go; guarantee a camp within reach of Ring 1 and log camp discovery. Acceptance: three co-op deployments in one room produce three different spawn neighbourhoods; no chunk within 2 of spawn has zero portals.

### P1 — Co-op does not start fresh (reported; not in the logs)

The player saw Camp Meridian and power-ups at co-op start. The logs have no camp or relic events at the co-op deployment, so where they appeared is unknown (question 3). Code check needed: which solo campaign state (act 2 camps, run drops, bank) the co-op run reads.

Plan: a co-op session starts from a clean shared state; solo campaign progress is neither shown nor applied. Test: start co-op on a profile with solo progress and assert none of it is visible.

### P1 — Destroyed walls come back after death (reported; not in the logs)

The logs record wall damage and destruction (`wall:destroy` 18×) but nothing about persistence. In co-op the redeploy regenerates the identical world (above), which would restore walls; the solo campaign saves maze state, co-op does not.

Owner's rule: TRY AGAIN continues the same map, so destroyed walls and opened routes must stay destroyed on a retry, in solo and co-op (host-authoritative in co-op); MAIN MENU starts over with a new map.

Plan: carry the run's maze state across TRY AGAIN (co-op: the host's state, sent to the guest on redeploy); clear it on MAIN MENU. Acceptance: break a wall, die, TRY AGAIN — the wall is still broken on both machines; die, MAIN MENU, deploy — a different map.

### P1 — Steam Vault trade-up does not stick (partly confirmed)

On the Deck, across two Vault visits, SMELT was clicked about 30 times; the card still read **"RARE → EPIC OWNED: 5 / 5"** throughout. "UNCOMMON" went 20 → 160, matching 14 "Cryo-Alloy Ingot Pack (x10)" purchases — purchases stick, smelts apparently do not. The log has **no result line for any smelt**, so it cannot say whether the smelt failed or the display did not refresh.

Plan: log every smelt result (inputs consumed, output granted, Steam inventory response); fix so a completed smelt is reflected immediately and after reopening. Acceptance: smelt 5 → 1 and see both counts change, close and reopen, counts unchanged.

### P2 — Foundry: old/wrong models, output mismatch, UI (reported; partly in the logs)

The Deck opened the Fabrication Bay three times (activate, fabricate target, view reveal). The log does not record which model was shown or what was output, so "wrong model / output does not match" cannot be checked from it (question 4).

Plan: screenshots of the mismatch; log the recipe id, the previewed model and the granted item on every fabricate; align the preview model with the output item.

### P2 — Models invisible in large rooms (reported; not a load failure)

Every model fetch in both logs returned 200 OK; no load errors. So invisible models are a placement/visibility problem, not missing files. Some fetches were slow (up to 3.5 s on the PC).

Plan: identify which models (question 5); log model mounts that end up with no visible mesh.

### Logging gaps found

Remote death/downed, black-box ownership, wall persistence, smelt results, fabricate output, invisible model mounts, the analyzer's long-task parser. Each is listed with its item above; closing them is part of the fix, so the next QA session can confirm it from logs.

## Questions for the owner

1. ~~Map variety~~ — **answered:** TRY AGAIN keeps the map; MAIN MENU resets the run and the map.
2. ~~Co-op persistence~~ — **answered:** on TRY AGAIN the map continues, so destroyed walls stay destroyed; MAIN MENU starts fresh.
3. **Co-op fresh start.** Where did Camp Meridian and the power-ups show up — mission text, run cards, the HUD, or on the map?
4. **Foundry.** Which models looked old, and which output did not match? A screenshot would pin it. Is "trade in / trade up" the Steam Vault smelter (the logs point there)?
5. **Invisible models.** Which objects, in which rooms?
6. **The Deck was idle for 22 minutes** between the first solo death and the next deployment — was it suspended? Suspend/resume was not recorded, so it does not count as a suspend test.

## Status against tonight's QA gates

| Gate | From this session |
|---|---|
| Two-account co-op (join, ready, deploy, avatars, redeploy) | **Observed** on packaged builds |
| Deck frame pacing | **Failed** (render median 29.4 ms; 35 % of the session in long tasks) |
| Crash/suspend recovery | Not exercised |
| Steam Cloud | Available, not exercised |
| Achievements | Events recorded; no unlock verified |
| Leaderboard | Co-op payload accepted |
