import { describe, expect, it } from 'vitest';
import { SETPIECE_BUILD_CATALOG } from './data/setpieceBuilds.js';
import {
    SETPIECE_STRUCTURE_GENERATOR,
    allocateSetpieceClaim,
    allocateWorldSetpieces,
    resolveSetpieceChunkStructure,
    validateSetpieceCatalog
} from './setpieceBuilds.js';

// The canonical collapsed bridge is the ring 2 gate (mazeExpedition.js
// RING_BLOCKER_FEATURES); the bridge setpiece is keyed to that feature.
const reservation = {
    id: 'ring-2:crossing', role: 'ringCrossing', ring: 2, blockerFeature: 'collapsed_bridge', chunkX: 4, chunkY: 5
};

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

    it('never dresses a gate that is not a collapsed bridge as a bridge', () => {
        const options = { availableChunkKeys: ['4,4', '4,5', '4,6'] };
        for (const blockerFeature of ['blast_bulkhead', 'hive_membrane', 'flooded_service_tunnel', undefined]) {
            expect(allocateSetpieceClaim({ ...reservation, ring: 1, blockerFeature }, options), String(blockerFeature)).toBeNull();
        }
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

    it('allocates claims into a world plan deterministically without overlapping other reservations', () => {
        const worldPlan = {
            seed: 42,
            topology: { chunks: { '4,4': {}, '4,5': {}, '4,6': {}, '5,5': {} } },
            reservations: [reservation, { id: 'other', chunkKey: '5,5', chunkX: 5, chunkY: 5 }]
        };
        const first = allocateWorldSetpieces(worldPlan);
        const second = allocateWorldSetpieces(worldPlan);
        expect(first).toEqual(second);
        expect(first.claims).toHaveLength(1);
        expect(first.claims[0].chunkKeys).not.toContain('5,5');
        expect(first.omissions).toEqual([]);
    });

    it('degrades a required crossing to its pivot instead of invalidating the run', () => {
        const required = { ...reservation, required: true, chunkKey: '4,5' };
        const plan = allocateWorldSetpieces({
            seed: 7,
            topology: { chunks: { '4,5': {} } },
            reservations: [required]
        });
        expect(plan.claims[0]).toMatchObject({
            reservationId: required.id,
            degraded: true,
            omissionReason: 'full_footprint_unavailable',
            chunkKeys: ['4,5']
        });
        expect(plan.omissions).toEqual([]);
    });
});
