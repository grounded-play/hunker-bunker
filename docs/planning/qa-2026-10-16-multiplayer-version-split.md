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
