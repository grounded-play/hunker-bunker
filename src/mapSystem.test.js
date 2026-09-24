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

    it('records radar scan cell discovery across radius', () => {
        const scanRes = tracker.recordRadarScan(0, 0, 30);
        expect(scanRes.scannedCount).toBeGreaterThan(1);
        expect(scanRes.newlyDiscoveredCount).toBeGreaterThan(0);
        expect(tracker.isExplored(0, 0)).toBe(true);

        const explored = tracker.getExploredCells();
        const scannedCells = explored.filter((c) => c.scanned);
        expect(scannedCells.length).toBeGreaterThan(0);
    });

    it('computes path math over scanned grid cells', () => {
        tracker.recordPlayerPosition(0, 0);
        tracker.recordPlayerPosition(15, 0);
        tracker.recordPlayerPosition(30, 0);
        tracker.recordPlayerPosition(45, 0);

        const pathResult = tracker.computeScannedPath({ x: 0, z: 0 }, { x: 45, z: 0 });
        expect(pathResult.found).toBe(true);
        expect(pathResult.path.length).toBeGreaterThanOrEqual(4);
        expect(pathResult.scannedPercentage).toBe(1.0);

        const unreachedResult = tracker.computeScannedPath({ x: 0, z: 0 }, { x: 200, z: 200 });
        expect(unreachedResult.found).toBe(false);
    });

    it('queries tile scanned and exploration state by world coordinates', () => {
        expect(tracker.isTileScanned(0, 0)).toBe(false);
        const unreachedState = tracker.getExplorationState(150, 150);
        expect(unreachedState.explored).toBe(false);
        expect(unreachedState.scanned).toBe(false);
        expect(unreachedState.roomType).toBe('unscanned_sector');

        tracker.recordPlayerPosition(0, 0);
        expect(tracker.isTileScanned(0, 0)).toBe(true);
        const exploredState = tracker.getExplorationState(2, 2);
        expect(exploredState.explored).toBe(true);
        expect(exploredState.key).toBe('0,0');
    });

    it('registers Phase 4 transit, bridge, and gate landmarks with distinct types and icons', () => {
        const transitLandmark = tracker.registerTransitTerminalLandmark({
            id: 'transit_cybersnail_arena',
            name: 'Cybersnail Arena Transit',
            position: { x: 38, z: -14 }
        });
        expect(transitLandmark.type).toBe('transit_terminal');
        expect(transitLandmark.icon).toBe('transit');
        expect(transitLandmark.priority).toBe(500);

        const bridgeLandmark = tracker.registerNaniteBridgeLandmark({
            id: 'bridge_canyon_01',
            label: 'Scout Canyon Crossing',
            position: { x: 45, z: 12 }
        });
        expect(bridgeLandmark.type).toBe('nanite_bridge');
        expect(bridgeLandmark.icon).toBe('bridge');

        const gateLandmark = tracker.registerMilestoneGateLandmark({
            id: 'gate_ring1_exit',
            label: 'Ring 1 Blast Gate',
            position: { x: 60, z: 0 }
        });
        expect(gateLandmark.type).toBe('milestone_gate');
        expect(gateLandmark.icon).toBe('gate');

        const allLandmarks = tracker.getLandmarks();
        expect(allLandmarks.some((l) => l.type === 'transit_terminal')).toBe(true);
        expect(allLandmarks.some((l) => l.type === 'nanite_bridge')).toBe(true);
        expect(allLandmarks.some((l) => l.type === 'milestone_gate')).toBe(true);
    });

    it('generates subtle objective floor breadcrumb waypoints along a valid route', () => {
        tracker.recordPlayerPosition(0, 0);
        tracker.recordPlayerPosition(15, 0);
        tracker.recordPlayerPosition(30, 0);

        const breadcrumbs = tracker.getObjectiveBreadcrumbs({ x: 0, z: 0 }, { x: 30, z: 0 }, 5.0);
        expect(breadcrumbs.length).toBeGreaterThan(0);
        expect(breadcrumbs[0].active).toBe(true);
        expect(Number.isFinite(breadcrumbs[0].x)).toBe(true);
    });
});

