import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { MultiplayerLobby, MULTIPLAYER_MODES, resolveRelayUrl } from './multiplayerLobby.js';

describe('MultiplayerLobby', () => {
    let lobby;
    let originalWindow;

    beforeEach(() => {
        lobby = new MultiplayerLobby();
    });

    describe('resolveRelayUrl', () => {
        afterEach(() => {
            if (originalWindow) globalThis.window = originalWindow;
        });

        it('returns explicit HB_RELAY_URL when defined', () => {
            originalWindow = globalThis.window;
            globalThis.window = { HB_RELAY_URL: 'https://relay.custom.io' };
            expect(resolveRelayUrl()).toBe('https://relay.custom.io');
        });

        it('resolves localhost to port 3001 for dev servers', () => {
            originalWindow = globalThis.window;
            globalThis.window = { location: { origin: 'http://localhost:5173' } };
            expect(resolveRelayUrl()).toBe('http://localhost:3001');
        });

        it('defaults to production backend for file:// or packaged Electron', () => {
            originalWindow = globalThis.window;
            globalThis.window = { location: { origin: 'file://' } };
            expect(resolveRelayUrl()).toBe('https://steam.tuesdaycinema.club');
        });
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
