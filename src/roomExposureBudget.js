/**
 * Seeded authored-template exposure budget per ring (Workstream A3).
 *
 * Enforces:
 * - Tutorial ring: at least 1 authored utility room + enlarged base approach
 * - Later rings: at least 2 authored room builds, 1 signature hallway, 1 biome transition connector
 * - Prevents immediate repeat of the same archetype or build ID
 * - Provides debug telemetry: generator ID, build ID, rotation, reservation, and rejection reason
 */

export const RING_EXPOSURE_REQUIREMENTS = Object.freeze({
    TUTORIAL: Object.freeze({
        minAuthoredRooms: 1,
        minSignatureHallways: 1,
        minBiomeTransitions: 0
    }),
    STANDARD_RING: Object.freeze({
        minAuthoredRooms: 2,
        minSignatureHallways: 1,
        minBiomeTransitions: 1
    })
});

export const TEMPLATE_TYPES = Object.freeze({
    AUTHORED_ROOM: 'authored-room',
    SIGNATURE_HALLWAY: 'signature-hallway',
    BIOME_TRANSITION: 'biome-transition'
});

/**
 * Creates an exposure tracker for a ring.
 */
export function createRingExposureTracker(ringIndex = 0, seed = 0) {
    const isTutorial = Number(ringIndex) === 0;
    const requirements = isTutorial
        ? RING_EXPOSURE_REQUIREMENTS.TUTORIAL
        : RING_EXPOSURE_REQUIREMENTS.STANDARD_RING;

    return {
        ringIndex,
        seed: Number(seed) >>> 0,
        isTutorial,
        requirements,
        authoredRooms: [],
        signatureHallways: [],
        biomeTransitions: [],
        recentArchetypeIds: [],
        rejectedAttempts: []
    };
}

/**
 * Evaluates whether a template can be selected without violating repeat rules.
 */
export function evaluateTemplateSelection(tracker, templateId, templateType = TEMPLATE_TYPES.AUTHORED_ROOM) {
    if (!tracker || !templateId) {
        return { allowed: false, reason: 'invalid-parameters' };
    }

    // Rule: No immediate consecutive repetition of the exact same build or archetype
    const lastSelected = tracker.recentArchetypeIds.at(-1);
    if (lastSelected === templateId) {
        const rejection = {
            allowed: false,
            templateId,
            templateType,
            reason: 'immediate-repeat-violation'
        };
        tracker.rejectedAttempts.push(rejection);
        return rejection;
    }

    return {
        allowed: true,
        templateId,
        templateType,
        reason: 'budget-eligible'
    };
}

/**
 * Records a successful template selection in the ring tracker.
 */
export function recordTemplateSelection(tracker, templateId, templateType = TEMPLATE_TYPES.AUTHORED_ROOM, metadata = {}) {
    if (!tracker || !templateId) return false;

    tracker.recentArchetypeIds.push(templateId);
    const entry = {
        templateId,
        templateType,
        timestamp: Date.now(),
        rotation: metadata.rotation ?? 0,
        reservationId: metadata.reservationId ?? null
    };

    if (templateType === TEMPLATE_TYPES.AUTHORED_ROOM) {
        tracker.authoredRooms.push(entry);
    } else if (templateType === TEMPLATE_TYPES.SIGNATURE_HALLWAY) {
        tracker.signatureHallways.push(entry);
    } else if (templateType === TEMPLATE_TYPES.BIOME_TRANSITION) {
        tracker.biomeTransitions.push(entry);
    }

    return true;
}

/**
 * Validates whether the ring tracker satisfied its minimum exposure budget.
 */
export function validateRingExposureBudget(tracker) {
    if (!tracker) return { satisfied: false, missing: ['invalid-tracker'] };

    const missing = [];
    if (tracker.authoredRooms.length < tracker.requirements.minAuthoredRooms) {
        missing.push(`authored-rooms:${tracker.authoredRooms.length}/${tracker.requirements.minAuthoredRooms}`);
    }
    if (tracker.signatureHallways.length < tracker.requirements.minSignatureHallways) {
        missing.push(`signature-hallways:${tracker.signatureHallways.length}/${tracker.requirements.minSignatureHallways}`);
    }
    if (tracker.biomeTransitions.length < tracker.requirements.minBiomeTransitions) {
        missing.push(`biome-transitions:${tracker.biomeTransitions.length}/${tracker.requirements.minBiomeTransitions}`);
    }

    return {
        satisfied: missing.length === 0,
        missing,
        summary: {
            authoredRooms: tracker.authoredRooms.length,
            signatureHallways: tracker.signatureHallways.length,
            biomeTransitions: tracker.biomeTransitions.length,
            rejections: tracker.rejectedAttempts.length
        }
    };
}

/**
 * Generates debug telemetry record for visual inspector overlay.
 */
export function formatExposureDebugTelemetry(tracker) {
    if (!tracker) return null;
    return {
        ring: tracker.ringIndex,
        isTutorial: tracker.isTutorial,
        authoredRoomCount: tracker.authoredRooms.length,
        signatureHallwayCount: tracker.signatureHallways.length,
        biomeTransitionCount: tracker.biomeTransitions.length,
        recentArchetypes: [...tracker.recentArchetypeIds.slice(-4)],
        lastRejectionReason: tracker.rejectedAttempts.at(-1)?.reason ?? null
    };
}
