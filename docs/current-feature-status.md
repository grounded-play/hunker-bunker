# Current Feature Status

Canonical implementation/acceptance truth for Hunker Bunker as of
2026-07-28. “Connected” means the shipped runtime calls the implementation;
it does not imply Steamworks, hardware, legal, or live-service acceptance.

| Feature | Design | Implementation | Connection | Automated tests | Live/hardware acceptance | Claim status | Owner / evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Single-player run | Complete | Implemented | Connected | Unit + browser smoke | Browser run verified; installed Steam pass open | Safe as single-player | Gameplay; `main.js`, `src/threeGame.js` |
| Radial WFC world | Complete target | Partial | Partial: macro plan and live radial lock; physical WFC projection incomplete | 2,000-seed macro validation | Full maze feel/geometry pass open | Do not claim final labyrinth quality | Gameplay; `src/mazeExpedition.js`, Phase 6 |
| Objectives/guidance | Complete | Implemented | Core producers connected | Unit coverage | Full first-hour human observation open | Claim basic objective guidance only | Gameplay; `src/objectiveRegistry.js` |
| Camps/faction verbs | Complete | Implemented | Connected | Economy/activation tests | In-game camp interaction pass open | Do not claim deep faction simulation yet | Gameplay; `src/campEconomy.js`, `src/threeGame.js` |
| Ambient camp workers | Scoped | Implemented | Connected | State/stimulus/audio selection tests | Long-session visual/audio pass open | Do not imply escort or population simulation | Gameplay; `src/humanAI.js`, `src/campHumanBehavior.js` |
| Steam Input/controller | Complete | Implemented | Native + browser fallback connected | Semantic router + focus browser tests | Physical Deck/controller matrix open | Controller code-backed; Full Controller/Verified held | Platform; `src/inputActions.js`, `electron/main.cjs` |
| RGB archive simulation | Complete | Implemented | Connected through archive action set | State/runtime/browser coverage | Full controller chapter traversal open | Safe as included single-player content | Narrative; `src/minigames/rgb/` |
| Steam achievements/stats | Complete definitions | Implemented | Renderer/Electron forwarding connected | Definition/sync generation tests | Dashboard publish + installed unlock/read open | Hold Steam achievement checkbox until live pass | Platform; `src/achievements.js`, `src/steamStats.js` |
| Steam leaderboards | Complete | Implemented | Backend/client path connected | Validation + smoke client tests | Production Steam-session read/write open | Hold public claim until live pass | Backend; `server/`, `scripts/smoke-steam-leaderboards.js` |
| Steam Cloud saves | Complete contract | Implemented | Electron save bridge connected | Migration/corruption/atomic-write tests | Two-machine conflict/offline matrix open | Hold Cloud claim | Platform; `electron/save-contract.cjs`, `docs/steam-cloud-save-contract.md` |
| Steam Inventory/Vault | Complete catalog | Implemented | Read/fallback UI connected | Catalog/art/fallback tests | Live definition upload/ownership pass open | Inventory read UI only; purchases held | Platform; `src/steamVaultUi.js`, `steam/inventory_schema_hunker_bunker.json` |
| Microtransactions/store | Designed contingency | Contained/disabled | Production flags off | Flag/env validation | Valve/legal/sandbox/refund acceptance open | Do not claim purchases | Backend/product; `server/backendEnvAudit.js` |
| Steam Timeline | Deferred | Fail-safe bridge only | No native API binding | IPC behavior covered indirectly | Installed event recording impossible today | Do not claim Timeline | Platform; current `steamworks.js` limitation |
| Steam Deck | Complete target | Code preparation implemented | Linux build/Input/stage connected | 1280×800 browser/focus coverage | Physical built-in controls, suspend, dock, battery open | Do not claim Verified | Platform/manual; `docs/steam-deck-migration-status.md` |
| English Full Audio | Not designed as full localization | Music/SFX + partial VO only | Audio runtime connected | Audio generator/runtime tests | Full-dialogue VO coverage absent | Leave Full Audio unchecked | Audio; `docs/generated-audio-provenance.md` |
| Multiplayer/co-op/PvP | Deferred | Server relay only; no client feature | Not connected to renderer | Relay/backend tests only | No product acceptance | Do not claim | Product decision; `docs/dependency-policy.md` |
| Retail asset/package control | Complete | Implemented | CI connected | Manifest/budget/media/duplicate tests | Patch-size comparison after next depot upload open | Internal readiness evidence only | Platform; `scripts/audit-retail-assets.js` |

## Manual acceptance that remains authoritative

- Installed Steam auth, achievement/stat, leaderboard, Inventory, and overlay
  pass.
- Two-machine Steam Cloud sync/conflict/offline pass.
- Physical Steam Deck and external-controller traversal, suspend/resume,
  docked output, readability, performance, and battery sampling.
- Valve/legal approval and live sandbox lifecycle before any purchase claim.
- Human first-hour and generated-world feel/readability playtests.

Store and event copy is additionally enforced by
`npm run steam:claims:check`; this matrix is explanatory evidence, not a way
to bypass that gate.

