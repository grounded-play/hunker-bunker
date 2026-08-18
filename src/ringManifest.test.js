import { describe, expect, it } from 'vitest';
import { ACT2_CAMP_STATUSES, ACT2_HIVE_SITES, ACT2_HIVE_STATUSES } from './act2.js';
import { CAMP_QUESTS } from './data/campQuests.js';
import { generateRadialMazeExpedition } from './mazeExpedition.js';
import {
    CAMP_TERRITORY_BEATS,
    HIVE_TERRITORY_BEATS,
    MANDATORY_SHIP_GOALS,
    RING_MANIFEST_VERSION,
    WORLD_PLAN_VERSION,
    buildRingManifestPlan,
    buildRingManifests,
    buildWorldPlan,
    findWorldPlanReservationConflicts,
    getManifestReservations,
    getWorldReservation,
    proveStructuralFallbackViability,
    validateRingManifestPlan,
    validateRingManifests,
    validateWorldPlan
} from './ringManifest.js';

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

describe('ring manifest contract', () => {
    it('builds five versioned deterministic serializable manifests from expedition output', () => {
        const expedition = generateRadialMazeExpedition(8128);
        const a = buildRingManifestPlan(expedition);
        const b = buildRingManifestPlan(expedition);

        expect(a).toEqual(b);
        expect(JSON.parse(JSON.stringify(a))).toEqual(a);
        expect(a.version).toBe(RING_MANIFEST_VERSION);
        expect(a.seed).toBe(8128);
        expect(a.sourceTopologyVersion).toBe(expedition.topology.version);
        expect(a.ringManifests.map((manifest) => manifest.ring)).toEqual([1, 2, 3, 4, 5]);
        expect(buildRingManifests(expedition)).toEqual(a.ringManifests);
        expect(validateRingManifestPlan(a)).toEqual({ valid: true, errors: [] });
        expect(validateRingManifests(a.ringManifests)).toEqual({ valid: true, errors: [] });
    });

    it('defines every required, optional, support, challenge, reward, and narrative budget', () => {
        const plan = buildRingManifestPlan(generateRadialMazeExpedition(17));
        for (const manifest of plan.ringManifests) {
            expect(Object.keys(manifest.budgets)).toEqual([
                'required', 'optional', 'support', 'challenge', 'reward', 'narrative'
            ]);
            expect(manifest.budgets.required.min).toBe(
                manifest.reservations.filter((entry) => entry.required).length
            );
            expect(manifest.budgets.optional.max).toBeGreaterThanOrEqual(manifest.budgets.optional.min);
            for (const budget of Object.values(manifest.budgets)) {
                expect(Object.values(budget).every((value) => Number.isInteger(value) && value >= 0)).toBe(true);
            }
        }
    });

    it('reserves dormant destinations for all nine current camp quests on their camp ring', () => {
        const expedition = generateRadialMazeExpedition(99);
        const reservations = getManifestReservations(buildRingManifestPlan(expedition));
        const questReservations = reservations.filter((entry) => entry.role === 'campObjective');
        const sourceQuests = Object.entries(CAMP_QUESTS).flatMap(([campId, quests]) => (
            quests.map((quest) => ({ campId, questId: quest.id }))
        ));

        expect(questReservations).toHaveLength(9);
        expect(questReservations.map(({ campId, questId }) => ({ campId, questId })))
            .toEqual(sourceQuests);
        for (const entry of questReservations) {
            const campRing = expedition.nodes.find((node) => node.id === entry.campId).ring;
            expect(entry).toMatchObject({
                ring: campRing,
                latestAllowedRing: campRing,
                conditional: true,
                activationState: 'dormant'
            });
            expect(entry.objectiveAnchorId).toBeTruthy();
            expect(entry.sourceTerritoryId).toBe(`territory:${entry.campId}`);
            expect(entry.minimumRouteSegmentsFromCamp).toBeGreaterThanOrEqual(1);
            expect(entry.forbidAdjacentTo).toContain(`territory:${entry.campId}`);
        }
    });

    it('reserves three ordered multi-chunk camp territories and every consequence state', () => {
        const expedition = generateRadialMazeExpedition(144);
        const reservations = getManifestReservations(buildRingManifestPlan(expedition));
        for (const campId of Object.keys(CAMP_QUESTS)) {
            const source = expedition.nodes.find((node) => node.id === campId);
            const territory = reservations.find((entry) => entry.id === `territory:${campId}`);
            expect(territory.role).toBe('campTerritory');
            expect(territory.routeChunkKey).toBe(`${source.chunkX},${source.chunkY}`);
            expect(territory.routeChunkKey).toBe(territory.placement.chunkKey);
            expect(territory.beats.map((beat) => beat.beatId))
                .toEqual(CAMP_TERRITORY_BEATS.map((beat) => beat.id));
            expect(territory.beats.map((beat) => beat.order))
                .toEqual(CAMP_TERRITORY_BEATS.map((beat) => beat.order));
            const states = reservations.filter((entry) => (
                entry.role === 'campStateAnchor' && entry.siteId === campId
            ));
            expect(states.map((entry) => entry.stateKey)).toEqual(ACT2_CAMP_STATUSES);
            expect(states.every((entry) => entry.conditional && entry.activationState === 'dormant')).toBe(true);
        }
    });

    it('reserves complete ordered territories and every current state for all hives', () => {
        const plan = buildRingManifestPlan(generateRadialMazeExpedition(177));
        const reservations = getManifestReservations(plan);
        for (const hive of ACT2_HIVE_SITES) {
            const territory = reservations.find((entry) => entry.id === `territory:${hive.id}`);
            expect(territory.routeChunkKey).toBe(territory.placement.chunkKey);
            expect(territory.beats.map((beat) => beat.beatId))
                .toEqual(HIVE_TERRITORY_BEATS.map((beat) => beat.id));
            expect(territory.beats.map((beat) => beat.order))
                .toEqual(HIVE_TERRITORY_BEATS.map((beat) => beat.order));
            const states = reservations.filter((entry) => (
                entry.role === 'hiveStateAnchor' && entry.siteId === hive.id
            ));
            expect(states.map((entry) => entry.stateKey)).toEqual(ACT2_HIVE_STATUSES);
            expect(states.every((entry) => entry.conditional && entry.activationState === 'dormant')).toBe(true);
        }
    });

    it('gives every mandatory goal an explicit alternative and moral-choice-independent fallback', () => {
        const plan = buildRingManifestPlan(generateRadialMazeExpedition(3));
        const proof = proveStructuralFallbackViability(plan);

        expect(proof.map((entry) => entry.goalKey)).toEqual(MANDATORY_SHIP_GOALS.map((goal) => goal.goalKey));
        expect(proof.every((entry) => entry.viable)).toBe(true);
        for (const manifest of plan.ringManifests.filter((entry) => entry.progression)) {
            expect(manifest.progression.paths.map((path) => path.kind))
                .toEqual(['primary', 'alternative', 'fallback']);
            expect(manifest.progression.paths.find((path) => path.kind === 'fallback')).toMatchObject({
                choiceDependencies: [],
                structurallyIndependent: true
            });
        }
    });

    it('rejects malformed expedition inputs instead of inventing topology', () => {
        expect(() => buildRingManifestPlan({})).toThrow(/mazeExpedition output/);
        const missingCamp = generateRadialMazeExpedition(1);
        missingCamp.nodes = missingCamp.nodes.filter((node) => node.id !== 'camp_tallow');
        expect(() => buildRingManifestPlan(missingCamp)).toThrow(/camp_tallow/);
    });
});

describe('ring manifest validation failures', () => {
    it('rejects duplicate IDs and out-of-bounds rings', () => {
        const plan = clone(buildRingManifestPlan(generateRadialMazeExpedition(4)));
        plan.ringManifests[1].id = plan.ringManifests[0].id;
        plan.ringManifests[1].reservations[0].id = plan.ringManifests[0].reservations[0].id;
        plan.ringManifests[1].reservations[1].ring = 6;
        const result = validateRingManifestPlan(plan);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('duplicate manifest id ring-1-manifest');
        expect(result.errors).toContain('duplicate reservation id ring-1:entry');
        expect(result.errors).toContain('ring-2:return-shortcut has invalid ring 6');
    });

    it('rejects a quest destination beyond the crossing it is meant to unlock', () => {
        const plan = clone(buildRingManifestPlan(generateRadialMazeExpedition(5)));
        const quest = getManifestReservations(plan).find((entry) => entry.questId === 'reactor_venting');
        quest.ring = 2;
        const result = validateRingManifestPlan(plan);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain(`${quest.id} lies beyond its unlocking crossing`);
    });

    it('rejects an early-active conditional room and missing hive state', () => {
        const plan = clone(buildRingManifestPlan(generateRadialMazeExpedition(6)));
        const hiveState = getManifestReservations(plan).find((entry) => entry.id === 'hive_suture:state:bonded');
        hiveState.activationState = 'active';
        const carapaceManifest = plan.ringManifests.find((entry) => entry.ring === 4);
        carapaceManifest.reservations = carapaceManifest.reservations
            .filter((entry) => entry.id !== 'hive_carapace:state:slain');
        carapaceManifest.budgets.required.min -= 1;
        const result = validateRingManifestPlan(plan);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('hive_suture:state:bonded conditional reservation activates before its quest/state');
        expect(result.errors).toContain('hive_suture:state:bonded must remain conditionally dormant');
        expect(result.errors).toContain('missing hive_carapace state reservation slain');
    });

    it('rejects incomplete camp territories, states, and adjacent quest destinations', () => {
        const plan = clone(buildRingManifestPlan(generateRadialMazeExpedition(61)));
        const meridian = getManifestReservations(plan).find((entry) => entry.id === 'territory:camp_meridian');
        meridian.beats.pop();
        meridian.routeChunkKey = '99,99';
        const ringOne = plan.ringManifests.find((entry) => entry.ring === 1);
        ringOne.reservations = ringOne.reservations
            .filter((entry) => entry.id !== 'camp_meridian:state:robbed');
        ringOne.budgets.required.min -= 1;
        const quest = ringOne.reservations.find((entry) => entry.questId === 'reactor_venting');
        quest.minimumRouteSegmentsFromCamp = 0;
        const result = validateRingManifestPlan(plan);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('camp_meridian territory sequence is incomplete or unordered');
        expect(result.errors).toContain('camp_meridian territory route chunk does not match expedition placement');
        expect(result.errors).toContain('missing camp_meridian state reservation robbed');
        expect(result.errors).toContain(`${quest.id} does not preserve camp-to-objective route separation`);
    });

    it('rejects plans whose progression fallback depends on a moral choice or missing reservation', () => {
        const plan = clone(buildRingManifestPlan(generateRadialMazeExpedition(7)));
        const progression = plan.ringManifests[0].progression;
        progression.paths.find((path) => path.kind === 'primary').choiceDependencies = ['camp_alive'];
        progression.paths.find((path) => path.kind === 'fallback').choiceDependencies = ['hive_bonded'];
        const result = validateRingManifestPlan(plan);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('o2Bubble has no moral-choice-independent structural path');
    });

    it('rejects incomplete budgets and reservation coverage', () => {
        const plan = clone(buildRingManifestPlan(generateRadialMazeExpedition(8)));
        delete plan.ringManifests[0].budgets.reward;
        plan.ringManifests[2].reservations = plan.ringManifests[2].reservations
            .filter((entry) => entry.questId !== 'armory_breach');
        plan.ringManifests[2].budgets.required.min -= 1;
        const result = validateRingManifestPlan(plan);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('ring-1-manifest has invalid reward budget');
        expect(result.errors).toContain('missing camp quest destination armory_breach');
    });
});

describe('WorldPlan handoff contract', () => {
    it('builds the complete deterministic serializable contract without inventing another topology', () => {
        const expedition = generateRadialMazeExpedition(8128);
        const first = buildWorldPlan(expedition);
        const second = buildWorldPlan(expedition);

        expect(first).toEqual(second);
        expect(JSON.parse(JSON.stringify(first))).toEqual(first);
        expect(first.version).toBe(WORLD_PLAN_VERSION);
        expect(first.seed).toBe(8128);
        expect(first.topology).toEqual(expedition.topology);
        expect(first.ringManifests).toHaveLength(5);
        expect(first.reservations).toHaveLength(90);
        expect(first.territories.map((territory) => territory.id).sort()).toEqual([
            'territory:camp_meridian',
            'territory:camp_tallow',
            'territory:hive_suture',
            'territory:camp_vesper',
            'territory:hive_relay',
            'territory:hive_carapace'
        ].sort());
        expect(first.ringCrossings).toHaveLength(4);
        expect(first.requiredChunkSockets).toHaveLength(60);
        expect(first.questFallbacks).toHaveLength(4);
        expect(first.diagnostics).toMatchObject({ valid: true, errors: [], projectionErrors: [] });
        expect(validateWorldPlan(first)).toEqual({ valid: true, errors: [] });
        expect(findWorldPlanReservationConflicts(first)).toEqual([]);
    });

    it('projects every required beat before local generation and shares only explicit state aliases', () => {
        const plan = buildWorldPlan(generateRadialMazeExpedition(33));
        expect(plan.reservations.every((reservation) => reservation.chunkKey)).toBe(true);
        for (const territory of plan.territories) {
            const reservation = getWorldReservation(plan, territory.reservationId);
            const anchorBeat = territory.beats.find((beat) => beat.id === territory.contentAnchorBeatId);
            expect(reservation.chunkKey).toBe(anchorBeat.ownerChunkKey);
            const stateAliases = plan.reservations.filter((entry) => (
                entry.shareWithReservationId === territory.id
            ));
            expect(stateAliases.length).toBeGreaterThan(0);
            expect(stateAliases.every((entry) => entry.chunkKey === reservation.chunkKey)).toBe(true);
        }
        expect(getWorldReservation(plan, 'territory:camp_meridian').territoryBeatId)
            .toContain('camp_meridian:central');
        expect(getWorldReservation(plan, 'territory:hive_suture').territoryBeatId)
            .toContain('hive_suture:choice_chamber');
    });

    it('keeps all nine camp objectives away from their camp territory boundary', () => {
        const plan = buildWorldPlan(generateRadialMazeExpedition(91));
        const quests = plan.reservations.filter((reservation) => reservation.role === 'campObjective');
        expect(quests).toHaveLength(9);
        expect(validateWorldPlan(plan)).toEqual({ valid: true, errors: [] });
        expect(new Set(quests.map((quest) => quest.chunkKey)).size).toBe(9);
    });

    it('remains valid across a representative property sweep', () => {
        for (let seed = 1; seed <= 100; seed += 1) {
            const plan = buildWorldPlan(generateRadialMazeExpedition(seed));
            expect(plan.diagnostics.valid, `seed ${seed}: ${plan.diagnostics.errors.join('; ')}`).toBe(true);
            expect(findWorldPlanReservationConflicts(plan), `seed ${seed}`).toEqual([]);
        }
    });

    it('makes projection corruption and incompatible co-location fatal', () => {
        const plan = buildWorldPlan(generateRadialMazeExpedition(7));
        const quest = getWorldReservation(plan, 'quest:camp_meridian:reactor_venting:destination');
        const goal = getWorldReservation(plan, 'goal:o2Bubble:objective');
        quest.chunkKey = goal.chunkKey;
        quest.chunkX = goal.chunkX;
        quest.chunkY = goal.chunkY;
        const result = validateWorldPlan(plan);
        expect(result.valid).toBe(false);
        expect(result.errors.some((error) => error.includes('reservation_overlap'))).toBe(true);
    });

    it('rejects state aliases that do not share their declared territory owner', () => {
        const plan = buildWorldPlan(generateRadialMazeExpedition(8));
        const state = getWorldReservation(plan, 'camp_meridian:state:robbed');
        state.chunkKey = '999,999';
        state.chunkX = 999;
        state.chunkY = 999;
        const result = validateWorldPlan(plan);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('camp_meridian:state:robbed has invalid shared reservation ownership');
    });
});
