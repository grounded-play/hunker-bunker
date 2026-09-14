import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

describe('health voice trigger semantics', () => {
    let game;
    let playVoiceCallout;

    beforeEach(() => {
        playVoiceCallout = vi.fn();
        vi.stubGlobal('window', {
            AudioManager: { play: vi.fn(), playVoiceCallout },
            dispatchEvent: vi.fn(),
            CustomEvent: class CustomEvent {
                constructor(type, init) { this.type = type; this.detail = init?.detail; }
            }
        });
        game = {
            takeDamage: ThreeGame.prototype.takeDamage,
            playerVitals: { hp: 100, maxHp: 100 },
            playerShieldMax: 0,
            playerShieldHp: 0,
            runOverclocks: [],
            runRelics: [],
            godMode: false,
            noclip: false,
            cinematicLock: false,
            isInPocket: false,
            isPlayerDead: false,
            isPlayerDowned: false,
            playerType: 'SCOUT',
            blockChance: 0,
            emitHealthState: vi.fn(),
            handleDeath: vi.fn()
        };
    });

    afterEach(() => vi.unstubAllGlobals());

    it('announces HP critical only on a downward 25-percent crossing', () => {
        game.takeDamage(74, 'hazard');
        expect(playVoiceCallout).not.toHaveBeenCalled();
        game.takeDamage(2, 'hazard');
        game.takeDamage(2, 'hazard');
        expect(playVoiceCallout).toHaveBeenCalledTimes(1);
        expect(playVoiceCallout).toHaveBeenCalledWith('low_health');
    });

    it('announces shield critical independently without misreporting low HP', () => {
        game.playerShieldMax = 100;
        game.playerShieldHp = 30;
        game.takeDamage(10, 'enemy-projectile');
        expect(playVoiceCallout).toHaveBeenCalledTimes(1);
        expect(playVoiceCallout).toHaveBeenCalledWith('shield_critical');
        expect(game.playerVitals.hp).toBe(100);
    });
});
