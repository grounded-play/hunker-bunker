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

Last updated: 2026-08-20 (evening correction — see note below).

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
| Steam Lobby (Friends/Invite/Join Game) | Code-complete, all 4 implementation steps of `docs/steam-lobby-integration-plan-2026-08-20.md` shipped. Second real two-machine playtest (`docs/multiplayer-flow-and-lobby-bugs-2026-08-20.md`) found: (1) the roster showed "AGENT" instead of the real callsign and multiplayer/trade stats never recorded, root-caused to a dead `window.profileManager` global (should be `window.profile`) and **fixed**; (2) lobbies are still invisible cross-machine even though they're genuinely Public — traced to the installed `steamworks.js`'s `getLobbies()` having no distance-filter parameter, which per Valve's docs makes Steam default to same-region-only results. This is a real native-binding limitation, **not fixed** — needs either a binding patch/upgrade or routing discovery through the relay backend instead of Steam's native browse-list. Room codes remain available for browser dev/LAN/QA in the meantime |
| New-run flow (class → Armory → Deployment Briefing) | **Shipped and live-verified** 2026-08-20 (`docs/multiplayer-flow-and-lobby-bugs-2026-08-20.md` Phase 1/2). Every run — solo and multiplayer alike — now goes title → class select → Armory → a single Deployment Briefing screen (SOLO/CO-OP/PVP, the former tactical-net modal relocated + reused there) → gameplay, instead of multiplayer skipping ahead of Armory via two separate early entry points. New this pass: host-set private lobby + password (Steam `LobbyType.Private` for visibility, a relay-side SHA-256-hash gate in `server/relay.js` for the password — never through Steam metadata). Live-tested against the real dev server: SOLO deploy launches real gameplay, CO-OP connects to a real local relay, cancel correctly returns to the title menu. Not yet done: Phase 3 (per-player loadout sync) and Phase 4 (squad-composition cutscene) — both still just planned |
| 3D model loading (packaged builds) | **Fixed** 2026-08-20 — all `.glb` files (259MB) were shipping fully inside `app.asar`, unlike textures/sprites which already worked via `assetUrl.js`'s file://-safe path resolution. Added `dist/**/*.glb` to electron-builder's `asarUnpack`; verified with real `electron-builder --dir` packaging runs on both Linux and Windows targets (76/76 models correctly unpacked on both). `scripts/audit-retail-assets.js`'s `ASAR_BUDGET` lowered 1150→950 MiB to match the now-smaller `app.asar` (measured 797720366 bytes) |
| Steam production auth | **Live** — self-hosted via `docker-compose.yml`/`Caddyfile` at `https://steam.tuesdaycinema.club`, confirmed healthy 2026-08-20 (`authConfigured: true`, `signingMode: explicit`, durable storage). GitHub Actions/Fly.io path remains unused/unset — not needed, ignore its missing secrets. Not yet verified against a real Steam ticket from an installed build (health check only so far) |
| Steam Inventory/Cosmetics | Catalog defined, inert — no equip flow, no weapon render exists yet (`project_cosmetics_loadout_system`) |
| Steam Stats/Cloud | Fixed 2026-08-20: all 8 dashboard stats now synced (`src/steamStats.js`, was 2/8); Steam Cloud save bridge now wired (`src/steamCloudSaveBridge.js` — was fully built in Electron but never called, so Cloud synced nothing). Dashboard-side items (Cloud byte/file quota, "developers only" checkbox, Steam Input default controller config) confirmed done by the user 2026-08-20. Still not yet verified against a real installed build/Steam Cloud round-trip |
| Multiplayer identity | SteamID64/profileId used for host reassignment + failover; not yet the durable key for player records/ready-state/results everywhere (Sprint 26 item 1, partial) |
| Backend | Self-hosted Docker (backend + Caddy) behind a router port-forward to `steam.tuesdaycinema.club`, live. Fly.io config in `fly.toml` is unused legacy — do not treat its missing secrets as a blocker |
| Performance | `docs/perf-chunk-mount-plan-2026-08-20.md`: real chunk-mount batch-stacking during deploy fixed (time-budget scheduling) and live-verified. Fixed a real diagnostic bug (stale long-task attribution tag) and a real waste (render() no longer runs a full update+draw pass when `#game-container` has collapsed to 0x0, e.g. a closed map-box preview). The original multi-second idle-menu freeze itself is **still unexplained** — this sandbox's Chrome only has SwiftShader (software) WebGL, confirmed live, so its timings aren't trustworthy evidence for real hardware; a `menuRenderSnapshot` diagnostic now rides along with the next real playtest's long-task log so the next investigation isn't starting from zero |
| Accessibility | No subtitles/captions, text scaling, reduced-motion, or colorblind modes found in repo search — real gap, not started |
| Localization | No i18n/string-externalization system found — real gap, not started |
| Current milestone | Sprint 26 (multiplayer Steam-native hardening) + "One More Ring" design-pillars planning, running in parallel — see `docs/sprint26-master-plan-2026-08-19.md` and `docs/design/one-more-ring-design-pillars.md` |
| Feature freeze | NO, but `docs/design/one-more-ring-design-pillars.md` recommends one: no new content breadth (marketplace/cosmetics/economy) until combat feel, performance, and multiplayer reliability meet the quality bar in `docs/design/aaa-polish-and-studio-strategy.md` |
| Next ship gate | Two real Steam accounts completing a full synchronized co-op session end-to-end on production backend services (Sprint 26's own definition of done) |
