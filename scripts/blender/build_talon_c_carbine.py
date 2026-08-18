"""
Headless Blender build script for Scout's Secondary Weapon Archetype: Talon-C Carbine
Target: public/3d/runtime/new3ds/gun_scout_talon_c.glb

Implements docs/season-zero-protocol/07-armory-and-weapon-bench.md §4
and docs/armory-and-class-weapons-worklog.md Task 2.
"""
import bpy
import math
import os

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', '3d', 'runtime', 'new3ds')


def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in list(bpy.data.meshes):
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in list(bpy.data.materials):
        if block.users == 0:
            bpy.data.materials.remove(block)


def make_material(name, base_color, emission_color=None, emission_strength=0.0, metallic=0.2, roughness=0.5, alpha=1.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*base_color, alpha)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if alpha < 1.0:
        mat.blend_method = 'BLEND'
        bsdf.inputs['Alpha'].default_value = alpha
    if emission_color:
        bsdf.inputs['Emission Color'].default_value = (*emission_color, 1.0)
        bsdf.inputs['Emission Strength'].default_value = emission_strength
    return mat


def build_talon_c_carbine():
    clear_scene()
    objs = []

    mat_polymer = make_material('TalonC_Polymer', (0.12, 0.14, 0.16), metallic=0.2, roughness=0.6)
    mat_metal = make_material('TalonC_Gunmetal', (0.28, 0.30, 0.32), metallic=0.85, roughness=0.3)
    mat_accent = make_material('TalonC_CyanAccent', (0.1, 0.8, 0.9), emission_color=(0.1, 0.85, 1.0), emission_strength=3.5)
    mat_lens = make_material('TalonC_OpticLens', (0.05, 0.6, 0.8), alpha=0.5, roughness=0.1, metallic=0.1)

    # 1. Main Upper/Lower Receiver (Carbine Chassis)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.08, 0, 0.05))
    receiver = bpy.context.object
    receiver.name = 'Receiver_Main'
    receiver.scale = (0.34, 0.07, 0.12)
    receiver.data.materials.append(mat_polymer)
    objs.append(receiver)

    # 2. Precision Barrel Shroud (Extended)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.038, depth=0.42, location=(0.40, 0, 0.06), rotation=(0, math.pi / 2, 0))
    barrel_shroud = bpy.context.object
    barrel_shroud.name = 'Barrel_Shroud'
    barrel_shroud.data.materials.append(mat_metal)
    objs.append(barrel_shroud)

    # 3. Fluted Inner Barrel & Compensator Muzzle
    bpy.ops.mesh.primitive_cylinder_add(radius=0.024, depth=0.10, location=(0.64, 0, 0.06), rotation=(0, math.pi / 2, 0))
    muzzle = bpy.context.object
    muzzle.name = 'Muzzle_Compensator'
    muzzle.data.materials.append(mat_metal)
    objs.append(muzzle)

    # 4. Top Picatinny Rail
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.18, 0, 0.13))
    rail = bpy.context.object
    rail.name = 'Rail_Top'
    rail.scale = (0.50, 0.045, 0.025)
    rail.data.materials.append(mat_metal)
    objs.append(rail)

    # 5. Holographic Reflex Optic Sight
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.12, 0, 0.18))
    optic_housing = bpy.context.object
    optic_housing.name = 'Optic_Housing'
    optic_housing.scale = (0.10, 0.06, 0.07)
    optic_housing.data.materials.append(mat_polymer)
    objs.append(optic_housing)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.12, 0, 0.18))
    optic_lens = bpy.context.object
    optic_lens.name = 'Optic_Lens'
    optic_lens.scale = (0.008, 0.048, 0.052)
    optic_lens.data.materials.append(mat_lens)
    objs.append(optic_lens)

    # 6. Ergonomic Pistol Grip
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.04, 0, -0.12), rotation=(0, -math.radians(16), 0))
    grip = bpy.context.object
    grip.name = 'Pistol_Grip'
    grip.scale = (0.07, 0.055, 0.22)
    grip.data.materials.append(mat_polymer)
    objs.append(grip)

    # 7. Skeletonized Tactical Stock
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.24, 0, 0.02))
    stock_strut = bpy.context.object
    stock_strut.name = 'Stock_Strut'
    stock_strut.scale = (0.24, 0.04, 0.035)
    stock_strut.data.materials.append(mat_metal)
    objs.append(stock_strut)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.35, 0, -0.04), rotation=(0, math.radians(12), 0))
    stock_butt = bpy.context.object
    stock_butt.name = 'Stock_Buttpad'
    stock_butt.scale = (0.045, 0.055, 0.18)
    stock_butt.data.materials.append(mat_polymer)
    objs.append(stock_butt)

    # 8. Extended Curved Composite Magazine
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.06, 0, -0.16), rotation=(0, math.radians(12), 0))
    mag = bpy.context.object
    mag.name = 'Magazine_Extended'
    mag.scale = (0.065, 0.045, 0.24)
    mag.data.materials.append(mat_polymer)
    objs.append(mag)

    # 9. Tactical Foregrip
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.32, 0, -0.06), rotation=(0, math.radians(18), 0))
    foregrip = bpy.context.object
    foregrip.name = 'Foregrip_Angled'
    foregrip.scale = (0.05, 0.04, 0.12)
    foregrip.data.materials.append(mat_polymer)
    objs.append(foregrip)

    # 10. Charm Ring Eyelet (Socket attachment node)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.022, minor_radius=0.005, location=(0.0, 0.04, 0.08), rotation=(math.pi / 2, 0, 0))
    charm_loop = bpy.context.object
    charm_loop.name = 'CharmSocket_Loop'
    charm_loop.data.materials.append(mat_metal)
    objs.append(charm_loop)

    # 11. Cyan Power Conduit Line (Scout identity accent)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.006, depth=0.38, location=(0.14, 0.038, 0.07), rotation=(0, math.pi / 2, 0))
    conduit = bpy.context.object
    conduit.name = 'Power_Conduit'
    conduit.data.materials.append(mat_accent)
    objs.append(conduit)

    # Export GLB
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objs:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]

    out_path = os.path.normpath(os.path.join(OUT_DIR, 'gun_scout_talon_c.glb'))
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        use_selection=True,
        export_apply=True
    )
    print(f'SUCCESS: Exported {out_path}')


if __name__ == '__main__':
    build_talon_c_carbine()
