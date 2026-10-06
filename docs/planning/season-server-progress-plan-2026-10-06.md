# Server-held Season progress (Tactical Dossier) — plan

Status: built, awaiting deploy | Branch: `dev/sprint-49` | Decided 2026-10-06 (user chose
"server-verified XP first" over tester-only or capped client claims)

## Problem

On Steam builds every Dossier item reward (patches, charms, emblems, weapons,
fragments) stays "Pending — retry". Season XP, ranks, directives and fragment
allowances are computed and stored only on the player's machine
(`src/seasonPass.js`, localStorage `hb_season_deep_crust_beta_1_v1`). The
backend cannot grant Steam inventory items on the word of a save file anyone
can edit.

## Trust model (what "verified" can and cannot mean)

Hunker Bunker's single-player simulation runs on the client. No server can prove
a reported objective happened. What the backend can do, and what this plan
builds, is the industry-standard version:

- **The backend owns the ledger.** XP, ranks, directives, fragments and claims
  live in the backend, per Steam account. The client shows a copy.
- **Steam-authenticated identity.** Every call carries the Steam session token
  (`steamAuthMiddleware`), so progress is bound to a real SteamID.
- **Server-issued runs with server time.** A run starts on the server, which
  stamps the time. Events carry an offset into the run that may never exceed
  the real time the server has seen pass, so a replayed or scripted burst can't
  invent play time.
- **Plausibility rules on top of the game's own rules.** Minimum spacing
  between XP-earning events, minimum run length for the extraction bonus, a
  bounded run lifetime, and a weekly XP cap per account. These are set loosely
  enough that real play never hits them.
- **One grant per rank.** Steam `AddItem` with a deterministic `requestId`
  (`season:<season>:<steamId>:<receipt>`), so retries never double-grant.
- **An audit trail.** Every accepted or rejected event is counted per account,
  so abuse is visible.

A determined cheater can still script plausible events at human pace. The caps
bound what that earns (cosmetics only, at most a few ranks per week), which is
the accepted trade-off.

## Design

### One rulebook, two places

`src/seasonPass.js` (`SeasonPassManager`) already encodes the season rules:
per-run objective/depth/boss accounting, directives, fragment allowances,
onboarding, the 30-rank reward table and claims. It takes a pluggable
`storage`. The backend runs the **same class** over a storage adapter backed by
one JSON document per account, so client and server can never disagree on
rules. Server-only plausibility checks wrap it (`server/seasonLedger.js`).

### Storage

`microtxn_checkpoints` already stores versioned JSON documents with optimistic
concurrency in both backends (sqlite and file). Scope:
`season.<seasonId>.<steamId64>`. A conflicting write retries once on fresh
state.

### Endpoints (all `steamAuthMiddleware`, rate limited)

| Route | Body | Does |
|---|---|---|
| `GET /steam/season/state` | — | The account's ledger view (xp, tier, directives, fragments, receipts, active run) |
| `POST /steam/season/run/begin` | `{ initialDepth }` | Server-issued `runId`, server start time |
| `POST /steam/season/run/event` | `{ runId, kind, id, tier?, crossing?, atMs }` | objective / depth / boss / activity inside a run |
| `POST /steam/season/run/settle` | `{ runId, outcome, atMs }` | extracted / failed / abandoned |
| `POST /steam/season/activity` | `{ id }` or `{ onboarding, target? }` | out-of-run activity (fabrication) and onboarding stages |
| `POST /steam/season/claim` | `{ tier, track, selectedChoice? }` | claims a rank; items granted to Steam inventory |
| `POST /steam/season/ack` | `{ receiptIds }` | client confirms it banked supply bundles |
| `POST /steam/season/import` | `{ state }` | one-time carry-over of pre-server local progress, testers only |

Every mutating response returns `{ ok, award, state, delivered, bankable }`.

- **Item rewards and fragments:** granted server-side on every mutation that
  creates them (`AddItem`, idempotent `requestId`), then marked confirmed.
- **Supply bundles** are the game's own TECH/COIN/MED bank. They are client
  currency, so they come back as `bankable`. The client deposits them through
  `bankManager.depositSeasonReward` (deduplicated by receipt id) and acks.
- **Premium track:** no verified entitlement exists, so premium is never
  granted (unchanged from today).

### Plausibility rules (`server/seasonLedger.js`, env-tunable)

| Rule | Default |
|---|---|
| Event `atMs` must be ≥ previous event's and ≤ server time since `begin` (+5 s skew) | — |
| Minimum gap between XP-earning events in a run | 15 s |
| First objective / depth crossing / boss after begin | ≥ 20 s / ≥ 30 s / ≥ 60 s |
| Bosses per run | ≤ 3 |
| Extraction bonus needs run length | ≥ 180 s |
| Run lifetime (events after are refused) | 3 h |
| Weekly XP cap per account (UTC week) | 12,000 XP |
| Activities (fabrication) | deduplicated per id (game rule), ≤ 10 per UTC day |

Rejections are not errors to the player: the event earns nothing and is
counted in `ledger.audit`.

### Client (`src/seasonPassUi.js`)

- Steam build with a backend session: `seasonPass` becomes a **mirror**. Every
  action goes to the backend; the response's `state` replaces the local copy
  (kept in localStorage for offline display only). The event listeners are
  unchanged and still feed the same five verbs.
- Offline or backend error: the action is kept in an outbox
  (`hb_season_outbox`) and replayed in order. Server time still bounds its
  offsets, so late replays are accepted only if they fit inside the run's real
  duration.
- Browser/web build: unchanged (local only, no Steam items).
- First sync on a tester account (`HB_STEAM_SANDBOX_STEAM_IDS`) with local
  progress and an empty server ledger: one `import`. The server clamps it to
  the season rules (rank cap, released directives, fragment allowance) and
  marks the ledger `imported`. Other accounts start from the server's ledger.
- UI: the "LOCAL SYNC" / "STEAM SYNC" chip reflects the real source
  (`SERVER SYNC` when mirrored), and "Pending — retry" now means a real
  in-flight grant.

## Steps

1. `server/seasonLedger.js`: storage adapter over checkpoints, plausibility
   wrapper around `SeasonPassManager`, delivery of item receipts through
   `grantSteamItem` (deterministic `requestId`). Unit tests for every rule.
2. `server/seasonRoutes.js`: the eight routes, mounted in `server/index.js`.
   Route tests with mocked Steam `AddItem`.
3. `deploy/Dockerfile`: copy the season rule files the server imports.
   `deployImageContents.test.js` guards it.
4. `src/seasonServerSync.js`: client mirror, outbox, import, supply banking.
   Unit tests with a fake backend.
5. Wire `seasonPassUi.js` to the mirror on Steam builds. Electron preload
   bridges for the routes.
6. e2e: Dossier on a stubbed Steam build shows server state, a claim grants,
   an outbox replays.
7. Build and smoke a backend candidate image; the user deploys.

## Status log

- 2026-10-06: plan written.
- 2026-10-06: steps 1–3 done (`ebd81f95`): `server/seasonLedger.js` (9 rule tests),
  `server/seasonRoutes.js` (route tests), Dockerfile copies the season rule files.
- 2026-10-06: steps 4–6 done: `src/seasonServerSync.js` mirror, outbox and import,
  tested against the real ledger in-process (5 tests); `seasonPassUi.js` routes
  every verb through it on Steam builds; preload `getSeasonState` /
  `seasonAction`; e2e `tests/e2e/season-dossier.spec.js`. Found on the way: the
  Dossier's open-time focus (and main.js's controller focus pick) focused rank
  1's button, which scrolled the list back to the top; both now pick the
  current rank's row.
- Step 7 (candidate image + user deploy) next. Offline note: an outbox replay
  is only accepted if its offsets fit inside the time the server has seen pass
  since the run began, so a run whose begin never reached the server earns
  nothing.
