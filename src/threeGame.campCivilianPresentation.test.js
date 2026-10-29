import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

describe('camp civilian presentation', () => {
    it('keeps ambient civilians on their animated walk sheets', () => {
        const setupWorld3dReplacement = vi.fn();
        const game = {
            camps: [{ id: 'camp_meridian', pos: { x: 10, z: 20 } }],
            campCivilians: [],
            scene: new THREE.Scene(),
            loadKeyedSpriteTexture: vi.fn(() => new THREE.Texture()),
            setupWorld3dReplacement
        };

        ThreeGame.prototype.ensureCampCivilians.call(game);

        expect(game.campCivilians).toHaveLength(2);
        expect(setupWorld3dReplacement).not.toHaveBeenCalled();
        for (const civilian of game.campCivilians) {
            expect(civilian.sprite.userData.sheetSprite).toBe(true);
            expect(civilian.sprite.userData.world3dRoot).toBeUndefined();
        }
    });

    it('advances the walk sheet while a civilian moves', () => {
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.Texture() }));
        sprite.position.set(0, 0.02, 0);
        sprite.userData = { sheetSprite: true, sheetTime: 0, sheetRow: 0 };
        const updateSheetSpriteFrame = vi.fn();
        const game = {
            campCivilians: [{
                sprite,
                campId: 'camp_meridian',
                target: { x: 2, z: 0 },
                idleTimer: 1
            }],
            getCampById: () => ({ revealed: true, destroyed: false, status: 'alive', pos: { x: 0, z: 0 } }),
            updateSheetSpriteFrame
        };

        ThreeGame.prototype.updateCampCivilians.call(game, 0.1);

        expect(sprite.position.x).toBeGreaterThan(0);
        expect(updateSheetSpriteFrame).toHaveBeenCalledWith(sprite, 1, 0, 0.1);
        expect(sprite.visible).toBe(true);
    });
});
