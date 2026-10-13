import { describe, expect, it } from 'vitest';
import {
    TEMPLATE_TYPES,
    createRingExposureTracker,
    evaluateTemplateSelection,
    recordTemplateSelection,
    validateRingExposureBudget,
    formatExposureDebugTelemetry
} from './roomExposureBudget.js';

describe('RoomExposureBudget (Workstream A3)', () => {
    it('initializes ring trackers with appropriate tutorial vs standard ring budgets', () => {
        const tutorial = createRingExposureTracker(0, 42);
        expect(tutorial.isTutorial).toBe(true);
        expect(tutorial.requirements.minAuthoredRooms).toBe(1);
        expect(tutorial.requirements.minBiomeTransitions).toBe(0);

        const standard = createRingExposureTracker(1, 42);
        expect(standard.isTutorial).toBe(false);
        expect(standard.requirements.minAuthoredRooms).toBe(2);
        expect(standard.requirements.minBiomeTransitions).toBe(1);
    });

    it('rejects immediate consecutive repeats of the same template', () => {
        const tracker = createRingExposureTracker(1, 99);
        const eval1 = evaluateTemplateSelection(tracker, 'bunker_reactor_core');
        expect(eval1.allowed).toBe(true);

        recordTemplateSelection(tracker, 'bunker_reactor_core');

        // Immediate repeat must be rejected!
        const eval2 = evaluateTemplateSelection(tracker, 'bunker_reactor_core');
        expect(eval2.allowed).toBe(false);
        expect(eval2.reason).toBe('immediate-repeat-violation');

        // Different template is allowed
        const eval3 = evaluateTemplateSelection(tracker, 'cryo_lab_vault');
        expect(eval3.allowed).toBe(true);
        recordTemplateSelection(tracker, 'cryo_lab_vault');

        // Now bunker_reactor_core is allowed again since cryo_lab_vault intervened
        const eval4 = evaluateTemplateSelection(tracker, 'bunker_reactor_core');
        expect(eval4.allowed).toBe(true);
    });

    it('validates budget fulfillment and produces telemetry records', () => {
        const tracker = createRingExposureTracker(1, 100);
        expect(validateRingExposureBudget(tracker).satisfied).toBe(false);

        recordTemplateSelection(tracker, 'room_a', TEMPLATE_TYPES.AUTHORED_ROOM);
        recordTemplateSelection(tracker, 'hallway_monumental', TEMPLATE_TYPES.SIGNATURE_HALLWAY);
        recordTemplateSelection(tracker, 'room_b', TEMPLATE_TYPES.AUTHORED_ROOM);
        recordTemplateSelection(tracker, 'connector_biome_cryo', TEMPLATE_TYPES.BIOME_TRANSITION);

        const validation = validateRingExposureBudget(tracker);
        expect(validation.satisfied).toBe(true);
        expect(validation.missing).toHaveLength(0);

        const telemetry = formatExposureDebugTelemetry(tracker);
        expect(telemetry.authoredRoomCount).toBe(2);
        expect(telemetry.signatureHallwayCount).toBe(1);
        expect(telemetry.biomeTransitionCount).toBe(1);
    });

    it('runs 100-seed distribution test proving minimum occurrence bounds and zero immediate repeats', () => {
        const catalogRooms = ['room_engineering', 'room_cryo_containment', 'room_bio_nursery', 'room_cathedral_vault'];
        const catalogHalls = ['hall_monumental_arch', 'hall_service_rib', 'hall_braced_double'];
        const catalogTransitions = ['trans_cryo_to_bio', 'trans_bunker_to_cryo'];

        for (let seed = 1; seed <= 100; seed += 1) {
            const tracker = createRingExposureTracker(1, seed);
            let pseudoRandom = (seed * 1103515245 + 12345) & 0x7fffffff;

            // Pick 2 rooms, 1 hall, 1 transition
            const pickNonConsecutive = (pool, type) => {
                for (let attempt = 0; attempt < 10; attempt += 1) {
                    pseudoRandom = (pseudoRandom * 1103515245 + 12345) & 0x7fffffff;
                    const candidate = pool[pseudoRandom % pool.length];
                    const evaluation = evaluateTemplateSelection(tracker, candidate, type);
                    if (evaluation.allowed) {
                        recordTemplateSelection(tracker, candidate, type);
                        return candidate;
                    }
                }
                return null;
            };

            pickNonConsecutive(catalogRooms, TEMPLATE_TYPES.AUTHORED_ROOM);
            pickNonConsecutive(catalogHalls, TEMPLATE_TYPES.SIGNATURE_HALLWAY);
            pickNonConsecutive(catalogRooms, TEMPLATE_TYPES.AUTHORED_ROOM);
            pickNonConsecutive(catalogTransitions, TEMPLATE_TYPES.BIOME_TRANSITION);

            const validation = validateRingExposureBudget(tracker);
            expect(validation.satisfied).toBe(true);

            // Verify no consecutive identical IDs exist in history
            for (let i = 1; i < tracker.recentArchetypeIds.length; i += 1) {
                expect(tracker.recentArchetypeIds[i]).not.toBe(tracker.recentArchetypeIds[i - 1]);
            }
        }
    });
});
