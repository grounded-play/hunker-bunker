import { describe, it, expect } from 'vitest';
import {
    applyTrade,
    canActivateCampVerb,
    canApplyTrade,
    CAMP_AFTERMATH_DISPOSITIONS,
    CAMP_AFTERMATH_FORTIFIED_LEVEL,
    getAct2ClassPerks,
    getCampActiveVerb,
    getCampAftermathDisposition,
    getCampAftermathReason,
    getCampAftermathSummary,
    getCampTrades,
    getCampVerbEffects,
    isCampVerbDegraded,
    mergeCampVerbEffects
} from './campEconomy.js';
import { BankManager } from './bank.js';

function createMemoryStorage() {
    const store = {};
    return {
        getItem: (k) => store[k] ?? null,
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: (k) => { delete store[k]; }
    };
}

describe('Camp Economy Barter System', () => {
    it('generates trades and applies class affinity', () => {
        const meridianScout = getCampTrades({ id: 'camp_meridian', level: 1, bond: 2 }, 'SCOUT');
        const meridianEngineer = getCampTrades({ id: 'camp_meridian', level: 1, bond: 2 }, 'ENGINEER');

        const sellTechScout = meridianScout.find(t => t.id === 'sell_tech');
        const sellTechEngineer = meridianEngineer.find(t => t.id === 'sell_tech');

        // Engineer gets a class bonus at Meridian, so shells received should be higher
        expect(sellTechEngineer.receive.shells).toBeGreaterThan(sellTechScout.receive.shells);
    });

    it('validates and applies trades against bank state', () => {
        const storage = createMemoryStorage();
        const bank = new BankManager({ storage });
        bank.addShells(100);

        const trade = {
            id: 'buy_coin',
            give: { shells: 40 },
            receive: { coin: 5 }
        };

        expect(canApplyTrade(trade, bank.getState())).toBe(true);

        const success = applyTrade(trade, bank);
        expect(success).toBe(true);
        expect(bank.getState().shells).toBe(60);
        expect(bank.getState().coin).toBe(5);
    });

    it('turns camp identity into Wave 3 verb effects', () => {
        const meridian = getCampVerbEffects({ id: 'camp_meridian', level: 2, bond: 3 }, 'ENGINEER');
        const tallow = getCampVerbEffects({ id: 'camp_tallow', level: 2, bond: 4 }, 'SCOUT');
        const vesper = getCampVerbEffects({ id: 'camp_vesper', level: 3, bond: 2 }, 'TANK');

        expect(meridian.radar.rangeMult).toBeGreaterThan(1);
        expect(meridian.radar.cooldownMult).toBeLessThan(1);
        expect(tallow.humanityDecayMultiplier).toBeLessThan(1);
        expect(tallow.medkitInventory).toBeGreaterThan(0);
        expect(vesper.ammoReserve).toBeGreaterThan(0);
        expect(vesper.turretPlacementFavor).toBe(true);
    });

    it('merges camp verb effects for runtime consumers', () => {
        const merged = mergeCampVerbEffects([
            { id: 'camp_meridian', level: 1, bond: 2 },
            { id: 'camp_tallow', level: 2, bond: 3 },
            { id: 'camp_vesper', level: 1, bond: 1 }
        ], 'SCOUT');

        expect(merged.radar.rangeMult).toBeGreaterThan(1);
        expect(merged.humanityDecayMultiplier).toBeLessThan(1);
        expect(merged.medkitInventory).toBeGreaterThan(0);
        expect(merged.ammoReserve).toBeGreaterThan(0);
    });

    it('defines Act 2 class perks for Scout, Tank, and Engineer', () => {
        expect(getAct2ClassPerks('SCOUT').turretDetectionRadiusMult).toBeLessThan(1);
        expect(getAct2ClassPerks('TANK').shockGuardCharges).toBe(1);
        expect(getAct2ClassPerks('ENGINEER').canReprogramTurrets).toBe(true);
    });
});

describe('Camp Active Verbs (docs/faction-verb-matrix.md)', () => {
    it('defines one signature active verb per camp with cost + cooldown', () => {
        expect(getCampActiveVerb('camp_meridian')).toMatchObject({ id: 'route_intel', cost: { tech: 1 } });
        expect(getCampActiveVerb('camp_tallow')).toMatchObject({ id: 'triage', cost: { med: 1 }, cooldownSeconds: 90 });
        expect(getCampActiveVerb('camp_vesper')).toMatchObject({ id: 'field_resupply', cost: { coin: 1 }, cooldownSeconds: 120 });
        expect(getCampActiveVerb('camp_unknown')).toBeNull();
    });

    it('blocks activation when the player cannot afford the cost', () => {
        const result = canActivateCampVerb('camp_tallow', { bankState: { med: 0 } });
        expect(result).toEqual({ allowed: false, reason: 'insufficient_resources' });
    });

    it('allows activation with sufficient resources and no other constraints', () => {
        const result = canActivateCampVerb('camp_tallow', { bankState: { med: 3 } });
        expect(result).toEqual({ allowed: true, reason: null });
    });

    it('blocks Tallow triage while the passive humanity-decay buff is already at its floor', () => {
        const result = canActivateCampVerb('camp_tallow', { bankState: { med: 3 }, humanityDecayMultiplier: 0.45 });
        expect(result).toEqual({ allowed: false, reason: 'already_at_humanity_floor' });
    });

    it('enforces Vesper field resupply cooldown', () => {
        const onCooldown = canActivateCampVerb('camp_vesper', {
            bankState: { coin: 5 },
            nowSeconds: 100,
            lastUsedAtSeconds: 30
        });
        expect(onCooldown.allowed).toBe(false);
        expect(onCooldown.reason).toBe('on_cooldown');
        expect(onCooldown.remainingSeconds).toBeCloseTo(50, 5);

        const offCooldown = canActivateCampVerb('camp_vesper', {
            bankState: { coin: 5 },
            nowSeconds: 200,
            lastUsedAtSeconds: 30
        });
        expect(offCooldown).toEqual({ allowed: true, reason: null });
    });

    it('enforces Vesper once-per-boss-encounter and Meridian once-per-ring exploit rules', () => {
        expect(canActivateCampVerb('camp_vesper', {
            bankState: { coin: 5 },
            bossEncounterActive: true,
            usedThisBossEncounter: true
        })).toEqual({ allowed: false, reason: 'already_used_this_encounter' });

        expect(canActivateCampVerb('camp_meridian', {
            bankState: { tech: 5 },
            ring: 2,
            usedRings: new Set([1, 2])
        })).toEqual({ allowed: false, reason: 'ring_already_pinged' });

        expect(canActivateCampVerb('camp_meridian', {
            bankState: { tech: 5 },
            ring: 3,
            usedRings: new Set([1, 2])
        })).toEqual({ allowed: true, reason: null });
    });

    it('marks Meridian route intel as degraded (bad intel, not blocked) when the camp is robbed', () => {
        expect(isCampVerbDegraded('camp_meridian', 'robbed')).toBe(true);
        expect(isCampVerbDegraded('camp_meridian', 'alive')).toBe(false);
        expect(isCampVerbDegraded('camp_tallow', 'robbed')).toBe(false);
    });
});

// docs/sprint-22-systems-breakdown/03-factions-and-hives.md: "A fortified,
// robbed, culled, turned, or outed camp should not share the same
// population, props, audio, and interaction affordances" -- these tests
// cover the single disposition resolver that ties together the previously
// scattered status/suspicion/level/knowsPlayerInfected signals into one
// player-facing label + reason, per the doc's "State vs Presentation"
// requirement that a summary "must link to a reason ... when ambiguity
// matters."
describe('Camp Aftermath Disposition (docs/sprint-22-systems-breakdown/03-factions-and-hives.md)', () => {
    it('ranks culled above every other signal', () => {
        expect(getCampAftermathDisposition({
            status: 'culled',
            level: 3,
            suspicion: 100,
            knowsPlayerInfected: true
        })).toBe('culled');
    });

    it('ranks turned above outed/robbed signals', () => {
        expect(getCampAftermathDisposition({
            status: 'turned',
            suspicion: 100,
            knowsPlayerInfected: true
        })).toBe('turned');
    });

    it('resolves outed from high suspicion even when status is still alive', () => {
        expect(getCampAftermathDisposition({ status: 'alive', suspicion: 50 })).toBe('outed');
        expect(getCampAftermathDisposition({ status: 'alive', suspicion: 49 })).not.toBe('outed');
    });

    it('resolves outed from knowsPlayerInfected even when suspicion is still low', () => {
        expect(getCampAftermathDisposition({
            status: 'robbed',
            suspicion: 10,
            knowsPlayerInfected: true
        })).toBe('outed');
    });

    it('resolves robbed when not outed', () => {
        expect(getCampAftermathDisposition({ status: 'robbed', suspicion: 0 })).toBe('robbed');
    });

    it('resolves recruited when not outed', () => {
        expect(getCampAftermathDisposition({ status: 'recruited', suspicion: 0 })).toBe('recruited');
    });

    it('resolves fortified at the named support level with no other signal active', () => {
        expect(getCampAftermathDisposition({ status: 'alive', level: CAMP_AFTERMATH_FORTIFIED_LEVEL, suspicion: 0 }))
            .toBe('fortified');
        expect(getCampAftermathDisposition({ status: 'alive', level: CAMP_AFTERMATH_FORTIFIED_LEVEL - 1, suspicion: 0 }))
            .toBe('alive');
    });

    it('defaults to alive with no record', () => {
        expect(getCampAftermathDisposition()).toBe('alive');
        expect(getCampAftermathDisposition({})).toBe('alive');
    });

    it('gives every declared disposition a non-empty label and reason', () => {
        for (const disposition of CAMP_AFTERMATH_DISPOSITIONS) {
            expect(getCampAftermathReason(disposition).length).toBeGreaterThan(0);
        }
    });

    it('falls back to the alive reason for an unrecognized disposition', () => {
        expect(getCampAftermathReason('not_a_real_disposition')).toBe(getCampAftermathReason('alive'));
    });

    it('combines disposition, label, and reason into one summary', () => {
        const summary = getCampAftermathSummary({ status: 'robbed', suspicion: 0 });
        expect(summary.disposition).toBe('robbed');
        expect(summary.label).toBe('ROBBED');
        expect(summary.reason.length).toBeGreaterThan(0);
    });
});
