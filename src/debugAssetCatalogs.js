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
import { CHARM_GLB_MAP, MOD_GLB_MAP, CHASSIS_SKIN_GLB_MAP } from './armoryScene.js';

export const NPC_GLB_MAP = Object.freeze({
    kaelen: '/3d/runtime/new3ds/npc_kaelen.glb',
    martha: '/3d/runtime/new3ds/npc_martha.glb',
    briggs: '/3d/runtime/new3ds/chassis_trench_warden_heavy.glb',
    nahl: '/3d/runtime/new3ds/npc_nahl.glb',
    val: '/3d/runtime/new3ds/npc_val.glb',
    aria: '/3d/runtime/new3ds/npc_aria.glb',
    queen: '/3d/runtime/new3ds/npc_queen.glb',
    rhun: '/3d/runtime/new3ds/npc_alien_rhun.glb',
    vey: '/3d/runtime/new3ds/npc_alien_vey.glb',
    miner: '/3d/runtime/new3ds/npc_civilian_miner.glb',
    researcher: '/3d/runtime/new3ds/npc_civilian_researcher.glb',
    boss_martha: '/3d/runtime/new3ds/boss_corrupted_martha.glb',
    boss_briggs: '/3d/runtime/new3ds/boss_corrupted_briggs.glb'
});

export { WEAPON_ARCHETYPES, WEAPON_SKIN_MESHES, CHARM_GLB_MAP, MOD_GLB_MAP, CHASSIS_SKIN_GLB_MAP };

export const CHASSIS_SKIN_ITEMDEFS = Object.freeze(['4112', '4113', '4114', '4115', '4116', '4117', '4118', '4119']);
export const COSMETIC_DECAL_ITEMDEFS = Object.freeze(['4120', '4121', '4122', '4123', '4124', '4125', '4126', '4127', '4128', '4129']);
