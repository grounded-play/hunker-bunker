# Dependency Policy

Production dependencies must have a concrete source import or `require()` and
must pass `npm run audit:dependencies`.

## Socket.IO decision

- `socket.io-client` was removed on 2026-07-28. The shipped renderer has no
  multiplayer client and had no import of this package.
- Server-side `socket.io` remains because `server/index.js` mounts
  `attachRelay()` from `server/relay.js`. That relay is an existing backend
  capability, not evidence that multiplayer is an accepted product feature.
- Multiplayer remains deferred under the master implementation plan. Store
  copy and launch claims must not advertise it without a separately approved
  authority, lobby, matchmaking, progression, disconnect, anti-cheat, and
  acceptance plan.

The audit intentionally checks production `dependencies`, not
`devDependencies`: build, lint, and test tools are invoked from package
scripts and CI rather than imported by runtime source.

