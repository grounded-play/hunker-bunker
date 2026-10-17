import { describe, expect, it } from 'vitest';
import {
    ArcadeGameState,
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
