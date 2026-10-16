# Total texture and decal runtime audit — 2026-10-16

Status: **PASS**

## Runtime texture arrays

- 220 floor surface layers: paired BC7 sRGB albedo/metalness and linear normal/roughness/height, 1024², 9 mip levels.
- 84 environmental sticker layers: paired PBR arrays, 1024×512, 8 mip levels.
- 200 room/story decal layers: paired PBR arrays, 512², 8 mip levels.
- No missing, orphaned, or unregistered KTX2 payloads in these registries.

## Usage and physical scale

- 54 surface families all have a theme palette or an explicit systemic owner.
- 120 decal families all have at least one placement owner, an explicit support-plane profile, and a physical world-scale range.
- Surface repeat scales remain within 1.5–6 metres; decal depth scales remain within their authored ranges and never exceed 4 metres.
- World Expansion 80 placement is restricted to each asset's exact room theme rather than its broader biome family.

## Pixel integrity

- 200 public decal PNGs contain real transparency and solid subject pixels; alpha coverage range 5.0–97.6%.
- 64 retained surface review layers pass opposing-edge comparison; maximum mean edge error 0.008332 after WebP encoding.
- Decal alpha is baked into the compressed albedo arrays; normal/roughness/metalness remains in the paired linear detail arrays.
