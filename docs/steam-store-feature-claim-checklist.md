# Steam Store Feature Claim Checklist

Last updated: 2026-07-16.

This is the truth table for Steam store feature checkboxes. It separates
code-backed support from Steamworks dashboard, legal, hardware, and live-service
acceptance work.

## Safe Today

| Feature | Status | Evidence |
| --- | --- | --- |
| Single-player | Safe to claim | The Steam build path is offline single-player; multiplayer relay is not wired into the client. |
| Family Sharing | Safe unless disabled in Steamworks | Steam Families are enabled by default for most games. Still smoke-test borrowed-copy behavior with Inventory/Cloud. |
| Steam Input API | Code-backed, dashboard required | `steam/steam_input_manifest.vdf`, Electron polling, renderer gameplay routing, browser gamepad fallback. Upload/associate the manifest in Steamworks. |
| Commentary available | Code-backed as text commentary | Settings now has Commentary Mode. In-game commentary cards appear on run/discovery/Steam beats. If Steam review expects recorded audio commentary, leave unchecked until VO exists. |

## Code-Backed But Needs Acceptance

| Feature | Status | What remains |
| --- | --- | --- |
| Steam Achievements | Code-backed | Publish Steamworks achievement API names matching `ACHIEVEMENT_DEFS`, then test unlocks from a Steam-installed build. |
| Stats | Partial code-backed | `total_deaths` and `longest_run_seconds` forward to Steam. Publish matching stat API names and decide whether more stats are needed. |
| Steam Leaderboards | Backend code-backed | Deploy HTTPS backend, configure publisher key/session secret, create/configure leaderboard IDs, and test `SetLeaderboardScore` live. |
| Steam Cloud | Code bridge + status readout | Configure Auto-Cloud paths for Electron `save.json`, then perform a two-machine sync test. |
| Full Controller Support | Code-backed, hardware pass required | Complete a no-keyboard/no-mouse pass through start, menus, gameplay, Vault, Bunker Tree, settings, and text entry. |
| Xbox Controllers | Code-backed, hardware pass required | Test physical Xbox controller through Steam Input and browser fallback. |
| PlayStation Controllers | Code-backed, hardware pass required | Test DualShock/DualSense through Steam Input and browser fallback. |

## Do Not Claim Yet

| Feature | Status | What would make it claimable |
| --- | --- | --- |
| PvP | Not implemented | Real lobby/session UX, synced player state, combat rules, validation, hosted service, matchmaking/invite flow, QA. |
| Co-op | Not implemented | Same multiplayer foundation as PvP plus shared objectives, revive/failure rules, UI, save/Cloud policy, QA. |
| In-App Purchases | Not live-ready | Valve MicroTxn approval, legal/region review, live Item Store/purchase tests, refund/reversal ops, deployed backend. |
| Steam Timeline | Bridge only | The renderer emits timeline events and Electron exposes fail-safe IPC, but current `steamworks.js` lacks `ISteamTimeline`. Add a native binding path and verify events from a Steam-installed build. |
| English Full Audio | Not supported as localization | The game has music/SFX and text, but no full English voiceover track. Leave Full Audio unchecked unless VO exists. |

## Accessibility Feature Claims

Currently code-backed:

- Remappable keyboard controls.
- Controller support.
- Camera shake toggle.
- Colorblind assist toggle.
- Text speed selector.
- Touch controls.
- Audio mixer.
- Difficulty setting.

Steamworks accessibility checkboxes should only be selected if their exact
wording matches these implemented features.
