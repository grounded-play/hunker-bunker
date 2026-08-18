"""
Headless Blender build script for the 5 Season 0 itemdefs that had compliant 2D art and
catalog registration but no 3D mesh (docs/season-zero-protocol/08-asset-audit-and-gaps.md §5
item 1): 4137, 4138 (weapon charms), 4142, 4143, 4144 (rig overclock mods).

Runs via plain `blender --background --python`, NOT the blender-mcp addon/socket server —
that server explicitly refuses to start in background mode (see its own printed message:
"cannot start server in background mode (blender -b)"), but ordinary headless Python
scripting works fine and needs no GUI/Xvfb. This intentionally bypasses the MCP layer
entirely rather than waiting on an Xvfb install.

Honesty note: these are simple primitive-and-material compositions built directly in
Blender from each item's real doc 02 description, not AI-generated meshes like the other
8 charms/mods in this set (those came from an actual 3D-generation pipeline this session
didn't have access to). They're real, correctly-scaled, exported .glb files that render
in the Armory/loadout charm & mod sockets — not placeholders/empty files — but visibly
lower fidelity than their siblings. Swap for AI-generated meshes later if that pipeline
becomes available (docs/season-zero-protocol/08 §5 item 1's Blender MCP blocker).

Usage:
  /path/to/blender --background --python scripts/blender/build-missing-season-models.py
Output: public/3d/runtime/new3ds/{charm_amber_bio_flask,charm_dark_matter,
        mod_bio_hazard_filter,mod_kinetic_impact,mod_thermal_heat_exchanger}.glb
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


def export_glb(objects, filename):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    out_path = os.path.normpath(os.path.join(OUT_DIR, filename))
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        use_selection=True,
        export_apply=True
    )
    print(f'EXPORTED: {out_path}')


def build_amber_bio_flask():
    """4137 — glass ampoule w/ glowing suspended embryo, titanium endcaps, steel hanging clip."""
    clear_scene()
    objs = []

    bpy.ops.mesh.primitive_cylinder_add(radius=0.35, depth=1.4, location=(0, 0, 0))
    glass = bpy.context.object
    glass.name = 'AmberFlask_Glass'
    glass.data.materials.append(make_material('AmberGlass', (0.9, 0.6, 0.15), alpha=0.35, roughness=0.1, metallic=0.0))
    objs.append(glass)

    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.12, location=(0, 0, 0.05))
    embryo = bpy.context.object
    embryo.name = 'AmberFlask_Embryo'
    embryo.data.materials.append(make_material('EmbryoGlow', (1.0, 0.75, 0.2), emission_color=(1.0, 0.7, 0.15), emission_strength=4.0))
    objs.append(embryo)

    for z in (0.75, -0.75):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.4, depth=0.18, location=(0, 0, z))
        cap = bpy.context.object
        cap.name = f'AmberFlask_Cap_{z}'
        cap.data.materials.append(make_material('Titanium', (0.55, 0.56, 0.58), metallic=0.9, roughness=0.35))
        objs.append(cap)

    bpy.ops.mesh.primitive_torus_add(major_radius=0.18, minor_radius=0.03, location=(0, 0, 0.95))
    clip = bpy.context.object
    clip.name = 'AmberFlask_Clip'
    clip.data.materials.append(make_material('SteelClip', (0.6, 0.6, 0.62), metallic=1.0, roughness=0.25))
    objs.append(clip)

    export_glb(objs, 'charm_amber_bio_flask.glb')


def build_dark_matter_singularity():
    """4138 — miniature black hole with orbiting plasma particles."""
    clear_scene()
    objs = []

    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.28, location=(0, 0, 0))
    core = bpy.context.object
    core.name = 'Singularity_Core'
    core.data.materials.append(make_material('VoidBlack', (0.01, 0.01, 0.02), metallic=0.0, roughness=1.0))
    objs.append(core)

    bpy.ops.mesh.primitive_torus_add(major_radius=0.5, minor_radius=0.04, location=(0, 0, 0))
    disk = bpy.context.object
    disk.name = 'Singularity_AccretionDisk'
    disk.rotation_euler = (math.radians(70), 0, 0)
    disk.data.materials.append(make_material('PlasmaDisk', (0.6, 0.2, 0.9), emission_color=(0.7, 0.3, 1.0), emission_strength=5.0))
    objs.append(disk)

    for i, ang in enumerate((0, 2.4, 4.6)):
        x = 0.55 * math.cos(ang)
        y = 0.55 * math.sin(ang) * 0.35
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.05, location=(x, y, 0.05 * math.sin(ang)))
        particle = bpy.context.object
        particle.name = f'Singularity_Particle_{i}'
        particle.data.materials.append(make_material(f'PlasmaParticle{i}', (0.8, 0.4, 1.0), emission_color=(0.85, 0.5, 1.0), emission_strength=6.0))
        objs.append(particle)

    bpy.ops.mesh.primitive_torus_add(major_radius=0.1, minor_radius=0.02, location=(0, 0, 0.62))
    clip = bpy.context.object
    clip.name = 'Singularity_Clip'
    clip.data.materials.append(make_material('SteelClip2', (0.6, 0.6, 0.62), metallic=1.0, roughness=0.25))
    objs.append(clip)

    export_glb(objs, 'charm_dark_matter.glb')


def build_bio_hazard_filter_vent():
    """4142 — hazard-striped filter vent housing, -12% gas/spore damage mod."""
    clear_scene()
    objs = []

    bpy.ops.mesh.primitive_cylinder_add(radius=0.4, depth=0.5, location=(0, 0, 0))
    housing = bpy.context.object
    housing.name = 'FilterVent_Housing'
    housing.data.materials.append(make_material('HazardBlack', (0.08, 0.08, 0.08), metallic=0.6, roughness=0.5))
    objs.append(housing)

    for i in range(6):
        ang = i * (2 * math.pi / 6)
        x = 0.25 * math.cos(ang)
        y = 0.25 * math.sin(ang)
        bpy.ops.mesh.primitive_cylinder_add(radius=0.04, depth=0.55, location=(x, y, 0))
        slat = bpy.context.object
        slat.name = f'FilterVent_Slat_{i}'
        slat.data.materials.append(make_material(f'HazardYellow{i}', (0.95, 0.75, 0.05), metallic=0.3, roughness=0.4))
        objs.append(slat)

    bpy.ops.mesh.primitive_torus_add(major_radius=0.42, minor_radius=0.03, location=(0, 0, 0.27))
    bracket = bpy.context.object
    bracket.name = 'FilterVent_Bracket'
    bracket.data.materials.append(make_material('Gunmetal', (0.35, 0.36, 0.38), metallic=0.85, roughness=0.3))
    objs.append(bracket)

    export_glb(objs, 'mod_bio_hazard_filter.glb')


def build_kinetic_impact_bushing():
    """4143 — tungsten-core impact bushing, +1 piercing penetration mod."""
    clear_scene()
    objs = []

    bpy.ops.mesh.primitive_cylinder_add(radius=0.38, depth=0.45, location=(0, 0, 0))
    collar = bpy.context.object
    collar.name = 'Bushing_Collar'
    collar.data.materials.append(make_material('Gunmetal2', (0.32, 0.33, 0.35), metallic=0.9, roughness=0.35))
    objs.append(collar)

    bpy.ops.mesh.primitive_cylinder_add(radius=0.12, depth=0.9, location=(0, 0, 0))
    rod = bpy.context.object
    rod.name = 'Bushing_TungstenRod'
    rod.data.materials.append(make_material('Tungsten', (0.5, 0.5, 0.52), metallic=1.0, roughness=0.15))
    objs.append(rod)

    for i in range(4):
        z = -0.15 + i * 0.1
        bpy.ops.mesh.primitive_torus_add(major_radius=0.2, minor_radius=0.025, location=(0, 0, z))
        coil = bpy.context.object
        coil.name = f'Bushing_Coil_{i}'
        coil.data.materials.append(make_material(f'CopperCoil{i}', (0.72, 0.4, 0.15), metallic=0.9, roughness=0.3))
        objs.append(coil)

    export_glb(objs, 'mod_kinetic_impact.glb')


def build_thermal_heat_exchanger():
    """4144 — radiator fin block, +10% shield recharge mod."""
    clear_scene()
    objs = []

    bpy.ops.mesh.primitive_cube_add(size=0.3, location=(0, 0, 0))
    block = bpy.context.object
    block.scale = (1.0, 1.0, 1.4)
    block.name = 'HeatExchanger_Block'
    block.data.materials.append(make_material('CopperBlock', (0.7, 0.35, 0.12), metallic=0.85, roughness=0.3))
    objs.append(block)

    for i in range(6):
        x = -0.25 + i * 0.1
        bpy.ops.mesh.primitive_cube_add(size=0.28, location=(x, 0.22, 0))
        fin = bpy.context.object
        fin.scale = (0.03, 1.0, 1.3)
        fin.name = f'HeatExchanger_Fin_{i}'
        fin.data.materials.append(make_material(f'ThermalFin{i}', (0.85, 0.45, 0.1), emission_color=(1.0, 0.4, 0.05), emission_strength=1.5, metallic=0.7, roughness=0.25))
        objs.append(fin)

    export_glb(objs, 'mod_thermal_heat_exchanger.glb')


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    build_amber_bio_flask()
    build_dark_matter_singularity()
    build_bio_hazard_filter_vent()
    build_kinetic_impact_bushing()
    build_thermal_heat_exchanger()
    print('ALL_5_MODELS_EXPORTED_OK')


main()
