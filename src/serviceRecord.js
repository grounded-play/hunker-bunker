// SERVICE RECORD (Archive → RECORDS): the player's all-time numbers, from the
// saved achievement stats (src/achievements.js) and the campaign ledger.
// Pure: labels come from `t`, numbers from Intl, so it renders the same in
// every locale and is testable without a DOM.

export function formatDuration(ms) {
    const seconds = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const rest = seconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    if (hours) return `${hours}h ${pad(minutes)}m`;
    if (minutes) return `${minutes}m ${pad(rest)}s`;
    return `${rest}s`;
}

function count(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

function isoDate(ms) {
    const n = Number(ms);
    if (!Number.isFinite(n) || n <= 0) return '';
    return new Date(n).toISOString().slice(0, 10);
}

export function buildServiceRecord({ stats = {}, ledger = {}, totals = {}, t = (key) => key, locale = 'en' } = {}) {
    const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
    const n = (value) => number.format(count(value));
    const progress = (value, total) => (count(total) ? `${n(value)} / ${n(total)}` : n(value));
    const tierNames = Array.isArray(totals.tierNames) && totals.tierNames.length ? totals.tierNames : ['SURFACE'];
    const tier = Math.min(tierNames.length - 1, Math.floor(count(stats.maxDepthTier)));
    const lore = Math.max(count(stats.loreDrops), Array.isArray(stats.loreDropIds) ? stats.loreDropIds.length : 0);
    const endings = Object.keys(stats.endings ?? {}).length;
    const classes = Object.values(stats.classesCompleted ?? {}).filter(Boolean).length;
    const row = (id, value) => ({ id, labelKey: `ui.records.${id}`, display: value });

    return [
        {
            id: 'career',
            titleKey: 'ui.records.section_career',
            rows: [
                row('runs', n(stats.runCount)),
                row('victories', n(stats.victories)),
                row('deaths', n(stats.totalDeaths)),
                row('longestRun', formatDuration(stats.maxRunMs)),
                ...(isoDate(ledger.startedAt) ? [row('since', isoDate(ledger.startedAt))] : [])
            ]
        },
        {
            id: 'combat',
            titleKey: 'ui.records.section_combat',
            rows: [
                row('hostiles', n(stats.totalKills)),
                row('mostInRun', n(stats.maxKillsOneRun)),
                row('queen', t(stats.queenDefeated ? 'ui.records.yes' : 'ui.records.not_yet'))
            ]
        },
        {
            id: 'exploration',
            titleKey: 'ui.records.section_exploration',
            rows: [
                row('deepest', tierNames[tier]),
                row('distance', `${n(stats.totalDistanceTravelled)}u`),
                row('camps', n(stats.maxCampsDiscoveredOneRun))
            ]
        },
        {
            id: 'story',
            titleKey: 'ui.records.section_story',
            rows: [
                row('lore', progress(lore, totals.lore)),
                row('endings', progress(endings, totals.endings)),
                row('classes', progress(classes, totals.classes)),
                row('shells', n(stats.shellsCollected))
            ]
        }
    ];
}
