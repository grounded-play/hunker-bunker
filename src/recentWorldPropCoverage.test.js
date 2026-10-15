import { access } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
    RECENT_PROP_FX_EXCEPTIONS,
    RECENT_PROP_INTERACTION_EXCEPTIONS,
    RECENT_WORLD_PROP_IDS
} from './data/recentWorldProps.js';
import { PROP_FX_PROFILES } from './propFx.js';
import { PROP_INTERACTION_SPECS } from './propInteractions.js';
import { WORLD_3D_MODELS } from './world3dOverlay.js';

describe('recent 98 world-story GLB contract', () => {
    it('keeps the audited cohort exact, unique, present, and runtime-routed', async () => {
        expect(RECENT_WORLD_PROP_IDS).toHaveLength(98);
        expect(new Set(RECENT_WORLD_PROP_IDS).size).toBe(98);
        for (const id of RECENT_WORLD_PROP_IDS) {
            await expect(access(new URL(`../public/3d/runtime/new3ds/${id}.glb`, import.meta.url)))
                .resolves.toBeUndefined();
            expect(WORLD_3D_MODELS[id], id).toBeTruthy();
        }
    });

    it('requires an FX recipe or an explicit non-FX art classification', () => {
        for (const id of RECENT_WORLD_PROP_IDS) {
            expect(Boolean(PROP_FX_PROFILES[id]) || Boolean(RECENT_PROP_FX_EXCEPTIONS[id]), id).toBe(true);
        }
        for (const id of Object.keys(RECENT_PROP_FX_EXCEPTIONS)) {
            expect(RECENT_WORLD_PROP_IDS, id).toContain(id);
            expect(PROP_FX_PROFILES[id], `${id} has both a recipe and an obsolete exception`).toBeUndefined();
        }
    });

    it('requires a bespoke interaction or an explicit ambient/traversal classification', () => {
        for (const id of RECENT_WORLD_PROP_IDS) {
            expect(
                Boolean(PROP_INTERACTION_SPECS[id]) || Boolean(RECENT_PROP_INTERACTION_EXCEPTIONS[id]),
                id
            ).toBe(true);
        }
        for (const id of Object.keys(RECENT_PROP_INTERACTION_EXCEPTIONS)) {
            expect(RECENT_WORLD_PROP_IDS, id).toContain(id);
            expect(
                PROP_INTERACTION_SPECS[id],
                `${id} has both a bespoke interaction and an obsolete exception`
            ).toBeUndefined();
        }
    });
});
