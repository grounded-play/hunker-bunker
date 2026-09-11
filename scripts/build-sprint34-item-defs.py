#!/usr/bin/env python3
"""Turn finished 1024px icon art into shipped Steam item definitions.

Raw art for the Sprint 34 rig modules (4160-4167) and the operator/weapon/charm
slots of the six cosmetic sets arrives in art/source/3d/sprint34-raw/<id>.jpeg,
already composed on the house dark backdrop. This exports every size Steam and
the client need, then writes the matching item definitions into the inventory
schema.

Those 26 items previously had 3D models and raw art but no definition at all,
so they were invisible in the store and in the Vault.

Usage: python3 scripts/build-sprint34-item-defs.py [--check]
"""
import json
import os
import sys

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
RAW = os.path.join(ROOT, 'art', 'source', '3d', 'sprint34-raw')
ECONOMY = os.path.join(ROOT, 'public', 'economy')
MASTERS = os.path.join(ROOT, 'steam', 'store', 'item_icons')
CHROMA = os.path.join(MASTERS, 'chroma')
SCHEMA = os.path.join(ROOT, 'steam', 'inventory_schema_hunker_bunker.json')
CDN = 'https://hunkerbunker.netlify.app/economy'
MASTER_SIZE = 1254

# Per-set identity: accent colour and the background/name colours already used
# by that set's existing pieces, so a set reads as one thing in the Steam UI.
SETS = {
    'deep_frost':        ('Deep Frost',        '0c4a6e', '00c8ff'),
    'rust_bone':         ('Rust & Bone',       '431407', 'e8853a'),
    'hive_chitin':       ('Hive Chitin',       '14532d', '6fe36f'),
    'horizon_corporate': ('Horizon Corporate', '134e4a', '2dd4bf'),
    'bunker404':         ('Bunker 404',        '4a044e', 'ef4bd8'),
    'grand_marshal':     ('Grand Marshal',     '451a03', 'e3b341'),
}
# set key -> (operator id, weapon id, charm id) and the rarity of that set.
SET_SLOTS = {
    'deep_frost':        (4200, 4201, 4202, 'rare'),
    'rust_bone':         (4207, 4208, 4209, 'rare'),
    'hive_chitin':       (4214, 4215, 4216, 'rare'),
    'horizon_corporate': (4221, 4222, 4223, 'rare'),
    'bunker404':         (4228, 4229, 4230, 'epic'),
    'grand_marshal':     (4235, 4236, 4237, 'legendary'),
}
SLOT_META = {
    'chassis_skin':  ('chassis', 'CosmeticChassis', 'Operator Skin',
                      'Full operator chassis finish in the {} identity.'),
    'weapon_finish': ('skin', 'CosmeticWeapon', 'Weapon Skin',
                      'Weapon plating finish in the {} identity.'),
    'weapon_charm':  ('charm', 'CosmeticCharm', 'Charm',
                      'Hanging weapon charm in the {} identity.'),
}

# Earned rig modules. Never tradable: see
# docs/planning/cosmetic-loadout-gameplay-design-2026-09-10.md.
MODULES = [
    (4160, 'mod_ballast_plating',   'Ballast Plating',   'uncommon', 'Counterweight suit plating. Heavier, and harder to move.'),
    (4161, 'mod_scrap_furnace',     'Scrap Furnace',     'uncommon', 'Back-mounted smelter that renders salvage on the spot.'),
    (4162, 'mod_queens_bane',       "Queen's Bane",      'legendary', 'Barbed injector grown from carapace and surgical steel.'),
    (4163, 'mod_archivist_lens',    'Archivist Lens',    'rare',     'Antique monocular scanning lens on an articulated arm.'),
    (4164, 'mod_shard_conduit',     'Shard Conduit',     'rare',     'Crystal routing module that runs cold to the touch.'),
    (4165, 'mod_duplicate_refiner', 'Duplicate Refiner', 'rare',     'Matter reclamation drum. Unglamorous, and effective.'),
    (4166, 'mod_pressure_seal',     'Pressure Seal',     'epic',     'Chest rebreather diaphragm that sits mid-breath.'),
    (4167, 'mod_deep_anchor',       'Deep Anchor',       'epic',     'Descent anchor that has been deeper than it should have.'),
]


def export_sizes(item_id, slug):
    src = os.path.join(RAW, f'{item_id}.jpeg')
    img = Image.open(src).convert('RGBA')
    master = img.resize((MASTER_SIZE, MASTER_SIZE), Image.LANCZOS)
    for directory in (ECONOMY, MASTERS, CHROMA):
        os.makedirs(directory, exist_ok=True)
    master.save(os.path.join(MASTERS, f'{slug}_master.png'), 'PNG', optimize=True)
    master.save(os.path.join(CHROMA, f'{slug}_chroma.png'), 'PNG', optimize=True)
    img.resize((512, 512), Image.LANCZOS).save(
        os.path.join(ECONOMY, f'{slug}_large.png'), 'PNG', optimize=True)
    img.resize((256, 256), Image.LANCZOS).save(
        os.path.join(ECONOMY, f'{slug}.png'), 'PNG', optimize=True)


def definition(item_id, slug, name, desc, rarity, slot_tag, item_slot, bg, name_color, tradable):
    return {
        'itemdefid': item_id,
        'type': 'item',
        'name': name,
        'name_english': name,
        'description': desc,
        'description_english': desc,
        'icon_url': f'{CDN}/{slug}.png',
        'icon_url_large': f'{CDN}/{slug}_large.png',
        'background_color': bg,
        'name_color': name_color,
        'tradable': tradable,
        'marketable': tradable,
        'item_slot': item_slot,
        'tags': f'rarity:{rarity};class:all;slot:{slot_tag};season:0',
    }


def planned():
    out = []
    for item_id, slug, name, rarity, desc in MODULES:
        # Earned-only: tradable False keeps them off the market entirely.
        out.append((item_id, slug, definition(
            item_id, slug, name, desc, rarity, 'rig_overclock',
            'RigModule', '1c1917', 'a8a29e', False)))
    for key, (operator, weapon, charm, rarity) in SET_SLOTS.items():
        label, bg, name_color = SETS[key]
        for item_id, (slot_tag_key, ids) in zip(
                (operator, weapon, charm),
                zip(('chassis_skin', 'weapon_finish', 'weapon_charm'), (0, 1, 2))):
            prefix, item_slot, suffix, blurb = SLOT_META[slot_tag_key]
            slug = f'{prefix}_{key}'
            out.append((item_id, slug, definition(
                item_id, slug, f'{label} {suffix}', blurb.format(label),
                rarity, slot_tag_key, item_slot, bg, name_color, True)))
    return out


def main():
    check = '--check' in sys.argv
    with open(SCHEMA, 'r', encoding='utf-8') as f:
        schema = json.load(f)
    have = {i['itemdefid'] for i in schema['items']}
    plan = planned()
    missing = [p for p in plan if p[0] not in have]

    if check:
        if missing:
            print(f'[sprint34-defs] {len(missing)} item definition(s) missing: '
                  + ', '.join(str(p[0]) for p in missing))
            return 1
        print(f'[sprint34-defs] ok ({len(plan)} definitions present)')
        return 0

    if not missing:
        print('[sprint34-defs] nothing to add')
        return 0

    for item_id, slug, item in missing:
        raw = os.path.join(RAW, f'{item_id}.jpeg')
        if not os.path.exists(raw):
            print(f'  SKIP {item_id}: no raw art at {raw}')
            continue
        export_sizes(item_id, slug)
        schema['items'].append(item)
        print(f'  added {item_id} {item["name"]:34} -> {slug}.png')

    schema['items'].sort(key=lambda i: i['itemdefid'])
    with open(SCHEMA, 'w', encoding='utf-8') as f:
        json.dump(schema, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print(f'[sprint34-defs] added {len(missing)} definitions')
    return 0


if __name__ == '__main__':
    sys.exit(main())
