# Hunker Bunker — Art Style Bible: "Cathedral Biomech"

> Owner direction, 2026-09-25: **Art Nouveau / Jugendstil meets Giger: sensual
> cathedrals of deep, dead corporate space gods**, injected into every part of the
> game.
>
> This is the one style every art prompt, painter brief and UI skin starts from. It
> supersedes the store's "Shared style block" in
> `docs/steam-store-placeholder-assets-and-prompts.md` (§ Shared style block, below,
> is its replacement).

---

## 1. The idea in one paragraph

A dead megacorporation built its bunkers as **cathedrals to its gods**: the space
entities it worshipped, sold, and was swallowed by. Its engineers were Jugendstil
romantics. Every pipe is a whiplash curve, every hatch an arched portal, every
terminal a reliquary. Then the gods' biology grew into the architecture. The ribs of
the nave are vertebrae; the organ pipes breathe; the ornament is half cast iron, half
bone and sinew. The mood is **reverent, sensual and rotten**: beautiful curves you
shouldn't want to touch.

**The three ingredients, always together:**

| Ingredient | What it contributes | Look to |
| :--- | :--- | :--- |
| **Jugendstil / Art Nouveau** | the **line**: whiplash curves, organic ornament, arched frames, halo circles, stained-glass leading, ironwork tendrils, decorative borders, asymmetric flowing balance | Mucha (halo frames, borders), Guimard (Paris Métro cast iron), Horta (ironwork interiors), Klimt (gold pattern fields), Tiffany (leaded glass) |
| **Giger biomechanics** | the **body**: ribbed, vertebral, tubular forms fused with machinery; sensual curvature; wet sheen on bone and chrome; claustrophobic density | Giger's biomechanical interiors and *Necronomicon* plates |
| **Corporate cathedral** | the **meaning**: nave ribs, vaulted arches, rose windows, apses, altarpieces, reliquaries, votive lamps, organ pipes; corporate logos worn as halos, safety codes as scripture, dead executives as saints, product lines as relics | Gothic/Art Nouveau churches (Sagrada Família's organic structure), corporate brutalism, reliquary metalwork |

**What already fits:** `public/title_key_art_v2.png`, the biomechanical ribbed arch
over a lone operator, bone, brass and fog, is the closest existing piece. The door art
(`public/door_*_keyart_v2.webp`) has the right density and construction but needs
the curves.

---

## 2. Form language

- **Arches over rectangles.** Frames, doors, panels and portrait windows get arched or
  ogee tops, rounded corner cartouches, and a keystone ornament. Pure rectangles are
  the exception: the glass that live numbers sit behind.
- **Whiplash curves** run along every connector: pipes, cables, struts and borders.
  S-curves end in tendrils, never in hard stops.
- **Ribs and vertebrae** as structure: repeated curved ribs (nave vaulting / rib cage)
  carry every large surface.
- **Halos.** Circles behind important things: the radar disc, a portrait's head, the
  logo, the Queen. Mucha's halo is the recurring motif.
- **Rose windows** for anything round and radial: the radar, door centres, the
  Mothership's eye.
- **Stained-glass leading:** screens and glass have lead-line tracery at their edges.
  Cracks, frost and blood follow that tracery.
- **Sensual curvature:** bodily, suggestive form, the swell of a rib, a tubular
  embrace, a membrane stretched over a frame, in the Giger tradition. This is carried
  entirely by form and surface. **No nudity, no sexual acts, no genitals,** so every
  asset stays Steam-store-safe (mature themes, not adult-only content).
- **Corporate liturgy:** logos as halos and monstrances, warning placards as scripture
  plaques, serial numbers as psalm numbers, product mascots as saints in niches.

## 3. Palette

The established game palette (sampled across the whole game in
`docs/planning/assets/hud-lower-dock/style-board.jpg`, v2) stays, with two
ecclesiastical additions:

| Role | Colours | Notes |
| :--- | :--- | :--- |
| Base shadow | #000000 · #070808 · #161210 · #2c2826 | the nave in darkness |
| **Bone / ivory** (new) | #cdc6b0 (highlight) · #a79f86 · #827c6c (sampled from `title_key_art_v2`) · #56544b | ribs, vertebrae, carved ornament |
| **Tarnished gold / brass** (new emphasis) | #947047 · #b8894a · #d9b25f (highlight only) | ornament, halos, leading, reliquary trim |
| Worn steel | #4e4945 · #848980 | machinery under the ornament |
| Rust | #af5425 · #92532b | age, seams |
| Light: amber (dominant) | #f99415 · #f2780c | candle/votive warmth, the corporation's light |
| Light: teal (accent) | #71cddf | screens, diagnostics, cold |
| Alien / the gods' biology | #97996e · #cdcf8f | only for the gods' flesh, growth and infection |
| Alarm | beacon red | critical states only |

**What the whole game uses today** (`style-board.jpg` v2 samples every key art,
screenshot, 3D model render, portrait, door, room, icon and poster): besides amber and
teal, a lot of **mint / teal-green** (#2c9f84 · #47c5a9 · #97f7b0) in the terminal,
the Engineer Armory, schematics and bio snails, plus **bright bio green** (#4eec86) on
the Queen portrait and spore boss, and a cool **cryo blue** (#82a1bb).

Reconciled:
- **Screens and diagnostics:** teal (#71cddf / #47c5a9). The mint terminal green moves
  to this teal family.
- **Bright bio green:** only the gods' biology and infection, together with the olive
  and sickly yellow-green above.
- **Cryo blue:** only frost and the cryo biome.
- **Everything built by the corporation:** amber, bone and gold, lit by amber.

## 4. Rendering

**Inked engraving over painted biomech:**
- heavy black contour on silhouettes;
- fine engraved hatching for ornament and grime (Mucha's line meets an etching);
- soft cel shading with a **wet sheen** on bone and chrome (the Giger touch);
- painted grime and rust.

No photoreal materials, lens effects or depth of field in 2D assets.

Light is **votive**: amber sources low and inside (lamps, seams, windows), teal
for screens, and deep black above. There is always one strong focal glow.

## 5. Shared style block (prepend to every art prompt)

```
Cathedral Biomech style for the game "Hunker Bunker": Art Nouveau / Jugendstil
ornament fused with H.R. Giger biomechanics, the sacred architecture of a dead
megacorporation's space-god cult. Whiplash-curve ironwork, arched frames with keystone
ornament, Mucha-style halo circles, stained-glass lead-line tracery, rib-vaulted
structure made of bone-like vertebrae and chrome tubing, sensual organic curvature
carried by form only (no nudity). Inked engraving line art with heavy black contours
and fine hatching, soft cel shading with a wet sheen on bone and chrome, painted grime
and rust. Palette: deep black, bone ivory, tarnished gold and brass, worn steel,
votive amber light as the dominant glow, teal only for screens and diagnostics, sickly
yellow-green only for alien biology. High contrast, one strong focal glow, no text
unless specified.
```

**Avoid (paste into negative prompts):** readable text, logos with real brands,
watermarks, photorealism, 3D render look, lens flare, depth of field, nudity, genitals,
sexual acts, gore beyond blood splatter, clean sterile sci-fi, flat vector minimalism,
extra hues outside the palette.

## 6. Applying it across the game

| Surface | Cathedral Biomech treatment |
| :--- | :--- |
| **HUD band** | a **triptych altarpiece**: three hinged panels (map, health/status, gun/ammo) in reliquary frames with arched tops, gilded leading and votive status lamps. The radar is a rose window. Hearts are sacred hearts. See `docs/planning/hud-lower-dock-plan-2026-09-25.md` §4D. |
| **Portraits** | Mucha frames: an arched window with a halo disc behind the head, an ornamental border that differs per faction (corporate / camp / alien). |
| **Menus and title** | altarpiece and apse layouts. Titles in an Art Nouveau display face; numbers and body text stay a clean condensed sans for legibility. |
| **Doors and hatches** | the existing door art rebuilt as arched portals with rib vaulting around the machinery; the lock is a rose window. |
| **Bunker rooms and props** | chapels of maintenance: terminal alcoves as side altars, lockers as reliquary niches, pipe organs where the pipes run. |
| **Camps** | the humans' folk version: scavenged ornament, votive candles, painted saints on salvage. |
| **Hives and the Queen** | the gods' biology fully in charge: Giger dominant, with Nouveau ornament swallowed and half-digested. The Queen's throne room is the apse. |
| **Infection on the player** | Nouveau ornament on the suit and HUD grows Giger flesh as `infectionLoad` rises (HUD plan §4A/§4C). |
| **Store art and key art** | the title key art v2 is the model; new capsules use the §5 block. |

## 7. Typography

| Use | Face |
| :--- | :--- |
| Titles, logo, chapter cards, headers | an Art Nouveau display face (whiplash terminals, e.g. in the family of Arnold Böcklin / Mucha-era lettering), always hand-finished, never AI-generated in images |
| HUD numbers, body text, prompts | a clean condensed sans with tabular figures, unchanged; legibility first |

The logo keeps its lockup until a Nouveau-styled version is approved.

## 8. Open questions for the owner

1. Rename the house style "Cathedral Biomech", or give it a lore name (the
   corporation's own name for its architecture)?
2. Who are the **dead corporate space gods** in the canon: the Queen's kind, the
   Mothership's makers, something new? The iconography (halos, saints, scripture)
   needs names.
3. Should the store capsules be regenerated in this style now, or after the in-game
   HUD and doors?
