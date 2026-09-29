import { afterEach, describe, expect, it } from 'vitest';
import { callSliceContract, clearSliceContract, hasSliceContract, missingSliceContracts, registerSliceContract } from './sliceContracts.js';

afterEach(() => { clearSliceContract('spawnEncounterRecipe'); clearSliceContract('grantRunDrop'); });

describe('slice contracts', () => {
    it('reports an unregistered contract instead of faking it', () => {
        expect(callSliceContract('grantRunDrop', {}, 'cryo_rime')).toEqual({ available: false, value: null });
        expect(missingSliceContracts()).toEqual(['spawnEncounterRecipe', 'grantRunDrop']);
    });

    it('calls a registered lane implementation and only accepts known contracts', () => {
        expect(registerSliceContract('grantRunDrop', (game, dropId) => dropId === 'cryo_rime')).toBe(true);
        expect(registerSliceContract('somethingElse', () => 1)).toBe(false);
        expect(hasSliceContract('grantRunDrop')).toBe(true);
        expect(callSliceContract('grantRunDrop', {}, 'cryo_rime')).toEqual({ available: true, value: true });
        expect(missingSliceContracts()).toEqual(['spawnEncounterRecipe']);
    });
});
