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

    it('resolves the morning objective from the active objective registry', () => {
        const prevWindow = globalThis.window;
        try {
            globalThis.window = {
                objectiveRegistry: {
                    getActiveObjectives: () => [{ label: 'REPAIR O2 GENERATOR', priority: 10 }]
                }
            };
            const instance = game();
            expect(instance.getCurrentDayObjective()).toBe('REPAIR O2 GENERATOR');
        } finally {
            globalThis.window = prevWindow;
        }
    });

    it('falls back to package goal when registry has no active objective', () => {
        const prevWindow = globalThis.window;
        try {
            globalThis.window = {
                objectiveRegistry: {
                    getActiveObjectives: () => []
                }
            };
            const instance = game({
                getCurrentPackageGoal: () => 'o2Bubble',
                getPendingPackageStep: () => ({ id: 'splice_relay_nerve' })
            });
            expect(instance.getCurrentDayObjective()).toBe('O₂ OPTION — SPLICE INTO RELAY\'S SIGNAL NERVE');
        } finally {
            globalThis.window = prevWindow;
        }
    });
});
