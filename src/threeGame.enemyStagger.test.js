import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { ThreeGame } from './threeGame.js';
import {
    createEnemyStaggerState,
    CRYOSNAIL_STAGGER_DEF,
    BIO_CHARGER_STAGGER_DEF,
    SENTINEL_STAGGER_DEF
} from './bossPhases.js';

function makeEnemySprite(type, def, overrides = {}) {
    let currentColor = overrides.biomeTint ?? 0x88ff88;
    const { userData: userOverrides = {}, ...restOverrides } = overrides;
    return {
        parent: { add: () => {}, remove: () => {} },
        position: { x: 0, z: 0 },
        material: {
            color: {
                getHex: () => currentColor,
                setHex: (hex) => { currentColor = hex; }
            }
        },
        ...restOverrides,
        userData: {
            type,
            isBoss: false,
            hp: 10,
            maxHp: 10,
            burstTriggered: false,
            biomeTint: 0x88ff88,
            scatterKey: `test-chunk:enemy:${type}`,
            staggerState: createEnemyStaggerState(def),
            attackCooldown: 0,
            ...userOverrides
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
        isHiveKinPassive: () => false,
        killedBosses: new Set(),
        killedEnemyScatterKeys: new Set(),
        snailsKilledThisRun: 0,
        scatterSprites: [],
        arcManager: { recordSignal: () => {}, evaluate: () => {} },
        missionState: { type: null, status: 'inactive' },
        isSnailTileWalkable: () => true,
        spawnDamagePip: () => {},
        _flashSnailHit: () => {},
        updateSheetSpriteFrame: () => {},
        faceSpriteFromDir: () => {},
        selectSnailTarget: () => ({ x: 5, z: 5, goalX: 5, goalZ: 5, mode: 'hunt', type: 'player' }),
        findSnailPath: () => [{ x: 0, z: 0 }, { x: 1, z: 1 }],
        ...overrides
    };
}

let originalWindow;
let dispatchedEvents;
let playedAudio;

function stubWindow() {
    dispatchedEvents = [];
    playedAudio = [];
    globalThis.window = {
        dispatchEvent: (event) => dispatchedEvents.push(event),
        AudioManager: {
            play: (name, opts) => playedAudio.push({ name, opts }),
            playMetalStress: () => {}
        }
    };
}

describe('Runtime Enemy Stagger — applyPlayerDamageToEnemy', () => {
    beforeEach(() => {
        originalWindow = globalThis.window;
        stubWindow();
    });
    afterEach(() => {
        globalThis.window = originalWindow;
    });

    it('routes cryosnail damage through staggerState, applying armored reduction on first hit', () => {
        const sprite = makeEnemySprite('cryosnail', CRYOSNAIL_STAGGER_DEF, { userData: { hp: 4, maxHp: 4 } });
        const fakeThis = makeFakeThis();

        // Cryosnail armoredDamageMult is 0.5; hit with 1 damage -> 1 * 0.5 = 0.5 -> 1 dealt
        ThreeGame.prototype.applyPlayerDamageToEnemy.call(fakeThis, sprite, 1);
        expect(sprite.userData.hp).toBe(3);
        expect(sprite.userData.staggerState.poise).toBe(1);
        expect(sprite.userData.staggerState.staggered).toBe(false);
    });

    it('triggers stagger window on sustained damage, updating color and dispatching enemy-staggered event', () => {
        const sprite = makeEnemySprite('cryosnail', CRYOSNAIL_STAGGER_DEF, { userData: { hp: 4, maxHp: 4 } });
        const fakeThis = makeFakeThis();

        // Hit 1: 1 dmg -> poise 1
        ThreeGame.prototype.applyPlayerDamageToEnemy.call(fakeThis, sprite, 1);
        expect(dispatchedEvents.some((e) => e.type === 'enemy-staggered')).toBe(false);

        // Hit 2: 1 dmg -> poise 2 >= threshold (2) -> triggers stagger!
        ThreeGame.prototype.applyPlayerDamageToEnemy.call(fakeThis, sprite, 1);
        expect(sprite.userData.staggerState.staggered).toBe(true);
        expect(sprite.material.color.getHex()).toBe(CRYOSNAIL_STAGGER_DEF.staggerColor);
        expect(dispatchedEvents.some((e) => e.detail?.type === 'cryosnail')).toBe(true);
        expect(playedAudio.some((a) => a.name === 'ui_scan_ping')).toBe(true);
    });

    it('deals bonus weakpoint damage while cryosnail is staggered', () => {
        const sprite = makeEnemySprite('cryosnail', CRYOSNAIL_STAGGER_DEF, { userData: { hp: 10, maxHp: 10 } });
        const fakeThis = makeFakeThis();

        // Stagger enemy
        ThreeGame.prototype.applyPlayerDamageToEnemy.call(fakeThis, sprite, 2);
        expect(sprite.userData.staggerState.staggered).toBe(true);

        // Weakpoint hit: 2 raw * 1.5 = 3 dealt
        const previousHp = sprite.userData.hp;
        ThreeGame.prototype.applyPlayerDamageToEnemy.call(fakeThis, sprite, 2);
        expect(previousHp - sprite.userData.hp).toBe(3);
    });

    it('handles bio_charger stagger with 3-damage threshold', () => {
        const sprite = makeEnemySprite('bio_charger', BIO_CHARGER_STAGGER_DEF, { userData: { hp: 8, maxHp: 8 } });
        const fakeThis = makeFakeThis();

        // Hit 1: 2 dmg -> poise 2 < 3
        ThreeGame.prototype.applyPlayerDamageToEnemy.call(fakeThis, sprite, 2);
        expect(sprite.userData.staggerState.staggered).toBe(false);

        // Hit 2: 1 dmg -> poise 3 >= 3 -> triggers stagger!
        ThreeGame.prototype.applyPlayerDamageToEnemy.call(fakeThis, sprite, 1);
        expect(sprite.userData.staggerState.staggered).toBe(true);
    });

    it('handles sentinel stagger with 2-damage threshold', () => {
        const sprite = makeEnemySprite('sentinel', SENTINEL_STAGGER_DEF, { userData: { hp: 6, maxHp: 6 } });
        const fakeThis = makeFakeThis();

        ThreeGame.prototype.applyPlayerDamageToEnemy.call(fakeThis, sprite, 2);
        expect(sprite.userData.staggerState.staggered).toBe(true);
    });
});

describe('Runtime Enemy Stagger — Behavior suppression', () => {
    beforeEach(() => {
        originalWindow = globalThis.window;
        stubWindow();
    });
    afterEach(() => {
        globalThis.window = originalWindow;
    });

    it('updateSnailBehavior suppresses cryosnail movement and attacks while staggered, restoring tint on recovery', () => {
        const sprite = makeEnemySprite('cryosnail', CRYOSNAIL_STAGGER_DEF, {
            userData: {
                hp: 4,
                speed: 1.0,
                pathNodes: [{ x: 0, z: 0 }, { x: 2, z: 2 }],
                pathIndex: 1,
                biomeTint: 0x88ff88
            }
        });
        const fakeThis = makeFakeThis({
            player: { position: { x: 0, z: 0 } },
            isPlayerDead: false
        });

        // Trigger stagger
        sprite.userData.staggerState.staggered = true;
        sprite.userData.staggerState.staggerTimer = 2.0;
        sprite.material.color.setHex(0xffe066);

        const startX = sprite.position.x;
        const startZ = sprite.position.z;

        // Tick 0.5s while staggered: should return early and not move
        ThreeGame.prototype.updateSnailBehavior.call(fakeThis, sprite, 0.5, null);
        expect(sprite.position.x).toBe(startX);
        expect(sprite.position.z).toBe(startZ);
        expect(sprite.userData.staggerState.staggerTimer).toBeCloseTo(1.5, 2);

        // Tick remaining 1.6s to expire stagger
        ThreeGame.prototype.updateSnailBehavior.call(fakeThis, sprite, 1.6, null);
        expect(sprite.userData.staggerState.staggered).toBe(false);
        expect(sprite.material.color.getHex()).toBe(0x88ff88);
    });

    it('updateChargerOrStalkerBehavior halts bio_charger velocity while staggered', () => {
        const sprite = makeEnemySprite('bio_charger', BIO_CHARGER_STAGGER_DEF, {
            userData: {
                hp: 8,
                vx: 5.0,
                vz: 5.0,
                biomeTint: 0x55ff55
            }
        });
        const fakeThis = makeFakeThis({
            player: { position: { x: 10, z: 10 } },
            isPlayerDead: false
        });

        sprite.userData.staggerState.staggered = true;
        sprite.userData.staggerState.staggerTimer = 2.0;

        ThreeGame.prototype.updateChargerOrStalkerBehavior.call(fakeThis, sprite, 0.5);
        expect(sprite.userData.vx).toBe(0);
        expect(sprite.userData.vz).toBe(0);
        expect(sprite.userData.staggerState.staggerTimer).toBeCloseTo(1.5, 2);
    });

    it('updateSentinelBehavior suppresses sentinel firing while staggered', () => {
        const sprite = makeEnemySprite('sentinel', SENTINEL_STAGGER_DEF, {
            userData: {
                hp: 6,
                fireCooldown: 0.1,
                detectRadius: 10,
                active: true,
                biomeTint: 0xffdd44
            }
        });
        let fired = false;
        const fakeThis = makeFakeThis({
            player: { position: { x: 2, z: 2 } },
            fireSentinelProjectile: () => { fired = true; }
        });

        sprite.userData.staggerState.staggered = true;
        sprite.userData.staggerState.staggerTimer = 2.0;

        ThreeGame.prototype.updateSentinelBehavior.call(fakeThis, sprite, 0.5);
        expect(fired).toBe(false);
        expect(sprite.material.color.getHex()).toBe(0xffe066);
    });
});
