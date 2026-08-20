import { describe, expect, it, vi, afterEach } from 'vitest';
import {
    HB_LOBBY_PROTOCOL_VERSION,
    deriveRelayRoomFromLobbyId,
    checkLobbyProtocolCompatibility,
    createSteamLobby,
    joinSteamLobby,
    leaveSteamLobby,
    getSteamLobby,
    openSteamInviteDialog,
    setSteamLobbyState,
    setSteamRichPresence,
    onSteamLobbyJoinRequested
} from './steamLobbyClient.js';

// docs/steam-lobby-integration-plan-2026-08-20.md step 3: renderer-side
// wrapper around window.electronAPI.steam* (step 2). Same "no-op outside
// Electron" guard pattern as multiplayerLobby.js's
// fetchMultiplayerSessionToken, same globalThis.window test pattern as
// multiplayerLobby.test.js.
describe('steamLobbyClient', () => {
    let originalWindow;
    afterEach(() => {
        if (originalWindow !== undefined) globalThis.window = originalWindow;
        originalWindow = undefined;
    });

    describe('deriveRelayRoomFromLobbyId', () => {
        it('prefixes the Steam lobby id so it becomes the relay room identity', () => {
            expect(deriveRelayRoomFromLobbyId('109775243912345678')).toBe('STEAM-109775243912345678');
        });
    });

    describe('checkLobbyProtocolCompatibility', () => {
        it('is compatible when the remote protocol matches the local one', () => {
            expect(checkLobbyProtocolCompatibility({ hb_protocol: HB_LOBBY_PROTOCOL_VERSION })).toEqual({ compatible: true });
        });

        it('flags a real mismatch as VERSION_MISMATCH with both versions reported', () => {
            const result = checkLobbyProtocolCompatibility({ hb_protocol: '2' }, '1');
            expect(result).toEqual({
                compatible: false,
                reason: 'VERSION_MISMATCH',
                localProtocol: '1',
                remoteProtocol: '2'
            });
        });

        it('treats a lobby with no declared protocol as compatible (older client / not this game\'s lobby)', () => {
            expect(checkLobbyProtocolCompatibility({})).toEqual({ compatible: true, reason: 'no_protocol_declared' });
            expect(checkLobbyProtocolCompatibility(null)).toEqual({ compatible: true, reason: 'no_protocol_declared' });
        });
    });

    describe('outside Electron (no window.electronAPI)', () => {
        it('every action returns a clear not_electron/ok result instead of throwing', async () => {
            originalWindow = globalThis.window;
            globalThis.window = {};

            await expect(createSteamLobby()).resolves.toEqual({ ok: false, reason: 'not_electron' });
            await expect(joinSteamLobby('123')).resolves.toEqual({ ok: false, reason: 'not_electron' });
            await expect(leaveSteamLobby()).resolves.toEqual({ ok: true });
            await expect(getSteamLobby()).resolves.toEqual({ ok: true, lobby: null });
            await expect(openSteamInviteDialog()).resolves.toEqual({ ok: false, reason: 'not_electron' });
            await expect(setSteamLobbyState('lobby')).resolves.toEqual({ ok: true });
            await expect(setSteamRichPresence({ status: 'x' })).resolves.toEqual({ ok: true });
            expect(onSteamLobbyJoinRequested(() => {})).toBeInstanceOf(Function);
        });
    });

    describe('inside Electron (window.electronAPI present)', () => {
        it('createSteamLobby forwards mode/maxPlayers/build to electronAPI.steamCreateLobby', async () => {
            originalWindow = globalThis.window;
            const steamCreateLobby = vi.fn().mockResolvedValue({ ok: true, lobby: { id: '42' } });
            globalThis.window = { electronAPI: { steamCreateLobby } };

            const result = await createSteamLobby({ mode: 'pvp', maxPlayers: 2, build: 'gh-123' });

            expect(steamCreateLobby).toHaveBeenCalledWith({ mode: 'pvp', maxPlayers: 2, build: 'gh-123' });
            expect(result).toEqual({ ok: true, lobby: { id: '42' } });
        });

        it('joinSteamLobby forwards the lobby id to electronAPI.steamJoinLobby', async () => {
            originalWindow = globalThis.window;
            const steamJoinLobby = vi.fn().mockResolvedValue({ ok: true, lobby: { id: '99' } });
            globalThis.window = { electronAPI: { steamCreateLobby: vi.fn(), steamJoinLobby } };

            await joinSteamLobby('99');

            expect(steamJoinLobby).toHaveBeenCalledWith('99');
        });

        it('onSteamLobbyJoinRequested delegates to electronAPI and returns its unsubscribe function', () => {
            originalWindow = globalThis.window;
            const unsubscribe = () => {};
            const onSteamLobbyJoinRequested_ = vi.fn().mockReturnValue(unsubscribe);
            globalThis.window = { electronAPI: { onSteamLobbyJoinRequested: onSteamLobbyJoinRequested_ } };

            const handler = () => {};
            const result = onSteamLobbyJoinRequested(handler);

            expect(onSteamLobbyJoinRequested_).toHaveBeenCalledWith(handler);
            expect(result).toBe(unsubscribe);
        });
    });
});
