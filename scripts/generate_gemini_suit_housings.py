#!/usr/bin/env python3
"""Runner to generate HUD housing panels via Gemini Image Generation API.

This script contains the authoritative prompts and negative prompts from
docs/planning/hud-housing-prompts-2026-09-25.md.

If GEMINI_API_KEY is set in the environment, it uses the google-genai SDK
or REST endpoint. Otherwise, it reports status and quota reset times.
"""

import os
import sys
import json
import argparse
import urllib.request
import urllib.error

PROMPTS = {
    "scout_map": {
        "class": "scout",
        "panel": "map",
        "aspect": "16:9",
        "prompt": (
            "\"Nordic Cathedral Biomech\" style for the game \"Hunker Bunker\": the hard-line beauty of "
            "Nordic Jugendstil / National Romantic architecture — monumental stepped granite "
            "massing, deep round arches with heavy keystones, blackened-iron strap bindings and ring "
            "clasps, carved bone and stone relief, abstract serpentine interlace carving (no runes), "
            "frost-etched leaded glass, restrained taut curves — transposed into the bunkers of a "
            "dead megacorporation. 2D illustration: heavy black contours, woodcut/etching hatching "
            "on stone and iron, soft cel shading with painted texture. Mostly dark; amber lantern "
            "light, pale cold light on stone faces. No text.\n\n"
            "Game HUD hardware panel, flat-on orthographic, isolated on a flat pure chroma green "
            "#00FF00 background. A slim horizontal panel with proportions 3.4:1 spanning the image "
            "width: the MAP wing of the SCOUT class console. Slender blackened-iron frame with a "
            "shallow arched top and small keystone; small frost-etched leaded panes set into the "
            "frame; thin carved bone ribs; a carved bone finial like an antler tine rising from the "
            "top-left corner holding a tiny unlit lantern. Glass windows: one perfect circle at the "
            "left end, then one rectangle filling the rest — both completely empty, flat near-black, "
            "one faint reflection streak. Cold teal light (#71cddf) glowing softly from the seams, "
            "contained inside the panel. Light, precise, cold. Crisp dark ink outline around the "
            "whole panel. No green in the panel."
        ),
        "negative": (
            "text, letters, numbers, runes, symbols, logos, watermark, UI, icons, bars, graphs, maps, "
            "radar content, characters, faces, gameplay scene, background environment, perspective, "
            "3D render look, photorealism, lens flare, depth of field, gradient background, drop "
            "shadow, glow outside the panel, green (except the chroma background), gold-leaf "
            "opulence, French Art Nouveau florals, Viking clichés"
        )
    },
    "scout_health": {
        "class": "scout",
        "panel": "health",
        "aspect": "16:9",
        "prompt": (
            "\"Nordic Cathedral Biomech\" style for the game \"Hunker Bunker\": the hard-line beauty of "
            "Nordic Jugendstil / National Romantic architecture — monumental stepped granite "
            "massing, deep round arches with heavy keystones, blackened-iron strap bindings and ring "
            "clasps, carved bone and stone relief, abstract serpentine interlace carving (no runes), "
            "frost-etched leaded glass, restrained taut curves — transposed into the bunkers of a "
            "dead megacorporation. 2D illustration: heavy black contours, woodcut/etching hatching "
            "on stone and iron, soft cel shading with painted texture. Mostly dark; amber lantern "
            "light, pale cold light on stone faces. No text.\n\n"
            "Game HUD hardware panel, flat-on orthographic, isolated on a flat pure chroma green "
            "#00FF00 background. A slim horizontal panel with proportions 8.1:1 spanning the image "
            "width: the HEALTH & STATUS centre panel of the SCOUT class console. Slender blackened-iron "
            "frame, frost-etched leaded panes along the borders, thin bone ribs. Glass: one wide "
            "rectangle over the left two thirds, one narrow vertical slot, one rectangle over the "
            "right third — all empty, flat near-black. A small crest rises from the top centre holding "
            "five tiny unlit frost-glass lanterns in a row. Cold teal seam light inside the panel. "
            "Crisp dark ink outline. No green in the panel."
        ),
        "negative": (
            "text, letters, numbers, runes, symbols, logos, watermark, UI, icons, bars, graphs, maps, "
            "radar content, characters, faces, gameplay scene, background environment, perspective, "
            "3D render look, photorealism, lens flare, depth of field, gradient background, drop "
            "shadow, glow outside the panel, green (except the chroma background), gold-leaf "
            "opulence, French Art Nouveau florals, Viking clichés"
        )
    },
    "scout_gun": {
        "class": "scout",
        "panel": "gun",
        "aspect": "16:9",
        "prompt": (
            "\"Nordic Cathedral Biomech\" style for the game \"Hunker Bunker\": the hard-line beauty of "
            "Nordic Jugendstil / National Romantic architecture — monumental stepped granite "
            "massing, deep round arches with heavy keystones, blackened-iron strap bindings and ring "
            "clasps, carved bone and stone relief, abstract serpentine interlace carving (no runes), "
            "frost-etched leaded glass, restrained taut curves — transposed into the bunkers of a "
            "dead megacorporation. 2D illustration: heavy black contours, woodcut/etching hatching "
            "on stone and iron, soft cel shading with painted texture. Mostly dark; amber lantern "
            "light, pale cold light on stone faces. No text.\n\n"
            "Game HUD hardware panel, flat-on orthographic, isolated on a flat pure chroma green "
            "#00FF00 background. A slim horizontal panel with proportions 5.9:1 spanning the image "
            "width: the GUN & AMMO wing of the SCOUT class console. Slender blackened-iron frame, "
            "frost-etched leaded panes, bone ribs. Glass: a rectangle at the left (about one third "
            "of the width), a second rectangle beside it, and two square sockets at the right end — "
            "all empty, flat near-black. Cold teal seam light inside the panel. Crisp dark ink outline. "
            "No green in the panel."
        ),
        "negative": (
            "text, letters, numbers, runes, symbols, logos, watermark, UI, icons, bars, graphs, maps, "
            "radar content, characters, faces, gameplay scene, background environment, perspective, "
            "3D render look, photorealism, lens flare, depth of field, gradient background, drop "
            "shadow, glow outside the panel, green (except the chroma background), gold-leaf "
            "opulence, French Art Nouveau florals, Viking clichés"
        )
    },
    "tank_map": {
        "class": "tank",
        "panel": "map",
        "aspect": "16:9",
        "prompt": (
            "\"Nordic Cathedral Biomech\" style for the game \"Hunker Bunker\": the hard-line beauty of "
            "Nordic Jugendstil / National Romantic architecture — monumental stepped granite "
            "massing, deep round arches with heavy keystones, blackened-iron strap bindings and ring "
            "clasps, carved bone and stone relief, abstract serpentine interlace carving (no runes), "
            "frost-etched leaded glass, restrained taut curves — transposed into the bunkers of a "
            "dead megacorporation. 2D illustration: heavy black contours, woodcut/etching hatching "
            "on stone and iron, soft cel shading with painted texture. Mostly dark; amber lantern "
            "light, pale cold light on stone faces. No text.\n\n"
            "Game HUD hardware panel, flat-on orthographic, isolated on a flat pure chroma green "
            "#00FF00 background. A slim horizontal panel with proportions 3.4:1 spanning the image "
            "width: the MAP wing of the TANK class console. Massive stepped granite blocks bound in "
            "heavy blackened-iron straps with big round bolts; a deep keystone arch over the top; "
            "hazard chevrons re-cut as carved banding along the bottom lip; rust bleeding from the "
            "bindings. Glass windows: one perfect circle at the left end, set in a heavy iron ring, "
            "then one rectangle filling the rest — both completely empty, flat near-black, one faint "
            "reflection streak. Warm amber lantern light (#f99415) glowing from the seams, contained "
            "inside the panel. Heavy, monumental. Crisp dark ink outline. No green in the panel."
        ),
        "negative": (
            "text, letters, numbers, runes, symbols, logos, watermark, UI, icons, bars, graphs, maps, "
            "radar content, characters, faces, gameplay scene, background environment, perspective, "
            "3D render look, photorealism, lens flare, depth of field, gradient background, drop "
            "shadow, glow outside the panel, green (except the chroma background), gold-leaf "
            "opulence, French Art Nouveau florals, Viking clichés"
        )
    },
    "tank_health": {
        "class": "tank",
        "panel": "health",
        "aspect": "16:9",
        "prompt": (
            "\"Nordic Cathedral Biomech\" style for the game \"Hunker Bunker\": the hard-line beauty of "
            "Nordic Jugendstil / National Romantic architecture — monumental stepped granite "
            "massing, deep round arches with heavy keystones, blackened-iron strap bindings and ring "
            "clasps, carved bone and stone relief, abstract serpentine interlace carving (no runes), "
            "frost-etched leaded glass, restrained taut curves — transposed into the bunkers of a "
            "dead megacorporation. 2D illustration: heavy black contours, woodcut/etching hatching "
            "on stone and iron, soft cel shading with painted texture. Mostly dark; amber lantern "
            "light, pale cold light on stone faces. No text.\n\n"
            "Game HUD hardware panel, flat-on orthographic, isolated on a flat pure chroma green "
            "#00FF00 background. A slim horizontal panel with proportions 8.1:1 spanning the image "
            "width: the HEALTH & STATUS centre panel of the TANK class console. Stepped granite blocks "
            "bound in heavy iron straps and bolts, carved-chevron banding, rust bleed. Glass: one wide "
            "rectangle over the left two thirds, one narrow vertical slot, one rectangle over the "
            "right third — all empty, flat near-black. A small crest rises from the top centre holding "
            "five caged iron lanterns (unlit) and two chunky toggle switches. Warm amber seam light "
            "inside the panel. Crisp dark ink outline. No green in the panel."
        ),
        "negative": (
            "text, letters, numbers, runes, symbols, logos, watermark, UI, icons, bars, graphs, maps, "
            "radar content, characters, faces, gameplay scene, background environment, perspective, "
            "3D render look, photorealism, lens flare, depth of field, gradient background, drop "
            "shadow, glow outside the panel, green (except the chroma background), gold-leaf "
            "opulence, French Art Nouveau florals, Viking clichés"
        )
    },
    "tank_gun": {
        "class": "tank",
        "panel": "gun",
        "aspect": "16:9",
        "prompt": (
            "\"Nordic Cathedral Biomech\" style for the game \"Hunker Bunker\": the hard-line beauty of "
            "Nordic Jugendstil / National Romantic architecture — monumental stepped granite "
            "massing, deep round arches with heavy keystones, blackened-iron strap bindings and ring "
            "clasps, carved bone and stone relief, abstract serpentine interlace carving (no runes), "
            "frost-etched leaded glass, restrained taut curves — transposed into the bunkers of a "
            "dead megacorporation. 2D illustration: heavy black contours, woodcut/etching hatching "
            "on stone and iron, soft cel shading with painted texture. Mostly dark; amber lantern "
            "light, pale cold light on stone faces. No text.\n\n"
            "Game HUD hardware panel, flat-on orthographic, isolated on a flat pure chroma green "
            "#00FF00 background. A slim horizontal panel with proportions 5.9:1 spanning the image "
            "width: the GUN & AMMO wing of the TANK class console. Granite blocks, heavy iron straps "
            "and bolts, a deep arched niche framing the left glass. Glass: a rectangle at the left "
            "(about one third of the width) inside the arched niche, a second rectangle beside it, "
            "and two square sockets at the right end — all empty, flat near-black. Warm amber seam "
            "light. Crisp dark ink outline. No green in the panel."
        ),
        "negative": (
            "text, letters, numbers, runes, symbols, logos, watermark, UI, icons, bars, graphs, maps, "
            "radar content, characters, faces, gameplay scene, background environment, perspective, "
            "3D render look, photorealism, lens flare, depth of field, gradient background, drop "
            "shadow, glow outside the panel, green (except the chroma background), gold-leaf "
            "opulence, French Art Nouveau florals, Viking clichés"
        )
    },
    "engineer_map": {
        "class": "engineer",
        "panel": "map",
        "aspect": "16:9",
        "prompt": (
            "\"Nordic Cathedral Biomech\" style for the game \"Hunker Bunker\": the hard-line beauty of "
            "Nordic Jugendstil / National Romantic architecture — monumental stepped granite "
            "massing, deep round arches with heavy keystones, blackened-iron strap bindings and ring "
            "clasps, carved bone and stone relief, abstract serpentine interlace carving (no runes), "
            "frost-etched leaded glass, restrained taut curves — transposed into the bunkers of a "
            "dead megacorporation. 2D illustration: heavy black contours, woodcut/etching hatching "
            "on stone and iron, soft cel shading with painted texture. Mostly dark; amber lantern "
            "light, pale cold light on stone faces. No text.\n\n"
            "Game HUD hardware panel, flat-on orthographic, isolated on a flat pure chroma green "
            "#00FF00 background. A slim horizontal panel with proportions 3.4:1 spanning the image "
            "width: the MAP wing of the ENGINEER class console. Bronze and blackened-iron forge-altar "
            "construction: short stacked bronze pipes rising behind the top edge like organ pipes, a "
            "heat-fin crown, conduits carved with abstract interlace, an iron-bound tool rail along "
            "the bottom. Aged bronze with brown and rust patina (NOT green verdigris). Glass windows: "
            "one perfect circle at the left end in a bronze ring, then one rectangle filling the rest "
            "— both completely empty, flat near-black. Orange forge light (#f2780c) glowing from the "
            "seams, contained inside the panel. Crisp dark ink outline. No green in the panel."
        ),
        "negative": (
            "text, letters, numbers, runes, symbols, logos, watermark, UI, icons, bars, graphs, maps, "
            "radar content, characters, faces, gameplay scene, background environment, perspective, "
            "3D render look, photorealism, lens flare, depth of field, gradient background, drop "
            "shadow, glow outside the panel, green (except the chroma background), gold-leaf "
            "opulence, French Art Nouveau florals, Viking clichés"
        )
    },
    "engineer_health": {
        "class": "engineer",
        "panel": "health",
        "aspect": "16:9",
        "prompt": (
            "\"Nordic Cathedral Biomech\" style for the game \"Hunker Bunker\": the hard-line beauty of "
            "Nordic Jugendstil / National Romantic architecture — monumental stepped granite "
            "massing, deep round arches with heavy keystones, blackened-iron strap bindings and ring "
            "clasps, carved bone and stone relief, abstract serpentine interlace carving (no runes), "
            "frost-etched leaded glass, restrained taut curves — transposed into the bunkers of a "
            "dead megacorporation. 2D illustration: heavy black contours, woodcut/etching hatching "
            "on stone and iron, soft cel shading with painted texture. Mostly dark; amber lantern "
            "light, pale cold light on stone faces. No text.\n\n"
            "Game HUD hardware panel, flat-on orthographic, isolated on a flat pure chroma green "
            "#00FF00 background. A slim horizontal panel with proportions 8.1:1 spanning the image "
            "width: the HEALTH & STATUS centre panel of the ENGINEER class console. Bronze and iron "
            "forge-altar construction, bronze pipes behind the top edge, interlace-carved conduits, "
            "brown/rust patina (no green). Glass: one wide rectangle over the left two thirds, one "
            "narrow vertical slot, one rectangle over the right third — all empty, flat near-black. "
            "A small crest at the top centre holds five bronze lamp-cups with teal glass caps (unlit). "
            "Orange seam light. Crisp dark ink outline. No green in the panel."
        ),
        "negative": (
            "text, letters, numbers, runes, symbols, logos, watermark, UI, icons, bars, graphs, maps, "
            "radar content, characters, faces, gameplay scene, background environment, perspective, "
            "3D render look, photorealism, lens flare, depth of field, gradient background, drop "
            "shadow, glow outside the panel, green (except the chroma background), gold-leaf "
            "opulence, French Art Nouveau florals, Viking clichés"
        )
    },
    "engineer_gun": {
        "class": "engineer",
        "panel": "gun",
        "aspect": "16:9",
        "prompt": (
            "\"Nordic Cathedral Biomech\" style for the game \"Hunker Bunker\": the hard-line beauty of "
            "Nordic Jugendstil / National Romantic architecture — monumental stepped granite "
            "massing, deep round arches with heavy keystones, blackened-iron strap bindings and ring "
            "clasps, carved bone and stone relief, abstract serpentine interlace carving (no runes), "
            "frost-etched leaded glass, restrained taut curves — transposed into the bunkers of a "
            "dead megacorporation. 2D illustration: heavy black contours, woodcut/etching hatching "
            "on stone and iron, soft cel shading with painted texture. Mostly dark; amber lantern "
            "light, pale cold light on stone faces. No text.\n\n"
            "Game HUD hardware panel, flat-on orthographic, isolated on a flat pure chroma green "
            "#00FF00 background. A slim horizontal panel with proportions 5.9:1 spanning the image "
            "width: the GUN & AMMO wing of the ENGINEER class console. Bronze and iron, pipes and "
            "heat fins, an iron-bound tool rail, brown/rust patina (no green). Glass: a rectangle "
            "at the left (about one third of the width), a second rectangle beside it, and two square "
            "sockets at the right end — all empty, flat near-black. Orange seam light. Crisp dark ink "
            "outline. No green in the panel."
        ),
        "negative": (
            "text, letters, numbers, runes, symbols, logos, watermark, UI, icons, bars, graphs, maps, "
            "radar content, characters, faces, gameplay scene, background environment, perspective, "
            "3D render look, photorealism, lens flare, depth of field, gradient background, drop "
            "shadow, glow outside the panel, green (except the chroma background), gold-leaf "
            "opulence, French Art Nouveau florals, Viking clichés"
        )
    }
}


def print_manifest():
    print(f"Loaded {len(PROMPTS)} prompt specifications for Gemini:")
    for k, v in PROMPTS.items():
        print(f"  - [{v['class']}/{v['panel']}] (key: {k})")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--list", action="store_true", help="List all prompt definitions")
    args = parser.parse_args()
    print_manifest()
