# Steam Dashboard Handoff

Generated: 2026-08-20.

This is the copy/paste packet for Steamworks dashboard work that cannot be
completed from the repo. Keep it in sync with code by running:

```bash
npm run steam:dashboard-handoff
```

## Official References

- [Steam Cloud](https://partner.steamgames.com/doc/features/cloud)
- [Stats and Achievements](https://partner.steamgames.com/doc/features/achievements)
- [Leaderboards Guide](https://partner.steamgames.com/doc/features/leaderboards/guide)
- [Inventory Service](https://partner.steamgames.com/doc/features/inventory)
- [Inventory Schema](https://partner.steamgames.com/doc/features/inventory/schema)
- [Item Store](https://partner.steamgames.com/doc/features/inventory/itemstore)
- [Steam Input Setup](https://partner.steamgames.com/doc/features/steam_controller/getting_started_for_devs)
- [SteamPipe Uploads](https://partner.steamgames.com/doc/sdk/uploading)

## App And Depot Identity

| Field | Value |
| --- | --- |
| Steam App ID | `4957040` |
| App title | Hunker Bunker |
| Electron product name | Hunker Bunker |
| Current depot model | single content depot |
| Content depot | `4957041` |
| Build branch | `beta` |

## Launch Options

With the current single content depot, create one launch option per platform:

| Platform | Executable |
| --- | --- |
| Windows | `hunker-bunker.exe` |
| Linux + SteamOS | `hunker-bunker` |

Future download-size improvement: Create a second OS-specific depot in Steamworks, then update steam/app_build.vdf and .github/workflows/steam-build.yml.

## Leaderboards To Create

Create these in Steamworks, then copy the generated leaderboard IDs back into
`HB_STEAM_LEADERBOARD_IDS`.

| API Name | Sort Method | Display Type | Upload Method | Dashboard ID |
| --- | --- | --- | --- | --- |
| `best_run_score` | Descending | Numeric | KeepBest | 20504740 |
| `daily_ops_score` | Descending | Numeric | KeepBest | 20504746 |
| `fastest_extraction_ms` | Ascending | Milliseconds | KeepBest | 20504747 |
| `deepest_depth_score` | Descending | Numeric | KeepBest | 20504750 |
| `survival_time_seconds` | Descending | Seconds | KeepBest | 20504754 |

Backend env template after IDs exist:

```bash
HB_STEAM_LEADERBOARD_IDS='best_run_score:<best_run_score_id>,daily_ops_score:<daily_ops_score_id>,fastest_extraction_ms:<fastest_extraction_ms_id>,deepest_depth_score:<deepest_depth_score_id>,survival_time_seconds:<survival_time_seconds_id>'
```

## Achievements To Publish

Publish the 23 active achievements below. Keep
`comingSoon` entries out of the live dashboard until their unlock paths are
active in code.

| API Name | Display Name | Hidden | Publish Now | Icon | Locked Icon | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `quick_study` | QUICK STUDY | No | Yes | `public/ach_quick_study.png` | `public/ach_quick_study_locked.png` | Lose a run within five seconds of deployment. |
| `hunkered` | HUNKERED | No | Yes | `public/ach_hunkered.png` | `public/ach_hunkered_locked.png` | Survive a single run past twenty minutes. |
| `scouts_honor` | SCOUT'S HONOR | No | Yes | `public/ach_victory_scout.png` | `public/ach_victory_scout_locked.png` | Reach any ending as the Scout. |
| `tank_commander` | TANK COMMANDER | No | Yes | `public/ach_victory_tank.png` | `public/ach_victory_tank_locked.png` | Reach any ending as the Tank. |
| `chief_engineer` | CHIEF ENGINEER | No | Yes | `public/ach_victory_engineer.png` | `public/ach_victory_engineer_locked.png` | Reach any ending as the Engineer. |
| `ending_full_brood` | FULL BROOD | Yes | Yes | `public/ach_ending_full_brood.png` | `public/ach_ending_full_brood_locked.png` | Reach the FULL BROOD ending family. |
| `ending_clean_escape` | CLEAN ESCAPE | Yes | Yes | `public/ach_ending_clean_escape.png` | `public/ach_ending_clean_escape_locked.png` | Reach the CLEAN ESCAPE ending family. |
| `ending_mixed_crew` | MIXED CREW | Yes | Yes | `public/ach_ending_mixed_crew.png` | `public/ach_ending_mixed_crew_locked.png` | Reach the MIXED CREW ending family. |
| `ending_carriers_bargain` | CARRIERS BARGAIN | Yes | Yes | `public/ach_ending_carriers_bargain.png` | `public/ach_ending_carriers_bargain_locked.png` | Reach the CARRIERS BARGAIN ending family. |
| `ending_scorched_sky` | SCORCHED SKY | Yes | Yes | `public/ach_ending_scorched_sky.png` | `public/ach_ending_scorched_sky_locked.png` | Reach the SCORCHED SKY ending family. |
| `ending_mothership_infection` | MOTHERSHIP INFECTION | Yes | Yes | `public/ach_ending_mothership_infection.png` | `public/ach_ending_mothership_infection_locked.png` | Reach the MOTHERSHIP INFECTION ending family. |
| `ending_alien_exodus` | ALIEN EXODUS | Yes | Yes | `public/ach_ending_alien_exodus.png` | `public/ach_ending_alien_exodus_locked.png` | Reach the ALIEN EXODUS ending family. |
| `ending_outed_escape` | OUTED ESCAPE | Yes | Yes | `public/ach_ending_outed_escape.png` | `public/ach_ending_outed_escape_locked.png` | Reach the OUTED ESCAPE ending family. |
| `ending_failed_carrier` | FAILED CARRIER | Yes | Yes | `public/ach_ending_failed_carrier.png` | `public/ach_ending_failed_carrier_locked.png` | Reach the FAILED CARRIER ending family. |
| `ending_empty_husk` | EMPTY HUSK | Yes | Yes | `public/ach_ending_empty_husk.png` | `public/ach_ending_empty_husk_locked.png` | Reach the EMPTY HUSK ending family. |
| `cartographer` | CARTOGRAPHER | No | Yes | `public/ach_cartographer.png` | `public/ach_cartographer_locked.png` | Discover all three survivor camps in one run. |
| `archivist` | ARCHIVIST | No | Yes | `public/ach_archivist.png` | `public/ach_archivist_locked.png` | Collect 12 lore drops. |
| `kin` | KIN | No | Yes | `public/ach_kin.png` | `public/ach_kin_locked.png` | Reach maximum bond with any hive. |
| `ghost` | GHOST | Yes | Yes | `public/ach_ghost.png` | `public/ach_ghost_locked.png` | Reach the reveal with zero suspicion gained. |
| `gentle_drill` | GENTLE DRILL | Yes | Yes | `public/ach_gentle_drill.png` | `public/ach_gentle_drill_locked.png` | Reach the reveal without harming a hive site. |
| `chen_thirteenth` | CHEN'S THIRTEENTH | Yes | Yes | `public/ach_chen_thirteenth.png` | `public/ach_chen_thirteenth_locked.png` | Reach the cave reveal before any operator death is recorded. |
| `reyes_courier` | REYES COURIER | Yes | Yes | `public/ach_reyes_courier.png` | `public/ach_reyes_courier_locked.png` | Carry Pvt. Reyes' letter to Commander Briggs. |
| `hardened` | HARDENED | No | Yes | `public/ach_hardened.png` | `public/ach_hardened_locked.png` | Die five times and keep coming back. |

### Hold For Later

| API Name | Display Name | Reason |
| --- | --- | --- |
| `slay_the_queen` | SLAY THE QUEEN | hold: comingSoon in code |

## Stats To Publish

| API Name | Type | Set By | Code Source |
| --- | --- | --- | --- |
| `total_deaths` | INT | Client | achievementState.stats.totalDeaths |
| `longest_run_seconds` | INT | Client | floor(achievementState.stats.maxRunMs / 1000) |
| `total_kills` | INT | Client | achievementState.stats.totalKills |
| `total_runs` | INT | Client | achievementState.stats.runCount |
| `total_victories` | INT | Client | achievementState.stats.victories |
| `shells_collected` | INT | Client | achievementState.stats.shellsCollected |
| `lore_drops_collected` | INT | Client | achievementState.stats.loreDropIds.length \|\| achievementState.stats.loreDrops |
| `max_hive_bond` | INT | Client | achievementState.stats.maxHiveBond |

## Beta Achievement Reset

Achievement reset is available only when the installed Electron build is
launched with `HB_QA_TOOLS_ENABLED=1`. Open the in-game developer console
and run its achievement-reset command. The Electron handler calls Steam
`ResetAllStats(true)` for the currently logged-in account and stores the
result. Confirm the response is successful, restart the beta build, and verify
the selected achievement is locked before repeating an unlock test.

Never enable `HB_QA_TOOLS_ENABLED` in the public branch or use a personal
player account for reset testing. This reset affects both achievements and
Steam stats for the active QA account.

## Steam Cloud Auto-Cloud

Enable Steam Cloud and add these Auto-Cloud root paths. The game writes one
Electron save bridge file named `save.json` under Electron `userData`.

| Platform | Root | Path | Pattern | Recursive |
| --- | --- | --- | --- | --- |
| Windows | `WinAppDataRoaming` | `Hunker Bunker` | `save.json` | No |
| Linux + SteamOS | `LinuxXdgDataHome` | `Hunker Bunker` | `save.json` | No |

Recommended quota for this save bridge: 5 MB and 32 files. The expected active
file count is one, but the extra headroom keeps migrations painless.

## Steam Input

| Field | Value |
| --- | --- |
| Dashboard template | Custom Configuration (Bundled with Game) |
| Manifest source in repo | `steam/steam_input_manifest.vdf` |
| Manifest path in installed build | `steam_input_manifest.vdf` |

Actions in the manifest:

| Action Set | Type | Action | Label |
| --- | --- | --- | --- |
| menu | Button | `menu_up` | Up |
| menu | Button | `menu_down` | Down |
| menu | Button | `menu_left` | Left |
| menu | Button | `menu_right` | Right |
| menu | Button | `menu_confirm` | Confirm |
| menu | Button | `menu_back` | Back |
| menu | Button | `menu_tab_left` | Previous Tab |
| menu | Button | `menu_tab_right` | Next Tab |
| gameplay | StickPadGyro | `move` | Move |
| gameplay | StickPadGyro | `camera` | Aim |
| gameplay | StickPadGyro | `camera_mouse` | Aim Cursor |
| gameplay | Button | `fire` | Fire |
| gameplay | Button | `interact` | Interact |
| gameplay | Button | `reload` | Reload |
| gameplay | Button | `ability` | Smash |
| gameplay | Button | `dash` | Dodge |
| gameplay | Button | `scan` | Scan |
| gameplay | Button | `sprint` | Sprint |
| gameplay | Button | `toggle_map` | Tactical Map |
| gameplay | Button | `pause` | Pause |
| archive | StickPadGyro | `archive_focus` | Move Focus |
| archive | Button | `archive_confirm` | Inspect / Confirm |
| archive | Button | `archive_inventory` | Inventory |
| archive | Button | `archive_back` | Back |
| archive | Button | `archive_reveal` | Reveal Hotspots |

## Inventory Schema And Item Store

Upload `steam/inventory_schema_hunker_bunker.json` to Steam Inventory Service.

| Field | Value |
| --- | --- |
| Schema appid | `4957040` |
| ItemDefs | 73 |
| Hosted Item Store URL | `https://store.steampowered.com/itemstore/4957040/` |
| Hosted Item Store beta URL | `https://store.steampowered.com/itemstore/4957040/?beta=1` |

Sellable ItemDefs:

| ItemDefID | Name | Price Category | Store Tags |
| --- | --- | --- | --- |
| `4001` | Cache Key | `1;VLV100` | `featured;keys;cache_key` |

Recommended top-level Item Store filters:

| Filter Name | store_tags |
| --- | --- |
| Featured | `featured` |
| Keys | `keys;cache_key` |

Do not enable live purchases until Valve MicroTxn approval, regional policy,
sandbox purchase tests, and live purchase reversal handling are accepted.

## Required Backend And CI Values

```bash
HB_STEAM_APPID=4957040
HB_STEAM_ITEM_STORE_APPID=4957040
HB_STEAM_LEADERBOARD_IDS='best_run_score:<best_run_score_id>,daily_ops_score:<daily_ops_score_id>,fastest_extraction_ms:<fastest_extraction_ms_id>,deepest_depth_score:<deepest_depth_score_id>,survival_time_seconds:<survival_time_seconds_id>'

STEAM_APPID=4957040
STEAM_DEPOT_CONTENT=4957041
```

Secrets that still must come from the dashboard/host:

- `HB_STEAM_PUBLISHER_KEY`
- `HB_SESSION_SECRET`
- `HB_ALLOWED_ORIGINS`
- `HB_DB_STORAGE_PATH` or `HB_DB_SQLITE_PATH`
- `STEAM_BUILD_ACCOUNT`
- `STEAM_CONFIG_VDF`

## Acceptance Checklist

- [ ] Leaderboards created and `HB_STEAM_LEADERBOARD_IDS` filled with real IDs.
- [ ] Achievements and stats published in Steamworks.
- [ ] Steam Cloud Auto-Cloud paths saved and published.
- [ ] Inventory schema uploaded and accepted.
- [ ] Steam Input template set to bundled config with manifest path `steam_input_manifest.vdf`.
- [ ] Beta package includes app `4957040` and depot `4957041`.
- [ ] Installed Steam beta launches both platform payloads through the configured launch options.
- [ ] Installed Steam beta reaches deployed `/health`, reads inventory, submits a trusted score, and syncs `save.json`.
