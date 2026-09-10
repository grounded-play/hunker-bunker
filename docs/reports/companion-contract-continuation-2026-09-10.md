# Companion contract continuation â€” September 10, 2026

Implemented in the Mountain working tree on `dev/sprint-33`, preserving earlier uncommitted work.

## Completed contracts

| Companion | Contract | Ordered actions | Permanent reward |
| --- | --- | --- | --- |
| Corpo | Severance Package | Decrypt two distinct terminals, then complete a camp assistance job | 16 shells |
| Crash Queen | Beacon in the Dark | Complete two distinct camp assistance jobs | 16 shells |
| Tripper | VIP Access | Cross two distinct depth tiers, then decrypt a terminal to relay the route | 14 shells |

All six companion families now offer contracts tied to playable events. The old unsupported objectives are replaced in the shared archetype catalog too. No new skin/model reward is promised by these three contracts.

Each contract retains its own progress and event receipts when the player switches companions, dismisses one or reloads. Old quest saves migrate without inventing progress. Only the appropriate active companion advances a contract, and stages reject out-of-order or duplicate events. A forced HUD depth announcement, menu preview or loading phase cannot advance Tripper's route.

The objective tracker removes the prior companion's active row as paused, rather than falsely completing it. New completion lines give narrative payoff; returning companions acknowledge completed work and do not offer its reward again. Bank receipts prevent repeated grants even when a restart occurs between currency persistence and quest acknowledgement.

## Verification

Ten new regressions cover all three contracts, stage order, duplicate events, switching/reload, legacy migration, completed reunions, actual depth-event wiring, HUD state and reward delivery. Existing Foxhole/Hacker/Chrysalis tests continue to pass.

**Verified:** 2,669 tests across 299 files pass. Lint, production build/media audit, generated presubmit, documentation audit and whitespace checks pass. No new browser or fresh-player playthrough is claimed for this phase; runtime integration is exercised by the colocated tests. During validation, concurrent work added three run modifiers. The legacy data-catalog expectation was reconciled with the already updated main modifier catalog/test; no modifier behavior was changed by this continuation.

## Remaining plan work

The companion implementation phase is complete; human narrative pacing, reward balance and a full 35â€“45 minute fresh-player Proof Run remain open. The next code/content items are withheld relic effects and their real synergies, enemy readability, remaining model production, and hardware/Steam/Cloud acceptance. This pass does not claim those items complete.

No commit, push, publish or Steam release was performed by this continuation.
