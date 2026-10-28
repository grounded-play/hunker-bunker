import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

// Owner ask 2026-10-28: the squad's doors open together, once x / x loaded.
function fakeSocket() {
    const handlers = new Map();
    return {
        emit: vi.fn(),
        on: (event, fn) => handlers.set(event, fn),
        off: (event) => handlers.delete(event),
        fire: (event, data) => handlers.get(event)?.(data),
        handlers
    };
}

const squad = (socket, extra = {}) => ({
    isMultiplayer: true,
    netSocket: socket,
    deployGateId: 'gate-1',
    relayFeatures: new Set(['deployGate']),
    ...extra
});

describe('waitForSquadDeployGate', () => {
    it('reports this client loaded and waits for the squad', async () => {
        const socket = fakeSocket();
        const onProgress = vi.fn();
        const game = squad(socket);
        const waiting = ThreeGame.prototype.waitForSquadDeployGate.call(game, { onProgress });
        expect(socket.emit).toHaveBeenCalledWith('deployLoaded', { gateId: 'gate-1' });
        socket.fire('deployGateProgress', { gateId: 'gate-1', loaded: 1, total: 2, players: [] });
        expect(onProgress).toHaveBeenCalledWith({ loaded: 1, total: 2, players: [] });
        socket.fire('deployGateOpen', { gateId: 'another-match', reason: 'all_loaded' });
        socket.fire('deployGateOpen', { gateId: 'gate-1', reason: 'all_loaded', loaded: 2, total: 2 });
        await expect(waiting).resolves.toMatchObject({ reason: 'all_loaded', loaded: 2, total: 2 });
        expect(socket.handlers.size).toBe(0);
        expect(game.deployGateId).toBeNull();
    });

    it('does not wait solo, on an older relay or without a gate', async () => {
        for (const extra of [{ isMultiplayer: false }, { relayFeatures: new Set() }, { deployGateId: null }]) {
            const socket = fakeSocket();
            const result = await ThreeGame.prototype.waitForSquadDeployGate.call(squad(socket, extra));
            expect(result.reason).toBe('no-gate');
            expect(socket.emit).not.toHaveBeenCalled();
        }
    });

    it('opens its own doors if the relay goes quiet or drops', async () => {
        vi.useFakeTimers();
        try {
            const quiet = ThreeGame.prototype.waitForSquadDeployGate.call(squad(fakeSocket()), { timeoutMs: 1000 });
            vi.advanceTimersByTime(1000);
            await expect(quiet).resolves.toMatchObject({ reason: 'client-timeout' });
        } finally {
            vi.useRealTimers();
        }
        const socket = fakeSocket();
        const dropped = ThreeGame.prototype.waitForSquadDeployGate.call(squad(socket));
        socket.fire('disconnect');
        await expect(dropped).resolves.toMatchObject({ reason: 'disconnected' });
    });
});
