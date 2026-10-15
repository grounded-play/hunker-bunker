import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';
import { getFieldWeaponProfile } from './fieldWeapon.js';
import { createIceBarrier, ICE_BARRIER_STATES } from './iceGateSystem.js';

describe('live flamethrower runtime', () => {
    beforeEach(() => {
        const browser = new EventTarget();
        browser.AudioManager = { play: vi.fn() };
        vi.stubGlobal('window', browser);
    });

    it('routes M-70 firing through one swept volume instead of projectile meshes', () => {
        const game = {
            playerType: 'ENGINEER',
            player: { position: { x: 0, z: 0 } },
            fieldWeapon: getFieldWeaponProfile('flamethrower', true),
            weaponUpgradeBonuses: null,
            perfectReloadBuffTimer: 0,
            runOverclocks: [],
            runRelics: [],
            playerVitals: { o2: 100 },
            recoilBloom: 0,
            getTerrainHeightAt: () => 0,
            triggerCameraShake: vi.fn(),
            spawnSweptFlame: vi.fn(),
            spawnProjectile: vi.fn()
        };
        ThreeGame.prototype.spawnPlayerShot.call(game, 0, 1);
        expect(game.spawnSweptFlame).toHaveBeenCalledWith(0, 1, 1);
        expect(game.spawnProjectile).not.toHaveBeenCalled();
    });

    it('preserves authored fire-source and ice-gate identities through chunk placement', () => {
        const size = 21;
        const grid = Array.from({ length: size }, () => Array(size).fill('X'));
        grid[8][10] = '.';
        grid[6][7] = '.';
        const game = {
            chunkSize: size,
            runEntropy: 0,
            hashTile: () => 1,
            createSeededRandom: () => () => 0.5,
            wfcMetadataCache: new Map([['0,0', {
                roomInstances: [{
                    id: 'authored-room:fire_gate_cache:0,0',
                    buildId: 'fire_gate_cache',
                    doors: [],
                    populationPlan: { placements: [
                        { id: 'source-placement', kind: 'interaction', anchorId: 'fire_weapon_source', x: 10, y: 8, type: 'weapon_flamethrower_case', blocking: false },
                        { id: 'gate-placement', kind: 'interaction', anchorId: 'fire_gate', x: 7, y: 6, type: 'barrier_ice_intact', blocking: true }
                    ] }
                }]
            }]]),
            getRoomTypeGrid: () => Array.from({ length: size }, () => Array(size).fill(null)),
            getSpawnTile: () => ({ x: 999, y: 999 }),
            getBiomeKeyForWorldPosition: () => 'cryo'
        };
        const placements = ThreeGame.prototype.createChunkSetPiecePlacements.call(game, 0, 0, grid);
        expect(placements).toEqual(expect.arrayContaining([
            expect.objectContaining({ anchorId: 'fire_weapon_source', fireGateSourceId: 'authored-room:fire_gate_cache:0,0:fire-weapon-source' }),
            expect.objectContaining({ anchorId: 'fire_gate', iceBarrierId: 'authored-room:fire_gate_cache:0,0:fire-gate', isSolidProp: true })
        ]));
    });

    it('damages and ignites enemies, heats marked ice, and opens collision at threshold', () => {
        const scene = new THREE.Group();
        const enemy = new THREE.Object3D();
        enemy.position.set(0, 0, 2);
        enemy.userData = { type: 'snail', hp: 10, collisionRadius: 0.4 };
        scene.add(enemy);
        const ice = new THREE.Object3D();
        ice.position.set(0, 0, 4);
        ice.userData = {
            isIceBarrier: true,
            isSolidProp: true,
            collisionRadius: 1,
            iceBarrier: createIceBarrier({ id: 'test-gate', worldPosition: { x: 0, z: 4 } })
        };
        scene.add(ice);
        const game = {
            player: { position: { x: 0, z: 0 } },
            fieldWeapon: getFieldWeaponProfile('flamethrower', true),
            scatterSprites: [enemy, ice],
            iceBarrierAnchors: new Set([ice]),
            isEnemyType: (type) => type === 'snail',
            isFlameHitOccluded: () => false,
            applyPlayerDamageToEnemy: vi.fn(),
            spawnPhysicalBurst: vi.fn(),
            spawnMuzzleFlash: vi.fn(),
            syncIceBarrierVisual: vi.fn(),
            showBunkerLine: vi.fn()
        };

        for (let shot = 0; shot < 6; shot += 1) {
            ThreeGame.prototype.spawnSweptFlame.call(game, 0, 1, 2);
        }

        expect(game.applyPlayerDamageToEnemy).toHaveBeenCalledWith(enemy, 2, { element: 'fire' });
        expect(enemy.userData.statusEffects).toMatchObject({ isBurning: true, burnedBy: 'flamethrower' });
        expect(ice.userData.iceBarrier.state).toBe(ICE_BARRIER_STATES.MELTED);
        expect(ice.userData.isSolidProp).toBe(false);
        expect(game.showBunkerLine).toHaveBeenCalledOnce();
    });
});
