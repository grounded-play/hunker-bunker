# Product State

The one place that answers "what is true today" without reconciling
contradictions across `docs/`. Everything else in `docs/` (reviews, sprint
plans, worklogs, teardowns, narrative bibles) stays historical — point-in-
time records of investigation and decisions. This file does not replace
them; it exists because several of them have already needed their own
"this statement is stale" corrections, which is a normal symptom of a
fast-moving project, not a writing failure. See
`docs/design/aaa-polish-and-studio-strategy.md` for the reasoning.

**Update this file whenever a row's truth changes. Keep entries to one
line — link to the relevant doc for detail, don't inline the detail here.**

Last updated: 2026-08-20 (Sprint 28 re-entry review; see recent worktree plan).

**Correction (2026-08-20, evening):** the "Steam production auth: not deployed,
blocked on GitHub secrets" row below was wrong. That was true only for the
GitHub Actions → Fly.io path (`.github/workflows/steam-backend-deploy.yml`,
`fly.toml`) — those secrets really are unset and that path really is
unused. But a separate, self-hosted deployment already exists and is live:
`docker-compose.yml` + `Caddyfile` in this repo run `hunker-bunker-backend`
+ `hunker-bunker-caddy` on the user's own machine behind a router
port-forward, reverse-proxying real TLS at `steam.tuesdaycinema.club`.
Confirmed via `curl https://steam.tuesdaycinema.club/health`:
`steam.authConfigured: true`, `steam.session.signingMode: "explicit"`
(meaning `HB_SESSION_SECRET` is genuinely set, not falling back to the
publisher key), `storage.durable: true`. Fly.io was never used; local
self-hosting is the real production path and was already working before
this correction. One open item: the two live secrets on that container
aren't in any tracked `.env*` file in this repo — worth the user noting
down where they came from before the container ever needs rebuilding.

| Category | Current truth |
|---|---|
| Core loop | Playable |
| Act 1 | Content complete, ongoing polish |
| Act 2 | Wired end-to-end (queen fight, endings, faction verbs) — see `project_act2_pregalien_loop` in memory |
| Co-op | Functional, host-authoritative for enemy sync, ready-up flow shipped — not yet Steam-Lobby-native (see `docs/sprint26-master-plan-2026-08-19.md`) |
| PvP | Functional, server-authoritative damage — experimental, not acceptance-tested with two real Steam accounts |
| Steam Lobby (Friends/Invite/Join Game) | Code-complete for same-region create/browse/join/invite, with callsign/class/loadout/ready-up fixes, client host-state synchronization, authoritative ready snapshots, host-only deploy enforcement, and the pre-existing-lobby invite sequencing race fixed. `log12.json` proved the live relay was running a pre-fix August 18 image; the production backend was rebuilt/recreated from current code on 2026-08-20 and verified healthy with the new roster/ready/host implementation. Cross-region discovery remains blocked by the installed `steamworks.js` binding's missing distance filter; post-redeploy two-account Steam acceptance is still open. Meetup path: restart both clients, select class/callsign before joining, host creates CO-OP lobby, host invites guest, both ready, then host selects START SQUAD. See `docs/steam-lobby-integration-plan-2026-08-20.md` and `docs/multiplayer-host-assignment-review-2026-08-20.md` |
| Depth Contract / One More Ring | Partial runtime wiring in the current Sprint 28 worktree: deeper O₂ pressure, crossing ritual deltas, and tests are connected; salvage value, rare-relic pool, and director aggression remain open. |
| Transformative relics | 5/8 have gameplay hooks (`last_breath`, `punctured_lung`, `parasitic_magazine`, `false_telemetry`, `cryo_breach`) with pure-function tests; `scrap_cycler`, `vesper_doctrine`, and `queens_milk` remain catalog-only. |
| Ordinary enemy stagger grammar | Runtime-wired in the current worktree for cryosnails, bio chargers, and sentinels, with pure and runtime tests; needs live combat feel verification. |
| New-run flow (class → Armory → Deployment Briefing) | **All 4 phases shipped and live-verified** 2026-08-20 (`docs/multiplayer-flow-and-lobby-bugs-2026-08-20.md`). Every run — solo and multiplayer alike — now goes title → class select → Armory → a single Deployment Briefing screen (SOLO/CO-OP/PVP, the former tactical-net modal relocated + reused there) → a class-intro cutscene → gameplay. Ships host-set private lobby + password (Steam `LobbyType.Private` for visibility, a relay-side SHA-256-hash gate for the password — never through Steam metadata), per-player loadout synced onto the roster (`{weapon, hasCharm}`, relay-validated, shown on each roster row), and a live squad-manifest overlay on the class-intro cutscene for multiplayer runs (real callsigns/classes/loadouts, composited over each player's own existing single-class video rather than new bespoke video assets — none exist or could be authored this pass). Live-verified end to end against the real dev server and local relay: SOLO deploy, CO-OP connect + deploy + cutscene overlay + real gameplay launch, cancel-to-menu |
| Friend demo observability | Demo checkpoint commands (`demo start`, `demo mark <label>`, `demo stop`) and exported session context now capture Deck/controller state, Steam/backend health, logical-stage metrics, and performance counters. Use `docs/demo-night-playtest-2026-08-20.md`; human packaged-build feedback remains pending. |
| 3D model loading (packaged builds) | **Fixed** 2026-08-20 — all `.glb` files (259MB) were shipping fully inside `app.asar`, unlike textures/sprites which already worked via `assetUrl.js`'s file://-safe path resolution. Added `dist/**/*.glb` to electron-builder's `asarUnpack`; verified with real `electron-builder --dir` packaging runs on both Linux and Windows targets (76/76 models correctly unpacked on both). `scripts/audit-retail-assets.js`'s `ASAR_BUDGET` lowered 1150→950 MiB to match the now-smaller `app.asar` (measured 797720366 bytes) |
| Steam production auth | **Live** — self-hosted via `docker-compose.yml`/`Caddyfile` at `https://steam.tuesdaycinema.club`, confirmed healthy 2026-08-20 (`authConfigured: true`, `signingMode: explicit`, durable storage). GitHub Actions/Fly.io path remains unused/unset — not needed, ignore its missing secrets. Not yet verified against a real Steam ticket from an installed build (health check only so far) |
| Steam Inventory/Cosmetics | Catalog defined, inert — no equip flow, no weapon render exists yet (`project_cosmetics_loadout_system`) |
| Steam Stats/Cloud | Fixed 2026-08-20: all 8 dashboard stats now synced (`src/steamStats.js`, was 2/8); Steam Cloud save bridge now wired (`src/steamCloudSaveBridge.js` — was fully built in Electron but never called, so Cloud synced nothing). Dashboard-side items (Cloud byte/file quota, "developers only" checkbox, Steam Input default controller config) confirmed done by the user 2026-08-20. Still not yet verified against a real installed build/Steam Cloud round-trip |
| Multiplayer identity | SteamID64/profileId used for host reassignment + failover; not yet the durable key for player records/ready-state/results everywhere (Sprint 26 item 1, partial) |
| Backend | Self-hosted Docker (backend + Caddy) behind a router port-forward to `steam.tuesdaycinema.club`, live. Fly.io config in `fly.toml` is unused legacy — do not treat its missing secrets as a blocker |
| Performance | Prior chunk-mount batching, stale attribution, and collapsed-container render waste are fixed. **P0 active audit:** real packaged Windows evidence in `docs/logs/log10.json` contains 299 long tasks / 44.79s blocked time, including a 6.176s unattributed stall, 3.430s + 1.386s streaming-adjacent stalls, and 58–127ms `gear-poof` tasks. Lane F nested phase attribution and renderer/scene/effect counters are now wired and unit-tested; the remaining gate is a packaged Windows rerun covering wall destruction, VFX, streaming, and first-use renderer/asset work. No fix is accepted from SwiftShader timings alone. See Sprint 28 Lane F in `docs/sprint28plan.md` and `docs/perf-chunk-mount-plan-2026-08-20.md` |
| Accessibility | Reduced-motion coverage is partial; colorblind setting UI/state exists but has no CSS palette effect; subtitles/captions and text scaling are not started |
| Localization | No i18n/string-externalization system found — real gap, not started |
| Current milestone | Sprint 28 convergence: prove the 35–45 minute Proof Run (briefing → descent → depth gamble → build expression → escalation → extraction), finish the remaining relic/combat evidence, then run real packaged/two-account acceptance — see `docs/design/game-outline-and-proof-run.md`, `docs/sprint28plan.md`, and `docs/re-entry-review-and-game-plan-2026-08-20.md` |
| Feature freeze | NO, but `docs/design/one-more-ring-design-pillars.md` recommends one: no new content breadth (marketplace/cosmetics/economy) until combat feel, performance, and multiplayer reliability meet the quality bar in `docs/design/aaa-polish-and-studio-strategy.md` |
| Next ship gate | P0 packaged frame-pacing audit has explained/reduced the log10 stalls, then two real Steam accounts complete a full synchronized co-op session end-to-end on production backend services |
