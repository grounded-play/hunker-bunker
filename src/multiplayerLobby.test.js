import { describe, expect, it, beforeEach } from 'vitest';
import { MultiplayerLobby, MULTIPLAYER_MODES } from './multiplayerLobby.js';

describe('MultiplayerLobby', () => {
    let lobby;

    beforeEach(() => {
        lobby = new MultiplayerLobby();
    });

    it('initializes with default co-op mode and room code', () => {
        expect(lobby.currentMode).toBe(MULTIPLAYER_MODES.COOP);
        expect(lobby.roomCode).toBe('SECTOR-7');
        expect(lobby.connected).toBe(false);
    });

    it('toggles mode between coop and pvp', () => {
        lobby.setMode(MULTIPLAYER_MODES.PVP);
        expect(lobby.currentMode).toBe(MULTIPLAYER_MODES.PVP);
        lobby.setMode(MULTIPLAYER_MODES.COOP);
        expect(lobby.currentMode).toBe(MULTIPLAYER_MODES.COOP);
    });

    it('falls back to local session when socket is unavailable', () => {
        lobby.fallbackLocalSession();
        expect(lobby.connected).toBe(true);
        expect(lobby.players.size).toBeGreaterThan(0);
        expect(lobby.players.has('local-host')).toBe(true);
    });

    it('disconnects and clears roster cleanly', () => {
        lobby.fallbackLocalSession();
        expect(lobby.players.size).toBeGreaterThan(0);
        lobby.disconnect();
        expect(lobby.connected).toBe(false);
        expect(lobby.players.size).toBe(0);
    });
});
