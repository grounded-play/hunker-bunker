import { describe, expect, it } from 'vitest';
import * as hiveSite from './hiveSite.js';
import { WORLD_3D_MODELS } from './world3dOverlay.js';
import { ACT2_HIVE_SITES } from './act2.js';

// 3D asset audit 2026-10-01: the Vey and Rhun models were loaded and
// preloaded but never shown; every hive leader stayed a 2D walk sprite.
describe('hive leader 3D models', () => {
    it('gives every hive a registered 3D leader model', async () => {
        const models = hiveSite.HIVE_LEADER_3D_MODELS || (await import('./hiveSite.js')).HIVE_LEADER_3D_MODELS;
        expect(models).toBeDefined();
        expect(ACT2_HIVE_SITES.length).toBeGreaterThan(0);
        for (const site of ACT2_HIVE_SITES) {
            const type = models[site.id];
            expect(type, site.id).toBeTruthy();
            expect(WORLD_3D_MODELS[type]?.url, `${site.id} -> ${type}`).toMatch(/\.glb$/);
        }
    });

    it('shows Vey at the relay hive and Rhun at the carapace hive', async () => {
        const models = hiveSite.HIVE_LEADER_3D_MODELS || (await import('./hiveSite.js')).HIVE_LEADER_3D_MODELS;
        expect(models).toBeDefined();
        expect(models.hive_relay).toBe('npc_alien_vey');
        expect(models.hive_carapace).toBe('npc_alien_rhun');
    });
});
