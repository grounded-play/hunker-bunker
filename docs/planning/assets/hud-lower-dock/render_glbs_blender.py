import bpy, sys, os, math, mathutils
argv = sys.argv[sys.argv.index('--') + 1:]
out_dir = argv[0]; files = argv[1:]
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE' if 'BLENDER_EEVEE' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else sc.render.engine
    sc.render.resolution_x = 512; sc.render.resolution_y = 512
    sc.render.film_transparent = False
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs[0].default_value = (0.012, 0.012, 0.014, 1); bg.inputs[1].default_value = 1.0
    return sc
for f in files:
    name = os.path.splitext(os.path.basename(f))[0]
    try:
        sc = reset()
        bpy.ops.import_scene.gltf(filepath=f)
        meshes = [o for o in sc.objects if o.type == 'MESH']
        # Rig helpers (e.g. a stray unit Icosphere with no material) must not drive framing.
        objs = [o for o in meshes if any(s.material for s in o.material_slots)] or meshes
        for o in meshes:
            if o not in objs: o.hide_render = True
        if not objs: print('NOMESH', name); continue
        dg = bpy.context.evaluated_depsgraph_get()
        mn = mathutils.Vector((1e9,)*3); mx = mathutils.Vector((-1e9,)*3)
        for o in objs:
            m = o.evaluated_get(dg).to_mesh()
            step = max(1, len(m.vertices) // 4000)
            for vi in range(0, len(m.vertices), step):
                vtx = m.vertices[vi]
                v = o.matrix_world @ vtx.co
                mn = mathutils.Vector(map(min, mn, v)); mx = mathutils.Vector(map(max, mx, v))
        ctr = (mn + mx) / 2; size = max((mx - mn).length, 1e-3)
        cam_data = bpy.data.cameras.new('c'); cam_data.lens = 50; cam_data.clip_start = size * 0.01; cam_data.clip_end = size * 100
        cam = bpy.data.objects.new('c', cam_data); sc.collection.objects.link(cam); sc.camera = cam
        d = size * 1.25
        cam.location = ctr + mathutils.Vector((d * 0.75, -d * 1.0, d * 0.75))
        cam.rotation_euler = (ctr - cam.location).to_track_quat('-Z', 'Y').to_euler()
        def light(kind, loc, energy, color):
            ld = bpy.data.lights.new(kind, 'AREA'); ld.energy = energy * size * size; ld.color = color; ld.size = size
            lo = bpy.data.objects.new(kind, ld); sc.collection.objects.link(lo); lo.location = ctr + mathutils.Vector(loc) * size
            lo.rotation_euler = (ctr - lo.location).to_track_quat('-Z', 'Y').to_euler()
        light('key', (-1.2, -1.0, 1.4), 220, (1.0, 0.72, 0.45))
        light('rim', (0.9, 1.4, 1.0), 180, (0.45, 0.8, 0.9))
        light('fill', (1.4, -0.6, 0.2), 40, (0.8, 0.85, 1.0))
        sc.render.filepath = os.path.join(out_dir, name + '.png')
        bpy.ops.render.render(write_still=True)
        print('OK', name)
    except Exception as e:
        print('FAIL', name, e)
