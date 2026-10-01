import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WEAPON_ARCHETYPES, WEAPON_SKIN_MESHES, CHASSIS_SKIN_MODELS } from './player3dOverlay.js';
import { ENEMY_3D_MODELS } from './enemy3dOverlay.js';
import { ARMORY_PREVIEWS } from './data/armoryPreviews.js';
import { COMMUNITY_GLB_MAP } from './data/communitySkins.js';

// 3D asset audit 2026-10-01 (docs/reports/3d-asset-audit-2026-10-01.md):
// five achievement rewards and four enemies were "wired" by copying another
// model's file under a new name, so items looked finished while showing a
// factory gun or someone else's character. Two different paths in the game's
// model maps must never hold the same bytes: share a path deliberately, or
// ship a real model.
const publicDir = fileURLToPath(new URL('../public', import.meta.url));

function modelPaths() {
    const paths = new Set();
    const add = (p) => { if (typeof p === 'string' && p.endsWith('.glb')) paths.add(p); };
    Object.values(WEAPON_ARCHETYPES).forEach(add);
    Object.values(WEAPON_SKIN_MESHES).forEach(add);
    Object.values(CHASSIS_SKIN_MODELS).forEach(add);
    Object.values(COMMUNITY_GLB_MAP ?? {}).forEach(add);
    Object.values(ENEMY_3D_MODELS).forEach((cfg) => add(cfg?.url));
    Object.values(ARMORY_PREVIEWS).forEach((entry) => add(entry?.model));
    return [...paths];
}

describe('model catalog integrity', () => {
    it('never ships one model under two file names', () => {
        const byHash = new Map();
        for (const path of modelPaths()) {
            const file = `${publicDir}${path}`;
            expect(fs.existsSync(file), path).toBe(true);
            const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
            byHash.set(hash, [...(byHash.get(hash) ?? []), path]);
        }
        const copies = [...byHash.values()].filter((group) => group.length > 1);
        expect(copies).toEqual([]);
    });
});
