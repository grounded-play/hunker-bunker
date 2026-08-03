# Engineering Deep Dive: Act 2 State Schema and Humanity

## Current Status

Schema version 3 is implemented in `src/act2.js` under `hb_act2_v1`. Normalization, migration, persistence, manifest building, phase derivation, and ending selection are production code with extensive tests. Server SQLite is not intended to replace this complete local narrative save; Electron mirrors canonical `hb_*` state into `save.json` for durability and Steam Cloud.

## State Families

- **Progress:** begun, uplink silenced, dish built, departed.
- **Queen/brood:** obedience, Queen status, egg status.
- **Player:** humanity, infection load/stage, cover integrity, outing.
- **Social:** camps, suspicion, communication networks.
- **Alien:** three normalized hive records with status, extraction, bond, and quest flags.
- **Manifest:** derived passengers, Queen/egg presence, seats used/max, validity, and reason codes.

The default seat maximum is four. The manifest should be rebuilt from normalized state rather than manually mutated by UI code.

## Migration Contract

`normalizeAct2State` accepts incomplete/older data, clamps numeric ranges, restores all canonical camps/hives, derives missing infection/obedience values where possible, and rebuilds the manifest. New fields need a default, normalization rule, old-save interpretation, and save-contract test.

## Ending Solver

`pickAct2Ending` resolves ten priority-ordered families. The order matters because several state vectors satisfy multiple broad descriptions. Changes require:

- a specific vector test;
- proof existing vectors retain their endings;
- matching cutscene ID and explanation copy;
- manifest validity and blocker reason coverage.

## UI Boundary

UI code may preview a modified state and call `buildAct2Manifest`/`pickAct2Ending`; it should not reproduce solver conditions. `src/endingExplanations.js` owns player-legible causal text for outcomes and blocker reasons.

## Sprint 22 Work

The engineering priority is not “create schema v3.” It is:

1. verify every choice surface mutates state through the manager;
2. test save/reload/death at narrative boundaries;
3. make visible summaries match normalized truth;
4. instrument impossible or invalid manifest vectors for QA;
5. record human acceptance for all ten ending families or explicitly scope the beta subset.

## High-Risk Changes

- changing ending priority;
- adding a passenger without seat accounting;
- bypassing normalization;
- storing derived manifest state as independent authority;
- exposing raw meters without explaining causes;
- moving local narrative authority to the backend without an offline/save migration design.
