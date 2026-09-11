#!/usr/bin/env node
// Reproducible source/asset audit and scenario model, not measured player data.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SeasonPassManager, TIER_REWARDS } from '../src/seasonPass.js';
import { SEASON_ONE } from '../src/data/seasonOneConfig.js';
import { SEASON_ONE_COSMETICS } from '../src/data/seasonOneCatalog.js';
import { getCatalogIds, getCatalogEntry } from '../src/itemOwnership.js';
import { getArmoryModel } from '../src/armoryAssets.js';
import { isMaterialFinish } from '../src/weaponFinishMaterial.js';
import { getCampTrades } from '../src/campEconomy.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exists = asset => asset && fs.existsSync(path.join(root, 'public', asset.replace(/^\//, '')));
const featured = SEASON_ONE_COSMETICS.map(item => {
    const model = getArmoryModel(item.itemdefid);
    return { id: item.itemdefid, name: item.name, track: item.track, rank: item.rank,
        compatibility: item.compatibility, icon: item.localImg, iconExists: Boolean(exists(item.localImg)),
        model, modelExists: Boolean(exists(model)),
        presentation: isMaterialFinish(item.itemdefid) ? 'Procedural weapon finish' : item.category === 'decal' ? 'Chest patch using canonical icon' : 'Authored model' };
});
const gaps = featured.filter(item => !item.iconExists || (item.presentation === 'Authored model' && !item.modelExists));
const supply = TIER_REWARDS.reduce((total, row) => {
    if (row.free.kind === 'supply_bundle') for (const key of ['tech', 'coin', 'med']) total[key] += row.free[key];
    return total;
}, { tech: 0, coin: 0, med: 0 });

const tradeRanges = {};
for (const id of ['camp_meridian', 'camp_tallow', 'camp_vesper']) {
    for (const cls of ['SCOUT', 'TANK', 'ENGINEER']) for (let level = 0; level <= 3; level++) for (let bond = 0; bond <= 5; bond++) {
        for (const quote of getCampTrades({ id, level, bond }, cls)) {
            const buy = quote.id.startsWith('buy_');
            const resource = Object.keys(buy ? quote.receive : quote.give)[0];
            const ranges = tradeRanges[resource] ??= { minBuy: Infinity, maxSell: 0 };
            if (buy) ranges.minBuy = Math.min(ranges.minBuy, quote.give.shells / quote.receive[resource]);
            else ranges.maxSell = Math.max(ranges.maxSell, quote.receive.shells / quote.give[resource]);
        }
    }
}

function scenario(sessionsWeekly, successRate, joinWeek, directives, intake, veteran) {
    let week = joinWeek;
    const pass = new SeasonPassManager({ now: () => Date.parse(SEASON_ONE.featuredStart) + (week - 1) * 604800000 });
    if (!directives) pass.progressDirectives = () => 0;
    pass.completeOnboarding('target', { itemdefid: 4120 });
    pass.completeOnboarding('fabricated');
    pass.completeOnboarding('equipped');
    const ranks = {};
    let sessions = 0;
    let shells = veteran ? 500 : 0;
    for (let n = 0; n < 150 && pass.getCurrentTier() < 30; n++) {
        week = joinWeek + Math.floor(n / sessionsWeekly);
        const id = `simulation:${n}`;
        pass.beginRun(id);
        for (let o = 0; o < 4; o++) pass.recordEvent({ runId: id, kind: 'objective', id: `o:${o}` });
        pass.recordEvent({ runId: id, kind: 'depth', id: 'd:1', tier: 1, crossing: true });
        // One useful activity per week; veterans use repeatable camp work, not forced purchases.
        if (n % sessionsWeekly === 0) pass.recordEvent({ runId: id, kind: 'activity', id: `camp:${week}` });
        const extracted = Math.floor((n + 1) * successRate) > Math.floor(n * successRate);
        pass.settleRun(id, extracted ? 'extracted' : 'failed');
        sessions++;
        shells += intake === 'low' ? 5 : 30;
        for (const rank of [3, 15, 30]) if (!ranks[rank] && pass.getCurrentTier() >= rank) ranks[rank] = sessions;
    }
    const perRun = intake === 'low' ? { tech: 5, coin: 3, med: 1 } : { tech: 20, coin: 12, med: 5 };
    // Illustrative bank after one guaranteed field print and Foundry activation.
    // Other voluntary sinks omitted explicitly; this is not a perpetual economy forecast.
    const balance = Object.fromEntries(Object.entries(perRun).map(([key, value]) => [key,
        value * sessions + supply[key] + ({ tech: 20, coin: 10, med: 5 })[key]
        - (veteran ? 0 : ({ tech: 37, coin: 16, med: 5 })[key])]));
    return { sessionsWeekly, successRate, joinWeek, directives, intake, veteran, sessions, hours: +(sessions * 2 / 3).toFixed(1), ranks,
        balance: { ...balance, shells }, common: pass.state.fragments.common, rare: pass.state.fragments.rareWeeks.length };
}
const scenarios = [];
for (const sessions of [2, 3, 5]) for (const success of [0.4, 0.6, 0.8]) for (const join of [1, 5]) {
    for (const directives of [true, false]) for (const intake of ['low', 'high']) for (const veteran of [false, true]) {
        scenarios.push(scenario(sessions, success, join, directives, intake, veteran));
    }
}
const allocation = getCatalogIds().map(id => {
    const item = getCatalogEntry(id);
    const placement = featured.find(entry => entry.id === Number(id));
    let role = placement ? `${placement.track}: ${placement.rank}` : 'Legacy inventory; not a featured season reward';
    if (Number(id) === 1000 || Number(id) === 1100) role = 'Finite local workshop ingredient; Steam issuance disabled';
    else if (item.source === 'community') role = 'Default community identity — preserve free access';
    else if (item.source === 'achievement') role = 'Permanent achievement path; readiness remains separate';
    else if (['mod', 'hud', 'vfx', 'audio', 'reagent', 'shard', 'container', 'key', 'key_bundle'].includes(item.type)) role = 'Excluded from new season emissions; preserve legacy ownership';
    return { id, name: item.name, type: item.type, role };
});
const report = { rules: SEASON_ONE, supply, featured, assetGaps: gaps, tradeRanges, scenarios, allocation };
const reportDir = path.join(root, 'docs/reports');
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, 'season-one-audit.json'), JSON.stringify(report, null, 2) + '\n');
const lines = ['# Beta Season 1 — Reproducible Configuration Audit', '',
    'Generated by `node scripts/season-one-audit.js`. These are source checks and modeled scenarios, not live Steam acceptance or measured player behavior.', '',
    `Featured cosmetics: ${featured.length}. Missing required icons/models: ${gaps.length}. Free pass supplies: ${supply.tech} Tech / ${supply.coin} Coin / ${supply.med} Med.`, '',
    '## Featured assets and compatibility', '', '| ID | Canonical name | Placement | Compatibility | Presentation | Asset check |', '|---|---|---|---|---|---|',
    ...featured.map(i => `| ${i.id} | ${i.name} | ${i.track} ${i.rank} | ${i.compatibility} | ${i.presentation} | ${gaps.includes(i) ? 'GAP' : 'Files present'} |`), '',
    'File presence does not certify every animation, attachment, camera angle or physical Deck presentation. The class and weapon identifiers above are the runtime identifiers, which differ from several names in the original draft.', '',
    '## Camp exchange bounds', '', '| Resource | Minimum buy cost (Shells/unit) | Maximum sell proceeds (Shells/unit) |', '|---|---:|---:|',
    ...Object.entries(tradeRanges).map(([resource, r]) => `| ${resource} | ${r.minBuy} | ${r.maxSell} |`), '',
    'Exhaustive enumeration: 3 camps × 3 classes × 4 levels × 6 bonds. Every sale returns less than the cheapest purchase across all camps; the common Shell reference closes mixed camp cycles as well as same-camp reversals.', '',
    '## Pacing scenarios', '',
    'Four unique objectives and one forward crossing per 40-minute session; one useful camp activity per week; deterministic extraction sequence at the indicated success rate. Onboarding totals 3,000 XP. All released directives overlap play; after week 8 their finite backlog remains. The full JSON contains 144 new/established, low/high intake, on-time/catch-up and with/without-directive scenarios.', '',
    '| Sessions/week | Extraction success | Join week | Directives | Sessions to rank 30 | Hours |', '|---:|---:|---:|---|---:|---:|',
    ...scenarios.filter(s => !s.veteran && s.intake === 'low' && (s.joinWeek === 1 || s.sessionsWeekly === 3)).map(s => `| ${s.sessionsWeekly} | ${s.successRate * 100}% | ${s.joinWeek} | ${s.directives ? 'Retained weeklies' : 'None'} | ${s.sessions} | ${s.hours} |`), '',
    'Balances in JSON are illustrative accumulation after a field print and Foundry activation for new operators. Established operators start with 500 Shells and omit those completed sinks. Further upgrades, repairs, camp consumption, player deaths and resource intake require observed traces; these figures do not claim an economy equilibrium. Guaranteed field-print affordability occurs after the first valid objective via the one-time 20/10/5 grant, independent of random pickup intake.', '',
    'New local fragment ceiling: 24 Common + 8 Rare. Both recipes consume 15 Common + 2 Rare total, leaving 9 Common + 6 Rare. Existing Steam generators and milestone grants are separate sources; this configuration enables no new Steam issuance.', '',
    '## Complete catalog allocation', '', '| ID | Object | Family | Season role |', '|---|---|---|---|',
    ...allocation.map(i => `| ${i.id} | ${i.name} | ${i.type} | ${i.role} |`), ''];
fs.writeFileSync(path.join(reportDir, 'season-one-audit.md'), lines.join('\n'));
console.log(JSON.stringify({ featured: featured.length, assetGaps: gaps, tradeRanges, scenarios: scenarios.length, catalog: allocation.length }, null, 2));
if (gaps.length || Object.values(tradeRanges).some(r => r.minBuy <= r.maxSell)) process.exitCode = 1;
