import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { createBossFight, SPORESNAIL_FIGHT_DEF } from './bossPhases.js';

// Sprint 22 B1: the first non-Queen boss on the phase framework. Follows
// the exact ThreeGame.prototype.method.call(fakeThis, ...) pattern
// established by src/threeGame.queenFight.test.js for exercising this kind
// of runtime routing without a full WebGL ThreeGame instance -- the fight
// object here lives on sprite.userData.sporesnailFight (attached in
// createScatterInstance) rather than a dedicated singleton tracker like the
// Queen's this.queenFightSprite, since this boss doesn't need cleanup
// wiring of its own on death.

function makeSporesnailSprite(overrides = {}) {
    return {
        parent: { add: () => {} },
        position: { x: 0, z: 0 },
        material: { color: { setHex: () => {} } },
        userData: {
            type: 'boss_sporesnail',
            isBoss: true,
            hp: SPORESNAIL_FIGHT_DEF.maxHp,
            maxHp: SPORESNAIL_FIGHT_DEF.maxHp,
            burstTriggered: false,
            biomeTint: 0x88ff88,
            scatterKey: 'test-chunk:boss:boss_sporesnail',
            sporesnailFight: createBossFight(SPORESNAIL_FIGHT_DEF),
            ...overrides.userData
        },
        ...overrides
    };
}

function makeFakeThis(overrides = {}) {
    return {
        isEnemyType: ThreeGame.prototype.isEnemyType,
        isCrawler: ThreeGame.prototype.isCrawler,
        isSentinel: ThreeGame.prototype.isSentinel,
        damageSnail: ThreeGame.prototype.damageSnail,
        handleSporesnailFightEvent: ThreeGame.prototype.handleSporesnailFightEvent,
        spawnSporesnailAdds: ThreeGame.prototype.spawnSporesnailAdds,
        isAct2Active: () => false,
        killedBosses: new Set(),
        snailsKilledThisRun: 0,
        scatterSprites: [],
        arcManager: { recordSignal: () => {}, evaluate: () => {} },
        missionState: { type: null, status: 'inactive' },
        isSnailTileWalkable: () => true,
        createScatterInstance: (placement) => ({ userData: { type: placement.type } }),
        spawnGearPoofEffect: () => {},
        spawnDamagePip: () => {},
        _flashSnailHit: () => {},
        spawnPhysicalBurst: () => {},
        spawnEnemyCorpse: () => {},
        spawnSnailDrops: () => {},
        spawnSentinelDrops: () => {},
        spawnCrawlerDrops: () => {},
        ...overrides
    };
}

let originalWindow;
let dispatchedEvents;

function stubWindow() {
    dispatchedEvents = [];
    globalThis.window = {
        dispatchEvent: (event) => dispatchedEvents.push(event),
        AudioManager: { play: () => {}, playMetalStress: () => {} }
    };
}

describe('applyPlayerDamageToEnemy — sporesnail armor/weakpoint routing', () => {
    beforeEach(() => {
        originalWindow = globalThis.window;
        stubWindow();
    });
    afterEach(() => {
        globalThis.window = originalWindow;
    });

    it('applies the gentler armored multiplier while no weakpoint is open, keeping fight.hp and sprite.userData.hp in lockstep', () => {
        const sprite = makeSporesnailSprite();
        const fakeThis = makeFakeThis();

        ThreeGame.prototype.applyPlayerDamageToEnemy.call(fakeThis, sprite, 4);

        // armoredDamageMult is 0.6 -> 4 * 0.6 = 2.4 -> rounds to 2
        expect(sprite.userData.sporesnailFight.hp).toBe(SPORESNAIL_FIGHT_DEF.maxHp - 2);
        expect(sprite.userData.hp).toBe(SPORESNAIL_FIGHT_DEF.maxHp - 2);
    });

    it('applies full damage once a weakpoint window is open', () => {
        const sprite = makeSporesnailSprite();
        sprite.userData.sporesnailFight.weakpointOpenFor = 2.0;
        const fakeThis = makeFakeThis();

        ThreeGame.prototype.applyPlayerDamageToEnemy.call(fakeThis, sprite, 4);

        expect(sprite.userData.sporesnailFight.hp).toBe(SPORESNAIL_FIGHT_DEF.maxHp - 4);
        expect(sprite.userData.hp).toBe(SPORESNAIL_FIGHT_DEF.maxHp - 4);
    });

    it('a reduced-hp sporesnail variant (hive-harvest/easy-tier, no fight object attached) routes unarmored, straight through damageSnail', () => {
        const sprite = {
            position: { x: 0, z: 0 },
            material: { color: { setHex: () => {} } },
            userData: { type: 'boss_sporesnail', isBoss: true, hp: 11, maxHp: 11, burstTriggered: false }
        };
        const fakeThis = makeFakeThis();

        ThreeGame.prototype.applyPlayerDamageToEnemy.call(fakeThis, sprite, 3);

        expect(sprite.userData.hp).toBe(8);
    });

    it('fells the boss exactly at 0 hp, same lockstep contract as the queen fight', () => {
        const sprite = makeSporesnailSprite();
        sprite.userData.sporesnailFight.weakpointOpenFor = 5.0; // full damage
        const fakeThis = makeFakeThis();

        let guard = 0;
        while (sprite.userData.hp > 0 && guard < 50) {
            ThreeGame.prototype.applyPlayerDamageToEnemy.call(fakeThis, sprite, 30);
            guard += 1;
        }

        expect(sprite.userData.hp).toBe(0);
        expect(sprite.userData.sporesnailFight.defeated).toBe(true);
    });
});

describe('handleSporesnailFightEvent', () => {
    beforeEach(() => {
        originalWindow = globalThis.window;
        stubWindow();
    });
    afterEach(() => {
        globalThis.window = originalWindow;
    });

    it('marks the weakpoint open/closed and re-tints the sprite to/from its biome tint', () => {
        const sprite = makeSporesnailSprite();
        let lastHex = null;
        sprite.material.color.setHex = (hex) => { lastHex = hex; };
        const fakeThis = {};

        ThreeGame.prototype.handleSporesnailFightEvent.call(fakeThis, { type: 'weakpoint-open' }, sprite);
        expect(sprite.userData.weakpointOpen).toBe(true);
        expect(lastHex).toBe(0xffe066);

        ThreeGame.prototype.handleSporesnailFightEvent.call(fakeThis, { type: 'weakpoint-close' }, sprite);
        expect(sprite.userData.weakpointOpen).toBe(false);
        expect(lastHex).toBe(sprite.userData.biomeTint);
    });

    it('delegates "adds" events to spawnSporesnailAdds with the event count', () => {
        const sprite = makeSporesnailSprite();
        const calls = [];
        const fakeThis = { spawnSporesnailAdds: (s, count) => calls.push({ s, count }) };

        ThreeGame.prototype.handleSporesnailFightEvent.call(fakeThis, { type: 'adds', count: 3 }, sprite);

        expect(calls).toEqual([{ s: sprite, count: 3 }]);
    });

    it('ignores "attack" events (this boss has no direct attack of its own)', () => {
        const sprite = makeSporesnailSprite();
        const fakeThis = { spawnSporesnailAdds: () => { throw new Error('should not be called'); } };
        expect(() => ThreeGame.prototype.handleSporesnailFightEvent.call(fakeThis, { type: 'attack', attack: null }, sprite))
            .not.toThrow();
    });
});

describe('spawnSporesnailAdds', () => {
    it('spawns exactly the requested count, tags each as a sporesnail add, and always plays the cue once a parent exists', () => {
        const sprite = makeSporesnailSprite();
        const created = [];
        const fakeThis = makeFakeThis({
            createScatterInstance: (placement) => {
                const minion = { userData: { type: placement.type } };
                created.push(minion);
                return minion;
            }
        });
        let audioCalls = 0;
        globalThis.window = { AudioManager: { playMetalStress: () => { audioCalls += 1; } } };

        const spawned = ThreeGame.prototype.spawnSporesnailAdds.call(fakeThis, sprite, 3);

        expect(spawned).toBe(3);
        expect(created).toHaveLength(3);
        expect(created.every((m) => m.userData.sporesnailAdd)).toBe(true);
        expect(audioCalls).toBe(1);
    });

    it('does nothing when the sprite has no parent (already removed from the scene)', () => {
        const sprite = makeSporesnailSprite({ parent: null });
        const fakeThis = makeFakeThis();
        const spawned = ThreeGame.prototype.spawnSporesnailAdds.call(fakeThis, sprite, 2);
        expect(spawned).toBe(0);
    });
});

describe('updateSporesnailFightTick', () => {
    beforeEach(() => {
        originalWindow = globalThis.window;
        stubWindow();
    });
    afterEach(() => {
        globalThis.window = originalWindow;
    });

    it('does nothing once defeated, and nothing while out of the 12-unit engagement range', () => {
        const defeatedSprite = makeSporesnailSprite();
        defeatedSprite.userData.sporesnailFight.defeated = true;
        const hpAtDefeat = defeatedSprite.userData.sporesnailFight.hp;
        const fakeThis = makeFakeThis();
        expect(() => ThreeGame.prototype.updateSporesnailFightTick.call(fakeThis, defeatedSprite, 1, 5)).not.toThrow();
        expect(defeatedSprite.userData.sporesnailFight.hp).toBe(hpAtDefeat); // no further tick applied

        const farSprite = makeSporesnailSprite();
        const hpBefore = farSprite.userData.sporesnailFight.hp;
        ThreeGame.prototype.updateSporesnailFightTick.call(fakeThis, farSprite, 100, 13);
        expect(farSprite.userData.sporesnailFight.hp).toBe(hpBefore); // no tick applied
    });

    it('escalates into phase two and opens a weakpoint once hp crosses the 45% threshold, in range', () => {
        const sprite = makeSporesnailSprite();
        sprite.userData.sporesnailFight.hp = Math.floor(SPORESNAIL_FIGHT_DEF.maxHp * 0.4);
        const fakeThis = makeFakeThis({ spawnSporesnailAdds: () => {} });

        let sawPhaseAudio = false;
        globalThis.window = {
            AudioManager: {
                play: () => {},
                playMetalStress: () => { sawPhaseAudio = true; }
            }
        };

        // Drain long enough to cross the phase-two weakpoint cadence (every 9s).
        let elapsed = 0;
        while (elapsed < 9.5) {
            ThreeGame.prototype.updateSporesnailFightTick.call(fakeThis, sprite, 0.1, 5);
            elapsed += 0.1;
        }

        expect(sprite.userData.weakpointOpen).toBe(true);
        expect(sawPhaseAudio).toBe(true);
    });
});
