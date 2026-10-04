import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { assetUrl } from './assetUrl.js';
import { recordAssetLoad } from './assetLoadTelemetry.js';
import { measurePerfPhase } from './perfPhases.js';
import { useSinglePassForFlatMaterials } from './singlePassFlatMaterials.js';
import { KIT_SCALE, applyKitMaterials } from './kitMaterials.js';

// docs/armory-and-class-weapons-worklog.md — gltf-transform's optimize pass applies
// EXT_meshopt_compression; GLTFLoader throws without this registered first.
function createGltfLoader() {
    return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
}

export const WORLD_3D_MODELS = Object.freeze({
    // Kenney modular kits, CC0, textured by scripts/blender/texture_kit_pieces.py
    // with shared CC0 surface materials (src/kitMaterials.js). One uniform
    // scale and the source origin keep the 4-unit socket grid intact. The cave and space kits share an
    // identical 40-piece grammar, so both skins expose the same key suffixes and
    // a generator can swap biome without changing its socket logic.
    // 3D-only by design: these have no billboard fallback, which is why kit_
    // joins WORLD_3D_ONLY_PREFIXES above.
    kit_cave_corridor_corner: { url: '/3d/runtime/kits/modular-cave-kit/corridor-corner.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_corridor_end: { url: '/3d/runtime/kits/modular-cave-kit/corridor-end.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_corridor_intersection: { url: '/3d/runtime/kits/modular-cave-kit/corridor-intersection.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_corridor_junction: { url: '/3d/runtime/kits/modular-cave-kit/corridor-junction.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_corridor_transition: { url: '/3d/runtime/kits/modular-cave-kit/corridor-transition.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_corridor_wide_corner: { url: '/3d/runtime/kits/modular-cave-kit/corridor-wide-corner.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_corridor_wide_end: { url: '/3d/runtime/kits/modular-cave-kit/corridor-wide-end.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_corridor_wide_intersection: { url: '/3d/runtime/kits/modular-cave-kit/corridor-wide-intersection.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_corridor_wide_junction: { url: '/3d/runtime/kits/modular-cave-kit/corridor-wide-junction.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_corridor_wide: { url: '/3d/runtime/kits/modular-cave-kit/corridor-wide.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_corridor: { url: '/3d/runtime/kits/modular-cave-kit/corridor.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_gate_metal_bars: { url: '/3d/runtime/kits/modular-cave-kit/gate-metal-bars.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_gate_overhang: { url: '/3d/runtime/kits/modular-cave-kit/gate-overhang.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_gate_rock: { url: '/3d/runtime/kits/modular-cave-kit/gate-rock.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_gate: { url: '/3d/runtime/kits/modular-cave-kit/gate.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_ladder: { url: '/3d/runtime/kits/modular-cave-kit/ladder.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_room_corner: { url: '/3d/runtime/kits/modular-cave-kit/room-corner.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_room_large_variation: { url: '/3d/runtime/kits/modular-cave-kit/room-large-variation.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_room_large: { url: '/3d/runtime/kits/modular-cave-kit/room-large.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_room_small_variation: { url: '/3d/runtime/kits/modular-cave-kit/room-small-variation.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_room_small: { url: '/3d/runtime/kits/modular-cave-kit/room-small.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_room_wide_variation: { url: '/3d/runtime/kits/modular-cave-kit/room-wide-variation.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_room_wide: { url: '/3d/runtime/kits/modular-cave-kit/room-wide.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_stairs_wide: { url: '/3d/runtime/kits/modular-cave-kit/stairs-wide.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_stairs: { url: '/3d/runtime/kits/modular-cave-kit/stairs.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_template_corner: { url: '/3d/runtime/kits/modular-cave-kit/template-corner.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_template_detail: { url: '/3d/runtime/kits/modular-cave-kit/template-detail.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_template_floor_big: { url: '/3d/runtime/kits/modular-cave-kit/template-floor-big.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_template_floor_detail_a: { url: '/3d/runtime/kits/modular-cave-kit/template-floor-detail-a.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_template_floor_detail: { url: '/3d/runtime/kits/modular-cave-kit/template-floor-detail.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_template_floor_layer_hole: { url: '/3d/runtime/kits/modular-cave-kit/template-floor-layer-hole.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_template_floor_layer_raised: { url: '/3d/runtime/kits/modular-cave-kit/template-floor-layer-raised.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_template_floor_layer: { url: '/3d/runtime/kits/modular-cave-kit/template-floor-layer.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_template_floor: { url: '/3d/runtime/kits/modular-cave-kit/template-floor.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_template_wall_corner: { url: '/3d/runtime/kits/modular-cave-kit/template-wall-corner.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_template_wall_detail_a: { url: '/3d/runtime/kits/modular-cave-kit/template-wall-detail-a.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_template_wall_half: { url: '/3d/runtime/kits/modular-cave-kit/template-wall-half.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_template_wall_stairs: { url: '/3d/runtime/kits/modular-cave-kit/template-wall-stairs.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_template_wall_top: { url: '/3d/runtime/kits/modular-cave-kit/template-wall-top.glb', scale: KIT_SCALE, yaw: 0 },
    kit_cave_template_wall: { url: '/3d/runtime/kits/modular-cave-kit/template-wall.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_cables: { url: '/3d/runtime/kits/modular-space-kit/cables.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_corridor_corner: { url: '/3d/runtime/kits/modular-space-kit/corridor-corner.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_corridor_end: { url: '/3d/runtime/kits/modular-space-kit/corridor-end.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_corridor_intersection: { url: '/3d/runtime/kits/modular-space-kit/corridor-intersection.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_corridor_junction: { url: '/3d/runtime/kits/modular-space-kit/corridor-junction.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_corridor_transition: { url: '/3d/runtime/kits/modular-space-kit/corridor-transition.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_corridor_wide_corner: { url: '/3d/runtime/kits/modular-space-kit/corridor-wide-corner.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_corridor_wide_end: { url: '/3d/runtime/kits/modular-space-kit/corridor-wide-end.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_corridor_wide_intersection: { url: '/3d/runtime/kits/modular-space-kit/corridor-wide-intersection.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_corridor_wide_junction: { url: '/3d/runtime/kits/modular-space-kit/corridor-wide-junction.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_corridor_wide: { url: '/3d/runtime/kits/modular-space-kit/corridor-wide.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_corridor: { url: '/3d/runtime/kits/modular-space-kit/corridor.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_gate_door_window: { url: '/3d/runtime/kits/modular-space-kit/gate-door-window.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_gate_door: { url: '/3d/runtime/kits/modular-space-kit/gate-door.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_gate_lasers: { url: '/3d/runtime/kits/modular-space-kit/gate-lasers.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_gate: { url: '/3d/runtime/kits/modular-space-kit/gate.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_room_corner: { url: '/3d/runtime/kits/modular-space-kit/room-corner.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_room_large_variation: { url: '/3d/runtime/kits/modular-space-kit/room-large-variation.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_room_large: { url: '/3d/runtime/kits/modular-space-kit/room-large.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_room_small_variation: { url: '/3d/runtime/kits/modular-space-kit/room-small-variation.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_room_small: { url: '/3d/runtime/kits/modular-space-kit/room-small.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_room_wide_variation: { url: '/3d/runtime/kits/modular-space-kit/room-wide-variation.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_room_wide: { url: '/3d/runtime/kits/modular-space-kit/room-wide.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_stairs_wide: { url: '/3d/runtime/kits/modular-space-kit/stairs-wide.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_stairs: { url: '/3d/runtime/kits/modular-space-kit/stairs.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_template_corner: { url: '/3d/runtime/kits/modular-space-kit/template-corner.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_template_detail: { url: '/3d/runtime/kits/modular-space-kit/template-detail.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_template_floor_big: { url: '/3d/runtime/kits/modular-space-kit/template-floor-big.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_template_floor_detail_a: { url: '/3d/runtime/kits/modular-space-kit/template-floor-detail-a.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_template_floor_detail: { url: '/3d/runtime/kits/modular-space-kit/template-floor-detail.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_template_floor_layer_hole: { url: '/3d/runtime/kits/modular-space-kit/template-floor-layer-hole.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_template_floor_layer_raised: { url: '/3d/runtime/kits/modular-space-kit/template-floor-layer-raised.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_template_floor_layer: { url: '/3d/runtime/kits/modular-space-kit/template-floor-layer.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_template_floor: { url: '/3d/runtime/kits/modular-space-kit/template-floor.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_template_wall_corner: { url: '/3d/runtime/kits/modular-space-kit/template-wall-corner.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_template_wall_detail_a: { url: '/3d/runtime/kits/modular-space-kit/template-wall-detail-a.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_template_wall_half: { url: '/3d/runtime/kits/modular-space-kit/template-wall-half.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_template_wall_stairs: { url: '/3d/runtime/kits/modular-space-kit/template-wall-stairs.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_template_wall_top: { url: '/3d/runtime/kits/modular-space-kit/template-wall-top.glb', scale: KIT_SCALE, yaw: 0 },
    kit_space_template_wall: { url: '/3d/runtime/kits/modular-space-kit/template-wall.glb', scale: KIT_SCALE, yaw: 0 },
    broken_scout_ship: { url: '/3d/runtime/broken-scout-ship.glb', height: 1.35, yaw: 0 },
    broken_tank_ship: { url: '/3d/runtime/broken-tank-ship.glb', height: 1.35, yaw: 0 },
    broken_engineer_ship: { url: '/3d/runtime/broken-engineer-ship.glb', height: 1.35, yaw: 0 },
    base_console: { url: '/3d/runtime/console.glb', height: 1.05, yaw: 0 },
    o2_generator: { url: '/3d/runtime/o2-generator.glb', height: 1.2, yaw: 0 },
    hull_matrix: { url: '/3d/runtime/hull-matrix.glb', height: 1.15, yaw: 0 },
    radar: { url: '/3d/runtime/radar.glb', height: 1.05, yaw: -Math.PI / 2 },
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
    prop_biomech_respirator: { url: '/3d/runtime/new3ds/prop_biomech_respirator.glb', height: 1.30, yaw: Math.PI / 2 },
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
    // The source faces +Z already; a yaw of PI turned her back to the player
    // in the museum and through the whole hostile chase.
    secret_mayor_tina: { url: '/3d/runtime/secrets/mayor-tina.glb', height: 1.72, yaw: 0 },
    secret_teacup_roach: { url: '/3d/runtime/secrets/teacup-roach.glb', height: 1.18, yaw: Math.PI },
    // Built by scripts/blender/build_cookfire.py; this used to point at the
    // fabricator workstation, so every camp's fire rendered as a crafting bench.
    prop_camp_cookfire: { url: '/3d/runtime/new3ds/prop_camp_cookfire.glb', height: 0.85, yaw: 0 },
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
    prop_flesh_steel_inhaler: { url: '/3d/runtime/new3ds/prop_flesh_steel_inhaler.glb', height: 1.30, yaw: -Math.PI / 2 },
    prop_fungal_mycelium_loom: { url: '/3d/runtime/new3ds/prop_fungal_mycelium_loom.glb', height: 1.85, yaw: 0 },
    prop_fungal_resin_basin: { url: '/3d/runtime/new3ds/prop_fungal_resin_basin.glb', height: 0.85, yaw: 0 },
    prop_fungal_spore_dispenser: { url: '/3d/runtime/new3ds/prop_fungal_spore_dispenser.glb', height: 1.25, yaw: 0 },
    prop_fungal_tendril_altar: { url: '/3d/runtime/new3ds/prop_fungal_tendril_altar.glb', height: 2.10, yaw: 0 },
    prop_icey_frost_manifold: { url: '/3d/runtime/new3ds/prop_icey_frost_manifold.glb', height: 1.20, yaw: 0 },
    prop_icey_frost_vent: { url: '/3d/runtime/new3ds/prop_icey_frost_vent.glb', height: 1.10, yaw: 0 },
    prop_icey_thermal_pod: { url: '/3d/runtime/new3ds/prop_icey_thermal_pod.glb', height: 1.40, yaw: 0 },
    prop_light_cluster_dripping: { url: '/3d/runtime/new3ds/prop_light_cluster_dripping.glb', height: 1.20, yaw: -Math.PI / 2 },
    prop_locker_bulged: { url: '/3d/runtime/new3ds/prop_locker_bulged.glb', height: 1.35, yaw: -Math.PI / 2 },
    prop_pipe_rupture: { url: '/3d/runtime/new3ds/prop_pipe_rupture.glb', height: 0.85, yaw: 0 },
    prop_shrine_plinth_broken: { url: '/3d/runtime/new3ds/prop_shrine_plinth_broken.glb', height: 1.25, yaw: 0 },
    prop_storage_drum_dented: { url: '/3d/runtime/new3ds/prop_storage_drum_dented.glb', height: 0.80, yaw: 0 },
    prop_terminal_ruptured: { url: '/3d/runtime/new3ds/prop_terminal_ruptured.glb', height: 1.15, yaw: 0 },
    prop_valve_wheel_fused: { url: '/3d/runtime/new3ds/prop_valve_wheel_fused.glb', height: 0.75, yaw: 0 },
    prop_vent_grate_exploded: { url: '/3d/runtime/new3ds/prop_vent_grate_exploded.glb', height: 0.65, yaw: 0 },
    // Sprint 49 Giger-Post-Jugendstil Biomechanical & Corpospace Cathedral interactive props
    prop_autopsy_dissection_slab: { url: '/3d/runtime/new3ds/prop_autopsy_dissection_slab.glb', height: 1.05, yaw: 0 },
    prop_biomech_sphincter_hatch_vent: { url: '/3d/runtime/new3ds/prop_biomech_sphincter_hatch_vent.glb', height: 1.80, yaw: 0 },
    prop_biomech_spore_umbilical_cable: { url: '/3d/runtime/new3ds/prop_biomech_spore_umbilical_cable.glb', height: 2.80, yaw: 0 },
    prop_biomech_spore_umbilical_cable_rigged: { url: '/3d/runtime/new3ds/prop_biomech_spore_umbilical_cable_rigged.glb', height: 2.80, yaw: 0 },
    prop_biomech_tracheal_wall_pipe: { url: '/3d/runtime/new3ds/prop_biomech_tracheal_wall_pipe.glb', height: 2.40, yaw: 0 },
    prop_ceiling_crane_hoist: { url: '/3d/runtime/new3ds/prop_ceiling_crane_hoist.glb', height: 2.20, yaw: 0 },
    prop_coolant_drum_leaking_pool: { url: '/3d/runtime/new3ds/prop_coolant_drum_leaking_pool.glb', height: 0.95, yaw: 0 },
    prop_corporate_saint_reliquary: { url: '/3d/runtime/new3ds/prop_corporate_saint_reliquary.glb', height: 1.70, yaw: 0 },
    prop_decon_eyewash_shower_station: { url: '/3d/runtime/new3ds/prop_decon_eyewash_shower_station.glb', height: 2.10, yaw: 0 },
    prop_exhaust_blower_fan_hood: { url: '/3d/runtime/new3ds/prop_exhaust_blower_fan_hood.glb', height: 2.20, yaw: 0 },
    prop_exosuit_docking_gantry: { url: '/3d/runtime/new3ds/prop_exosuit_docking_gantry.glb', height: 2.40, yaw: 0 },
    prop_floor_conduit_bridge: { url: '/3d/runtime/new3ds/prop_floor_conduit_bridge.glb', height: 0.25, yaw: 0 },
    prop_floor_drainage_sump_trough: { url: '/3d/runtime/new3ds/prop_floor_drainage_sump_trough.glb', height: 0.30, yaw: 0 },
    prop_liturgical_terminal_lectern: { url: '/3d/runtime/new3ds/prop_liturgical_terminal_lectern.glb', height: 1.25, yaw: 0 },
    prop_maintenance_tool_cart: { url: '/3d/runtime/new3ds/prop_maintenance_tool_cart.glb', height: 0.85, yaw: 0 },
    prop_overhead_cage_fluorescent: { url: '/3d/runtime/new3ds/prop_overhead_cage_fluorescent.glb', height: 0.65, yaw: 0 },
    prop_oxygen_bottle_cascade_rack: { url: '/3d/runtime/new3ds/prop_oxygen_bottle_cascade_rack.glb', height: 1.65, yaw: 0 },
    prop_pipe_organ_heat_exchanger: { url: '/3d/runtime/new3ds/prop_pipe_organ_heat_exchanger.glb', height: 2.40, yaw: 0 },
    prop_vertebral_cable_riser: { url: '/3d/runtime/new3ds/prop_vertebral_cable_riser.glb', height: 2.30, yaw: 0 },
    prop_votive_candle_shrine: { url: '/3d/runtime/new3ds/prop_votive_candle_shrine.glb', height: 1.30, yaw: 0 },
    prop_wall_cable_tray_swag: { url: '/3d/runtime/new3ds/prop_wall_cable_tray_swag.glb', height: 1.10, yaw: 0 }
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
    return measurePerfPhase('world-model:prepare', context, () => prepareWorld3dModel(model, type, config, gltf.animations));
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

export function prepareWorld3dModel(model, type, config, animations = null) {
    if (config.scale) return prepareUniformScaleModel(model, type, config, animations);
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    model.scale.multiplyScalar(config.height / Math.max(size.y, 1e-6));
    model.updateMatrixWorld(true);
    const scaled = new THREE.Box3().setFromObject(model);
    const center = scaled.getCenter(new THREE.Vector3());
    model.position.set(-center.x, -scaled.min.y, -center.z);
    model.rotation.y = config.yaw ?? 0;
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

    let mixer = null;
    if (animations && animations.length > 0) {
        const idleClip = animations.find((clip) => /idle/i.test(clip.name))
            || animations.find((clip) => /mixamo|layer0/i.test(clip.name))
            || animations[0];
        if (idleClip) {
            mixer = new THREE.AnimationMixer(model);
            const action = mixer.clipAction(idleClip);
            action.play();
            if (idleClip.duration > 0) {
                action.time = Math.random() * idleClip.duration;
            }
            mixer.update(0);
        }
    }

    const root = new THREE.Group();
    root.name = `World3d:${type}`;
    root.userData = {
        modelType: type,
        mixer,
        animations,
        dispose: () => {
            if (mixer) {
                mixer.stopAllAction();
                mixer.uncacheRoot(model);
            }
        }
    };
    root.add(model);
    return root;
}

// Modular pieces: one scale for the whole kit and the authored origin kept,
// because pieces only line up on their shared socket grid.
function prepareUniformScaleModel(model, type, config, animations = null) {
    model.scale.multiplyScalar(config.scale);
    model.rotation.y = config.yaw ?? 0;
    model.traverse((object) => {
        if (!object.isMesh) return;
        object.castShadow = true;
        object.receiveShadow = true;
        if (!object.geometry.boundingSphere) object.geometry.computeBoundingSphere();
        object.frustumCulled = true;
    });
    useSinglePassForFlatMaterials(model);
    // After the flat-material pass: shared materials must not be mutated per piece.
    applyKitMaterials(model, type, null, {
        skinOverride: config.skin || config.theme,
        dynamicVariations: config.dynamicVariations ?? false
    });
    const root = new THREE.Group();
    root.name = `World3d:${type}`;
    root.userData = { modelType: type, animations };
    root.add(model);
    return root;
}

export function hasWorld3dModel(type) {
    return Boolean(WORLD_3D_MODELS[type]);
}

const WORLD_3D_ONLY_PREFIXES = Object.freeze(['arch_', 'state_', 'fixture_', 'kit_']);
// Registered models with no 2D sprite of their own. Without this a `prop_`
// placement of them found no scatter material and was silently dropped.
const WORLD_3D_ONLY_TYPES = Object.freeze(new Set([
    'frozen_tanker', 'prop_body_human_frozen', 'prop_body_empty_exosuit', 'body_frozen_human',
    'prop_autopsy_dissection_slab',
    'prop_biomech_sphincter_hatch_vent',
    'prop_biomech_spore_umbilical_cable',
    'prop_biomech_spore_umbilical_cable_rigged',
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
]));

// Scattered body sprites alternate between the two models of each body, by
// position (stable for a seed). Frozen bodies used to load `frozen_tanker`,
// an industrial tank machine (3D asset audit 2026-10-01).
const SCATTER_BODY_VARIANTS = Object.freeze({
    body_human_frozen_suit: Object.freeze(['prop_body_human_frozen', 'body_frozen_human']),
    body_empty_exosuit: Object.freeze(['prop_body_empty_exosuit', 'body_empty_exosuit'])
});

export function resolveScatterWorld3dType(type, x = 0, z = 0) {
    const variants = Object.hasOwn(SCATTER_BODY_VARIANTS, type) ? SCATTER_BODY_VARIANTS[type] : null;
    if (variants) {
        let hash = Math.imul(Math.round(x * 10) | 0, 73856093) ^ Math.imul(Math.round(z * 10) | 0, 19349663);
        hash ^= hash >>> 13;
        hash = Math.imul(hash, 0x5bd1e995);
        hash ^= hash >>> 15;
        return variants[(hash >>> 0) % variants.length];
    }
    return hasWorld3dModel(type) ? type : null;
}

// Architectural/state fixtures have no billboard fallback by design. Keep
// this contract explicit so room dressing routes them to their GLB instead of
// rejecting them at the generic sprite-material gate.
export function isWorld3dOnlyPlacementType(type) {
    return typeof type === 'string'
        && (WORLD_3D_ONLY_TYPES.has(type) || WORLD_3D_ONLY_PREFIXES.some((prefix) => type.startsWith(prefix)))
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
export function syncWorld3dReplacement(source, { scale = 1, visible, delta } = {}) {
    const root = source?.userData?.world3dRoot;
    if (!root) return false;
    root.position.copy(source.position);
    const socketRotation = source.userData?.socketRotation;
    if (Number.isFinite(socketRotation)) {
        // Socketed modular piece: its rotation is topology, applied exactly.
        root.rotation.y = socketRotation;
    } else if (source.userData?.wallNormal) {
        const wn = source.userData.wallNormal;
        root.rotation.y = Math.atan2(wn.x, wn.z);
        if (source.userData.isWallBackedProp) {
            root.position.x -= wn.x * 0.22;
            root.position.z -= wn.z * 0.22;
        }
    } else if (Number.isFinite(source.userData?.yaw)) {
        root.rotation.y = source.userData.yaw;
    } else {
        root.rotation.y = (source.material?.rotation ?? 0) + WORLD_3D_FACING_YAW;
    }
    const modelScale = Number.isFinite(source.userData?.modelScale) ? source.userData.modelScale : 1;
    root.scale.setScalar(Math.max(0, (Number.isFinite(scale) ? scale : 1) * modelScale));
    root.visible = visible ?? Boolean(source.userData.world3dDesiredVisible);
    if (Number.isFinite(delta) && root.userData?.mixer) {
        root.userData.mixer.update(delta);
    }
    // Once a replacement exists the flat sprite must never draw again, or the
    // billboard renders *inside* the model. Callers legitimately flip
    // `source.visible` while animating (the O2 generator rise sets it every
    // frame), so hiding it here -- the single funnel every frame goes through
    // -- is more reliable than expecting each caller to remember.
    source.visible = false;
    return true;
}
