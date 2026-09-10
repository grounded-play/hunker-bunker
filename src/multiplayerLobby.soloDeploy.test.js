import { describe, expect, it, afterEach, vi } from 'vitest';
import { MultiplayerLobby, MULTIPLAYER_MODES } from './multiplayerLobby.js';

// Starting a solo run after a co-op run kept putting the player back into
// multiplayer: `window.activeMultiplayerSession` and `game.isMultiplayer` were
// never reset on the Armory -> Deployment Briefing -> SOLO path.
// `clearMultiplayerSession()` existed for exactly this, but only the title
// "NEW RUN" and Daily Ops buttons called it -- the main deploy path never did.

afterEach(() => vi.unstubAllGlobals());

function lobbyWithStaleSession(mode) {
    const teardownMultiplayerNetwork = vi.fn();
    vi.stubGlobal('window', {
        // Left over from a previous co-op run.
        activeMultiplayerSession: { roomCode: 'OLDRUN', isMultiplayer: true },
        game: { teardownMultiplayerNetwork, isMultiplayer: true },
        AudioManager: { play: vi.fn() }
    });

    const lobby = new MultiplayerLobby();
    lobby.currentMode = mode;
    const launch = vi.fn();
    lobby.onLaunch = launch;
    lobby.closeModal = vi.fn();
    lobby.deployMatch = vi.fn();
    lobby.usingRelay = false;
    return { lobby, launch, teardownMultiplayerNetwork };
}

describe('solo deploy clears leftover multiplayer state', () => {
    it('drops a stale co-op session before launching a solo run', () => {
        const { lobby, launch, teardownMultiplayerNetwork } = lobbyWithStaleSession(MULTIPLAYER_MODES.SOLO);

        lobby.handleDeployButtonClick();

        expect(window.activeMultiplayerSession).toBeNull();
        expect(teardownMultiplayerNetwork).toHaveBeenCalledOnce();
        expect(launch).toHaveBeenCalledOnce();
    });

    it('still launches solo cleanly when there was never a co-op run', () => {
        vi.stubGlobal('window', {
            activeMultiplayerSession: null,
            game: { teardownMultiplayerNetwork: vi.fn() },
            AudioManager: { play: vi.fn() }
        });
        const lobby = new MultiplayerLobby();
        lobby.currentMode = MULTIPLAYER_MODES.SOLO;
        const launch = vi.fn();
        lobby.onLaunch = launch;
        lobby.closeModal = vi.fn();

        expect(() => lobby.handleDeployButtonClick()).not.toThrow();
        expect(launch).toHaveBeenCalledOnce();
        expect(window.activeMultiplayerSession).toBeNull();
    });

    // The co-op/PvP paths set the session up on purpose; clearing there would
    // tear down the run being started.
    it('leaves the session alone on a co-op deploy', () => {
        const { lobby, teardownMultiplayerNetwork } = lobbyWithStaleSession(MULTIPLAYER_MODES.COOP);

        lobby.handleDeployButtonClick();

        expect(teardownMultiplayerNetwork).not.toHaveBeenCalled();
        expect(window.activeMultiplayerSession).not.toBeNull();
        expect(lobby.deployMatch).toHaveBeenCalledOnce();
    });

    it('leaves the session alone on a PvP deploy', () => {
        const { lobby, teardownMultiplayerNetwork } = lobbyWithStaleSession(MULTIPLAYER_MODES.PVP);

        lobby.handleDeployButtonClick();

        expect(teardownMultiplayerNetwork).not.toHaveBeenCalled();
        expect(window.activeMultiplayerSession).not.toBeNull();
    });

    it('clears the one-shot callbacks so a later deploy cannot replay them', () => {
        const { lobby } = lobbyWithStaleSession(MULTIPLAYER_MODES.SOLO);
        lobby.onCancel = vi.fn();

        lobby.handleDeployButtonClick();

        expect(lobby.onLaunch).toBeNull();
        expect(lobby.onCancel).toBeNull();
    });
});
