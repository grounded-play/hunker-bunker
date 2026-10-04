import { describe, expect, it } from 'vitest';
import { sessionLogFindings } from './session-log-findings.mjs';

describe('one-sided session evidence', () => {
    it('flags repeated joins and stale avatars without a reconnect keyword', () => {
        const result = sessionLogFindings({
            entries: [
                { message: 'relay-join-sent {}' }, { message: 'relay-join-sent {}' },
                { message: 'relay-roster-received {"players":[{"isHost":true}]}' },
                { message: 'player-damaged {"reason":"poison"}' }
            ],
            performanceTimeline: { samples: [{ activity: { remotePlayers: 2 } }] },
            state: { performance: { frameIntervals: { profiles: { gameplay: { averageMs: 58.51, p95Ms: 76.5 } } } } }
        });
        expect(result).toMatchObject({ repeatedJoins: true, possibleStaleAvatars: true, approximateFps: 17.1, hitConfirmations: 0 });
        expect(result.damageReasons).toEqual({ poison: 1 });
    });
    it('does not invent faults or measurements from missing or malformed evidence', () => {
        expect(sessionLogFindings({ entries: [{ message: 'relay-roster-received {' }] })).toMatchObject({
            possibleStaleAvatars: false, repeatedJoins: false, approximateFps: null, latestRosterSize: null
        });
    });
    it('counts captured hit rejection reasons separately from damage', () => {
        const result = sessionLogFindings({ entries: [
            { message: 'pvp-hit-rejected {"reason":"target_dead"}' },
            { message: 'pvp-hit-rejected {"reason":"target_dead"}' },
            { message: 'pvp-hit-rejected {"reason":"hit_cadence"}' }
        ] });
        expect(result.hitRejectionReasons).toEqual({ target_dead: 2, hit_cadence: 1 });
        expect(result.damageReasons).toEqual({});
    });
});
