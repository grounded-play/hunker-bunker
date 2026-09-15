import { describe, expect, it, vi } from 'vitest';
import { BLACK_BOX_CORPSE_VISUALS, ThreeGame } from './threeGame.js';

describe('Black Box corpse identity', () => {
    it('maps every playable class to its own preserved death model', () => {
        expect(Object.keys(BLACK_BOX_CORPSE_VISUALS).sort()).toEqual(['ENGINEER', 'SCOUT', 'TANK']);
        expect(new Set(Object.values(BLACK_BOX_CORPSE_VISUALS).map((entry) => entry.modelUrl)).size).toBe(3);
    });

    it('records the deceased class and keeps a class-correct fallback while its pose loads', () => {
        const attachBlackBoxCorpseModel = vi.fn();
        const marker = ThreeGame.prototype.createBlackBoxMarker.call({
            attachBlackBoxCorpseModel,
            registerEnvLight: vi.fn()
        }, { x: 4, z: 8, classType: 'ENGINEER' });

        expect(marker.userData.corpseClass).toBe('ENGINEER');
        expect(marker.getObjectByName('BlackBoxCorpseFallback').userData.corpseClass).toBe('ENGINEER');
        expect(attachBlackBoxCorpseModel).toHaveBeenCalledWith(
            marker,
            marker.getObjectByName('BlackBoxCorpseFallback'),
            expect.objectContaining({ classType: 'ENGINEER' })
        );
    });
});
