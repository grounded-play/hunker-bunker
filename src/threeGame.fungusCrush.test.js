import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

// Owner, 2026-10-07: "the fungus should break when you walk over it".
describe('fungus crushes underfoot', () => {
    function setup(type = 'prop_cave_spores') {
        const game = Object.create(ThreeGame.prototype);
        const parent = new THREE.Group();
        const fungus = new THREE.Sprite(new THREE.SpriteMaterial());
        fungus.position.set(4, 0, 4);
        fungus.userData = { type, isScatter: true, isDestructibleProp: true, propHp: 3, scatterKey: 'chunk:0,0:fungus:1' };
        parent.add(fungus);
        Object.assign(game, {
            player: { position: new THREE.Vector3(4.2, 0, 4) },
            playerRadius: 0.3,
            isPlayerDead: false,
            scatterSprites: [fungus],
            brokenPropScatterKeys: new Set(),
            spawnGearPoofEffect: vi.fn(),
            spawnToxicSporePuddle: vi.fn(),
            spawnDestructiblePropDrops: vi.fn(),
            spawnFungusStain: vi.fn(),
            broadcastSharedWorldEvent: vi.fn()
        });
        return { game, fungus, parent };
    }

    it('breaks fungus you walk through, with a puff and a stain but no loot or hazard', () => {
        const { game, fungus } = setup();
        expect(game.updateUnderfootCrush()).toBe(1);
        expect(fungus.userData.burstTriggered).toBe(true);
        expect(fungus.parent).toBeNull();
        expect(game.brokenPropScatterKeys.has('chunk:0,0:fungus:1')).toBe(true);
        expect(game.spawnGearPoofEffect).toHaveBeenCalledWith(4, 4, 'bio_spores');
        expect(game.spawnFungusStain).toHaveBeenCalledTimes(1);
        expect(game.spawnToxicSporePuddle).not.toHaveBeenCalled();
        expect(game.spawnDestructiblePropDrops.mock.calls[0]?.[1] ?? []).toEqual([]);
    });

    it('leaves fungus you are not standing on, and anything not crushable', () => {
        const { game, fungus } = setup();
        game.player.position.set(9, 0, 9);
        expect(game.updateUnderfootCrush()).toBe(0);
        expect(fungus.userData.burstTriggered).toBeFalsy();
        const crate = setup('prop_camp_crate');
        expect(crate.game.updateUnderfootCrush()).toBe(0);
    });
});
