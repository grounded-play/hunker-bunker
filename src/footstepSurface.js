/**
 * Which footstep bank a boot hits (2026-10-17 footstep pass).
 *
 * The step used to be guessed from the biome and from room-style strings,
 * looked up with a chunk size of 16 when chunks are 49 cells -- so the room
 * lookup read the wrong cell and most steps fell through to concrete. It now
 * reads the floor the player actually sees: the blended floor's per-cell
 * texture layer (src/floorSplat.js), its wetness, and any liquid, gore or
 * snow decal underfoot (ThreeGame.getTrackSurfaceAt).
 */
import { FLOOR_LAYER, surfaceForLayer } from './floorSplat.js';

export const FOOTSTEP_BANKS = Object.freeze([
    'footstep_concrete', 'footstep_metal_deck', 'footstep_metal_grate', 'footstep_ice_crunch',
    'footstep_snow', 'footstep_deep_snow', 'footstep_slush', 'footstep_gravel', 'footstep_mud',
    'footstep_wood_plank', 'footstep_soft_fabric', 'footstep_rubber_mat', 'footstep_bone_terrazzo',
    'footstep_hive_slime', 'footstep_organic', 'footstep_chitin', 'footstep_glass',
    'footstep_shell_casings', 'footstep_wet_puddle'
]);

// Every floor texture the blended floor can draw (FLOOR_SURFACES), by what a
// boot would hear on it.
export const SURFACE_FOOTSTEP = Object.freeze({
    tex_floor_deck_drain: 'footstep_metal_deck',
    tex_floor_concrete_stained: 'footstep_concrete',
    tex_floor_chitin_resin: 'footstep_hive_slime',
    tex_ground_regolith: 'footstep_gravel',
    tex_ground_rutted_dirt: 'footstep_gravel',
    tex_floor_slush_ice: 'footstep_slush',
    tex_floor_bone_terrazzo: 'footstep_bone_terrazzo',
    tex_floor_latex_mat: 'footstep_rubber_mat',
    tex_floor_camp_planks: 'footstep_wood_plank',
    tex_floor_grate_trench: 'footstep_metal_grate',
    tex_path_worn_deck: 'footstep_metal_deck',
    tex_path_polished_concrete: 'footstep_concrete',
    tex_path_packed_snow: 'footstep_snow',
    tex_path_slush_track: 'footstep_slush',
    tex_path_resin_trail: 'footstep_hive_slime',
    tex_path_trodden_spores: 'footstep_organic',
    tex_path_mud_track: 'footstep_mud',
    tex_path_gravel_scree: 'footstep_gravel',
    tex_shoulder_swept_grit: 'footstep_concrete',
    tex_shoulder_ice_crust: 'footstep_ice_crunch',
    tex_shoulder_resin_lip: 'footstep_hive_slime',
    tex_overlay_puddles: 'footstep_wet_puddle',
    tex_floor_blood_drain_grate: 'footstep_metal_grate',
    tex_floor_charred_crematorium: 'footstep_gravel',
    tex_floor_amniotic_slime_crust: 'footstep_hive_slime',
    tex_floor_frostbitten_trench: 'footstep_ice_crunch',
    tex_floor_battery_acid_corrosion: 'footstep_concrete',
    tex_floor_chitinous_eggshell_drift: 'footstep_chitin',
    tex_floor_cannibal_butchery_planks: 'footstep_wood_plank',
    tex_floor_necrotic_bio_sludge: 'footstep_hive_slime',
    tex_floor_shattered_safety_glass: 'footstep_glass',
    tex_floor_hydraulic_oil_slick: 'footstep_wet_puddle',
    tex_floor_tallow_spore_fungus: 'footstep_organic',
    tex_floor_scorched_plasma_crater: 'footstep_gravel',
    tex_floor_cryo_shattered_permafrost: 'footstep_ice_crunch',
    tex_floor_royal_jelly_calcification: 'footstep_bone_terrazzo',
    tex_floor_spent_casings_drift: 'footstep_shell_casings',
    tex_floor_corporate_decon_foam: 'footstep_rubber_mat',
    tex_camp_private_worn_felt: 'footstep_soft_fabric',
    tex_camp_robbed_contact_dust: 'footstep_gravel',
    tex_ceiling_service_condensate: 'footstep_metal_deck',
    tex_covenant_two_hand_ivory: 'footstep_bone_terrazzo',
    tex_evac_coldchain_frost_deck: 'footstep_ice_crunch',
    tex_evac_queue_burnished_deck: 'footstep_metal_deck',
    tex_flood_tide_mineral: 'footstep_concrete',
    tex_hazard_routed_conduit_wall: 'footstep_metal_deck',
    tex_meridian_covenant_bus_floor: 'footstep_metal_deck',
    tex_moving_floor_recess_grease: 'footstep_metal_deck',
    tex_recruited_packdown_canvas_floor: 'footstep_soft_fabric',
    tex_refusal_cautery_scale: 'footstep_chitin',
    tex_secret_memory_membrane: 'footstep_organic',
    tex_tallow_red_mold_filter_floor: 'footstep_organic',
    tex_turned_resin_ingress: 'footstep_hive_slime',
    tex_vesper_oiled_tally_deck: 'footstep_wood_plank'
});

// The base layers (cells with no authored surface texture).
const LAYER_FOOTSTEP = Object.freeze({
    [FLOOR_LAYER.BASE]: 'footstep_concrete',
    [FLOOR_LAYER.GROUND]: 'footstep_gravel',
    [FLOOR_LAYER.UTILITY]: 'footstep_metal_deck',
    [FLOOR_LAYER.MEDICAL]: 'footstep_rubber_mat',
    [FLOOR_LAYER.CRYO]: 'footstep_ice_crunch',
    [FLOOR_LAYER.BIO]: 'footstep_organic',
    [FLOOR_LAYER.HALLWAY]: 'footstep_metal_deck',
    [FLOOR_LAYER.CAMP]: 'footstep_wood_plank',
    [FLOOR_LAYER.HIVE]: 'footstep_hive_slime',
    [FLOOR_LAYER.ROOM]: 'footstep_concrete'
});

// What lies on the floor (getTrackSurfaceAt) wins over the floor itself.
const UNDERFOOT_FOOTSTEP = Object.freeze({
    water: 'footstep_wet_puddle',
    oil: 'footstep_wet_puddle',
    slime: 'footstep_hive_slime',
    blood: 'footstep_hive_slime'
});

// Wetness (0-1, the splat's 4th channel) above which a solid floor also
// splashes. Floors that are already wet-sounding keep their own bank.
export const WET_SPLASH_THRESHOLD = 0.55;
const ALREADY_WET = new Set(['footstep_wet_puddle', 'footstep_slush', 'footstep_mud', 'footstep_hive_slime']);

/**
 * @param {object} at
 * @param {number} [at.floorLayer] - the blended floor's layer index for the cell
 * @param {number} [at.wetness] - 0..1
 * @param {string|null} [at.underfoot] - getTrackSurfaceAt: water|oil|slime|blood|snow
 * @param {boolean} [at.outdoors]
 * @param {string} [at.biome] - fallback when no floor data is loaded
 * @returns {{ key: string, splash: boolean, source: string }}
 */
export function resolveFootstepSurface({ floorLayer = null, wetness = 0, underfoot = null, outdoors = false, biome = '' } = {}) {
    if (UNDERFOOT_FOOTSTEP[underfoot]) {
        return { key: UNDERFOOT_FOOTSTEP[underfoot], splash: false, source: `underfoot:${underfoot}` };
    }
    let key = null;
    let source = 'fallback';
    if (Number.isInteger(floorLayer) && floorLayer !== FLOOR_LAYER.NONE) {
        const surface = surfaceForLayer(floorLayer);
        key = surface ? SURFACE_FOOTSTEP[surface.id] ?? LAYER_FOOTSTEP[surface.fallback] : LAYER_FOOTSTEP[floorLayer];
        source = surface ? `surface:${surface.id}` : `layer:${floorLayer}`;
    }
    if (!key && (outdoors || underfoot === 'snow')) {
        key = 'footstep_deep_snow';
        source = 'outdoors';
    }
    if (!key) {
        const b = String(biome).toLowerCase();
        key = b === 'cryo' ? 'footstep_ice_crunch' : b === 'bio' ? 'footstep_organic' : b === 'camp' ? 'footstep_wood_plank' : 'footstep_concrete';
        source = `biome:${b || 'none'}`;
    }
    const splash = Number(wetness) >= WET_SPLASH_THRESHOLD && !ALREADY_WET.has(key);
    return { key, splash, source };
}
