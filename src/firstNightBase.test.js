import { describe, expect, it } from 'vitest';
import { createCarryState, beginCarry, installCarriedObject } from './carrySystem.js';
import { evaluateRoomSealGraph } from './baseSealGraph.js';
import { ensureFirstNightBaseState, installedCot, planFirstNightBase } from './firstNightBase.js';

describe('first-night base recovery', () => {
    it('places the folded cot outside a sealed oxygenated starter berth', () => {
        const result = ensureFirstNightBaseState(createCarryState('run-a'), { shipX: 10, shipZ: 20 });
        expect(result.addedCot).toBe(true);
        expect(result.state.worldObjects[0]).toMatchObject({
            definitionId: 'cot_bed',
            missionId: 'first-night-cot-recovery',
            modelType: 'carry_field_cot_folded',
            worldPosition: { x: 15, z: 22 }
        });
        const seal = evaluateRoomSealGraph({ modules: result.state.installed, defaultSafeBubble: null });
        expect(seal).toMatchObject({ isEnclosed: true, isOxygenated: true, isSleepSafe: false });
    });

    it('becomes sleep-safe only after the recovered cot reaches its ship socket', () => {
        let { state, plan } = ensureFirstNightBaseState(createCarryState('run-a'), { shipX: 10, shipZ: 20 });
        state = beginCarry(state, state.worldObjects[0].instanceId, 'local').state;
        state = installCarriedObject(state, plan.installSocket, { carrierPlayerId: 'local' }).state;
        expect(installedCot(state)?.socketId).toBe('ship-sleep-bay');
        expect(evaluateRoomSealGraph({ modules: state.installed, defaultSafeBubble: null }).isSleepSafe).toBe(true);
    });

    it('does not duplicate the mission cot or starter shell across bootstrap calls', () => {
        const first = ensureFirstNightBaseState(createCarryState('run-a'), { shipX: 0, shipZ: 0 });
        const second = ensureFirstNightBaseState(first.state, { shipX: 0, shipZ: 0 });
        expect(second.addedCot).toBe(false);
        expect(second.state.worldObjects.filter(({ definitionId }) => definitionId === 'cot_bed')).toHaveLength(1);
        expect(second.state.installed).toHaveLength(planFirstNightBase().shell.length);
    });
});
