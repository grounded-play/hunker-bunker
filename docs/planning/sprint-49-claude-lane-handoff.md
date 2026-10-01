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

### In progress: S49-10 controller journey probe

`tests/e2e/probes/controller-journey.spec.js` drives the Vault, Foundry, Content Guide
(transcript scroll), commentary list, multiplayer console, and in-run pause → abort →
results using only `gamepad-menu-nav` events after boot. Run it with
`HB_PROBES=1` against a dev server with HMR off (other contributors' edits reload a
watched server mid-test); see the dev-server recipe in the e2e notes.

## Next

1. **S49-11 (optional):** show each node's `interstitial` still in the reader.
2. **S49-10:** extend `tests/e2e/probes/steam-review-2026-09.spec.js` (or a sibling
   probe) to walk title → character → Armory → Foundry → Vault → settings →
   achievements → commentary → Content Guide → multiplayer → pause → results by
   controller only. Record each failure here before fixing it.
3. **S49-06:** audit commentary entries for concrete development insight.
