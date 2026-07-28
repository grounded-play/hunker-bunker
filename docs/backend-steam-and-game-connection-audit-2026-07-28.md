# Backend, Steam, and Game Connection Audit

Date: 2026-07-28  
Branch reviewed: `dev/sprint-21`  
Scope: repository documentation, game/runtime wiring, Electron Steam bridge,
trusted backend, SteamPipe packaging, and the active self-hosted Docker/Caddy
deployment in `~/server`.

## Executive Summary

Hunker Bunker has a real, configured backend running locally in Docker and
published through Caddy at `https://steam.tuesdaycinema.club`. The earlier
statement that the backend was merely unproven scaffolding was too broad.

What is now directly confirmed:

- Compose project `server` is running.
- The backend container is healthy.
- Caddy is running on public ports 80 and 443.
- Local and public `/health` requests return HTTP 200.
- Steam App ID `4957040` is configured.
- A Steam Publisher Web API key is present and has the expected key shape.
- An explicit, sufficiently long backend session secret is present.
- All five expected leaderboard mappings are present.
- CORS is configured and does not approve an untrusted test origin.
- Durable SQLite storage is initialized on the `hunker-bunker-data` volume.
- Store and MicroTxn configuration exists but remains disabled.
- The packaged Electron config points at the public HTTPS backend.

What is still not proven:

- Authentication from a game installed and launched through Steam.
- A live achievement and stat appearing in Steamworks.
- A live score write/read against each Steam leaderboard.
- A real Steam Inventory grant and subsequent ownership reconciliation.
- Steam Auto-Cloud synchronization between two machines.
- Steam Input and overlay behavior on a physical Steam Deck.
- A live MicroTxn purchase, refund, reversal, or Item Store publication.

The correct release description is therefore:

> Backend configured, durable, healthy, and publicly reachable; Steam client,
> dashboard, Cloud, Inventory, and hardware acceptance still required.

## Active Deployment

The active deployment is outside the repository at `/home/caveman/server`.

```text
Steam/Electron client
        |
        | HTTPS
        v
steam.tuesdaycinema.club:443
        |
        v
Caddy container
        |
        | Compose network :3001
        v
Hunker Bunker backend container
        |
        v
hunker-bunker-data Docker volume
        |
        v
/app/server/data/db_storage.sqlite
```

Files in `~/server`:

- `compose.yaml`
- `Caddyfile`
- `backend.env`
- `backend.env.example`
- `configure-secrets.sh`
- `README.md`

`backend.env` is permission-restricted and must not be copied into this
repository, a Steam depot, issue, log, screenshot, or support bundle.

## Configuration Presence Audit

Only presence and safe shape were inspected. No values are recorded here.

| Setting | Status | Meaning |
| --- | --- | --- |
| `NODE_ENV` | Set | Production runtime selected |
| `PORT` | Set | Backend listening port configured |
| `HB_STEAM_APPID` | Set | Steam application identity configured |
| `HB_STEAM_PUBLISHER_KEY` | Set; valid expected shape | Live Steam Web API verification can be attempted |
| `HB_SESSION_SECRET` | Set; adequate length | Explicit session signing is available |
| `HB_ALLOWED_ORIGINS` | Set; one HTTP entry remains | Allowlist works, but strict production policy is not yet clean |
| `HB_DB_STORAGE_PATH` | Set; absolute | Durable storage target configured |
| `HB_STEAM_LEADERBOARD_IDS` | Five mappings present | All configured game boards have IDs |
| `HB_STEAM_MICROTXN_ENABLED` | Set, disabled | Real-money transactions remain off |
| `HB_STEAM_STORE_ENABLED` | Set, disabled | Store purchase path remains off |

Expected leaderboard names present:

- `best_run_score`
- `daily_ops_score`
- `fastest_extraction_ms`
- `deepest_depth_score`
- `survival_time_seconds`

## Health and Routing Evidence

Verified on 2026-07-28:

- `http://127.0.0.1:3001/health`: HTTP 200.
- `https://steam.tuesdaycinema.club/health`: HTTP 200.
- Public response traverses Caddy.
- Health reports:
  - Steam auth configured;
  - explicit session signing;
  - 900-second session TTL;
  - SQLite storage;
  - durable and initialized state;
  - database file present.
- An untrusted Origin did not receive an
  `Access-Control-Allow-Origin` header.
- An approved Origin received its matching allow-origin header.

The health endpoint proves configuration and reachability, not successful
communication with Valve. A Publisher key can be present yet revoked,
restricted, or incorrectly scoped.

The repository's strict environment audit recognizes all five leaderboard
mappings and the expected App ID, but currently fails with
`non_https_origin`. Remove the remaining `http://` origin from
`~/server/backend.env`, recreate the backend container, and confirm the strict
audit returns `ok: true`.

The production Docker image copies `server/` but not `scripts/`. Consequently,
`npm run steam:audit-backend:strict` cannot run inside the deployed container
even though the package script is present. This is not a runtime failure, but
it is an operations inconsistency. Either:

- run the audit from the repository/CI with the deployment environment; or
- move a runtime-safe environment audit into `server/` and include it in the
  image.

## Security Finding: Credentials Previously Entered Documentation

An older tracked revision of
`docs/steam-backend-deploy-docker-caddy.md` contained literal values for the
Publisher Web API key and session secret.

The current tracked file has been redacted, and a scan found no remaining
literal credentials of those shapes in tracked files. However, Git retains old
content in history.

Required response:

1. Rotate the Steam Publisher Web API key in Steamworks.
2. Generate a new `HB_SESSION_SECRET`.
3. Update only `~/server/backend.env`.
4. Recreate the backend container.
5. Test `/health` again.
6. Test one real Steam auth-ticket exchange.
7. Consider history rewriting only as an additional containment measure;
   rotation is still mandatory.

Do not record the replacement values in documentation.

## Steam Feature Status

### Connected in code

- Optional `steamworks.js` initialization.
- Steam identity and ownership snapshot.
- Web API auth tickets and backend sessions.
- Achievement and integer-stat forwarding.
- Overlay URL opening.
- Native Steam Input handle initialization and polling.
- Steam on-screen keyboard helpers.
- Save mirroring to Electron `save.json`.
- Cloud status inspection.
- Trusted leaderboard recomputation and submission.
- Leaderboard display UI.
- Inventory reads, grants, exchanges, and cache opening.
- Purchase initialization/finalization/reversal code behind disabled flags.
- SteamPipe packaging, input configs, depot audit, and DRM helper.

### Requires live Steam acceptance

- Dashboard achievement/stat parity.
- Five leaderboard writes and reads.
- Inventory schema publication and live grant.
- Auto-Cloud two-machine synchronization.
- Overlay behavior from a Steam-installed build.
- Controller-only traversal through every major screen.
- Physical Steam Deck suspend/resume and docked testing.

### Must remain unclaimed or disabled

- Steam Timeline: installed binding lacks the native API.
- Co-op/PvP: relay exists, but no game client connects to it.
- In-app purchases: code exists, live approval and operational testing do not.
- Deck Verified: no physical hardware acceptance.
- Full English Audio: no complete voiceover localization.

## Installed but Disconnected or Incomplete

### `socket.io-client`

The dependency is installed, while no renderer/client import exists. The
Socket.IO relay is server infrastructure, not multiplayer gameplay.

Action: remove the dependency until multiplayer is approved, or document and
implement a real client/session design before making any multiplayer claim.

### Ambient human AI

`src/humanAI.js` explicitly disables human AI. Camp movement, richer hostility
responses, and escort behavior are not live systems.

### Steam Vault item art

Inventory schema and Vault UI use remote Netlify economy image URLs, while no
local `public/economy` fallback directory exists.

Action:

- publish permanent HTTPS assets;
- bundle local fallback icons;
- add an audit for every schema URL;
- test Vault rendering offline.

### Steam Timeline

Renderer and Electron calls degrade safely, but no Timeline event reaches
Steam with the current native binding.

## Gameplay Connection Findings

### WFC and radial maze

Local WFC now has:

- three-wide aligned doors;
- long variable hall runs;
- rectangular and bent rooms;
- themed populations;
- loops, gates, canyons, and vertical features;
- debug labels and socket footprints.

The global radial plan is still influential rather than authoritative. It does
not yet prove that:

- continuous barriers separate every ring;
- every outward crossing is mission-gated;
- blockers cannot be bypassed;
- planned cluster coordinates become exact room complexes;
- actual shortest walking distances match planned distances.

### Objectives

The objective registry is active for several systems, but tutorial, extraction,
generator, cave, hive, and other objectives are not yet fully consolidated
under one parent/child objective language.

### Factions and consequences

Camps and hives have strong state and writing, but need more unique repeated
verbs and more visible physical aftermath. Ending and manifest explanations
should explicitly tell the player why each outcome occurred.

### Retail asset footprint

The retail web payload is approximately 795 MB, and Electron packages contain
an approximately 690 MB `app.asar`. The public directory includes source,
reference, preview, contact-sheet, and alternate-generation assets.

Action: build a runtime reference manifest, move production-source material
outside `public`, and make CI reject unreferenced retail assets unless
allowlisted.

## Recommended Acceptance Sequence

1. Rotate the exposed credentials and recreate the backend.
2. Remove the remaining HTTP CORS origin and pass the strict environment audit.
3. Launch a packaged build through Steam.
4. Confirm Steam identity and exchange one real auth ticket.
5. Submit/read all five leaderboards.
6. Unlock one beta achievement and update one stat.
7. Grant and display one non-marketable test inventory item.
8. Perform a two-machine Cloud test with conflict recovery.
9. Complete a controller-only pass.
10. Complete physical Steam Deck testing.
11. Only then reassess Inventory marketability and MicroTxn launch scope.

## Verification Performed During This Audit

- Docker Compose project and container inspection.
- Local and public health checks.
- CORS approved/unapproved Origin checks.
- Secret presence and safe-shape checks without value output.
- Tracked-file literal-secret scan.
- Strict environment audit: App ID and 5/5 leaderboards recognized; one
  `non_https_origin` failure remains.
- Steam-focused Vitest suite: 9 files, 66 tests passing.
- Steam depot audit: passing, 297 packaged files inspected.
- Required cinematic/build media audit: passing.

This document should supersede historical statements that describe the backend
as undeployed or purely hypothetical. It does not supersede the Steamworks
dashboard checklist or live hardware acceptance requirements.

The dependency-ordered remediation roadmap for every open item in this audit is
`docs/master-implementation-plan-2026-07-28.md`.
