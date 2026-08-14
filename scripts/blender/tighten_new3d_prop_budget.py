import bpy
import os

# Follow-up pass to scripts/blender/optimize_uploaded_glbs.py's 25,000-tri /
# 1024px cap, which was too generous for this class of asset: a small
# (1.2m-2.4m world-scale, per docs/sprint-23-room-juice-and-dressing-assets.md
# section 2) repeatable prop viewed from the game's fixed isometric camera,
# not a hero/close-up asset. Verified via scratch/verify_prop_density_perf2.js
# + a direct Blender polycount pass that all 12 Sprint 23 signature/biomech
# GLBs were sitting at exactly the 25,000-tri cap with three 1024x1024 PBR
# maps each (~4-5.5MB/file) — a meaningful, avoidable share of the game's
# reported frame drops. The raw uploads this pipeline originally decimated
# from no longer exist in public/3d/, so this pass re-decimates the already-
# optimized new3ds/ output in place.
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
RUNTIME_DIR = os.path.join(ROOT, 'public', '3d', 'runtime', 'new3ds')

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

TRI_TARGET = 2500
TEXTURE_TARGET = 512


def tighten_scene():
    for image in bpy.data.images:
        if image.size[0] > TEXTURE_TARGET or image.size[1] > TEXTURE_TARGET:
            ratio = min(TEXTURE_TARGET / image.size[0], TEXTURE_TARGET / image.size[1])
            new_w = max(1, round(image.size[0] * ratio))
            new_h = max(1, round(image.size[1] * ratio))
            image.scale(new_w, new_h)

    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH':
            continue
        bpy.context.view_layer.objects.active = obj
        tri_count = sum(max(1, len(p.vertices) - 2) for p in obj.data.polygons)
        if tri_count > TRI_TARGET:
            modifier = obj.modifiers.new('BudgetDecimate', 'DECIMATE')
            modifier.ratio = TRI_TARGET / tri_count
            bpy.ops.object.modifier_apply(modifier=modifier.name)


def process_all():
    for filename in TARGET_GLBS:
        path = os.path.join(RUNTIME_DIR, filename)
        if not os.path.exists(path):
            print(f'[tighten_new3d] skipping missing {filename}')
            continue

        initial_size = os.path.getsize(path) / (1024 * 1024)
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=path)
        tighten_scene()

        bpy.ops.export_scene.gltf(
            filepath=path,
            export_format='GLB',
            export_apply=True,
            export_animations=True,
            export_cameras=False,
            export_lights=False,
        )

        final_size = os.path.getsize(path) / (1024 * 1024)
        print(f'[tighten_new3d] {filename}: {initial_size:.2f}MB -> {final_size:.2f}MB '
              f'({((initial_size - final_size) / initial_size) * 100:.1f}% smaller)')


if __name__ == '__main__':
    process_all()
