// Camp prompt actions (owner, 2026-10-08: "too many options are showing on
// one"). Up to twelve actions used to share one prompt, cycled with C. The
// prompt now offers at most three: TALK to the leader, the action that
// matters most right now, and CAMP SERVICES, a menu holding the rest.
// docs/planning/qa-2026-10-08-camp-interaction-audit.md

export const CAMP_PROMPT_LIMIT = 3;

// Most relevant first. Standing beside a resident is a clear intent, so
// talking to them comes before any service.
export const CAMP_ACTION_PRIORITY = Object.freeze([
    'talk-resident',
    'quest-offer',
    'shore-up',
    'treat-scar',
    'support',
    'active-verb',
    'bond',
    'package-deal',
    'settle-companion',
    'rest',
    'field-workbench'
]);

function rank(entry) {
    const index = CAMP_ACTION_PRIORITY.indexOf(entry.action);
    return index < 0 ? CAMP_ACTION_PRIORITY.length : index;
}

/**
 * @param {object[]} actions every action available where the player stands
 * @param {{ servicesLabel: (count: number) => string }} options
 * @returns {object[]} at most CAMP_PROMPT_LIMIT entries; a `services` entry
 *   carries the rest in `services`
 */
export function trimCampPromptActions(actions, { servicesLabel = (count) => `CAMP SERVICES (${count})` } = {}) {
    if (!Array.isArray(actions) || actions.length <= CAMP_PROMPT_LIMIT) return actions;
    const talk = actions.find((entry) => entry.action === 'talk') ?? null;
    const rest = actions.filter((entry) => entry !== talk).sort((left, right) => rank(left) - rank(right));
    const shown = talk ? [talk] : [];
    while (shown.length < CAMP_PROMPT_LIMIT - 1 && rest.length) shown.push(rest.shift());
    shown.push({ camp: actions[0].camp, action: 'services', services: rest, label: servicesLabel(rest.length) });
    return shown;
}
