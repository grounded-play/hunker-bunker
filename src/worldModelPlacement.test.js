import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { WORLD_3D_MODELS, WORLD_3D_MODEL_ALIASES } from './world3dOverlay.js';
import { ROOM_THEME_CATALOG } from './roomThemes.js';
import { PROP_VARIANT_GROUPS } from './propVariants.js';
import { CAMP_DRESSING_MODELS, CAMP_PROP_MODELS, CAMP_SIGNATURE_PROPS } from './camp.js';
import { HIVE_PROP_MODELS, HIVE_SIGNATURE_PROPS } from './hiveSite.js';
import { DRESSING_KITS, ROLE_DRESSING, VIGNETTES, dressingKitFor } from './roomDressingKits.js';
import { QUEST_OBJECTS } from './questObjects.js';
import { LORE_DROPS } from './loreDrops.js';
import { WORLD_EXPANSION_80_IDS } from './data/worldExpansion80.js';

// Owner rule (2026-10-28): every model we have is placed in the world, and a
// new model never replaces a good one. Both halves are checked here:
//  - no alias draws another model in place of a type that has its own, and
//  - every registered model has a placement path.
// Kit pieces are assembled by src/kitGrammar.js from templated names and NPCs
// by their own map, so they are out of scope here.

function placedTypes() {
    const types = new Set();
    const addAll = (list) => { for (const type of list ?? []) if (type) types.add(type); };
    for (const theme of ROOM_THEME_CATALOG) {
        for (const pool of ['signatureProps', 'largeProps', 'smallProps', 'ambientProps', 'rareProps']) addAll(theme[pool]);
        for (const layer of Object.values(dressingKitFor(theme.id))) addAll(layer);
    }
    for (const catalog of [DRESSING_KITS, ROLE_DRESSING]) {
        for (const kit of Object.values(catalog)) for (const layer of Object.values(kit)) if (Array.isArray(layer)) addAll(layer);
    }
    for (const groups of Object.values(VIGNETTES)) for (const group of groups) addAll(group);
    for (const variants of Object.values(PROP_VARIANT_GROUPS)) addAll(variants);
    addAll(Object.values(CAMP_PROP_MODELS));
    addAll(Object.values(HIVE_PROP_MODELS));
    for (const specs of Object.values(CAMP_DRESSING_MODELS)) addAll(specs.map((spec) => spec.type));
    for (const specs of Object.values(CAMP_SIGNATURE_PROPS)) addAll(specs.map((spec) => spec.model));
    for (const specs of Object.values(HIVE_SIGNATURE_PROPS)) addAll(specs.map((spec) => spec.model));
    for (const entry of Object.values(QUEST_OBJECTS)) addAll([entry.target?.standIn, entry.landmark?.standIn]);
    addAll(LORE_DROPS.map((drop) => drop.key));
    addAll(WORLD_EXPANSION_80_IDS);
    return types;
}

// Bespoke placements (ship modules, set pieces, room builds) name the type in
// placement code rather than in a pool.
const DESCRIPTIVE = /(world3dOverlay|missingWorldStory50|propFx|propExperience|modelPresentationRegistry|debugShowroom|debugMuseum|debugAssetCatalogs|world3dCandidates|specialVariants|propBehavior|dressingTriangles|propInteractions|propSockets|surfaceAssetRegistry|propAnimations)/;
function placementSource() {
    // fileURLToPath, not URL.pathname: on Windows the pathname is /D:/..., which
    // path.join turned into D:\\D:\\... on the CI runner.
    const root = path.dirname(fileURLToPath(import.meta.url));
    const chunks = [];
    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const file = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(file);
            else if (/\.m?js$/.test(entry.name) && !entry.name.includes('.test.') && !DESCRIPTIVE.test(file)) chunks.push(fs.readFileSync(file, 'utf8'));
        }
    };
    walk(root);
    chunks.push(fs.readFileSync(path.join(root, '..', 'main.js'), 'utf8'));
    return chunks.join('\n');
}

describe('every world model is placed, and none hides another', () => {
    it('never aliases a type that has its own model', () => {
        const shadowed = Object.entries(WORLD_3D_MODEL_ALIASES)
            .filter(([type, target]) => target !== type && Object.hasOwn(WORLD_3D_MODELS, type))
            .map(([type, target]) => `${type} drawn as ${target}`);
        expect(shadowed).toEqual([]);
    });

    it('gives every registered model a placement in the world', () => {
        const placed = placedTypes();
        const source = placementSource();
        const unplaced = Object.keys(WORLD_3D_MODELS)
            .filter((type) => !type.startsWith('kit_') && !type.startsWith('npc_'))
            .filter((type) => !placed.has(type) && !new RegExp(`['"\`]${type}['"\`]`).test(source));
        expect(unplaced).toEqual([]);
    });
});
