# 2026-10-26 co-op playthrough and PR review

## Decision

Do not treat the current co-op build as release-ready. The paired captures confirm a host/guest progression split and a combat-authority gap. The companion transition and camp-quest objective plumbing also have code-level defects that match the player report. Multiplayer selection and game-over layouts still rely on scrolling and need a fit-at-1280x800 acceptance pass.

This review uses the newest paired server uploads:

- Windows host: `hunker-bunker-session-2026-10-26T21-21-11-340Z-mvprh945-9umh.json`
- Steam Deck guest: `hunker-bunker-session-2026-10-26T21-21-00-818Z-mvprh0xr-3b4t.json`

Both captures identify themselves as `2.4.17-beta`. The branch is now `2.4.18-beta`, so this playthrough does not validate the newer resume, sleep, loading/audio, first-boss breach, or O2 reveal changes. Raw captures remain ignored and are not part of the commit.

## Reported asks and evidence status

| Ask | Status | Evidence and current behavior |
| --- | --- | --- |
| Recruited assistant should visibly walk and follow instead of disappearing and reappearing | **Code-confirmed defect; animation not observable in logs** | The host clicked **RECRUIT COMPANION** at `21:20:26.727Z`. `handleWandererBefriend()` immediately removes and disposes the visible survivor, awaits a second GLB load, and `addHumanoidCompanion()` creates that replacement at the player's then-current position. This directly produces the reported pop-out/pop-in. No companion position or animation telemetry is captured after recruitment. |
| Enemies should damage the player they reach in co-op | **Log-confirmed failure and code-level authority gap** | Neither client recorded player damage, hit reports, or hit confirmations despite enemy activity and attack audio. The host deliberately does nothing when contact targets a remote player; the guest only infers a bite when an interpolated replica is within reach on its local cooldown. There is no authoritative enemy-hit intent/acknowledgement packet. |
| Host and guest must share mission/boss progression | **Log-confirmed critical divergence** | The guest completed the mission objective at `21:18:10.361Z`; the host did not complete it until `21:18:58.616Z`, about 48.3 seconds later. The host boss breached at `21:18:48.723Z`, after the guest had already completed the objective. Clients are independently resolving progression. |
| Accepted camp quest should appear on the minimap and have a clean quest HUD | **Code-confirmed objective defect; acceptance absent from telemetry** | The generic listener tracks `camp_quest:<questId>`, while the runtime tracker uses `camp-quest:<campId>:<questId>`. That can create two records for one quest, including one without compass coordinates. The tactical-map canvas draws camps and other landmarks but no explicit active quest target marker. Camp-quest acceptance/progress is not in the session logger, so the click itself cannot be proven from these captures. |
| Multiplayer game-select UI must fit without cropping or scrolling | **Player-reported; code confirms scroll-dependent layout** | The guest ran at the target Deck stage of 1280x800. `.net-modal-content` uses `overflow-y: auto` while hiding its scrollbar, and a late stage override stretches it to full height with a reserved bottom action slot. This can make clipped content look inaccessible. Logs do not capture element bounds, so visual cropping needs a screenshot or layout telemetry. |
| Game-over screen must fit without scrolling | **Player-reported; code confirms deliberate scrolling** | Both `#game-over-modal` and `.game-over-content` use `overflow-y: auto`. Neither latest client reached death/results, so this round cannot visually validate the screen. The implementation nevertheless conflicts with the no-scroll requirement. |

## Paired timeline

| UTC | Host | Steam Deck guest |
| --- | --- | --- |
| `21:14:12.476` | Connected to relay | — |
| `21:14:58.259` | — | Connected |
| `21:14:59.281` | — | Disconnected with `io client disconnect` |
| `21:15:00.923` | — | Reconnected; the analyzer reports two joins |
| `21:18:10.361` | Mission still active | Marked mission objective complete |
| `21:18:48.723` | Boss destroyed/breached wall | — |
| `21:18:49.544` | — | Received remote wall destruction |
| `21:18:53.848` | Boss attack telegraph | — |
| `21:18:58.616` | Marked mission objective complete | Had already completed it |
| `21:20:26.727` | Clicked **RECRUIT COMPANION** | — |

The analyzer also reports PvP as disabled on the host but enabled on the guest. Treat this as either a mode-state mismatch or an analyzer defect; either outcome needs a paired mode snapshot before this test can pass.

## Performance and stability

| Client | Presented gameplay | GPU | Memory | Notable stability signal |
| --- | --- | --- | --- | --- |
| Windows host, 2304x1440 | 28.35 ms average, 37.6 ms p95, about 35.3 FPS | 7.55 ms average | GPU peak about 3068 MiB; JS heap peak about 3376 MiB of a 3760 MiB limit | 75 long tasks; maximum 3470 ms |
| Steam Deck, 1280x800 | 65.75 ms average, 93.8 ms p95, about 15.2 FPS | 21.17 ms average | GPU peak about 2949 MiB | 2131 long tasks; maximum 3690 ms; adaptive mode was off |

The Steam Deck result is below a playable target and is a release blocker independent of the functional co-op defects. GPU time alone does not explain the 65.75 ms presented-frame average; CPU/main-thread stalls and asset/runtime workload remain material.

## Required work tickets

### P0 — make mission and combat outcomes host-authoritative

- Only the host may resolve enemy death, mission counters, boss spawn/phase, objective completion, rewards, and extraction gates.
- Replicate an ordered mission-state revision to guests; reject stale or out-of-order revisions.
- Send an explicit host-owned enemy-hit intent containing attacker, victim, damage, source position, simulation tick, and unique event ID. The victim acknowledges or rejects it once; do not infer damage solely from replica proximity.
- Acceptance: in a two-account run, both logs show the same mission revision, boss phase, objective completion time within one relay round trip, and matching damage event IDs. An enemy in contact damages the intended host or guest exactly once per cooldown.

### P0 — eliminate the companion recruit pop and verify locomotion

- Promote/reuse the already-visible wanderer instance when possible. If a model swap is unavoidable, preserve world position and keep the original visible until the replacement is ready.
- Do not spawn a recruited companion at the player's feet after an async load.
- Verify idle/walk/run animation selection locally and on the remote client; bullets and impacts must replicate with an owner/event ID.
- Add `companion-recruited`, position snapshot, relocation reason, animation clip, shot, and hit telemetry.
- Acceptance: recruit while walking away, then observe continuous movement with no disappearance, no snap to the player, visible locomotion, and visible companion fire on both clients.

### P1 — use one camp-quest objective identity and show a map target

- Adopt one canonical ID, preferably `camp-quest:<campId>:<questId>`, for registration, progress, persistence, and completion.
- Remove or migrate the duplicate underscore-form record.
- Pass the live quest target coordinates at acceptance and draw a distinct active-quest glyph on both full and compact tactical maps.
- Network the accepted quest and progress if camp quests are intended to be shared.
- Log acceptance, objective ID, compass position, map-marker visibility, progress, and completion.
- Acceptance: accepting a quest creates exactly one tracker row and one visible map target; both disappear on completion; host and guest agree on state.

### P1 — make critical modal layouts fit at target resolutions

- Treat 1280x800 and 1280x720 as required desktop/Deck layout sizes.
- Multiplayer selection: keep every mode option, briefing, roster/control, and primary action visible without scrolling. Use responsive density or progressive disclosure rather than a hidden-scrollbar container.
- Game over: keep result, essential run stats, and all actions in one viewport without page or inner-panel scrolling. Move secondary detail behind an optional disclosure if needed.
- Add automated bounding-box assertions for overflow, overlap, and offscreen controls at both target sizes. Retain screenshot baselines for visual review.

### P1 — restore Deck frame pacing

- Profile the 3–3.7 second startup/runtime stalls and the CPU gap between GPU time and presented-frame time.
- Establish a GPU-memory budget below the observed roughly 3 GiB and enable an appropriate adaptive profile on Deck.
- Acceptance: representative co-op traversal sustains the agreed Deck frame target without multi-second long tasks or monotonic GPU-memory growth.

### P2 — close the telemetry gaps

- Capture camp-quest lifecycle events, active objective IDs, target coordinates, map-marker visibility, and tracker row count.
- Capture authoritative enemy target, attack attempt, hit intent, acknowledgement/rejection, health before/after, and simulation revision.
- Capture companion lifecycle, current clip, movement state, relocation, projectiles, and impacts.
- Capture modal content/viewport bounds and overflow state when multiplayer and game-over screens open.
- Capture one canonical PvP/mode value on both clients so the analyzer cannot silently disagree.

## Branch and PR assessment

- Branch: `dev/sprint-53`.
- Reviewed HEAD: `59b03438` (`2.4.18-beta` release line).
- The branch contains the earlier resume/sleep/audio fix at `6dc702a6` and the first O2 boss reveal fix at `6495bd72`, but the paired logs are from `2.4.17-beta` and cannot confirm either change.
- Relative to `origin/dev/sprint-53`, the local branch has three commits: the retail-asset audit budget fix, the `2.4.18-beta` release commit, and the Steam-build/mobile boot-gears packaging fix.
- Current verdict: **changes requested / hold co-op release** until the P0 authority and companion transition issues are fixed and re-tested on matching `2.4.18-beta` host/guest builds. Deck performance and no-scroll modal fit remain required release gates.

## Retest route

1. Install the same package/version on both clients and record the package version before joining.
2. Join once, confirm identical PvE/PvP mode, ready, and deploy.
3. Let an enemy contact the host, then the guest; record exact heart loss and knockback.
4. Complete the first objective and boss encounter; compare mission revision, boss phase, wall breach, reward, and completion timestamps.
5. Recruit the survivor while the host walks away; observe locomotion, firing, and remote replication for at least two minutes.
6. Accept one camp quest; verify exactly one tracker row and a visible, moving/updated minimap target on both clients.
7. Open multiplayer selection at 1280x800 and 1280x720; verify every action is visible without scrolling or cropping.
8. Reach game over at both sizes and repeat the fit check.
9. Run `uploadlogs` on both clients and retain a screenshot/video for the visual-only checks.

## Addendum: verified against the server uploads (2026-10-26, later the same day)

Re-read from `https://steam.tuesdaycinema.club/logs/session` (all four 21:03–21:21 uploads).

- **Build correction.** Every capture reports build commit `cf925ae9` with the old `2.4.17-beta` label (the version bump `55a4e20a` came later). So this round **does** include the resume/loading-audio fix (`6dc702a6`), the single door system and single black-box cinematic (`d4e96f2b`), full room titles (`3648eac6`), the briefing pill and the voiced code lines (`e41db11e`, `cf925ae9`). The "cannot validate" note above applies only to the version label.
- **Companion pop is in the logs.** The earlier co-op pair (Scout host, `…21-03-24…` / `…21-11-01…`) records `companion-relocated` 11 times and `companion-repath` 16 times for *Foxhole Shadow* within 40 s of recruitment: the follower is being snapped to new spots, not walked. This matches the "disappears, then reappears at the side" report.
- **Enemy damage is intermittent, not absent.** That earlier pair logs 12 `player-damaged` events and 2 deaths, so contact damage worked there; the latest pair (Tank host, Engineer guest) logs none despite repeated spore-snail attack audio. Retest both host and guest as victims.
- **Unvoiced on-screen speech (new telemetry from `e41db11e`).** 26–38 `VOICE unvoiced-line` entries per capture. Nearly all are HUD notices routed through the radio as "OPERATOR" / "BUNKER AUTO-ANNOUNCER" (weapon equips, sector changes, alerts) and should stay silent or move off the radio channel. A few are director lines worth voicing: "Distress beacon, Ring 1. A human voice on loop…", "Scan: the heartbeat is wrong — too many, too slow. It is bait.", "The door opens on a nest. It was bait.", "Unstable salvage vault, Ring 1…".
- **Raw ids reach the player.** The overnight report prints `camp_vesper raided overnight — now strained.` and `hive_suture creep spread one ring (now 1).`; these need display names and i18n.
- **Recruitment reaches the guest.** The Deck logged "SCOUT: FOXHOLE SHADOW HAS JOINED YOUR SQUAD." 1.3 s after the host's RECRUIT click, so the event replicates; only the follower's presentation and movement are broken.
