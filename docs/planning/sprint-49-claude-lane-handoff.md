# Sprint 49: Claude lane handoff

Status: active worklog | Owner: Claude (code) | Updated: 2026-10-01 | Review: every commit

Canonical scope: [Sprint 49](sprint-49.md). The other active contributor's worklog is
[sprint-49-implementation-handoff.md](sprint-49-implementation-handoff.md). Read both
before starting. This lane takes only the Steam-review tickets that log does **not**
claim, and records the next step here before every commit so another contributor
can pick it up mid-stream.

## Lane boundary

**Claimed by the other contributor, not touched here:** S49-01 (docs), S49-02/03/04
(chat transport, filter, chat UI), S49-07 (store SKUs), S49-08 (settlement),
S49-13/14/21. Their primary files are `main.js`, `src/multiplayerLobby.js`,
relay chat in `server/relay.js`, `src/steamVaultUi.js`, `src/chatFilter.js` and the
docs indexes. `src/enemy3dOverlay.js` and its test belong to a third contributor.

**This lane:**

| Ticket | Code scope here | Not in scope (publisher/hardware) |
|---|---|---|
| S49-11 mature content | Content Guide ↔ dialogue-tree parity for every intimacy branch (Val, Kaelen, Aria, Nahl); suicide/self-sacrifice entries trace to real in-game sources; reader cannot mutate progression | Content Survey edits |
| S49-10 controller journey | A controller probe that walks every menu the review lists; fixes for any screen that strands focus, **outside** `main.js` where possible | Physical Deck / pad pass |
| S49-06 commentary | Entry content and data-side fixes; controller scroll and saved toggle checks. `main.js` edits only after coordinating | Installed-build check |
| S49-05 online | Co-op/PvP correctness found in logs (see [QA 2026-09-30](qa-2026-09-30-deck-pc-coop-session.md)) | Two-account Steam runs |

Touching `main.js` or the locale files: keep edits small, stage explicit paths, and
re-read the other worklog first. Both contributors share one working tree.

## Commit log

### `1334b1e1`: co-op fixes from the 2026-09-30 logs (before this lane was claimed)

- Enemies attacking a remote squadmate no longer damage or slow the local player;
  downed squadmates are not snail targets.
- Relay build gate: joins carry `buildVersion`, and the relay rejects a guest whose
  build differs from the host's (`build_mismatch`, a 7-locale toast that names both
  builds). This touched `server/relay.js` and `src/multiplayerLobby.js`
  (`getLocalBuildVersion`, `describeJoinRejection`, join payload) before the other
  lane's claim was visible. It does not touch chat.
- Needs a backend redeploy to take effect.
- Verification: `npx vitest run` 517 files / 4,471 tests passing.

### S49-11 slice 1: Content Guide parity and the packaged cinematic path

Audit (no change needed):
- All five intimacy trees (Val, Briggs, Kaelen, Aria, Nahl) are in the guide.
- Choices are the only way to move between nodes, so the guide's transcript holds
  every reachable node, built from the same data as the game.
- All 15 side-story `dialogueNode`s exist in the trees.
- Camp leader lines (`src/data/campDialogue.js`) are restrained, not sexual.
- The reader never calls the dialogue manager, so it cannot change bond, perks or
  progression.

Fixed:
- **VIEW CINEMATIC / VIEW ENDING showed text instead of the video in the Steam
  build.** `/cutscenes/…` was set without `assetUrl()`, and under `file://` that
  points at the drive root. The new `endingCutsceneSources()` is used by both the
  Content Guide and the progression walkthrough.
- **Log-letter drift guard.** The guide's C11/B03 letters are hand copies;
  `LORE_LOGS` is now exported, and a test asserts the copies match word for word.

Verification: `npx vitest run` 4,537 passed. The 2 failures are in the other
lane's uncommitted `src/chatFilter.test.js`.

Still open for S49-11: reviewer-route evidence on the installed build (publisher).
The reader shows dialogue as text only. The in-game route also shows each node's
`interstitial` still, so consider adding stills to the reader.

### Note on `f940f01a`

That commit (made by another contributor's sweep) contains this lane's
`src/matureContentAudit.test.js` edits and the `LORE_LOGS` export. `0b0a8d83` holds
the code they test. The two are correct together. Commit promptly: untracked or
modified files in the shared tree can be swept into someone else's commit.

### S49-10: controller journey probe and what it found

`tests/e2e/probes/controller-journey.spec.js` drives the Vault/Foundry hub, Content
Guide (transcript scroll), commentary list, multiplayer console, and in-run pause →
abort → results using only `gamepad-menu-nav` events after boot. It reaches targets by
raster scan, so a failure means the D-pad truly cannot get there. Run with
`HB_PROBES=1` against a dev server with HMR **and** file watching off (other
contributors' edits otherwise reload the page mid-test). Restart that server after
every source edit, or it serves stale modules. Kill it by port PID, never `pkill -f`
(the pattern matches your own shell).

Fixed from its findings:
- `a73f5a06`: the Content Guide row was stranded under the CONTROLS tab (the Gore toggle
  beside it had moved to ACCESSIBILITY). It now sits under ACCESSIBILITY, and the
  reviewer access text names the tab.
- `228936b8`: the Content Guide opened from Settings drew on top, but the D-pad drove
  Settings behind it. `getControllerFocusRoot` takes the first open root in
  `MENU_FOCUS_ROOT_IDS`, and `settings-popup` came first. A test pins every
  Settings-launched surface ahead of it.
- `e12b4beb`: closing the Foundry hub left focus on a bare `<div>`; the hub now returns
  focus to its opener.
- `35cdecc5` (S49-31 telemetry, from the QA logs): draw calls and triangles cover the
  whole frame. `b388698f`: biome hysteresis.

Not bugs (probe assumptions corrected): with the hub on, Vault and Foundry both open
`#foundry-hub-modal`, not `#steam-vault-modal`. The Store tab appears only when
purchases are available. Commentary READ ALL is under the AUDIO tab.

Already fixed in 2.4.13 (from the QA logs): a cooldown-blocked shot no longer plays
`ui_error`, and the reload-blocked buzz is throttled.

## Next

1. **S49-10:** get `controller-journey.spec.js` fully green and fix whatever else it
   finds (multiplayer back-out focus, in-run pause/abort/results).
2. **S49-06:** audit commentary entries (`COMMENTARY_ENTRIES` in `main.js`) for
   concrete development insight. `main.js` is the other lane's primary file, so
   keep the edit to that block.
3. **S49-11 (optional):** show each node's `interstitial` still in the reader.
