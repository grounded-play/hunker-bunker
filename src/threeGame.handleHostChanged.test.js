import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

// Sprint 26 goal item 5: server/relay.js now promotes a remaining connected
// player to interim host the instant the current host disconnects
// mid-match (see server/relayHostFailover.test.js), broadcasting
// 'hostChanged'. Before this, ThreeGame.isMultiplayerHost was set exactly
// once, from session.isHost at setupMultiplayerNetwork time, with no
// listener for it ever changing again -- so a promoted client's own
// enemyHitReport authority branch (applyPlayerDamageToEnemy /
// handleEnemyHitReported) stayed stuck on stale "I'm not host" state for
// the rest of the match. Uses the same .call() pattern as the other
// threeGame.*.test.js files (no live WebGL context here).
describe('ThreeGame.handleHostChanged', () => {
    function buildFakeGameInstance(overrides = {}) {
        return {
            isMultiplayerHost: false,
            netSocket: { id: 'my-socket-id' },
            ...overrides
        };
    }

    it('becomes host when the broadcast names this client\'s own socket id', () => {
        vi.stubGlobal('window', { showToastNotification: vi.fn() });
        try {
            const fake = buildFakeGameInstance();
            ThreeGame.prototype.handleHostChanged.call(fake, { hostId: 'my-socket-id' });
            expect(fake.isMultiplayerHost).toBe(true);
        } finally {
            vi.unstubAllGlobals();
        }
    });

    it('stays non-host when the broadcast names a different socket id', () => {
        vi.stubGlobal('window', { showToastNotification: vi.fn() });
        try {
            const fake = buildFakeGameInstance();
            ThreeGame.prototype.handleHostChanged.call(fake, { hostId: 'someone-elses-socket-id' });
            expect(fake.isMultiplayerHost).toBe(false);
        } finally {
            vi.unstubAllGlobals();
        }
    });

    it('demotes a stale local host flag when someone else is named the new host', () => {
        vi.stubGlobal('window', { showToastNotification: vi.fn() });
        try {
            const fake = buildFakeGameInstance({ isMultiplayerHost: true });
            ThreeGame.prototype.handleHostChanged.call(fake, { hostId: 'someone-elses-socket-id' });
            expect(fake.isMultiplayerHost).toBe(false);
        } finally {
            vi.unstubAllGlobals();
        }
    });

    it('is safe against a malformed/empty payload (does not throw, does not grant host)', () => {
        vi.stubGlobal('window', { showToastNotification: vi.fn() });
        try {
            const fake = buildFakeGameInstance();
            expect(() => ThreeGame.prototype.handleHostChanged.call(fake, {})).not.toThrow();
            expect(fake.isMultiplayerHost).toBe(false);
        } finally {
            vi.unstubAllGlobals();
        }
    });
});
