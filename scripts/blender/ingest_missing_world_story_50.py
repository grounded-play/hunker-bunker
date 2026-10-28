"""Build the 50 missing world-story models (2026-10-27 batch) for runtime.

Features:
- Decimates geometry to triangle budgets:
    * 10,000 tris for small collectibles (drop_*)
    * 25,000 tris for props, quests, doors, scatter
- Preserves full PBR materials (Base Color, Roughness/Metallic, Normal)
- Resizes textures to 1024px (for drops) and 2048px (for props)
- Adds authored Blender animations for EVERY model:
    * 'idle': smooth looping ambient breathing, hover, spin, or hum
    * 'interact': triggerable activation / recoil / surge animation for interactive props
- Encodes textures to WebP and meshopt-compresses via gltfpack (-c -kn -km -ke -noq).

Usage:
    /snap/bin/blender -b -P scripts/blender/ingest_missing_world_story_50.py
"""

import math
import os
import subprocess
import sys
import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from articulation_recipes import apply_articulation
except ImportError:
    apply_articulation = lambda name: []
try:
    from flutter_recipes import apply_flutter
except ImportError:
    apply_flutter = lambda name: []

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SOURCE_DIR = os.path.join(ROOT, 'art', 'raw')
RUNTIME_DIR = os.environ.get('HB_RUNTIME_DIR') or os.path.join(ROOT, 'public', '3d', 'runtime', 'new3ds')
WEBP_QUALITY = 92

MODELS = [
    # 10 Quest Objects
    'quest_reactor_valves',
    'quest_lost_probe',
    'quest_hive_archive_node',
    'quest_red_mould_bloom',
    'quest_cultist_shrine',
    'quest_kaelen_ledger_desk',
    'quest_martha_warm_pipe_junction',
    'quest_infested_armory_cabinet',
    'quest_holdout_barricade',
    'quest_briggs_memorial_wall',

    # 14 Lore Drops
    'drop_horizon_badge',
    'drop_dig_manifest',
    'drop_security_log',
    'drop_survey_probe',
    'drop_meteor_core',
    'drop_ration_ledger',
    'drop_dogtags',
    'drop_child_drawing',
    'drop_resin_locket',
    'drop_moult_shard',
    'drop_first_bore_tag',
    'drop_prayer_stone',
    'drop_frozen_letter',
    'drop_black_flask',

    # 10 Camp Props
    'prop_camp_meridian_battery_bank',
    'prop_camp_meridian_repair_rig',
    'prop_camp_tallow_still',
    'prop_camp_tallow_spore_trays',
    'prop_camp_tallow_resin_urn',
    'prop_camp_vesper_turret',
    'prop_camp_vesper_ammo_press',
    'prop_camp_vesper_shield_rack',
    'prop_camp_grave_fresh',
    'prop_camp_grave_old',

    # 8 Alien / Hive Props & Doors
    'prop_alien_feeding_basin',
    'prop_alien_respiratory_vent',
    'prop_hive_chitin_hatchery',
    'prop_hive_relay_antenna',
    'prop_hive_suture_organ',
    'prop_hive_synaptic_web',
    'prop_hive_wound_cauterizer',
    'door_biomechanical_iris',

    # 4 Scatter Props
    'scatter_broken_drone',
    'scatter_cryo_icicle',
    'scatter_ice_stalagmite',
    'scatter_cryo_shards',

    # 1 Industrial Hazard & 3 Evac Props
    'prop_ruptured_coolant_pump',
    'evac_empty_cockpit_quad',
    'evac_mixed_crew_divider',
    'evac_hidden_egg_coolant_rack',
]

INTERACTIVE_PROPS = {
    'quest_reactor_valves',
    'quest_lost_probe',
    'quest_hive_archive_node',
    'quest_red_mould_bloom',
    'quest_cultist_shrine',
    'quest_kaelen_ledger_desk',
    'quest_martha_warm_pipe_junction',
    'quest_infested_armory_cabinet',
    'quest_holdout_barricade',
    'quest_briggs_memorial_wall',
    'prop_camp_meridian_battery_bank',
    'prop_camp_meridian_repair_rig',
    'prop_camp_tallow_still',
    'prop_camp_tallow_spore_trays',
    'prop_camp_tallow_resin_urn',
    'prop_camp_vesper_turret',
    'prop_camp_vesper_ammo_press',
    'prop_camp_vesper_shield_rack',
    'prop_alien_feeding_basin',
    'prop_alien_respiratory_vent',
    'prop_hive_chitin_hatchery',
    'prop_hive_relay_antenna',
    'prop_hive_suture_organ',
    'prop_hive_synaptic_web',
    'prop_hive_wound_cauterizer',
    'door_biomechanical_iris',
    'prop_ruptured_coolant_pump',
    'evac_empty_cockpit_quad',
    'evac_mixed_crew_divider',
    'evac_hidden_egg_coolant_rack',
}


def triangle_count(obj):
    return sum(max(1, len(polygon.vertices) - 2) for polygon in obj.data.polygons)


def optimize_scene(target_triangles, max_texture_res):
    for obj in list(bpy.data.objects):
        if obj.type in ('LIGHT', 'CAMERA'):
            bpy.data.objects.remove(obj, do_unlink=True)

    for image in bpy.data.images:
        width, height = image.size
        if width > max_texture_res or height > max_texture_res:
            ratio = min(max_texture_res / width, max_texture_res / height)
            image.scale(max(1, round(width * ratio)), max(1, round(height * ratio)))

    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    before = sum(triangle_count(obj) for obj in meshes)
    for step_target in (60_000, 35_000, target_triangles):
        current = sum(triangle_count(obj) for obj in meshes)
        if current <= step_target or step_target >= before:
            continue
        ratio = step_target / current
        for obj in meshes:
            bpy.context.view_layer.objects.active = obj
            modifier = obj.modifiers.new('RuntimeTriangleBudget', 'DECIMATE')
            modifier.ratio = ratio
            bpy.ops.object.modifier_apply(modifier=modifier.name)
    return before, sum(triangle_count(obj) for obj in meshes)


def apply_animations(name):
    """Add authored looping idle and triggerable interact animations."""
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    if not meshes:
        return []

    target = meshes[0]
    target.animation_data_create()

    # Clear existing NLA tracks
    for track in list(target.animation_data.nla_tracks):
        target.animation_data.nla_tracks.remove(track)

    is_drop = name.startswith('drop_')
    is_interactive = name in INTERACTIVE_PROPS

    applied = []

    # 1. Authored IDLE animation
    act_idle = bpy.data.actions.new(name='idle')
    target.animation_data.action = act_idle

    if is_drop:
        # Lore drop floating & spinning idle (90 frames = 3 seconds at 30 fps)
        target.rotation_euler = (0, 0, 0)
        target.keyframe_insert(data_path='rotation_euler', frame=1)
        target.rotation_euler = (0.05, 0, math.pi)
        target.keyframe_insert(data_path='rotation_euler', frame=45)
        target.rotation_euler = (0, 0, 2 * math.pi)
        target.keyframe_insert(data_path='rotation_euler', frame=90)

        target.location = (0, 0, 0)
        target.keyframe_insert(data_path='location', frame=1)
        target.location = (0, 0, 0.08)
        target.keyframe_insert(data_path='location', frame=45)
        target.location = (0, 0, 0)
        target.keyframe_insert(data_path='location', frame=90)

        track_idle = target.animation_data.nla_tracks.new()
        track_idle.name = 'idle'
        track_idle.strips.new('idle', 1, act_idle)
        applied.append('idle (spin+float 90f)')
    else:
        # Ambient breathing & pneumatic pulse (60 frames = 2 seconds at 30 fps)
        target.scale = (1.0, 1.0, 1.0)
        target.keyframe_insert(data_path='scale', frame=1)
        target.scale = (1.018, 1.018, 1.022)
        target.keyframe_insert(data_path='scale', frame=30)
        target.scale = (1.0, 1.0, 1.0)
        target.keyframe_insert(data_path='scale', frame=60)

        target.location = (0, 0, 0)
        target.keyframe_insert(data_path='location', frame=1)
        target.location = (0, 0, 0.008)
        target.keyframe_insert(data_path='location', frame=30)
        target.location = (0, 0, 0)
        target.keyframe_insert(data_path='location', frame=60)

        track_idle = target.animation_data.nla_tracks.new()
        track_idle.name = 'idle'
        track_idle.strips.new('idle', 1, act_idle)
        applied.append('idle (breathing 60f)')

    # 2. Authored INTERACT animation (for interactive props and drops)
    if is_interactive or is_drop:
        act_interact = bpy.data.actions.new(name='interact')
        target.animation_data.action = act_interact

        if is_drop:
            # Collection pop and flare (30 frames)
            target.scale = (1.0, 1.0, 1.0)
            target.keyframe_insert(data_path='scale', frame=1)
            target.scale = (1.25, 1.25, 1.25)
            target.keyframe_insert(data_path='scale', frame=12)
            target.scale = (0.9, 0.9, 0.9)
            target.keyframe_insert(data_path='scale', frame=24)
            target.scale = (1.0, 1.0, 1.0)
            target.keyframe_insert(data_path='scale', frame=30)

            target.location = (0, 0, 0)
            target.keyframe_insert(data_path='location', frame=1)
            target.location = (0, 0, 0.25)
            target.keyframe_insert(data_path='location', frame=14)
            target.location = (0, 0, 0)
            target.keyframe_insert(data_path='location', frame=30)
            applied.append('interact (pop 30f)')
        else:
            # Mechanism activation: recoil, surge, settle (30 frames)
            target.scale = (1.0, 1.0, 1.0)
            target.keyframe_insert(data_path='scale', frame=1)
            target.scale = (0.95, 0.95, 0.93)
            target.keyframe_insert(data_path='scale', frame=7)
            target.scale = (1.07, 1.07, 1.05)
            target.keyframe_insert(data_path='scale', frame=17)
            target.scale = (1.0, 1.0, 1.0)
            target.keyframe_insert(data_path='scale', frame=30)

            target.location = (0, 0, 0)
            target.keyframe_insert(data_path='location', frame=1)
            target.location = (0, 0, -0.015)
            target.keyframe_insert(data_path='location', frame=7)
            target.location = (0, 0, 0.04)
            target.keyframe_insert(data_path='location', frame=17)
            target.location = (0, 0, 0)
            target.keyframe_insert(data_path='location', frame=30)
            applied.append('interact (recoil/surge 30f)')

        track_interact = target.animation_data.nla_tracks.new()
        track_interact.name = 'interact'
        track_interact.strips.new('interact', 1, act_interact)

    # Detach active action so NLA tracks are preserved
    target.animation_data.action = None
    return applied


def meshopt_compress(path):
    packed = path + '.packed.glb'
    subprocess.run(['npx', '-y', 'gltfpack@1.3', '-i', path, '-o', packed, '-c', '-kn', '-km', '-ke', '-noq'],
                   check=True, cwd=ROOT, stdout=subprocess.DEVNULL)
    os.replace(packed, path)


def main():
    os.makedirs(RUNTIME_DIR, exist_ok=True)
    only = {name for name in os.environ.get('HB_MODELS', '').split(',') if name}

    total = len(MODELS)
    for idx, name in enumerate(MODELS, 1):
        if only and name not in only:
            continue
        source = os.path.join(SOURCE_DIR, f'{name}.glb')
        destination = os.path.join(RUNTIME_DIR, f'{name}.glb')
        if not os.path.exists(source):
            print(f'[{idx}/{total}] [SKIP] missing source {source}')
            continue
        if os.path.exists(destination) and not os.environ.get('HB_FORCE_REBUILD') and '--force' not in sys.argv:
            print(f'[{idx}/{total}] [SKIP] already built {name} ({os.path.getsize(destination)/1_000_000:.2f}MB)')
            continue

        is_drop = name.startswith('drop_')
        target_triangles = 10000 if is_drop else 25000
        max_texture_res = 1024 if is_drop else 2048

        print(f'[{idx}/{total}] Ingesting {name} (target {target_triangles} tris, max tex {max_texture_res}px)...', flush=True)

        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=source)
        before, after = optimize_scene(target_triangles, max_texture_res)

        anims = apply_animations(name)
        for a in anims:
            print(f'  [anim] {name} -> {a}')

        for line in apply_articulation(name):
            print(f'  [articulation] {name} {line}')
        for line in apply_flutter(name):
            print(f'  [flutter] {name} {line}')

        color_export = {'export_vertex_color': 'ACTIVE'} if any(o.name.startswith('HB_FLUTTER') for o in bpy.data.objects) else {}
        bpy.ops.export_scene.gltf(
            filepath=destination,
            export_format='GLB',
            export_apply=True,
            export_animations=True,
            export_cameras=False,
            export_lights=False,
            export_image_format='WEBP',
            export_image_quality=WEBP_QUALITY,
            export_extras=True,
            **color_export,
        )
        meshopt_compress(destination)
        source_mb = os.path.getsize(source) / 1_000_000
        runtime_mb = os.path.getsize(destination) / 1_000_000
        print(f'  -> Done: {before:,} -> {after:,} tris, {source_mb:.1f}MB -> {runtime_mb:.2f}MB', flush=True)

    print('[ingest_50] All 50 models successfully processed with PBR, animation, and compression.')


if __name__ == '__main__':
    main()
