import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { assetUrl } from './assetUrl.js';
import { recordAssetLoad } from './assetLoadTelemetry.js';
import { measurePerfPhase } from './perfPhases.js';
import { useSinglePassForFlatMaterials } from './singlePassFlatMaterials.js';

// docs/armory-and-class-weapons-worklog.md — gltf-transform's optimize pass applies
// EXT_meshopt_compression; GLTFLoader throws without this registered first.
function createGltfLoader() {
    return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
}

export const WORLD_3D_MODELS = Object.freeze({
    // Kenney modular kits, CC0, restyled to the game palette by
    // scripts/blender/restyle_kit_pieces.py. The cave and space kits share an
    // identical 40-piece grammar, so both skins expose the same key suffixes and
    // a generator can swap biome without changing its socket logic.
    // 3D-only by design: these have no billboard fallback, which is why kit_
    // joins WORLD_3D_ONLY_PREFIXES above.
    kit_cave_corridor_corner: { url: '/3d/runtime/kits/modular-cave-kit/corridor-corner.glb', height: 3.0, yaw: 0 },
    kit_cave_corridor_end: { url: '/3d/runtime/kits/modular-cave-kit/corridor-end.glb', height: 3.0, yaw: 0 },
    kit_cave_corridor_intersection: { url: '/3d/runtime/kits/modular-cave-kit/corridor-intersection.glb', height: 3.0, yaw: 0 },
    kit_cave_corridor_junction: { url: '/3d/runtime/kits/modular-cave-kit/corridor-junction.glb', height: 3.0, yaw: 0 },
    kit_cave_corridor_transition: { url: '/3d/runtime/kits/modular-cave-kit/corridor-transition.glb', height: 3.0, yaw: 0 },
    kit_cave_corridor_wide_corner: { url: '/3d/runtime/kits/modular-cave-kit/corridor-wide-corner.glb', height: 3.0, yaw: 0 },
    kit_cave_corridor_wide_end: { url: '/3d/runtime/kits/modular-cave-kit/corridor-wide-end.glb', height: 3.0, yaw: 0 },
    kit_cave_corridor_wide_intersection: { url: '/3d/runtime/kits/modular-cave-kit/corridor-wide-intersection.glb', height: 3.0, yaw: 0 },
    kit_cave_corridor_wide_junction: { url: '/3d/runtime/kits/modular-cave-kit/corridor-wide-junction.glb', height: 3.0, yaw: 0 },
    kit_cave_corridor_wide: { url: '/3d/runtime/kits/modular-cave-kit/corridor-wide.glb', height: 3.0, yaw: 0 },
    kit_cave_corridor: { url: '/3d/runtime/kits/modular-cave-kit/corridor.glb', height: 3.0, yaw: 0 },
    kit_cave_gate_metal_bars: { url: '/3d/runtime/kits/modular-cave-kit/gate-metal-bars.glb', height: 2.6, yaw: 0 },
    kit_cave_gate_overhang: { url: '/3d/runtime/kits/modular-cave-kit/gate-overhang.glb', height: 2.6, yaw: 0 },
    kit_cave_gate_rock: { url: '/3d/runtime/kits/modular-cave-kit/gate-rock.glb', height: 2.6, yaw: 0 },
    kit_cave_gate: { url: '/3d/runtime/kits/modular-cave-kit/gate.glb', height: 2.6, yaw: 0 },
    kit_cave_ladder: { url: '/3d/runtime/kits/modular-cave-kit/ladder.glb', height: 2.2, yaw: 0 },
    kit_cave_room_corner: { url: '/3d/runtime/kits/modular-cave-kit/room-corner.glb', height: 3.0, yaw: 0 },
    kit_cave_room_large_variation: { url: '/3d/runtime/kits/modular-cave-kit/room-large-variation.glb', height: 3.0, yaw: 0 },
    kit_cave_room_large: { url: '/3d/runtime/kits/modular-cave-kit/room-large.glb', height: 3.0, yaw: 0 },
    kit_cave_room_small_variation: { url: '/3d/runtime/kits/modular-cave-kit/room-small-variation.glb', height: 3.0, yaw: 0 },
    kit_cave_room_small: { url: '/3d/runtime/kits/modular-cave-kit/room-small.glb', height: 3.0, yaw: 0 },
    kit_cave_room_wide_variation: { url: '/3d/runtime/kits/modular-cave-kit/room-wide-variation.glb', height: 3.0, yaw: 0 },
    kit_cave_room_wide: { url: '/3d/runtime/kits/modular-cave-kit/room-wide.glb', height: 3.0, yaw: 0 },
    kit_cave_stairs_wide: { url: '/3d/runtime/kits/modular-cave-kit/stairs-wide.glb', height: 2.2, yaw: 0 },
    kit_cave_stairs: { url: '/3d/runtime/kits/modular-cave-kit/stairs.glb', height: 2.2, yaw: 0 },
    kit_cave_template_corner: { url: '/3d/runtime/kits/modular-cave-kit/template-corner.glb', height: 3.0, yaw: 0 },
    kit_cave_template_detail: { url: '/3d/runtime/kits/modular-cave-kit/template-detail.glb', height: 3.0, yaw: 0 },
    kit_cave_template_floor_big: { url: '/3d/runtime/kits/modular-cave-kit/template-floor-big.glb', height: 0.25, yaw: 0 },
    kit_cave_template_floor_detail_a: { url: '/3d/runtime/kits/modular-cave-kit/template-floor-detail-a.glb', height: 0.25, yaw: 0 },
    kit_cave_template_floor_detail: { url: '/3d/runtime/kits/modular-cave-kit/template-floor-detail.glb', height: 0.25, yaw: 0 },
    kit_cave_template_floor_layer_hole: { url: '/3d/runtime/kits/modular-cave-kit/template-floor-layer-hole.glb', height: 0.25, yaw: 0 },
    kit_cave_template_floor_layer_raised: { url: '/3d/runtime/kits/modular-cave-kit/template-floor-layer-raised.glb', height: 0.25, yaw: 0 },
    kit_cave_template_floor_layer: { url: '/3d/runtime/kits/modular-cave-kit/template-floor-layer.glb', height: 0.25, yaw: 0 },
    kit_cave_template_floor: { url: '/3d/runtime/kits/modular-cave-kit/template-floor.glb', height: 0.25, yaw: 0 },
    kit_cave_template_wall_corner: { url: '/3d/runtime/kits/modular-cave-kit/template-wall-corner.glb', height: 2.6, yaw: 0 },
    kit_cave_template_wall_detail_a: { url: '/3d/runtime/kits/modular-cave-kit/template-wall-detail-a.glb', height: 2.6, yaw: 0 },
    kit_cave_template_wall_half: { url: '/3d/runtime/kits/modular-cave-kit/template-wall-half.glb', height: 2.6, yaw: 0 },
    kit_cave_template_wall_stairs: { url: '/3d/runtime/kits/modular-cave-kit/template-wall-stairs.glb', height: 2.6, yaw: 0 },
    kit_cave_template_wall_top: { url: '/3d/runtime/kits/modular-cave-kit/template-wall-top.glb', height: 2.6, yaw: 0 },
    kit_cave_template_wall: { url: '/3d/runtime/kits/modular-cave-kit/template-wall.glb', height: 2.6, yaw: 0 },
    kit_space_cables: { url: '/3d/runtime/kits/modular-space-kit/cables.glb', height: 3.0, yaw: 0 },
    kit_space_corridor_corner: { url: '/3d/runtime/kits/modular-space-kit/corridor-corner.glb', height: 3.0, yaw: 0 },
    kit_space_corridor_end: { url: '/3d/runtime/kits/modular-space-kit/corridor-end.glb', height: 3.0, yaw: 0 },
    kit_space_corridor_intersection: { url: '/3d/runtime/kits/modular-space-kit/corridor-intersection.glb', height: 3.0, yaw: 0 },
    kit_space_corridor_junction: { url: '/3d/runtime/kits/modular-space-kit/corridor-junction.glb', height: 3.0, yaw: 0 },
    kit_space_corridor_transition: { url: '/3d/runtime/kits/modular-space-kit/corridor-transition.glb', height: 3.0, yaw: 0 },
    kit_space_corridor_wide_corner: { url: '/3d/runtime/kits/modular-space-kit/corridor-wide-corner.glb', height: 3.0, yaw: 0 },
    kit_space_corridor_wide_end: { url: '/3d/runtime/kits/modular-space-kit/corridor-wide-end.glb', height: 3.0, yaw: 0 },
    kit_space_corridor_wide_intersection: { url: '/3d/runtime/kits/modular-space-kit/corridor-wide-intersection.glb', height: 3.0, yaw: 0 },
    kit_space_corridor_wide_junction: { url: '/3d/runtime/kits/modular-space-kit/corridor-wide-junction.glb', height: 3.0, yaw: 0 },
    kit_space_corridor_wide: { url: '/3d/runtime/kits/modular-space-kit/corridor-wide.glb', height: 3.0, yaw: 0 },
    kit_space_corridor: { url: '/3d/runtime/kits/modular-space-kit/corridor.glb', height: 3.0, yaw: 0 },
    kit_space_gate_door_window: { url: '/3d/runtime/kits/modular-space-kit/gate-door-window.glb', height: 2.6, yaw: 0 },
    kit_space_gate_door: { url: '/3d/runtime/kits/modular-space-kit/gate-door.glb', height: 2.6, yaw: 0 },
    kit_space_gate_lasers: { url: '/3d/runtime/kits/modular-space-kit/gate-lasers.glb', height: 2.6, yaw: 0 },
    kit_space_gate: { url: '/3d/runtime/kits/modular-space-kit/gate.glb', height: 2.6, yaw: 0 },
    kit_space_room_corner: { url: '/3d/runtime/kits/modular-space-kit/room-corner.glb', height: 3.0, yaw: 0 },
    kit_space_room_large_variation: { url: '/3d/runtime/kits/modular-space-kit/room-large-variation.glb', height: 3.0, yaw: 0 },
    kit_space_room_large: { url: '/3d/runtime/kits/modular-space-kit/room-large.glb', height: 3.0, yaw: 0 },
    kit_space_room_small_variation: { url: '/3d/runtime/kits/modular-space-kit/room-small-variation.glb', height: 3.0, yaw: 0 },
    kit_space_room_small: { url: '/3d/runtime/kits/modular-space-kit/room-small.glb', height: 3.0, yaw: 0 },
    kit_space_room_wide_variation: { url: '/3d/runtime/kits/modular-space-kit/room-wide-variation.glb', height: 3.0, yaw: 0 },
    kit_space_room_wide: { url: '/3d/runtime/kits/modular-space-kit/room-wide.glb', height: 3.0, yaw: 0 },
    kit_space_stairs_wide: { url: '/3d/runtime/kits/modular-space-kit/stairs-wide.glb', height: 2.2, yaw: 0 },
    kit_space_stairs: { url: '/3d/runtime/kits/modular-space-kit/stairs.glb', height: 2.2, yaw: 0 },
    kit_space_template_corner: { url: '/3d/runtime/kits/modular-space-kit/template-corner.glb', height: 3.0, yaw: 0 },
    kit_space_template_detail: { url: '/3d/runtime/kits/modular-space-kit/template-detail.glb', height: 3.0, yaw: 0 },
    kit_space_template_floor_big: { url: '/3d/runtime/kits/modular-space-kit/template-floor-big.glb', height: 0.25, yaw: 0 },
    kit_space_template_floor_detail_a: { url: '/3d/runtime/kits/modular-space-kit/template-floor-detail-a.glb', height: 0.25, yaw: 0 },
    kit_space_template_floor_detail: { url: '/3d/runtime/kits/modular-space-kit/template-floor-detail.glb', height: 0.25, yaw: 0 },
    kit_space_template_floor_layer_hole: { url: '/3d/runtime/kits/modular-space-kit/template-floor-layer-hole.glb', height: 0.25, yaw: 0 },
    kit_space_template_floor_layer_raised: { url: '/3d/runtime/kits/modular-space-kit/template-floor-layer-raised.glb', height: 0.25, yaw: 0 },
    kit_space_template_floor_layer: { url: '/3d/runtime/kits/modular-space-kit/template-floor-layer.glb', height: 0.25, yaw: 0 },
    kit_space_template_floor: { url: '/3d/runtime/kits/modular-space-kit/template-floor.glb', height: 0.25, yaw: 0 },
    kit_space_template_wall_corner: { url: '/3d/runtime/kits/modular-space-kit/template-wall-corner.glb', height: 2.6, yaw: 0 },
    kit_space_template_wall_detail_a: { url: '/3d/runtime/kits/modular-space-kit/template-wall-detail-a.glb', height: 2.6, yaw: 0 },
    kit_space_template_wall_half: { url: '/3d/runtime/kits/modular-space-kit/template-wall-half.glb', height: 2.6, yaw: 0 },
    kit_space_template_wall_stairs: { url: '/3d/runtime/kits/modular-space-kit/template-wall-stairs.glb', height: 2.6, yaw: 0 },
    kit_space_template_wall_top: { url: '/3d/runtime/kits/modular-space-kit/template-wall-top.glb', height: 2.6, yaw: 0 },
    kit_space_template_wall: { url: '/3d/runtime/kits/modular-space-kit/template-wall.glb', height: 2.6, yaw: 0 },
    broken_scout_ship: { url: '/3d/runtime/broken-scout-ship.glb', height: 1.35, yaw: 0 },
    broken_tank_ship: { url: '/3d/runtime/broken-tank-ship.glb', height: 1.35, yaw: 0 },
    broken_engineer_ship: { url: '/3d/runtime/broken-engineer-ship.glb', height: 1.35, yaw: 0 },
    base_console: { url: '/3d/runtime/console.glb', height: 1.05, yaw: 0 },
    o2_generator: { url: '/3d/runtime/o2-generator.glb', height: 1.2, yaw: 0 },
    hull_matrix: { url: '/3d/runtime/hull-matrix.glb', height: 1.15, yaw: 0 },
    radar: { url: '/3d/runtime/radar.glb', height: 1.05, yaw: 0 },
    fusion_generator: { url: '/3d/runtime/fusion-generator.glb', height: 1.1, yaw: 0 },
    basic_pile: { url: '/3d/runtime/basic-pile.glb', height: 0.42, yaw: 0 },
    storage_locker: { url: '/3d/runtime/storage-locker.glb', height: 1.25, yaw: 0 },
    frozen_tanker: { url: '/3d/runtime/frozen-tanker.glb', height: 1.05, yaw: 0 },
    bunker_junk_rare: { url: '/3d/runtime/new3ds/bunker_junk_rare.glb', height: 0.48, yaw: 0 },
    bunker_junk_uncommon: { url: '/3d/runtime/new3ds/bunker_junk_uncommon.glb', height: 0.42, yaw: 0 },
    prop_bunker_supplies: { url: '/3d/runtime/new3ds/prop_bunker_supplies.glb', height: 0.72, yaw: 0 },
    prop_specimen_tank: { url: '/3d/runtime/new3ds/prop_specimen_tank.glb', height: 1.35, yaw: 0 },
    prop_broken_specimen_tank: { url: '/3d/runtime/new3ds/prop_broken_specimen_tank.glb', height: 1.15, yaw: 0 },
    prop_surgical_cart: { url: '/3d/runtime/new3ds/prop_surgical_cart.glb', height: 0.8, yaw: 0 },
    prop_medical_bed: { url: '/3d/runtime/new3ds/prop_medical_bed.glb', height: 0.7, yaw: 0 },
    prop_diagnostic_console: { url: '/3d/runtime/new3ds/prop_diagnostic_console.glb', height: 1.05, yaw: 0 },
    prop_security_barricade: { url: '/3d/runtime/new3ds/prop_security_barricade.glb', height: 0.82, yaw: 0 },
    prop_conduit_hub: { url: '/3d/runtime/new3ds/prop_conduit_hub.glb', height: 0.78, yaw: 0 },
    prop_cave_bones: { url: '/3d/runtime/new3ds/prop_cave_bones.glb', height: 0.34, yaw: 0 },
    prop_cave_queen_throne: { url: '/3d/runtime/new3ds/prop_cave_queen_throne.glb', height: 2.0, yaw: 0 },
    prop_biomech_arch: { url: '/3d/runtime/new3ds/prop_biomech_arch.glb', height: 2.35, yaw: 0 },
    prop_ammo_crate_stack: { url: '/3d/runtime/new3ds/prop_ammo_crate_stack.glb', height: 0.85, yaw: 0 },
    prop_biomech_flesh_locker: { url: '/3d/runtime/new3ds/prop_biomech_flesh_locker.glb', height: 1.35, yaw: 0 },
    prop_biomech_incubator: { url: '/3d/runtime/new3ds/prop_biomech_incubator.glb', height: 1.45, yaw: 0 },
    prop_biomech_neural_synapse: { url: '/3d/runtime/new3ds/prop_biomech_neural_synapse.glb', height: 1.40, yaw: 0 },
    prop_biomech_respirator: { url: '/3d/runtime/new3ds/prop_biomech_respirator.glb', height: 1.30, yaw: 0 },
    prop_biomech_sphincter_trap: { url: '/3d/runtime/new3ds/prop_biomech_sphincter_trap.glb', height: 0.80, yaw: 0 },
    prop_biomech_triage_cradle: { url: '/3d/runtime/new3ds/prop_biomech_triage_cradle.glb', height: 0.95, yaw: 0 },
    prop_fabricator_workstation: { url: '/3d/runtime/new3ds/prop_fabricator_workstation.glb', height: 1.20, yaw: 0 },
    prop_laser_trap_emitter: { url: '/3d/runtime/new3ds/prop_laser_trap_emitter.glb', height: 0.75, yaw: 0 },
    prop_o2_filter_vat: { url: '/3d/runtime/new3ds/prop_o2_filter_vat.glb', height: 1.40, yaw: 0 },
    prop_tesla_coil_node: { url: '/3d/runtime/new3ds/prop_tesla_coil_node.glb', height: 1.45, yaw: 0 },
    prop_vital_monitor: { url: '/3d/runtime/new3ds/prop_vital_monitor.glb', height: 1.10, yaw: 0 },
    prop_base_defense_turret: { url: '/3d/runtime/new3ds/prop_base_defense_turret.glb', height: 1.25, yaw: 0 },
    prop_body_empty_exosuit: { url: '/3d/runtime/new3ds/prop_body_empty_exosuit.glb', height: 0.75, yaw: 0 },
    prop_body_human_frozen: { url: '/3d/runtime/new3ds/prop_body_human_frozen.glb', height: 0.55, yaw: 0 },
    cybersnail_dead: { url: '/3d/runtime/new3ds/cybersnail_dead.glb', height: 0.50, yaw: 0 },
    npc_alien_rhun: { url: '/3d/runtime/new3ds/npc_alien_rhun.glb', height: 1.95, yaw: 0 },
    npc_alien_vey: { url: '/3d/runtime/new3ds/npc_alien_vey.glb', height: 1.70, yaw: 0 },
    npc_civilian_miner: { url: '/3d/runtime/new3ds/npc_civilian_miner.glb', height: 1.80, yaw: 0 },
    npc_civilian_researcher: { url: '/3d/runtime/new3ds/npc_civilian_researcher.glb', height: 1.75, yaw: 0 },
    npc_martha: { url: '/3d/runtime/new3ds/npc_martha.glb', height: 1.75, yaw: 0 },
    npc_kaelen: { url: '/3d/runtime/new3ds/npc_kaelen.glb', height: 1.80, yaw: 0 },
    npc_briggs: { url: '/3d/runtime/new3ds/chassis_trench_warden_heavy.glb', height: 1.85, yaw: 0 },
    npc_val: { url: '/3d/runtime/new3ds/npc_val.glb', height: 1.75, yaw: 0 },
    npc_nahl: { url: '/3d/runtime/new3ds/npc_nahl.glb', height: 1.75, yaw: 0 },
    npc_aria: { url: '/3d/runtime/new3ds/npc_aria.glb', height: 1.80, yaw: 0 },
    npc_queen: { url: '/3d/runtime/new3ds/npc_queen.glb', height: 2.10, yaw: 0 },
    secret_mayor_tina: { url: '/3d/runtime/secrets/mayor-tina.glb', height: 1.72, yaw: Math.PI },
    secret_teacup_roach: { url: '/3d/runtime/secrets/teacup-roach.glb', height: 1.18, yaw: Math.PI },
    prop_camp_cookfire: { url: '/3d/runtime/new3ds/prop_fabricator_workstation.glb', height: 0.85, yaw: 0 },
    prop_camp_crates: { url: '/3d/runtime/new3ds/prop_bunker_supplies.glb', height: 0.75, yaw: 0 },
    prop_camp_sandbags: { url: '/3d/runtime/new3ds/prop_security_barricade.glb', height: 0.82, yaw: 0 },
    prop_camp_cot: { url: '/3d/runtime/new3ds/prop_camp_cot.glb', height: 0.65, yaw: 0 },
    prop_camp_crate: { url: '/3d/runtime/new3ds/prop_camp_crate.glb', height: 0.75, yaw: 0 },
    prop_hive_resin_sac: { url: '/3d/runtime/new3ds/prop_hive_resin_sac.glb', height: 1.10, yaw: 0 },
    scatter_bolts: { url: '/3d/runtime/new3ds/scatter_bolts.glb', height: 0.25, yaw: 0 },
    scatter_cable_coil: { url: '/3d/runtime/new3ds/scatter_cable_coil.glb', height: 0.30, yaw: 0 },
    state_barricade_improvised_1: { url: '/3d/runtime/new3ds/state_barricade_improvised_1.glb', height: 0.85, yaw: 0 },
    state_barricade_improvised_2: { url: '/3d/runtime/new3ds/state_barricade_improvised_2.glb', height: 0.85, yaw: 0 },
    state_growth_overrun_1: { url: '/3d/runtime/new3ds/state_growth_overrun_1.glb', height: 1.20, yaw: 0 },
    state_growth_overrun_2: { url: '/3d/runtime/new3ds/state_growth_overrun_2.glb', height: 1.20, yaw: 0 },
    body_empty_exosuit: { url: '/3d/runtime/new3ds/body_empty_exosuit.glb', height: 0.75, yaw: 0 },
    body_frozen_human: { url: '/3d/runtime/new3ds/body_frozen_human.glb', height: 0.75, yaw: 0 },
    arch_bulkhead_frame: { url: '/3d/runtime/new3ds/arch_bulkhead_frame.glb', height: 2.2, yaw: 0 },
    arch_deco_archway_grand_01: { url: '/3d/runtime/new3ds/arch_deco_archway_grand_01.glb', height: 2.6, yaw: 0 },
    arch_deco_archway_grand_02: { url: '/3d/runtime/new3ds/arch_deco_archway_grand_02.glb', height: 2.6, yaw: 0 },
    arch_deco_archway_grand_03: { url: '/3d/runtime/new3ds/arch_deco_archway_grand_03.glb', height: 2.6, yaw: 0 },
    arch_deco_archway_grand_04: { url: '/3d/runtime/new3ds/arch_deco_archway_grand_04.glb', height: 2.6, yaw: 0 },
    arch_niche_shrine: { url: '/3d/runtime/new3ds/arch_niche_shrine.glb', height: 1.8, yaw: 0 },
    arch_pillar_buttress_01: { url: '/3d/runtime/new3ds/arch_pillar_buttress_01.glb', height: 2.2, yaw: 0 },
    arch_pillar_buttress_02: { url: '/3d/runtime/new3ds/arch_pillar_buttress_02.glb', height: 2.2, yaw: 0 },
    arch_pillar_buttress_03: { url: '/3d/runtime/new3ds/arch_pillar_buttress_03.glb', height: 2.2, yaw: 0 },
    arch_pillar_buttress_04: { url: '/3d/runtime/new3ds/arch_pillar_buttress_04.glb', height: 2.2, yaw: 0 },
    arch_rib_ceiling_vault_01: { url: '/3d/runtime/new3ds/arch_rib_ceiling_vault_01.glb', height: 2.4, yaw: 0 },
    arch_rib_ceiling_vault_02: { url: '/3d/runtime/new3ds/arch_rib_ceiling_vault_02.glb', height: 2.4, yaw: 0 },
    arch_rib_ceiling_vault_03: { url: '/3d/runtime/new3ds/arch_rib_ceiling_vault_03.glb', height: 2.4, yaw: 0 },
    arch_window_stained: { url: '/3d/runtime/new3ds/arch_window_stained.glb', height: 1.9, yaw: 0 },
    fixture_clock_dead: { url: '/3d/runtime/new3ds/fixture_clock_dead.glb', height: 0.7, yaw: 0 },
    fixture_sconce_vine: { url: '/3d/runtime/new3ds/fixture_sconce_vine.glb', height: 0.65, yaw: 0 },
    state_column_shattered: { url: '/3d/runtime/new3ds/state_column_shattered.glb', height: 1.6, yaw: 0 },
    state_wall_breached_01: { url: '/3d/runtime/new3ds/state_wall_breached_01.glb', height: 2.0, yaw: 0 },
    state_wall_breached_02: { url: '/3d/runtime/new3ds/state_wall_breached_02.glb', height: 2.0, yaw: 0 },
    state_wall_breached_03: { url: '/3d/runtime/new3ds/state_wall_breached_03.glb', height: 2.0, yaw: 0 },
    prop_chair_operator_wrecked: { url: '/3d/runtime/new3ds/prop_chair_operator_wrecked.glb', height: 1.10, yaw: 0 },
    prop_conduit_junction_box: { url: '/3d/runtime/new3ds/prop_conduit_junction_box.glb', height: 0.90, yaw: 0 },
    prop_flesh_steel_coffin: { url: '/3d/runtime/new3ds/prop_flesh_steel_coffin.glb', height: 1.40, yaw: 0 },
    prop_flesh_steel_cradle: { url: '/3d/runtime/new3ds/prop_flesh_steel_cradle.glb', height: 0.95, yaw: 0 },
    prop_flesh_steel_inhaler: { url: '/3d/runtime/new3ds/prop_flesh_steel_inhaler.glb', height: 1.30, yaw: 0 },
    prop_fungal_mycelium_loom: { url: '/3d/runtime/new3ds/prop_fungal_mycelium_loom.glb', height: 1.85, yaw: 0 },
    prop_fungal_resin_basin: { url: '/3d/runtime/new3ds/prop_fungal_resin_basin.glb', height: 0.85, yaw: 0 },
    prop_fungal_spore_dispenser: { url: '/3d/runtime/new3ds/prop_fungal_spore_dispenser.glb', height: 1.25, yaw: 0 },
    prop_fungal_tendril_altar: { url: '/3d/runtime/new3ds/prop_fungal_tendril_altar.glb', height: 2.10, yaw: 0 },
    prop_icey_frost_manifold: { url: '/3d/runtime/new3ds/prop_icey_frost_manifold.glb', height: 1.20, yaw: 0 },
    prop_icey_frost_vent: { url: '/3d/runtime/new3ds/prop_icey_frost_vent.glb', height: 1.10, yaw: 0 },
    prop_icey_thermal_pod: { url: '/3d/runtime/new3ds/prop_icey_thermal_pod.glb', height: 1.40, yaw: 0 },
    prop_light_cluster_dripping: { url: '/3d/runtime/new3ds/prop_light_cluster_dripping.glb', height: 1.20, yaw: 0 },
    prop_locker_bulged: { url: '/3d/runtime/new3ds/prop_locker_bulged.glb', height: 1.35, yaw: 0 },
    prop_pipe_rupture: { url: '/3d/runtime/new3ds/prop_pipe_rupture.glb', height: 0.85, yaw: 0 },
    prop_shrine_plinth_broken: { url: '/3d/runtime/new3ds/prop_shrine_plinth_broken.glb', height: 1.25, yaw: 0 },
    prop_storage_drum_dented: { url: '/3d/runtime/new3ds/prop_storage_drum_dented.glb', height: 0.80, yaw: 0 },
    prop_terminal_ruptured: { url: '/3d/runtime/new3ds/prop_terminal_ruptured.glb', height: 1.15, yaw: 0 },
    prop_valve_wheel_fused: { url: '/3d/runtime/new3ds/prop_valve_wheel_fused.glb', height: 0.75, yaw: 0 },
    prop_vent_grate_exploded: { url: '/3d/runtime/new3ds/prop_vent_grate_exploded.glb', height: 0.65, yaw: 0 }
});

// Metric-scale set-piece shells are deliberately separate from prop models.
// Props are height-normalized and recentered; structures must preserve the
// Blender-authored 1 unit = 1 metre scale and module-NW origin.
export const WORLD_3D_STRUCTURES = Object.freeze({
    structure_reference_49m: Object.freeze({
        url: '/3d/runtime/structures/structure_reference_49m.glb',
        collision: '/3d/runtime/structures/structure_reference_49m.collision.glb',
        footprint: Object.freeze({ w: 49, d: 49 }),
        origin: 'module-nw-corner',
        yaw: 0,
        setpiece: 'structure-loader-proof',
        module: 'reference',
        stage: 'test'
    })
});

const templates = new Map();
export const WORLD_3D_FACING_YAW = Math.PI;
export const WORLD_3D_SWAP_PREFETCH_DISTANCE = 28;

function loadTemplate(url) {
    if (!templates.has(url)) {
        const startedAt = performance.now();
        // This is end-to-end asynchronous loader latency (including parsing
        // and decode), not a synchronous phase or proof of main-thread work.
        const promise = createGltfLoader().loadAsync(assetUrl(url)).then((gltf) => {
            recordAssetLoad(url, { group: 'world-model', durationMs: performance.now() - startedAt });
            return gltf;
        }).catch((err) => {
            recordAssetLoad(url, {
                group: 'world-model', status: 'failed', error: err,
                durationMs: performance.now() - startedAt
            });
            templates.delete(url);
            throw err;
        });
        templates.set(url, promise);
    } else {
        recordAssetLoad(url, { group: 'world-model', status: 'shared', cacheHit: true });
    }
    return templates.get(url);
}

export async function createWorld3dModel(type) {
    const config = WORLD_3D_MODELS[type];
    if (!config) return null;
    const gltf = await loadTemplate(config.url);
    const context = { type, url: config.url };
    const model = measurePerfPhase('world-model:clone', context, () => cloneSkeleton(gltf.scene));
    return measurePerfPhase('world-model:prepare', context, () => prepareWorld3dModel(model, type, config));
}

export async function createWorld3dStructure(type) {
    const config = WORLD_3D_STRUCTURES[type];
    if (!config) return null;
    const [renderGltf, collisionGltf] = await Promise.all([
        loadTemplate(config.url),
        loadTemplate(config.collision)
    ]);
    const renderModel = cloneSkeleton(renderGltf.scene);
    const collisionModel = cloneSkeleton(collisionGltf.scene);
    return prepareWorld3dStructure(renderModel, collisionModel, type, config);
}

export function prepareWorld3dStructure(renderModel, collisionModel, type, config) {
    const root = new THREE.Group();
    root.name = `World3dStructure:${type}`;
    root.rotation.y = config.yaw ?? 0;
    root.userData = {
        isWorld3dStructure: true,
        structureType: type,
        footprint: { ...config.footprint },
        origin: config.origin,
        setpiece: config.setpiece,
        module: config.module,
        stage: config.stage
    };

    renderModel.name = `${type}:render`;
    renderModel.traverse((object) => {
        if (!object.isMesh) return;
        object.castShadow = true;
        object.receiveShadow = true;
        object.userData.isStructureRenderMesh = true;
    });

    collisionModel.name = `${type}:collision`;
    collisionModel.visible = false;
    collisionModel.traverse((object) => {
        if (!object.isMesh) return;
        object.userData.isStructureCollision = true;
        object.castShadow = false;
        object.receiveShadow = false;
    });

    // Intentionally no normalization, bounds-centering, or position rewrite.
    root.add(renderModel, collisionModel);
    return root;
}

function prepareWorld3dModel(model, type, config) {
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    model.scale.multiplyScalar(config.height / Math.max(size.y, 1e-6));
    model.updateMatrixWorld(true);
    const scaled = new THREE.Box3().setFromObject(model);
    const center = scaled.getCenter(new THREE.Vector3());
    model.position.set(-center.x, -scaled.min.y, -center.z);
    model.rotation.y = config.yaw;
    model.traverse((object) => {
        if (!object.isMesh) return;
        object.castShadow = true;
        object.receiveShadow = true;
        // Unlike camera-facing billboard sprites elsewhere in this codebase
        // (whose bounding-sphere math against a THREE.Sprite is unreliable,
        // hence their frustumCulled = false), these are static-position GLB
        // meshes with a bounding box already computed above via
        // Box3().setFromObject(). Frustum culling is safe here and matters
        // at scale: as more chunks/camps/hives populate authored-room and
        // signature-prop GLBs (see docs/sprint-23-room-juice-and-dressing-
        // assets.md), leaving every one of them permanently submitted to
        // the renderer regardless of camera visibility compounds badly.
        if (!object.geometry.boundingSphere) object.geometry.computeBoundingSphere();
        object.frustumCulled = true;
    });
    useSinglePassForFlatMaterials(model);
    const root = new THREE.Group();
    root.name = `World3d:${type}`;
    root.add(model);
    return root;
}

export function hasWorld3dModel(type) {
    return Boolean(WORLD_3D_MODELS[type]);
}

const WORLD_3D_ONLY_PREFIXES = Object.freeze(['arch_', 'state_', 'fixture_', 'kit_']);

// Architectural/state fixtures have no billboard fallback by design. Keep
// this contract explicit so room dressing routes them to their GLB instead of
// rejecting them at the generic sprite-material gate.
export function isWorld3dOnlyPlacementType(type) {
    return typeof type === 'string'
        && WORLD_3D_ONLY_PREFIXES.some((prefix) => type.startsWith(prefix))
        && hasWorld3dModel(type);
}

export const COMMON_WORLD_3D_MODEL_TYPES = Object.freeze([
    'broken_scout_ship',
    'broken_tank_ship',
    'broken_engineer_ship',
    'base_console',
    'o2_generator',
    'hull_matrix',
    'radar',
    'fusion_generator',
    'basic_pile',
    'storage_locker',
    'frozen_tanker',
    'bunker_junk_rare',
    'bunker_junk_uncommon',
    'prop_bunker_supplies',
    'prop_security_barricade',
    'prop_conduit_hub',
    'prop_specimen_tank',
    'prop_ammo_crate_stack',
    'prop_base_defense_turret',
    'prop_body_empty_exosuit',
    'prop_body_human_frozen',
    'cybersnail_dead',
    'npc_martha',
    'npc_kaelen',
    'npc_briggs',
    'npc_alien_rhun',
    'npc_alien_vey',
    'npc_nahl',
    'npc_val',
    'npc_queen'
]);

export async function preloadWorld3dModels(types = COMMON_WORLD_3D_MODEL_TYPES) {
    const promises = [];
    for (const type of types) {
        const config = WORLD_3D_MODELS[type];
        if (config?.url) {
            promises.push(loadTemplate(config.url).catch(() => null));
        }
    }
    await Promise.allSettled(promises);
}

// Keep a replacement attached to the sprite that still owns gameplay state.
// The sprite can move after a GLB request starts (the O2 generator's boot
// animation does exactly that), so copying its transform only once at load
// completion can strand the model below the floor.
export function syncWorld3dReplacement(source, { scale = 1, visible } = {}) {
    const root = source?.userData?.world3dRoot;
    if (!root) return false;
    root.position.copy(source.position);
    root.rotation.y = (source.material?.rotation ?? 0) + WORLD_3D_FACING_YAW;
    root.scale.setScalar(Math.max(0, Number.isFinite(scale) ? scale : 1));
    root.visible = visible ?? Boolean(source.userData.world3dDesiredVisible);
    // Once a replacement exists the flat sprite must never draw again, or the
    // billboard renders *inside* the model. Callers legitimately flip
    // `source.visible` while animating (the O2 generator rise sets it every
    // frame), so hiding it here -- the single funnel every frame goes through
    // -- is more reliable than expecting each caller to remember.
    source.visible = false;
    return true;
}
