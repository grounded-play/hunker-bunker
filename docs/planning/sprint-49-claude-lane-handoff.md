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

## Next

1. **S49-11:** read `src/matureContentAudit.js`, the Content Guide reader and
   `src/npcDialogueTrees.js`. Write a parity test asserting that every intimacy and
   self-sacrifice node in the trees appears in the guide, and that every guide entry
   names a real in-game source. Fix the gaps.
2. **S49-10:** extend `tests/e2e/probes/steam-review-2026-09.spec.js` (or a sibling
   probe) to walk title → character → Armory → Foundry → Vault → settings →
   achievements → commentary → Content Guide → multiplayer → pause → results by
   controller only. Record each failure here before fixing it.
3. **S49-06:** audit commentary entries for concrete development insight.
