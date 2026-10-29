import { describe, expect, it, vi } from 'vitest';
import {
    ARCADE_INPUT,
    ARCADE_INITIALS_CUTOFF,
    ARCADE_SIMULATION,
    ArcadeCabinetController,
    ArcadeGameState,
    advanceArcadeSimulation,
    applyArcadeInput,
    readArcadePad,
    DEFAULT_LEADERBOARD,
    getArcadeHighScores,
    isQualifyingHighScore,
    recordArcadeHighScore,
    TINA_HIGH_SCORE
} from './arcadeCabinetMinigame.js';

class MockStorage {
    constructor() {
        this.data = new Map();
    }
    getItem(k) { return this.data.get(k) ?? null; }
    setItem(k, v) { this.data.set(k, String(v)); }
    clear() { this.data.clear(); }
}

describe('arcadeCabinetMinigame', () => {
    describe('High Scores & Leaderboard', () => {
        it('returns default leaderboard when storage is empty', () => {
            const storage = new MockStorage();
            const scores = getArcadeHighScores(storage);
            expect(scores).toEqual(DEFAULT_LEADERBOARD);
            expect(scores[0].initials).toBe('TINA');
            expect(scores[0].score).toBe(TINA_HIGH_SCORE);
        });

        it('correctly identifies if a score qualifies for high scores', () => {
            const storage = new MockStorage();
            expect(isQualifyingHighScore(10000, storage)).toBe(false);
            expect(isQualifyingHighScore(30000, storage)).toBe(true);
            expect(isQualifyingHighScore(120000, storage)).toBe(true);
        });

        it('records and sorts a new high score', () => {
            const storage = new MockStorage();
            const updated = recordArcadeHighScore({ initials: 'ACE', score: 95000, role: 'SCOUT' }, storage);

            expect(updated[1].initials).toBe('ACE');
            expect(updated[1].score).toBe(95000);
            expect(updated[1].rank).toBe(2);

            // Re-fetch proves persistence
            const loaded = getArcadeHighScores(storage);
            expect(loaded[1].initials).toBe('ACE');
        });

        it('caps initials at 4 uppercase chars and handles defaults', () => {
            const storage = new MockStorage();
            const updated = recordArcadeHighScore({ initials: 'longstring', score: 50000 }, storage);
            const entry = updated.find((s) => s.score === 50000);
            expect(entry.initials).toBe('LONG');
        });

        it('sanitizes corrupt persisted rows and returns detached defaults', () => {
            const storage = new MockStorage();
            storage.setItem('hb_arcade_scores_v1', JSON.stringify([
                { initials: '<b>x</b>', score: '900', role: '<script>' },
                { initials: '', score: 1000 },
                { initials: 'BAD', score: 'not-a-number' }
            ]));
            expect(getArcadeHighScores(storage)).toEqual([
                { initials: 'BXB', score: 900, role: 'SCRIPT', rank: 1 }
            ]);

            const defaults = getArcadeHighScores(new MockStorage());
            defaults[0].initials = 'NOPE';
            expect(getArcadeHighScores(new MockStorage())[0].initials).toBe('TINA');
        });

        it('offers initials only for the visible top five, not the hidden top ten', () => {
            const storage = new MockStorage();
            const ten = Array.from({ length: 10 }, (_, index) => ({
                initials: `P${index}`,
                score: 10_000 - index * 1_000,
                role: 'OPERATOR'
            }));
            storage.setItem('hb_arcade_scores_v1', JSON.stringify(ten));
            expect(ARCADE_INITIALS_CUTOFF).toBe(5);
            expect(isQualifyingHighScore(5_500, storage)).toBe(false);
            expect(isQualifyingHighScore(6_000, storage)).toBe(false);
            expect(isQualifyingHighScore(6_001, storage)).toBe(true);
        });
    });

    it('advances gameplay on a bounded fixed timestep across uneven render frames', () => {
        const sim = new ArcadeGameState();
        sim.startNewGame();
        let accumulatorSec = 0;
        for (const elapsedSec of [0.005, 0.011, 0.024, 0.01]) {
            ({ accumulatorSec } = advanceArcadeSimulation(sim, { thrust: true }, accumulatorSec, elapsedSec));
        }
        // 50ms of render time consumes exactly three 60Hz simulation ticks.
        expect(accumulatorSec).toBeCloseTo(0);
        expect(Math.hypot(sim.player.vx, sim.player.vy)).toBeGreaterThan(0);

        const stalled = advanceArcadeSimulation(sim, {}, 0, 5);
        expect(stalled.subSteps).toBe(ARCADE_SIMULATION.maxSubSteps);
        expect(stalled.accumulatorSec).toBeCloseTo(0);
    });

    describe('ArcadeGameState Simulation', () => {
        it('initializes in attract state with 3 lives and score 0', () => {
            const sim = new ArcadeGameState();
            expect(sim.state).toBe('ATTRACT');
            expect(sim.lives).toBe(3);
            expect(sim.score).toBe(0);
        });

        it('starts game and transitions to playing state with wave 1', () => {
            const sim = new ArcadeGameState();
            sim.startNewGame();
            expect(sim.state).toBe('PLAYING');
            expect(sim.wave).toBe(1);
            expect(sim.player.invulnerableMs).toBeGreaterThan(0);
        });

        it('fires bullets up to maximum capacity', () => {
            const sim = new ArcadeGameState();
            sim.startNewGame();
            for (let i = 0; i < 6; i++) {
                expect(sim.fireBullet()).toBe(true);
            }
            // 7th should be rejected
            expect(sim.fireBullet()).toBe(false);
            expect(sim.bullets.length).toBe(6);
        });

        it('spawns enemies and updates physics', () => {
            const sim = new ArcadeGameState();
            sim.startNewGame();
            sim.spawnEnemy(320, 240);
            expect(sim.enemies.length).toBe(1);

            // Ticking simulation moves enemy toward player
            const initialX = sim.enemies[0].x;
            sim.update(0.1);
            expect(sim.enemies[0].x).not.toBe(initialX);
        });
    });
});

// 2026-10-16 in-game run: the cabinet drew as a bare canvas in the corner,
// steered only on key-repeat taps, let Esc open Settings behind it, and left
// the world simulating. These pin the input model and the cabinet's input
// ownership.
describe('arcade input (held keys and gamepad)', () => {
    it('turns, thrusts and auto-fires from held input, scaled by time', () => {
        const sim = new ArcadeGameState();
        sim.startNewGame();
        const angle = sim.player.angle;
        applyArcadeInput(sim, { turn: 1, thrust: true, fire: true }, 0.1);
        expect(sim.player.angle).toBeCloseTo(angle + ARCADE_INPUT.TURN_RATE * 0.1);
        expect(Math.hypot(sim.player.vx, sim.player.vy)).toBeCloseTo(ARCADE_INPUT.THRUST_ACCEL * 0.1);
        expect(sim.bullets).toHaveLength(1);
        applyArcadeInput(sim, { fire: true }, 0.05);
        expect(sim.bullets).toHaveLength(1);
        applyArcadeInput(sim, { fire: true }, ARCADE_INPUT.FIRE_COOLDOWN_MS / 1000);
        expect(sim.bullets).toHaveLength(2);
    });

    it('ignores input outside play', () => {
        const sim = new ArcadeGameState();
        applyArcadeInput(sim, { turn: 1, thrust: true, fire: true }, 0.1);
        expect(sim.bullets).toHaveLength(0);
        expect(sim.player.vx).toBe(0);
    });

    it('reads a standard-mapping gamepad: stick or d-pad, A fires, RT thrusts, B backs out', () => {
        const buttons = Array.from({ length: 17 }, () => ({ pressed: false }));
        const pad = { axes: [-0.8, 0], buttons };
        expect(readArcadePad([null, pad])).toMatchObject({ turn: -0.8, thrust: false, fire: false, back: false });
        buttons[15].pressed = true;
        buttons[0].pressed = true;
        buttons[7] = { pressed: true, value: 1 };
        buttons[1].pressed = true;
        expect(readArcadePad([pad])).toMatchObject({ turn: 1, thrust: true, fire: true, back: true });
        expect(readArcadePad([])).toBeNull();
    });

    it('a snail killed by a bullet cannot also cost a life that frame', () => {
        const sim = new ArcadeGameState();
        sim.startNewGame();
        sim.player.invulnerableMs = 0;
        sim.enemies = [{ x: sim.player.x, y: sim.player.y, hp: 1, speed: 0, radius: 7, scoreValue: 250 }];
        sim.bullets = [{ x: sim.player.x, y: sim.player.y, vx: 0, vy: 0, lifeMs: 1000 }];
        sim.update(0.001);
        expect(sim.lives).toBe(3);
        expect(sim.score).toBe(250);
    });
});

describe('ArcadeCabinetController owns input while open', () => {
    it('captures keys before the game, swallows them, and closes on Esc / controller back', () => {
        const listeners = [];
        const previous = { window: globalThis.window, document: globalThis.document, raf: globalThis.requestAnimationFrame, caf: globalThis.cancelAnimationFrame };
        const classes = new Set(['hidden']);
        const overlay = {
            classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c) },
            querySelector: () => null
        };
        globalThis.document = { getElementById: () => overlay };
        globalThis.window = {
            addEventListener: (type, fn, opts) => listeners.push({ type, fn, opts }),
            removeEventListener: (type, fn) => {
                const i = listeners.findIndex((l) => l.type === type && l.fn === fn);
                if (i >= 0) listeners.splice(i, 1);
            }
        };
        globalThis.requestAnimationFrame = () => 1;
        globalThis.cancelAnimationFrame = () => {};
        try {
            const game = { setInputEnabled: vi.fn() };
            const controller = new ArcadeCabinetController({ game });
            controller.open();
            const down = listeners.find((l) => l.type === 'keydown');
            const up = listeners.find((l) => l.type === 'keyup');
            expect(down.opts?.capture).toBe(true);
            expect(up.opts?.capture).toBe(true);
            const key = (code, extra = {}) => ({ code, key: code, preventDefault: vi.fn(), stopImmediatePropagation: vi.fn(), ...extra });
            const tab = key('Tab');
            down.fn(tab);
            expect(tab.stopImmediatePropagation).toHaveBeenCalled();
            const f11 = key('F11');
            down.fn(f11);
            expect(f11.stopImmediatePropagation).not.toHaveBeenCalled();
            down.fn(key('KeyD'));
            expect(controller.heldInput().turn).toBe(1);
            up.fn(key('KeyD'));
            expect(controller.heldInput().turn).toBe(0);
            const esc = key('Escape');
            down.fn(esc);
            expect(esc.stopImmediatePropagation).toHaveBeenCalled();
            expect(controller.isOpen()).toBe(false);
            expect(game.setInputEnabled).toHaveBeenLastCalledWith(true);
            expect(listeners.some((l) => l.type === 'keydown' || l.type === 'keyup')).toBe(false);
        } finally {
            globalThis.window = previous.window;
            globalThis.document = previous.document;
            globalThis.requestAnimationFrame = previous.raf;
            globalThis.cancelAnimationFrame = previous.caf;
        }
    });
});

// AAA plan §7.4 / §11: rewards were promised and never paid (nothing passed
// onReward; nothing heard arcade-tina-beaten). The cabinet now announces
// every finished game once, whatever the initials screen does.
describe('arcade announces a finished game once', () => {
    it('dispatches arcade-score-recorded when play ends, not before and not twice', () => {
        const events = [];
        const previous = globalThis.window;
        globalThis.window = { dispatchEvent: (event) => events.push(event) };
        globalThis.CustomEvent ??= class CustomEvent { constructor(type, o = {}) { this.type = type; this.detail = o.detail; } };
        try {
            const controller = new ArcadeCabinetController();
            controller.gameSim.startNewGame();
            controller._announceGameEnd();
            expect(events).toHaveLength(0);
            controller.gameSim.score = 70_000;
            controller.gameSim.state = 'ENTER_INITIALS';
            controller._announceGameEnd();
            controller._announceGameEnd();
            expect(events.map((e) => [e.type, e.detail.score])).toEqual([['arcade-score-recorded', 70_000]]);
            controller.gameSim.startNewGame();
            controller._announceGameEnd();
            controller.gameSim.state = 'GAME_OVER';
            controller._announceGameEnd();
            expect(events).toHaveLength(2);
        } finally {
            globalThis.window = previous;
        }
    });
});
