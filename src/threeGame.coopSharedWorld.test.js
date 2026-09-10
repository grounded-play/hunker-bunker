import { describe, expect, it, vi, afterEach } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

// A live Steam Deck + PC co-op session showed milestone beats were local-only:
// repairing the O2 generator on one client produced no cutscene, no generator
// rise and no boss on the other. Enemies had the mirror problem -- a peer could
// only update enemies it already had, so a host-spawned boss stayed invisible.

afterEach(() => vi.unstubAllGlobals());

function netGame(overrides = {}) {
    const emit = vi.fn();
    const dispatched = [];
    vi.stubGlobal('window', {
        dispatchEvent: (e) => { dispatched.push(e); return true; },
        CustomEvent,
        AudioManager: { play: vi.fn() }
    });
    const game = {
        isMultiplayer: true,
        multiplayerMode: 'coop',
        multiplayerLocalPlayerId: 'me',
        netSocket: { emit },
        ...overrides
    };
    return { game, emit, dispatched };
}

describe('shared world events', () => {
    it('announces a beat to the room', () => {
        const { game, emit } = netGame();
        ThreeGame.prototype.broadcastSharedWorldEvent.call(game, 'o2-generator-upgraded', { level: 1 });
        expect(emit).toHaveBeenCalledWith('worldEvent', {
            event: 'o2-generator-upgraded', detail: { level: 1 }
        });
    });

    it('stays silent in a solo run', () => {
        const { game, emit } = netGame({ isMultiplayer: false });
        expect(ThreeGame.prototype.broadcastSharedWorldEvent.call(game, 'x', {})).toBe(false);
        expect(emit).not.toHaveBeenCalled();
    });

    it('replays a remote beat locally, flagged so it is not re-broadcast', () => {
        const { game, dispatched } = netGame();
        const applied = ThreeGame.prototype.handleSharedWorldEvent.call(game, {
            event: 'o2-generator-upgraded', detail: { level: 1 }, originId: 'them'
        });
        expect(applied).toBe(true);
        expect(dispatched).toHaveLength(1);
        expect(dispatched[0].type).toBe('o2-generator-upgraded');
        expect(dispatched[0].detail).toMatchObject({ level: 1, fromRemote: true });
    });

    // The originator already ran the beat when it fired; replaying its own echo
    // would double the cutscene and stage the boss twice.
    it('ignores its own echo', () => {
        const { game, dispatched } = netGame();
        const applied = ThreeGame.prototype.handleSharedWorldEvent.call(game, {
            event: 'o2-generator-upgraded', detail: { level: 1 }, originId: 'me'
        });
        expect(applied).toBe(false);
        expect(dispatched).toHaveLength(0);
    });

    it('applies a given beat only once', () => {
        const { game, dispatched } = netGame();
        const beat = { event: 'o2-generator-upgraded', detail: { level: 1 }, originId: 'them' };
        ThreeGame.prototype.handleSharedWorldEvent.call(game, beat);
        ThreeGame.prototype.handleSharedWorldEvent.call(game, beat);
        expect(dispatched).toHaveLength(1);
    });
});

describe('remote boss materialization', () => {
    function peer() {
        const group = new THREE.Group();
        return {
            isMultiplayerHost: false,
            multiplayerMode: 'coop',
            chunkSize: 16,
            chunkMeshes: new Map([['0,0', group]]),
            scatterSprites: [],
            scatterMaterials: { boss_cybersnail: {} },
            createScatterInstance: vi.fn((p) => {
                const o = new THREE.Object3D();
                o.position.set(p.x, 0, p.z);
                o.userData = { type: p.type, scatterKey: p.scatterKey, isBoss: p.isBoss, hp: 5, maxHp: 5 };
                return o;
            }),
            materializeRemoteBoss: ThreeGame.prototype.materializeRemoteBoss,
            damageSnail: vi.fn(),
            group
        };
    }

    // The regression: the boss existed only on the host.
    it('creates a host-owned boss the peer has never seen', () => {
        const game = peer();
        const applied = ThreeGame.prototype.handleEnemyStateSnapshot.call(game, {
            enemies: [{ scatterKey: 'milestone:boss_cybersnail:1', enemyType: 'boss_cybersnail', x: 4, z: 5, hp: 5, isBoss: true }]
        });
        expect(applied).toBe(true);
        expect(game.scatterSprites).toHaveLength(1);
        expect(game.scatterSprites[0].userData.isRemoteReplica).toBe(true);
        expect(game.scatterSprites[0].position.x).toBe(4);
    });

    it('does not duplicate a boss it already has', () => {
        const game = peer();
        const snap = { enemies: [{ scatterKey: 'b1', enemyType: 'boss_cybersnail', x: 4, z: 5, hp: 5, isBoss: true }] };
        ThreeGame.prototype.handleEnemyStateSnapshot.call(game, snap);
        ThreeGame.prototype.handleEnemyStateSnapshot.call(game, snap);
        expect(game.scatterSprites).toHaveLength(1);
    });

    // Ordinary enemies stay client-local; spawning every snail the host sees
    // would double each client's population.
    it('does not materialize ordinary enemies', () => {
        const game = peer();
        ThreeGame.prototype.handleEnemyStateSnapshot.call(game, {
            enemies: [{ scatterKey: 's1', enemyType: 'cybersnail', x: 4, z: 5, hp: 3, isBoss: false }]
        });
        expect(game.scatterSprites).toHaveLength(0);
    });

    it('does not resurrect a boss that already died', () => {
        const game = peer();
        ThreeGame.prototype.handleEnemyStateSnapshot.call(game, {
            enemies: [{ scatterKey: 'b1', enemyType: 'boss_cybersnail', x: 4, z: 5, hp: 0, isBoss: true, burstTriggered: true }]
        });
        expect(game.scatterSprites).toHaveLength(0);
    });

    it('waits for the chunk instead of dropping the boss on the floor', () => {
        const game = peer();
        game.chunkMeshes = new Map(); // chunk not mounted yet
        ThreeGame.prototype.handleEnemyStateSnapshot.call(game, {
            enemies: [{ scatterKey: 'b1', enemyType: 'boss_cybersnail', x: 4, z: 5, hp: 5, isBoss: true }]
        });
        expect(game.scatterSprites).toHaveLength(0);
    });
});

describe('friendly fire shoves instead of hurting', () => {
    function shooter(remoteAt = [2, 0, 0]) {
        const mesh = new THREE.Object3D();
        mesh.position.set(...remoteAt);
        const emit = vi.fn();
        const game = {
            isMultiplayer: true, multiplayerMode: 'coop', netSocket: { emit },
            remotePlayers: new Map([['mate', { mesh }]]),
            checkProjectileSquadmateHit: ThreeGame.prototype.checkProjectileSquadmateHit,
            nudgeSquadmate: ThreeGame.prototype.nudgeSquadmate
        };
        return { game, emit };
    }
    const round = (x, z, vx = 10, vz = 0) => {
        const mesh = new THREE.Object3D(); mesh.position.set(x, 0, z);
        return { mesh, vx, vz, isEnemy: false };
    };

    it('detects a round overlapping a squadmate', () => {
        const { game } = shooter([2, 0, 0]);
        expect(ThreeGame.prototype.checkProjectileSquadmateHit.call(game, round(2.1, 0))?.id).toBe('mate');
        expect(ThreeGame.prototype.checkProjectileSquadmateHit.call(game, round(9, 0))).toBeNull();
    });

    it('sends a shove along the round travel direction, not damage', () => {
        const { game, emit } = shooter();
        const projectile = round(2.1, 0, 0, -8); // travelling -Z
        ThreeGame.prototype.nudgeSquadmate.call(game, { id: 'mate' }, projectile);

        expect(emit).toHaveBeenCalledOnce();
        const [channel, payload] = emit.mock.calls[0];
        expect(channel).toBe('playerNudge');
        expect(payload.targetId).toBe('mate');
        expect(payload.dirZ).toBeCloseTo(-1, 5);
        expect(payload.dirX).toBeCloseTo(0, 5);
    });

    it('leaves squadmates alone in PvP, where damage is the point', () => {
        const { game } = shooter();
        game.multiplayerMode = 'pvp';
        expect(ThreeGame.prototype.checkProjectileSquadmateHit.call(game, round(2.1, 0))).toBeNull();
    });

    it('pushes the local player when a shove arrives', () => {
        const player = new THREE.Object3D();
        const game = {
            multiplayerLocalPlayerId: 'me', multiplayerMode: 'coop',
            player, isPlayerDead: false,
            canOccupyPosition: () => true,
            pushPlayerAlong: ThreeGame.prototype.pushPlayerAlong
        };
        vi.stubGlobal('window', { AudioManager: { play: vi.fn() } });
        const applied = ThreeGame.prototype.handlePlayerNudged.call(game, {
            targetId: 'me', dirX: 1, dirZ: 0, force: 1
        });
        expect(applied).toBe(true);
        expect(player.position.x).toBeGreaterThan(0);
    });

    it('ignores a shove aimed at somebody else', () => {
        const player = new THREE.Object3D();
        const game = { multiplayerLocalPlayerId: 'me', player, isPlayerDead: false, multiplayerMode: 'coop' };
        expect(ThreeGame.prototype.handlePlayerNudged.call(game, { targetId: 'other', dirX: 1, dirZ: 0 })).toBe(false);
        expect(player.position.x).toBe(0);
    });

    it('does not push through a wall', () => {
        const player = new THREE.Object3D();
        const game = { player, canOccupyPosition: () => false };
        expect(ThreeGame.prototype.pushPlayerAlong.call(game, 1, 0, 0.55)).toBe(false);
        expect(player.position.x).toBe(0);
    });
});
