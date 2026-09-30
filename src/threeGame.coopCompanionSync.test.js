import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

beforeEach(() => {
    vi.stubGlobal('window', {
        dispatchEvent: vi.fn(),
        AudioManager: { play: vi.fn() }
    });
});

afterEach(() => {
    vi.unstubAllGlobals();
});

function createMockPeer({ isHost = false } = {}) {
    const emitted = [];
    const game = {
        isMultiplayer: true,
        isMultiplayerHost: isHost,
        multiplayerMode: 'coop',
        netSocket: {
            emit: (event, payload) => emitted.push({ event, payload })
        },
        companions: [],
        scatterSprites: [],
        player: { position: { x: 0, z: 0 } },
        isPlayerDead: false,
        spawnMuzzleFlash: vi.fn(),
        applyPlayerDamageToEnemy: vi.fn(),
        damageSnail: vi.fn(),
        getTerrainHeightAt: vi.fn(() => 0)
    };

    for (const method of [
        'broadcastEnemyStateSnapshot',
        'handleEnemyStateSnapshot',
        'handleRemoteCompanionsSnapshot',
        'updateCompanions'
    ]) {
        game[method] = ThreeGame.prototype[method];
    }

    return { game, emitted };
}

describe('Co-op companion networking and host authority', () => {
    it('host serializes companion transforms and broadcast on enemyState', () => {
        const { game, emitted } = createMockPeer({ isHost: true });
        game.companions = [{
            id: 'wanderer_meridian',
            isWanderer: true,
            wanderer: { id: 'meridian_recruit', name: 'Meridian Scout', actionKey: 'salute', glbUrl: '/test.glb' },
            instance3d: {
                root: {
                    position: { x: 10.5, y: 0, z: 12.0 },
                    rotation: { y: 1.57 }
                },
                currentClipName: 'run'
            },
            isFiring: true,
            targetId: 'crawler_1'
        }];

        const sent = game.broadcastEnemyStateSnapshot(Date.now() + 200);
        expect(sent).toBe(true);
        expect(emitted).toHaveLength(1);
        expect(emitted[0].event).toBe('enemyState');
        expect(emitted[0].payload.companions).toEqual([{
            id: 'wanderer_meridian',
            wandererId: 'meridian_recruit',
            actionKey: 'salute',
            glbUrl: '/test.glb',
            name: 'Meridian Scout',
            isWanderer: true,
            x: 10.5,
            z: 12.0,
            yaw: 1.57,
            anim: 'run',
            isFiring: true,
            targetId: 'crawler_1'
        }]);
    });

    it('guest receives companion snapshot, creates entry, and lerps transforms', () => {
        const { game } = createMockPeer({ isHost: false });
        expect(game.companions).toHaveLength(0);

        game.handleEnemyStateSnapshot({
            enemies: [],
            companions: [{
                id: 'wanderer_meridian',
                wandererId: 'meridian_recruit',
                name: 'Meridian Scout',
                isWanderer: true,
                x: 15.0,
                z: 20.0,
                yaw: 3.14,
                anim: 'idle',
                isFiring: true
            }]
        });

        expect(game.companions).toHaveLength(1);
        const comp = game.companions[0];
        expect(comp.id).toBe('wanderer_meridian');
        expect(comp.netTargetX).toBe(15.0);
        expect(comp.netTargetZ).toBe(20.0);
        expect(game.spawnMuzzleFlash).toHaveBeenCalledWith(15.0, 1.0, 20.0);
        expect(window.AudioManager.play).toHaveBeenCalledWith('turret_fire', expect.any(Object));

        // Mock instance3d for update interpolation test
        comp.instance3d = {
            root: {
                position: { x: 14.0, y: 0, z: 19.0 },
                rotation: { y: 0 }
            },
            update: vi.fn(),
            playAction: vi.fn()
        };

        game.updateCompanions(0.1);
        expect(comp.instance3d.root.position.x).toBeGreaterThan(14.0);
        expect(comp.instance3d.root.position.z).toBeGreaterThan(19.0);
        expect(comp.instance3d.root.rotation.y).toBe(3.14);
        expect(comp.instance3d.update).toHaveBeenCalledWith(0.1);
        // Guest does not run local damage calculation
        expect(game.applyPlayerDamageToEnemy).not.toHaveBeenCalled();
    });

    it('guest does not run A* pathfinding or deal damage autonomously in co-op', () => {
        const { game } = createMockPeer({ isHost: false });
        const enemy = {
            position: { x: 5, z: 5 },
            userData: { type: 'crawler', scatterKey: 'enemy_1', hp: 10 }
        };
        game.scatterSprites = [enemy];
        game.companions = [{
            id: 'wanderer_meridian',
            isWanderer: true,
            isRemote: true,
            netTargetX: 5,
            netTargetZ: 4,
            instance3d: {
                root: { position: { x: 5, y: 0, z: 4 }, rotation: { y: 0 } },
                update: vi.fn()
            }
        }];

        game.updateCompanions(0.1);
        expect(game.applyPlayerDamageToEnemy).not.toHaveBeenCalled();
    });
});
