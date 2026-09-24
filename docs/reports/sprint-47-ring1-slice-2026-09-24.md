# Sprint 47 Ring 1 slice — Lane 1 probe report

Status: Lane 1 before/after measured · integrated run pending Lanes 2 and 3 · Updated: 2026-09-24

This report covers what the Ring 1 events (Lane 1) change for a player's first deployment, measured by a scripted browser probe. It separates what the probe **observed** from what it **assumes** or cannot see. No human has played this build: there are no playtest findings, and nothing here was measured on a Steam Deck, in co-op or against Steam Cloud.

Lane scope and the evaluation of all three lanes: [gameplay-feature-review-2026-09-24.md](../planning/gameplay-feature-review-2026-09-24.md) (extension and "Lane status").

## What was run

| | Before | After |
|---|---|---|
| Build | `030d773` (Sprint 46 + planning docs) | `e1d47fd` (Lane 1 committed; no Lane 2 or 3 code) |
| Seeds | 31337, 99991, 5150 | same |
| Classes | Scout, Tank, Engineer | same |
| Runs | 9/9 passed | 9/9 passed; one run (5150 Engineer) first failed during boot ("Target page, context or browser has been closed") before any slice step, and passed on rerun |

Probe: `tests/e2e/probes/slice.spec.js`. Each run pins the campaign seed after the menu's NEW CAMPAIGN, deploys once (expedition index 1), and records the event, the route chip and tracker, the site's choice modal, the response taken through the real buttons, the fight or bypass, what the cross-lane contracts delivered, and the results screen's expedition report. Both builds ran from clean `git worktree` checkouts, so neither saw the other lanes' uncommitted files.

Shortcuts, each recorded in the raw output:

1. **Signal clock advanced** to 0.05 s before the signal time. Game time is capped at 0.05 s a frame and this headless machine renders under 1 fps, so waiting 84–146 game-seconds was not practical.
2. **Operator placed at the site** instead of walking there. Reaching the site is not measured.
3. **Bypass run with world drawing suspended and god mode off** (god mode holds O₂ full).
4. The player is killed at the end of each run to reach the results screen.

## Observed

| Seed | Condition before → after | Event (truth) | Site | Signal | Route chip | Responses | Outcome | Contracts missing |
|---|---|---|---|---|---|---|---|---|
| 31337 | Glacial Gale → Glacial Gale | Salvage Vault | chunk 1,−2, on the spine, 108 m | 84 s | "OPTIONAL · SALVAGE VAULT · 108m" | Scout, Engineer: bypass · Tank: breach | bypassed ×2 · breach, no fight | grantRunDrop (all) · spawnEncounterRecipe (Tank) |
| 99991 | Bio-Resin Surge → **Geothermal Arc** | Distress Signal (bait) | chunk −1,−2, off route, 92 m | 137 s | "OPTIONAL · DISTRESS SIGNAL · 92m" | Scout, Tank: scan → open · Engineer: scan → leave | empty ambush ×2 · left | spawnEncounterRecipe (Scout, Tank) |
| 5150 | Spore Bloom → Spore Bloom | Distress Signal (survivor) | chunk −1,−1, off route, 49 m | 146 s | "OPTIONAL · DISTRESS SIGNAL · 49m" | all: scan → open | rescued ×3 | grantRunDrop (all) |

- **Before:** no run showed an optional route, a radio signal or a choice. Every report read: condition, bounty missed, "No objectives completed this deployment", next ship goal.
- **Route beside the ship goal:** in all 9 after-runs the two tracker cards stayed the mission (`mission:active`) and the ship-goal option (`goal-package`); the event appeared as its own chip. Signal times 84–146 s are inside the 1:00–3:00 window.
- **Repetition guard in the game:** on seed 99991 the old code rolled Bio-Resin Surge for deployment 0 and deployment 1; after, deployment 1 is Geothermal Arc. Seeds 31337 and 5150 did not repeat, so the guard left them alone.
- **Condition variation seen:** under Geothermal Arc the radio said "A distress beacon cutting in and out through the arc noise" (intermittent signal); under Spore Bloom, "Distress beacon… A human voice on loop".
- **Scan told the truth before committing:** bait on 99991 ("the heartbeat is wrong — too many, too slow"), a survivor on 5150 ("one heartbeat, human rhythm").
- **Modal:** visible in all 9 runs; the first response had keyboard/controller focus (Scan or Breach). The close button is clear of the HUD cards (fixed in `e1d47fd`; see `after-31337-SCOUT-modal.webp`).
- **Bypass cost:** O₂ fell 100 → 91 (Scout) and 100 → 92 (Engineer) over the 12 s Glacial Gale bypass (14 s wall time), with the drain multiplier back to 1 afterwards.
- **Honest degradation:** with no Lane 3 contract, every grant was reported as "The component did not survive the salvage" / "Found: A component lost in salvage", and `slice-contract-missing` fired. With no Lane 2 contract, opening the bait ended as "The beacon was bait, but nothing came" and paid nothing.
- **Report:** after-runs add event, discovery and lead lines, e.g. 5150: "Found: A component lost in salvage" … "Lead: Survivor pulled from a false-looking beacon" (after the ship goal).

### Problems the probe found

1. **An unopposed breach was reported as a held fight.** 31337 Tank breached the vault with no encounter contract, and the report said "Breached the salvage vault and held it". Fixed after the run: an unopposed breach now ends as `breach_unopposed`, "Breached the salvage vault; no defenders answered" (7 locales, tests). The committed raw output shows the old wording.
2. **The 31337 site is on the spine.** Its Ring 1 had no free off-spine chunk, so the rule fell back to a spine chunk. Placing the operator there also completed the deployment's mission ("OBJECTIVE COMPLETE. EXTRACTION AIRLOCK ARMED") and its reward made the O₂ goal affordable. **Those report lines ("Completed: RECOVERY…", "O₂ GENERATOR MODULE is affordable") are an artefact of the teleport, not an effect of the event**, and should not be read as an improvement.

## Assumed or not measured

- **Whether a player notices the chip, reads the radio line or understands the choice.** The probe proves they render; it cannot tell whether anyone looks at them.
- **Reaching the site.** Straight-line distances (49–108 m) are not path lengths; nobody walked there.
- **The fights.** No encounter spawned in any after-run (no Lane 2 contract at runtime), so the per-class fight comparison — the build probe — has no in-game data yet. The only class difference observed is the policy the probe chose (Tank breached, Scout and Engineer bypassed).
- **Rewards.** No drop was granted (no Lane 3 contract), so no run shows a synergy component changing the rest of the deployment.
- **Deck, co-op, Cloud, frame pacing:** not touched. Co-op does not run events at all (solo only, by design).

## Pending: integrated run

Lanes 2 and 3 were still uncommitted when this ran. Once they land, Lane 1 imports `src/encounterRecipes.js` (Lane 3's `src/statusEffects.js` is already imported by its own runtime changes), and the same probe runs again as `after-integrated` on the same seeds and classes. That run is what can show real fights per class, real drops, and the vault's breach-versus-bypass trade.

## Raw output

`docs/reports/assets/sprint-47/`:

- `slice-before.jsonl`, `slice-after.jsonl` — one record per run (the after file has the 5150 Engineer rerun as its ninth line)
- `slice-before-run.log`, `slice-after-run.log`, `slice-after-retry-run.log` — Playwright output
- screenshots (WebP): `after-31337-SCOUT-{signal,modal,results}`, `after-99991-SCOUT-{modal,results}`, `after-99991-ENGINEER-results`, `after-5150-TANK-{signal,results}`, `before-31337-SCOUT-{after,results}`, `before-99991-SCOUT-results`, `before-5150-TANK-results`

## Reproduce

```bash
# one no-HMR vite server per worktree (other agents edit src/ live)
git worktree add --detach /tmp/wt-before 030d773
git worktree add --detach /tmp/wt-after  e1d47fd
# serve each (e.g. ports 5401/5402), point a Playwright config's baseURL at it, then:
HB_PROBES=1 HB_PROBE_LABEL=after HB_PROBE_OUT=/tmp/probe \
  npx playwright test -c <config> tests/e2e/probes/slice.spec.js
```
