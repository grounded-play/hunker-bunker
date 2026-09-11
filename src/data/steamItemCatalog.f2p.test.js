import { describe, expect, it } from 'vitest';
import { STEAM_ITEM_CATALOG } from './steamItemCatalog.js';

// Hunker Bunker is free-to-play, and the rule is that anything purchasable must
// be cosmetic only. Items 4140-4147 shipped as tradable AND marketable while
// their store descriptions promised explicit mechanical advantage ("+1 Piercing
// Penetration", "+8% Cryo Freeze Duration"), which is sellable power. They are
// now earned-only; see docs/planning/cosmetic-loadout-gameplay-design-2026-09-10.md.
//
// This guards the rule rather than those eight ids, so a new item cannot
// reintroduce the problem by copying an old entry.

const items = Object.values(STEAM_ITEM_CATALOG);

// Phrases that describe a mechanical effect rather than an appearance. Kept
// deliberately narrow: a cosmetic may legitimately mention colour, shape or
// material, but not a number attached to a game statistic.
const EFFECT_PATTERNS = [
    /[+-]\s*\d+(\.\d+)?\s*%/,                 // "+8%", "-12%"
    /[+-]\s*\d+\s+\w+\s+(penetration|charge|damage|speed|radius|duration)/i,
    /\b(damage|penetration|recharge|cooldown|movement speed|pull radius|freeze duration)\b/i,
    /\brefunds?\b|\bgrants?\b\s+\+/i
];

const describesAnEffect = (item) => EFFECT_PATTERNS.some((re) => re.test(String(item.desc ?? '')));

describe('free-to-play catalog rule', () => {
    it('has items to check', () => {
        expect(items.length).toBeGreaterThan(0);
    });

    // The core rule. If this fails, either the item stopped being cosmetic or a
    // cosmetic description started promising a stat.
    it('never sells an item whose description promises a gameplay effect', () => {
        const sellable = items.filter((item) => item.tradable || item.marketable);
        const offenders = sellable
            .filter(describesAnEffect)
            .map((item) => `${item.itemdefid} ${item.name}: ${item.desc}`);

        expect(offenders).toEqual([]);
    });

    it('keeps the rig modules earned-only', () => {
        const modules = items.filter((item) => item.itemdefid >= 4140 && item.itemdefid <= 4147);
        expect(modules).toHaveLength(8);
        for (const module of modules) {
            expect(module.tradable, `${module.itemdefid} tradable`).toBe(false);
            expect(module.marketable, `${module.itemdefid} marketable`).toBe(false);
        }
    });

    // The detector has to actually detect; a pattern list that matches nothing
    // would make the rule above pass vacuously.
    it('recognises a mechanical promise when it sees one', () => {
        expect(describesAnEffect({ desc: '+8% Cryo Freeze Duration on elemental attacks.' })).toBe(true);
        expect(describesAnEffect({ desc: '+1 Piercing Penetration on kinetic weapon rounds.' })).toBe(true);
        expect(describesAnEffect({ desc: 'Tiny frosted core venting microscopic cold vapor.' })).toBe(false);
        expect(describesAnEffect({ desc: 'Reinforced heavy hazard plating and visor searchlight.' })).toBe(false);
    });
});
