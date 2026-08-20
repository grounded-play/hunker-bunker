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

Last updated: 2026-08-20.

| Category | Current truth |
|---|---|
| Core loop | Playable |
| Act 1 | Content complete, ongoing polish |
| Act 2 | Wired end-to-end (queen fight, endings, faction verbs) — see `project_act2_pregalien_loop` in memory |
| Co-op | Functional, host-authoritative for enemy sync, ready-up flow shipped — not yet Steam-Lobby-native (see `docs/sprint26-master-plan-2026-08-19.md`) |
| PvP | Functional, server-authoritative damage — experimental, not acceptance-tested with two real Steam accounts |
| Steam Lobby (Friends/Invite/Join Game) | Not implemented — relay/room-code is the only join path today |
| Steam production auth | Code-complete (ticket flow, `/steam/session`, signed sessions) but **not deployed** — blocked on missing GitHub Actions secrets (`HB_STEAM_PUBLISHER_KEY`, `HB_SESSION_SECRET`, `HB_ALLOWED_ORIGINS`, `HB_STEAM_LEADERBOARD_IDS`, `FLY_API_TOKEN`), a credentials task only a human can complete |
| Steam Inventory/Cosmetics | Catalog defined, inert — no equip flow, no weapon render exists yet (`project_cosmetics_loadout_system`) |
| Multiplayer identity | SteamID64/profileId used for host reassignment + failover; not yet the durable key for player records/ready-state/results everywhere (Sprint 26 item 1, partial) |
| Backend | Fly.io + Socket.IO relay, code-ready; production deploy blocked on secrets above |
| Performance | Known blocker: recurring 60-200ms chunk-mount stalls + an observed ~6s main-thread freeze, instrumented but root cause not yet confirmed (`docs/sprint26-master-plan-2026-08-19.md`) |
| Accessibility | No subtitles/captions, text scaling, reduced-motion, or colorblind modes found in repo search — real gap, not started |
| Localization | No i18n/string-externalization system found — real gap, not started |
| Current milestone | Sprint 26 (multiplayer Steam-native hardening) + "One More Ring" design-pillars planning, running in parallel — see `docs/sprint26-master-plan-2026-08-19.md` and `docs/design/one-more-ring-design-pillars.md` |
| Feature freeze | NO, but `docs/design/one-more-ring-design-pillars.md` recommends one: no new content breadth (marketplace/cosmetics/economy) until combat feel, performance, and multiplayer reliability meet the quality bar in `docs/design/aaa-polish-and-studio-strategy.md` |
| Next ship gate | Two real Steam accounts completing a full synchronized co-op session end-to-end on production backend services (Sprint 26's own definition of done) |
