# G4 Area Profiles: Cryo-Medical Ward and Biomech Nave Room Grammar

Implements the G4 area vocabulary milestone of the [room grammar plan](../planning/sprint-49-room-grammar-and-run-variety.md).
Expands the room grammar system from the industrial pilot into distinct cryo-medical and biomechanical room profiles, introducing thematic structural motifs, bounded clearance-preserving block placements, and role/theme chunk adaptation.

## Behavior

- **Profile Definitions (`src/data/roomGrammarProfiles.js`)**:
  - `CRYO_MEDICAL_ROOM_PROFILE`:
    - Tailored for bunker quarantine wings and medical facilities.
    - Standard envelope tiers: `[[19, 15], [21, 17], [23, 19]]`; major tiers: `[[27, 19], [29, 23], [31, 25]]`.
    - Three structural motifs:
      1. `quarantine-triage-ward`: dual triage-bay and quarantine-cell modules flanking a central access aisle.
      2. `central-autopsy-theater`: central specimen examination and dissection partition block.
      3. `stasis-cryo-vault`: dual stasis pod partition banks (west and east) preserving wide circulation routes.
  - `BIOMECH_ROOM_PROFILE`:
    - Tailored for biological infestations, cathedral naves, and hive incubators.
    - Standard and major tiers matching bunker structural envelopes.
    - Three structural motifs:
      1. `incubation-cyst-nave`: central incubation cyst cluster.
      2. `tracheal-peristaltic-junction`: longitudinal peristaltic artery partition with offset sphincter valve.
      3. `biomech-spore-cathedral`: elevated spore-organ block paired with an umbilical hive nest.
  - `getRoomGrammarProfile(areaId)`:
    - Resolves profile definitions dynamically by area identifier (`industrial`, `cryo-medical`, `medical`, `biomech`), safely defaulting to `industrial`.
- **Chunk Grammar Integration (`src/roomGrammarChunk.js`)**:
  - `buildGrammarRoomChunk` accepts `areaId` and forwards it to `planInterior`.
  - Automatically derives default gameplay roles and rendering themes from the generated profile:
    - `cryo-medical` / `medical` -> role `medical`, theme `cryo`
    - `biomech` -> role `nest`, theme `bio`
    - `industrial` -> role `engineering`, theme `bunker-utility`
    - Preserves explicit caller overrides for custom scenarios.

## Verification

- `src/roomGrammarAreaProfiles.test.js`:
  - Verifies structural validity and margin bounds of all motifs across all three profiles.
  - Verifies generation of cryo-medical interiors across 30 seeds, validating quarantine, autopsy, and stasis motifs.
  - Verifies generation of biomech interiors across 30 seeds, validating incubation, tracheal, and spore motifs.
  - Verifies chunk adaptation with role/theme mapping for medical and biomech rooms.
- `src/roomGrammar.test.js` & `src/roomGrammarChunk.test.js`: all existing industrial grammar tests continue to pass.
- ESLint: zero warnings or errors across all modified and new files.
