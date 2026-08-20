# Multiplayer Lobby Host Assignment Review

Date: 2026-08-20

## User report

When players reach matchmaking/the multiplayer lobby, host assignment appears
missing or inconsistent and the lobby state becomes confused.

## Evidence review

The relay is already the authority for host assignment:

- `server/relay.js` assigns the first host in `joinRoom` and includes `isHost`
  in the `currentPlayers` roster.
- `server/relay.js` promotes a remaining player immediately when the current
  host disconnects, then broadcasts `hostChanged`.
- `server/relayHostReassignment.test.js` covers initial assignment, durable
  host reclaim, and promotion into an empty room.
- `server/relayHostFailover.test.js` covers mid-match promotion and confirms
  the original host can reclaim its durable slot.

The client has an incomplete mirror of that authority:

- `src/multiplayerLobby.js` initializes `isLocalPlayerHost` to `false` and
  sets it from `currentPlayers` only once.
- The client has no `socket.on('hostChanged', ...)` handler, even though the
  server emits that event. A guest promoted by failover therefore remains a
  non-host in the lobby UI and cannot use the host deploy branch.
- The initial local roster entry is optimistically labeled `(HOST)` before the
  server response, while the `currentPlayers` handler updates only remote
  entries. This can display a contradictory local label while the authoritative
  host flag is still being resolved.
- `finalizeDeploy()` correctly uses `isLocalPlayerHost`, so a stale client flag
  can also carry the wrong host state into the run setup.

## Scope boundary

This review does not change the relay’s host-election rules, multiplayer lobby
protocol, `src/gameController.js`, or the frozen multiplayer seam files. The
server already has focused coverage for the election behavior; the immediate
bug is the renderer-side state synchronization.

## Plan before action

1. Add a client `hostChanged` listener that updates `isLocalPlayerHost` from
   the event’s `hostId`, updates the local/remote roster host labeling, and
   refreshes the lobby controls.
2. Make the local roster entry use the server-authoritative host state rather
   than always appending `(HOST)` optimistically.
3. Add focused client tests for initial roster host state and a promoted guest
   receiving `hostChanged`, including the deploy-branch state transition.
4. Run the focused multiplayer tests, then the full Vitest suite and build.
5. If the tests reveal a separate server race in initial `joinRoom`, add a
   minimal relay regression test and fix only that race; otherwise leave the
   already-tested server election logic unchanged.

## Done criteria

- Exactly one connected lobby player is represented as host after initial join.
- A promoted player sees host controls without reconnecting or reopening the
  lobby.
- A demoted/stale client no longer believes it can deploy as host.
- Existing relay host reassignment and full project verification remain green.
