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

The client mirror of that authority is now wired:

- `currentPlayers` mirrors the server-authoritative `isHost` flag.
- `hostChanged` updates the promoted/demoted roster entries and deploy branch.
- `finalizeDeploy()` uses the synchronized `isLocalPlayerHost` value.

The remaining meetup-critical issue found in the two-account review was a
Steam invite sequencing race: a guest already connected to their own lobby
could join the target lobby and then call `disconnect()`, which left the newly
joined target. This was fixed by leaving the current lobby before joining the
target in `src/multiplayerLobby.js`, with a regression test covering that
exact sequence.

## Ready/deploy authority correction

The follow-up two-account symptom was that both players could appear ready on
their own screen while the other screen stayed stale, and a guest could look
able to start the room. The relay is now the source of truth for both parts:

- Every `playerReadyChanged` event includes the complete current roster, so
  clients replace their local ready mirror from the server snapshot rather
  than trusting only a possibly-missed delta.
- `matchDeploy` is accepted only from the server-assigned host. A ready guest
  receives `matchDeployRejected: { reason: "not_host" }` and cannot start a
  countdown.
- Once every player is ready, the host button reads `START SQUAD` (or `START
  MATCH` for PvP). Readiness does not itself launch the run; the host performs
  the final deploy action.

This is covered by `server/relayReadyUp.test.js`, including the regression
where a ready non-host attempts to deploy an all-ready room.

## Steam Deck identity correction

The meetup screenshot found a second client-side issue: the roster showed
generated `OPERATIVE-*` names and `SCOUT` for both players even when a player
had selected Tank. `src/multiplayerLobby.js` was reading a legacy
`window.selectedPlayerType` global that `main.js` does not guarantee in the
packaged Deck flow. Join identity now resolves from the selected character
card, active game class, and persisted class in that order, while callsign
resolves from the profile/callsign UI and falls back only to `AGENT`. The
focused lobby test covers the packaged-style selection path.

## `log11.json` review

The session timeline confirms the failure was not a clean two-client ready
test. This capture is Windows (`Electron/43.4.1`, `isSteamDeck: false`) and
records one host creating a public lobby, refreshing the public list, then
clicking `JOIN` before later ready actions. Because the browser listed the
host's own public lobby, that action could re-enter the same Steam room and
disturb the relay host transition; the host subsequently saw
`WAITING FOR HOST`. The public browser now removes the local owner's lobby
from join targets.

The log also had no relay join/roster/ready events, so it could not establish
whether the Deck payload, server snapshot, or client render was wrong. The
client now emits redacted `MULTIPLAYER` telemetry for join identity, roster
identity/host/ready state, ready sends/receives, and deploy rejection. The
next two-account export will identify the failing boundary directly.

Separate performance evidence: the menu recorded repeated 100–306 ms long
tasks while mounting the menu scene. That is a real menu responsiveness issue,
but it is not evidence of a relay failure and remains a separate performance
follow-up.

## Scope boundary

This review does not change the relay’s host-election rules, multiplayer lobby
protocol, `src/gameController.js`, or the frozen multiplayer seam files. The
server already has focused coverage for the election behavior; the immediate
bug is the renderer-side state synchronization.

## Plan before action

1. Keep the server-authoritative host and failover tests as the authority.
2. Keep the client `currentPlayers`/`hostChanged` synchronization covered.
3. Verify the pre-existing-lobby invite sequencing with two packaged Steam
   accounts before accepting the multiplayer seam as fully proven.
4. Treat cross-region public browsing as a separate native-binding limitation,
   not as evidence that host assignment failed.

## Done criteria

- Exactly one connected lobby player is represented as host after initial join.
- A promoted player sees host controls without reconnecting or reopening the
  lobby.
- A demoted/stale client no longer believes it can deploy as host.
- Existing relay host reassignment and full project verification remain green.
