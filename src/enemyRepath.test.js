import { describe, expect, it } from 'vitest';
import { shouldEnemyRepath } from './enemyRepath.js';

describe('when an enemy re-plans its path', () => {
    it('re-plans at once on a new mode or target kind, or a target that jumped', () => {
        expect(shouldEnemyRepath({ modeChanged: true, hasPath: true })).toBe(true);
        expect(shouldEnemyRepath({ goalDeltaTiles: 6, hasPath: true })).toBe(true);
    });

    it('lets a target that drifts a tile wait for the timer while mid-path', () => {
        expect(shouldEnemyRepath({ goalDeltaTiles: 1, hasPath: true })).toBe(false);
        expect(shouldEnemyRepath({ goalDeltaTiles: 1, hasPath: true, timerExpired: true })).toBe(true);
    });

    it('re-plans at the end of its path when the target has moved on', () => {
        expect(shouldEnemyRepath({ goalDeltaTiles: 1, hasPath: true, atPathEnd: true })).toBe(true);
        expect(shouldEnemyRepath({ goalDeltaTiles: 0, hasPath: true, atPathEnd: true })).toBe(false);
    });

    it('retries a failed search on the timer, not every frame', () => {
        expect(shouldEnemyRepath({ hasPath: false })).toBe(true);
        expect(shouldEnemyRepath({ hasPath: false, lastSearchFailed: true })).toBe(false);
        expect(shouldEnemyRepath({ hasPath: true, atPathEnd: true, goalDeltaTiles: 1, lastSearchFailed: true })).toBe(false);
        expect(shouldEnemyRepath({ hasPath: false, lastSearchFailed: true, timerExpired: true })).toBe(true);
    });
});
