# Visual overhaul — reflective HDR lighting and the house style

**Date:** 2026-09-13 · Branch `dev/sprint-39`
**Status:** plan. Measured against the current renderer, not aspirational.

---

## 1. The finding: the art is already there, the renderer is not

`art/source/art-remaster/concepts/world-assets-current-contact-sheet.jpg` is the
ground truth, and it already *is* the style being asked for:

- riveted industrial plate and frost-cracked bulkheads
- **bone and rib-cage armoured doors** — straight Giger
- **glowing orange vascular circuitry running through metal** — biomechanical
  veins, the single most on-brand motif the project owns
- cyan emissive O₂ towers with tube and valve detail
- deep near-black grounds with saturated emissive accents

Nothing in that sheet is "kiddish". The problem is what the runtime does with it.

### What the renderer actually does today

Measured, not assumed:

| | State | Consequence |
|---|---|---|
| Tone mapping | **not set** (`NoToneMapping`) | HDR values clip flat; a bright practical becomes a white blob |
| Environment map / PMREM | **none** | 94 `MeshStandardMaterial`s reflect *nothing* |
| `normalMap` / `roughnessMap` / `metalnessMap` | **none in world materials** | every surface is uniformly flat |
| Post stack | `RenderPass` + 2× `TiltShiftPass` | no bloom, no aberration, no grain |
| `MeshBasicMaterial` | **125 instances** | unlit — ignores every light in the scene |

So: PBR-capable materials with nothing to reflect, lit by a pipeline that then
clips the result. **The art is PBR-ready and the renderer is effectively
unlit.** That is the whole gap, and it is why the 2D concepts look richer than
the 3D game.

---

## 2. Style definition — the house rules

*H.R. Giger meets neon-noir Gotham meets Helsinki arctic brutalism, in a
biofurious dystopian prison-planet bunker at the end of late-capitalist deep-space
corporate collapse.*

That is a mood. These are the rules that make it renderable:

1. **Nothing is one material.** Giger's power is *metal that has become
   anatomy*. Every hero surface should read as two things fighting: plate over
   bone, frost over circuitry, resin over steel. Practically: layered
   roughness and a second normal, never a single flat skin.
2. **Light is always motivated and always coloured.** Neon-noir has no neutral
   white. Sodium amber, infection green, cryo cyan, quarantine red — the
   palette the game already ships. A white light in this world is a mistake.
3. **Black is a colour, not an absence.** Arctic brutalism gets its weight from
   enormous dark mass with one bright edge. Ambient must never lift the blacks;
   it exists so silhouettes read, not so rooms are visible.
4. **Wetness sells the biology.** A dry Giger surface is a sculpture; a wet one
   is alive. Clearcoat and specular are the cheapest horror in the toolbox.
5. **The architecture is indifferent.** Corporate collapse means the buildings
   were never for you. Scale is oppressive, repetition is bureaucratic, and the
   only warm light in frame is one you brought.

---

## 3. The work, in order of visible return per hour

### Phase A — make the renderer able to show the art (highest return)

**A1. Tone mapping + colour management.** Set `ACESFilmicToneMapping` (or
`AgXToneMapping`, matching what the Blender cinematics are pinned to) with a
tuned exposure. Today HDR values clip, so every emissive surface in that contact
sheet becomes a flat white patch in-game. This is a two-line change with the
largest single visual delta available.

**A2. Environment map via PMREM.** Generate a `PMREMGenerator` environment from
the game sky panorama already built for the cinematics
(`public/sky/cinematic_deep_space_panorama.jpg`). Those 94 `MeshStandardMaterial`s
immediately gain reflections and image-based ambient, and the world stops
looking like matte plastic. Same asset, both renderers — the game and the
cutscenes finally share a look.

**A3. Selective bloom.** Add `UnrealBloomPass` gated on a high threshold so only
genuine emissives bloom, not lit walls. The contact sheet is *built* around
glowing vascular lines; without bloom they read as painted-on decals.

### Phase B — surface depth

**B1. Derived normal maps.** The 2D textures are detailed enough to derive
normals from luminance. A build step generates `_n` maps from existing art —
no repainting, no new source assets, and every riveted plate gains real relief
under a moving light.

**B2. Roughness variation.** The same trick already used on Blender imports:
noise-driven roughness break-up so surfaces are not uniform plastic. Wet
biomech gets low roughness, frost gets high, worn plate gets both.

**B3. Emissive maps.** Split the glowing elements of existing textures into an
`emissiveMap` so they light themselves and, with A2 and A3, light the room.

### Phase C — reactive lighting

**C1. Emissive practicals become real lights.** Budgeted point lights attached
to the strongest emissive props, driven by the existing `ENV_LIGHT_BUDGET` cap
so shader permutations stay bounded.

**C2. Player-reactive response.** Suit light and weapon fire already exist as
light sources; with A1–A3 in place they start producing specular travel across
wet surfaces. That is the "reactive" part — it is emergent from PBR rather than
a separate feature.

### Phase D — post and grade

Bloom (A3), plus chromatic aberration and film grain matched to the Blender
delivery compositor, so cutscene and gameplay are the same world.

---

## 4. Performance — the honest constraint

The Steam Deck is the target, and the session logs already show the desktop
client at `gpuMax=70ms` with adaptive scaling engaged while the Deck sat at
`0.82ms`. Everything above must be gated:

- PMREM is generated **once**, not per frame.
- Bloom at half resolution.
- Normal maps at half the diffuse resolution.
- Real-light promotion respects `ENV_LIGHT_BUDGET` (8), which exists precisely
  to bound shader-program growth.
- Every item behind the existing adaptive-quality path, so a Deck under pressure
  sheds the grade before it sheds framerate.

**Non-goal:** ray tracing, SSR, or anything requiring WebGPU. The win here is
not exotic — it is that a PBR pipeline is currently running with no environment,
no tone mapping and no surface maps. Fixing that is most of the distance.

---

## 5. Sequence

A1 → A2 → A3 first. They are small, independent, and between them they change
every frame of the game. B and C only pay off once A exists — normal maps under
no tone mapping and no environment look almost identical to no normal maps.

## 6. Status log

- 2026-09-13 — renderer audited, gap measured, plan written. Nothing implemented.
