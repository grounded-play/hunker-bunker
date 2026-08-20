import bpy
import os
import math

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SOURCE_DIR = os.path.join(ROOT, 'public', '3d')
OUTPUT_DIR = os.path.join(ROOT, 'public', '3d', 'runtime', 'new3ds')
RAW_DEST_DIR = os.path.join(ROOT, 'art', 'source', 'new3d', 'uploads-2026-08-20')

WEAPON_MAP = {
    'Biolume Spore Sprayer.glb': 'skin_biolume_spore_sprayer.glb',
    'Glitched Circuit Bolter.glb': 'skin_glitched_circuit_bolter.glb',
    'Hazard Stripe SMG.glb': 'skin_hazard_stripe_smg.glb',
    'Obsidian Shard Carbine.glb': 'skin_obsidian_shard.glb',
    'Tectonic Driller Autocannon.glb': 'skin_tectonic_driller.glb',
}

FBX_CHAR_MAP = {
    'Strut Walking -  Cryo-Vanguard Scout.fbx': 'chassis_cryo_vanguard_scout.glb',
    'Opening - Sub-Terran Drill Engineer.fbx': 'chassis_subterran_drill_engineer.glb',
    'Beckoning - Commander Briggs.fbx': 'chassis_trench_warden_heavy.glb',
    'Standing Greeting - Overseer Kaelen.fbx': 'npc_kaelen.glb',
    'Dismissing Gesture - Mother Martha.fbx': 'npc_martha.glb',
    'Rummaging - Dr. Nahl.fbx': 'npc_nahl.glb',
    'Pointing Forward - Val.fbx': 'npc_val.glb',
    'Floating - Aria.fbx': 'npc_aria.glb',
    'Nervously Look Around - Queen 00.fbx': 'npc_queen.glb',
    'Hip Hop Dancing - Corrupted Sister Martha.fbx': 'boss_corrupted_martha.glb',
    'Run To Stop - Corrupted Commander Briggs.fbx': 'boss_corrupted_briggs.glb',
}

def prepare_and_optimize_scene(max_poly=30000):
    for obj in list(bpy.context.scene.objects):
        if obj.type in {'CAMERA', 'LIGHT'}:
            bpy.data.objects.remove(obj, do_unlink=True)
            
    for image in bpy.data.images:
        if image.size[0] > 1024 or image.size[1] > 1024:
            ratio = min(1024 / image.size[0], 1024 / image.size[1])
            new_w = max(1, round(image.size[0] * ratio))
            new_h = max(1, round(image.size[1] * ratio))
            image.scale(new_w, new_h)
            
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH':
            continue
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        
        if len(obj.data.polygons) > max_poly:
            modifier = obj.modifiers.new('RuntimeDecimate', 'DECIMATE')
            modifier.ratio = max_poly / len(obj.data.polygons)
            bpy.ops.object.modifier_apply(modifier=modifier.name)

def process_weapons():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(RAW_DEST_DIR, exist_ok=True)
    
    for src_name, out_name in WEAPON_MAP.items():
        input_path = os.path.join(SOURCE_DIR, src_name)
        if not os.path.exists(input_path):
            input_path = os.path.join(RAW_DEST_DIR, src_name)
        if not os.path.exists(input_path):
            print(f'[process_weapons] Missing {src_name}, skipping')
            continue
            
        output_path = os.path.join(OUTPUT_DIR, out_name)
        initial_size = os.path.getsize(input_path) / (1024 * 1024)
        print(f'[process_weapons] Processing {src_name} -> {out_name} (initial size: {initial_size:.2f} MB)...')
        
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=input_path)
        prepare_and_optimize_scene(max_poly=25000)
        
        bpy.ops.export_scene.gltf(
            filepath=output_path,
            export_format='GLB',
            export_apply=True,
            export_animations=True,
            export_cameras=False,
            export_lights=False,
        )
        
        final_size = os.path.getsize(output_path) / (1024 * 1024)
        print(f'[process_weapons] Successfully wrote {output_path} ({final_size:.2f} MB)')

def process_characters():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(RAW_DEST_DIR, exist_ok=True)
    
    for src_name, out_name in FBX_CHAR_MAP.items():
        input_path = os.path.join(SOURCE_DIR, src_name)
        if not os.path.exists(input_path):
            input_path = os.path.join(RAW_DEST_DIR, src_name)
        if not os.path.exists(input_path):
            print(f'[process_characters] Missing {src_name}, skipping')
            continue
            
        output_path = os.path.join(OUTPUT_DIR, out_name)
        initial_size = os.path.getsize(input_path) / (1024 * 1024)
        print(f'[process_characters] Processing FBX {src_name} -> {out_name} (initial size: {initial_size:.2f} MB)...')
        
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.fbx(filepath=input_path)
        prepare_and_optimize_scene(max_poly=35000)
        
        bpy.ops.export_scene.gltf(
            filepath=output_path,
            export_format='GLB',
            export_apply=False, # preserve armature & bone skinning weights
            export_animations=True,
            export_cameras=False,
            export_lights=False,
        )
        
        final_size = os.path.getsize(output_path) / (1024 * 1024)
        print(f'[process_characters] Successfully wrote {output_path} ({final_size:.2f} MB)')

if __name__ == '__main__':
    process_weapons()
    process_characters()
