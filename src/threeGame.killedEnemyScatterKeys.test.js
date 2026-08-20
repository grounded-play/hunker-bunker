import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

// Sprint 26: killedEnemyScatterKeys mirrors depletedGearPileKeys (the
// existing bunker_junk pattern) but for ordinary enemies. Found while wiring
// scatterKey as a stable cross-client entity ID -- without this, a killed
// enemy's (chunk, index, type) key got silently reissued to a fresh
// instance if the player left the chunk and came back (mountChunk has no
// memory of what already died there), which is a real respawn bug on its
// own and also a source of stale-key hit reports in multiplayer.
//
// damageSnail() is a large method with many small side-effect calls
// (VFX, audio, mission/act2 hooks); this fake `this` stubs each of those as
// a no-op so the real method can run through to its actual kill branch,
// same .call() pattern as the other threeGame.*.test.js files (no live
// WebGL context here).
describe('ThreeGame.damageSnail records killedEnemyScatterKeys on kill', () => {
    function buildFakeGameInstance() {
        return {
            isEnemyType: ThreeGame.prototype.isEnemyType,
            isSentinel: ThreeGame.prototype.isSentinel,
            isCrawler: ThreeGame.prototype.isCrawler,
            isAct2Active: () => false,
            missionState: null,
            loadoutMods: null,
            arcManager: null,
            killedEnemyScatterKeys: new Set(),
            snailsKilledThisRun: 0,
            hitstopTimer: 0,
            _recentKillTimestamps: [],
            spawnDamagePip: vi.fn(),
            _flashSnailHit: vi.fn(),
            spawnSentinelDrops: vi.fn(),
            spawnCrawlerDrops: vi.fn(),
            spawnSnailDrops: vi.fn(),
            spawnGearPoofEffect: vi.fn(),
            spawnPhysicalBurst: vi.fn(),
            spawnEnemyCorpse: vi.fn(),
            spawnPhysicalLootDrop: vi.fn()
        };
    }

    function buildFakeSprite(overrides = {}) {
        return {
            userData: {
                type: 'cybersnail',
                hp: 1,
                maxHp: 3,
                scatterKey: '4,7:2:cybersnail',
                burstTriggered: false,
                ...overrides
            },
            position: { x: 10, z: 20 }
        };
    }

    it('adds the sprite scatterKey to killedEnemyScatterKeys when a hit brings hp to 0', () => {
        vi.stubGlobal('window', { dispatchEvent: vi.fn(), AudioManager: undefined });
        try {
            const fake = buildFakeGameInstance();
            const sprite = buildFakeSprite();

            ThreeGame.prototype.damageSnail.call(fake, sprite, 5);

            expect(sprite.userData.burstTriggered).toBe(true);
            expect(fake.killedEnemyScatterKeys.has('4,7:2:cybersnail')).toBe(true);
        } finally {
            vi.unstubAllGlobals();
        }
    });

    it('does not record a key for a hit that merely wounds (does not kill) the enemy', () => {
        vi.stubGlobal('window', { dispatchEvent: vi.fn(), AudioManager: undefined });
        try {
            const fake = buildFakeGameInstance();
            const sprite = buildFakeSprite({ hp: 5, maxHp: 5 });

            ThreeGame.prototype.damageSnail.call(fake, sprite, 1);

            expect(sprite.userData.burstTriggered).toBe(false);
            expect(fake.killedEnemyScatterKeys.size).toBe(0);
        } finally {
            vi.unstubAllGlobals();
        }
    });
});
