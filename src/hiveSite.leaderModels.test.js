import { describe, expect, it } from 'vitest';
import { HIVE_LEADER_3D_MODELS } from './hiveSite.js';
import { WORLD_3D_MODELS } from './world3dOverlay.js';
import { ACT2_HIVE_SITES } from './act2.js';

// 3D asset audit 2026-10-01: the Vey and Rhun models were loaded and
// preloaded but never shown; every hive leader stayed a 2D walk sprite.
describe('hive leader 3D models', () => {
    it('gives every hive a registered 3D leader model', () => {
        expect(ACT2_HIVE_SITES.length).toBeGreaterThan(0);
        for (const site of ACT2_HIVE_SITES) {
            const type = HIVE_LEADER_3D_MODELS[site.id];
            expect(type, site.id).toBeTruthy();
            expect(WORLD_3D_MODELS[type]?.url, `${site.id} -> ${type}`).toMatch(/\.glb$/);
        }
    });

    it('shows Vey at the relay hive and Rhun at the carapace hive', () => {
        expect(HIVE_LEADER_3D_MODELS.hive_relay).toBe('npc_alien_vey');
        expect(HIVE_LEADER_3D_MODELS.hive_carapace).toBe('npc_alien_rhun');
    });
});
