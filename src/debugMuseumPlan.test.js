import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { WORLD_3D_MODELS, WORLD_3D_STRUCTURES } from './world3dOverlay.js';
import { ENEMY_3D_MODELS } from './enemy3dOverlay.js';
import { CHASSIS_SKIN_GLB_MAP } from './debugAssetCatalogs.js';
import { CHASSIS_BODY_VARIANTS } from './chassisBodies.js';
import { MUSEUM_OPERATOR_HEIGHT, buildMuseumExhibitPlan, listMuseumModelUrls } from './debugMuseumPlan.js';

function shippedGlbs(dir = 'public/3d') {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...shippedGlbs(full));
        else if (full.endsWith('.glb')) out.push(`/${path.relative('public', full).split(path.sep).join('/')}`);
    }
    return out;
}

const plan = buildMuseumExhibitPlan();
const entriesOfKind = (kind) => plan.filter((c) => c.kind === kind).flatMap((c) => c.entries);

describe('debug museum exhibit plan', () => {
    // The museum is the QA space for art. A shipped model it does not exhibit
    // can only be checked by finding it in a live run.
    it('exhibits every 3D model the game ships', () => {
        const exhibited = listMuseumModelUrls(plan);
        // Collision hulls are invisible by design; their render twin is exhibited.
        const missing = shippedGlbs().filter((url) => !url.endsWith('.collision.glb') && !exhibited.has(url));
        expect(missing).toEqual([]);
    });

    it('exhibits every world model and enemy through their production spawn paths', () => {
        const worldTypes = new Set(entriesOfKind('world').map((e) => e.type));
        expect(Object.keys(WORLD_3D_MODELS).filter((t) => !worldTypes.has(t))).toEqual([]);
        const enemyTypes = new Set(entriesOfKind('enemy').map((e) => e.type));
        expect(Object.keys(ENEMY_3D_MODELS).filter((t) => !enemyTypes.has(t))).toEqual([]);
        const structures = new Set(entriesOfKind('structure').map((e) => e.type));
        expect(Object.keys(WORLD_3D_STRUCTURES).filter((t) => !structures.has(t))).toEqual([]);
    });

    it('exhibits every chassis skin and every body of a multi-body chassis', () => {
        const urls = new Set(entriesOfKind('character').map((e) => e.url));
        for (const [id, url] of Object.entries(CHASSIS_SKIN_GLB_MAP)) expect(urls.has(url), id).toBe(true);
        for (const variants of Object.values(CHASSIS_BODY_VARIANTS)) {
            for (const { url } of variants) expect(urls.has(url), url).toBe(true);
        }
    });

    // Scale QA only means something if exhibits stand at their in-game size:
    // operators at the player's height, world models and enemies at the
    // height their own config gives them (applied by the production loader).
    it('stands operator bodies at the in-game player height', () => {
        expect(MUSEUM_OPERATOR_HEIGHT).toBeCloseTo(1.6 * 0.98, 5);
        for (const entry of entriesOfKind('character')) expect(entry.height, entry.label).toBe(MUSEUM_OPERATOR_HEIGHT);
        for (const entry of [...entriesOfKind('world'), ...entriesOfKind('enemy')]) expect(entry.height, entry.label).toBeUndefined();
    });

    it('lays modular kit pieces on the floor in their own room-spaced wings', () => {
        for (const title of ['MODULAR KIT: CAVE', 'MODULAR KIT: SPACE']) {
            const wing = plan.find((c) => c.title === title);
            expect(wing.entries).toHaveLength(40);
            expect(wing.raised).toBe(false);
            expect(wing.spacing).toBeGreaterThanOrEqual(16);
        }
        expect(plan.find((c) => c.title === 'OTHER WORLD MODELS')?.entries.some((e) => e.type.startsWith('kit_')) ?? false).toBe(false);
    });

    it('gives every category room for its largest exhibit', () => {
        for (const category of plan) expect(category.spacing, category.title).toBeGreaterThanOrEqual(3);
        expect(plan.find((c) => c.kind === 'enemy').spacing).toBeGreaterThanOrEqual(4.5);
    });
});
