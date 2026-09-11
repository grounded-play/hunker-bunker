// Internal free beta rules. Commerce and Steam emissions are deliberately gated.
export const SEASON_ONE = Object.freeze({
    id: 'deep-crust-beta-1', version: 1, name: 'Deep Crust Protocol',
    featuredStart: '2026-09-11T00:00:00Z', featuredWeeks: 8,
    ranks: 30, xpPerRank: 1500, archivePolicy: 'finish-later',
    commerceEnabled: false, steamEmissionsEnabled: false,
    commonPerWeek: 3, commonSeasonLimit: 24, rareSeasonLimit: 8
});

export const WEEKLY_DISPATCHES = Object.freeze([
    ['Cold Start', 'Bring something home. Pin a requisition, complete an objective, and put your first fabrication to work.'],
    ['Broken Signal', 'Meridian needs eyes below the frost. Survey the perimeter and reconnect a scanned route to the relay.'],
    ["Tallow’s Lifeline", 'A supply decision can save the squad. Visit a camp or advance a companion contract before pushing deeper.'],
    ['Hazard Shift', 'Elite nests are stirring. Choose a relic that fits your weapon, and keep a route back to oxygen.'],
    ['The Living Core', 'The hive remembers. Weigh the resources you take against the consequences you leave behind.'],
    ['Lost Squad', 'Follow recovery signals. A camp objective or companion stage counts equally for a solo operator.'],
    ["Queen’s Wake", 'Boss mastery is optional. Ordinary objectives and careful crossings still advance the Dossier.'],
    ['Return Manifest', 'Finish the route you chose. Archived directives and workshop allowances remain available.']
].map(([title, text], index) => Object.freeze({ week: index + 1, title, text })));

export function releasedSeasonWeeks(now = Date.now(), config = SEASON_ONE) {
    return Math.max(0, Math.min(config.featuredWeeks,
        Math.floor((Number(now) - Date.parse(config.featuredStart)) / 604800000) + 1));
}

export function seasonDirectives(weeks) {
    return WEEKLY_DISPATCHES.slice(0, weeks).flatMap(({ week }) => [
        { id: `week:${week}:objectives`, week, kind: 'objective', target: 8, title: 'Field Work', desc: 'Complete 8 distinct expedition objectives or decrypt field terminals.' },
        { id: `week:${week}:depth`, week, kind: 'depth', target: 2, title: 'Forward Survey', desc: 'Make 2 first forward depth crossings.' },
        { id: `week:${week}:activity`, week, kind: 'activity', target: 1, title: 'Useful Work', desc: 'Fabricate gear, advance a companion stage, or complete a camp objective.' }
    ].map(entry => ({ ...entry, xp: 1000 })));
}
