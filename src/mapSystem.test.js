import { describe, it, expect, beforeEach } from 'vitest';
import { ExplorationTracker, worldToGrid, gridToWorld } from './mapSystem.js';

describe('ExplorationTracker & Map Helpers', () => {
    let tracker;

    beforeEach(() => {
        tracker = new ExplorationTracker({ cellSize: 15 });
    });

    it('converts world coordinates to grid cell coordinates correctly', () => {
        const { gx, gz, key } = worldToGrid(0, 0, 15);
        expect(gx).toBe(0);
        expect(gz).toBe(0);
        expect(key).toBe('0,0');

        const pos2 = worldToGrid(32, -40, 15);
        expect(pos2.gx).toBe(2);
        expect(pos2.gz).toBe(-3);
        expect(pos2.key).toBe('2,-3');
    });

    it('converts grid cell coordinates back to world coordinates', () => {
        const worldPos = gridToWorld(2, -3, 15);
        expect(worldPos.x).toBe(30);
        expect(worldPos.z).toBe(-45);
    });

    it('records player position and tracks unique cell discovery', () => {
        const res1 = tracker.recordPlayerPosition(0, 0);
        expect(res1.newlyDiscovered).toBe(true);
        expect(res1.currentKey).toBe('0,0');

        const res2 = tracker.recordPlayerPosition(2, 2);
        expect(res2.changedCell).toBe(false);
        expect(res2.newlyDiscovered).toBe(false);

        const res3 = tracker.recordPlayerPosition(20, 20);
        expect(res3.changedCell).toBe(true);
        expect(res3.newlyDiscovered).toBe(true);

        expect(tracker.getExploredCells()).toHaveLength(2);
        expect(tracker.isExplored(0, 0)).toBe(true);
        expect(tracker.isExplored(1, 1)).toBe(true);
        expect(tracker.isExplored(5, 5)).toBe(false);
    });

    it('registers, manages, and filters active landmarks including default Home Base', () => {
        const initialLandmarks = tracker.getLandmarks();
        expect(initialLandmarks).toHaveLength(1);
        expect(initialLandmarks[0].id).toBe('home_base');

        tracker.registerLandmark('camp_meridian', { x: 100, z: -50, label: 'Camp Meridian', type: 'camp' });
        tracker.registerLandmark('hive_alpha', { x: -80, z: 120, label: 'Hive Site Alpha', type: 'hive' });

        const landmarks = tracker.getLandmarks();
        expect(landmarks).toHaveLength(3);

        tracker.removeLandmark('hive_alpha');
        expect(tracker.getLandmarks()).toHaveLength(2);
    });

    it('resets state cleanly and re-initializes Home Base', () => {
        tracker.recordPlayerPosition(0, 0);
        tracker.registerLandmark('test', { x: 10, z: 10 });
        expect(tracker.getExploredCells()).toHaveLength(1);

        tracker.reset();
        expect(tracker.getExploredCells()).toHaveLength(0);
        expect(tracker.getLandmarks()).toHaveLength(1);
        expect(tracker.getLandmarks()[0].id).toBe('home_base');
        expect(tracker.getStats().totalExplored).toBe(0);
    });

    it('calculates explored cell bounds correctly', () => {
        expect(tracker.getExploredBounds()).toEqual({ minGx: -4, maxGx: 4, minGz: -4, maxGz: 4 });

        tracker.recordPlayerPosition(0, 0);
        tracker.recordPlayerPosition(60, -45);

        const bounds = tracker.getExploredBounds();
        expect(bounds.minGx).toBe(0);
        expect(bounds.maxGx).toBe(4);
        expect(bounds.minGz).toBe(-3);
        expect(bounds.maxGz).toBe(0);
    });
});
