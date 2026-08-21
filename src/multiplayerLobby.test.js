import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { MultiplayerLobby, MULTIPLAYER_MODES, resolveRelayUrl, fetchMultiplayerSessionToken, getLocalLoadoutSummary, getLocalOperatorClass, getLocalCallsign, filterDiscoverableSteamLobbies } from './multiplayerLobby.js';

describe('MultiplayerLobby', () => {
    let lobby;
    let originalWindow;

    beforeEach(() => {
        lobby = new MultiplayerLobby();
    });

    describe('authoritative host state', () => {
        it('mirrors the server host flag for the local roster entry', () => {
            lobby.socket = { id: 'guest-socket' };

            lobby.syncServerRoster({
                'host-socket': { callsign: 'HOST', opClass: 'TANK', isHost: true, ready: true },
                'guest-socket': { callsign: 'GUEST', opClass: 'SCOUT', isHost: false, ready: false }
            });

            expect(lobby.isLocalPlayerHost).toBe(false);
            expect(lobby.players.get('host-socket').isHost).toBe(true);
            expect(lobby.players.get('guest-socket').isHost).toBe(false);
        });

        it('updates the promoted guest when the relay broadcasts hostChanged', () => {
            lobby.socket = { id: 'guest-socket' };
            lobby.players.set('host-socket', { id: 'host-socket', isHost: true });
            lobby.players.set('guest-socket', { id: 'guest-socket', isHost: false });
            lobby.updateUiState = vi.fn();
            lobby.reportSteamRichPresence = vi.fn();

            lobby.handleHostChanged({ hostId: 'guest-socket' });

            expect(lobby.isLocalPlayerHost).toBe(true);
            expect(lobby.players.get('host-socket').isHost).toBe(false);
            expect(lobby.players.get('guest-socket').isHost).toBe(true);
            expect(lobby.updateUiState).toHaveBeenCalled();
        });
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

                expect(steamCreateLobby).toHaveBeenCalledWith({ mode: MULTIPLAYER_MODES.COOP, maxPlayers: 4, build: null, visibility: 'public', passwordRequired: false });
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

        // docs/logs/log8.json / user report: "the invite friends didn't
        // open the Steam overlay." matchmaking.Lobby.openInviteDialog()
        // never throws for "overlay unavailable" and steamworks.js exposes
        // no way to check overlay availability directly -- launchedViaSteam
        // (electron/main.cjs) is the best available proxy, checked here
        // before ever attempting the dialog so a player running the
        // packaged binary directly gets an honest, specific toast instead
        // of a silently dead button.
        describe('handleSteamInviteClick', () => {
            it('warns and never attempts the dialog when not launched via Steam', async () => {
                originalWindow = globalThis.window;
                const openInviteDialogSpy = vi.fn();
                const showToastNotification = vi.fn();
                globalThis.window = {
                    electronAPI: {
                        getSteamInfo: vi.fn().mockResolvedValue({ launchedViaSteam: false }),
                        steamOpenInviteDialog: openInviteDialogSpy
                    },
                    showToastNotification
                };
                lobby.steamLobbyId = '555';

                await lobby.handleSteamInviteClick();

                expect(openInviteDialogSpy).not.toHaveBeenCalled();
                expect(showToastNotification).toHaveBeenCalledWith(expect.stringContaining('LAUNCH HUNKER BUNKER FROM STEAM'));
            });

            it('attempts the dialog and reports success when launched via Steam', async () => {
                originalWindow = globalThis.window;
                const showToastNotification = vi.fn();
                globalThis.window = {
                    electronAPI: {
                        steamCreateLobby: vi.fn(),
                        getSteamInfo: vi.fn().mockResolvedValue({ launchedViaSteam: true }),
                        steamOpenInviteDialog: vi.fn().mockResolvedValue({ ok: true })
                    },
                    showToastNotification,
                    AudioManager: { play: vi.fn() }
                };
                lobby.steamLobbyId = '555';

                await lobby.handleSteamInviteClick();

                expect(showToastNotification).toHaveBeenCalledWith(expect.stringContaining('SELECT A FRIEND'));
            });

            it('reports failure distinctly when the dialog call itself fails', async () => {
                originalWindow = globalThis.window;
                const showToastNotification = vi.fn();
                const steamOpenInviteDialog = vi.fn().mockResolvedValue({ ok: false, reason: 'steam_lobby_invite_dialog_failed' });
                globalThis.window = {
                    electronAPI: {
                        steamCreateLobby: vi.fn(),
                        getSteamInfo: vi.fn().mockResolvedValue({ launchedViaSteam: true }),
                        steamOpenInviteDialog
                    },
                    showToastNotification
                };
                lobby.steamLobbyId = '555';

                await lobby.handleSteamInviteClick();

                expect(steamOpenInviteDialog).toHaveBeenCalled();
                expect(showToastNotification).toHaveBeenCalledWith(expect.stringContaining('COULD NOT OPEN'));
            });

            it('does nothing at all without an active lobby', async () => {
                originalWindow = globalThis.window;
                const showToastNotification = vi.fn();
                const getSteamInfo = vi.fn();
                globalThis.window = { electronAPI: { getSteamInfo }, showToastNotification };
                lobby.steamLobbyId = null;

                await lobby.handleSteamInviteClick();

                expect(getSteamInfo).not.toHaveBeenCalled();
                expect(showToastNotification).not.toHaveBeenCalled();
            });
        });

        // docs/logs/log8.json / user report: no way to see or join a
        // public Steam lobby at all -- getSteamLobbies() (matchmaking.
        // Lobby list) was never wired to anything.
        describe('refreshSteamLobbies', () => {
            it('is safe to call when there is no document (non-browser context)', async () => {
                originalWindow = globalThis.window;
                globalThis.window = { electronAPI: { steamGetLobbies: vi.fn() } };

                await expect(lobby.refreshSteamLobbies()).resolves.toBeUndefined();
            });
        });

        describe('handleSteamLobbyJoinRequested', () => {
            it('leaves an existing guest lobby before joining the invited target lobby', async () => {
                originalWindow = globalThis.window;
                const events = [];
                const steamJoinLobby = vi.fn().mockImplementation(async () => {
                    events.push('join-target');
                    return { ok: true, lobby: { id: '777', data: { hb_mode: 'coop' } } };
                });
                globalThis.window = { electronAPI: { steamJoinLobby, steamCreateLobby: vi.fn() } };
                lobby.connected = true;
                lobby.steamLobbyId = '111';
                lobby.disconnect = vi.fn(() => {
                    events.push('leave-current');
                    lobby.connected = false;
                    lobby.steamLobbyId = null;
                });
                lobby.connect = vi.fn().mockResolvedValue(undefined);

                await lobby.handleSteamLobbyJoinRequested('777');

                expect(events).toEqual(['leave-current', 'join-target']);
                expect(lobby.steamLobbyId).toBe('777');
                expect(lobby.roomCode).toBe('STEAM-777');
                expect(lobby.connect).toHaveBeenCalledOnce();
            });

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

    it('resolves the selected class and callsign from the packaged lobby sources', () => {
        originalWindow = globalThis.window;
        globalThis.window = {
            game: { playerType: 'SCOUT' },
            selectedPlayerType: 'SCOUT',
            profile: { getCallsign: () => 'DECK-TANK' },
            localStorage: { getItem: () => 'TANK' }
        };
        const originalDocument = globalThis.document;
        globalThis.document = {
            querySelector: () => ({ getAttribute: () => 'TANK' }),
            getElementById: () => null
        };

        expect(getLocalOperatorClass()).toBe('TANK');
        expect(getLocalCallsign()).toBe('DECK-TANK');

        globalThis.document = originalDocument;
    });

    it('does not offer the local host its own public lobby as a join target', () => {
        const lobbies = [
            { id: 'own', ownerSteamId64: '76561198000000001' },
            { id: 'friend', ownerSteamId64: '76561198000000002' }
        ];

        expect(filterDiscoverableSteamLobbies(lobbies, '76561198000000001')).toEqual([
            { id: 'friend', ownerSteamId64: '76561198000000002' }
        ]);
        expect(filterDiscoverableSteamLobbies(lobbies, null)).toEqual(lobbies);
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

    // docs/multiplayer-flow-and-lobby-bugs-2026-08-20.md Phase 1/2: this
    // modal is now the shared post-Armory Deployment Briefing screen for
    // every run. No real jsdom in this suite (vitest.config.js runs the
    // node environment) -- a minimal fake document is enough to exercise
    // openModal/updateUiState/deploy without a real DOM, same spirit as the
    // rest of this file's globalThis.window stubs.
    function createFakeElement() {
        return {
            classList: { add: vi.fn(), remove: vi.fn(), toggle: vi.fn() },
            setAttribute: vi.fn(),
            dataset: {},
            style: {},
            textContent: '',
            disabled: false,
            checked: false,
            value: '',
            addEventListener: vi.fn(),
            querySelector: vi.fn(() => null)
        };
    }

    function createFakeDocument() {
        const elements = new Map();
        return {
            getElementById: vi.fn((id) => {
                if (!elements.has(id)) elements.set(id, createFakeElement());
                return elements.get(id);
            }),
            querySelector: vi.fn(() => createFakeElement()),
            _elements: elements
        };
    }

    describe('Deployment Briefing screen (openModal/SOLO/cancelModal)', () => {
        let originalDocument;

        beforeEach(() => {
            originalDocument = globalThis.document;
            globalThis.document = createFakeDocument();
        });

        afterEach(() => {
            globalThis.document = originalDocument;
        });

        it('openModal stashes onLaunch/onCancel and resets to SOLO regardless of the last session\'s mode', () => {
            lobby.currentMode = MULTIPLAYER_MODES.PVP;
            const onLaunch = vi.fn();
            const onCancel = vi.fn();

            lobby.openModal({ onLaunch, onCancel });

            expect(lobby.currentMode).toBe(MULTIPLAYER_MODES.SOLO);
            expect(lobby.onLaunch).toBe(onLaunch);
            expect(lobby.onCancel).toBe(onCancel);
        });

        it('does not auto-connect on open (SOLO must never open a live relay/Steam session by surprise)', () => {
            let connectCalled = false;
            lobby.connect = async () => { connectCalled = true; };

            lobby.openModal({ onLaunch: vi.fn() });

            expect(connectCalled).toBe(false);
            expect(lobby.connected).toBe(false);
        });

        it('SOLO deploy calls onLaunch directly, with no relay/session setup at all', () => {
            const onLaunch = vi.fn();
            let connectCalled = false;
            lobby.connect = async () => { connectCalled = true; };
            lobby.openModal({ onLaunch });

            lobby.handleDeployButtonClick();

            expect(onLaunch).toHaveBeenCalledTimes(1);
            expect(connectCalled).toBe(false);
            expect(lobby.activeMatch).toBeNull();
        });

        it('SOLO deploy clears the stashed callbacks so a stale onLaunch can never fire twice', () => {
            const onLaunch = vi.fn();
            lobby.openModal({ onLaunch });

            lobby.handleDeployButtonClick();
            lobby.onLaunch?.(); // would throw/no-op if still set -- assert it's gone instead

            expect(onLaunch).toHaveBeenCalledTimes(1);
            expect(lobby.onLaunch).toBeNull();
        });

        it('selecting CO-OP or PVP does not create a host lobby until explicitly requested', () => {
            let connectCount = 0;
            lobby.connect = async () => { connectCount += 1; lobby.connected = true; };
            lobby.disconnect = () => { lobby.connected = false; };
            lobby.openModal({ onLaunch: vi.fn() });

            lobby.setMode(MULTIPLAYER_MODES.COOP);
            expect(connectCount).toBe(0);
            expect(lobby.connected).toBe(false);

            lobby.toggleConnection();
            expect(connectCount).toBe(1);
        });

        it('cancelModal fires onCancel and clears both callbacks; a subsequent deploy click does nothing', () => {
            const onLaunch = vi.fn();
            const onCancel = vi.fn();
            lobby.openModal({ onLaunch, onCancel });

            lobby.cancelModal();
            lobby.handleDeployButtonClick();

            expect(onCancel).toHaveBeenCalledTimes(1);
            expect(onLaunch).not.toHaveBeenCalled();
        });

        it('a successful CO-OP/PVP deploy never fires onCancel', async () => {
            const onLaunch = vi.fn();
            const onCancel = vi.fn();
            lobby.openModal({ onLaunch, onCancel });
            lobby.currentMode = MULTIPLAYER_MODES.COOP;
            lobby.players.set('local-host', { id: 'local-host', callsign: 'HOST', opClass: 'TANK', ping: 8, isSelf: true, ready: true });

            lobby.finalizeDeploy({ mode: MULTIPLAYER_MODES.COOP, seed: 'SECTOR-7', crashPlan: null });
            await Promise.resolve();

            expect(onCancel).not.toHaveBeenCalled();
            expect(onLaunch).toHaveBeenCalledTimes(1);
        });
    });

    // docs/multiplayer-flow-and-lobby-bugs-2026-08-20.md Phase 2: host-set
    // private lobby + password. The relay only ever sees the hash (see
    // server/relayPrivateLobbyPassword.test.js); these tests cover the
    // client-side half -- what gets sent to Steam (a boolean flag only,
    // never the hash) and what gets prompted for on join.
    describe('private lobby + password', () => {
        afterEach(() => {
            if (originalWindow) globalThis.window = originalWindow;
        });

        it('maybeCreateSteamLobby requests a Private Steam lobby with passwordRequired:true when hostPrivate is set with a password', async () => {
            originalWindow = globalThis.window;
            const steamCreateLobby = vi.fn().mockResolvedValue({ ok: true, lobby: { id: '9' } });
            globalThis.window = { electronAPI: { steamCreateLobby } };
            lobby.hostPrivate = true;
            lobby.hostPasswordValue = 'hunter2';

            await lobby.maybeCreateSteamLobby();

            expect(steamCreateLobby).toHaveBeenCalledWith(expect.objectContaining({ visibility: 'private', passwordRequired: true }));
        });

        it('maybeCreateSteamLobby does not require a password just because hostPrivate is set (private with no password is valid)', async () => {
            originalWindow = globalThis.window;
            const steamCreateLobby = vi.fn().mockResolvedValue({ ok: true, lobby: { id: '9' } });
            globalThis.window = { electronAPI: { steamCreateLobby } };
            lobby.hostPrivate = true;
            lobby.hostPasswordValue = '';

            await lobby.maybeCreateSteamLobby();

            expect(steamCreateLobby).toHaveBeenCalledWith(expect.objectContaining({ visibility: 'private', passwordRequired: false }));
        });

        it('handleSteamLobbyJoinRequested prompts for a password when the lobby reports hb_pw_required, and hashes it before connecting', async () => {
            originalWindow = globalThis.window;
            const steamJoinLobby = vi.fn().mockResolvedValue({ ok: true, lobby: { id: '5', data: { hb_pw_required: 'true' } } });
            const promptSpy = vi.fn().mockReturnValue('hunter2');
            globalThis.window = { electronAPI: { steamJoinLobby, steamCreateLobby: vi.fn() }, prompt: promptSpy };
            lobby.connect = async () => {};

            await lobby.handleSteamLobbyJoinRequested('5');

            expect(promptSpy).toHaveBeenCalled();
            expect(lobby.pendingJoinPasswordHash).toMatch(/^[0-9a-f]{64}$/);
        });

        it('does not prompt for a password when the lobby does not require one', async () => {
            originalWindow = globalThis.window;
            const steamJoinLobby = vi.fn().mockResolvedValue({ ok: true, lobby: { id: '6', data: {} } });
            const promptSpy = vi.fn();
            globalThis.window = { electronAPI: { steamJoinLobby, steamCreateLobby: vi.fn() }, prompt: promptSpy };
            lobby.connect = async () => {};

            await lobby.handleSteamLobbyJoinRequested('6');

            expect(promptSpy).not.toHaveBeenCalled();
            expect(lobby.pendingJoinPasswordHash).toBeNull();
        });

        it('leaves pendingJoinPasswordHash null (not an empty-string hash) when the password prompt is cancelled', async () => {
            originalWindow = globalThis.window;
            const steamJoinLobby = vi.fn().mockResolvedValue({ ok: true, lobby: { id: '7', data: { hb_pw_required: 'true' } } });
            const promptSpy = vi.fn().mockReturnValue(null);
            globalThis.window = { electronAPI: { steamJoinLobby, steamCreateLobby: vi.fn() }, prompt: promptSpy };
            lobby.connect = async () => {};

            await lobby.handleSteamLobbyJoinRequested('7');

            expect(lobby.pendingJoinPasswordHash).toBeNull();
        });
    });

    // docs/multiplayer-flow-and-lobby-bugs-2026-08-20.md Phase 3: the
    // display-only loadout summary synced onto the roster (equipped weapon
    // label + whether a charm is equipped) -- reused by connect(),
    // fallbackLocalSession(), and Phase 4's squad-manifest cutscene overlay.
    describe('getLocalLoadoutSummary', () => {
        afterEach(() => {
            if (originalWindow) globalThis.window = originalWindow;
        });

        it('reads the equipped weapon label and charm state for the given class', () => {
            originalWindow = globalThis.window;
            const getEquippedLabel = vi.fn().mockReturnValue('RAILGUN MK.II');
            const getEquippedCharmId = vi.fn().mockReturnValue('4200');
            globalThis.window = { loadout: { getEquippedLabel, getEquippedCharmId }, fabricator: { isFabricated: vi.fn() } };

            const summary = getLocalLoadoutSummary('TANK');

            expect(summary).toEqual({ weapon: 'RAILGUN MK.II', hasCharm: true });
            expect(getEquippedLabel).toHaveBeenCalledWith(globalThis.window.fabricator, 'TANK');
            expect(getEquippedCharmId).toHaveBeenCalledWith('TANK');
        });

        it('reports hasCharm:false when no charm is equipped', () => {
            originalWindow = globalThis.window;
            globalThis.window = {
                loadout: { getEquippedLabel: () => 'SIDEARM', getEquippedCharmId: () => null },
                fabricator: {}
            };

            expect(getLocalLoadoutSummary('SCOUT')).toEqual({ weapon: 'SIDEARM', hasCharm: false });
        });

        it('returns null when there is no live loadout manager yet (very early boot)', () => {
            originalWindow = globalThis.window;
            globalThis.window = {};

            expect(getLocalLoadoutSummary('TANK')).toBeNull();
        });
    });

    describe('roster entries carry the synced loadout summary', () => {
        afterEach(() => {
            if (originalWindow) globalThis.window = originalWindow;
        });

        it('fallbackLocalSession attaches the local player\'s real loadout summary to its own roster entry', () => {
            originalWindow = globalThis.window;
            globalThis.window = {
                loadout: { getEquippedLabel: () => 'ARC WELDER', getEquippedCharmId: () => '1' },
                fabricator: {},
                selectedPlayerType: 'ENGINEER',
                AudioManager: { play: vi.fn() }
            };

            lobby.fallbackLocalSession();

            const self = [...lobby.players.values()].find((p) => p.isSelf);
            expect(self.loadout).toEqual({ weapon: 'ARC WELDER', hasCharm: true });
        });

        // A remote player's loadout arriving via the real currentPlayers/
        // newPlayer socket handlers is covered by
        // server/relayLoadoutSync.test.js (real socket.io round-trip through
        // server/relay.js) and was live-verified end to end against the real
        // dev server -- connect() itself isn't structured for isolating just
        // that handler without replacing connect() wholesale, which would
        // test a reimplementation rather than the real code (same reason no
        // other test in this file exercises connect()'s internal handlers).
    });
});
