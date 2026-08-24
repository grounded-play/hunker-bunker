# Repository Roadmap and Carryover Register

Status: canonical roadmap · Owner: repository maintainers · Updated: 2026-08-24
· Review: every sprint close

This is the larger outline of what the repository needs. It is ordered by
risk and dependency, not excitement. Items are drawn from Sprint 24–29 plans,
completion reports, `things-we-missed.md`, current code shape, and Product State.

## What the last sprints taught us

| Pattern | Evidence across sprints | Planning correction |
| --- | --- | --- |
| Code-complete was treated too close to accepted | Packaged Steam, two-account co-op, Deck, Cloud, and real-GPU proof recur from Sprints 24/26 through 29 | Acceptance gets committed capacity and named evidence, not a final checkbox lane |
| New scope displaced carryover | Sprint 29 planned Wanderers, tuning, Deck, and certification but closed mainly presentation/model integration work | Every closeout must classify untouched work as carry, blocked, or cut |
| Plans multiplied faster than truth | 149 loose Markdown files sit directly in `docs/`, including competing master plans and status audits | One Product State, one active sprint, one roadmap, indexed maintained references |
| Automated volume masked environment gaps | 2,151 tests are healthy, while E2E startup and hardware/service paths remain open | Keep unit, E2E, packaged, hardware, and human evidence as separate grades |
| Large integration seams regress | Multiplayer handoff was reworked repeatedly; `threeGame.js`, `style.css`, and `main.js` remain very large | Extract from measured seams after acceptance, with characterization tests |
| Asset count outran review | Large model catalogs landed while per-model framing, runtime cost, and missing variants stayed open | Require in-game visual/perf acceptance before the next production batch |

## Horizon A — prove and stabilize the product

This is Sprint 30 and the release gate for further breadth.

1. New-player 35–45 minute Proof Run and first-hour comprehension.
2. Two-account production Steam co-op expedition, including reconnect/host
   behavior and cross-region disposition.
3. Physical Deck, real-GPU packaged performance, Cloud round-trip, and crash
   recovery acceptance.
4. Close P0/P1 failures found by those routes; make store claims evidence-based.
5. Stabilize deterministic E2E startup/readiness where it blocks proof.

## Horizon B — finish player-facing systems already started

1. **Wanderers:** multi-stage objectives for six archetypes, distinctive assist
   feedback, loyalty/quest persistence, balance, and consequence visibility.
2. **First hour and objectives:** parent/child objective grammar, priority rules,
   compass behavior, failure states, and death teaching.
3. **Combat identity:** enemy silhouettes/counterplay, class rhythms,
   ammo/anti-softlock guarantees, and corrupted-class boss differentiation.
4. **Run variety:** authored pressure/relief event deck, repeat prevention,
   legible geometry changes, and “this run felt different” acceptance.
5. **Faction/hive verbs:** unique economies, traversal/threat patterns, readable
   world consequences, and post-corruption variants.
6. **Narrative payoff:** lore discovery as play, state explanations, run summary,
   final camp boss climax, and prioritized ending cinematics/fallbacks.
7. **World/asset completion:** meaningful WFC/landform variety, camp/hive
   dressing, corpse/damage states, remaining cosmetic and enemy meshes.

## Horizon C — reduce change risk and operating cost

1. Characterize and extract bounded seams from `src/threeGame.js`, `main.js`,
   and `style.css`; do not attempt a big-bang rewrite.
2. Make packaged media audits inspect decodability/content, not only existence
   and byte budgets.
3. Separate durable SteamID64 identity from browser/local profile fallback and
   document supported multiplayer trust boundaries.
4. Decide the cross-region lobby path: binding patch, Steamworks upgrade, or
   relay-backed discovery; test the chosen path in two regions.
5. Move production persistence from default JSON toward an operated durable
   store with backup, migration, restore, capacity, and incident procedures.
6. Add observability/SLOs for auth, relay, Cloud-adjacent flows, inventory,
   leaderboards, and deployment rollback.
7. Archive historical docs by sprint/subsystem with link-preserving redirects;
   convert valuable conclusions into maintained references.

## Horizon D — commercial release readiness

1. Steam dashboard configuration and claim-by-claim audit on a real app/account.
2. Store assets/copy, age/content disclosures, privacy, health warning,
   accessibility, controller/Deck claims, and support paths.
3. Inventory/store approval, pricing, refund/error behavior, legal review, and
   explicit decision on paid random rewards.
4. DRM wrapping, depots, branches, installers, update/rollback, Cloud quotas,
   achievements/stats/leaderboards, and soundtrack packaging.
5. External playtest cohorts, crash/performance telemetry, balance passes,
   release-candidate freeze, and go/no-go checklist.

## Deferred and cut decisions

| Item | Disposition | Revisit condition |
| --- | --- | --- |
| New multiplayer features or modes | Deferred | Current co-op route is accepted and stable |
| Paid random crates | Deferred | Platform approval, legal review, odds disclosure, and refund policy exist |
| Steam Voice, Workshop, Timeline, commentary | Deferred | Core release claims are accepted and feature value is demonstrated |
| Full escort/rescue population simulation | Deferred | One Wanderer quest pattern is proven and performance budget is known |
| Every ending as bespoke video | Sequence, do not promise all at once | Prioritize most-reached endings after telemetry/playtests |
| Broad new asset batch | Deferred | Current catalog passes visual/performance review and missing list is reconciled |

## Exit toward the next sprint

Sprint 31 should be chosen from the failures and evidence produced by Sprint 30,
not precommitted now. If acceptance is clean, begin Horizon B with the Wanderer
vertical slice and general objective grammar. If acceptance fails, Sprint 31 is
the stabilization sprint for the measured blockers.

