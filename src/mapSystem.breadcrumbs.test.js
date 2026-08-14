import { describe, expect, it } from 'vitest';
import { ExplorationTracker } from './mapSystem.js';

describe('ExplorationTracker Breadcrumb Journey Trail', () => {
    it('records consecutive movement into breadcrumb trail', () => {
        const tracker = new ExplorationTracker();
        expect(tracker.getBreadcrumbTrail()).toEqual([]);

        tracker.recordPlayerPosition(0, 0);
        expect(tracker.getBreadcrumbTrail().length).toBe(1);
        expect(tracker.getBreadcrumbTrail()[0].x).toBe(0);
        expect(tracker.getBreadcrumbTrail()[0].z).toBe(0);

        // Sub-threshold movement (< 1.5m) does not create duplicate points
        tracker.recordPlayerPosition(0.2, 0.3);
        expect(tracker.getBreadcrumbTrail().length).toBe(1);

        // Significant movement (>= 1.5m) appends new waypoint
        tracker.recordPlayerPosition(2.5, 0);
        expect(tracker.getBreadcrumbTrail().length).toBe(2);
        expect(tracker.getBreadcrumbTrail()[1].x).toBe(2.5);

        tracker.recordPlayerPosition(5.0, 4.0);
        expect(tracker.getBreadcrumbTrail().length).toBe(3);
    });

    it('caps breadcrumbs at maxTrailPoints without memory leak', () => {
        const tracker = new ExplorationTracker({ maxTrailPoints: 5 });
        for (let i = 0; i < 20; i++) {
            tracker.recordPlayerPosition(i * 2.0, 0);
        }
        const trail = tracker.getBreadcrumbTrail();
        expect(trail.length).toBe(5);
        expect(trail[trail.length - 1].x).toBe(38);
    });

    it('resets trail cleanly on tracker reset', () => {
        const tracker = new ExplorationTracker();
        tracker.recordPlayerPosition(10, 10);
        tracker.recordPlayerPosition(20, 20);
        expect(tracker.getBreadcrumbTrail().length).toBe(2);

        tracker.reset();
        expect(tracker.getBreadcrumbTrail().length).toBe(0);
    });
});
