import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { SUIT_RELICS } from './runDrops.js';

// docs/design/one-more-ring-design-pillars.md item 2 (Sprint 28): the last of
// the 8 transformative relics wired to real gameplay hooks. Same
// Function.prototype.call() pattern as threeGame.classPassips.test.js's own
// takeDamage fixture (no live WebGL context here).
describe('Queen\'s Milk (alien-contact heal / human-heal backlash)', () => {
    const queensMilk = SUIT_RELICS.find((r) => r.id === 'queens_milk');

    let originalWindow;
    beforeEach(() => {
        originalWindow = globalThis.window;
        globalThis.window = { dispatchEvent: () => {}, AudioManager: { play: () => {} } };
    });
    afterEach(() => {
        globalThis.window = originalWindow;
    });

    function makeFakeThis(overrides = {}) {
        return {
            isPlayerDead: false,
            godMode: false,
            cinematicLock: false,
            isInPocket: false,
            iFrameTimer: 0,
            missionState: { status: 'active' },
            playerVitals: { hp: 3, maxHp: 10 },
            playerType: 'SCOUT',
            blockChance: 0,
            runRelics: [],
            showDirectionalHitIndicator: () => {},
            triggerCameraShake: () => {},
            emitHealthState: () => {},
            handleDeath: () => {},
            healPlayer: ThreeGame.prototype.healPlayer,
            takeDamage: ThreeGame.prototype.takeDamage,
            ...overrides
        };
    }

    describe('takeDamage — alien contact heal', () => {
        it('heals instead of damaging on a genuine alien-contact reason when equipped', () => {
            const fakeThis = makeFakeThis({ runRelics: [queensMilk] });
            const result = ThreeGame.prototype.takeDamage.call(fakeThis, 2, 'crawler');
            expect(result).toBe(false);
            expect(fakeThis.playerVitals.hp).toBe(8); // 3 + 5 (alienHealAmount)
        });

        it('applies normal damage on a non-contact reason even when equipped', () => {
            const fakeThis = makeFakeThis({ runRelics: [queensMilk] });
            ThreeGame.prototype.takeDamage.call(fakeThis, 2, 'enemy-projectile');
            expect(fakeThis.playerVitals.hp).toBe(1);
        });

        it('applies normal damage on a contact reason when not equipped', () => {
            const fakeThis = makeFakeThis({ runRelics: [] });
            ThreeGame.prototype.takeDamage.call(fakeThis, 2, 'crawler');
            expect(fakeThis.playerVitals.hp).toBe(1);
        });

        it('does not overheal past maxHp', () => {
            const fakeThis = makeFakeThis({ runRelics: [queensMilk], playerVitals: { hp: 9, maxHp: 10 } });
            ThreeGame.prototype.takeDamage.call(fakeThis, 2, 'bio_charger');
            expect(fakeThis.playerVitals.hp).toBe(10);
        });
    });

    describe('healPlayer — human-heal backlash', () => {
        it('flips a positive heal into damage when equipped', () => {
            const fakeThis = makeFakeThis({ runRelics: [queensMilk], playerVitals: { hp: 5, maxHp: 10 } });
            ThreeGame.prototype.healPlayer.call(fakeThis, 4);
            expect(fakeThis.playerVitals.hp).toBe(3); // 5 - round(4 * 0.5)
        });

        it('heals normally when not equipped', () => {
            const fakeThis = makeFakeThis({ runRelics: [], playerVitals: { hp: 5, maxHp: 10 } });
            ThreeGame.prototype.healPlayer.call(fakeThis, 4);
            expect(fakeThis.playerVitals.hp).toBe(9);
        });
    });
});
