import { describe, expect, it } from 'vitest';
import {
    EVENT_CONDITION_VARIANTS, EVENT_REWARD_DROPS, EVENT_TUNING, EXPEDITION_EVENT_IDS,
    applyEventAction, chooseEventSite, createEventState, planDeploymentEvent, selectDeploymentEvent
} from './expeditionEvents.js';
import { EXPEDITION_CONDITIONS } from './expeditionSystem.js';
import { buildWorldPlan } from './ringManifest.js';
import { generateRadialMazeExpedition, ROUTE_LAYOUT_VERSION, LEGACY_ROUTE_LAYOUT_VERSION } from './mazeExpedition.js';

const plan = (seed, layoutVersion = ROUTE_LAYOUT_VERSION) => buildWorldPlan(generateRadialMazeExpedition(seed, { layoutVersion }));
const run = (eventPlan, actions) => {
    let state = createEventState(eventPlan);
    const effects = [];
    for (const action of actions) {
        const result = applyEventAction(eventPlan, state, action);
        state = result.state;
        effects.push(...result.effects);
    }
    return { state, effects, kinds: effects.map((effect) => effect.kind) };
};

describe('event selection and sites', () => {
    it('covers every condition for every event', () => {
        for (const eventId of EXPEDITION_EVENT_IDS) {
            for (const condition of EXPEDITION_CONDITIONS) {
                expect(EVENT_CONDITION_VARIANTS[eventId][condition.id], `${eventId}/${condition.id}`).toBeTruthy();
                expect(EVENT_REWARD_DROPS[condition.id]).toBeTruthy();
            }
        }
    });

    it('never repeats the previous deployment\'s event, and rolls both across seeds', () => {
        const seen = new Set();
        for (let seed = 1; seed <= 40; seed += 1) {
            const first = selectDeploymentEvent({ expeditionSeed: seed * 97 });
            seen.add(first);
            expect(selectDeploymentEvent({ expeditionSeed: seed * 97, previousEventId: first })).not.toBe(first);
            expect(selectDeploymentEvent({ expeditionSeed: seed * 97 })).toBe(first);
        }
        expect([...seen].sort()).toEqual([...EXPEDITION_EVENT_IDS].sort());
    });

    it('puts the site in Ring 1, off the spine when it can, never on a claimed chunk or the crash site', () => {
        let offRoute = 0;
        let placed = 0;
        for (const seed of [1, 7, 42, 1001, 99991, 31337]) {
            for (const version of [LEGACY_ROUTE_LAYOUT_VERSION, ROUTE_LAYOUT_VERSION]) {
                const worldPlan = plan(seed, version);
                const site = chooseEventSite(worldPlan, seed);
                if (!site) continue;
                placed += 1;
                if (site.offRoute) offRoute += 1;
                const chunk = worldPlan.topology.routeChunks.find((entry) => entry.chunkX === site.chunkX && entry.chunkY === site.chunkY);
                expect(chunk.ring).toBe(1);
                expect(site.chunkKey).not.toBe('0,0');
                expect(worldPlan.reservations.some((entry) => entry.chunkKey === site.chunkKey)).toBe(false);
            }
        }
        expect(placed).toBe(12);
        expect(offRoute).toBeGreaterThanOrEqual(9);
    });

    it('signals inside the 1:00-3:00 window and is deterministic', () => {
        const worldPlan = plan(7);
        for (let seed = 1; seed < 30; seed += 1) {
            const eventPlan = planDeploymentEvent({ expeditionSeed: seed, conditionId: 'spore_bloom', eventId: 'false_distress', worldPlan });
            expect(eventPlan.signalAt).toBeGreaterThanOrEqual(EVENT_TUNING.signalMinSeconds);
            expect(eventPlan.signalAt).toBeLessThanOrEqual(180);
            expect(planDeploymentEvent({ expeditionSeed: seed, conditionId: 'spore_bloom', eventId: 'false_distress', worldPlan })).toEqual(eventPlan);
        }
    });
});

describe('the False Distress Signal', () => {
    const worldPlan = plan(7);
    const find = (conditionId, truth) => {
        for (let seed = 1; seed < 400; seed += 1) {
            const eventPlan = planDeploymentEvent({ expeditionSeed: seed, conditionId, eventId: 'false_distress', worldPlan });
            if (eventPlan.truth === truth) return eventPlan;
        }
        throw new Error('no plan');
    };

    it('lets a scan reveal what is inside before committing', () => {
        const contaminated = run(find('spore_bloom', 'contaminated'), [{ type: 'signal' }, { type: 'scan' }, { type: 'leave' }]);
        expect(contaminated.effects[1]).toEqual({ kind: 'announce', lineKey: 'ui.events.false_distress.scan_contaminated' });
        expect(contaminated.state.outcome).toBe('left');
        expect(contaminated.kinds).not.toContain('encounter');
    });

    it('rescues a survivor for a reward and a lead, or springs the condition\'s ambush', () => {
        const rescued = run(find('glacial_gale', 'survivor'), [{ type: 'signal' }, { type: 'open' }]);
        expect(rescued.state.outcome).toBe('rescued');
        expect(rescued.kinds).toEqual(['announce', 'announce', 'grant', 'report']);
        const bloom = find('spore_bloom', 'contaminated');
        const ambush = run(bloom, [{ type: 'signal' }, { type: 'open' }, { type: 'encounter_cleared' }]);
        expect(ambush.effects.find((effect) => effect.kind === 'encounter').recipeId).toBe('bloom_push');
        expect(ambush.state.outcome).toBe('ambush_survived');
        expect(ambush.effects.find((effect) => effect.kind === 'grant').dropId).toBe(bloom.rewardDrop);
        expect(find('glacial_gale', 'contaminated').ambushRecipe).toBe('cold_pincer');
    });

    it('reads differently by condition: an arc blackout makes the signal intermittent', () => {
        const arc = planDeploymentEvent({ expeditionSeed: 3, conditionId: 'geothermal_arc', eventId: 'false_distress', worldPlan });
        expect(run(arc, [{ type: 'signal' }]).effects[0].lineKey).toBe('ui.events.false_distress.signal_intermittent');
        const still = planDeploymentEvent({ expeditionSeed: 3, conditionId: 'subzero_stillness', eventId: 'false_distress', worldPlan });
        expect(run(still, [{ type: 'signal' }]).effects[0].lineKey).toBe('ui.events.false_distress.signal_faint');
    });

    it('does nothing before the signal and nothing after it resolves', () => {
        const eventPlan = find('glacial_gale', 'survivor');
        expect(run(eventPlan, [{ type: 'open' }]).effects).toEqual([]);
        expect(run(eventPlan, [{ type: 'signal' }, { type: 'open' }, { type: 'open' }]).kinds.filter((k) => k === 'grant')).toHaveLength(1);
    });
});

describe('the Unstable Salvage Vault', () => {
    const worldPlan = plan(7);
    const vault = (conditionId) => planDeploymentEvent({ expeditionSeed: 11, conditionId, eventId: 'unstable_vault', worldPlan });

    it('breaches fast: the reward now, and the defenders wake', () => {
        const breach = run(vault('glacial_gale'), [{ type: 'signal' }, { type: 'breach' }]);
        expect(breach.kinds).toEqual(['announce', 'announce', 'grant', 'encounter']);
        expect(breach.state.phase).toBe('engaged');
    });

    it('bypasses slowly: oxygen drains until the timer finishes, no fight', () => {
        const eventPlan = vault('subzero_stillness');
        const partial = run(eventPlan, [{ type: 'signal' }, { type: 'bypass' }, { type: 'bypass_tick', seconds: 10 }]);
        expect(partial.state.phase).toBe('bypassing');
        expect(partial.effects.find((effect) => effect.kind === 'o2_drain').multiplier).toBeGreaterThan(1);
        const done = run(eventPlan, [{ type: 'signal' }, { type: 'bypass' }, { type: 'bypass_tick', seconds: 10 }, { type: 'bypass_tick', seconds: 10 }]);
        expect(done.state.outcome).toBe('bypassed');
        expect(done.kinds).not.toContain('encounter');
        expect(done.effects.filter((effect) => effect.kind === 'o2_drain').at(-1).multiplier).toBe(1);
    });

    it('plays differently by condition: live power makes the bypass quicker, frozen locks slower', () => {
        expect(vault('geothermal_arc').bypassSeconds).toBeLessThan(vault('glacial_gale').bypassSeconds);
        expect(vault('subzero_stillness').bypassSeconds).toBeGreaterThan(vault('glacial_gale').bypassSeconds);
    });
});

describe('when no fight can start', () => {
    const worldPlan = plan(7);

    it('an empty ambush pays nothing; a breached vault still keeps its reward', () => {
        let bait = null;
        for (let seed = 1; seed < 400 && !bait; seed += 1) {
            const candidate = planDeploymentEvent({ expeditionSeed: seed, conditionId: 'spore_bloom', eventId: 'false_distress', worldPlan });
            if (candidate.truth === 'contaminated') bait = candidate;
        }
        const empty = run(bait, [{ type: 'signal' }, { type: 'open' }, { type: 'encounter_unavailable' }]);
        expect(empty.state.outcome).toBe('ambush_empty');
        expect(empty.kinds.filter((kind) => kind === 'grant')).toHaveLength(0);

        const vault = planDeploymentEvent({ expeditionSeed: 11, conditionId: 'glacial_gale', eventId: 'unstable_vault', worldPlan });
        const breached = run(vault, [{ type: 'signal' }, { type: 'breach' }, { type: 'encounter_unavailable' }]);
        expect(breached.state.outcome).toBe('breach_held');
        expect(breached.kinds.filter((kind) => kind === 'grant')).toHaveLength(1);
    });

    it('ignores it outside a fight', () => {
        const vault = planDeploymentEvent({ expeditionSeed: 11, conditionId: 'glacial_gale', eventId: 'unstable_vault', worldPlan });
        expect(run(vault, [{ type: 'signal' }, { type: 'encounter_unavailable' }]).state.phase).toBe('signalled');
    });
});

describe('text keys', () => {
    it('every line key the module can emit exists in English', async () => {
        const { EVENT_TEXT_KEYS, EVENT_RESPONSE_DESC_KEYS, EVENT_RESPONSE_LABEL_KEYS, EVENT_ROUTE_KEYS, EVENT_RESPONSES } = await import('./expeditionEvents.js');
        const en = (await import('./locales/en.json')).default;
        const lookup = (key) => key.split('.').reduce((node, part) => node?.[part], en);
        const keys = [
            ...Object.values(EVENT_TEXT_KEYS).flatMap((table) => Object.values(table)),
            ...Object.values(EVENT_RESPONSE_DESC_KEYS).flatMap((table) => Object.values(table)),
            ...Object.values(EVENT_RESPONSE_LABEL_KEYS),
            ...Object.values(EVENT_ROUTE_KEYS)
        ];
        for (const key of keys) expect(typeof lookup(key), key).toBe('string');
        for (const [eventId, responses] of Object.entries(EVENT_RESPONSES)) {
            for (const response of responses) expect(EVENT_RESPONSE_DESC_KEYS[eventId][response]).toBeTruthy();
        }
    });
});
