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

// Sprint 50 carry-over: the host's enemy picks the nearest player, but the
// guest's copy only slid along. A snail the host sent after the guest sat on
// them and never bit (the host leaves a squadmate's hearts to their client),
// and nothing told the guest who it was chasing.
describe('a host enemy chases the same player on both screens', () => {
    const enemy = (userData = {}) => {
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
        sprite.userData = { type: 'cybersnail', scatterKey: 'chunk:0,0:snail:1', hp: 3, baseScaleX: 1, baseScaleY: 1, ...userData };
        return sprite;
    };

    it('sends who each enemy is after with the snapshot', () => {
        const hunter = enemy({ aggroTargetId: 'host-socket', aggroMode: 'hunt' });
        const wanderer = enemy({ scatterKey: 'chunk:0,0:snail:2' });
        const emit = vi.fn();
        const game = {
            netSocket: { emit },
            isMultiplayerHost: true,
            multiplayerMode: 'coop',
            scatterSprites: [hunter, wanderer],
            companions: [],
            isEnemyType: () => true
        };
        ThreeGame.prototype.broadcastEnemyStateSnapshot.call(game, 10_000);
        const [, payload] = emit.mock.calls[0];
        expect(payload.enemies[0]).toMatchObject({ targetId: 'host-socket', mode: 'hunt' });
        expect(payload.enemies[1]).toMatchObject({ targetId: null, mode: null });
    });

    it("records the host's target on the guest's copy", () => {
        const sprite = enemy();
        const game = { isMultiplayerHost: false, multiplayerMode: 'coop', scatterSprites: [sprite] };
        ThreeGame.prototype.handleEnemyStateSnapshot.call(game, { enemies: [{ scatterKey: sprite.userData.scatterKey, x: 0, z: 0, hp: 3, targetId: 'guest-socket', mode: 'hunt' }] });
        expect(sprite.userData).toMatchObject({ netAggroTargetId: 'guest-socket', netAggroMode: 'hunt' });
    });

    const guest = (sprite) => ({
        isMultiplayer: true,
        isMultiplayerHost: false,
        multiplayerLocalPlayerId: 'guest-socket',
        player: { position: new THREE.Vector3(0.5, 0, 0) },
        isPlayerDead: false,
        takeDamage: vi.fn(() => true),
        applySnailContactKnockback: vi.fn(),
        applyPlayerSlow: vi.fn(),
        getSnailContactReach: ThreeGame.prototype.getSnailContactReach,
        faceSpriteFromDir: ThreeGame.prototype.faceSpriteFromDir,
        updateSheetSpriteFrame: vi.fn(),
        sprite
    });

    // A relay that routes enemyContactHit (server/relay.js RELAY_FEATURES).
    const routedGuest = (sprite) => ({ ...guest(sprite), relayFeatures: new Set(['enemyContactHit']) });

    it('does not infer a bite from an interpolated guest replica', () => {
        const sprite = enemy({ netTargetX: 0, netTargetZ: 0, netAggroTargetId: 'guest-socket', netAggroMode: 'hunt' });
        const game = routedGuest(sprite);
        ThreeGame.prototype.updateRemoteEnemyReplica.call(game, sprite, 1 / 60);
        ThreeGame.prototype.updateRemoteEnemyReplica.call(game, sprite, 1 / 60);
        expect(game.takeDamage).not.toHaveBeenCalled();
        expect(game.applySnailContactKnockback).not.toHaveBeenCalled();
    });

    // QA 2026-10-28: the deployed relay predated the enemyContactHit route and
    // dropped every host bite, so the guest took no damage at all.
    it('bites the guest from its replica when the relay cannot route host bites', () => {
        const sprite = enemy({ netTargetX: 0, netTargetZ: 0, netAggroTargetId: 'guest-socket', netAggroMode: 'hunt' });
        const game = { ...guest(sprite), relayFeatures: new Set() };
        ThreeGame.prototype.updateRemoteEnemyReplica.call(game, sprite, 1 / 60);
        expect(game.takeDamage).toHaveBeenCalledTimes(1);
        expect(game.applySnailContactKnockback).toHaveBeenCalledTimes(1);
    });

    it('sends no host bite the relay would drop', () => {
        const emit = vi.fn();
        const host = { isMultiplayerHost: true, netSocket: { emit }, relayFeatures: new Set() };
        const sent = ThreeGame.prototype.reportEnemyContactHit.call(host, { id: 'guest-socket', x: 0, z: 0 }, enemy(), 1);
        expect(sent).toBe(false);
        expect(emit).not.toHaveBeenCalled();
    });

    it('leaves the guest alone while it chases the host', () => {
        const sprite = enemy({ netTargetX: 0, netTargetZ: 0, netAggroTargetId: 'host-socket', netAggroMode: 'hunt' });
        const game = guest(sprite);
        ThreeGame.prototype.updateRemoteEnemyReplica.call(game, sprite, 1 / 60);
        expect(game.takeDamage).not.toHaveBeenCalled();
    });

    it('spares a guest the host would spare: hive kin, or a snail that would talk', () => {
        const sprite = enemy({ netTargetX: 0, netTargetZ: 0, netAggroTargetId: 'guest-socket', netAggroMode: 'hunt' });
        const kin = { ...guest(sprite), isHiveKinPassive: () => true };
        ThreeGame.prototype.updateRemoteEnemyReplica.call(kin, sprite, 1 / 60);
        const act2 = { ...guest(sprite), isAct2Active: () => true };
        ThreeGame.prototype.updateRemoteEnemyReplica.call(act2, sprite, 1 / 60);
        expect(kin.takeDamage).not.toHaveBeenCalled();
        expect(act2.takeDamage).not.toHaveBeenCalled();
    });

    it("does not infer boss body damage from the guest's render replica", () => {
        const sprite = enemy({ type: 'boss_cybersnail', isBoss: true, netTargetX: 0, netTargetZ: 0, netAggroTargetId: 'ship', netAggroMode: 'hunt' });
        const game = routedGuest(sprite);
        ThreeGame.prototype.updateRemoteEnemyReplica.call(game, sprite, 1 / 60);
        expect(game.takeDamage).not.toHaveBeenCalled();
    });

    it('turns to face the player it is hunting while it stands still', () => {
        const sprite = enemy({ netTargetX: 3, netTargetZ: 0, netAggroTargetId: 'guest-socket', netAggroMode: 'hunt' });
        sprite.position.set(3, 0, 0);
        const game = guest(sprite);
        game.player.position.set(-2, 0, 0);
        ThreeGame.prototype.updateRemoteEnemyReplica.call(game, sprite, 1 / 60);
        expect(sprite.userData.facingSign).toBe(-1);
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
