import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

// Sprint 26 item 4: replace nearest-position enemy matching with stable
// cross-client entity IDs. scatterKey is deterministic per (chunk, spawn
// index, type) and now genuinely cross-client-stable now that world
// generation is seed-synced (see threeGame.setupMultiplayerNetworkSeedSync.test.js).
// resolveNetworkEnemySprite() tries an exact scatterKey match first and only
// falls back to the pre-existing fuzzy type+position match when the key
// isn't found locally. Uses the same Function.prototype.call() pattern as
// the other threeGame.*.test.js files (no live WebGL context here).
describe('ThreeGame.resolveNetworkEnemySprite', () => {
    function makeSprite({ scatterKey, type, x, z, burstTriggered = false }) {
        return { userData: { scatterKey, type, burstTriggered }, position: { x, z } };
    }

    // The fallback path calls this.findNearestMatchingEnemySprite -- present
    // via the prototype chain on a real ThreeGame instance, but these fakes
    // are plain objects, so wire it in explicitly.
    function withFuzzyFallback(fake) {
        fake.findNearestMatchingEnemySprite = ThreeGame.prototype.findNearestMatchingEnemySprite;
        return fake;
    }

    it('matches by exact scatterKey even when a same-type sprite sits closer to the reported position', () => {
        const near = makeSprite({ scatterKey: 'chunk:1,1:0:crawler', type: 'crawler', x: 10.1, z: 10.1 });
        const target = makeSprite({ scatterKey: 'chunk:2,2:0:crawler', type: 'crawler', x: 50, z: 50 });
        const fake = { scatterSprites: [near, target] };

        const result = ThreeGame.prototype.resolveNetworkEnemySprite.call(fake, {
            scatterKey: 'chunk:2,2:0:crawler', enemyType: 'crawler', x: 10, z: 10
        });

        expect(result).toBe(target);
    });

    it('falls back to fuzzy type+position matching when the scatterKey is not found locally', () => {
        const near = makeSprite({ scatterKey: 'chunk:9,9:0:crawler', type: 'crawler', x: 10.1, z: 10.1 });
        const fake = withFuzzyFallback({ scatterSprites: [near] });

        const result = ThreeGame.prototype.resolveNetworkEnemySprite.call(fake, {
            scatterKey: 'chunk:not-mounted-here:0:crawler', enemyType: 'crawler', x: 10, z: 10
        });

        expect(result).toBe(near);
    });

    it('falls back to fuzzy matching when the payload has no scatterKey at all (older/local caller)', () => {
        const near = makeSprite({ scatterKey: 'chunk:1,1:0:crawler', type: 'crawler', x: 10.1, z: 10.1 });
        const fake = withFuzzyFallback({ scatterSprites: [near] });

        const result = ThreeGame.prototype.resolveNetworkEnemySprite.call(fake, {
            scatterKey: null, enemyType: 'crawler', x: 10, z: 10
        });

        expect(result).toBe(near);
    });

    it('does not match a scatterKey on a sprite that already burst (dead/depleted)', () => {
        const dead = makeSprite({ scatterKey: 'chunk:1,1:0:crawler', type: 'crawler', x: 10, z: 10, burstTriggered: true });
        const fallback = makeSprite({ scatterKey: 'chunk:5,5:0:crawler', type: 'crawler', x: 10.2, z: 10.2 });
        const fake = withFuzzyFallback({ scatterSprites: [dead, fallback] });

        const result = ThreeGame.prototype.resolveNetworkEnemySprite.call(fake, {
            scatterKey: 'chunk:1,1:0:crawler', enemyType: 'crawler', x: 10, z: 10
        });

        expect(result).toBe(fallback);
    });

    it('returns null when neither exact nor fuzzy matching finds anything', () => {
        const fake = withFuzzyFallback({ scatterSprites: [] });

        const result = ThreeGame.prototype.resolveNetworkEnemySprite.call(fake, {
            scatterKey: 'chunk:1,1:0:crawler', enemyType: 'crawler', x: 10, z: 10
        });

        expect(result).toBeNull();
    });

    it('applies host enemy position and HP snapshots on a co-op guest', () => {
        const target = makeSprite({ scatterKey: 'chunk:2,2:0:crawler', type: 'crawler', x: 2, z: 3 });
        target.userData.hp = 3;
        const fake = {
            isMultiplayerHost: false,
            multiplayerMode: 'coop',
            scatterSprites: [target]
        };

        const applied = ThreeGame.prototype.handleEnemyStateSnapshot.call(fake, {
            enemies: [{
                scatterKey: 'chunk:2,2:0:crawler', enemyType: 'crawler',
                x: 12, z: 13, hp: 2, burstTriggered: false
            }]
        });

        expect(applied).toBe(true);
        expect(target.position).toMatchObject({ x: 12, z: 13 });
        expect(target.userData.hp).toBe(2);
    });

    it('forwards a validated guest hit when the enemy is outside the host mounted chunks', () => {
        const emit = vi.fn();
        const fake = {
            isMultiplayerHost: true,
            scatterSprites: [],
            netSocket: { emit },
            resolveNetworkEnemySprite: () => null
        };
        const report = {
            reporterId: 'guest-player', scatterKey: '9,9:0:crawler',
            enemyType: 'crawler', x: 100, z: 100, damage: 1
        };

        ThreeGame.prototype.handleEnemyHitReported.call(fake, report);

        expect(emit).toHaveBeenCalledWith('enemyDamage', report);
    });
});
