import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { Act2Manager } from './act2.js';

beforeEach(() => {
    vi.stubGlobal('window', {
        dispatchEvent: vi.fn(),
        AudioManager: {
            play: vi.fn(),
            playVoiceCallout: vi.fn()
        }
    });
});

afterEach(() => {
    vi.unstubAllGlobals();
});

function createMockCombatGame({ act2Active = true, relics = [] } = {}) {
    const act2 = new Act2Manager();
    if (act2Active) {
        act2.begin();
    }

    const game = {
        act2,
        isAct2Active: () => act2Active,
        isPlayerDead: false,
        isPlayerDowned: false,
        performanceProfile: 'gameplay',
        godMode: false,
        noclip: false,
        cinematicLock: false,
        isInPocket: false,
        iFrameTimer: 0,
        spawnInvulnerabilityTimer: 0,
        playerVitals: { hp: 100, maxHp: 100 },
        playerShieldMax: 0,
        playerShieldHp: 0,
        runRelics: relics,
        runOverclocks: [],
        player: { position: { x: 0, y: 0, z: 0 } },
        bunkerDirector: { notifyThreat: vi.fn() },
        triggerCameraShake: vi.fn(),
        emitHealthState: vi.fn(),
        markCombatActivity: vi.fn(),
        takeDamage: ThreeGame.prototype.takeDamage
    };

    return { game, act2 };
}

describe('Act 2 combat hazards and infection load', () => {
    it('increases infection load when taking crawler or spore damage in Act 2', () => {
        const { game, act2 } = createMockCombatGame();
        const initialLoad = act2.getState().infectionLoad;
        expect(initialLoad).toBe(0);

        game.takeDamage(5, 'crawler');
        expect(act2.getState().infectionLoad).toBe(3);
        expect(act2.getState().humanity).toBe(97);

        game.takeDamage(5, 'caustic_spit');
        expect(act2.getState().infectionLoad).toBe(6);
    });

    it('reduces infection gain when operator equips spore filter relic', () => {
        const { game, act2 } = createMockCombatGame({
            relics: [{ id: 'spore_filter', name: 'Spore Filter' }]
        });

        game.takeDamage(5, 'spore_cloud');
        expect(act2.getState().infectionLoad).toBe(1);
    });

    it('imposes high infection load from queen psychic attacks', () => {
        const { game, act2 } = createMockCombatGame();

        game.takeDamage(10, 'queen-shockwave');
        expect(act2.getState().infectionLoad).toBe(10);
        expect(act2.getState().humanity).toBe(90);
    });

    it('transitions infection stage and dispatches event when crossing threshold', () => {
        const { game, act2 } = createMockCombatGame();
        expect(act2.getState().infectionStage).toBe('latent');

        // Deal damage until infection load reaches strained threshold (>25)
        for (let i = 0; i < 9; i += 1) {
            game.takeDamage(2, 'crawler');
        }

        expect(act2.getState().infectionLoad).toBe(27);
        expect(act2.getState().infectionStage).toBe('strained');
        expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
            type: 'infection-stage-changed',
            detail: expect.objectContaining({ stage: 'strained', load: 27 })
        }));
        expect(window.AudioManager.play).toHaveBeenCalledWith('ui_scan_ping', expect.objectContaining({ playbackRate: 0.6 }));
    });

    it('does not alter infection load when Act 2 is dormant or inactive', () => {
        const { game, act2 } = createMockCombatGame({ act2Active: false });
        game.takeDamage(10, 'crawler');
        expect(act2.getState().infectionLoad).toBe(0);
    });
});
