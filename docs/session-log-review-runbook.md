# Hosted Session Log Retrieval and Acceptance Runbook

## Purpose

Session logs are supporting evidence for Steam release acceptance. A capture can
prove that an event occurred on a particular packaged client; it cannot prove an
unlogged visual judgment, controller-only operation, or an acceptance route that
was never completed.

## Capture and upload from the game

1. Launch the Steam-installed packaged build.
2. Open the developer console with `~`.
3. Run `uploadlogs` near the end of the test route and again immediately after
   any failure worth preserving.
4. Capture from every participating client. Record the build ID/SHA, tester,
   account role, device, resolution, mode, room code, and intended route outside
   the log as well.

The client uploads to `HB_STEAM_BACKEND_URL` (normally
`https://steam.tuesdaycinema.club`). Production uploads require the shared
`HB_LOG_UPLOAD_TOKEN`; do not commit that token.

## Retrieve logs

```bash
npm run logs:fetch
npm run logs:fetch -- --latest 5
npm run logs:fetch -- --name <server-filename>
```

Optional environment variables:

- `HB_STEAM_BACKEND_URL`: backend base URL.
- `HB_LOG_UPLOAD_TOKEN`: value sent as `x-hb-log-token` when required.
- `HB_LOG_OUT_DIR`: local destination; defaults to ignored `logs/`.

The listing is newest-first. Multiple uploads with the same `session.startedAt`
are progressive snapshots of one client session, not independent tests. Use the
latest complete snapshot unless an earlier snapshot captures evidence later
overwritten or lost.

## Analyze captures

```bash
npm run logs:analyze -- logs/<capture-a>.json logs/<capture-b>.json
```

The analyzer reports package/platform identity, Steam and controller state,
multiplayer milestones, missing completion signals, final GPU telemetry, long
tasks, and error counts. Its yes/no output means “this signal appears in the
capture,” not “the ticket passes.” Review the original events before citing them.

Useful manual inspection:

```bash
jq '{session,state,entryCount:(.entries|length)}' logs/<capture>.json
jq -r '.entries[] | select(.category=="MULTIPLAYER" or .category=="PHASE") | [.isoTime,.category,.message] | @tsv' logs/<capture>.json
rg -i 'pvp|player-damage|player-death|gameover|extract|reconnect|suspend|resume|Long task' logs/<capture>.json
```

## Ticket-closing standard

Before closing an acceptance ticket:

1. Map every acceptance checkbox to a concrete event, metric, screenshot/video,
   or human observation.
2. Confirm all participating captures are from the same build and test route.
3. Separate co-op evidence from PvP evidence.
4. Do not infer controller-only use from controller presence alone. Steam Input
   may synthesize keyboard/mouse events, and a log cannot prove the tester never
   touched another input device unless the route instrumentation records it.
5. Do not infer suspend/resume, readability, thermals, or visual correctness
   without explicit evidence.
6. For performance, use a fixed route and compare before/after on the same
   hardware/settings. Final-state averages do not erase recorded long stalls.
7. Commit a dated report under `docs/reports/`, comment the evidence on the
   focused issue, update parent #45, and only then close a fully satisfied issue.

## Server implementation

- Client retrieval: `scripts/fetch-session-logs.mjs`
- Summary analyzer: `scripts/analyze-session-logs.mjs`
- Upload/list/download routes: `server/sessionLogs.js`
- Default server storage: `server/session-logs/`, overridden by
  `HB_SESSION_LOG_DIR`

Hosted captures can be deleted or rotated independently of git. Durable
acceptance conclusions belong in a compact report; do not commit 40–70 MB raw
captures unless the repository policy explicitly changes.

