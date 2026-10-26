import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

describe('co-op mission authority', () => {
    beforeEach(() => {
        vi.stubGlobal('window', {
            objectiveRegistry: { trackObjective: vi.fn(), resolveObjective: vi.fn() },
            dispatchEvent: vi.fn()
        });
    });

    afterEach(() => vi.unstubAllGlobals());

    it('does not let a guest complete locally', () => {
        const game = {
            isMultiplayer: true, multiplayerMode: 'coop', isMultiplayerHost: false,
            missionState: { type: 'survey', status: 'active' },
            isMissionAuthority: ThreeGame.prototype.isMissionAuthority
        };

        expect(ThreeGame.prototype.completeMissionObjective.call(game, 'survey', 'survey_complete')).toBe(false);
        expect(game.missionState.status).toBe('active');
    });

    it('applies newer host revisions and rejects stale mission state', () => {
        const game = {
            isMultiplayerHost: false,
            missionState: { type: 'elimination', status: 'active', killCount: 0, targetKills: 3 },
            _missionStateRevision: 1,
            getMothershipUplinkReadiness: () => ({ ready: true }),
            activateExtractionGuidance: vi.fn()
        };
        const update = { revision: 2, type: 'elimination', status: 'active', killCount: 2, targetKills: 3 };

        expect(ThreeGame.prototype.applyAuthoritativeMissionState.call(game, update)).toBe(true);
        expect(game.missionState.killCount).toBe(2);
        expect(ThreeGame.prototype.applyAuthoritativeMissionState.call(game, update)).toBe(false);
        expect(game._missionStateRevision).toBe(2);
    });

    it('host completion publishes one authoritative revision', () => {
        const publishMissionState = vi.fn();
        const game = {
            isMultiplayer: true, multiplayerMode: 'coop', isMultiplayerHost: true,
            missionState: { type: 'mapping', status: 'active' },
            _missionStateRevision: 4,
            isMissionAuthority: ThreeGame.prototype.isMissionAuthority,
            getMothershipUplinkReadiness: () => ({ ready: true }),
            activateExtractionGuidance: vi.fn(),
            publishMissionState
        };

        expect(ThreeGame.prototype.completeMissionObjective.call(game, 'mapping', 'mapping_complete')).toBe(true);
        expect(game.missionState.status).toBe('objective_complete');
        expect(publishMissionState).toHaveBeenCalledWith('mapping_complete');
    });
});
