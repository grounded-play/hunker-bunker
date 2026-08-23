# Latest Asset, Loading & Season Coverage Audit

**Date:** 2026-08-21  
**Branch:** `dev/sprint-28`  
**Latest asset commit reviewed:** `5781225`  
**Scope:** Season 0 rewards, achievement cosmetics, community FBX/GLB batch, debug galleries, runtime loading, 2D decal usage, and asset-release hygiene.

## Executive result

The latest season conversion completed the previously missing standard Season 0 meshes. The current reward-model state is materially better than the older audit documents claim:

- Weapon skins `4100–4111`: **12/12 GLBs present and mapped**.
- Chassis skins `4112–4119`: **8/8 GLBs present and mapped**.
- Rig modules `4140–4147`: **8/8 GLBs present and mapped**.
- Tactical charms `4130–4139`: **10/10 GLBs present and mapped**.
- Community roster: **30/30 GLBs, 30/30 manifest entries, 9 Scout / 11 Tank / 10 Engineer**.
- Recursive GLB audit: **138 present, 137 referenced, 0 missing references**.
- One apparently unused GLB remains: `public/3d/runtime/engineer-vanguard.glb`.

The remaining major gaps are not the standard Season 0 mesh batch. They are publishable Steam schema/icon registration for achievement rewards, weapon achievement source meshes, voice-pack audio banks, community presentation art, and large-model optimization.

## 1. Current Season 0 reward matrix

| Range | Category | 3D state | Runtime state | Remaining work |
|---|---|---:|---|---|
| `4100–4111` | Weapon skins | 12/12 | Mapped through `WEAPON_SKIN_MESHES`, loadout-compatible | Validate new large GLBs for performance and hand alignment |
| `4112–4119` | Chassis skins | 8/8 | Mapped through `CHASSIS_SKIN_GLB_MAP`, class-compatible | Validate class silhouettes, animation retargeting, and load time |
| `4120–4129` | Player decals/emblems | 2D by design | Loadout/UI decal sprites | Keep 2D; improve wall/card debug presentation only |
| `4130–4139` | Weapon charms | 10/10 | Armory weapon-bench GLBs | Validate attachment scale and occlusion |
| `4140–4147` | Rig overclock modules | 8/8 | Loadout/armory GLBs | Validate mount placement and gameplay modifier hooks |
| `4148–4149` | Voice packs | No 3D required | Stored as loadout metadata | Add actual voice banks and trigger routing |
| `4150–4151` | HUD themes | No 3D required | HUD theme state is wired | Add theme-specific preview cards if desired |
| `4152–4153` | Tracer/muzzle FX | No mesh required | Metadata exists | Implement live shader/particle renderers |
| `4154–4159` | Reagents/tokens | 2D by design | Economy/crafting/season systems | No 3D conversion needed |

## 2. Achievement reward state

The achievement-skin design range is **not yet a complete live reward catalog**.

### Meshes present and armory-mapped

- `5003` Subterranean Cartographer
- `5004` Pioneer Courier
- `5005` Old Iron
- `5007` Colossus of the Hive
- `5008` Gentle Titan
- `5011` Chen’s Undying
- `5012` Exodus Vanguard

### Still missing meshes

- `5001` Ghost Runner chassis
- `5002` Chrono-Drifter weapon
- `5006` Bunker Bastion weapon
- `5009` Archival Constructor weapon
- `5010` Hive-Weaver weapon

### Shared missing wiring

The generated `STEAM_ITEM_CATALOG` still does not contain `5001–5012`, but the local Vault lookup now has an explicit achievement-cosmetic registry for all 12 IDs, including model readiness status and honest base-icon fallback. The achievement engine now dispatches an unlock event and the main runtime grants the matching item through the local Vault path. Publishable Steam schema entries and bespoke icons remain separate release work.

Required completion order:

1. Add publishable catalog/schema metadata and 2D icons for `5001–5012`.
2. Add the five missing GLBs.
3. Add achievement-to-item grant mapping.
4. Add weapon compatibility entries for `5002`, `5006`, `5009`, and `5010`.
5. Add tests that prove unlock → inventory → loadout → 3D preview.

## 3. Community roster state

The 30 converted FBX files are present and match `manifest.json` exactly:

- Scout: 9
- Tank: 11
- Engineer: 10
- Unique gestures: 30 source actions, deduplicated into the gesture registry.
- All community GLB files exist.
- All community chassis IDs are present in loadout class filters and the Armory map.

The community models are lazy-loaded when the selected chassis or companion visual needs them. They are not globally preloaded, which is correct for normal boot: the batch is approximately **525.4 MB** compressed GLB payload by manifest size and approximately **1.1 GB** combined with the new Season 0 GLBs on disk.

Two limitations remain:

- Community skins use a class-base economy icon in `getItemCatalogEntry`, not unique 2D item art.
- `getRandomSurvivorNpc()` and `WandererManager` produce companion metadata and a GLB URL, but there is no direct `threeGame.js` consumer found that instantiates the active companion’s 3D overlay. The data system is present; the visual gameplay hook needs confirmation or implementation.

## 4. Debug showroom and museum

The showroom is now guarded behind an explicit debug token:

```js
game.buildDebugShowroom({ debug: true })
```

Calls without the token reject before importing/building the showroom scene. The normal debug entry points route through `window.__DEBUG__.openShowroom()` and the bulkhead transition. The showroom now loads while the door is closed, then reveals the completed gallery and teleports the player after the opening motion.

The debug-console `showroom` command was also routed through that same transition instead of building the gallery directly.

Decal coverage remains intentionally 2D:

- 10 cosmetic player decals are displayed as aligned 2D icon cards.
- 10 environmental wall decals, including `prop_torn_warning_poster`, are displayed on real debug wall panels with explicit wall normals.
- 13 floor decals are displayed through the production floor-overlay path.

## 5. Loading audit

### Correctly lazy/cached

- Player character templates are promise-cached by URL.
- Held weapon archetypes and weapon skins are promise-cached by URL.
- Armory GLBs are promise-cached and cloned before mutation.
- World prop GLBs are promise-cached and cloned before placement.
- Community chassis GLBs are selected-load assets, not boot-time loads.
- Debug showroom GLBs are dynamically imported and now require an explicit debug call.

### Intentionally eager

`main.js` starts `preloadEnemy3dTemplates()` after boot. It preloads the regular enemy roster and can precompile shaders. This is an intentional combat-stall mitigation, but it is still a significant boot-time/background GPU and memory cost.

### Highest-value loading improvements

1. Add a shared `AssetBudget`/telemetry record for fetch, parse, shader compile, and GPU upload time per GLB.
2. Gate enemy shader prewarm by hardware profile; Steam Deck should use a smaller roster or idle-time-only prewarm.
3. Add an LRU disposal policy for Armory/community previews so changing through 30 skins does not retain every parsed scene and texture indefinitely.
4. Add a per-asset load progress callback to Armory and debug galleries instead of one opaque loading state.
5. Generate optimized runtime variants for the largest new models. Several Season 0 GLBs are 20–46 MB each, which is much larger than the older optimized prop budget.
6. Keep community models out of normal boot and load only the active chassis, active companion, and the next likely selection.

## 6. 2D assets and gameplay juice still worth adding

### High-value missing runtime behavior

- Voice-pack WAV banks and event triggers for `4148–4149`.
- Voice-pack WAV banks and event triggers for `4148–4149`.
- Dedicated 2D icons for the 30 community skins.
- Dedicated 2D icons for achievement skins `5001–5012`.
- Unique NPC/companion nameplates and interaction markers for community wanderers.

### Still sprite/flat world dressing without exact active GLB routes

- Camp cot, camp crate, cookfires, bedrolls, crate stacks, chained crates, graves, laundry, warning placard, and lockdown shutter.
- Camp sandbags remain a valid remastered 2D asset; a 3D version is optional, not a missing current presentation asset.
- Cave lichen, intact/hatched eggs, spore pods, webs, wounded hive wall, and hive resin sac.
- Engineering bench, cryo sleep pod, ruptured coolant pump, alien feeding basin, and torn warning poster as exact bespoke 3D conversions.
- Small scatter/debris families and steam/spark effects.

Existing GLBs must not be duplicated in this queue: bunker supplies, storage locker, cave bones, queen throne, medical bed, surgical cart, diagnostic console, security barricade, specimen tanks, fabricator workstation, conduit hub, and the biomechanical facility set are already covered.

## 7. Release hygiene issue

The 47 FBX authoring files are now outside the customer-facing tree under `art/source/3d/{community,season}/`; both Blender conversion scripts read from those locations. Runtime GLBs stay in `public/3d/runtime/`, and the build-media audit passes.

One legacy runtime file is apparently unused:

- `public/3d/runtime/engineer-vanguard.glb`

Either wire it to a real Engineer route, mark it as an intentional legacy fallback, or remove it from the shipped payload after confirming no external packaging step consumes it.

## Validation performed

- Recursive GLB reference scan: 138 present / 137 referenced / 0 missing.
- Community manifest check: 30 metadata entries / 30 files / 0 missing.
- Season economy image audit: 71 visible catalog assets pass.
- Debug showroom/museum and wall-decal tests: passing.
- `audit-build-media.js`: passing after the authoring-source move.
- Asset load telemetry is available through `window.__HB_ASSET_LOAD_REPORT__()` for player-character and weapon template cache hits, durations, and failures.
