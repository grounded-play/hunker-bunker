import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

// The run got more roguelike (perfect-reload x1.25, overclock damageMult,
// high-ground x1.15, boss armor x0.25) and those multipliers stack on top
// of small integer base damage (1 or 2), landing on fractional values like
// 0.05 or 1.25. Every damage number shown to the player and stored in hp
// bookkeeping must be a whole number — this file locks that down at the
// two points where fractional damage is actually produced: the outgoing
// player shot, and the shared enemy-hp sink it's applied through.

function makeFakeThreeGameForShot(overrides = {}) {
    return {
        playerType: 'ENGINEER', // projectileDamage: 1
        weaponUpgradeBonuses: null,
        perfectReloadBuffTimer: 0,
        runOverclocks: [],
        player: { position: { x: 0, z: 0 } },
        getTerrainHeightAt: () => 0,
        recoilBloom: 0,
        triggerCameraShake: () => {},
        spawnProjectile: () => {},
        ...overrides
    };
}

describe('spawnPlayerShot — whole-number damage', () => {
    it('rounds up a half-point stack (2 base * 1.25 reload = 2.5) to a whole hit', () => {
        const shots = [];
        const fakeThis = makeFakeThreeGameForShot({
            playerType: 'TANK', // projectileDamage: 2
            perfectReloadBuffTimer: 1,
            spawnProjectile: (opts) => shots.push(opts)
        });

        ThreeGame.prototype.spawnPlayerShot.call(fakeThis, 1, 0);

        expect(shots.length).toBeGreaterThan(0);
        for (const shot of shots) {
            expect(Number.isInteger(shot.damage)).toBe(true);
        }
        expect(shots[0].damage).toBe(3); // 2 * 1.25 = 2.5 -> rounds up
    });

    it('never rounds a positive shot down to 0 even with a fractional overclock multiplier', () => {
        const shots = [];
        const fakeThis = makeFakeThreeGameForShot({
            playerType: 'ENGINEER', // projectileDamage: 1
            runOverclocks: [{ stats: { damageMult: 0.2 } }], // 1 * 0.2 = 0.2
            spawnProjectile: (opts) => shots.push(opts)
        });

        ThreeGame.prototype.spawnPlayerShot.call(fakeThis, 1, 0);

        expect(shots[0].damage).toBe(1);
    });

    it('stays a whole number with no active buffs', () => {
        const shots = [];
        const fakeThis = makeFakeThreeGameForShot({
            playerType: 'TANK',
            spawnProjectile: (opts) => shots.push(opts)
        });

        ThreeGame.prototype.spawnPlayerShot.call(fakeThis, 1, 0);

        expect(shots[0].damage).toBe(2);
    });
});

describe('damageSnail — whole-number damage', () => {
    let originalWindow;
    beforeEach(() => {
        originalWindow = globalThis.window;
        globalThis.window = {
            dispatchEvent: () => {},
            AudioManager: { play: () => {}, playMetalStress: () => {} }
        };
    });
    afterEach(() => {
        globalThis.window = originalWindow;
    });

    function makeSprite(hp = 10) {
        return {
            position: { x: 0, z: 0 },
            material: { color: { setHex: () => {} } },
            userData: { type: 'cybersnail', isBoss: false, hp, maxHp: hp, burstTriggered: false }
        };
    }

    function makeFakeThisForSnail(overrides = {}) {
        return {
            isEnemyType: ThreeGame.prototype.isEnemyType,
            isCrawler: ThreeGame.prototype.isCrawler,
            hitstopTimer: 0,
            spawnDamagePip: () => {},
            _flashSnailHit: () => {},
            spawnGearPoofEffect: () => {},
            spawnPhysicalBurst: () => {},
            spawnEnemyCorpse: () => {},
            spawnSnailDrops: () => {},
            spawnSentinelDrops: () => {},
            spawnCrawlerDrops: () => {},
            killedBosses: new Set(),
            snailsKilledThisRun: 0,
            arcManager: { recordSignal: () => {}, evaluate: () => {} },
            missionState: { type: null, status: 'inactive' },
            isAct2Active: () => false,
            ...overrides
        };
    }

    it('rounds a fractional incoming amount rather than truncating it to 0', () => {
        const sprite = makeSprite(10);
        const pips = [];
        const fakeThis = makeFakeThisForSnail({ spawnDamagePip: (x, z, amount) => pips.push(amount) });

        ThreeGame.prototype.damageSnail.call(fakeThis, sprite, 0.4);

        expect(Number.isInteger(sprite.userData.hp)).toBe(true);
        expect(sprite.userData.hp).toBe(9); // floored up to a minimum whole hit
        expect(pips).toEqual([1]);
    });

    it('passes whole integer damage straight through unchanged', () => {
        const sprite = makeSprite(10);
        const fakeThis = makeFakeThisForSnail();

        ThreeGame.prototype.damageSnail.call(fakeThis, sprite, 3);

        expect(sprite.userData.hp).toBe(7);
    });
});

describe('spawnDamagePip — non-numeric status text', () => {
    // fillHoleAt reuses this same pip to show a 'SEALED' status string, not a
    // damage number — rounding must not turn that into "-NaN" on screen.
    it('renders a non-numeric status string unchanged instead of rounding it to NaN', () => {
        const fillText = vi.fn();
        const originalDocument = globalThis.document;
        globalThis.document = {
            createElement: () => ({
                width: 0,
                height: 0,
                getContext: () => ({ fillStyle: '', font: '', textAlign: '', textBaseline: '', fillText })
            })
        };

        const fakeThis = { scene: { add: () => {}, remove: () => {} }, transientEffects: [] };
        ThreeGame.prototype.spawnDamagePip.call(fakeThis, 0, 0, 'SEALED');

        expect(fillText).toHaveBeenCalledWith('-SEALED', 32, 32);
        globalThis.document = originalDocument;
    });
});

describe('resolveFallDamage — whole-number, upgrade-gated', () => {
    it('returns the base fall damage when fallHardening is not unlocked', () => {
        const fakeThis = { bank: { getState: () => ({ tier2Unlocks: {} }) } };
        const damage = ThreeGame.prototype.resolveFallDamage.call(fakeThis);
        expect(Number.isInteger(damage)).toBe(true);
        expect(damage).toBe(2);
    });

    it('halves fall damage (still a whole number) when fallHardening is unlocked', () => {
        const fakeThis = { bank: { getState: () => ({ tier2Unlocks: { fallHardening: true } }) } };
        const damage = ThreeGame.prototype.resolveFallDamage.call(fakeThis);
        expect(Number.isInteger(damage)).toBe(true);
        expect(damage).toBe(1);
    });

    it('never returns less than 1 even with no bank attached', () => {
        const fakeThis = {};
        const damage = ThreeGame.prototype.resolveFallDamage.call(fakeThis);
        expect(damage).toBeGreaterThanOrEqual(1);
    });
});

describe('takeDamage — fall reason respects iFrames, abyss does not', () => {
    function makeFakeThisForTakeDamage(overrides = {}) {
        return {
            isPlayerDead: false,
            godMode: false,
            cinematicLock: false,
            _abilityImmune: false,
            iFrameTimer: 1.0,
            missionState: { status: 'active' },
            isInPocket: false,
            playerVitals: { hp: 3, maxHp: 3 },
            showDirectionalHitIndicator: () => {},
            triggerCameraShake: () => {},
            emitHealthState: () => {},
            handleDeath: () => {},
            ...overrides
        };
    }

    let originalWindow;
    beforeEach(() => {
        originalWindow = globalThis.window;
        globalThis.window = { dispatchEvent: () => {} };
    });
    afterEach(() => {
        globalThis.window = originalWindow;
    });

    it('a fall reason is blocked while iFrameTimer is active, unlike abyss', () => {
        const fallThis = makeFakeThisForTakeDamage();
        ThreeGame.prototype.takeDamage.call(fallThis, 2, 'fall');
        expect(fallThis.playerVitals.hp).toBe(3); // blocked by iFrames

        const abyssThis = makeFakeThisForTakeDamage();
        ThreeGame.prototype.takeDamage.call(abyssThis, 2, 'abyss');
        expect(abyssThis.playerVitals.hp).toBe(1); // abyss bypasses iFrames
    });

    it('blocks all damage while isInPocket is true', () => {
        const fakeThis = makeFakeThisForTakeDamage({ iFrameTimer: 0, isInPocket: true });
        ThreeGame.prototype.takeDamage.call(fakeThis, 2, 'hazard');
        expect(fakeThis.playerVitals.hp).toBe(3);
    });
});
