import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import { WORLD_3D_MODELS } from './world3dOverlay.js';
import { ROOM_THEME_CATALOG } from './roomThemes.js';
import { PROP_VARIANT_GROUPS } from './propVariants.js';
import { PROP_INTERACTION_SPECS } from './propInteractions.js';
import { CAMP_PROP_MODELS, CAMP_DRESSING_MODELS } from './camp.js';
import { HIVE_PROP_MODELS, HIVE_SIGNATURE_PROPS } from './hiveSite.js';

const SPECIAL_SET_PIECE_PROPS = Object.freeze([
    // Purpose-built placements: random room dressing would weaken their read.
    'prop_base_defense_turret',
    'prop_biomech_arch',
    'prop_camp_cookfire',
    'prop_cave_queen_throne'
]);

const KEY_ART_INTERACTIVE_PROPS = Object.freeze([
    'prop_autopsy_dissection_slab',
    'prop_biomech_sphincter_hatch_vent',
    'prop_biomech_spore_umbilical_cable',
    'prop_biomech_tracheal_wall_pipe',
    'prop_ceiling_crane_hoist',
    'prop_coolant_drum_leaking_pool',
    'prop_corporate_saint_reliquary',
    'prop_decon_eyewash_shower_station',
    'prop_exhaust_blower_fan_hood',
    'prop_exosuit_docking_gantry',
    'prop_floor_conduit_bridge',
    'prop_floor_drainage_sump_trough',
    'prop_liturgical_terminal_lectern',
    'prop_maintenance_tool_cart',
    'prop_overhead_cage_fluorescent',
    'prop_oxygen_bottle_cascade_rack',
    'prop_pipe_organ_heat_exchanger',
    'prop_vertebral_cable_riser',
    'prop_votive_candle_shrine',
    'prop_wall_cable_tray_swag'
]);

function themedPropTypes() {
    const types = new Set(SPECIAL_SET_PIECE_PROPS);
    for (const theme of ROOM_THEME_CATALOG) {
        for (const pool of ['signatureProps', 'largeProps', 'smallProps', 'ambientProps', 'rareProps']) {
            for (const type of theme[pool] ?? []) types.add(type);
        }
    }
    for (const variants of Object.values(PROP_VARIANT_GROUPS)) {
        for (const type of variants) types.add(type);
    }
    // Camps and hives place these themselves (camp.js / hiveSite.js builders).
    for (const type of [...Object.values(CAMP_PROP_MODELS), ...Object.values(HIVE_PROP_MODELS)]) types.add(type);
    for (const specs of Object.values(CAMP_DRESSING_MODELS)) for (const spec of specs) types.add(spec.type);
    for (const specs of Object.values(HIVE_SIGNATURE_PROPS)) for (const spec of specs) if (spec.model) types.add(spec.model);
    return types;
}

describe('world prop usage coverage', () => {
    const runtimeProps = readdirSync(new URL('../public/3d/runtime/new3ds/', import.meta.url))
        .filter((file) => file.startsWith('prop_') && file.endsWith('.glb'))
        .map((file) => file.slice(0, -4))
        .sort();

    it('registers every shipped runtime prop and makes it reachable in a theme, variant, or bespoke set piece', () => {
        const reachable = themedPropTypes();
        for (const type of runtimeProps) {
            expect(WORLD_3D_MODELS[type], `${type} is not registered`).toBeDefined();
            expect(reachable.has(type), `${type} has no gameplay placement path`).toBe(true);
        }
    });

    it('gives every new key-art prop behavior, with the living umbilical handled by its attacker controller', () => {
        for (const type of KEY_ART_INTERACTIVE_PROPS) {
            expect(WORLD_3D_MODELS[type], `${type} is not registered`).toBeDefined();
            if (type === 'prop_biomech_spore_umbilical_cable') continue;
            expect(PROP_INTERACTION_SPECS[type], `${type} has no destruction behavior`).toBeDefined();
        }
    });
});
