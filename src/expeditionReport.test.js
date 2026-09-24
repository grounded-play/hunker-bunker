import { describe, expect, it } from 'vitest';
import { REPORT_ITEM_KINDS, buildExpeditionReport, missingForCost, reportItemLines } from './expeditionReport.js';

describe('the expedition report tells the player what the run achieved and what is next', () => {
    it('reports the condition, a met bounty, what was completed and an affordable next goal', () => {
        const lines = buildExpeditionReport({
            conditionNameKey: 'ui.expedition.conditions.spore_bloom.name',
            bounty: { labelKey: 'ui.expedition.bounties.clearing_breach', progress: 6, target: 6, completed: true, paidShells: 5 },
            completed: ['RECOVERY: SURVEY THE SALVAGE PERIMETER', 'RECOVERY: SURVEY THE SALVAGE PERIMETER', 'O₂ OPTION — REROUTE GATE POWER'],
            nextGoal: { goalKey: 'hullExpansion', cost: { tech: 50, med: 20 }, bank: { tech: 60, med: 20 } }
        });
        expect(lines.map((line) => line.key)).toEqual([
            'ui.go.report.condition', 'ui.go.report.bounty_met', 'ui.go.report.completed', 'ui.go.report.next_goal_ready'
        ]);
        expect(lines[1].params.shells).toBe(5);
        expect(lines[2].params.list).toBe('RECOVERY: SURVEY THE SALVAGE PERIMETER · O₂ OPTION — REROUTE GATE POWER');
        expect(lines[3].params.goalKey).toBe('ui.console_terminal.hull_expansion_matrix');
    });

    it('reports a missed bounty, an empty run and exactly what the next goal still needs', () => {
        const lines = buildExpeditionReport({
            bounty: { labelKey: 'ui.expedition.bounties.salvage_run', progress: 3, target: 8, completed: false },
            completed: [],
            nextGoal: { goalKey: 'radarNode', cost: { tech: 150, med: 30 }, bank: { tech: 40, med: 30 } }
        });
        expect(lines.map((line) => line.key)).toEqual(['ui.go.report.bounty_missed', 'ui.go.report.none_completed', 'ui.go.report.next_goal_short']);
        expect(lines[0].params).toMatchObject({ progress: 3, target: 8 });
        expect(lines[2].parts).toEqual([{ amount: 110, resourceKey: 'ui.pickup_counter.tech', resource: 'tech' }]);
    });

    it('says so when every ship goal is built', () => {
        expect(buildExpeditionReport({ nextGoal: null }).at(-1).key).toBe('ui.go.report.all_goals');
        expect(missingForCost({ tech: 5 }, { tech: 9 })).toEqual([]);
    });
});

describe('expedition report items from every lane', () => {
    it('orders kinds, keeps the lead after the ship goal, drops duplicates', () => {
        const lines = buildExpeditionReport({
            completed: [],
            nextGoal: null,
            items: [
                { kind: 'lead', labelKey: 'ui.events.false_distress.report_rescued' },
                { kind: 'faction', labelKey: 'x.faction', params: { delta: 2 } },
                { kind: 'discovery', labelKey: 'ui.events.report_reward', params: { name: 'Cryo Rime Injector' } },
                { kind: 'discovery', labelKey: 'ui.events.report_reward', params: { name: 'Cryo Rime Injector' } },
                { kind: 'settlement', labelKey: 'x.settled' }
            ]
        });
        expect(lines.map((line) => line.key)).toEqual([
            'ui.go.report.none_completed',
            'ui.go.report.item_settlement',
            'ui.go.report.item_discovery',
            'ui.go.report.item_faction',
            'ui.go.report.all_goals',
            'ui.go.report.item_lead'
        ]);
        expect(lines[2].params).toEqual({ name: 'Cryo Rime Injector', labelKey: 'ui.events.report_reward' });
    });

    it('treats unknown kinds as events, skips unlabeled items and caps the list', () => {
        expect(reportItemLines([{ kind: 'mystery', labelKey: 'a' }, { kind: 'lead' }])).toEqual([
            { kind: 'event', line: { key: 'ui.go.report.item_event', params: { labelKey: 'a' } } }
        ]);
        const many = Array.from({ length: 10 }, (_, index) => ({ kind: 'event', labelKey: `k${index}` }));
        expect(reportItemLines(many)).toHaveLength(6);
        expect(REPORT_ITEM_KINDS).toEqual(['settlement', 'event', 'discovery', 'unlock', 'faction', 'lead']);
    });
});

describe('death lines', () => {
    it('puts the cause first, the build after the objectives, and the next action last', () => {
        const lines = buildExpeditionReport({
            conditionNameKey: 'ui.expedition.conditions.glacial_gale.name',
            completed: [],
            nextGoal: { goalKey: 'o2Bubble', cost: { tech: 10 }, bank: { tech: 0 } },
            items: [{ kind: 'lead', labelKey: 'lead.key' }],
            death: {
                cause: { key: 'ui.death.cause.o2' },
                field: { key: 'ui.death.field.black_box', params: { meters: 40 }, parts: [{ resource: 'tech', amount: 3 }] },
                next: { key: 'ui.death.next.recover_black_box', params: { meters: 40 } }
            },
            build: { key: 'ui.death.build.none' }
        });
        expect(lines.map((line) => line.key)).toEqual([
            'ui.go.report.condition',
            'ui.death.cause.o2',
            'ui.go.report.none_completed',
            'ui.death.build.none',
            'ui.go.report.next_goal_short',
            'ui.go.report.item_lead',
            'ui.death.field.black_box',
            'ui.death.next.recover_black_box'
        ]);
    });

    it('does not repeat an affordable ship goal as the next action, and extraction has no death lines', () => {
        const next = { key: 'ui.death.next.build_goal', params: { goalKey: 'g' } };
        const lines = buildExpeditionReport({ nextGoal: { goalKey: 'o2Bubble', cost: {}, bank: {} }, death: { cause: { key: 'ui.death.cause.fall' }, next } });
        expect(lines.map((line) => line.key)).not.toContain('ui.death.next.build_goal');
        expect(buildExpeditionReport({ nextGoal: null }).map((line) => line.key)).toEqual(['ui.go.report.none_completed', 'ui.go.report.all_goals']);
    });
});
