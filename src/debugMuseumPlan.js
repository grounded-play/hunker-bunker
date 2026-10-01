/**
 * What the debug museum exhibits, and how each exhibit is spawned.
 *
 * Pure data, so coverage is testable without a renderer: debugMuseumPlan.test.js
 * fails when a shipped GLB, world model, enemy or chassis is missing here.
 *
 * Kinds, and the spawn path src/debugMuseum.js uses for each:
 * - item: a turntable model fitted to `size` (weapons, charms, mods). These are
 *   held or socketed in game, so there is no world height to match.
 * - character: an operator body stood at MUSEUM_OPERATOR_HEIGHT, the in-game
 *   player height, facing +Z (the Mixamo forward axis the overlay assumes).
 * - world: createWorld3dModel(type), the production loader, which applies the
 *   type's own height and yaw.
 * - enemy: createEnemy3dVisual(type), the production enemy visual, with the
 *   type's own height, yaw and clips.
 * - structure: createWorld3dStructure(type).
 * - icon, wallDecal, floorDecal: 2D art.
 */
import { SHOWROOM_CATEGORIES } from './debugShowroom.js';
import { WORLD_3D_MODELS, WORLD_3D_STRUCTURES } from './world3dOverlay.js';
import { ENEMY_3D_MODELS } from './enemy3dOverlay.js';
import { CHASSIS_BODY_VARIANTS } from './chassisBodies.js';
import {
    WEAPON_ARCHETYPES, WEAPON_SKIN_MESHES, CHARM_GLB_MAP, MOD_GLB_MAP, CHASSIS_SKIN_GLB_MAP
} from './debugAssetCatalogs.js';

// threeGame.js: playerSpriteScale (1.6) * 0.98 is every operator overlay's targetHeight.
export const MUSEUM_OPERATOR_HEIGHT = 1.6 * 0.98;

// The class bodies and the secret operator are wired inline in threeGame.js's
// classVisuals / MAYOR_TINA config rather than through a catalog.
const OPERATOR_BODIES = Object.freeze([
    ['SCOUT (base)', '/3d/scouting-scout/Scout.game.glb'],
    ['TANK (base)', '/3d/runtime/tank-rigged.glb'],
    ['ENGINEER (base)', '/3d/runtime/engineer-rigged-gestures.glb'],
    ['MAYOR TINA (secret, rigged)', '/3d/runtime/secrets/mayor-tina-rigged.glb']
]);

const WORLD_CATEGORY_KEYS = Object.freeze([
    ['TACTICAL PROPS', 'TACTICAL_PROPS'],
    ['BIOMECH PROPS', 'BIOMECH_PROPS'],
    ['SETPIECES', 'SETPIECES'],
    ['CAMP PROPS', 'CAMP_PROPS'],
    ['AFTERMATH STATES', 'AFTERMATH_STATES'],
    ['SECRETS', 'SECRETS'],
    ['ARCHITECTURE', 'ARCHITECTURE_3D'],
    ['FIXTURES', 'FIXTURES_3D'],
    ['FUNGAL PROPS', 'FUNGAL_PROPS'],
    ['CRYO PROPS', 'CRYO_PROPS'],
    ['RUINED INDUSTRIAL PROPS', 'RUINED_INDUSTRIAL_PROPS']
]);

const byId = (a, b) => String(a).localeCompare(String(b), 'en', { numeric: true });

export function buildMuseumExhibitPlan() {
    const plan = [];
    const items = (title, map, size) => plan.push({
        title, kind: 'item', spacing: 3.2,
        entries: Object.entries(map).map(([label, url]) => ({ label, url, size }))
    });
    items('WEAPON ARCHETYPES', WEAPON_ARCHETYPES, 1.1);
    items('WEAPON SKINS', WEAPON_SKIN_MESHES, 1.1);
    items('WEAPON CHARMS', CHARM_GLB_MAP, 0.7);
    items('RIG OVERCLOCK MODS', MOD_GLB_MAP, 0.7);

    const character = (label, url) => ({ label, url, height: MUSEUM_OPERATOR_HEIGHT });
    plan.push({
        title: 'OPERATOR BODIES', kind: 'character', spacing: 3.2,
        entries: OPERATOR_BODIES.map(([label, url]) => character(label, url))
    });
    const chassis = [];
    for (const id of Object.keys(CHASSIS_SKIN_GLB_MAP).sort(byId)) {
        const variants = CHASSIS_BODY_VARIANTS[id];
        if (variants) {
            for (const { body, url } of variants) chassis.push(character(`${id} (${body})`, url));
        } else {
            chassis.push(character(id, CHASSIS_SKIN_GLB_MAP[id]));
        }
    }
    plan.push({ title: 'CHASSIS SKINS', kind: 'character', spacing: 3.2, entries: chassis });

    // Every registered world model, in its showroom category; anything a
    // category does not list lands in a catch-all so nothing goes unseen.
    const placed = new Set();
    const world = (title, types, spacing = 3.4, { raised = true, paired = true } = {}) => {
        const entries = types.filter((type) => WORLD_3D_MODELS[type] && !placed.has(type)).map((type) => {
            placed.add(type);
            return { label: type, type, url: WORLD_3D_MODELS[type].url };
        });
        if (entries.length) plan.push({ title, kind: 'world', spacing, raised, paired, entries });
    };
    world('CAMP LEADERS & NPCS', Object.keys(WORLD_3D_MODELS).filter((t) => t.startsWith('npc_') || t.startsWith('secret_')).sort());
    for (const [title, key] of WORLD_CATEGORY_KEYS) world(title, (SHOWROOM_CATEGORIES[key] ?? []).map(String), 4);
    // Modular kit pieces are architecture on the floor grid, up to 15 units
    // across (room_large at KIT_SCALE): no plinth, and room-sized spacing.
    for (const skin of ['cave', 'space']) {
        world(`MODULAR KIT: ${skin.toUpperCase()}`, Object.keys(WORLD_3D_MODELS).filter((t) => t.startsWith(`kit_${skin}_`)).sort(), 18, { raised: false, paired: false });
    }
    world('OTHER WORLD MODELS', Object.keys(WORLD_3D_MODELS).sort(), 4);

    plan.push({
        title: 'ENEMIES & BOSSES', kind: 'enemy', spacing: 5, paired: true,
        entries: Object.keys(ENEMY_3D_MODELS).map((type) => ({ label: type, type, url: ENEMY_3D_MODELS[type].url }))
    });

    plan.push({
        title: 'COSMETIC PLAYER DECALS', kind: 'icon', spacing: 3.2,
        entries: SHOWROOM_CATEGORIES.COSMETIC_PLAYER_DECALS.map((id) => ({ label: String(id), itemdefid: id }))
    });
    plan.push({
        title: 'ENVIRONMENTAL WALL DECALS', kind: 'wallDecal', spacing: 3.2,
        entries: SHOWROOM_CATEGORIES.WALL_DECALS.map((type) => ({ label: type, type }))
    });
    plan.push({
        title: 'GROUND OVERLAYS & FLOOR DECALS', kind: 'floorDecal', spacing: 3.2,
        entries: SHOWROOM_CATEGORIES.FLOOR_DECALS.map((type) => ({ label: type, type }))
    });

    // Structures are building-sized; one per row, last, with room around it.
    plan.push({
        title: 'STRUCTURES', kind: 'structure', spacing: 60, columns: 1,
        entries: Object.entries(WORLD_3D_STRUCTURES).map(([type, config]) => ({ label: type, type, url: config.url }))
    });
    return plan;
}

export function listMuseumModelUrls(plan = buildMuseumExhibitPlan()) {
    const urls = new Set();
    for (const category of plan) {
        for (const entry of category.entries) if (entry.url) urls.add(entry.url);
    }
    return urls;
}
