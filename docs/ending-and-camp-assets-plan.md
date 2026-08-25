# Ending & Camp Visual Assets Plan

This document outlines the visual assets required to implement the multi-ending narrative paths and camp interactions described in [expanded-universe-narrative-design.md](./expanded-universe-narrative-design.md) and [implementation_plan.md](./implementation_plan.md).

All assets must match the established Hunker Bunker visual style:
* **Style**: Stylized 2.5D hand-painted retro-futuristic sci-fi, chunky readable silhouettes, high contrast, subtle film grain, and no readable text or logos.
* **Ending Scenes**: 1920×1080 (16:9) full-frame backdrops representing the cabin or vehicle during the ending sequences.
* **Character Portraits**: Square (512×512) bust portraits matching the in-game dialogue bezel.
* **Chroma-Key Sprites**: Rendered on a pure-black background (`rgb(0,0,0)`) so the cutscene generator can chroma-key the transparency.

---

## 🎬 Part 1: Ending Scene Backdrops (1920×1080)

These backdrops will be loaded by `scratch/generate_cave_scenes.js` to render the final video cutscenes.

| Filename | Ending Path | Visual Description / Prompt |
| --- | --- | --- |
| `public/ending_fullbrood_ship.png` | **FULL BROOD** | A chunky, hand-painted corporate escape vessel launching through a jagged icy rift. The ship's engines burn with a sickly bioluminescent green and amber plasma. Veins of organic, chitinous tissue crawl along the ship's metal hull plates. Deep space backdrop with cold blue starfields. High contrast, dark sci-fi arcade aesthetic. |
| `public/ending_cleanescape_cabin.png` | **CLEAN ESCAPE** | Interior cabin of the escape ship crowded with three diverse human survivors wearing rugged industrial spacesuits (orange and graphite plates). They look weary but hopeful, peering out the main cockpit viewport at a receding frozen planet. Warm amber interior command lighting, soft blue display console glows, high-contrast shadows. No text. |
| `public/ending_mixedcrew_cabin.png` | **MIXED CREW** | Inside the escape vessel's cabin, split down the middle by a shimmering cyan forcefield. On one side sit nervous human survivors. On the other side, mutated human-alien hybrids with glowing green eyes and biomechanical growths stand quietly. Behind them, the alien Queen's silhouette looms in the dark engineering bay. Cinematic lighting, thick silhouettes. |
| `public/ending_carriersbargain_eggs.png` | **CARRIER'S BARGAIN** | The escape vessel's dark, metallic cargo and coolant bay. Nestled among copper pipes and frosted ventilation grates are 3-5 translucent, glowing amber alien eggs pulsing with life. The frame is close and high-contrast, with sickly green rim light reflecting off the condensation-covered metal. Cold and claustrophobic. |
| `public/ending_scorchedsky_cockpit.png` | **SCORCHED SKY** | A solitary astronaut operator sitting alone in the pilot seat of a wide, four-person cockpit. The other three seats are empty and dark. Out the viewport, the frozen glacier planet burns with explosions in the distance. The cockpit controls are dimly lit with red hazard lights and diagnostic scanlines, casting long shadows. Pure isolation. |

---

## 👥 Part 2: Camp Leader Portraits (512×512)

Used in dialogue panels when interacting with the camps.

| Filename | Camp / Leader | Visual Description / Prompt |
| --- | --- | --- |
| `public/lore_portraits/meridian_kaelen.png` | **Meridian (Overseer Kaelen)** | Bust portrait of an aging male engineer in a heavily patched graphite exosuit. Welding goggles resting on his forehead, gray hair, grease smudges on his face. Backlit by cool cyan diagnostic terminal glows and hanging cables. Stylized, hand-painted sci-fi character art. |
| `public/lore_portraits/tallow_martha.png` | **Tallow (Sister Martha)** | Bust portrait of a female spiritual leader in a worn fabric cowl over light blue exosuit plating. Her eyes are bright and gentle. Background is filled with soft green bioluminescent spores and wisps of geothermal steam. Hand-painted, soft, high-contrast lighting. |
| `public/lore_portraits/vesper_briggs.png` | **Vesper (Commander Briggs)** | Bust portrait of a rugged mercenary commander with a scarred jaw and short cropped military hair. He wears heavy olive-drab tactical plate armor with high collar guards. Backlit by red warning strobe lights. Gritty, hard-surface sci-fi character portrait. |

---

## 🚀 Part 3: Camp Choice UI Icons (256×256, Black Background)

Icons for the Act 2 choice terminal.

| Filename | Action | Visual Description / Prompt |
| --- | --- | --- |
| `public/icon_steal.png` | **Steal** | A mechanical vault door with a broken, sparking padlock icon. Stylized flat vector style with high-contrast amber highlights, hand-painted texture, on a pure black background. |
| `public/icon_cull.png` | **Cull / Destroy** | A rugged tactical target reticle overlaying a cracked skull silhouette. Glowing red outline, retro-arcade UI style, chunky lines, on a pure black background. |
| `public/icon_recruit.png` | **Recruit / Spare** | Two rugged armored gauntlets shaking hands in front of a ship cargo ramp. Hopeful cyan and white lighting, hand-painted sci-fi icon, on a pure black background. |
| `public/icon_turn.png` | **Turn / Mutate** | A human hand silhouette slowly dissolving into bioluminescent green spores and organic veins. Sickly green bio-glow, high contrast, on a pure black background. |

---

## 🏃 Part 4: In-Game Character & Boss Spritesheets

These spritesheets will be used by `src/camp.js` and the boss combat engine. Sprites are rendered on a pure black background (`rgb(0,0,0)`) for chroma-keying, showing multiple animation frames.

| Filename | Character / State | Visual Description / Prompt |
| --- | --- | --- |
| `public/martha_camp_walk.png` | **Sister Martha (Scout)** | 2.5D hand-painted spritesheet of Sister Martha in a light blue-grey exosuit and fabric cowl, carrying a lightweight survival rifle. Columns of walk cycles (facing north, south, east, west) and action frames (kneeling to examine plants, aiming rifle). Black background. |
| `public/briggs_camp_walk.png` | **Commander Briggs (Tank)** | 2.5D hand-painted spritesheet of a bulky mercenary in thick olive-drab tactical plate armor. Walk frames with heavy hydraulic leg cylinders, action frames (cleaning turret with wrench, standing at attention with arms crossed). Black background. |
| `public/kaelen_camp_walk.png` | **Overseer Kaelen (Engineer)** | 2.5D hand-painted spritesheet of an engineer in a graphite-grey utility exosuit with a tool harness. Walk cycles, action frames (kneeling and typing at a console, holding a sparking plasma welding torch). Black background. |
| `public/boss_corrupted_scout.png` | **Corrupted Scout Boss (Martha)** | Spritesheet of Sister Martha mutated by the PregAlien Hive: glowing green visor veins (#8CFF96), chitinous green spikes growing out of her shoulders, and erratic dash action frames (teleporting, firing green spore darts). Black background. |
| `public/boss_corrupted_tank.png` | **Corrupted Tank Boss (Briggs)** | Spritesheet of Commander Briggs mutated into a biomechanical juggernaut. Heavy armor plate fused with wet chitinous green flesh, arm replaced with a massive bio-launcher firing amber egg canisters, ground slam animations. Black background. |
| `public/boss_corrupted_engineer.png` | **Corrupted Engineer Boss (Kaelen)** | Static boss spritesheet of Overseer Kaelen fused into a tall, black metal server stack, covered in green glowing power conduits and pulsing amber egg clutches, spawning cybernetic snail drones. Black background. |
| `public/boss_decoy_scout.png` | **Scout Exploding Decoy** | Spritesheet of a semi-transparent, glowing green phantom duplicate of the Scout class, showing phases of fading and detonating into a cloud of toxic bio-spores. Black background. |
| `public/camp_npc_turned_overlay.png` | **Turned Alien Sprite Overlay** | Multi-directional overlay sheet containing glowing green cybernetic veins, insectoid limbs, and spore clouds to layer on top of standard camp civilian walks. Black background. |

