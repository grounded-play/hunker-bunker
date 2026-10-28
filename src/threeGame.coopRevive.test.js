import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

// 2026-10-28 Deck+PC co-op: the Deck host went down at 14:26:02 and the PC
// pressed E beside it twice (a field weapon, then the locked Foundry). Revive
// was a mouse click on the body only, so a pad or E player could never bring
// a squadmate back and the downed player waited forever.
function createGame({ remoteAt = { x: 1, z: 0 }, isDown = true, mode = 'coop' } = {}) {
    const remote = {
        id: 'deck-host',
        callsign: 'SPECTRE-3',
        isDown,
        mesh: { position: new THREE.Vector3(remoteAt.x, 0, remoteAt.z), visible: true }
    };
    const game = {
        player: { position: new THREE.Vector3(0, 0, 0) },
        isMultiplayer: true,
        multiplayerMode: mode,
        remotePlayers: new Map([[remote.id, remote]]),
        netSocket: { id: 'pc-guest', emit: vi.fn() },
        activeInteractiveConsole: null,
        activeInteractiveO2Generator: null,
        activeInteractiveBaseTurret: null,
        foundry: null,
        _blackBoxMarkerActive: false,
        activeRewardCache: null,
        reviveSquadmate: ThreeGame.prototype.reviveSquadmate,
        getNearestDownedSquadmate: ThreeGame.prototype.getNearestDownedSquadmate
    };
    return { game, remote };
}

describe('co-op revive from E / pad interact', () => {
    let originalWindow;
    beforeEach(() => {
        originalWindow = globalThis.window;
        globalThis.window = { showToastNotification: vi.fn(), AudioManager: { play: vi.fn() }, dispatchEvent: vi.fn() };
    });
    afterEach(() => {
        globalThis.window = originalWindow;
    });

    it('offers the revive first when standing over a downed squadmate, and sends it', () => {
        const { game, remote } = createGame();
        const candidates = ThreeGame.prototype.getPriorityInteractionCandidates.call(game);
        expect(candidates[0].id).toBe(`revive-squadmate:${remote.id}`);
        expect(candidates[0].interact()).toBe(true);
        expect(game.netSocket.emit).toHaveBeenCalledWith('playerRevive', { targetId: remote.id });
    });

    it('offers nothing when the squadmate is up, out of reach, or in PvP', () => {
        for (const options of [{ isDown: false }, { remoteAt: { x: 6, z: 0 } }, { mode: 'pvp' }]) {
            const { game } = createGame(options);
            const candidates = ThreeGame.prototype.getPriorityInteractionCandidates.call(game);
            expect(candidates.some((c) => c.id.startsWith('revive-squadmate'))).toBe(false);
        }
    });

    it('the downed player comes back up when the relay names them', () => {
        const game = {
            isPlayerDowned: true,
            playerVitals: { hp: 0, maxHp: 3 },
            netSocket: { id: 'deck-host' },
            remotePlayers: new Map([['pc-guest', { callsign: 'SHADOW-5' }]]),
            emitHealthState: vi.fn(),
            setInputEnabled: vi.fn(),
            player3dOverlay: { setDowned: vi.fn() },
            revivePlayerFromDowned: ThreeGame.prototype.revivePlayerFromDowned
        };
        globalThis.CustomEvent = globalThis.CustomEvent ?? class { constructor(type) { this.type = type; } };
        ThreeGame.prototype.handleRemotePlayerRevived.call(game, { reviverId: 'pc-guest', targetId: 'deck-host' });
        expect(game.isPlayerDowned).toBe(false);
        expect(game.playerVitals.hp).toBeGreaterThanOrEqual(1);
        expect(game.setInputEnabled).toHaveBeenCalledWith(true);
    });
});
