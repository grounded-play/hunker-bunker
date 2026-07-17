# Sprint 19 Work Brief — Gemini: Legibility Layer & Boarding Climax

Derived from [sprint-19-next-work.md](sprint-19-next-work.md) §1 and §2.
Sibling briefs: [Codex — Run Director](sprint-19-work-codex.md),
[Claude — Physicality](sprint-19-work-claude.md).

## Mission

Make the consequence engine visible, then make boarding feel like the climax.
The game already knows the answer; the player does not. Nothing in this lane
adds state — it surfaces state that `act2.js` already computes.

## Why Gemini

This lane matches the Antigravity implementation plan already drafted
("Sprint 19 Legibility & Boarding Climax"): Queen's Ledger HUD widget,
Manifest Forecast overlay, consequence labels on choice modals. This brief
confirms that plan and answers its open questions.

### Answers to the plan's open questions

1. **Vector visibility:** keep it obscured — show `VECTOR: UNSTABLE` until
   the dish phase completes, then reveal the family name. Hidden state must be
   earned into visibility, and this gives the dish milestone a felt reward.
2. **Color accents:** approved — cyan for humanity/human-positive, green/amber
   for obedience/infection matches the existing HUD language. Keep red
   reserved for damage and hostility.

## Deliverables

### 1. Queen's Ledger HUD chip (~2d)

- One post-reveal line, e.g. `♛ OBEDIENCE −1 · SEATS 3/4 · VECTOR: OUTED
  ESCAPE`, updating live as choices land.
- Data comes from `getEndingVector()` / `buildAct2Manifest()` in `act2.js` —
  pure reads, no new state.
- Done when a playtester can say "if I warn Tallow my vector flips" while
  watching the chip.

### 2. Consequence lines on modal options (~1d)

- Every camp/hive modal option shows *what changes now / what it means at
  launch* before confirmation.
- Done when no choice depends on hidden state alone.

### 3. Manifest Forecast at boarding (~2d)

- Four-slot seat diagram (queen two seats wide), eligibility with reasons,
  per-variant ending family preview.
- Reuse `buildAct2Manifest` verbatim — do not duplicate seat logic in the UI.
- Done when the player sees the seat problem before the launch click, and
  every blocked launch names its reason in plain language.

### 4. Run summary card (~1d)

- At death or departure: what you built, what you broke, what it cost, and
  which ending family you earned and why.
- Done when the player can explain the run in one sentence.

### 5. Boarding climax framing

- A dedicated boarding surface (terminal or vessel object shell is fine at
  this stage) so launch stops reading as another camp dialog.
- Explicit "why not" messaging for invalid boarding states.

## Files owned

`index.html`, `style.css`, `main.js` (HUD/event listeners), `threeGame.js`
**modal-builder regions only** (camp/hive choice construction),
`docs/sprint-19-proposal.md`.

**Off-limits:** spawn/placement/update-loop regions of `threeGame.js`
(Claude's), `director.js` / `runModifiers.js` (Codex's), `landforms.js`,
`camp.js`, `hiveSite.js` internals.

## Integration contracts

- Render Codex's pressure cards: listen for `run-cards-drawn` (detail:
  `{ seed, cards: [{ key, label, blurb }] }`) and show the seed on the HUD
  and run summary.
- New `act2.js` needs are added as **new pure helpers with tests**, never
  signature changes to existing exports.

## Verification

- `npm test` green before every commit; add tests for any new act2 helpers.
- Headless probe in `scratch/` that boots, forces an Act 2 state, and asserts
  the ledger chip text + forecast seat count (recipe gotchas in
  [sprint-19-state-and-next.md](sprint-19-state-and-next.md)).
- `git pull --rebase` before each work block — three agents live on this
  branch. Legibility merges **first**; the other lanes rebase on it.
