import os
import glob
import json
import re
import bpy

# Set input and output directories
# Authoring sources live outside the public release tree. Runtime GLBs remain
# under public/3d/runtime/community and are the only files shipped.
FBX_DIR = os.path.abspath('art/source/3d/community')
OUTPUT_DIR = os.path.abspath('public/3d/runtime/community')
os.makedirs(OUTPUT_DIR, exist_ok=True)

fbx_files = sorted(glob.glob(os.path.join(FBX_DIR, '*.fbx')))
print(f"[CONVERT] Found {len(fbx_files)} FBX files in {FBX_DIR}")

manifest = []

def to_camel_case(text):
    words = re.findall(r'[a-zA-Z0-9]+', text)
    if not words:
        return 'anim'
    return words[0].lower() + ''.join(w.capitalize() for w in words[1:])

def parse_filename(filename):
    # e.g. "Acknowledging - Scout Foxhole Shadow.fbx"
    # e.g. "Catwalk Walking -  Scout ABG.fbx"
    base = os.path.splitext(filename)[0]
    parts = base.split(' - ')
    if len(parts) >= 2:
        action_raw = parts[0].strip()
        char_raw = parts[1].strip()
    else:
        action_raw = "Action"
        char_raw = parts[0].strip()
    
    # Determine class
    class_id = 'scout'
    char_lower = char_raw.lower()
    if 'tank' in char_lower:
        class_id = 'tank'
    elif 'eng' in char_lower or 'engineer' in char_lower:
        class_id = 'engineer'
    elif 'scout' in char_lower or 'scount' in char_lower:
        class_id = 'scout'
    
    # Clean slug
    clean_char = re.sub(r'[^a-zA-Z0-9]+', '_', char_raw).strip('_').lower()
    clean_action = to_camel_case(action_raw)
    slug = f"{clean_char}"
    display_name = char_raw.replace('Scount', 'Scout').replace('Eng ', 'Engineer ').strip()
    
    return {
        'action_raw': action_raw,
        'action_key': clean_action,
        'char_raw': char_raw,
        'class_id': class_id,
        'slug': slug,
        'display_name': display_name
    }

for idx, fbx_path in enumerate(fbx_files):
    fname = os.path.basename(fbx_path)
    info = parse_filename(fname)
    out_glb_name = f"{info['slug']}.glb"
    out_glb_path = os.path.join(OUTPUT_DIR, out_glb_name)
    
    print(f"\n[{idx+1}/{len(fbx_files)}] Processing: {fname}")
    print(f"  -> Class: {info['class_id']} | Action: {info['action_key']} | Output: {out_glb_name}")
    
    # Reset Blender Scene
    bpy.ops.wm.read_factory_settings(use_empty=True)
    
    # Import FBX
    try:
        bpy.ops.import_scene.fbx(filepath=fbx_path, use_anim=True)
    except Exception as e:
        print(f"  [ERROR] Failed to import {fname}: {e}")
        continue
    
    # Find and rename action
    imported_actions = list(bpy.data.actions)
    if imported_actions:
        for act in imported_actions:
            act.name = info['action_key']
            print(f"  -> Renamed action to: {act.name} (frames: {act.frame_range[0]}-{act.frame_range[1]})")
    
    # Export to GLB
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
        print(f"  -> Successfully exported GLB ({file_size_mb:.2f} MB)")
        
        manifest.append({
            'id': f"comm_{info['slug']}",
            'filename': fname,
            'slug': info['slug'],
            'name': info['display_name'],
            'classId': info['class_id'],
            'actionKey': info['action_key'],
            'actionLabel': info['action_raw'],
            'glbUrl': f"/3d/runtime/community/{out_glb_name}",
            'sizeMb': round(file_size_mb, 2)
        })
    except Exception as e:
        print(f"  [ERROR] Failed to export GLB for {fname}: {e}")

manifest_path = os.path.join(OUTPUT_DIR, 'manifest.json')
with open(manifest_path, 'w', encoding='utf-8') as f:
    json.dump(manifest, f, indent=2)

print(f"\n[DONE] Successfully converted {len(manifest)} models. Manifest written to {manifest_path}")
