# Release PR: v2.4.14-beta — Filtered Chat, Commentary & Controller Follow-through, Purchase Reconciliation, Co-op Fixes

**Target Branch:** `mothership` ← **Source Branch:** `dev/sprint-49`

---

## 🎯 Summary & Tickets

The first Sprint 49 slice continues the Steam build review **25475189** work and fixes what the 2026-09-30 Deck + PC co-op playtest found:

- **Filtered player chat (S49-02/03/04):** authenticated room chat through the relay, a seven-language baseline filter, and a chat UI with mute, block, report and controller text entry.
- **Developer commentary (S49-06):** entries rewritten as real, dated development history, in all seven languages.
- **Controller (S49-10):** a pad-only journey probe walks every review screen. It found six focus bugs, all fixed.
- **Mature content (S49-11):** the Content Guide moves under Settings → Accessibility, shows each scene's artwork, and its cinematics play in the packaged build.
- **Purchases (S49-07/08):**
  - an authoritative store catalog;
  - `GetReport` reconciliation that pages completely, resumes after restarts and never reports false success;
  - the real Inventory `AddItem` contract;
  - idempotent paid-grant retries.
- **Co-op:**
  - enemies attacking a squadmate no longer damage you;
  - the relay locks a lobby to its host's build.
- **Release tooling:** the backend image includes everything the server imports, a test now guards that, and a stray OST symlink that blocked `steam:upload` is removed.

Release notes: [`docs/releases/v2.4.14-beta.md`](v2.4.14-beta.md).

### 📋 Tickets

No ticket is closed by this PR. Each needs hardware, two real Steam accounts, a real purchase, or human language review.

Refs #85, #77, #53, #51, #52, #45

| Ticket | In this PR | Still needed |
| :--- | :--- | :--- |
| #85 Two-account co-op expedition | Squadmate-target damage fix and relay build gate (`1334b1e1`); playtest analysis in [`qa-2026-09-30-deck-pc-coop-session.md`](../planning/qa-2026-09-30-deck-pc-coop-session.md) | A two-account session on the **same** build (QA §2) |
| #53 Deck controller-only acceptance | Pad-only journey probe (15 surfaces) and six focus fixes | The same route on a physical Deck (QA §1) |
| #51 PvP certification | Chat works in PvP rooms (one channel, readable by opponents) | Two-account PvP run |
| #52 GPU / frame pacing | Draw-call and triangle telemetry now cover the whole frame (`35cdecc5`) | Profiling with the corrected counters |
| #45, #77 | Umbrellas | Close with the above |

---

## 📜 Commit Ledger (Sprint 49, `95ff7285..dev/sprint-49`)

**Chat (S49-02/03/04)**
- `e8cc0a16` feat(chat): authenticated room chat relay and 7-language baseline lexical filter
- `82501e4f` feat(chat): localized room chat UI and controller-safe player flow

**Steam review follow-through (S49-06/10/11)**
- `0b0a8d83` fix(mature-content): reviewer cinematics play in the Steam build; guide letters cannot drift
- `f940f01a` fix(review): export `LORE_LOGS`; reviewer log parity and cutscene resolution tests
- `a73f5a06` fix(settings): the Content Guide sits under Accessibility, not stranded in Controls
- `228936b8` fix(controller): the Content Guide owns the pad when opened over Settings
- `e12b4beb` fix(controller): closing the Foundry hub hands focus back to its opener
- `a9c8613b` fix(controller): a stationary mouse no longer steals controller focus when a modal closes
- `f4a61dfa` fix(controller): Back from the Content Guide returns to Settings instead of closing both
- `251c6864` feat(mature-content): the Content Guide reader shows each scene's still
- `ae1dd80c` fix(mature-content): closing the reader returns focus to the guide; readable close button
- `0869c05f` fix(controller): a popup closing under a still mouse no longer pulls focus off its trigger
- `7f0e6f1d` feat(commentary): entries tell real development history, not slogans
- `3c68c914` feat(commentary): developer commentary in all seven languages
- `0e7bba0c`, `82b04e7b`, `7e31a8e9` test(controller): the controller-only journey probe and its coverage

**Purchases (S49-07/08)**
- `58b115d7` feat(store): authoritative store catalog adapter, price formatting, Vault reconciliation
- `07f86986` fix(steam): reject false-positive purchase reconciliation
- `6d871747` feat(steam): persist report evidence and resume complete reconciliation scans
- `063db076` fix(steam): validate inventory grants against the AddItem contract
- `c7f0cf8c` fix(steam): make paid grant retries durable and idempotent

**Co-op, world, audio, telemetry**
- `1334b1e1` fix(coop): enemies on a squadmate stop hurting you; a room is locked to its host's build
- `b388698f` fix(biome): the player's sector changes only once clearly across a line
- `35cdecc5` fix(telemetry): draw calls and triangles cover the whole frame, not the last pass
- `5e3510ca` feat(audio): trigger all OST tracks and wire subtle enemy movement and noise SFX
- `63fcc797` fix(enemy3d): rotate sporesnail 180° to face along its movement

**Deploy and release**
- `7783278f` fix(deploy): the backend image includes the chat filter the server imports
- `35797620` fix(release): remove a stray OST symlink that blocked the Steam upload
- (this PR's head) release: v2.4.14-beta

**Documentation**
- `5270a90a` docs(sprint-49): complete doc audit and reconcile active sprint pointers (S49-01)
- `a5c491c7`, `0c2443b5`, `7fdce110`, `5dafa525`, `a38384de` docs(sprint-49): Claude lane handoff and logs

---

## 🔬 System Ownership & Runtime Wiring

| System | Canonical owner | Runtime consumer | Persistence | Verification |
| :--- | :--- | :--- | :--- | :--- |
| **Player chat** | `server/chatPolicy.js` + `server/relay.js` (`sendChat`, `chatModeration`) | `src/playerChat.js`, `src/playerChatUi.js` (lobby, HUD, Settings) | Relay memory only (history, mutes, reports) | `server/chatPolicy.test.js`, `server/relayChat.test.js`, `tests/e2e/player-chat.spec.js` |
| **Chat filter** | `src/chatFilter.js`, `src/data/chatFilterTerms.js` | Relay (sender side) and client (recipient side) | — | `src/chatFilter.test.js` |
| **Relay build gate** | `server/relay.js` (`roomBuildVersions`) | `src/multiplayerLobby.js` (`getLocalBuildVersion`, `describeJoinRejection`) | Relay memory | `server/relayBuildVersionGate.test.js`, `src/multiplayerLobby.buildGate.test.js` |
| **Controller focus roots** | `MENU_FOCUS_ROOT_IDS` (`src/inputActions.js`) | `getControllerFocusRoot` (`main.js`) | — | `src/inputActions.test.js`, probe `controller-journey.spec.js` |
| **Commentary** | `COMMENTARY_ENTRIES` (`main.js`, `localizeCatalog('narrative.commentary')`) | Menu/HUD cards; Settings → Audio → READ ALL | `hunker_commentary_enabled` | probe `steam-review-2026-09.spec.js` |
| **Content Guide** | `src/matureContentAudit.js` (`buildDialogueReaderBlocks`, `endingCutsceneSources`) | Settings → Accessibility → Content Guide; F9 | — | `src/matureContentAudit.test.js`, probes |
| **Store catalog** | `src/steamStoreCatalog.js` | Vault Store tab | — | `src/steamStoreCatalog.test.js` |
| **`GetReport` reconciliation** | `server/steamMicroTxnReport.js`, `server/steamMicroTxnScan.js` | 6 h timer; `server/scripts/microtxn-report.js` | `microtxn_checkpoints` (SQLite/JSON) | `server/steamMicroTxn*.test.js`, `server/db.microTxnCheckpoint.test.js` |
| **Paid grants** | `server/steamStore.js`, `server/steamGrant.js`, `server/purchaseGrantIntent.js` | Finalize / retry | Purchase records with grant intent | `server/steamGrant.test.js`, `server/db.purchaseGrant.test.js`, `server/steamMicroTxnRecovery.test.js` |
| **Backend image** | `deploy/Dockerfile` | `~/server/compose.yaml`, `~/server/deploy-backend.sh` | Volume `hunker-bunker-data` | `server/deployImageContents.test.js` |

---

## 🏆 Evidence Reached & Automated Gates Passed

- [x] **Designed:**
  - [Sprint 49 plan](../planning/sprint-49.md);
  - [co-op playtest analysis](../planning/qa-2026-09-30-deck-pc-coop-session.md);
  - [implementation handoff](../planning/sprint-49-implementation-handoff.md) and [Claude lane handoff](../planning/sprint-49-claude-lane-handoff.md).
- [x] **Coded and connected:** every system above is wired into the runtime.
- [x] **Tested:** 4,677 tests across 531 files, plus the browser probes listed under Automated Checks.
- [x] **Live-verified:**
  - the local development build and `vite build`;
  - the trusted backend runs this release's server code (`7783278f`), smoke-tested before the swap: health, relay build gate, and chat delivery with filtering.
- **Packaged-verified:** pending. Run the QA below on the Steam `beta` branch build.
- **Accepted:** pending.

### Automated Checks
- `npx eslint .`: 0 errors.
- `npx vitest run`: 4,677 passed (531 files).
- `npm run i18n:audit`: markup and runtime unchanged; orphans −1.
- `npm run audit:docs`: passing.
- `npm run presubmit:generated`: passing (soundtrack 43 tracks; retail assets regenerated for 14 new enemy sounds).
- `vite build`: ok.
- Browser probes on a no-HMR dev server: `controller-journey` 15/15, `steam-review-2026-09` 4/4, `player-chat` passing.

---

## 🎮 QA Instructions (packaged build on the Steam `beta` branch)

Build from a clean worktree of `dev/sprint-49`:
`HB_STEAM_BACKEND_URL=https://steam.tuesdaycinema.club npm run steam:upload`.
**Put every test machine on the `beta` branch first.** On 2026-09-30 the Deck was on 2.4.9, which explained most of the co-op problems. Export the session log after each section.

### 1. Controller-only (keyboard unplugged; Deck and a PC pad) — Refs #53
1. Title → MULTIPLAYER → back; Quit → Back cancels.
2. Operator menu → Steam Vault and Fab Bay: every hub tab, then Back returns to the button.
3. Archive, Codex, Dossier: open, browse, Back returns to the button.
4. Settings → Accessibility → Content Guide → Sister Val: the reader shows stills; D-pad scrolls; Back returns to the guide, Back again to Settings.
5. Settings → Audio → Developer Commentary → Read All: scrolls; Back returns to Settings.
6. Armory slot picker: browse, Back returns to the slot.
7. In run: pause → Abort → results, all by pad.

### 2. Two-account co-op on the same build — Refs #85
1. Host on PC, join from the Deck's lobby list. Both show `2.4.14-beta`.
2. Let one player be downed far from the other. The other player's hearts must not drop from enemies attacking the downed body.
3. Revive; then abort + TRY AGAIN on one side, and let the other die. It must not be an instant squad wipe.
4. Optional: join from a 2.4.13 client. It must be refused with a toast naming both builds.

### 3. Chat (two accounts)
1. Send from the lobby and in the mission; both see it; profanity is masked.
2. Mute and block, then undo each; report a message.
3. On the Deck: open chat, type with the on-screen keyboard, send, close. Focus must return to where it was.
4. Switch the language and confirm the chat UI is translated.

### 4. Commentary and Content Guide
1. Turn commentary on: the card names Settings → Audio → Developer Commentary → Read All.
2. Switch to a non-English language: entries are translated.
3. Content Guide → VIEW CINEMATIC (Full Brood) plays video in the packaged build.

### 5. Store (publisher only; no real purchase is authorized by this PR)
1. Vault → Store shows quantities and prices from the catalog; the Item Store link shows Steam's own currency total.
2. If a sandbox purchase is run, `node server/scripts/microtxn-report.js` shows it reconciled, not `paidNotGranted`.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
