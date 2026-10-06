# G3 relay dressing HP authority and co-op prop reconciliation

Implements the co-op reconciliation slice of the [room grammar plan](../planning/sprint-49-room-grammar-and-run-variety.md).
Adds relay-authoritative partial-HP tracking for physical room dressing, ordered hit
negotiation, late-join reconciliation, and container image synchronization.

## Behavior

- The relay owns authoritative damage state for room dressing keyed by stable v2
  placement identities (`createDressingAuthority`).
- When a client enters a room or discovers props, it registers known dressing candidates
  in batches up to 128 items via `dressing-register`. The host establishes authoritative
  prop positions and initial HP.
- Registered peers receive authoritative partial HP and revision metadata. Late-joining
  or reconnecting players receive current damage states upon registration, preventing
  resurrected props or conflicting client-side HP.
- Hit damage from clients (`dressing-hit`) requires increasing hit sequence numbers, valid
  damage ranges (1–32), known prop registration, and proximity checks (within 64 units).
- Sequence enforcement prevents replay attacks or out-of-order network echoes from
  applying duplicate damage.
- When an authoritative damage update reduces HP to 0, `applyDressingNetworkEvent`
  triggers `breakScatterProp` with `fromRemote: true` and records the stable ID in
  `brokenPropScatterKeys` so unloaded chunks retain destruction state.
- Co-op peers negotiate `dressingProtocolVersion: 1` during lobby join. If all peers
  in the room support protocol version 1, the relay enables dressing authority.
- `deploy/Dockerfile` copies `src/roomDressingPersistence.js` ensuring server image
  builds succeed in containerized deployment environments.

## Verification

- `server/dressingAuthority.test.js`: verifies guest/host hit ordering, replay rejection,
  and late-registrant state publication.
- `src/dressingNetwork.test.js`: verifies relay-only origin validation, monotonic revision
  acceptance, idempotent destruction, and stable ID wire routing.
- `server/deployImageContents.test.js`: verifies all required server import dependencies are copied into Dockerfile.
- `src/threeGame.setupMultiplayerNetworkSeedSync.test.js` & `src/threeGame.teardownMultiplayerNetwork.test.js`: verify socket lifecycle compatibility.
- Focused suites pass with zero regressions; ESLint clean.

## Remaining work

- [ ] Finished key-art maintenance-hall presentation with matched intact and breached views.
- [ ] Critical-service recovery behaviors for future functional setpiece modules.
- [ ] Broader area profiles (cryo/medical and biomech naves).
