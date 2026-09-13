# Hosted Session Log Review — September 11, 2026

## Outcome

Five hosted files were reviewed. They represent progressive exports from two
client sessions, not five separate runs:

- Physical Steam Deck/Linux client: three exports from session start
  `2026-09-11T08:02:03.654Z`, ending at approximately 357 seconds.
- Steam-installed Windows/RTX 2070 SUPER client: two exports from session start
  `2026-09-11T08:03:14.263Z`, ending at approximately 321 seconds.

The captures add meaningful partial evidence, but they do **not** satisfy every
acceptance criterion for #51, #52, or #53. None should be closed from these logs
alone.

## Proven

- Both clients ran packaged Hunker Bunker `2.4.0-beta` under Electron `44.3.0`
  from their Steam installation directories.
- The Deck capture identifies Linux x86_64, Steam Deck hardware, a
  `SteamDeckController`, one active controller, and a 1280×800 stage.
- The paired route used **Co-op**, room `STEAM-109775240966917847`, with
  `SHADOW-5` (Tank) and `BUNKER-1` (Engineer).
- Relay join, a two-player roster, both ready states, deployment to gameplay,
  remote-avatar creation, and remote 3D readiness appear in the captures.
- The Deck reached active gameplay, moved 223 distance units, fired weapons, and
  killed one enemy. The Windows client reached active gameplay and moved 38
  units.
- Steam identity and Cloud availability are present on the Windows client.
- Final GPU timing snapshots were captured on both devices.

## Not proven / still open

### #51 — packaged PvP certification

The selected mode was Co-op. There are no PvP mode, player-damage, kill/results,
reconnect, or cleanup events. Oxygen, enemy contact, and cliff-fall regression
coverage is also incomplete. #51 remains open.

### #52 — GPU and frame pacing

The sessions provide additional real-hardware telemetry, but not the required
fixed-route before/after benchmark. Both final states had adaptive gameplay
performance mode enabled. The captures contain numerous performance warnings
and long tasks, including tasks above 100 ms. The final Deck GPU moving average
was roughly 17 ms, while the Windows exports ended between roughly 7 and 10 ms,
but these point-in-time values do not satisfy tail-frame targets or explain all
stalls. #52 remains open.

### #53 — physical Steam Deck controller-only acceptance

The Deck, 1280×800 stage, Steam Input availability, and gameplay are proven.
The captures do not prove the entire route was controller-only and do not cover
death/restart, extraction/results, suspend/resume, full Settings persistence,
Achievements scrolling, readability judgments, or thermals. #53 remains open.

### #45 — umbrella release gates

These logs support the online co-op, packaged Linux/Deck, Steam Input, and
real-GPU workstreams, but none of the corresponding umbrella checkboxes has met
its full promised acceptance level. #45 remains open.

## Next targeted capture

Run one instrumented PvP session through damage, kill, results, reconnect, and
clean exit on the same build. Separately run the full Deck controller-only route,
including Settings, Achievements, death/restart, extraction/results, and
suspend/resume. Mark explicit session checkpoints before each route segment so
the resulting logs can distinguish evidence from tester recollection.

Retrieval and analysis instructions are maintained in
`docs/session-log-review-runbook.md`.
