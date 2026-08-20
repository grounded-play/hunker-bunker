import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { MultiplayerLobby, MULTIPLAYER_MODES, resolveRelayUrl, fetchMultiplayerSessionToken } from './multiplayerLobby.js';

describe('MultiplayerLobby', () => {
    let lobby;
    let originalWindow;

    beforeEach(() => {
        lobby = new MultiplayerLobby();
    });

    // docs/steamstorestatus.log Part A CORS fix: a packaged Electron
    // renderer's origin (file://, or null) gets rejected by strict
    // production HB_ALLOWED_ORIGINS, so minting the session via a plain
    // renderer fetch() would break the moment production origins are
    // locked down -- even though window.electronAPI.createSteamSession()
    // (preload-context request, not renderer-CORS-bound) already existed
    // and did the same job safely. This asserts the preferred path is
    // actually taken when available, and that dev/browser tabs (no
    // electronAPI at all) still fall back to the manual fetch unchanged.
    describe('fetchMultiplayerSessionToken', () => {
        afterEach(() => {
            if (originalWindow) globalThis.window = originalWindow;
        });

        it('prefers window.electronAPI.createSteamSession when available, over a manual fetch', async () => {
            originalWindow = globalThis.window;
            let fetchCalled = false;
            globalThis.window = {
                electronAPI: {
                    createSteamSession: async (identity) => ({ ok: true, token: `electron-token-for-${identity}` })
                }
            };
            globalThis.fetch = async () => { fetchCalled = true; return { ok: true, json: async () => ({ ok: true, token: 'fetch-token' }) }; };

            const token = await fetchMultiplayerSessionToken('https://relay.example', 'AGENT-7');

            expect(token).toBe('electron-token-for-AGENT-7');
            expect(fetchCalled).toBe(false);
        });

        it('returns null without falling back to fetch when createSteamSession fails', async () => {
            originalWindow = globalThis.window;
            let fetchCalled = false;
            globalThis.window = {
                electronAPI: {
                    createSteamSession: async () => ({ ok: false, reason: 'steam_auth_unavailable' })
                }
            };
            globalThis.fetch = async () => { fetchCalled = true; return { ok: true, json: async () => ({ ok: true, token: 'fetch-token' }) }; };

            const token = await fetchMultiplayerSessionToken('https://relay.example', 'AGENT-7');

            expect(token).toBeNull();
            expect(fetchCalled).toBe(false);
        });

        it('falls back to the manual fetch flow when window.electronAPI is absent (plain browser dev tab)', async () => {
            originalWindow = globalThis.window;
            globalThis.window = {};
            globalThis.fetch = async (url, opts) => {
                expect(url).toBe('https://relay.example/steam/session');
                const body = JSON.parse(opts.body);
                expect(body.ticketHex).toBe('00'.repeat(32));
                return { ok: true, json: async () => ({ ok: true, token: 'dev-fallback-token' }) };
            };

            const token = await fetchMultiplayerSessionToken('https://relay.example', 'AGENT-7');

            expect(token).toBe('dev-fallback-token');
        });
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
