import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { hashSeed } from './multiplayerCrashPlanner.js';

// Sprint 26: setupMultiplayerNetwork's world-generation seed sync. Found
// investigating stable cross-client enemy IDs (a separate, not-yet-built
// feature): chunk/enemy generation is fully deterministic given identical
// (chunkX, chunkY, runEntropy, globalSeedOffset) inputs, but the match seed
// broadcast identically to every client via matchDeploy/matchStarted was
// never actually plugged into world generation -- runEntropy defaulted to
// per-client crypto-random (fixedRunEntropy was set to false at init and
// never flipped true anywhere), so two clients in the same match have been
// generating different worlds this whole time. Tests call the real method
// via .call() against a synthetic `this`, same pattern as
// threeGame.teardownMultiplayerNetwork.test.js, since constructing a real
// ThreeGame needs a live WebGL context.
describe('ThreeGame.setupMultiplayerNetwork world-seed sync', () => {
    function buildFakeGameInstance() {
        return {
            player: null,
            scene: { add: () => {} },
            remotePlayers: new Map(),
            fixedRunEntropy: false,
            globalSeedOffset: 0,
            runEntropy: 12345 // pretend a prior solo run left a real value here
        };
    }

    it('pins fixedRunEntropy and derives globalSeedOffset from the match seed when the session has one', () => {
        const fake = buildFakeGameInstance();
        const session = { mode: 'coop', roomCode: 'SECTOR-7', seed: 'SECTOR-7', isHost: true };

        ThreeGame.prototype.setupMultiplayerNetwork.call(fake, session);

        expect(fake.fixedRunEntropy).toBe(true);
        expect(fake.globalSeedOffset).toBe(hashSeed('SECTOR-7') | 0);
    });

    it('two sessions with the same seed produce the identical globalSeedOffset (the whole point)', () => {
        const fakeA = buildFakeGameInstance();
        const fakeB = buildFakeGameInstance();
        const session = { mode: 'pvp', roomCode: 'ALPHA-9', seed: 'ALPHA-9', isHost: false };

        ThreeGame.prototype.setupMultiplayerNetwork.call(fakeA, session);
        ThreeGame.prototype.setupMultiplayerNetwork.call(fakeB, { ...session });

        expect(fakeA.globalSeedOffset).toBe(fakeB.globalSeedOffset);
        expect(fakeA.fixedRunEntropy).toBe(fakeB.fixedRunEntropy);
    });

    it('different room codes/seeds produce different globalSeedOffset values (match-to-match variety)', () => {
        const fakeA = buildFakeGameInstance();
        const fakeB = buildFakeGameInstance();

        ThreeGame.prototype.setupMultiplayerNetwork.call(fakeA, { mode: 'coop', seed: 'ROOM-ONE' });
        ThreeGame.prototype.setupMultiplayerNetwork.call(fakeB, { mode: 'coop', seed: 'ROOM-TWO' });

        expect(fakeA.globalSeedOffset).not.toBe(fakeB.globalSeedOffset);
    });

    it('leaves fixedRunEntropy/globalSeedOffset untouched when the session has no seed (backward compatible)', () => {
        const fake = buildFakeGameInstance();
        fake.fixedRunEntropy = false;
        fake.globalSeedOffset = 42;

        ThreeGame.prototype.setupMultiplayerNetwork.call(fake, { mode: 'coop', roomCode: 'SECTOR-7' });

        expect(fake.fixedRunEntropy).toBe(false);
        expect(fake.globalSeedOffset).toBe(42);
    });

    it('does nothing at all (including no seed sync) when there is no session', () => {
        const fake = buildFakeGameInstance();
        ThreeGame.prototype.setupMultiplayerNetwork.call(fake, null);

        expect(fake.fixedRunEntropy).toBe(false);
        expect(fake.globalSeedOffset).toBe(0);
    });
});
