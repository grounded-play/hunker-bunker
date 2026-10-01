# Sprint 49 implementation handoff

Status: active worklog | Owner: repository maintainers | Updated: 2026-10-01 | Review: every commit

Canonical scope: [Sprint 49](sprint-49.md). Branch: `dev/sprint-49`; starting HEAD
`95ff7285`, package `2.4.13-beta`. The owner explicitly confirmed Sprint 49 after
an initial Sprint 40 typo. Implement and commit incrementally; record the next
action here before yielding so another contributor can resume without the chat.

## Current checkpoint

Documentation reconciliation, store catalog normalization and the chat relay/filter
are committed. Chat client/UI and browser evidence landed in `82501e4f`. The next
checkpoint fixes report-classification false successes (S49-08 slice 1).
Read the [parallel contributor's log](sprint-49-claude-lane-handoff.md) before
touching shared files. That lane owns mature-content, commentary and controller
journey work; do not duplicate its pending changes.

Next implementation commits:

1. S49-08: finish settlement/grant recovery and report pagination. Classification
   false successes are fixed below. Still pending: durable cursor/evidence storage,
   complete Steam and local-ledger pagination, idempotent grants and reversal
   disposition. Add failure tests first; no real purchase or publisher operation
   is authorized by this code work.
2. S49-02/04: extend chat evidence to deployed co-op/PvP and disconnect/reconnect
   with two authenticated Steam accounts; perform the physical Deck/PC controller
   pass. These acceptance checks cannot be replaced by local test-mode sockets.
3. S49-03/32: native-speaker review of lexical coverage and false positives;
   designate moderation ownership and implement durable report ingestion/access
   before representing the temporary queue as a staffed reporting service.
4. S49-13/14/21: field workbench integration, controller pings, explicit safe Queen
   communion; coordinate with any ongoing changes to `threeGame.js` first.

## File ownership during this cycle

- Primary: documentation, new chat client/style, `main.js`, `src/multiplayerLobby.js`,
  UI locale additions and browser integration tests.
- Chat backend lane: `server/relay.js`, new chat policy and socket tests.
- Filtering lane: `src/chatFilter.js`, `src/data/chatFilterTerms.js`, filter tests.
- Store lane: `src/steamVaultUi.js`, catalog adapter, hosted-store tests.

Pre-existing user/other-contributor changes at entry: `src/enemy3dOverlay.js`, its
test, `src/threeGame.js`, `src/threeGame.remoteTargetDamage.test.js` and
`docs/planning/qa-2026-09-30-deck-pc-coop-session.md`. These are not owned by this
implementation cycle. Stage explicit paths; never commit unrelated changes.

## Verification and completion rules

Record exact commands and results below as they run. Unchecked Sprint 49 tickets
stay open until their whole acceptance condition is met. A local chat suite cannot
close seven-language human acceptance, physical-controller or Steam review gates.
Real purchase, production flags, deployments and Steam resubmission remain publisher
steps; no authority for those actions is inferred from implementing code.

## Commit log

### Documentation checkpoint — 2026-10-01

`5270a90a`: active plan/index pointers, audit findings and mechanical inventory;
four disabled drop effects are tracked in the canonical plan. The inventory scan
covered 507 documents / 409 enforced Markdown files, with 407 historical link
warnings and no current errors at that checkpoint. Regenerate after document edits.

### Parallel implementation checkpoints

- `58b115d7`: authoritative catalog adapter, quantity/price formatting, Vault
  reconciliation. S49-07 is not fully accepted until live catalog/currency proof.
- `f940f01a`, `0b0a8d83`: mature-content guide parity and packaged cinematic URLs
  (see the parallel contributor's log for remaining installed-build evidence).
- `e8cc0a16`: room-authorized relay chat and seven-language lexical baseline.
  Initial socket/filter/store verification here: 3 files / 69 tests passed.

### Chat player experience checkpoint — 2026-10-01

Commit: `82501e4f`. Implementation: [transport model](../../src/playerChat.js),
[UI](../../src/playerChatUi.js), [styles](../../src/playerChat.css), seven locale
catalogs, lobby socket binding, HUD/lobby/Settings entry points, and controller
focus-root registration. Keyboard overlays stack above Chat, which stacks above
Settings. Existing gameplay modal gating blocks combat input; open/close clears
held input without overriding another overlay's input lock.

- Both modes use **one room channel**, shared between lobby and mission, readable
  by PvP opponents; the panel states this and warns that the world keeps running.
- Plain-text recipient filtering, 50-message history, timestamps, unread preference,
  quick-message drafts, explicit send errors, stable retry nonce, and room-change
  draft cleanup. No conversation text is persisted locally or added to telemetry.
- Mute (one-way), block (both ways), undo and reasoned reports use relay state.
  Reports are currently filtered evidence in relay memory: at most 100 / 24 hours,
  lost on restart. `io.getChatReports()` is trusted backend access, **not** a
  publisher dashboard or staffed moderation workflow. UI makes this limitation
  explicit. Mutes/blocks are relay-session state, bounded to 2,048 identities;
  real Steam identities survive reconnect while the relay retains that state.
- Filter coverage is a curated baseline, not a guarantee of catching all harmful
  language. Unsupported letter scripts/control characters fail closed; the seven
  game languages are supported. Human linguistic acceptance remains required.

Verification before final commit:

- Targeted transport/filter/relay/input suite: 4 files / 135 tests passed;
  additional policy boundary tests added afterward (final result recorded below).
- `npx playwright test tests/e2e/player-chat.spec.js --retries=0`: first two
  harness tests passed (10.7 s), proving actual browser → local relay → peer,
  filtering/HTML safety, third-room isolation, report/mute/undo, unread state,
  IME, seven locale titles, room draft cleanup and focus restoration.
- Full-game test run separately with `--grep 'game Settings'`: passed (25.6 s),
  exercising the real lobby connector/singleton UI, Settings entry, send, fallback
  controller keyboard stacking, Back and parent focus restoration.
- Browser skill visual check: initial full-renderer session stalled after title;
  isolated UI had no reported errors, and the subsequent full-game Playwright
  run passed. This is not physical-controller or deployed-match certification.
- Scoped ESLint passed; `npm run i18n:audit`: 0 unannotated static strings,
  0 unlocalized runtime strings; orphan count improved 54 → 53.

Final checks: targeted suite **5 files / 144 tests passed**; full `npx vitest run`
**524 files / 4,566 tests passed** (includes concurrent contributor tests).
`npm run build` and the 50-asset media audit passed; Vite retains its large-chunk
warning. Documentation audit passed (507 documents / 409 enforced Markdown files;
407 historical warnings), and `git diff --check` passed. S49-01 is now checked.

Next at this checkpoint: S49-08 settlement recovery. Do not stage
another contributor's controller probe, biome changes or `src/playerChatUi.test.js`
(a concurrent mock-DOM test, not authored by this lane). Keep S49-02/03/04 unchecked
until their full acceptance gates pass.

### S49-08 slice 1 — reconciliation must not report false success

Changed [report classifier](../../server/steamMicroTxnReport.js) and
[regression tests](../../server/steamMicroTxnReport.test.js):

- A finalized payment with a pending inventory grant is now `paidNotGranted`.
- Completed local purchases absent from the fetched report make `ok: false`.
  Absence is an investigation signal, **not** proof of nonpayment or authority
  to revoke anything; the current single-page scan can be incomplete.
- Order IDs and transaction IDs have separate lookup namespaces. Conflicting
  identifiers/account ownership, unknown Steam states, and inventory grants
  without settled payment are surfaced as `needsReview`, never a clean match.
- Existing grant receipts/completion events remain evidence after QueryTxn
  changes the current ledger status, so refunds cannot hide behind `reversed`.
  Mock purchases are excluded from real-money grant evidence.
- Invalid comparison windows fail explicitly. Timer warnings now include missing
  report rows and review-required discrepancies instead of omitting them.

Evidence: six new regression cases failed against the prior implementation.
After the fix, `npx vitest run server/steamMicroTxnReport.test.js
server/steamStore.test.js server/db-sqlite.test.js` passed **3 files / 32 tests**;
scoped ESLint passed. This slice only classifies evidence: it does not mutate
purchase/inventory state, contact live Steam, charge, refund or grant anything.

Next safe implementation: complete report enumeration with fixtures for short
pages, overlaps, unchanged timestamps, transient errors and interrupted restarts.
Use Steam's update `time` as the next boundary; a short page is not completion.
See [official GetReport v5 contract](https://partner.steamgames.com/doc/webapi/ISteamMicroTxn#GetReport).
The runtime currently requests `listPurchases({ limit: 5000 })`, but both DB
adapters **clamp to 1,000**: the local ledger also needs explicit pagination.
Persist cursor/evidence only after safe processing; do not skip unresolved grants.
Then make `fulfillPurchasedKeys` idempotent across concurrent finalize calls and
crash-after-grant/before-ledger-write. Reversal handling must retain item-level
evidence and an explicit review/revocation disposition. S49-08 remains unchecked.
