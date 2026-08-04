import { access, stat } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { hasEnemy3dModel } from './enemy3dOverlay.js';
import { WORLD_3D_MODELS } from './world3dOverlay.js';

const NEW_ASSETS = [
    'bunker_junk_rare', 'bunker_junk_uncommon', 'fungal_spore_vent',
    'prop_biomech_arch', 'prop_broken_specimen_tank', 'prop_bunker_supplies',
    'prop_cave_bones', 'prop_cave_queen_throne', 'prop_conduit_hub',
    'prop_diagnostic_console', 'prop_medical_bed', 'prop_security_barricade',
    'prop_specimen_tank', 'prop_surgical_cart', 'spore_mortar', 'sporesnail'
];

describe('new 3D replacement asset coverage', () => {
    it('keeps every optimized GLB present and below the source-sized payload ceiling', async () => {
        for (const name of NEW_ASSETS) {
            const url = new URL(`../public/3d/runtime/new3ds/${name}.glb`, import.meta.url);
            await expect(access(url)).resolves.toBeUndefined();
            expect((await stat(url)).size, name).toBeLessThan(8 * 1024 * 1024);
        }
    });

    it('routes every asset through either the world or enemy 3D replacement catalog', () => {
        for (const name of NEW_ASSETS) {
            expect(Boolean(WORLD_3D_MODELS[name]) || hasEnemy3dModel(name), name).toBe(true);
        }
    });
});
