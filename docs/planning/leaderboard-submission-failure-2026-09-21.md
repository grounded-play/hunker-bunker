# Leaderboards Not Recording Runs (Steam Deck + PC) — Investigation & Fix Plan

**Date:** 2026-09-21 · **Branch:** `dev/sprint-41` · **Status:** both root causes confirmed and fixed in `5c16fc5`; backend live; see Status log at the bottom

## Symptom

On Steam Deck and PC (Electron + Steam build), finished runs never appear on the
Game Over leaderboard or on any Steam board. The Game Over panel shows
`BEST RUN SCORE - GLOBAL TOP 10` with no ranks.

## Evidence

| Check | Result |
| --- | --- |
| `GET https://steam.tuesdaycinema.club/health` | `ok: true`, `authConfigured: true`, sqlite durable — backend is up and configured |
| `GET /steam/leaderboards/<board>` for all 5 boards | `ok: true, mock: false`, real leaderboard IDs resolved (`best_run_score` = 20504740, etc.), **`entries: []` on every board** |
| Backend request log, `POST /steam/leaderboards/submit-run` by day | 09-11: 4×200 · 09-13: 8×200 · 09-14: 12×200 · **09-15: 6×400** · 09-16: 14×200 + 4×400 · **09-18: 2×400** |
| Rejected submits | `hasBearer: true`, answered in **0–1 ms** — Steam auth succeeded; the request is rejected by payload validation before Steam is ever called |
| Local repro (`buildSteamRunScorePayload` → `validateRunScorePayload`) | death and victory payloads both fail with `["unsupported_schema"]` |

So the Deck/PC client *is* reaching the backend and *is* authenticating with a
Steam session — the Steam/Electron plumbing is fine. Two separate bugs in the
payload/response contract lose the data.

## Root cause 1 — client/server schema version mismatch (CONFIRMED)

Commit `1b12703` (2026-09-15, *fix(DP-48): make playtest telemetry truthful and
bounded*) bumped the client payload:

- `src/steam/steamEvents.js` → `schemaVersion: 2` (added `pickupsCollected`,
  `pickupValueCollected`, `salvageBanked`, `debugGrantedResources` to `stats`)

but the server was not updated:

- `server/leaderboardScoring.js:138` → `if (Number(payload.schemaVersion) !== 1) errors.push('unsupported_schema');`

Every run submitted from a build made on or after 09-15 returns
`400 invalid_run_payload`. The 400s line up exactly with that date in the
backend log. (The 09-16 200s are from an older build still in use on one device.)

Why nobody noticed:

1. **The failure is invisible in-game.** `main.js` (the `STEAM_RUN_SCORE_FINALIZED_EVENT`
   listener) only `console.log`s `leaderboard submit skipped: invalid_run_payload`.
   The Game Over panel reads the board independently and just shows an empty list.
2. **No contract test crosses the boundary.** `src/steam/steamEvents.test.js`
   asserts `schemaVersion: 2`; `server/leaderboardScoring.test.js` and
   `server/steamLeaderboards.test.js` build their own hand-written `schemaVersion: 1`
   fixtures. Both suites pass while the real pair is incompatible.

## Root cause 2 — boards read back empty even after successful writes (CONFIRMED after redeploy)

38 submits returned **200** between 09-11 and 09-16, i.e. `SetLeaderboardScore`
was called for every board — yet every board still returns `entries: []`.

`server/steamLeaderboards.js` `normalizeLeaderboardEntries()` only looks for:

```
data.response.entries.entry | data.response.entries | data.response.entry | data.entries
```

with per-entry fields `steamid`, `persona`, `timestamp`. That shape was invented
for the unit-test fixture (`server/steamLeaderboards.test.js:~336`) and was never
checked against Valve. The partner `ISteamLeaderboards/GetLeaderboardEntries/v1`
response is documented as:

```json
{ "leaderboardEntryInformation": {
    "appID": 4957040, "leaderboardID": 20504740, "totalLeaderBoardEntryCount": 3,
    "leaderboardEntries": [ { "steamID": "7656…", "score": 1550, "rank": 1, "ugcid": "-1", "detailData": "" } ] } }
```

None of the candidate paths match, so the normalizer returns `[]` for a
populated board. The same code has two related guesses (both flagged in code
comments as "unverified against a live Steamworks app"):

- `setLeaderboardScore` treats **HTTP 200 as success**. Valve partner APIs return
  HTTP 200 with a body-level `result` code (`{"result": {"result": 1, "score_changed": true, "global_rank_new": 4, …}}`);
  a non-1 result is a silent failure today.
- `isNewBestReal` reads `data.response.params.score_changed`; the real field is
  under `data.result`. Personal-best milestone grants therefore never fire.

A cosmetic follow-on: Steam entries carry no persona name, so even once rows
appear the UI will label everyone `ANONYMOUS AGENT` (`src/leaderboardUi.js`).

**Verification needed (one command, run by you — it uses the publisher key, so I did not run it):**

```bash
docker exec hunker-bunker-backend node -e '
const k=process.env.HB_STEAM_PUBLISHER_KEY;
fetch(`https://partner.steam-api.com/ISteamLeaderboards/GetLeaderboardEntries/v1/?key=${k}&appid=4957040&leaderboardid=20504740&rangestart=0&rangeend=10&datarequest=RequestGlobal`)
 .then(r=>r.text()).then(t=>console.log(t.slice(0,800)))'
```

If it prints `leaderboardEntryInformation` with rows, root cause 2 is confirmed
and the old (pre-09-15) scores are already on Steam — they will appear as soon
as the normalizer is fixed. If `leaderboardEntries` is empty too, the writes
themselves failed at Valve, and step 2.2 below (checking body `result`) becomes
the priority. Also confirm the env var name — `server/steamAuth.js`
`getSteamPublisherKey()` is the source of truth.

## Secondary issues found (not the cause, fix while here)

| # | Issue | Where | Impact |
| --- | --- | --- | --- |
| S1 | Game Over reads the board **in parallel with** the submit (`dispatchSteamRunScoreFinalized` then immediately `renderGameOverLeaderboard`), so the just-finished run is never in the list you see | `main.js` ~4818 | Even after the fix, your new score shows up one run late |
| S2 | Client score uses `Date.now()` at render time; server recomputes from `endedAt`. The time bonus is `floor((15 - minutes) * 50)`, so a boundary every 1.2 s — a few ms of DOM work between the two timestamps can yield `score_mismatch` with `MAX_SCORE_DELTA = 0` | `src/threeGame.js` `calculateRunScore`, `main.js` 4669 vs 4758 | Rare, intermittent rejected runs on sub-15-minute runs |
| S3 | Rejected runs are dropped, not queued. Anything submitted while broken (or offline on Deck) is lost | `main.js` submit listener | Lost history for 09-15 → fix date |
| S4 | UI says "SCORE BANKED LOCALLY" but nothing banks the leaderboard payload locally | `src/leaderboardUi.js` | Misleading copy |

## Fix plan

### Phase 1 — Unblock submissions (server-first, no client rebuild needed)

The server fix rescues every build already installed on the Deck and PC; a
client-side revert to `1` would require shipping a new Steam build.

1.1 **Accept schema v1 and v2** in `server/leaderboardScoring.js`:
    `const SUPPORTED_RUN_SCHEMAS = new Set([1, 2]);` → `if (!SUPPORTED_RUN_SCHEMAS.has(Number(payload.schemaVersion)))`.
    The v2 additions are extra telemetry fields; nothing in `recomputeRunScore`
    depends on them.
1.2 **Add a cross-boundary contract test** (e.g. `server/runPayloadContract.test.js`)
    that imports the real `buildSteamRunScorePayload` from `src/steam/steamEvents.js`,
    builds death, victory and Daily Ops payloads, sets `score` via the client's
    own formula, and asserts `validateRunScorePayload(payload).ok === true`.
    This test would have caught the 09-15 regression.
1.3 Run `npx vitest run server src/steam` and the full suite.
1.4 **Redeploy the backend:** `cd ~/server && docker compose up -d --build`
    (builds from this working tree — commit or stash unrelated WIP first; see
    `docs/steam-backend-deploy-docker-caddy.md`).
1.5 Verify: play one short run on the Deck, then
    `docker logs --since 10m hunker-bunker-backend | grep submit-run` → expect `status: 200`.

### Phase 2 — Make stored scores readable

2.1 Confirm the live response shape with the verification command above.
2.2 Fix `normalizeLeaderboardEntries` to read
    `data.leaderboardEntryInformation.leaderboardEntries[]` (`steamID`, `score`,
    `rank`, `detailData`), keeping the old paths as fallbacks. Replace the invented
    fixture in `server/steamLeaderboards.test.js` with a captured real response.
2.3 In `setLeaderboardScore`, treat the call as failed unless
    `data.result.result === 1`; surface the Valve code as `reason`.
2.4 Read `score_changed` from `data.result` for `isNewBestReal`; add a fixture test.
2.5 Resolve display names: batch the returned SteamIDs through
    `ISteamUser/GetPlayerSummaries/v2` (≤100 IDs per call, cache ~10 min) and set
    `persona`. Fall back to the current placeholder on failure.
2.6 Redeploy; run `npm run steam:smoke-leaderboards` against production with a
    session token; confirm your pre-09-15 scores appear on `best_run_score`.

### Phase 3 — Client robustness (next Steam build)

3.1 **Sequence Game Over:** await `submitSteamRunScore`, then render the board
    (with a ~5 s cap so the panel never hangs; fall back to the parallel read).
3.2 **Compute score from one timestamp:** pass `endedAt` into
    `calculateRunScore` instead of calling `Date.now()` inside it; optionally let
    the server tolerate `MAX_SCORE_DELTA = 50` (one time-bonus step) as a belt-and-braces guard.
3.3 **Show submit failures:** set the Game Over status line from the submit
    result (`RUN REJECTED: <reason>` / `LEADERBOARD OFFLINE`) instead of console-only logs.
3.4 **Queue unsent runs** (desktop only): persist rejected-for-network or
    5xx payloads under an `hb_pending_run_submits` key via the existing save
    contract and retry on next launch / next `refreshSteamBridgeStatus`. Do not
    retry 400s. Server idempotency on `runId` (already `hb:<start>:<end>:<class>:<seed>`)
    keeps retries safe — confirm `submit-run` checks idempotency, add it if not.
3.5 Make "SCORE BANKED LOCALLY" true (via 3.4) or change the copy.
3.6 Bump version (patch) and ship the Steam build.

### Phase 4 — Guard against recurrence

4.1 Keep the contract test from 1.2 in CI; any future `schemaVersion` bump must
    update `SUPPORTED_RUN_SCHEMAS` in the same PR.
4.2 Log the validation `errors` array in the `[hb-request]` line for
    `submit-run` 4xx responses, so the next rejection is diagnosable from
    `docker logs` without a repro.
4.3 Add the leaderboard read to the backend health/audit
    (`scripts/audit-steam-backend-env.js`): flag "submits returning 200 but
    board empty" as a warning.

## Acceptance

- A run finished on Steam Deck and one on PC each produce `submit-run` → 200 in
  the backend log and appear on `best_run_score` (and `daily_ops_score` for a
  Daily Ops run) with a real persona name.
- The Game Over panel shows the just-finished run highlighted as `player-self`.
- Contract test fails if client and server schema versions diverge again.

## Files

- `server/leaderboardScoring.js` — schema check (1.1), score tolerance (3.2)
- `server/steamLeaderboards.js` — entry normalizer, Set result check, score_changed, personas (2.2–2.5)
- `server/steamLeaderboards.test.js`, new `server/runPayloadContract.test.js`
- `src/steam/steamEvents.js`, `src/threeGame.js` (`calculateRunScore`), `main.js` (Game Over + submit listener), `src/leaderboardUi.js`
- `electron/preload.cjs` — pending-submit queue hook (3.4)

## Status log

**2026-09-21 — shipped in `5c16fc5` (v2.4.8-beta)**

- Phases 1–4 implemented as planned; full suite 3,605/3,605 green on the commit in isolation, lint clean.
- Backend redeployed (`docker compose up -d --no-deps hunker-bunker-backend`). **Deploy blocker found and fixed:**
  `~/server/compose.yaml` still said `dockerfile: Dockerfile` after `3a193eb` moved it to `deploy/Dockerfile`, so every
  `--build` would have failed; now points at `deploy/Dockerfile` (backup: `compose.yaml.bak-2026-09-21`).
- **Root cause 2 confirmed live:** right after the redeploy the public reads returned the scores that had been on
  Steam all along: 4 players on `best_run_score` / `survival_time_seconds` / `deepest_depth_score`, 1 on `daily_ops_score`,
  with persona names resolved. `fastest_extraction_ms` is empty because no extraction has been submitted yet.
- Already-installed builds (v2.4.7) now submit successfully too, because the server accepts schema v2. They still read the
  board in parallel with the submit, so the new run shows up one Game Over late until the 2.4.8 client ships.
- Steam client upload: built from a clean worktree at `5c16fc5`; upload (`node scripts/steam-release.js --upload
  --skip-build`) runs with your steamcmd login and lands on the private `beta` branch.
