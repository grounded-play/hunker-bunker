import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

function game(overrides = {}) {
    return {
        isPlayerDead: false,
        isPlayerDowned: false,
        playerVitals: { hp: 5, maxHp: 10 },
        playerPoisonTimer: 0,
        takeDamage: vi.fn(() => true),
        healPlayer(amount) { this.playerVitals.hp = Math.min(this.playerVitals.maxHp, this.playerVitals.hp + amount); },
        isAct2Active: () => true,
        ...overrides,
        applyWorldEmitterPayload: ThreeGame.prototype.applyWorldEmitterPayload
    };
}

describe('ThreeGame world emitter payload adapter', () => {
    it('routes directional damage through the normal damage API', () => {
        const subject = game();
        expect(subject.applyWorldEmitterPayload(
            { kind: 'damage', amount: 2, reason: 'steam-burn' },
            null,
            { x: 3, z: 4 }
        )).toBe(true);
        expect(subject.takeDamage).toHaveBeenCalledWith(2, 'steam-burn', 3, 4);
    });

    it('applies infection without manufacturing an HP hit', () => {
        let load = 10;
        const subject = game({
            act2: {
                getState: () => ({ infectionLoad: load }),
                addInfection: (amount) => { load += amount; }
            }
        });
        expect(subject.applyWorldEmitterPayload({ kind: 'infect', amount: 3 })).toBe(true);
        expect(load).toBe(13);
        expect(subject.takeDamage).not.toHaveBeenCalled();
    });

    it('guards Act 2 effects and supports poison, healing, and cleanse', () => {
        const dormant = game({ isAct2Active: () => false, act2: {} });
        expect(dormant.applyWorldEmitterPayload({ kind: 'infect', amount: 2 })).toBe(false);

        let load = 8;
        const subject = game({
            act2: {
                getState: () => ({ infectionLoad: load }),
                adjustInfectionLoad: (amount) => { load = Math.max(0, load + amount); }
            }
        });
        expect(subject.applyWorldEmitterPayload({ kind: 'heal', amount: 3 })).toBe(true);
        expect(subject.playerVitals.hp).toBe(8);
        expect(subject.applyWorldEmitterPayload({ kind: 'poison', duration: 2.5 })).toBe(true);
        expect(subject.playerPoisonTimer).toBe(2.5);
        expect(subject.applyWorldEmitterPayload({ kind: 'cleanse', amount: 5 })).toBe(true);
        expect(load).toBe(3);
    });
});
