import os
import glob
import re
import bpy

TARGET_DIR = os.path.abspath('public/3d/runtime/new3ds')
# Keep Blender inputs outside the public release tree so build-media auditing
# cannot accidentally publish source FBX files.
FBX_DIR = os.path.abspath('art/source/3d/season')
os.makedirs(TARGET_DIR, exist_ok=True)

# Mapping from pattern/keyword to target glb filename and action name
MAPPINGS = [
    {
        'pattern': 'Itemdef 4104',
        'target_glb': 'skin_rust_bone_trench.glb',
        'itemdef': '4104',
        'type': 'weapon'
    },
    {
        'pattern': 'Itemdef 4111 — Solar Flare Antimatter Rifle.fbx',
        'target_glb': 'skin_solar_flare_antimatter.glb',
        'itemdef': '4111',
        'type': 'weapon'
    },
    {
        'pattern': 'Itemdef 4145',
        'target_glb': 'mod_echo_location_transceiver.glb',
        'itemdef': '4145',
        'type': 'mod'
    },
    {
        'pattern': 'Itemdef 4146',
        'target_glb': 'mod_symbiotic_adrenaline_pump.glb',
        'itemdef': '4146',
        'type': 'mod'
    },
    {
        'pattern': 'Itemdef 4115',
        'target_glb': 'chassis_void_commando_recon.glb',
        'action': 'standingGreeting',
        'itemdef': '4115',
        'type': 'chassis',
        'class': 'scout'
    },
    {
        'pattern': 'Itemdef 4116',
        'target_glb': 'chassis_bio_synthesizer_medic.glb',
        'action': 'pickFruit',
        'itemdef': '4116',
        'type': 'chassis',
        'class': 'engineer'
    },
    {
        'pattern': 'Itemdef 4117',
        'target_glb': 'chassis_dreadnought_exo_juggernaut.glb',
        'action': 'crawling',
        'itemdef': '4117',
        'type': 'chassis',
        'class': 'tank'
    },
    {
        'pattern': 'Itemdef 4118',
        'target_glb': 'chassis_cyber_spectre_infiltrator.glb',
        'action': 'cowMilking',
        'itemdef': '4118',
        'type': 'chassis',
        'class': 'scout'
    },
    {
        'pattern': 'Itemdef 4119',
        'target_glb': 'chassis_hive_lord_symbiote.glb',
        'action': 'unarmedRunForward',
        'itemdef': '4119',
        'type': 'chassis',
        'class': 'tank'
    },
    {
        'pattern': '5003',
        'target_glb': 'chassis_scout_cartographer.glb',
        'action': 'idleCartographer',
        'itemdef': '5003',
        'type': 'chassis',
        'class': 'scout'
    },
    {
        'pattern': '5004',
        'target_glb': 'chassis_scout_pioneer_courier.glb',
        'action': 'walkWithRifle',
        'itemdef': '5004',
        'type': 'chassis',
        'class': 'scout'
    },
    {
        'pattern': '5005',
        'target_glb': 'chassis_tank_old_iron.glb',
        'action': 'joggingWithBox',
        'itemdef': '5005',
        'type': 'chassis',
        'class': 'tank'
    },
    {
        'pattern': '5007',
        'target_glb': 'chassis_tank_colossus_hive.glb',
        'action': 'defeat',
        'itemdef': '5007',
        'type': 'chassis',
        'class': 'tank'
    },
    {
        'pattern': '5008',
        'target_glb': 'chassis_tank_gentle_titan.glb',
        'action': 'talkingAtWatercooler',
        'itemdef': '5008',
        'type': 'chassis',
        'class': 'tank'
    },
    {
        'pattern': '5011',
        'target_glb': 'chassis_engineer_chen_undying.glb',
        'action': 'rightStrafeWalk',
        'itemdef': '5011',
        'type': 'chassis',
        'class': 'engineer'
    },
    {
        'pattern': '5012',
        'target_glb': 'chassis_engineer_exodus_vanguard.glb',
        'action': 'rejected',
        'itemdef': '5012',
        'type': 'chassis',
        'class': 'engineer'
    }
]

fbx_files = glob.glob(os.path.join(FBX_DIR, '*.fbx'))
print(f"[SEASON CONVERT] Found {len(fbx_files)} total FBX files in {FBX_DIR}")

processed = set()

for mapping in MAPPINGS:
    pattern = mapping['pattern']
    matched_fbx = None
    for f in fbx_files:
        if pattern in os.path.basename(f):
            matched_fbx = f
            break
    
    if not matched_fbx:
        print(f"[WARNING] No match for pattern '{pattern}'")
        continue

    fname = os.path.basename(matched_fbx)
    out_glb_path = os.path.join(TARGET_DIR, mapping['target_glb'])
    action_name = mapping.get('action', 'DefaultAction')
    
    print(f"\nProcessing [{mapping['itemdef']}] {fname}")
    print(f"  -> Target GLB: {mapping['target_glb']}")
    
    # Reset scene
    bpy.ops.wm.read_factory_settings(use_empty=True)
    
    try:
        bpy.ops.import_scene.fbx(filepath=matched_fbx, use_anim=True)
    except Exception as e:
        print(f"  [ERROR] Failed to import {fname}: {e}")
        continue
    
    # Rename action if present
    imported_actions = list(bpy.data.actions)
    if imported_actions:
        for act in imported_actions:
            act.name = action_name
            print(f"  -> Renamed action to '{act.name}' ({act.frame_range[0]}-{act.frame_range[1]})")
            
    # Export GLB
    try:
        bpy.ops.export_scene.gltf(
            filepath=out_glb_path,
            export_format='GLB',
            export_yup=True,
            export_apply=False,
            export_animations=True,
            export_current_frame=False,
            export_skins=True,
            export_morph=True,
            export_lights=False,
            export_cameras=False
        )
        file_size_mb = os.path.getsize(out_glb_path) / (1024 * 1024)
        print(f"  -> Exported to {out_glb_path} ({file_size_mb:.2f} MB)")
        processed.add(mapping['itemdef'])
    except Exception as e:
        print(f"  [ERROR] Failed to export GLB for {fname}: {e}")

print(f"\n[DONE] Successfully processed {len(processed)} items into {TARGET_DIR}")
