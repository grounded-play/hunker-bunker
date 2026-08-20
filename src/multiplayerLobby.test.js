import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
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

    // docs/steam-lobby-integration-plan-2026-08-20.md step 4. Same
    // globalThis.window stubbing pattern as fetchMultiplayerSessionToken's
    // own tests above -- steamLobbyClient.js's functions read
    // window.electronAPI directly, so stubbing that is enough to exercise
    // the real MultiplayerLobby methods without a live Electron/Steam
    // client.
    describe('Steam Lobby integration', () => {
        afterEach(() => {
            if (originalWindow) globalThis.window = originalWindow;
        });

        describe('maybeCreateSteamLobby', () => {
            it('creates a lobby and derives roomCode from it when running in Electron', async () => {
                originalWindow = globalThis.window;
                const steamCreateLobby = vi.fn().mockResolvedValue({ ok: true, lobby: { id: '555' } });
                globalThis.window = { electronAPI: { steamCreateLobby } };

                await lobby.maybeCreateSteamLobby();

                expect(steamCreateLobby).toHaveBeenCalledWith({ mode: MULTIPLAYER_MODES.COOP, maxPlayers: 4, build: null });
                expect(lobby.steamLobbyId).toBe('555');
                expect(lobby.roomCode).toBe('STEAM-555');
            });

            it('is a no-op outside Electron, leaving the default room code untouched', async () => {
                originalWindow = globalThis.window;
                globalThis.window = {};

                await lobby.maybeCreateSteamLobby();

                expect(lobby.steamLobbyId).toBeNull();
                expect(lobby.roomCode).toBe('SECTOR-7');
            });

            it('does not create a second lobby when one already exists (e.g. after joining via handleSteamLobbyJoinRequested)', async () => {
                originalWindow = globalThis.window;
                const steamCreateLobby = vi.fn();
                globalThis.window = { electronAPI: { steamCreateLobby } };
                lobby.steamLobbyId = '999';
                lobby.roomCode = 'STEAM-999';

                await lobby.maybeCreateSteamLobby();

                expect(steamCreateLobby).not.toHaveBeenCalled();
                expect(lobby.roomCode).toBe('STEAM-999');
            });
        });

        describe('handleSteamLobbyJoinRequested', () => {
            it('joins the lobby, derives roomCode, and connects', async () => {
                originalWindow = globalThis.window;
                const steamJoinLobby = vi.fn().mockResolvedValue({ ok: true, lobby: { id: '777', data: {} } });
                globalThis.window = { electronAPI: { steamJoinLobby, steamCreateLobby: vi.fn() } };
                let connectCalled = false;
                lobby.connect = async () => { connectCalled = true; };

                await lobby.handleSteamLobbyJoinRequested('777');

                expect(steamJoinLobby).toHaveBeenCalledWith('777');
                expect(lobby.steamLobbyId).toBe('777');
                expect(lobby.roomCode).toBe('STEAM-777');
                expect(connectCalled).toBe(true);
            });

            it('does not connect when the join itself fails', async () => {
                originalWindow = globalThis.window;
                const steamJoinLobby = vi.fn().mockResolvedValue({ ok: false, reason: 'steam_lobby_join_failed' });
                globalThis.window = { electronAPI: { steamJoinLobby } };
                let connectCalled = false;
                lobby.connect = async () => { connectCalled = true; };

                await lobby.handleSteamLobbyJoinRequested('777');

                expect(connectCalled).toBe(false);
                expect(lobby.steamLobbyId).toBeNull();
            });

            it('disconnects an existing connection before joining the new lobby', async () => {
                originalWindow = globalThis.window;
                const steamJoinLobby = vi.fn().mockResolvedValue({ ok: true, lobby: { id: '42', data: {} } });
                globalThis.window = { electronAPI: { steamJoinLobby, steamCreateLobby: vi.fn() } };
                lobby.connected = true;
                let disconnectCalled = false;
                lobby.disconnect = () => { disconnectCalled = true; lobby.connected = false; };
                lobby.connect = async () => {};

                await lobby.handleSteamLobbyJoinRequested('42');

                expect(disconnectCalled).toBe(true);
            });

            it('adopts the joined lobby\'s hb_mode when present', async () => {
                originalWindow = globalThis.window;
                const steamJoinLobby = vi.fn().mockResolvedValue({ ok: true, lobby: { id: '1', data: { hb_mode: 'pvp' } } });
                globalThis.window = { electronAPI: { steamJoinLobby, steamCreateLobby: vi.fn() } };
                lobby.connect = async () => {};

                await lobby.handleSteamLobbyJoinRequested('1');

                expect(lobby.currentMode).toBe('pvp');
            });
        });

        describe('reportSteamRichPresence', () => {
            it('is a no-op without an active Steam lobby', async () => {
                originalWindow = globalThis.window;
                const steamSetRichPresence = vi.fn();
                globalThis.window = { electronAPI: { steamSetRichPresence } };

                lobby.reportSteamRichPresence();

                expect(steamSetRichPresence).not.toHaveBeenCalled();
            });

            it('reports roster size in the lobby phase', async () => {
                originalWindow = globalThis.window;
                const steamSetRichPresence = vi.fn();
                globalThis.window = { electronAPI: { steamSetRichPresence } };
                lobby.steamLobbyId = '555';
                lobby.players.set('a', {});
                lobby.players.set('b', {});

                lobby.reportSteamRichPresence();

                expect(steamSetRichPresence).toHaveBeenCalledWith({
                    status: 'Co-op Expedition — 2/4 Operatives',
                    connect: '+connect_lobby 555'
                });
            });

            it('reports "In Progress" in the deployed phase', async () => {
                originalWindow = globalThis.window;
                const steamSetRichPresence = vi.fn();
                globalThis.window = { electronAPI: { steamSetRichPresence } };
                lobby.steamLobbyId = '555';
                lobby.currentMode = MULTIPLAYER_MODES.PVP;

                lobby.reportSteamRichPresence('deployed');

                expect(steamSetRichPresence).toHaveBeenCalledWith({
                    status: 'PvP Skirmish — In Progress',
                    connect: '+connect_lobby 555'
                });
            });
        });

        describe('disconnect', () => {
            it('leaves the Steam lobby and resets roomCode to the default when one was active', async () => {
                originalWindow = globalThis.window;
                const steamLeaveLobby = vi.fn().mockResolvedValue({ ok: true });
                globalThis.window = { electronAPI: { steamLeaveLobby, steamCreateLobby: vi.fn() } };
                lobby.steamLobbyId = '555';
                lobby.roomCode = 'STEAM-555';

                lobby.disconnect();

                expect(steamLeaveLobby).toHaveBeenCalled();
                expect(lobby.steamLobbyId).toBeNull();
                expect(lobby.roomCode).toBe('SECTOR-7');
            });

            it('does not touch roomCode when no Steam lobby was active (plain room-code session)', () => {
                originalWindow = globalThis.window;
                globalThis.window = {};
                lobby.roomCode = 'CUSTOM-CODE';

                lobby.disconnect();

                expect(lobby.roomCode).toBe('CUSTOM-CODE');
            });
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

        it('resolves localhost to port 3002 for dev servers (avoids colliding with the production Docker container on 3001)', () => {
            originalWindow = globalThis.window;
            globalThis.window = { location: { origin: 'http://localhost:5173' } };
            expect(resolveRelayUrl()).toBe('http://localhost:3002');
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
