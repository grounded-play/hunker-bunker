import os
import math
import bpy

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SOURCE_DIR = os.path.join(ROOT, 'art', 'source', '3d', 'uploads-sprint29')
OUTPUT_DIR = os.path.join(ROOT, 'public', '3d', 'runtime', 'new3ds')

os.makedirs(OUTPUT_DIR, exist_ok=True)

def optimize_textures(max_size=1024):
    for img in list(bpy.data.images):
        if img.size[0] > max_size or img.size[1] > max_size:
            ratio = min(max_size / img.size[0], max_size / img.size[1])
            new_w = max(1, round(img.size[0] * ratio))
            new_h = max(1, round(img.size[1] * ratio))
            print(f"    Rescaling image {img.name} ({img.size[0]}x{img.size[1]} -> {new_w}x{new_h})")
            img.scale(new_w, new_h)

def decimate_mesh(mesh_obj, target_poly=25000):
    poly_count = len(mesh_obj.data.polygons)
    if poly_count > target_poly:
        ratio = target_poly / poly_count
        print(f"    Decimating {mesh_obj.name}: {poly_count} -> {target_poly} (ratio: {ratio:.3f})")
        mod = mesh_obj.modifiers.new('Decimate', 'DECIMATE')
        mod.ratio = ratio
        bpy.context.view_layer.objects.active = mesh_obj
        bpy.ops.object.modifier_apply(modifier=mod.name)

def clean_scene():
    for obj in list(bpy.context.scene.objects):
        if obj.type in {'CAMERA', 'LIGHT'}:
            bpy.data.objects.remove(obj, do_unlink=True)

def center_and_ground_mesh(mesh_obj):
    # Center XY and ground Z at 0
    bpy.context.view_layer.objects.active = mesh_obj
    mesh_obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    
    # Calculate bounding box in world coordinates
    corners = [mesh_obj.matrix_world @ v.co for v in mesh_obj.data.vertices]
    min_x = min(c.x for c in corners)
    max_x = max(c.x for c in corners)
    min_y = min(c.y for c in corners)
    max_y = max(c.y for c in corners)
    min_z = min(c.z for c in corners)
    
    center_x = (min_x + max_x) / 2.0
    center_y = (min_y + max_y) / 2.0
    
    mesh_obj.location.x -= center_x
    mesh_obj.location.y -= center_y
    mesh_obj.location.z -= min_z
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)

def build_humanoid_rig_and_idle(mesh_obj, height=1.8):
    # Ground and scale mesh appropriately
    center_and_ground_mesh(mesh_obj)
    
    # Check bounding box height
    corners = [mesh_obj.matrix_world @ v.co for v in mesh_obj.data.vertices]
    max_z = max(c.z for c in corners)
    min_z = min(c.z for c in corners)
    actual_h = max_z - min_z
    
    if actual_h < 0.1:
        actual_h = 1.0
    scale_factor = height / actual_h
    mesh_obj.scale = (scale_factor, scale_factor, scale_factor)
    bpy.context.view_layer.objects.active = mesh_obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    
    # Create Armature
    bpy.ops.object.armature_add(location=(0, 0, 0))
    arm_obj = bpy.context.active_object
    arm_obj.name = "HumanoidRig"
    
    bpy.ops.object.mode_set(mode='EDIT')
    edit_bones = arm_obj.data.edit_bones
    root_bone = edit_bones[0]
    root_bone.name = "Root"
    root_bone.head = (0, 0, 0)
    root_bone.tail = (0, 0, height * 0.1)
    
    # Hips / Spine / Chest / Head
    hips = edit_bones.new("Hips")
    hips.head = (0, 0, height * 0.5)
    hips.tail = (0, 0, height * 0.6)
    hips.parent = root_bone
    
    chest = edit_bones.new("Chest")
    chest.head = (0, 0, height * 0.6)
    chest.tail = (0, 0, height * 0.8)
    chest.parent = hips
    
    head = edit_bones.new("Head")
    head.head = (0, 0, height * 0.8)
    head.tail = (0, 0, height * 1.0)
    head.parent = chest
    
    # Arms L / R
    arm_l = edit_bones.new("Arm_L")
    arm_l.head = (height * 0.15, 0, height * 0.75)
    arm_l.tail = (height * 0.45, 0, height * 0.7)
    arm_l.parent = chest
    
    arm_r = edit_bones.new("Arm_R")
    arm_r.head = (-height * 0.15, 0, height * 0.75)
    arm_r.tail = (-height * 0.45, 0, height * 0.7)
    arm_r.parent = chest
    
    # Legs L / R
    leg_l = edit_bones.new("Leg_L")
    leg_l.head = (height * 0.1, 0, height * 0.5)
    leg_l.tail = (height * 0.1, 0, 0)
    leg_l.parent = hips
    
    leg_r = edit_bones.new("Leg_R")
    leg_r.head = (-height * 0.1, 0, height * 0.5)
    leg_r.tail = (-height * 0.1, 0, 0)
    leg_r.parent = hips
    
    bpy.ops.object.mode_set(mode='OBJECT')
    
    # Parent Mesh to Armature with automatic weights
    bpy.ops.object.select_all(action='DESELECT')
    mesh_obj.select_set(True)
    arm_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    
    # Create an Idle Action
    action = bpy.data.actions.new(name="idle")
    arm_obj.animation_data_create()
    arm_obj.animation_data.action = action
    
    bpy.ops.object.mode_set(mode='POSE')
    chest_pbone = arm_obj.pose.bones.get("Chest")
    head_pbone = arm_obj.pose.bones.get("Head")
    arm_l_pbone = arm_obj.pose.bones.get("Arm_L")
    arm_r_pbone = arm_obj.pose.bones.get("Arm_R")
    
    # Keyframe frames 0, 30, 60 (2 second loop at 30 fps)
    for frame in [0, 60]:
        bpy.context.scene.frame_set(frame)
        if chest_pbone:
            chest_pbone.rotation_mode = 'XYZ'
            chest_pbone.rotation_euler = (0, 0, 0)
            chest_pbone.keyframe_insert(data_path="rotation_euler", frame=frame)
        if head_pbone:
            head_pbone.rotation_mode = 'XYZ'
            head_pbone.rotation_euler = (0, 0, 0)
            head_pbone.keyframe_insert(data_path="rotation_euler", frame=frame)
            
    # Mid-breath frame 30
    bpy.context.scene.frame_set(30)
    if chest_pbone:
        chest_pbone.rotation_euler = (math.radians(2.0), 0, 0)
        chest_pbone.keyframe_insert(data_path="rotation_euler", frame=30)
    if head_pbone:
        head_pbone.rotation_euler = (math.radians(-1.5), 0, 0)
        head_pbone.keyframe_insert(data_path="rotation_euler", frame=30)
        
    bpy.ops.object.mode_set(mode='OBJECT')
    return arm_obj

def build_sentinel_rig_and_hover(mesh_obj, height=1.2):
    center_and_ground_mesh(mesh_obj)
    
    # Create Armature
    bpy.ops.object.armature_add(location=(0, 0, 0))
    arm_obj = bpy.context.active_object
    arm_obj.name = "SentinelRig"
    
    bpy.ops.object.mode_set(mode='EDIT')
    edit_bones = arm_obj.data.edit_bones
    root_bone = edit_bones[0]
    root_bone.name = "Root"
    root_bone.head = (0, 0, 0)
    root_bone.tail = (0, 0, 0.2)
    
    core = edit_bones.new("Core")
    core.head = (0, 0, 0.5)
    core.tail = (0, 0, 0.9)
    core.parent = root_bone
    
    bpy.ops.object.mode_set(mode='OBJECT')
    
    # Parent Mesh to Armature
    bpy.ops.object.select_all(action='DESELECT')
    mesh_obj.select_set(True)
    arm_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    
    # Create Hover Action
    action = bpy.data.actions.new(name="idle")
    arm_obj.animation_data_create()
    arm_obj.animation_data.action = action
    
    bpy.ops.object.mode_set(mode='POSE')
    core_pbone = arm_obj.pose.bones.get("Core")
    
    for frame in [0, 60]:
        bpy.context.scene.frame_set(frame)
        if core_pbone:
            core_pbone.location = (0, 0, 0)
            core_pbone.rotation_mode = 'XYZ'
            core_pbone.rotation_euler = (0, 0, 0)
            core_pbone.keyframe_insert(data_path="location", frame=frame)
            core_pbone.keyframe_insert(data_path="rotation_euler", frame=frame)
            
    bpy.context.scene.frame_set(30)
    if core_pbone:
        core_pbone.location = (0, 0, 0.08) # 8cm hover bob
        core_pbone.rotation_euler = (math.radians(2.0), math.radians(1.5), 0)
        core_pbone.keyframe_insert(data_path="location", frame=30)
        core_pbone.keyframe_insert(data_path="rotation_euler", frame=30)
        
    bpy.ops.object.mode_set(mode='OBJECT')
    return arm_obj

def build_crawler_rig_and_walk(mesh_obj, length=1.4):
    center_and_ground_mesh(mesh_obj)
    
    # Create Armature
    bpy.ops.object.armature_add(location=(0, 0, 0))
    arm_obj = bpy.context.active_object
    arm_obj.name = "CrawlerRig"
    
    bpy.ops.object.mode_set(mode='EDIT')
    edit_bones = arm_obj.data.edit_bones
    root_bone = edit_bones[0]
    root_bone.name = "Root"
    root_bone.head = (0, 0, 0)
    root_bone.tail = (0, 0, 0.15)
    
    body = edit_bones.new("Thorax")
    body.head = (0, 0, 0.2)
    body.tail = (0, length * 0.3, 0.25)
    body.parent = root_bone
    
    head = edit_bones.new("Head")
    head.head = (0, length * 0.3, 0.25)
    head.tail = (0, length * 0.5, 0.2)
    head.parent = body
    
    # 4 Legs
    leg_fl = edit_bones.new("Leg_FL")
    leg_fl.head = (0.2, length * 0.25, 0.2)
    leg_fl.tail = (0.45, length * 0.35, 0)
    leg_fl.parent = body
    
    leg_fr = edit_bones.new("Leg_FR")
    leg_fr.head = (-0.2, length * 0.25, 0.2)
    leg_fr.tail = (-0.45, length * 0.35, 0)
    leg_fr.parent = body
    
    leg_bl = edit_bones.new("Leg_BL")
    leg_bl.head = (0.2, -length * 0.2, 0.2)
    leg_bl.tail = (0.45, -length * 0.3, 0)
    leg_bl.parent = body
    
    leg_br = edit_bones.new("Leg_BR")
    leg_br.head = (-0.2, -length * 0.2, 0.2)
    leg_br.tail = (-0.45, -length * 0.3, 0)
    leg_br.parent = body
    
    bpy.ops.object.mode_set(mode='OBJECT')
    
    # Parent Mesh to Armature
    bpy.ops.object.select_all(action='DESELECT')
    mesh_obj.select_set(True)
    arm_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    
    # Create Crawl Action
    action = bpy.data.actions.new(name="idle")
    arm_obj.animation_data_create()
    arm_obj.animation_data.action = action
    
    bpy.ops.object.mode_set(mode='POSE')
    body_pbone = arm_obj.pose.bones.get("Thorax")
    head_pbone = arm_obj.pose.bones.get("Head")
    
    for frame in [0, 60]:
        bpy.context.scene.frame_set(frame)
        if body_pbone:
            body_pbone.location = (0, 0, 0)
            body_pbone.keyframe_insert(data_path="location", frame=frame)
        if head_pbone:
            head_pbone.rotation_mode = 'XYZ'
            head_pbone.rotation_euler = (0, 0, 0)
            head_pbone.keyframe_insert(data_path="rotation_euler", frame=frame)
            
    bpy.context.scene.frame_set(30)
    if body_pbone:
        body_pbone.location = (0, 0, -0.03) # subtle breathing squat
        body_pbone.keyframe_insert(data_path="location", frame=30)
    if head_pbone:
        head_pbone.rotation_euler = (math.radians(4.0), 0, math.radians(2.0))
        head_pbone.keyframe_insert(data_path="rotation_euler", frame=30)
        
    bpy.ops.object.mode_set(mode='OBJECT')
    return arm_obj

def export_glb(output_path, has_armature=False):
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        export_apply=not has_armature,
        export_animations=True,
        export_current_frame=False,
        export_skins=True,
        export_morph=True,
        export_lights=False,
        export_cameras=False
    )
    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"  -> Successfully exported: {output_path} ({size_mb:.2f} MB)")

def process_all():
    tasks = [
        {
            'src': 'alien_proto_crawler_A.glb',
            'targets': ['alien_proto_crawler.glb', 'alien_proto_crawler_A.glb'],
            'type': 'crawler',
            'poly': 25000,
            'tex': 1024,
            'scale': 1.4
        },
        {
            'src': 'cybersnail_dead.glb',
            'targets': ['cybersnail_dead.glb'],
            'type': 'prop',
            'poly': 20000,
            'tex': 1024
        },
        {
            'src': 'npc_alien_rhun.glb',
            'targets': ['npc_alien_rhun.glb'],
            'type': 'humanoid',
            'poly': 25000,
            'tex': 1024,
            'scale': 2.0
        },
        {
            'src': 'npc_alien_vey.glb',
            'targets': ['npc_alien_vey.glb'],
            'type': 'humanoid',
            'poly': 25000,
            'tex': 1024,
            'scale': 1.75
        },
        {
            'src': 'npc_civilian_miner.glb',
            'targets': ['npc_civilian_miner.glb'],
            'type': 'humanoid',
            'poly': 25000,
            'tex': 1024,
            'scale': 1.85
        },
        {
            'src': 'npc_civilian_researcher.glb',
            'targets': ['npc_civilian_researcher.glb'],
            'type': 'humanoid',
            'poly': 25000,
            'tex': 1024,
            'scale': 1.8
        },
        {
            'src': 'prop_base_defense_turret.fbx',
            'targets': ['prop_base_defense_turret.glb'],
            'type': 'prop',
            'poly': 25000,
            'tex': 1024
        },
        {
            'src': 'prop_body_empty_exosuit.glb',
            'targets': ['prop_body_empty_exosuit.glb'],
            'type': 'prop',
            'poly': 20000,
            'tex': 1024
        },
        {
            'src': 'prop_body_human_frozen.glb',
            'targets': ['prop_body_human_frozen.glb'],
            'type': 'prop',
            'poly': 25000,
            'tex': 1024
        },
        {
            'src': 'sentinel_A.glb',
            'targets': ['sentinel.glb', 'sentinel_A.glb'],
            'type': 'sentinel',
            'poly': 22000,
            'tex': 1024,
            'scale': 1.2
        },
        {
            'src': 'sentinel_B.glb',
            'targets': ['sentinel_B.glb'],
            'type': 'sentinel',
            'poly': 22000,
            'tex': 1024,
            'scale': 1.2
        }
    ]

    for task in tasks:
        src_path = os.path.join(SOURCE_DIR, task['src'])
        if not os.path.exists(src_path):
            print(f"[SKIP] Source file {src_path} not found")
            continue
            
        print(f"\n==========================================")
        print(f"Processing: {task['src']} -> {task['targets']}")
        bpy.ops.wm.read_factory_settings(use_empty=True)
        clean_scene()
        
        if task['src'].endswith('.fbx'):
            bpy.ops.import_scene.fbx(filepath=src_path)
        else:
            bpy.ops.import_scene.gltf(filepath=src_path)
            
        clean_scene()
        meshes = [o for o in bpy.data.objects if o.type == 'MESH']
        if not meshes:
            print(f"  [ERROR] No mesh found in {task['src']}")
            continue
            
        primary_mesh = meshes[0]
        if len(meshes) > 1:
            bpy.context.view_layer.objects.active = primary_mesh
            for m in meshes:
                m.select_set(True)
            bpy.ops.object.join()
            primary_mesh = bpy.context.active_object
            
        optimize_textures(max_size=task['tex'])
        decimate_mesh(primary_mesh, target_poly=task['poly'])
        
        has_armature = False
        t = task['type']
        if t == 'humanoid':
            build_humanoid_rig_and_idle(primary_mesh, height=task.get('scale', 1.8))
            has_armature = True
        elif t == 'sentinel':
            build_sentinel_rig_and_hover(primary_mesh, height=task.get('scale', 1.2))
            has_armature = True
        elif t == 'crawler':
            build_crawler_rig_and_walk(primary_mesh, length=task.get('scale', 1.4))
            has_armature = True
        else:
            center_and_ground_mesh(primary_mesh)
            has_armature = False
            
        for target in task['targets']:
            out_path = os.path.join(OUTPUT_DIR, target)
            export_glb(out_path, has_armature=has_armature)

if __name__ == '__main__':
    process_all()
