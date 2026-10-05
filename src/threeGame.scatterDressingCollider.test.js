import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

// Room dressing registers invisible collision proxies (Object3D, no material)
// in scatterSprites. updateScatter's per-type animation wrote
// `child.material.opacity` for any `bunker_junk*` type, so a dressing kit
// that placed bunker junk threw every frame; render() swallowed the error
// before drawing and gameplay stayed black (logs/newlog.json, 2026-10-05).
describe('updateScatter with room-dressing collision proxies', () => {
    function makeGame(sprites) {
        const game = Object.create(ThreeGame.prototype);
        Object.assign(game, {
            scatterSprites: sprites,
            player: { position: new THREE.Vector3(500, 0, 500) },
            isPlayerDead: false,
            // updateScatter caches the boss panel nodes; no DOM in this test.
            _bossPanelEl: { classList: { add: vi.fn(), remove: vi.fn() }, style: {} },
            _bossNameEl: {},
            _bossHpBarEl: { style: {} },
            _bossHpTextEl: {},
            syncSiteProps3d: vi.fn(),
            loadNearbyWorld3dReplacement: vi.fn(),
            getFogOfWarVisibility: vi.fn(() => 1)
        });
        return game;
    }

    function dressingCollider(type) {
        const collider = new THREE.Object3D();
        collider.userData = { isScatter: true, isRoomDressingCollider: true, type, groupType: 'dressing' };
        return collider;
    }

    it('does not throw on a bunker junk collider and leaves it alone', () => {
        const collider = dressingCollider('bunker_junk_rare');
        const game = makeGame([collider]);
        expect(() => game.updateScatter(0.016, 1000)).not.toThrow();
        expect(game.loadNearbyWorld3dReplacement).not.toHaveBeenCalled();
    });

    it('still animates a real bunker junk sprite', () => {
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, opacity: 0.2 }));
        sprite.userData = { isScatter: true, type: 'bunker_junk_rare', baseOpacity: 0.9, baseScaleX: 1, baseScaleY: 1 };
        const game = makeGame([sprite]);
        game.updateScatter(0.016, 1000);
        expect(sprite.material.opacity).toBeCloseTo(0.9);
    });
});
