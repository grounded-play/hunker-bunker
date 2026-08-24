import os
import bpy

new_files = [
    'alien_proto_crawler_A.glb',
    'cybersnail_dead.glb',
    'npc_alien_rhun.glb',
    'npc_alien_vey.glb',
    'npc_civilian_miner.glb',
    'npc_civilian_researcher.glb',
    'prop_base_defense_turret.fbx',
    'prop_body_empty_exosuit.glb',
    'prop_body_human_frozen.glb',
    'sentinel_A.glb',
    'sentinel_B.glb'
]

base_dir = os.path.abspath('public/3d/runtime/new3ds')

for f in new_files:
    path = os.path.join(base_dir, f)
    if not os.path.exists(path):
        print(f'MISSING: {f}')
        continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    try:
        if f.endswith('.fbx'):
            bpy.ops.import_scene.fbx(filepath=path)
        else:
            bpy.ops.import_scene.gltf(filepath=path)
    except Exception as e:
        print(f'ERROR importing {f}: {e}')
        continue
    
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    armatures = [o for o in bpy.data.objects if o.type == 'ARMATURE']
    actions = list(bpy.data.actions)
    images = list(bpy.data.images)
    total_polys = sum(len(m.data.polygons) for m in meshes)
    
    # Calculate bounding box dimensions
    min_co = [float('inf')]*3
    max_co = [float('-inf')]*3
    for m in meshes:
        for corner in [m.matrix_world @ v.co for v in m.data.vertices]:
            for i in range(3):
                min_co[i] = min(min_co[i], corner[i])
                max_co[i] = max(max_co[i], corner[i])
    dims = [max_co[i] - min_co[i] for i in range(3)] if meshes else [0,0,0]
    
    print(f'=== {f} ({os.path.getsize(path)/(1024*1024):.1f} MB) ===')
    print(f'  Meshes: {len(meshes)}, Total Polygons: {total_polys}')
    print(f'  Dimensions (WxDxH / X,Y,Z): {dims[0]:.2f} x {dims[1]:.2f} x {dims[2]:.2f}')
    print(f'  Armatures: {len(armatures)} {[a.name for a in armatures]}')
    print(f'  Actions: {len(actions)} {[a.name for a in actions]}')
    print(f'  Images: {len(images)} {[(img.name, img.size[0], img.size[1]) for img in images[:5]]}')
