"""
Restyle CC0 modular kit pieces into the game's own look, and export to runtime.

Kenney kits are deliberately clean, bright and flat-shaded. Dropped in raw they
read as placeholder -- the geometry is fine, the pastel vertex colour is the
tell. This pass keeps the silhouette and socket alignment (which is the whole
value of a modular kit) and replaces everything else.

Four rules, applied automatically so the result is repeatable rather than
hand-tweaked per asset across 488 models:

  1. Palette swap to the game's own families.
  2. Roughness break-up, so surfaces are not uniform plastic.
  3. Subtle emissive accents on pieces that should read as powered.
  4. Scale normalisation to the game's 1 cell = 1 metre world.

Run:
    blender -b --python scripts/blender/restyle_kit_pieces.py -- --kit modular-space-kit
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import bpy


def base_dir() -> Path:
    return Path(__file__).resolve().parent.parent.parent


# Per-kit palette, matching the biomes the game already uses. Deliberately
# desaturated and dark: these sets are lit by their practicals, and a mid-grey
# kit piece under a sodium rotator reads completely differently to the same
# piece under a showroom light.
KIT_PALETTE = {
    "modular-space-kit": {
        "base": (0.075, 0.082, 0.095),      # cold bunker steel
        "accent": (0.10, 0.115, 0.135),
        "emissive": (0.18, 0.85, 0.95),     # cyan practicals
    },
    "modular-cave-kit": {
        "base": (0.068, 0.060, 0.052),      # damp rock, warmer than steel
        "accent": (0.088, 0.078, 0.066),
        "emissive": (0.35, 0.95, 0.40),     # bio-luminescence
    },
    "building-kit": {
        "base": (0.082, 0.080, 0.076),
        "accent": (0.105, 0.098, 0.090),
        "emissive": (1.00, 0.62, 0.20),     # sodium
    },
    "nature-kit": {
        "base": (0.070, 0.076, 0.070),
        "accent": (0.090, 0.100, 0.088),
        "emissive": (0.45, 0.90, 0.55),
    },
}

# Pieces whose name says they carry power or light.
EMISSIVE_HINTS = ("gate", "laser", "detail", "cable", "door")


def restyle_object(obj, palette) -> None:
    if obj.type != "MESH":
        return
    # Kit pieces ship one material per colour swatch. Replacing them wholesale
    # rather than tinting keeps the result predictable: a kit's own material
    # names are swatch numbers and carry no meaning to preserve.
    obj.data.materials.clear()

    lit = any(hint in obj.name.lower() for hint in EMISSIVE_HINTS)
    mat = bpy.data.materials.new(f"Kit_{obj.name}")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = next(n for n in nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (*palette["base"], 1.0)
    bsdf.inputs["Metallic"].default_value = 0.35
    bsdf.inputs["Roughness"].default_value = 0.55

    # Rule 2: roughness break-up. Uniform roughness is the clearest "this is
    # untouched kit geometry" tell after colour.
    noise = nodes.new("ShaderNodeTexNoise")
    noise.location = (bsdf.location.x - 600, bsdf.location.y - 250)
    noise.inputs["Scale"].default_value = 12.0
    noise.inputs["Detail"].default_value = 5.0
    rng = nodes.new("ShaderNodeMapRange")
    rng.location = (bsdf.location.x - 380, bsdf.location.y - 250)
    rng.inputs["To Min"].default_value = 0.38
    rng.inputs["To Max"].default_value = 0.72
    links.new(noise.outputs["Fac"], rng.inputs["Value"])
    links.new(rng.outputs["Result"], bsdf.inputs["Roughness"])

    # Rule 1b: the same noise drives a subtle two-tone, so large flat panels are
    # not one dead colour across their whole face.
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.location = (bsdf.location.x - 380, bsdf.location.y + 120)
    ramp.color_ramp.elements[0].color = (*palette["base"], 1.0)
    ramp.color_ramp.elements[1].color = (*palette["accent"], 1.0)
    links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])

    if lit:
        bsdf.inputs["Emission Color"].default_value = (*palette["emissive"], 1.0)
        # Restrained: a powered gate should glow, not light the room.
        bsdf.inputs["Emission Strength"].default_value = 1.6

    obj.data.materials.append(mat)


def main() -> None:
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--kit", required=True)
    parser.add_argument("--out", default="public/3d/runtime/kits")
    parser.add_argument("--limit", type=int, default=0, help="0 = all pieces")
    args = parser.parse_args(argv)

    palette = KIT_PALETTE.get(args.kit, KIT_PALETTE["modular-space-kit"])
    src_root = base_dir() / "art/source/kits" / args.kit
    sources = sorted(src_root.rglob("*.glb"))
    if args.limit:
        sources = sources[: args.limit]
    out_dir = base_dir() / args.out / args.kit
    out_dir.mkdir(parents=True, exist_ok=True)

    written = 0
    for source in sources:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=str(source))
        objects = [o for o in bpy.context.scene.objects if o.type == "MESH"]
        if not objects:
            print(f"[restyle_kit_pieces] SKIP {source.name}: no mesh")
            continue
        for obj in objects:
            restyle_object(obj, palette)

        out_path = out_dir / source.name
        bpy.ops.export_scene.gltf(
            filepath=str(out_path),
            export_format="GLB",
            use_selection=False,
            # Materials must travel: the whole point of this pass is the look.
            export_materials="EXPORT",
            export_apply=True,
        )
        written += 1

    print(f"[restyle_kit_pieces] {args.kit}: restyled {written}/{len(sources)} -> {out_dir}")


if __name__ == "__main__":
    main()
