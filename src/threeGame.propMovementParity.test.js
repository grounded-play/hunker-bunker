import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

describe('ThreeGame Prop Movement and PvE/PvP Parity', () => {
    function makeProp({ key, x = 0, y = 0, z = 0, rotY = 0 }) {
        const collider = {
            position: { x, y, z, set(nx, ny, nz) { this.x = nx; this.y = ny; this.z = nz; } },
            rotation: { x: 0, y: rotY, z: 0 },
            userData: {
                isScatter: true,
                isSolidProp: true,
                scatterKey: key,
                dressingStableId: key
            }
        };
        const root = {
            position: { x, y, z, set(nx, ny, nz) { this.x = nx; this.y = ny; this.z = nz; } },
            rotation: { x: 0, y: rotY, z: 0 }
        };
        collider.userData.root = root;
        return { collider, root };
    }

    function createFakeGame(mode = 'pve') {
        const game = {
            isMultiplayer: true,
            isMultiplayerHost: true,
            multiplayerMode: mode,
            isHost: true,
            scatterSprites: [],
            propTransformStates: new Map(),
            propInteractionStates: new Map(),
            _remotePropMoveSequences: new Map(),
            _propMoveSequence: 0,
            _appliedWorldEvents: new Set(),
            netSocket: { emit: vi.fn() },
            isEnemyType: (type) => Boolean(type),
            broadcastSharedWorldEvent: ThreeGame.prototype.broadcastSharedWorldEvent,
            handleSharedWorldEvent: ThreeGame.prototype.handleSharedWorldEvent,
            moveProp: ThreeGame.prototype.moveProp,
            applyRemotePropMoved: ThreeGame.prototype.applyRemotePropMoved,
            applyRemotePropInteracted: ThreeGame.prototype.applyRemotePropInteracted,
            findPropSprite: ThreeGame.prototype.findPropSprite,
            broadcastEnemyStateSnapshot: ThreeGame.prototype.broadcastEnemyStateSnapshot
        };
        return game;
    }

    it('moveProp updates collider and root positions, records transform, and broadcasts prop-moved', () => {
        const game = createFakeGame('pve');
        const { collider, root } = makeProp({ key: 'bunker_desk_1', x: 5, z: 10 });
        game.scatterSprites.push(collider);

        const moved = game.moveProp(collider, { x: 8, y: 0, z: 12, rotY: 1.57 });
        expect(moved).toBe(true);
        expect(collider.position.x).toBe(8);
        expect(collider.position.z).toBe(12);
        expect(collider.rotation.y).toBe(1.57);
        expect(root.position.x).toBe(8);
        expect(root.position.z).toBe(12);
        expect(root.rotation.y).toBe(1.57);

        expect(game.propTransformStates.get('bunker_desk_1')).toEqual({
            x: 8,
            y: 0,
            z: 12,
            rotY: 1.57,
            seq: 1
        });

        expect(game.netSocket.emit).toHaveBeenCalledWith('worldEvent', {
            event: 'prop-moved',
            detail: {
                key: 'bunker_desk_1',
                scatterKey: 'bunker_desk_1',
                id: 'bunker_desk_1',
                x: 8,
                y: 0,
                z: 12,
                rotY: 1.57,
                seq: 1,
                sequence: 1
            }
        });
    });

    it('moveProp can look up a prop by scatterKey string', () => {
        const game = createFakeGame('pvp');
        const { collider } = makeProp({ key: 'pvp_chair_99', x: 1, z: 2 });
        game.scatterSprites.push(collider);

        const moved = game.moveProp('pvp_chair_99', { x: 3, z: 4, emit: false });
        expect(moved).toBe(true);
        expect(collider.position.x).toBe(3);
        expect(collider.position.z).toBe(4);
        expect(game.netSocket.emit).not.toHaveBeenCalled();
    });

    it('applyRemotePropMoved moves the local prop and rejects out-of-order packets', () => {
        const game = createFakeGame('pvp');
        const { collider, root } = makeProp({ key: 'ammo_crate_4', x: 0, z: 0 });
        game.scatterSprites.push(collider);

        // Packet 2 arrives first
        const res2 = game.applyRemotePropMoved({ key: 'ammo_crate_4', x: 10, z: 15, rotY: 0.5, seq: 2 });
        expect(res2).toBe(true);
        expect(collider.position.x).toBe(10);
        expect(collider.position.z).toBe(15);
        expect(root.position.x).toBe(10);
        expect(root.position.z).toBe(15);

        // Stale Packet 1 arrives later -> must be rejected
        const res1 = game.applyRemotePropMoved({ key: 'ammo_crate_4', x: 2, z: 3, rotY: 0, seq: 1 });
        expect(res1).toBe(false);
        // Position remains at packet 2
        expect(collider.position.x).toBe(10);
        expect(collider.position.z).toBe(15);

        // Packet 3 arrives -> accepted
        const res3 = game.applyRemotePropMoved({ key: 'ammo_crate_4', x: 20, z: 25, rotY: 1.2, seq: 3 });
        expect(res3).toBe(true);
        expect(collider.position.x).toBe(20);
        expect(collider.position.z).toBe(25);
    });

    it('applyRemotePropMoved caches transform even before prop is mounted in chunk', () => {
        const game = createFakeGame('pve');
        // Prop is not yet mounted in scatterSprites
        const res = game.applyRemotePropMoved({ key: 'unmounted_pod_7', x: 42, z: 84, rotY: 3.14, seq: 1 });
        expect(res).toBe(true);
        expect(game.propTransformStates.get('unmounted_pod_7')).toEqual({
            x: 42,
            y: undefined,
            z: 84,
            rotY: 3.14,
            seq: 1
        });
    });

    it('applyRemotePropInteracted sets interaction state and updates transform if included', () => {
        const game = createFakeGame('pvp');
        const { collider } = makeProp({ key: 'door_terminal_1', x: 10, z: 20 });
        game.scatterSprites.push(collider);

        const res = game.applyRemotePropInteracted({
            key: 'door_terminal_1',
            state: 'opened',
            fxMode: 'active',
            solid: false,
            x: 10.5,
            z: 20.2,
            rotY: 1.57
        });

        expect(res).toBe(true);
        expect(game.propInteractionStates.get('door_terminal_1')).toEqual({
            state: 'opened',
            fxMode: 'active',
            solid: false,
            x: 10.5,
            z: 20.2,
            rotY: 1.57
        });
        expect(collider.position.x).toBe(10.5);
        expect(collider.position.z).toBe(20.2);
    });

    it('handleSharedWorldEvent routes prop-moved and prop-interacted in both PvE and PvP', () => {
        const pveGame = createFakeGame('pve');
        const pvpGame = createFakeGame('pvp');

        const { collider: c1 } = makeProp({ key: 'test_prop_pve', x: 0, z: 0 });
        pveGame.scatterSprites.push(c1);
        const { collider: c2 } = makeProp({ key: 'test_prop_pvp', x: 0, z: 0 });
        pvpGame.scatterSprites.push(c2);

        pveGame.handleSharedWorldEvent({
            event: 'prop-moved',
            detail: { key: 'test_prop_pve', x: 14, z: 22, rotY: 0, seq: 1 }
        });
        expect(c1.position.x).toBe(14);
        expect(c1.position.z).toBe(22);

        pvpGame.handleSharedWorldEvent({
            event: 'prop-moved',
            detail: { key: 'test_prop_pvp', x: 33, z: 44, rotY: 0, seq: 1 }
        });
        expect(c2.position.x).toBe(33);
        expect(c2.position.z).toBe(44);
    });

    it('broadcastEnemyStateSnapshot broadcasts in both PvE and PvP for full enemy parity', () => {
        const pveGame = createFakeGame('pve');
        pveGame.scatterSprites = [
            {
                userData: { isEnemy: true, scatterKey: 'enemy_1', type: 'crawler', hp: 5 },
                position: { x: 10, z: 12 },
                rotation: { y: 0.5 }
            }
        ];
        pveGame.broadcastEnemyStateSnapshot();
        expect(pveGame.netSocket.emit).toHaveBeenCalledWith('enemyState', {
            enemies: [
                {
                    scatterKey: 'enemy_1',
                    enemyType: 'crawler',
                    x: 10,
                    z: 12,
                    rotY: 0.5,
                    hp: 5,
                    burstTriggered: false,
                    isBoss: false,
                    scale: null,
                    targetId: null,
                    mode: null
                }
            ],
            companions: []
        });

        const pvpGame = createFakeGame('pvp');
        pvpGame.scatterSprites = [
            {
                userData: { isEnemy: true, scatterKey: 'pvp_enemy_1', type: 'spewer', hp: 8 },
                position: { x: 50, z: 60 },
                rotation: { y: 1.2 }
            }
        ];
        pvpGame.broadcastEnemyStateSnapshot();
        expect(pvpGame.netSocket.emit).toHaveBeenCalledWith('enemyState', {
            enemies: [
                {
                    scatterKey: 'pvp_enemy_1',
                    enemyType: 'spewer',
                    x: 50,
                    z: 60,
                    rotY: 1.2,
                    hp: 8,
                    burstTriggered: false,
                    isBoss: false,
                    scale: null,
                    targetId: null,
                    mode: null
                }
            ],
            companions: []
        });
    });
});
