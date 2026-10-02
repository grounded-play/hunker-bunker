# Documentation and Steam review audit

Status: dated audit | Owner: repository maintainers | Updated: 2026-10-01 | Review: Sprint 49 acceptance

Source review: owner-supplied Valve feedback for BuildID 25475189, pasted on
2026-09-30. Semantic review baseline: `379f87e1`; implementation baseline:
`95ff7285`. The [Sprint 49 plan](../planning/sprint-49.md) is the executable TODO;
the [handoff](../planning/sprint-49-implementation-handoff.md) tracks changes.

## Coverage and limits

The [generated inventory](documentation-audit-inventory-2026-09-30.json) enumerates
all tracked documentation extensions plus new unignored documents, including
archives and documentation outside `docs/`. It records sizes, marker counts,
classification and local file-link issues. Regenerate with:

```sh
node scripts/audit-docs.js --inventory docs/reports/documentation-audit-inventory-2026-09-30.json
```

This is full mechanical coverage, not a claim that every historical sentence was
semantically revalidated. Detailed code-backed review covered the current indexes,
Product State, Sprint 48/49 plans, known-gap registers, Steam review/economy plans,
first-hour/design references and the gameplay integrations listed below. Archive
workstation links are retained as warnings; current non-archive file links must
pass. External URLs and heading anchors are not covered by the local link checker.

## Seven Steam failures and their disposition

| Review failure | Observed repository state | Sprint 49 action |
| --- | --- | --- |
| Online PvP/co-op could not be found; variant unclear | Title MULTIPLAYER access and relay/lobby code exist; entrypoint probe is not two-account proof | S49-05: prove both Online modes and accurate player count, invite/join/deploy/results/recovery |
| Commentary toggle exposed no developer content | Menu cards, enable confirmation and READ ALL were added | S49-06: installed-build route, localization and meaningful entries |
| MicroTxn GetReport evidence missing | Worker/CLI exist but report enumeration and pending grants need scrutiny | S49-08/09: durable reconciliation, safe grant/reversal handling, private real transaction evidence |
| Wallet purchase could not be verified | Both hosted Item Store and MicroTxn routes exist; production acceptance remains open | S49-07/09: catalog quantities/prices, real purchase/cancel/delivery evidence |
| Controller could not scroll achievements | Focusable cards and browser route landed | S49-10: entire Deck/Xbox/PlayStation journey, including new chat and store |
| Mature content could not be located | Non-explicit sexual story text and Content Guide exist | S49-11: same content reachable through guide and natural play; accurate survey wording |
| Filtered player chat could not be found | No text chat transport/UI/filter present at audit baseline | S49-02/03/04: implement room chat, seven-language filtering, controller composition and moderation |

Owner direction is to deliver all requested features. The earlier suggestion to
remove chat/categories is superseded. Review remains pending until features are
implemented and evidenced. The review does not require inventing depicted nudity;
retain and accurately describe the mature narrative that actually exists.

## Important contradictions and concrete integration findings

- Docs index still called Sprint 30 current; version history used Sprint 45 while
  planning called Sprint 48 current. One canonical Sprint 49 entry resolves this.
- The prior Sprint 49 backlog checked every feature complete, while its companion
  sketch described those same features as absent. Both are historical inputs.
- Workbench emits `open-field-workbench` with no production consumer; crafting has
  no production caller and tests invent `scrap` rather than the bank's real currency
  contract. S49-13 must connect the whole action and resource path.
- Tactical pings exist on T/middle mouse; semantic controller routing is incomplete.
  S49-14 addresses that gap rather than rebuilding pings.
- Communion is attempted before general interactions, immediately accepts the
  offer, and transformed-Mayor state bypasses normal proximity. S49-21 must make
  the irreversible choice deliberate and nearby, with cancel and explicit preview.
- Precision Mark writes a multiplier/timer with no damage consumer; Crash Queen's
  described barrier differs from the current shield restore. S49-16 reconciles
  promised companion effects with actual combat.
- Four catalog effects remain disabled: `plasma_bounce`, `tesla_thrusters`,
  `pheromone_aura`, `synapse_pulse`. The historical nine-effect count is stale.
- Boss phase controllers, co-op companions/events, static radio portraits, chunk
  mount pacing and the default dock already exist. They need integration/quality
  acceptance; checkbox completion is not physical-hardware proof.
- Localization's zero-count scan misses new emitted/template strings such as
  workbench labels and timeline text. S49-29 must test rendered routes too.
- Store catalog uses `keyCount` while the UI reads `keys`; stale fallback still
  contains a ten-key pack and invented odds/savings. S49-07 fixes the contract.
- GetReport currently has bounded single-fetch/recent-window behavior and treats
  pending grant states too broadly. S49-08 must cover outages and actual delivery.
- Economy's blanket charm-power warning needs rechecking against already-added
  earned attunement gating. Do not duplicate or bypass that entitlement policy.

## External contracts consulted

Steam text filtering can be unavailable for a language and pass text through;
recipient preferences affect additional filtering. This motivates a tested
mandatory baseline and explicit unavailable state.
[Steam text filtering](https://partner.steamgames.com/doc/api/ISteamUtils#InitFilterText).

GetReport enumeration uses the last result's update time, and a short response can
still leave records to enumerate. This motivates durable, deduplicated progress.
[GetReport reference](https://partner.steamgames.com/doc/webapi/ISteamMicroTxn#GetReport).

No live purchase, deployment, Steamworks change, hardware test or submission was
performed by this audit. Their acceptance tasks remain in the canonical plan.
