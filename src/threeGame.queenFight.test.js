import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { createBossFight, QUEEN_FIGHT_DEF } from './bossPhases.js';

// The Queen fight routes player damage through bossPhases.js's pure
// applyBossDamage (armor/weakpoint math) before it ever reaches the shared
// damageSnail pipeline (hp bookkeeping, death VFX, drops, enemy-killed
// dispatch). The two hp pools — fight.hp (bossPhases) and
// sprite.userData.hp (damageSnail) — must stay in lockstep, since damageSnail
// is what actually fires the kill sequence. These tests exercise that
// routing without needing a full WebGL ThreeGame instance, following the
// ThreeGame.prototype.method.call(fakeThis, ...) pattern established for
// other pure-logic methods in this file (see threeGame.holeTiles.test.js).

function makeQueenSprite() {
    return {
        position: { x: 0, z: 0 },
        material: { color: { setHex: () => {} } },
        userData: {
            type: 'boss_queen',
            isBoss: true,
            hp: QUEEN_FIGHT_DEF.maxHp,
            maxHp: QUEEN_FIGHT_DEF.maxHp,
            burstTriggered: false,
            biomeTint: 0x8be04a,
            queenFight: createBossFight(QUEEN_FIGHT_DEF)
        }
    };
}

function makeFakeThis(overrides = {}) {
    return {
        isEnemyType: ThreeGame.prototype.isEnemyType,
        isCrawler: ThreeGame.prototype.isCrawler,
        isSentinel: ThreeGame.prototype.isSentinel,
        damageSnail: ThreeGame.prototype.damageSnail,
        isAct2Active: () => false,
        killedBosses: new Set(),
        snailsKilledThisRun: 0,
        arcManager: { recordSignal: () => {}, evaluate: () => {} },
        missionState: { type: null, status: 'inactive' },
        act2: {
            setQueenStatus: () => {},
            setEggsStatus: () => {}
        },
        queenFightSprite: overrides.sprite ?? null,
        hitstopTimer: 0,
        spawnDamagePip: () => {},
        _flashSnailHit: () => {},
        spawnGearPoofEffect: () => {},
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

describe('applyPlayerDamageToEnemy — Queen armor/weakpoint routing', () => {
    beforeEach(() => {
        originalWindow = globalThis.window;
        stubWindow();
    });
    afterEach(() => {
        globalThis.window = originalWindow;
    });

    it('applies the armored damage multiplier while no weakpoint is open, keeping fight.hp and sprite.userData.hp in lockstep', () => {
        const sprite = makeQueenSprite();
        const fakeThis = makeFakeThis({ sprite });

        ThreeGame.prototype.applyPlayerDamageToEnemy.call(fakeThis, sprite, 4);

        // armoredDamageMult is 0.25 -> 4 * 0.25 = 1 damage actually dealt
        expect(sprite.userData.queenFight.hp).toBe(QUEEN_FIGHT_DEF.maxHp - 1);
        expect(sprite.userData.hp).toBe(QUEEN_FIGHT_DEF.maxHp - 1);
    });

    it('applies full damage once a weakpoint window is open', () => {
        const sprite = makeQueenSprite();
        sprite.userData.queenFight.weakpointOpenFor = 2.0;
        const fakeThis = makeFakeThis({ sprite });

        ThreeGame.prototype.applyPlayerDamageToEnemy.call(fakeThis, sprite, 4);

        expect(sprite.userData.queenFight.hp).toBe(QUEEN_FIGHT_DEF.maxHp - 4);
        expect(sprite.userData.hp).toBe(QUEEN_FIGHT_DEF.maxHp - 4);
    });

    it('routes non-queen enemies straight through damageSnail unarmored', () => {
        const sprite = {
            position: { x: 0, z: 0 },
            material: { color: { setHex: () => {} } },
            userData: { type: 'cybersnail', isBoss: false, hp: 5, maxHp: 5, burstTriggered: false }
        };
        const fakeThis = makeFakeThis({ sprite });

        ThreeGame.prototype.applyPlayerDamageToEnemy.call(fakeThis, sprite, 2);

        expect(sprite.userData.hp).toBe(3);
    });

    it('fells the Queen exactly at 0 hp and fires the act2-milestone combat kill with the schema main.js gates on', () => {
        const sprite = makeQueenSprite();
        sprite.userData.queenFight.weakpointOpenFor = 5.0; // full damage
        const fakeThis = makeFakeThis({ sprite });

        // Grind the queen down to 0 across several full-damage hits.
        let guard = 0;
        while (sprite.userData.hp > 0 && guard < 50) {
            ThreeGame.prototype.applyPlayerDamageToEnemy.call(fakeThis, sprite, 30);
            guard += 1;
        }

        expect(sprite.userData.hp).toBe(0);
        expect(sprite.userData.queenFight.defeated).toBe(true);
        expect(fakeThis.queenFightSprite).toBe(null);

        const milestone = dispatchedEvents.find((e) => e.type === 'act2-milestone');
        expect(milestone).toBeTruthy();
        expect(milestone.detail).toMatchObject({ key: 'queenKilled', source: 'queen-fight', combat: true });
    });
});

describe('handleQueenFightEvent', () => {
    beforeEach(() => {
        originalWindow = globalThis.window;
        stubWindow();
    });
    afterEach(() => {
        globalThis.window = originalWindow;
    });

    it('dispatches a queen-phase-line event with the phase copy on phase transitions', () => {
        const sprite = makeQueenSprite();
        const fakeThis = { triggerCameraShake: () => {} };

        ThreeGame.prototype.handleQueenFightEvent.call(fakeThis, { type: 'phase', phase: 'fury' }, sprite);

        const lineEvent = dispatchedEvents.find((e) => e.type === 'queen-phase-line');
        expect(lineEvent?.detail?.text).toContain('CARRIED');
    });

    it('marks the weakpoint open/closed and re-tints the sprite', () => {
        const sprite = makeQueenSprite();
        let lastHex = null;
        sprite.material.color.setHex = (hex) => { lastHex = hex; };
        const fakeThis = { triggerCameraShake: () => {} };

        ThreeGame.prototype.handleQueenFightEvent.call(fakeThis, { type: 'weakpoint-open' }, sprite);
        expect(sprite.userData.weakpointOpen).toBe(true);
        expect(lastHex).toBe(0xffe066);

        ThreeGame.prototype.handleQueenFightEvent.call(fakeThis, { type: 'weakpoint-close' }, sprite);
        expect(sprite.userData.weakpointOpen).toBe(false);
        expect(lastHex).toBe(sprite.userData.biomeTint);
    });
});
