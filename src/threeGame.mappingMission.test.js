import { describe, it, expect, beforeEach } from 'vitest';
import { ExplorationTracker } from './mapSystem.js';
import { MISSION_BRIEFINGS, pickMissionBriefing } from './data/missions.js';

describe('Radar Scan Map Discovery, Path Math & Mapping Mission', () => {
    let tracker;

    beforeEach(() => {
        tracker = new ExplorationTracker({ cellSize: 15 });
    });

    it('Radar Scan captures cells within radius into ExplorationTracker', () => {
        const scanRes = tracker.recordRadarScan(0, 0, 45);
        expect(scanRes.scannedCount).toBeGreaterThan(1);
        expect(scanRes.newlyDiscoveredCount).toBeGreaterThan(0);

        const explored = tracker.getExploredCells();
        const scanned = explored.filter((c) => c.scanned);
        expect(scanned.length).toBeGreaterThan(0);
        expect(tracker.isExplored(0, 0)).toBe(true);
    });

    it('calculates scanned path connectivity between positions', () => {
        // Scan a line of cells from origin (0,0) to target (90,0)
        for (let x = 0; x <= 90; x += 15) {
            tracker.recordRadarScan(x, 0, 20);
        }

        const pathResult = tracker.computeScannedPath({ x: 0, z: 0 }, { x: 90, z: 0 });
        expect(pathResult.found).toBe(true);
        expect(pathResult.path.length).toBeGreaterThanOrEqual(6);
        expect(pathResult.scannedPercentage).toBe(1.0);
    });

    it('supports mapping mission briefing and assignment', () => {
        const briefing = pickMissionBriefing('mapping', () => 0);
        expect(briefing).toBe(MISSION_BRIEFINGS.mapping[0]);
        expect(typeof briefing).toBe('string');
    });

    it('tracks mapping mission completion state when path connects to waypoint', () => {
        const startPos = { x: 0, z: 0 };
        const relayPos = { x: 70, z: 60 };

        // Before scan: no path
        const beforeScan = tracker.computeScannedPath(startPos, relayPos);
        expect(beforeScan.found).toBe(false);

        // Perform radar scans along the corridor to the relay
        tracker.recordRadarScan(0, 0, 30);
        tracker.recordRadarScan(35, 30, 30);
        tracker.recordRadarScan(70, 60, 30);

        // After scan: path is established
        const afterScan = tracker.computeScannedPath(startPos, relayPos);
        expect(afterScan.found).toBe(true);
    });
});
