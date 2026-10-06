import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

afterEach(() => vi.unstubAllGlobals());

describe('Deck reconnect regressions', () => {
    it('reconciles missed departures, excludes self, and refreshes host identity', () => {
        const game = {
            netSocket: { id: 'new-self' },
            remotePlayers: new Map([['old-peer', {}], ['new-self', {}]]),
            removeRemotePlayer(id) { this.remotePlayers.delete(id); },
            getOrCreateRemotePlayer(player) { this.remotePlayers.set(player.id, player); }
        };
        ThreeGame.prototype.reconcileMultiplayerRoster.call(game, {
            'new-self': { isHost: true }, 'new-peer': { callsign: 'Guest' }
        });
        expect([...game.remotePlayers.keys()]).toEqual(['new-peer']);
        expect(game.multiplayerLocalPlayerId).toBe('new-self');
        expect(game.isMultiplayerHost).toBe(true);
        ThreeGame.prototype.reconcileMultiplayerRoster.call(game, { 'new-self': { isHost: false } });
        expect(game.remotePlayers.size).toBe(0);
        expect(game.isMultiplayerHost).toBe(false);
    });

    it('tears down only gameplay callbacks on the shared lobby socket', () => {
        const socket = new EventEmitter();
        socket.id = 'self';
        const lobbyListener = vi.fn();
        socket.on('playerDisconnected', lobbyListener);
        const game = {
            getOrCreateRemotePlayer: vi.fn(),
            scene: { remove: vi.fn() }
        };
        ThreeGame.prototype.setupMultiplayerNetwork.call(game, { socket, mode: 'coop' });
        expect(socket.listenerCount('playerDisconnected')).toBe(2);
        ThreeGame.prototype.teardownMultiplayerNetwork.call(game);
        socket.emit('playerDisconnected', 'peer');
        expect(lobbyListener).toHaveBeenCalledWith('peer');
        expect(socket.listenerCount('currentPlayers')).toBe(0);
        expect(socket.listenerCount('playerDisconnected')).toBe(1);
    });

    it('guests do not fight the host automatic door decision', () => {
        vi.stubGlobal('document', { getElementById: () => null });
        const game = {
            isMultiplayer: true, isMultiplayerHost: false,
            bunkerBlastDoorGroup: { position: {} },
            bunkerBlastDoorState: { open: true, y: 1, targetY: -2.4, speed: 5 },
            player: { position: { x: 100, z: 100 } },
            isGameplayInputActive: () => true,
            toggleBunkerBlastDoor: vi.fn()
        };
        ThreeGame.prototype.updateBunkerBlastDoor.call(game, 0.016);
        expect(game.toggleBunkerBlastDoor).not.toHaveBeenCalled();
        expect(game.bunkerBlastDoorGroup.position.y).toBeLessThan(1);
    });

    it('dispatches one event when a remote door state actually changes', () => {
        const dispatchEvent = vi.fn();
        vi.stubGlobal('window', { dispatchEvent });
        const game = {
            bunkerBlastDoorState: { open: false },
            spawnTextureBurstEffect: vi.fn(),
            toggleBunkerBlastDoor: ThreeGame.prototype.toggleBunkerBlastDoor
        };
        ThreeGame.prototype.handleSharedWorldEvent.call(game, {
            event: 'bunker-door-toggled', detail: { open: true, seq: 1 }, originId: 'host'
        });
        expect(game.bunkerBlastDoorState.open).toBe(true);
        expect(dispatchEvent).toHaveBeenCalledTimes(1);
    });
});
