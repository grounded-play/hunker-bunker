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
| Steam Lobby (Friends/Invite/Join Game) | Not implemented — relay/room-code is the only join path today. Real plan now exists: `docs/steam-lobby-integration-plan-2026-08-20.md` (verified against the actual installed `steamworks.js` v0.4.0 type defs, not just the earlier walkthrough's guesses) |
| Steam production auth | **Live** — self-hosted via `docker-compose.yml`/`Caddyfile` at `https://steam.tuesdaycinema.club`, confirmed healthy 2026-08-20 (`authConfigured: true`, `signingMode: explicit`, durable storage). GitHub Actions/Fly.io path remains unused/unset — not needed, ignore its missing secrets. Not yet verified against a real Steam ticket from an installed build (health check only so far) |
| Steam Inventory/Cosmetics | Catalog defined, inert — no equip flow, no weapon render exists yet (`project_cosmetics_loadout_system`) |
| Steam Stats/Cloud | Fixed 2026-08-20: all 8 dashboard stats now synced (`src/steamStats.js`, was 2/8); Steam Cloud save bridge now wired (`src/steamCloudSaveBridge.js` — was fully built in Electron but never called, so Cloud synced nothing). Dashboard-side items (Cloud byte/file quota, "developers only" checkbox, Steam Input default controller config) confirmed done by the user 2026-08-20. Still not yet verified against a real installed build/Steam Cloud round-trip |
| Multiplayer identity | SteamID64/profileId used for host reassignment + failover; not yet the durable key for player records/ready-state/results everywhere (Sprint 26 item 1, partial) |
| Backend | Self-hosted Docker (backend + Caddy) behind a router port-forward to `steam.tuesdaycinema.club`, live. Fly.io config in `fly.toml` is unused legacy — do not treat its missing secrets as a blocker |
| Performance | Known blocker: recurring 60-200ms chunk-mount stalls + an observed ~6s main-thread freeze, instrumented but root cause not yet confirmed (`docs/sprint26-master-plan-2026-08-19.md`) |
| Accessibility | No subtitles/captions, text scaling, reduced-motion, or colorblind modes found in repo search — real gap, not started |
| Localization | No i18n/string-externalization system found — real gap, not started |
| Current milestone | Sprint 26 (multiplayer Steam-native hardening) + "One More Ring" design-pillars planning, running in parallel — see `docs/sprint26-master-plan-2026-08-19.md` and `docs/design/one-more-ring-design-pillars.md` |
| Feature freeze | NO, but `docs/design/one-more-ring-design-pillars.md` recommends one: no new content breadth (marketplace/cosmetics/economy) until combat feel, performance, and multiplayer reliability meet the quality bar in `docs/design/aaa-polish-and-studio-strategy.md` |
| Next ship gate | Two real Steam accounts completing a full synchronized co-op session end-to-end on production backend services (Sprint 26's own definition of done) |
