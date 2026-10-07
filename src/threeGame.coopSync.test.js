import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

// Session 2026-10-06 co-op (Windows host + Deck guest, 2.4.15-beta): "I want
// the players and their counterparts seeing the same thing."

describe('a squadmate faces where they face', () => {
    const remoteWithOverlay = (yaw) => {
        const mesh = new THREE.Object3D();
        return {
            mesh,
            targetPos: new THREE.Vector3(0, 0, 0),
            targetYaw: yaw,
            currentYaw: yaw,
            vx: 0,
            vz: 0,
            animState: 'idle',
            hp: 4,
            maxHp: 4,
            opClass: 'SCOUT',
            lastAnimationColumn: 0,
            overlay: { update: vi.fn() }
        };
    };
    const tick = (remote) => {
        const game = { isMultiplayer: true, remotePlayers: new Map([['p2', remote]]) };
        ThreeGame.prototype.updateMultiplayer.call(game, 1 / 60, 1000);
    };

    // The chassis turns itself toward travel/aim in world space, so rotating
    // its parent to the yaw as well turned a squadmate by their facing twice.
    it('does not rotate the parent of a 3D chassis', () => {
        const remote = remoteWithOverlay(Math.PI / 2);
        tick(remote);
        expect(remote.mesh.rotation.y).toBe(0);
    });

    it('aims a standing squadmate where they aim, as the local player does', () => {
        const remote = remoteWithOverlay(Math.PI / 2); // facing +X
        tick(remote);
        const state = remote.overlay.update.mock.calls[0][1];
        expect(state.hasAim).toBe(true);
        expect(state.aimX).toBeCloseTo(1, 5);
        expect(state.aimZ).toBeCloseTo(0, 5);
        expect(state.isMoving).toBe(false);
    });
});

describe('host enemies a guest does not have', () => {
    const makeGuest = () => {
        const group = new THREE.Group();
        const game = {
            isMultiplayerHost: false,
            multiplayerMode: 'coop',
            chunkSize: 32,
            chunkMeshes: new Map([['0,0', group]]),
            scatterSprites: [],
            scatterMaterials: { cybersnail: new THREE.SpriteMaterial() },
            createScatterInstance: vi.fn((placement) => {
                const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
                sprite.position.set(placement.x, 0, placement.z);
                sprite.userData = { type: placement.type, scatterKey: placement.scatterKey, isBoss: placement.isBoss, hp: 3, maxHp: 3 };
                return sprite;
            })
        };
        for (const name of ['handleEnemyStateSnapshot', 'materializeRemoteEnemy', 'materializeRemoteBoss', 'pruneRemoteReplicas']) {
            if (ThreeGame.prototype[name]) game[name] = ThreeGame.prototype[name];
        }
        return { game, group };
    };

    // The host chased the guest with a snail the guest never had: on the host
    // it sat on the guest's avatar, on the guest it did not exist.
    it('creates any host enemy the guest is missing, not only bosses', () => {
        const { game, group } = makeGuest();
        game.handleEnemyStateSnapshot({ enemies: [{ scatterKey: 'spawned:snail:1', enemyType: 'cybersnail', x: 5, z: 6, hp: 3, isBoss: false }] });
        const replica = game.scatterSprites.find((s) => s.userData.scatterKey === 'spawned:snail:1');
        expect(replica).toBeTruthy();
        expect(replica.userData.isRemoteReplica).toBe(true);
        expect(replica.parent).toBe(group);
        expect(game.createScatterInstance.mock.calls[0][0]).toMatchObject({ type: 'cybersnail', isBoss: false });
    });

    it('does not create dead enemies or ones in a chunk the guest has not loaded', () => {
        const { game } = makeGuest();
        game.handleEnemyStateSnapshot({ enemies: [
            { scatterKey: 'a', enemyType: 'cybersnail', x: 5, z: 6, hp: 0, burstTriggered: true },
            { scatterKey: 'b', enemyType: 'cybersnail', x: 500, z: 600, hp: 3 }
        ] });
        expect(game.scatterSprites).toHaveLength(0);
    });

    it('creates at most a few per snapshot so a burst cannot hitch the guest', () => {
        const { game } = makeGuest();
        const enemies = Array.from({ length: 20 }, (_, i) => ({ scatterKey: `s${i}`, enemyType: 'cybersnail', x: 1 + i, z: 1, hp: 3 }));
        game.handleEnemyStateSnapshot({ enemies });
        expect(game.scatterSprites.length).toBeLessThanOrEqual(4);
        game.handleEnemyStateSnapshot({ enemies });
        expect(game.scatterSprites.length).toBeLessThanOrEqual(8);
    });

    it('removes a replica the host stopped reporting, but never a deterministic enemy', () => {
        const { game, group } = makeGuest();
        const local = new THREE.Sprite();
        local.userData = { type: 'cybersnail', scatterKey: 'chunk:0,0:snail:7' };
        group.add(local);
        game.scatterSprites.push(local);
        game.handleEnemyStateSnapshot({ enemies: [{ scatterKey: 'spawned:x', enemyType: 'cybersnail', x: 2, z: 2, hp: 3 }] });
        const replica = game.scatterSprites.find((s) => s.userData.scatterKey === 'spawned:x');
        replica.userData.lastNetUpdate = Date.now() - 5000;
        game.handleEnemyStateSnapshot({ enemies: [{ scatterKey: 'chunk:0,0:snail:7', enemyType: 'cybersnail', x: 3, z: 3, hp: 3 }] });
        expect(game.scatterSprites).not.toContain(replica);
        expect(replica.parent).toBeNull();
        expect(game.scatterSprites).toContain(local);
    });
});

// Owner, 2026-10-07: "if one player unlocks O2 both get it, if one player
// gets coins both get it in PvE / co-op. PvP it's just they don't share."
describe('a co-op squad shares loot and ship progress', () => {
    const makePeer = ({ mode = 'coop' } = {}) => {
        const events = [];
        const bank = { applySquadProgress: vi.fn(() => true), getState: () => ({ o2GeneratorLevel: 2 }) };
        const game = {
            isMultiplayer: true,
            multiplayerMode: mode,
            multiplayerLocalPlayerId: 'me',
            pickupMeshes: [],
            bank,
            showBunkerLine: vi.fn(),
            handleSharedWorldEvent: ThreeGame.prototype.handleSharedWorldEvent
        };
        const originalWindow = globalThis.window;
        globalThis.window = { dispatchEvent: (event) => events.push(event) };
        return { game, events, bank, restore: () => { globalThis.window = originalWindow; } };
    };

    it("gives you a squadmate's pickup, but not your own echo", () => {
        const { game, events, restore } = makePeer();
        try {
            game.handleSharedWorldEvent({ event: 'pickup-collected', originId: 'them', detail: { pickupId: 'p1', x: 1, z: 1, type: 'coin', amount: 2 } });
            game.handleSharedWorldEvent({ event: 'pickup-collected', originId: 'me', detail: { pickupId: 'p2', x: 2, z: 2, type: 'coin', amount: 1 } });
            const shared = events.filter((event) => event.type === 'pickup-collected');
            expect(shared).toHaveLength(1);
            expect(shared[0].detail).toMatchObject({ type: 'coin', amount: 2, fromRemote: true });
        } finally { restore(); }
    });

    it('takes squad progress in co-op, not in PvP', () => {
        const coop = makePeer();
        try {
            coop.game.handleSharedWorldEvent({ event: 'squad-progress', originId: 'them', detail: { progress: { o2GeneratorLevel: 2 } } });
            expect(coop.bank.applySquadProgress).toHaveBeenCalledWith({ o2GeneratorLevel: 2 });
        } finally { coop.restore(); }
        const pvp = makePeer({ mode: 'pvp' });
        try {
            pvp.game.handleSharedWorldEvent({ event: 'squad-progress', originId: 'them', detail: { progress: { o2GeneratorLevel: 2 } } });
            pvp.game.handleSharedWorldEvent({ event: 'pickup-collected', originId: 'them', detail: { pickupId: 'p3', x: 1, z: 1, type: 'coin' } });
            expect(pvp.bank.applySquadProgress).not.toHaveBeenCalled();
            expect(pvp.events.filter((event) => event.type === 'pickup-collected')).toHaveLength(0);
        } finally { pvp.restore(); }
    });
});
