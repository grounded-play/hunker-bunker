/**
 * Shared Season 0 economy catalogs for the two debug QA galleries (`src/debugShowroom.js`'s
 * 4-wall stall grid and `src/debugMuseum.js`'s continuous hallway — see
 * docs/steam-and-multiplayer-live-integration/claude-context.md §2 for why both exist).
 *
 * These itemdef/URL lists were independently hand-duplicated in both files (built by two
 * different agents converging on the same design in the same session) — extracted here so
 * there's exactly one place to update when a new Season 0 weapon/charm/mod/chassis/decal
 * lands, instead of two copies that can silently drift apart. The older world-dressing
 * catalogs (enemies, props, wall/floor decals) are NOT unified here — each gallery's list has
 * genuinely different scope/spawn-path conventions (`createWorld3dModel` vs
 * `createScatterInstance`), so merging those would be a bigger, separate refactor.
 */
import { WEAPON_ARCHETYPES, WEAPON_SKIN_MESHES } from './player3dOverlay.js';
import { CHARM_GLB_MAP, MOD_GLB_MAP } from './armoryScene.js';

export { WEAPON_ARCHETYPES, WEAPON_SKIN_MESHES, CHARM_GLB_MAP, MOD_GLB_MAP };

// No 3D model exists yet for chassis skins (docs/season-zero-protocol/08 §2) — both galleries
// render these as icon-plane billboards instead.
export const CHASSIS_SKIN_ITEMDEFS = Object.freeze(['4112', '4113', '4114', '4115', '4116', '4117', '4118', '4119']);
export const COSMETIC_DECAL_ITEMDEFS = Object.freeze(['4120', '4121', '4122', '4123', '4124', '4125', '4126', '4127', '4128', '4129']);
