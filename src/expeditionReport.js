// The expedition report on the results screen.
//
// Returning to the ship used to report distance, pickups, kills and time --
// nothing about what this deployment achieved or what the next one is for.
// This turns the runtime's facts into ordered lines (locale key + params):
// the condition survived, the bounty met or missed, what was completed, and
// the next ship goal with what it still costs. Pure; main.js renders it.

export const GOAL_NAME_KEYS = Object.freeze({
    o2Bubble: 'ui.console_terminal.o2_generator_module',
    hullExpansion: 'ui.console_terminal.hull_expansion_matrix',
    radarNode: 'ui.console_terminal.communication_radar_node',
    reactorCompressor: 'ui.console_terminal.reactor_compressor'
});

const RESOURCE_KEYS = Object.freeze({
    tech: 'ui.pickup_counter.tech',
    med: 'ui.pickup_counter.med',
    coin: 'ui.pickup_counter.coin'
});

/** What `cost` still needs from `bank`, per resource, zeros dropped. */
export function missingForCost(cost = {}, bank = {}) {
    return Object.entries(cost)
        .map(([resource, amount]) => [resource, Math.max(0, (Number(amount) || 0) - (Number(bank[resource]) || 0))])
        .filter(([, short]) => short > 0);
}

/**
 * @param {object} report
 * @param {string|null} report.conditionNameKey
 * @param {object|null} report.bounty - { labelKey, progress, target, completed, paidShells }
 * @param {string[]} report.completed - labels resolved complete this deployment
 * @param {object|null} report.nextGoal - { goalKey, cost, bank } or null when all are built
 * @returns {Array<{ key: string, params?: object, parts?: Array }>}
 */
export function buildExpeditionReport({ conditionNameKey = null, bounty = null, completed = [], nextGoal = null } = {}) {
    const lines = [];
    if (conditionNameKey) lines.push({ key: 'ui.go.report.condition', params: { conditionKey: conditionNameKey } });
    if (bounty) {
        lines.push(bounty.completed
            ? { key: 'ui.go.report.bounty_met', params: { labelKey: bounty.labelKey, shells: bounty.paidShells ?? 0 } }
            : { key: 'ui.go.report.bounty_missed', params: { labelKey: bounty.labelKey, progress: bounty.progress, target: bounty.target } });
    }
    const done = [...new Set(completed.filter(Boolean))].slice(0, 4);
    lines.push(done.length
        ? { key: 'ui.go.report.completed', params: { list: done.join(' · ') } }
        : { key: 'ui.go.report.none_completed' });
    if (!nextGoal) {
        lines.push({ key: 'ui.go.report.all_goals' });
    } else {
        const goalNameKey = GOAL_NAME_KEYS[nextGoal.goalKey];
        const missing = missingForCost(nextGoal.cost, nextGoal.bank);
        lines.push(missing.length === 0
            ? { key: 'ui.go.report.next_goal_ready', params: { goalKey: goalNameKey } }
            : {
                key: 'ui.go.report.next_goal_short',
                params: { goalKey: goalNameKey },
                parts: missing.map(([resource, short]) => ({ amount: short, resourceKey: RESOURCE_KEYS[resource] ?? null, resource }))
            });
    }
    return lines;
}
