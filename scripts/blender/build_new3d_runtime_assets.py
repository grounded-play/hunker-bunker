import bpy
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SOURCE = os.path.join(ROOT, 'art', 'source', 'new3d')
OUTPUT = os.path.join(ROOT, 'public', '3d', 'runtime')

ASSETS = {
    'CyberSnail.glb': 'cyber-snail.glb',
    'CyberSnailBoss.glb': 'cyber-snail-boss.glb',
    'SporeSnailBoss.glb': 'spore-snail-boss.glb',
    'Parasite L Starkie.fbx': 'parasite.glb',
    'Vanguard By T. Choonyung.fbx': 'engineer-vanguard.glb',
    os.path.join('tankOBJ', 'Looking.fbx'): 'tank-rigged.glb',
}


def import_asset(path):
    if path.lower().endswith('.fbx'):
        bpy.ops.import_scene.fbx(filepath=path)
    else:
        bpy.ops.import_scene.gltf(filepath=path)


def prepare_scene():
    for obj in list(bpy.context.scene.objects):
        if obj.type in {'CAMERA', 'LIGHT'}:
            bpy.data.objects.remove(obj, do_unlink=True)
    for image in bpy.data.images:
        if image.size[0] > 1024 or image.size[1] > 1024:
            ratio = min(1024 / image.size[0], 1024 / image.size[1])
            image.scale(max(1, round(image.size[0] * ratio)), max(1, round(image.size[1] * ratio)))
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH':
            continue
        obj.select_set(True)
        if len(obj.data.polygons) > 30000:
            bpy.context.view_layer.objects.active = obj
            modifier = obj.modifiers.new('RuntimeDecimate', 'DECIMATE')
            modifier.ratio = 30000 / len(obj.data.polygons)
            bpy.ops.object.modifier_apply(modifier=modifier.name)


def apply_rigged_tank_material():
    texture_dir = os.path.join(SOURCE, 'tankOBJ')
    material = bpy.data.materials.new('TankPBR')
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    principled = nodes.get('Principled BSDF')

    def texture_node(filename, color_space='Non-Color'):
        image = bpy.data.images.load(os.path.join(texture_dir, filename), check_existing=True)
        image.colorspace_settings.name = color_space
        node = nodes.new('ShaderNodeTexImage')
        node.image = image
        return node

    base = texture_node('texture_pbr_20250901.png', 'sRGB')
    metallic = texture_node('texture_pbr_20250901_metallic.png')
    roughness = texture_node('texture_pbr_20250901_roughness.png')
    normal_texture = texture_node('texture_pbr_20250901_normal.png')
    normal = nodes.new('ShaderNodeNormalMap')
    links.new(base.outputs['Color'], principled.inputs['Base Color'])
    links.new(metallic.outputs['Color'], principled.inputs['Metallic'])
    links.new(roughness.outputs['Color'], principled.inputs['Roughness'])
    links.new(normal_texture.outputs['Color'], normal.inputs['Color'])
    links.new(normal.outputs['Normal'], principled.inputs['Normal'])
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            obj.data.materials.clear()
            obj.data.materials.append(material)


os.makedirs(OUTPUT, exist_ok=True)
for source_name, output_name in ASSETS.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    import_asset(os.path.join(SOURCE, source_name))
    if output_name == 'tank-rigged.glb':
        apply_rigged_tank_material()
    prepare_scene()
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUTPUT, output_name),
        export_format='GLB',
        export_apply=True,
        export_animations=True,
        export_cameras=False,
        export_lights=False,
    )
    print(f'[new3d] wrote {output_name}')
