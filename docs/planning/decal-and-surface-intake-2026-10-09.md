# Decal and floor-surface intake — 2026-10-09

How new decals and floor textures get into the game's compressed PBR pipelines. This is the processing side of the world expansion plan (Phase 1: 20 decals; Phase 2: floor sets T14–T17). Everything below is a script run; no runtime code changes per asset.

## Room-dressing decals (Phase 1)

1. **Deliver** a keyed PNG as `public/decal_<name>.png`. Real alpha is best. A flat `#00FF00` or near-black backdrop is also fine; the bake keys it softly.
   - Bio and hive art that contains green: deliver it already keyed. The magenta-key rule for raw art still applies upstream.
2. **Use it**: reference `decal_<name>` from `DRESSING_KITS` (`wallDecals` / `floorDecals`) or `LIVED_IN_DECALS`, the same as today.
3. **Bake**:
   ```
   python scripts/art/build_stickers.py --legacy
   ```
   - It's incremental: only PNGs newer than their layers are baked.
   - It writes `public/3d/runtime/decals/legacy/<name>_{albedo,detail}.ktx2`: 512 px BC7, colour plus coverage, normal, roughness and metalness. It also writes the generated table `src/data/legacyDecalLayers.js`.
   - Roughness and metalness come from the name: grates, panels, stencils and stripes come out metallic; spills, pools and fluids glossy; frost and fractures icy. To change that, add a pattern to `LEGACY_SURFACES` in the script.
4. **Check**: `npx vitest run src/stickerPlanner.test.js`. It fails if any `public/decal_*.png` has no baked layer.

At runtime, room dressing draws every baked decal type from one PBR texture array, in one draw per room (`buildLegacyDecalMesh`). Types without a layer keep the old runtime-keyed PNG batch. The PNGs stay the source of truth: re-bake after editing one.

The lived-in stickers (D1–D20, `scripts/art/build_stickers.py` without `--legacy`) are a separate 1024×512 set, placed by `src/stickerPlanner.js`.

## Floor surfaces (Phase 2: T14–T17)

1. **Deliver** seamless-ish renders. Four versions each is best. Name them `art/source/textures/lived-in-pass-2/<family>_<a|b|c|d>.jpg`, for example `tex_floor_cryo_permafrost_a.jpg`.
2. **Register** the family in two tables, in the same order:
   - `SURFACES` in `scripts/art/build_floor_surfaces.py`: normal strength, roughness range, metalness, and how much baked lighting to remove;
   - `FLOOR_SURFACES` in `src/floorSplat.js`: number of versions, metres per repeat, and the older layer it falls back to.
3. **Place** it: add room themes to `ROOM_THEME_SURFACE`, or landforms to `LANDFORM_GROUND_SURFACE`.
4. **Bake**:
   ```
   python scripts/art/build_floor_surfaces.py tex_floor_cryo_permafrost
   ```
   It makes each version seamless and writes the PBR set: PNGs to `art/source/.../pbr/` for review, and BC7 KTX2 to `public/3d/runtime/surfaces/`.
5. **Check**: `npx vitest run src/floorSplat.test.js`, which checks every version ships matching KTX2 maps. Then run `tests/e2e/probes/floor-blend-captures.spec.js` to see the surface in game.

## Models

Run new GLBs through `scripts/art/convert_glb_textures_ktx2.py` (needs the `basisu` encoder) so their textures ship as KTX2. `src/glbDecoderSupport.test.js` fails on a GLB that needs a decoder the game doesn't register.

The Python tools need numpy, scipy, pillow, etcpak and zstandard.
