import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

// Sprint 26: teardownMultiplayerNetwork() is a real bug fix -- isMultiplayer
// was previously only ever set to true (in setupMultiplayerNetwork), never
// reset anywhere, so a solo run started after an earlier multiplayer match
// in the same tab (no reload) would still be treated as multiplayer by
// every isMultiplayer-gated code path. Constructing a real ThreeGame needs
// a live WebGL context (not available here, matching every other
// threeGame.*.test.js file in this repo), so this calls the real method
// against a synthetic `this` with just the fields it touches, via
// Function.prototype.call -- exercising the actual shipped implementation,
// not a reimplementation of it.
describe('ThreeGame.teardownMultiplayerNetwork', () => {
    function buildFakeGameInstance() {
        const removedMeshes = [];
        const remotePlayerMesh = { id: 'mesh-1' };
        const socketOffCalls = [];
        return {
            scene: { remove: (mesh) => removedMeshes.push(mesh) },
            remotePlayers: new Map([['peer-1', { mesh: remotePlayerMesh }]]),
            netSocket: { off: (event) => socketOffCalls.push(event) },
            isMultiplayer: true,
            multiplayerMode: 'pvp',
            multiplayerRoomCode: 'SECTOR-7',
            multiplayerCrashPlan: { players: [] },
            multiplayerLocalPlayerId: 'local-player',
            isMultiplayerHost: true,
            lastNetBroadcastTime: 12345,
            // Sprint 26: setupMultiplayerNetwork's world-seed sync (see its
            // own comment / threeGame.setupMultiplayerNetworkSeedSync.test.js)
            // pins these for the match -- teardown must undo them too, or a
            // later solo run keeps generating worlds from the stale match
            // seed forever, same leak class as the multiplayer flags above.
            fixedRunEntropy: true,
            globalSeedOffset: 987654321,
            _removedMeshes: removedMeshes,
            _socketOffCalls: socketOffCalls
        };
    }

    it('resets every multiplayer flag the game instance can carry, not just the session pointer', () => {
        const fake = buildFakeGameInstance();
        ThreeGame.prototype.teardownMultiplayerNetwork.call(fake);

        expect(fake.isMultiplayer).toBe(false);
        expect(fake.multiplayerMode).toBeNull();
        expect(fake.multiplayerRoomCode).toBeNull();
        expect(fake.multiplayerCrashPlan).toBeNull();
        expect(fake.multiplayerLocalPlayerId).toBeNull();
        expect(fake.isMultiplayerHost).toBe(false);
        expect(fake.lastNetBroadcastTime).toBe(0);
    });

    it('resets the world-generation seed sync so a later solo run does not inherit the match seed', () => {
        const fake = buildFakeGameInstance();
        ThreeGame.prototype.teardownMultiplayerNetwork.call(fake);

        expect(fake.fixedRunEntropy).toBe(false);
        expect(fake.globalSeedOffset).toBe(0);
    });

    it('removes every remote player mesh from the scene and clears the map', () => {
        const fake = buildFakeGameInstance();
        ThreeGame.prototype.teardownMultiplayerNetwork.call(fake);

        expect(fake._removedMeshes).toHaveLength(1);
        expect(fake.remotePlayers.size).toBe(0);
    });

    it('unregisters every event setupMultiplayerNetwork actually subscribes and nulls the socket reference', () => {
        const fake = buildFakeGameInstance();
        ThreeGame.prototype.teardownMultiplayerNetwork.call(fake);

        // Mirrors setupMultiplayerNetwork's own .on(...) list exactly --
        // destroy()'s pre-sprint-26 inline version had silently drifted out
        // of sync with it (missing 3 of these events), leaving those
        // listeners registered on the underlying socket after "teardown."
        const expectedEvents = [
            'playerMoved', 'playerFired', 'playerDamaged', 'playerRevived',
            'playerDownedBroadcast', 'playerExtractedBroadcast', 'enemyDamaged', 'enemyHitReported',
            'playerDisconnected', 'newPlayer', 'hostChanged'
        ];
        expect(fake._socketOffCalls.sort()).toEqual([...expectedEvents].sort());
        expect(fake.netSocket).toBeNull();
    });

    it('is safe to call when there was never any multiplayer state to tear down', () => {
        const fake = { scene: { remove: vi.fn() }, remotePlayers: null, netSocket: null };
        expect(() => ThreeGame.prototype.teardownMultiplayerNetwork.call(fake)).not.toThrow();
        expect(fake.isMultiplayer).toBe(false);
    });
});
