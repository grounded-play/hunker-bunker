import { describe, expect, it, afterEach, vi } from 'vitest';
import { startMultiplayerRun, clearMultiplayerSession } from './gameController.js';

// Sprint 26, first increment toward the GameController architecture the
// sprint 24 review flagged as a P2 cleanup item -- see the module's own
// header comment for the full context. These tests cover the two things
// that previously had zero coverage of their own: the explicit-session
// hand-off to ThreeGame.setupMultiplayerNetwork, and the leak fix (a real
// bug found live-tracing the flow: window.activeMultiplayerSession was
// never cleared, and window.game.isMultiplayer was only ever set true,
// never reset).

describe('gameController', () => {
    let originalWindow;
    let originalDocument;

    afterEach(() => {
        if (originalWindow !== undefined) globalThis.window = originalWindow;
        if (originalDocument !== undefined) globalThis.document = originalDocument;
        originalWindow = undefined;
        originalDocument = undefined;
    });

    describe('startMultiplayerRun', () => {
        it('sets window.activeMultiplayerSession and passes the session explicitly into setupMultiplayerNetwork', async () => {
            originalWindow = globalThis.window;
            originalDocument = globalThis.document;
            const setupMultiplayerNetwork = vi.fn();
            globalThis.window = { game: { setupMultiplayerNetwork } };
            globalThis.document = undefined; // no DOM in this test -- click-through should no-op cleanly

            const session = { roomCode: 'SECTOR-7', mode: 'pvp', isHost: true };
            await startMultiplayerRun(session);

            expect(globalThis.window.activeMultiplayerSession).toBe(session);
            expect(setupMultiplayerNetwork).toHaveBeenCalledWith(session);
        });

        it('does not throw when window.game does not exist yet', async () => {
            originalWindow = globalThis.window;
            originalDocument = globalThis.document;
            globalThis.window = {};
            globalThis.document = undefined;

            const session = { roomCode: 'SECTOR-7', mode: 'coop' };
            await expect(startMultiplayerRun(session)).resolves.toBeUndefined();
            expect(globalThis.window.activeMultiplayerSession).toBe(session);
        });
    });

    describe('clearMultiplayerSession', () => {
        it('nulls window.activeMultiplayerSession and tears down the live game instance\'s multiplayer state', () => {
            originalWindow = globalThis.window;
            const teardownMultiplayerNetwork = vi.fn();
            globalThis.window = {
                activeMultiplayerSession: { roomCode: 'STALE-ROOM', mode: 'pvp' },
                game: { teardownMultiplayerNetwork }
            };

            clearMultiplayerSession();

            expect(globalThis.window.activeMultiplayerSession).toBeNull();
            expect(teardownMultiplayerNetwork).toHaveBeenCalledTimes(1);
        });

        it('does not throw when there is no active session or game instance', () => {
            originalWindow = globalThis.window;
            globalThis.window = {};
            expect(() => clearMultiplayerSession()).not.toThrow();
            expect(globalThis.window.activeMultiplayerSession).toBeNull();
        });
    });
});
