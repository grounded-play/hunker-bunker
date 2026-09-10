import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

let originalWindow;
beforeEach(() => {
    originalWindow = globalThis.window;
    globalThis.window = {
        dispatchEvent: vi.fn(),
        AudioManager: {
            play: vi.fn(),
            playMetalStress: vi.fn()
        },
        CustomEvent: globalThis.CustomEvent ?? class {
            constructor(type, init) {
                this.type = type;
                this.detail = init?.detail;
            }
        }
    };
});

afterEach(() => {
    globalThis.window = originalWindow;
});

function buildFakeCombatRig() {
    const scene = new THREE.Scene();
    const activeProjectiles = [];
    const transientEffects = [];
    const killedEnemyScatterKeys = new Set();
    const fake = {
        scene,
        playerType: 'soldier',
        activeProjectiles,
        transientEffects,
        killedEnemyScatterKeys,
        snailsKilledThisRun: 0,
        visibleChunkRadius: 1,
        hitstopTimer: 0,
        scatterMaterials: {},
        isEnemyType: ThreeGame.prototype.isEnemyType,
        isCrawler: ThreeGame.prototype.isCrawler,
        isSentinel: ThreeGame.prototype.isSentinel,
        isAct2Active: () => false,
        spawnProjectile: ThreeGame.prototype.spawnProjectile,
        destroyProjectile: ThreeGame.prototype.destroyProjectile,
        spawnPhysicalBurst: ThreeGame.prototype.spawnPhysicalBurst,
        spawnEnemyDeathBurst: ThreeGame.prototype.spawnEnemyDeathBurst,
        damageSnail: ThreeGame.prototype.damageSnail,
        spawnTextureBurstEffect: vi.fn(),
        spawnSentinelDrops: vi.fn(),
        spawnCrawlerDrops: vi.fn(),
        spawnSnailDrops: vi.fn(),
        spawnGearPoofEffect: vi.fn(),
        spawnEnemyCorpse: vi.fn(),
        syncSurvivorContract: vi.fn(),
        getTerrainHeightAt: () => 0,
        emitO2State: vi.fn(),
        emitWeaponClipState: vi.fn(),
        spawnDamagePip: vi.fn()
    };
    return fake;
}

describe('Combat VFX Upgrade and Placeholder Removal', () => {
    describe('Directional Ballistic Projectiles', () => {
        it('spawns oriented ballistic slug along velocity heading with core and streak ribbon', () => {
            const game = buildFakeCombatRig();

            // Fire projectile moving towards (+X, +Z) -> heading is -Math.atan2(10, 10) = -PI/4
            game.spawnProjectile({
                x: 0,
                z: 0,
                vx: 10,
                vz: 10,
                radius: 0.15
            });

            expect(game.activeProjectiles.length).toBe(1);
            const proj = game.activeProjectiles[0];
            const group = proj.mesh;

            expect(group.rotation.y).toBeCloseTo(-Math.atan2(10, 10), 3);

            // Group must contain core (26), sheath (25), glow (24), and streak ribbon (23)
            const renderOrders = group.children.map((c) => c.renderOrder);
            expect(renderOrders).toContain(26);
            expect(renderOrders).toContain(25);
            expect(renderOrders).toContain(24);
            expect(renderOrders).toContain(23);

            // Sheath has additive blending
            const sheath = group.children.find((c) => c.renderOrder === 25);
            expect(sheath.material.blending).toBe(THREE.AdditiveBlending);

            // Ribbon is trailing along local negative X
            const ribbon = group.children.find((c) => c.renderOrder === 23);
            expect(ribbon.geometry.type).toBe('PlaneGeometry');
            expect(ribbon.position.x).toBeLessThan(0);
        });

        it('supports emerald void tracer mutator override', () => {
            const game = buildFakeCombatRig();
            globalThis.window.loadout = { state: { tracerFxId: '4152' } };

            game.spawnProjectile({
                x: 0,
                z: 0,
                vx: 15,
                vz: 0,
                radius: 0.12
            });

            const proj = game.activeProjectiles[0];
            expect(proj.tracerMaterial).toBeDefined();
            expect(proj.tracerMaterial.type).toBe('ShaderMaterial');

            delete globalThis.window.loadout;
        });
    });

    describe('Biomechanical Enemy Death Bursts', () => {
        it('spawns debris shards, ground shockwave ring, and sets hitstop', () => {
            const game = buildFakeCombatRig();

            game.spawnEnemyDeathBurst(10, 20, 'cryosnail', false);

            // Physical burst spawned into scene
            expect(game.scene.children.length).toBeGreaterThanOrEqual(2);

            // Expanding shockwave ring in transientEffects
            const ringEffect = game.transientEffects.find(
                (e) => e.mesh && e.mesh.geometry?.type === 'RingGeometry'
            );
            expect(ringEffect).toBeDefined();
            expect(ringEffect.duration).toBe(0.28);
            expect(ringEffect.mesh.material.blending).toBe(THREE.AdditiveBlending);

            // Hitstop applied
            expect(game.hitstopTimer).toBe(45);
        });

        it('scales debris count and hitstop for boss death', () => {
            const game = buildFakeCombatRig();

            game.spawnEnemyDeathBurst(5, 5, 'bunker_junk_boss', true);

            // Boss hitstop is 90ms
            expect(game.hitstopTimer).toBe(90);

            const ringEffect = game.transientEffects.find(
                (e) => e.mesh && e.mesh.geometry?.type === 'RingGeometry'
            );
            expect(ringEffect).toBeDefined();
        });

        it('triggers death burst on lethal damage in damageSnail', () => {
            const game = buildFakeCombatRig();
            const spyBurst = vi.spyOn(game, 'spawnEnemyDeathBurst');

            const enemy = new THREE.Sprite();
            enemy.position.set(12, 0, 14);
            enemy.userData = {
                type: 'sporesnail',
                hp: 10,
                maxHp: 10,
                scatterKey: 'test_enemy_1'
            };

            game.damageSnail(enemy, 15);

            expect(enemy.userData.hp).toBe(0);
            expect(enemy.userData.burstTriggered).toBe(true);
            expect(spyBurst).toHaveBeenCalledWith(12, 14, 'sporesnail', false);
            expect(game.killedEnemyScatterKeys.has('test_enemy_1')).toBe(true);
        });
    });
});
