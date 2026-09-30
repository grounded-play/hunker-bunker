import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

function makeSprite(type = 'boss_corrupted_scout') {
    return {
        position: new THREE.Vector3(0, 0, 0),
        userData: {
            type,
            biomeBossFight: { attacksInPhase: 2 }
        }
    };
}

function makeGame() {
    return {
        player: { position: new THREE.Vector3(3, 0, 0) },
        isPlayerDead: false,
        spawnProjectile: vi.fn(),
        spawnFrostShockwaveEffect: vi.fn(),
        spawnPhysicalBurst: vi.fn(),
        takeDamage: vi.fn(() => true),
        applyPlayerSlow: vi.fn(),
        isSnailTileWalkable: vi.fn(() => true)
    };
}

describe('corrupted operator phase attacks', () => {
    beforeEach(() => {
        globalThis.window = globalThis.window ?? {};
        window.dispatchEvent = vi.fn();
    });

    it.each([
        ['boss_corrupted_scout', 'corrupted-scout'],
        ['boss_corrupted_tank', 'corrupted-tank'],
        ['boss_corrupted_engineer', 'corrupted-engineer']
    ])('attaches the phase machine when %s enters a real run', (type, fightKey) => {
        const texture = new THREE.Texture();
        const baseMaterial = new THREE.SpriteMaterial({ map: texture });
        const game = Object.assign(Object.create(ThreeGame.prototype), {
            snailsEnabled: true,
            scatterMaterials: { [type]: baseMaterial },
            loadKeyedSpriteTexture: () => texture,
            applySuspendedEnemyState: vi.fn(),
            setupEnemy3dCosmeticOverlay: vi.fn()
        });
        const sprite = game.createScatterInstance({
            type,
            x: 4,
            z: 6,
            scale: 2.4,
            elevation: 0.1,
            opacity: 1,
            isBoss: true
        });
        expect(sprite.userData.biomeBossFight?.def.key).toBe(fightKey);
        expect(sprite.userData.biomeBossFight.hp).toBe(sprite.userData.maxHp);
        sprite.material.dispose();
        baseMaterial.dispose();
        texture.dispose();
    });

    it('turns the Scout second phase into a real flank followed by five shots', () => {
        const game = makeGame();
        const sprite = makeSprite();
        ThreeGame.prototype.fireBiomeBossAttack.call(game, sprite, 'corrupted_scout_flank');
        expect(game.isSnailTileWalkable).toHaveBeenCalled();
        expect(sprite.position.z).not.toBe(0);
        expect(game.spawnProjectile).toHaveBeenCalledTimes(5);
        expect(game.spawnProjectile.mock.calls.every(([shot]) => shot.isEnemy && shot.damage === 1)).toBe(true);
    });

    it('expands the Tank overload while preserving a telegraphed escape radius', () => {
        const game = makeGame();
        const sprite = makeSprite('boss_corrupted_tank');
        ThreeGame.prototype.fireBiomeBossAttack.call(game, sprite, 'corrupted_tank_overload');
        expect(game.spawnFrostShockwaveEffect).toHaveBeenCalledWith(0, 0, 6.2);
        expect(game.takeDamage).toHaveBeenCalledWith(2, 'corrupted_tank_overload', 0, 0);
        expect(game.applyPlayerSlow).toHaveBeenCalledWith(1.75);
    });

    it('makes the Engineer jam and overclocked arc net mechanically distinct', () => {
        const game = makeGame();
        const sprite = makeSprite('boss_corrupted_engineer');
        ThreeGame.prototype.fireBiomeBossAttack.call(game, sprite, 'corrupted_engineer_jam');
        expect(game.applyPlayerSlow).toHaveBeenLastCalledWith(2.5);
        expect(game.takeDamage).not.toHaveBeenCalled();

        ThreeGame.prototype.fireBiomeBossAttack.call(game, sprite, 'corrupted_engineer_arc_net');
        expect(game.spawnFrostShockwaveEffect).toHaveBeenCalledWith(0, 0, 5.5);
        expect(game.takeDamage).toHaveBeenCalledWith(1, 'corrupted_engineer_arc_net', 0, 0);
        expect(game.applyPlayerSlow).toHaveBeenLastCalledWith(3);
    });
});
