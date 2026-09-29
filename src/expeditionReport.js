// The expedition report on the results screen.
//
// Returning to the ship used to report distance, pickups, kills and time --
// nothing about what this deployment achieved or what the next one is for.
// This turns the runtime's facts into ordered lines (locale key + params):
// the condition survived, the bounty met or missed, what was completed, and
// the next ship goal with what it still costs. Pure; main.js renders it.
//
// Every lane adds to it through one window event, `expedition-report-item`
// { kind, labelKey, params } (docs/planning/gameplay-feature-review-2026-09-24.md,
// shared contracts); the runtime collects them per deployment as `items`.

import { NEXT_ACTION_KEYS } from './deathReport.js';

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

// Report item kinds, in the order they read. A lead points at the next
// deployment, so it comes after the ship goal.
export const REPORT_ITEM_KINDS = Object.freeze(['settlement', 'event', 'discovery', 'unlock', 'faction', 'lead']);
const MAX_REPORT_ITEMS = 6;
const REPORT_ITEM_KEYS = Object.freeze({
    settlement: 'ui.go.report.item_settlement',
    event: 'ui.go.report.item_event',
    discovery: 'ui.go.report.item_discovery',
    unlock: 'ui.go.report.item_unlock',
    faction: 'ui.go.report.item_faction',
    lead: 'ui.go.report.item_lead'
});

/** Lines for the lanes' report items: known kinds, in order, duplicates dropped. */
export function reportItemLines(items = []) {
    const seen = new Set();
    const lines = [];
    for (const item of items) {
        if (!item?.labelKey) continue;
        const kind = REPORT_ITEM_KINDS.includes(item.kind) ? item.kind : 'event';
        const params = { ...(item.params ?? {}), labelKey: item.labelKey };
        const identity = `${kind}|${JSON.stringify(params)}`;
        if (seen.has(identity)) continue;
        seen.add(identity);
        lines.push({ kind, line: { key: REPORT_ITEM_KEYS[kind], params } });
    }
    return lines
        .sort((a, b) => REPORT_ITEM_KINDS.indexOf(a.kind) - REPORT_ITEM_KINDS.indexOf(b.kind))
        .slice(0, MAX_REPORT_ITEMS);
}

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
 * @param {Array} [report.items] - `expedition-report-item` details from every lane
 * @param {object|null} [report.death] - src/deathReport.js lines: { cause, field, next }
 * @param {object|null} [report.build] - src/deathReport.js summarizeBuild line
 * @returns {Array<{ key: string, params?: object, parts?: Array }>}
 */
export function buildExpeditionReport({ conditionNameKey = null, bounty = null, completed = [], nextGoal = null, items = [], death = null, build = null } = {}) {
    const itemLines = reportItemLines(items);
    const lines = [];
    if (conditionNameKey) lines.push({ key: 'ui.go.report.condition', params: { conditionKey: conditionNameKey } });
    // Why the run ended comes before what it achieved.
    if (death?.cause) lines.push(death.cause);
    if (bounty) {
        lines.push(bounty.completed
            ? { key: 'ui.go.report.bounty_met', params: { labelKey: bounty.labelKey, shells: bounty.paidShells ?? 0 } }
            : { key: 'ui.go.report.bounty_missed', params: { labelKey: bounty.labelKey, progress: bounty.progress, target: bounty.target } });
    }
    const done = [...new Set(completed.filter(Boolean))].slice(0, 4);
    lines.push(done.length
        ? { key: 'ui.go.report.completed', params: { list: done.join(' · ') } }
        : { key: 'ui.go.report.none_completed' });
    lines.push(...itemLines.filter((entry) => entry.kind !== 'lead').map((entry) => entry.line));
    if (build) lines.push(build);
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
    lines.push(...itemLines.filter((entry) => entry.kind === 'lead').map((entry) => entry.line));
    if (death?.field) lines.push(death.field);
    // One explicit next action closes the report, unless it would only
    // repeat the ship-goal line above.
    if (death?.next && death.next.key !== NEXT_ACTION_KEYS.build) lines.push(death.next);
    return lines;
}

/**
 * Resolve a report line to text. Names (condition, goal, drop, enemy,
 * resources) are filled in before an item's own label is translated, since
 * labels such as "{drop} recovered" use them. `t` is the i18n function.
 */
export function formatReportLine(line, t) {
    const params = { ...(line.params ?? {}) };
    const named = (key, fallback) => { const text = t(key); return text !== key ? text : fallback; };
    if (params.conditionKey) params.condition = t(params.conditionKey);
    if (params.goalKey) params.goal = t(params.goalKey);
    if (params.dropKey) params.drop = named(params.dropKey, params.name ?? params.dropId ?? '');
    if (params.enemyKey) params.enemy = t(params.enemyKey);
    if (Array.isArray(params.dropKeys)) {
        params.drops = params.dropKeys.map((key, index) => named(key, params.dropIds?.[index] ?? key)).join(' + ');
    }
    if (line.parts) {
        params.missing = line.parts
            .map((part) => `${part.amount} ${part.resourceKey ? t(part.resourceKey) : part.resource}`)
            .join(' · ');
    }
    if (params.labelKey) params.label = t(params.labelKey, params);
    return t(line.key, params);
}
