import { describe, expect, it } from 'vitest';
import { SETPIECE_BUILD_CATALOG } from './data/setpieceBuilds.js';
import {
    SETPIECE_STRUCTURE_GENERATOR,
    allocateSetpieceClaim,
    resolveSetpieceChunkStructure,
    validateSetpieceCatalog
} from './setpieceBuilds.js';

const reservation = { id: 'ring-1:crossing', role: 'ringCrossing', ring: 1, chunkX: 4, chunkY: 5 };

describe('setpiece blueprint foundation', () => {
    it('validates the data-only catalog', () => {
        expect(validateSetpieceCatalog(SETPIECE_BUILD_CATALOG)).toEqual({ valid: true, errors: [] });
    });

    it('allocates all three bridge modules deterministically on an available route', () => {
        const options = { availableChunkKeys: ['4,4', '4,5', '4,6'], roll: 0.72 };
        expect(allocateSetpieceClaim(reservation, options)).toEqual(allocateSetpieceClaim(reservation, options));
        const claim = allocateSetpieceClaim(reservation, options);
        expect(claim.chunkKeys).toEqual(['4,6', '4,5', '4,4']);
        expect(claim.modules.map((module) => module.moduleId)).toEqual([
            'bridge_approach', 'bridge_span', 'bridge_far_abutment'
        ]);
        expect(claim.stage).toBe('ruined');
    });

    it('tries cardinal rotations in stable order to fit the available route', () => {
        const claim = allocateSetpieceClaim(reservation, { availableChunkKeys: ['3,5', '4,5', '5,5'] });
        expect(claim.rotation).toBe(1);
        expect(claim.chunkKeys).toEqual(['3,5', '4,5', '5,5']);
    });

    it('degrades cleanly when the footprint is blocked', () => {
        expect(allocateSetpieceClaim(reservation, {
            availableChunkKeys: ['4,4', '4,5', '4,6'],
            occupiedChunkKeys: ['4,4']
        })).toBeNull();
    });

    it('regenerates each claimed module without visitation-order state', () => {
        const claim = allocateSetpieceClaim(reservation, { availableChunkKeys: ['4,4', '4,5', '4,6'] });
        const forward = claim.modules.map((module) => resolveSetpieceChunkStructure(claim, module.chunkX, module.chunkY));
        const reverse = [...claim.modules].reverse().map((module) => resolveSetpieceChunkStructure(claim, module.chunkX, module.chunkY));
        expect(reverse.reverse()).toEqual(forward);
        expect(forward.every((result) => result.generatorId === SETPIECE_STRUCTURE_GENERATOR)).toBe(true);
        expect(forward.map((result) => result.moduleId)).toEqual(['bridge_approach', 'bridge_span', 'bridge_far_abutment']);
    });
});
