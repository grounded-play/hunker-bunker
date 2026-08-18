import bpy
import os
import math

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SOURCE_DIR = os.path.join(ROOT, 'public', '3d')
OUTPUT_DIR = os.path.join(ROOT, 'public', '3d', 'runtime', 'new3ds')

TARGET_GLBS = [
    'prop_ammo_crate_stack.glb',
    'prop_biomech_flesh_locker.glb',
    'prop_biomech_incubator.glb',
    'prop_biomech_neural_synapse.glb',
    'prop_biomech_respirator.glb',
    'prop_biomech_sphincter_trap.glb',
    'prop_biomech_triage_cradle.glb',
    'prop_fabricator_workstation.glb',
    'prop_laser_trap_emitter.glb',
    'prop_o2_filter_vat.glb',
    'prop_tesla_coil_node.glb',
    'prop_vital_monitor.glb',
]

def prepare_and_optimize_scene(rotate_y_180=True):
    # Remove lights and cameras
    for obj in list(bpy.context.scene.objects):
        if obj.type in {'CAMERA', 'LIGHT'}:
            bpy.data.objects.remove(obj, do_unlink=True)
            
    # Resize high-res textures
    for image in bpy.data.images:
        if image.size[0] > 1024 or image.size[1] > 1024:
            ratio = min(1024 / image.size[0], 1024 / image.size[1])
            new_w = max(1, round(image.size[0] * ratio))
            new_h = max(1, round(image.size[1] * ratio))
            image.scale(new_w, new_h)
            
    # Decimate meshes and optionally apply rotation
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH':
            continue
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        
        # Apply 180-degree rotation on vertical Y/Z axis if needed
        if rotate_y_180:
            obj.rotation_euler[2] += math.pi # In blender Z is vertical up for gltf, or Y depending on orientation
            bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
            
        if len(obj.data.polygons) > 25000:
            modifier = obj.modifiers.new('RuntimeDecimate', 'DECIMATE')
            modifier.ratio = 25000 / len(obj.data.polygons)
            bpy.ops.object.modifier_apply(modifier=modifier.name)

def process_all():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    for filename in TARGET_GLBS:
        input_path = os.path.join(SOURCE_DIR, filename)
        output_path = os.path.join(OUTPUT_DIR, filename)
        if not os.path.exists(input_path):
            print(f'[optimize_glbs] skipping missing {filename}')
            continue
            
        initial_size = os.path.getsize(input_path) / (1024 * 1024)
        print(f'[optimize_glbs] processing {filename} (initial size: {initial_size:.2f} MB)...')
        
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=input_path)
        prepare_and_optimize_scene(rotate_y_180=False)
        
        bpy.ops.export_scene.gltf(
            filepath=output_path,
            export_format='GLB',
            export_apply=True,
            export_animations=True,
            export_cameras=False,
            export_lights=False,
        )
        
        final_size = os.path.getsize(output_path) / (1024 * 1024)
        print(f'[optimize_glbs] wrote {output_path} ({final_size:.2f} MB, reduced by {((initial_size - final_size)/initial_size)*100:.1f}%)')

if __name__ == '__main__':
    process_all()
