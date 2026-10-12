import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';

describe('the rest event names its sleep cutscene', () => {
    const game = (over = {}) => Object.assign(Object.create(ThreeGame.prototype), {
        remotePlayers: new Map(),
        currentBiomeKey: 'active',
        _bondedHiveSpeedMultiplier: 1,
        act2: { getState: () => ({ infectionStage: 'latent' }) },
        ...over
    });

    it('bunker cot, camp, cryo, hive and squad', () => {
        expect(game().getSleepCutsceneStyle({ id: 'bunker_cot' })).toBe('bunker');
        expect(game().getSleepCutsceneStyle({ id: 'camp_vesper' })).toBe('camp');
        expect(game({ currentBiomeKey: 'cryo' }).getSleepCutsceneStyle({ id: 'camp_vesper' })).toBe('cryo');
        expect(game({ act2: { getState: () => ({ infectionStage: 'symptomatic' }) } }).getSleepCutsceneStyle({ id: 'bunker_cot' })).toBe('cryo');
        expect(game({ currentBiomeKey: 'bio', _bondedHiveSpeedMultiplier: 1.2 }).getSleepCutsceneStyle({ id: 'camp_tallow' })).toBe('hive');
        expect(game({ remotePlayers: new Map([['p2', {}]]) }).getSleepCutsceneStyle({ id: 'bunker_cot' })).toBe('squad');
    });
});
