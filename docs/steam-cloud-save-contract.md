# Steam Cloud Save Contract

Last updated: 2026-07-28.

## Scope

The Electron shell mirrors Hunker Bunker `localStorage` progression into one
file under Electron `userData`:

```text
save.json
```

Steam Auto-Cloud should synchronize only this file. Runtime logs, caches,
diagnostics, `save.json.tmp`, and `save.json.bak` are local recovery material
and should not be included in the Cloud rule.

## On-disk format

Schema version 1:

```json
{
  "schemaVersion": 1,
  "updatedAt": "2026-07-28T00:00:00.000Z",
  "data": {
    "hb_profile_v1": "{\"callsign\":\"ICE\"}"
  }
}
```

Legacy flat `{"hb_*":"value"}` files are migrated in memory. Values remain
strings because the renderer's storage authority is the browser
`localStorage` API.

The main process:

- accepts only `hb_*` keys and string values;
- caps each value at 1 MiB;
- parses known JSON-backed values before restoring them;
- drops malformed known JSON values instead of poisoning `localStorage`;
- writes `save.json.tmp`, retains the previous valid `save.json.bak`, and
  atomically renames the temporary file;
- falls back to `save.json.bak` when the primary file is corrupt.

## Mirrored key families

Structured JSON:

- `hb_profile_v1`
- `hb_achievements_v1`
- `hb_bank` and legacy `hb_bank_v1`
- `hb_loadout_v1`
- `hb_fabricator_v1`
- `hb_arc_v1`
- `hb_act2_v1`
- `hb_black_box_v1`
- `hb_codex_v1`
- `hb_world_memory_v1`
- `hb_run_stats_v1`
- `hb_minigame_rgb_v1`

Scalar/UI state:

- `hb_active_class_v1`
- `hb_achievements_button_shown_v1`
- `hb_equipped_patch`
- `hb_equipped_decal`
- `hb_equipped_weapon_finish`
- `hb_resolution_preset`
- `hb_ui_scale`
- `hb_text_floor`
- `hb_fps`
- `hb_wrapped`

Dynamic families:

- `hb_daily_v1_*`
- `hb_best_score_*`

When adding a structured key, add it to `JSON_VALUE_KEYS` and
`KNOWN_SAVE_KEYS` in `electron/save-contract.cjs` with a migration fixture.

## Conflict policy

The game does not silently merge divergent progression objects. Steam's
client resolves which `save.json` reaches a machine; the selected file is
then validated as one complete snapshot.

Local guarantees:

- malformed primary data cannot overwrite the last-known-good local backup;
- foreign keys are never restored;
- malformed known JSON values are isolated and dropped;
- legacy flat saves remain readable.

Still requiring installed-Steam acceptance:

- machine A to machine B synchronization;
- divergent offline edits and Steam's conflict prompt;
- stale Cloud file replacing a newer local file;
- Cloud disabled/re-enabled;
- browser-to-Electron migration;
- older-schema migration on both Windows and Linux.

Until those passes are recorded, Steam Cloud remains implemented but not
claimable.
