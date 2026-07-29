# Sprint 19 Next Work

This document is the narrower follow-on to
[sprint-19-state-and-next.md](sprint-19-state-and-next.md). The sprint note is
good at recording what landed and where the branch can go. This page is about
what I would actually work on next, in order, and why.

Primary references:

- [PR_OUTLINE.md](../PR_OUTLINE.md)
- [game-wide-review-and-solution-plan.md](game-wide-review-and-solution-plan.md)
- [game-wide-review-questions-and-proposals.md](game-wide-review-questions-and-proposals.md)

> **Update 2026-07-10 (evening):** all three wave-1 lanes shipped
> (`f2f97de`, `9638feb`, `bbc286f`). The next assignment round is
> [sprint-19-wave2-work.md](sprint-19-wave2-work.md) — asset factory,
> unified skill tree, lore drops, achievements.

## Agent Assignments

This plan is split into three parallel lanes, one per agent working this
branch. Each brief carries deliverables, acceptance criteria, file ownership
(to stop live co-edit collisions), and the integration seams between lanes:

- [sprint-19-work-gemini.md](sprint-19-work-gemini.md) — **Gemini:**
  Legibility Layer & Boarding Climax (§1–2; matches Gemini's Antigravity
  implementation plan, whose open questions are answered in the brief)
- [sprint-19-work-codex.md](sprint-19-work-codex.md) — **Codex:** Run
  Director & Pressure Cards (§3; almost entirely new files)
- [sprint-19-work-claude.md](sprint-19-work-claude.md) — **Claude:**
  Physicality & World Behavior (§4–5; builds on the landform/discovery
  systems and Gemini's proto sprites)

Merge order when seams conflict: Gemini → Codex → Claude. Shared-file rule:
`git pull --rebase` before every work block, `npm test` green before every
commit, and stay inside your brief's owned files.

## Quick Review

What the sprint note already does well:

- It reflects the real branch state instead of the older planned state.
- It ranks work by leverage instead of just listing features.
- It connects the new landforms, cutscene pipeline, and proto-enemy work to
  future follow-ups.

What I would sharpen:

- Separate "what landed" from "what I would build next."
- Turn the roadmap into concrete deliverables with a clear completion test.
- Avoid adding more hidden state until the current state is legible to the
  player.

## Working Thesis

The highest-value next move is to make the consequence engine visible before
adding more content. If the player cannot tell why a camp, hive, or ending
changed, then new systems only add noise.

## What I Would Work On

### 1. Legibility Layer First

Why this comes first:

- The game already knows the answer. The player does not.
- This is the cheapest way to make the current branch feel deeper.
- It reduces the "spreadsheet" risk without changing the underlying logic.

What I would build:

- A Queen's Ledger HUD chip that shows the current pressure in one line.
- Consequence preview lines on camp and hive options before confirmation.
- A manifest forecast before launch that shows seats, passengers, and blockers.
- A compact run summary card for death or departure that explains the ending.

Done when:

- The player can explain the run in one sentence.
- Blocked launches and ending outcomes show clear reasons.
- No choice depends on hidden state alone.

### 2. Boarding Climax

Why this comes next:

- The launch is the emotional peak of Act 2.
- It should feel like a physical decision space, not another dialog branch.
- The manifest logic is already in place, so the UI can grow around it.

What I would build:

- A dedicated boarding object or terminal.
- A pre-launch manifest screen with seats, passengers, and blockers.
- Explicit "why not" messaging for invalid boarding states.
- A cleaner transition from camp interaction into the climax flow.

Done when:

- Boarding reads as a climax from the first interaction.
- The player sees the seat problem before the launch click.
- The boarding UI reuses the manifest logic instead of duplicating it.

### 3. Run Director and Pressure Cards

Why this matters:

- The game is already strong on consequence.
- It is still thinner on run-to-run pressure and route variation.
- Randomness should change decisions, not just placement.

What I would build:

- A small seeded modifier set.
- Two or three visible pressure cards per run.
- Modifiers that affect route choice, scarcity, or enemy pressure.
- Landform hooks for the most obvious terrain interactions.

Done when:

- Two runs with the same broad story still demand different routes.
- At least one modifier changes what the player does, not just what they read.
- The modifiers are easy to debug from the seed.

### 4. Physicality Pass

Why this follows the legibility work:

- Once the UI is readable, the world should start behaving like it remembers
  the player.
- This gives the systems a body instead of just numbers.

What I would build:

- A proto-enemy spawner tied to landforms.
- Suspicion tells that show up in behavior, prices, or access.
- A queen boss fight when the defiance paths are ready.
- Class-specific Act 2 verbs that change how players move or interact.

Done when:

- State changes have visible behavior in the world.
- At least one new enemy family naturally belongs to a terrain type.
- The big defiance path has a real gameplay payoff.

### 5. Stabilization and Docs

Why I would keep this in the plan:

- This branch is being worked on live.
- Good notes prevent duplicated effort.
- The existing regression assets are worth protecting.

What I would maintain:

- Keep the smoke and unit tests current.
- Update the docs when code reality changes.
- Preserve the regression assets that already prove the branch is stable.

Done when:

- The docs match the shipped behavior.
- The headless checks still cover endings, camps, and landform behavior.

## What I Would Defer

- New visible meters that do not change a decision.
- More ending branches before the current endings are legible.
- Bespoke art for branches that are not fun yet.
- New faction systems before the camp/hive loop is clearer.
- Any content pass that does not improve one of the layers above.

## Suggested Build Order

1. Legibility layer.
2. Boarding climax.
3. Run director and pressure cards.
4. Physicality pass.
5. Stabilization and docs.

That order keeps the branch disciplined: first make the player understand the
game, then make the game surprise the player, then make the world feel
physical.

## My Short Version

If I had to reduce all of this to one sentence, it would be:

**Make the consequence engine readable, then make the boarding moment feel
like a real climax, then use run variation and terrain to make each seed play
different.**
