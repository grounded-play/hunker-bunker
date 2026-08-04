import { describe, expect, it } from 'vitest';
import { WORLD_3D_MODELS } from './world3dOverlay.js';

describe('world 3D replacement catalog', () => {
    it('maps each new world counterpart to an optimized runtime GLB', () => {
        expect(WORLD_3D_MODELS.broken_scout_ship.url).toBe('/3d/runtime/broken-scout-ship.glb');
        expect(WORLD_3D_MODELS.base_console.url).toBe('/3d/runtime/console.glb');
        expect(WORLD_3D_MODELS.o2_generator.url).toBe('/3d/runtime/o2-generator.glb');
        expect(WORLD_3D_MODELS.basic_pile.url).toBe('/3d/runtime/basic-pile.glb');
        expect(WORLD_3D_MODELS.storage_locker.url).toBe('/3d/runtime/storage-locker.glb');
        expect(WORLD_3D_MODELS.frozen_tanker.url).toBe('/3d/runtime/frozen-tanker.glb');
    });

    it('keeps every model normalized to a positive gameplay height', () => {
        for (const config of Object.values(WORLD_3D_MODELS)) {
            expect(config.url.endsWith('.glb')).toBe(true);
            expect(config.height).toBeGreaterThan(0);
        }
    });
});
