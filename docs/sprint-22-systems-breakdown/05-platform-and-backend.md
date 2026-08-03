# System Breakdown: Platform, Backend, and Steam Integration

## Release Truth

The platform stack is substantially implemented and automated. The remaining distinction is live acceptance. Never convert “route exists and tests pass” into “Steam feature is launched.”

## Client and Packaging

- Vite builds the Three.js web runtime into `dist/`.
- Electron packages `dist/`, `electron/`, Steam Input configs, and native `steamworks.js` dependencies.
- Linux and Windows depots map their unpacked build roots consistently.
- Store-only graphics remain under `steam/store/`; build/depot audits reject them from customer payloads.
- A native Linux launcher handles the Electron sandbox requirement on SteamOS.
- Steam initialization is deferred until after the first window is created to improve startup perception.

## Steam Bridge

Connected code covers identity, ownership, achievements/stats, overlay URL opening, native Steam Input polling, on-screen keyboard, Cloud status/save mirroring, backend auth sessions, leaderboards, and Inventory/Vault reads. Browser Gamepad remains a fallback when native Steam Input is unavailable or incomplete.

The “Deck boots but cannot move” statement is stale. Semantic action routing, configs, action sets, browser fallback, focus fixes, and controller navigation landed in later commits. Physical built-in-control and suspend/dock acceptance remain open.

## Persistence Boundary

- Local narrative/settings state uses `hb_*` keys.
- Electron mirrors canonical keys into atomic `save.json` with migration/corruption handling.
- Steam Auto-Cloud configuration is a dashboard/operator concern and still needs a two-machine matrix.
- Backend SQLite stores trusted online data; it does not own the entire offline run save.

## Trusted Backend

The Express backend supports a one-ticket session exchange, HMAC-signed bearer sessions, trusted leaderboard scoring, Inventory operations, and disabled-by-default store/MicroTxn paths. The documented deployment is Docker/Caddy at `steam.tuesdaycinema.club` with durable SQLite storage.

Historical health checks proved reachability/configuration, not a current Valve exchange. Re-run operational checks rather than treating a dated audit as uptime monitoring.

## Manual Gates

- installed-Steam identity and auth-ticket exchange;
- one real achievement/stat update;
- write/read all five leaderboards;
- live Inventory definition/grant/ownership reconciliation;
- overlay from an installed build;
- two-machine Cloud conflict/offline recovery;
- controller-only navigation across every major surface;
- physical Deck suspend/resume, dock, performance, and battery;
- Valve/legal approval before store or MicroTxn enablement.

## Claim Boundaries

Do not claim multiplayer, Timeline, Deck Verified, Full Controller Support, Full English Audio, purchases, or Cloud readiness beyond accepted evidence. Use `npm run steam:claims:check` and [Current Feature Status](../current-feature-status.md).

## PM Release Checklist

1. Name the build commit and backend environment.
2. Pass tests, media audit, retail asset budget, claims check, and depot audit.
3. Upload game/input/soundtrack depots.
4. Set builds live through Steamworks where automation cannot.
5. Execute installed/hardware acceptance and attach evidence.
6. Update claims only after evidence is reviewed.
