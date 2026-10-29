import { describe, expect, it } from 'vitest';
import { createRemoteMotionDiagnostics } from './remoteMotionDiagnostics.js';

describe('bounded remote motion evidence', () => {
    it('separates ordinary target lag, hard snaps, and stale packet gaps', () => {
        const motion = createRemoteMotionDiagnostics();
        motion.sample('player', 0.4, 33, 1000);
        motion.sample('player', 0.8, 600, 1600);
        motion.sample('companion', 8, 100, 1700);
        motion.snap('companion', 8, 1700);
        expect(motion.flush(10999)).toBeNull();
        expect(motion.flush(11000)).toEqual({
            intervalMs: 10000, snapThresholdU: 6, staleThresholdMs: 500,
            player: { samples: 2, targetErrorMeanU: 0.6, targetErrorMaxU: 0.8, packetGapMaxMs: 600, stalePacketGaps: 1, hardSnaps: 0, hardSnapMaxU: 0 },
            companion: { samples: 1, targetErrorMeanU: 8, targetErrorMaxU: 8, packetGapMaxMs: 100, stalePacketGaps: 0, hardSnaps: 1, hardSnapMaxU: 8 }
        });
        expect(motion.flush(22000)).toBeNull();
    });

    it('flushes a short last window once at teardown without carrying it to another run', () => {
        const motion = createRemoteMotionDiagnostics();
        motion.snap('player', 12, 100);
        expect(motion.flush(200, { force: true })).toMatchObject({ intervalMs: 100, player: { samples: 0, targetErrorMeanU: null, hardSnaps: 1, hardSnapMaxU: 12 } });
        expect(motion.flush(300, { force: true })).toBeNull();
        motion.sample('player', 1, 50, 400);
        expect(motion.flush(500, { force: true })).toMatchObject({ player: { samples: 1, hardSnaps: 0 } });
    });

    it('ignores invalid coordinates, unknown kinds, and sub-threshold snaps', () => {
        const motion = createRemoteMotionDiagnostics();
        motion.sample('player', NaN, 12, 100);
        motion.sample('unknown', 4, 12, 100);
        motion.snap('companion', 6, 100);
        motion.snap('player', Infinity, 100);
        expect(motion.flush(20000)).toBeNull();
    });
});
