import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { WEAPON_OVERCLOCKS, SUIT_RELICS } from './runDrops.js';

describe('Relic Lifecycle & Combat Counterplay (Astra COMBAT-01 / Bugs F3 & F6)', () => {
    let fakeGame;
    let dispatchedEvents = [];

    beforeEach(() => {
        dispatchedEvents = [];
        vi.stubGlobal('window', {
            dispatchEvent: vi.fn((e) => dispatchedEvents.push(e)),
            AudioManager: { play: vi.fn() },
            CustomEvent: class CustomEvent {
                constructor(type, init) {
                    this.type = type;
                    this.detail = init?.detail;
                }
            }
        });

        fakeGame = {
            runRelics: [],
            runOverclocks: [],
            activeSynergies: [],
            playerVitals: { hp: 100, maxHp: 100 },
            playerShieldMax: 0,
            playerShieldHp: 0,
            resetRunDrops: ThreeGame.prototype.resetRunDrops,
            equipRunDrop: ThreeGame.prototype.equipRunDrop,
            takeDamage: ThreeGame.prototype.takeDamage,
            healPlayer: vi.fn(),
            emitHealthState: vi.fn()
        };
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('F6 fix: resetRunDrops clears run relics, overclocks, and synergies and emits an event', () => {
        const glassCannon = WEAPON_OVERCLOCKS.find((o) => o.id === 'glass_cannon_core');
        const lastBreath = SUIT_RELICS.find((r) => r.id === 'last_breath');

        fakeGame.runOverclocks.push(glassCannon);
        fakeGame.runRelics.push(lastBreath);
        fakeGame.activeSynergies.push({ id: 'mock' });

        expect(fakeGame.runOverclocks).toHaveLength(1);
        expect(fakeGame.runRelics).toHaveLength(1);

        fakeGame.resetRunDrops();

        expect(fakeGame.runOverclocks).toEqual([]);
        expect(fakeGame.runRelics).toEqual([]);
        expect(fakeGame.activeSynergies).toEqual([]);
        expect(dispatchedEvents.some((e) => e.type === 'in-run-drops-reset')).toBe(true);
    });

    it('F3 fix: takeDamage multiplies incoming damage when glass_cannon_core is equipped', () => {
        const glassCannon = WEAPON_OVERCLOCKS.find((o) => o.id === 'glass_cannon_core');

        // Baseline: 20 damage without glass cannon -> 100 - 20 = 80 HP
        fakeGame.takeDamage(20, { reason: 'cybersnail' });
        expect(fakeGame.playerVitals.hp).toBe(80);

        // Equip glass cannon (takenDamageMult: 1.5)
        fakeGame.runOverclocks.push(glassCannon);

        // Next hit: 20 damage * 1.5 = 30 damage -> 80 - 30 = 50 HP
        fakeGame.takeDamage(20, { reason: 'cybersnail' });
        expect(fakeGame.playerVitals.hp).toBe(50);
    });
});
