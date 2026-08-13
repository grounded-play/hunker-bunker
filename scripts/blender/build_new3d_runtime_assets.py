import bpy
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SOURCE = os.path.join(ROOT, 'art', 'source', 'new3d')
OUTPUT = os.path.join(ROOT, 'public', '3d', 'runtime')
NEW3DS = os.path.join(OUTPUT, 'new3ds')

ASSETS = {
    'CyberSnail.glb': 'cyber-snail.glb',
    'CyberSnailBoss.glb': 'cyber-snail-boss.glb',
    'SporeSnailBoss.glb': 'spore-snail-boss.glb',
    'Parasite L Starkie.fbx': 'parasite.glb',
    'Vanguard By T. Choonyung.fbx': 'engineer-vanguard.glb',
    os.path.join('tankOBJ', 'Looking.fbx'): 'tank-rigged.glb',
    os.path.join('assets', 'BasicPile.glb'): 'basic-pile.glb',
    os.path.join('assets', 'BioStalker.glb'): 'bio-stalker.glb',
    os.path.join('assets', 'BrokenEngeShip.glb'): 'broken-engineer-ship.glb',
    os.path.join('assets', 'BrokenScoutShip.glb'): 'broken-scout-ship.glb',
    os.path.join('assets', 'BrokenTankShip.glb'): 'broken-tank-ship.glb',
    os.path.join('assets', 'CyroSnailBoss.glb'): 'cryo-snail-boss.glb',
    os.path.join('assets', 'FrozenTanker.glb'): 'frozen-tanker.glb',
    os.path.join('assets', 'FusionGene.glb'): 'fusion-generator.glb',
    os.path.join('assets', 'HullMatrix.glb'): 'hull-matrix.glb',
    os.path.join('assets', 'Queen.glb'): 'queen.glb',
    os.path.join('assets', 'Radar.glb'): 'radar.glb',
    os.path.join('assets', 'StorageLocker.glb'): 'storage-locker.glb',
    os.path.join('assets', 'console.glb'): 'console.glb',
    os.path.join('assets', 'o2Gen.glb'): 'o2-generator.glb',
}

NEW3D_ASSETS = [
    'bunker_junk_rare.glb',
    'bunker_junk_uncommon.glb',
    'fungal_spore_vent.glb',
    'prop_biomech_arch.glb',
    'prop_broken_specimen_tank.glb',
    'prop_bunker_supplies.glb',
    'prop_cave_bones.glb',
    'prop_cave_queen_throne.glb',
    'prop_conduit_hub.glb',
    'prop_diagnostic_console.glb',
    'prop_medical_bed.glb',
    'prop_security_barricade.glb',
    'prop_specimen_tank.glb',
    'prop_surgical_cart.glb',
    'spore_mortar.glb',
    'sporesnail.glb',
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


def apply_engineer_material():
    texture_dir = os.path.join(SOURCE, 'assets', 'Enge')
    material = bpy.data.materials.new('EngineerPBR')
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
        if obj.type == 'MESH' and len(obj.data.polygons) > 100:
            obj.data.materials.clear()
            obj.data.materials.append(material)


def build_rigged_engineer():
    gesture_dir = os.path.join(SOURCE, 'assets', 'Enge', 'Gestures Pack Basic')
    base_path = os.path.join(gesture_dir, '85b0718479a50b3aacd076ee658d40d1.fbx')
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=base_path)
    base_armature = next(obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE')
    for obj in list(bpy.context.scene.objects):
        if obj.type in {'CAMERA', 'LIGHT'} or (obj.type == 'MESH' and len(obj.data.polygons) <= 100):
            bpy.data.objects.remove(obj, do_unlink=True)
    if base_armature.animation_data and base_armature.animation_data.action:
        base_armature.animation_data.action.name = 'engineerBind'
        base_armature.animation_data.action.use_fake_user = True

    gesture_names = {
        'weight shift': 'engineerWeightShift',
        'dismissing gesture': 'engineerDismiss',
        'thoughtful head shake': 'engineerThoughtful',
        'being cocky': 'engineerCocky',
        'happy hand gesture': 'engineerHappy',
        'relieved sigh': 'engineerRelieved',
        'head nod yes': 'engineerNod',
        'angry gesture': 'engineerAngry',
        'annoyed head shake': 'engineerAnnoyed',
        'look away gesture': 'engineerLookAway',
        'sarcastic head nod': 'engineerSarcastic',
        'acknowledging': 'engineerAcknowledge',
        'hard head nod': 'engineerHardNod',
        'lengthy head nod': 'engineerLongNod',
        'shaking head no': 'engineerNo',
    }
    for source_stem, action_name in gesture_names.items():
        before_objects = set(bpy.context.scene.objects)
        bpy.ops.import_scene.fbx(filepath=os.path.join(gesture_dir, f'{source_stem}.fbx'))
        imported = [obj for obj in bpy.context.scene.objects if obj not in before_objects]
        imported_armature = next((obj for obj in imported if obj.type == 'ARMATURE'), None)
        action = imported_armature.animation_data.action if imported_armature and imported_armature.animation_data else None
        if action:
            action.name = action_name
            action.use_fake_user = True
        for obj in imported:
            bpy.data.objects.remove(obj, do_unlink=True)

    apply_engineer_material()
    prepare_scene()
    bpy.context.view_layer.objects.active = base_armature
    base_armature.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUTPUT, 'engineer-rigged-gestures.glb'),
        export_format='GLB',
        export_apply=True,
        export_animations=True,
        export_animation_mode='ACTIONS',
        export_extra_animations=True,
        export_cameras=False,
        export_lights=False,
    )
    print('[new3d] wrote engineer-rigged-gestures.glb')


os.makedirs(OUTPUT, exist_ok=True)
if os.environ.get('HB_NEW3DS_ONLY') == '1':
    for filename in NEW3D_ASSETS:
        source_path = os.path.join(NEW3DS, filename)
        temporary_path = os.path.join(NEW3DS, f'.{filename}.optimized.glb')
        bpy.ops.wm.read_factory_settings(use_empty=True)
        import_asset(source_path)
        prepare_scene()
        bpy.ops.export_scene.gltf(
            filepath=temporary_path,
            export_format='GLB',
            export_apply=True,
            export_animations=True,
            export_cameras=False,
            export_lights=False,
        )
        os.replace(temporary_path, source_path)
        print(f'[new3d] optimized {filename}')
    raise SystemExit(0)
if os.environ.get('HB_NEW3D_ONLY') == '1' or os.environ.get('HB_ENGINEER_ONLY') == '1':
    build_rigged_engineer()
for source_name, output_name in ASSETS.items():
    if os.environ.get('HB_ENGINEER_ONLY') == '1':
        continue
    if os.environ.get('HB_NEW3D_ONLY') == '1' and not source_name.startswith(f'assets{os.sep}'):
        continue
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
