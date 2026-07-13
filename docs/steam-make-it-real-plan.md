# Steam: Make It Real — Parallel Lanes for Codex and Gemini

Plan of record, 2026-07-12. Follows a full review of
[steam-implementation-status-and-roadmap.md](steam-implementation-status-and-roadmap.md)
and a deep dive over the whole repo (server modules, electron shell, renderer
wiring, CI). The status doc's discipline is right — its decision log and hard
requirements stand unmodified. This doc turns "implemented on localhost" into
"a stranger's Steam Deck can play it," with two lanes designed to run in
parallel with **zero file overlap**.

## Review verdict on where we are

What the last waves built is real engineering: modular tested backend
(auth-ticket verification, recomputed leaderboard scores, idempotency store,
atomic JSON persistence), Steam Input action-set polling with renderer mode
detection, achievements/stats/cloud bridges, and honest safe-when-unconfigured
fallbacks everywhere. Endorsed as-is.

Three findings block "real," in order:

1. **Packaged builds can never reach the backend.** `electron/preload.cjs`
   reads `HB_STEAM_BACKEND_URL` from `process.env` with a `localhost:3001`
   default. A Steam-installed build has no env vars — every player's client
   will silently point at localhost. Config must be **baked at build time**.
2. **There is no backend to reach.** No Dockerfile, no host config, no
   deploy workflow, no durable DB path. Trusted leaderboards/inventory are
   dead on arrival without a deployed HTTPS endpoint.
3. **Controllers can boot the game but not play it.** The browser Gamepad
   API is used only as a boot trigger; Steam Input snapshots stream to the
   renderer for *prompt switching* but never feed the movement/fire/interact
   paths in `threeGame.js`. A Deck player presses A at the menu and then
   nothing. This is the #1 Deck-review killer.

Second-order gaps: every backend call burns a fresh auth ticket (Valve rate
limits `AuthenticateUserTicket`; `/steam/session` exists but nothing uses the
session), no rate limiting on routes, `server/db_storage.json` (mock data)
sits untracked and un-ignored, no leaderboard GET/UI, no `DEMO_BUILD` gate,
no depot `steam_appid.txt` CI guard, no DRM wrap script, and the status doc's
own "immediate next slice" (mock leaderboards + GET route) is still open.

---

## Lane A — Codex: "The Trusted Rail" (backend, input systems, pipeline)

**Files owned:** `server/**`, `electron/**`, `src/steam/**`,
`src/featureFlags.js`, `.github/workflows/**`, `steam/*.vdf`, `Dockerfile`/
deploy config, gamepad/movement wiring regions of `src/threeGame.js` and the
input-state region of `main.js`.

### A1. Session flow (kills the per-request ticket burn)

`/steam/session` verifies the ticket **once** and issues a short-lived
HMAC-signed session token (`HB_SESSION_SECRET`, 15-min expiry, steamid64 +
appid claims). All other steam routes accept `Authorization: Bearer <token>`
and derive `steamid` from it — never from the body. Preload mints a session
at boot, renews on 401, and keeps the existing per-call ticket path only as
the session-mint mechanism. Tests: expiry, tamper, steamid derivation.

### A2. Backed-in client config

`electron/steam-config.json` — `{ backendUrl, appId, authIdentity }` —
generated during `electron:build` from env/CI secrets (dev default keeps
localhost + env override). Preload reads the bundled file first, env second.
CI stamps the production URL into tagged builds. Acceptance: a packaged
build with **no environment** reaches the deployed `/health`.

### A3. Deploy the backend

Dockerfile (node:22-slim, `server/`, non-root), `HB_DB_PATH` env for the
JSON store (volume-mounted; SQLite migration deferred until receipts
matter), `/health` gains a version/uptime body, `fly.toml` (or equivalent —
owner's host call) with HTTPS, `HB_ALLOWED_ORIGINS` set, publisher key as a
platform secret. One-page runbook in `docs/`. Gitignore `db_storage.json`.
Add a `deploy-backend` GitHub workflow (manual dispatch, secrets-gated, same
pattern as the Steam upload job).

### A4. Route hardening

Per-steamid + per-IP rate limits on all `/steam/*` routes (simple in-memory
token bucket is fine at this scale), request-size caps already exist, and a
`GET /steam/leaderboards/:board` + dev mock storage — closing the status
doc's "immediate next slice" so Gemini's UI lane has data on day one.

### A5. Controllers actually play the game

Feed the streamed Steam Input snapshot (`move`, `fire`, `interact`,
`reload`, `ability`, `scan`, `pause`) into the same input paths the keyboard
uses in `threeGame.js`; add the browser Gamepad API equivalent for
non-Steam/web builds (one mapping module, two sources). Menu navigation
actions (`menu_up/down/confirm/back`) dispatch synthetic focus events for
Gemini's menu-focus work to consume — that event contract is the lane seam:
`gamepad-menu-nav { action }`.

### A6. Pipeline guards

CI depot audit that fails if `steam_appid.txt` or `db_storage.json` appear
in an unpacked dir; documented + scripted Windows DRM wrap step (manual
first, per the status doc's order); `DEMO_BUILD` flag in `featureFlags.js`
gating content to Act 1 → cave reveal (the end-card UI is Gemini's).

## Lane B — Gemini: "The Player-Facing Steam Layer" (UI/UX, store kit)

**Files owned:** `index.html`, `style.css`, UI regions of `main.js`,
`public/**`, store asset sources, docs manifests.

### B1. Leaderboard results UI

On the run-summary/game-over screen: top-10 + "your rank" from
`getSteamLeaderboard` (helper already exposed in preload), with the three
honest states — live, dev-mock, offline ("LEADERBOARD OFFLINE — SCORE
BANKED LOCALLY"). Small first, per the status doc; no giant modal.

### B2. Steam Vault v1 (read-only)

Main-menu entry per the roadmap: inventory grid from
`refreshSteamInventory`, item detail card, equipped-cosmetic marker,
mock/offline states. No crafting, no market links yet — display only.

### B3. Controller & Deck UX

Button-prompt glyph set (Xbox/PS/Deck) driven by the existing
`primaryControllerType`; every `PRESS E` prompt swaps per input mode. Menu
focus navigation consuming Codex's `gamepad-menu-nav` events (visible focus
ring, wrap-around lists). On-screen keyboard via the exposed
`showGamepadTextInput` wherever text entry exists (save codes). Deck layout
audit at 1280×800: HUD safe areas, minimum font sizes, settings-modal focus
order.

### B4. Store kit

Capsule art set at every required Steam size (from the wave-4 title key
art), 5–7 staged store screenshots (the `shot_tour.js` pattern makes these
reproducible), a 60–90s trailer beat sheet, and a store-description copy
pass in the game's voice (the lore review's tone rules apply — carrying,
not features).

### B5. Demo end-card

The `DEMO_BUILD` termination screen: ends ON the cave reveal, one line in
the queen's voice, wishlist CTA via the existing `openSteamOverlayToUrl`
(overlay to the store page), "continue in the full game" framing. This card
converts the demo's best moment into wishlists.

## Seams (the only places the lanes touch)

- `gamepad-menu-nav { action }` — Codex dispatches, Gemini consumes.
- `getSteamLeaderboard` / `refreshSteamInventory` responses — Codex owns
  shape (documented in route tests), Gemini renders; additive changes only.
- `DEMO_BUILD` flag — Codex defines and gates systems; Gemini owns the
  end-card DOM it triggers.

Rules as before: pull-rebase per work block, `npm test` green per commit,
announce any out-of-lane hunk in the commit message.

## Acceptance: the "make it real" checklist

The work is done when this runs clean, in order, on real hardware:

1. Tag a build → CI packages, uploads to the `beta` branch, depot audit green.
2. Install from Steam on a desktop: overlay opens, achievement pops and
   appears on the Steam profile, save syncs via cloud to a second machine.
3. Backend: the installed build (no env vars) reaches the deployed
   `/health`; finish a run → score appears in `GET /steam/leaderboards`
   and on the results screen.
4. Steam Deck: boot to gameplay, play five minutes **entirely on
   controller**, prompts show Deck glyphs, text entry uses the on-screen
   keyboard.
5. `DEMO_BUILD` package ends on the reveal with the wishlist card.

Claude's reserved lane is unchanged (queen fight, boarding vessel) and
stays out of both lanes' files.
