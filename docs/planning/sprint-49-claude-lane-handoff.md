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

Second round (same probe):
- `a9c8613b`: when a modal closed, Chromium re-fired `pointerover` on whatever sat under
  the unmoved mouse, and hover sync stole controller focus. Traced: hub close →
  `fabrication-btn`, then hover → `char-card`. Hover-to-focus is skipped while the
  controller is the active input; real movement already switches the mode back.
- `f4a61dfa`: one Back from the Content Guide closed the guide **and** Settings. The
  Escape switch fell through to "close Settings", then the fallback closed the guide.
  The Settings branch now closes only the surface above it.
- `controller-focus.spec.js`'s title-order test predated MULTIPLAYER; updated.

S49-11 / S49-06:
- `251c6864`: the Content Guide reader shows each dialogue scene's still above its
  text, as the game plays it (18 stills, all present).
- `7f0e6f1d`: commentary entries rewritten as dated, checkable development history.
  **Still English-only:** localizing them means adding 12 strings to all 7 locale
  files, which the chat lane is actively editing.

Not bugs (probe assumptions corrected): with the hub on, Vault and Foundry both open
`#foundry-hub-modal`, not `#steam-vault-modal`. The Store tab appears only when
purchases are available. Commentary READ ALL is under the AUDIO tab.

Already fixed in 2.4.13 (from the QA logs): a cooldown-blocked shot no longer plays
`ui_error`, and the reload-blocked buzz is throttled.

### Round 3: last probe findings, commentary in seven languages

- `ae1dd80c`: closing the Content Guide's dialogue reader left focus on nothing (it
  had only seemed to work because stationary-mouse hover happened to refocus the
  guide). The reader returns focus to the button that opened it. Its close button
  no longer overflows `.close-modal`'s fixed square.
- `3c68c914`: `COMMENTARY_ENTRIES` is a `localizeCatalog('narrative.commentary')` catalog
  with all 12 entries in seven locales. Verified in the browser with locale `ja`.
  The "commentary on" card now names the real route: Settings > Audio > Developer
  Commentary > Read All.
- `7e31a8e9`: the probe also walks Archive, Codex and Dossier.

**Probe coverage now:** Vault and Foundry hub (every tab), Content Guide (reach under
ACCESSIBILITY, reader, scroll, back ×2), commentary READ ALL, multiplayer console,
Armory slot picker, Archive, Codex, Dossier, Title Quit confirm, and in-run pause →
abort → results. All by `gamepad-menu-nav` only.

- `0869c05f` → **reverted in `062ab937`.** It ignored a `pointerover` at the last
  `pointermove` position, to stop a still mouse pulling focus off a closing popup's
  trigger (`controller-focus` "settings menu crosshair color…", which also fails on
  `95ff7285`). It broke `steam-review-2026-09` "a controller reaches and scrolls every
  achievement": the D-pad stalls on card 20 of 23. Bisected: passes on `7e31a8e9`,
  fails on `0869c05f`, passes with the revert. **Open:** why the hover guard affects
  D-pad scrolling. Real `pointerover` events arrive at the still mouse position
  (1100.8, 590.4) as the grid scrolls under it. Fix the crosshair case without
  touching that path, and run the achievements probe before committing.

**Last full verification (2026-10-01):**
- `npx vitest run`: 525 files, 4,589 tests passing.
- `controller-journey.spec.js` (all 15) + `steam-review-2026-09.spec.js` (4/4) +
  `controller-focus.spec.js`: 37/38 in one run. The one miss was a dropdown-picker
  test that is flaky under load; it and the other settings-popup tests then passed
  12/12 in a repeat run.

### 2026-10-01 midday: P1/P2 status audit and new claims

[sprint-49-status-audit-2026-10-01.md](sprint-49-status-audit-2026-10-01.md) records the
implementation state of S49-15 to S49-38 at `ba9298df`. S49-01 to S49-14 are tracked in
`sprint-49.md` by the other lane, which was editing that file at the time. This lane did
not touch it.

**Claimed, then done:**
- `583ab298` **S49-19:** Bio-Vampiric Membrane now promises only O₂ and a heart on a
  corroded bio kill (it said "suit battery", which doesn't exist); 7 locales; a test
  pins the four inert drops out of rewards.
- `2e2178c7` **S49-31:** lossless WebP textures for ten GLBs, −24.8 MiB, renders
  pixel-identical (headless three.js compare). Retail budget 2780→2755 MiB. Meshopt was
  rejected (it changed up to 40,788 rendered pixels). **Finding:** `bio_charger`,
  `chassis_scout_ghost_runner` and the three corrupted bosses are byte-identical copies
  of existing models (placeholders), now visible in the report's 12 duplicate groups.
  That belongs to S49-37 (art).
- `43513578` **S49-31:** each deploy stage holds a `startup:<stage>` perf phase. Locally,
  the render (shader warm-up) stage dominates. The QA doc's "PC waited for the Deck"
  reading is corrected: it was a main-thread block.

Render-compare tool for future asset work: lives in the session scratchpad
(`render-compare.mjs`). It renders two GLBs with the game's three.js in headless Chrome
and diffs the pixels; recreate it from the `2e2178c7` commit message if needed.

### 2026-10-01 afternoon: claim, ingest the 19 incoming models

**Claimed by this lane:** turning the 19 owner-supplied models in
`art/raw/incoming_3d_20261001/` into runtime GLBs and wiring them in (see the
[rigging and placement plan](3d-asset-pipeline-rigging-and-placement-plan-2026-10-01.md)).
That covers Y-up and pivot normalization, texture budget, the weapon and reward
mappings, prop replacements, and rigs for the stalker, cryosnail, corrupted Kaelen
and Ghost Runner. **Not claimed:** the wall-backed placement seams
(`roomPopulation.js`, `syncWorld3dReplacement` wallNormal), which another
contributor has in progress.

### 2026-10-01 13:35: static models landed elsewhere; this lane takes the animated five

The 11 static incoming models landed in `3039e4df` (another contributor's
decimated 1024/512 JPEG versions; this lane's full-quality 2048 WebP alternative
was not committed, and the owner was shown a side-by-side). **This lane now owns
the five animated/remaining models:** `Regular Cryosnail` (decimate, no rig:
snails slide), `Corrupted Engineer Kaelen Boss` and `5001 Ghost Runner` female and
male (Mixamo skeleton via weight transfer from rigged references), and
`Mycelium Stalker Quadruped` (procedural quadruped rig and clips). Please don't
process these five in parallel.

## Next

1. **Publisher/hardware (not code):** a Deck and pad pass with the keyboard unplugged
   over the same route the probe walks; an installed-build check of commentary, the
   Content Guide (Settings > Accessibility) and its cinematics; a backend redeploy so
   the relay build gate takes effect; a two-account co-op re-test on **matched**
   builds (down → revive, abort → TRY AGAIN → partner death).
2. **Code, open in this lane:** the LB+RB+R3 gallery shortcut still reads only the browser gamepad API (Settings is the
   controller route); QA-log items still open: deploy-wait phase attribution, guest O2
   near the bunker, the 3,250 depth XP grant.
3. **Not this lane:** chat (S49-02/03/04), store/settlement (S49-07/08). See the other
   worklog.
