import { describe, expect, it } from 'vitest';
import {
    PASS_CHAPTERS,
    PURCHASE_GRANT,
    SeasonPassManager,
    TIER_REWARDS,
    TOTAL_TIERS,
    XP_PER_TIER
} from './seasonPass.js';
import { SEASON_ONE } from './data/seasonOneConfig.js';

function createMemoryStorage() {
    const store = new Map();
    return {
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => store.set(key, String(value)),
        removeItem: (key) => store.delete(key)
    };
}

describe('Beta Season 1 Tactical Dossier reward table (docs/hunker-bunker-beta-season-1-plan.md)', () => {
    it('has exactly 30 tiers (45,000 XP total @ 1,500 XP / tier)', () => {
        expect(TIER_REWARDS).toHaveLength(TOTAL_TIERS);
        expect(TOTAL_TIERS).toBe(30);
        expect(XP_PER_TIER).toBe(1500);
        expect(TOTAL_TIERS * XP_PER_TIER).toBe(45000);
    });

    it('free track has a guaranteed reward at every single rank (no empty rows)', () => {
        for (let i = 0; i < TIER_REWARDS.length; i++) {
            const row = TIER_REWARDS[i];
            expect(row.free, `Free track rank ${i + 1} must have a reward`).toBeTruthy();
            expect(row.free.label).toBeTruthy();
        }
    });

    it('free track has exactly 10 cosmetic milestones and 20 supply bundles', () => {
        let cosmetics = 0;
        let bundles = 0;
        for (const row of TIER_REWARDS) {
            if (row.free.kind === 'supply_bundle') {
                bundles++;
                expect(row.free.tech).toBe(5);
                expect(row.free.coin).toBe(2);
                expect(row.free.med).toBe(1);
            } else if (row.free.kind === 'item' || row.free.kind === 'class_choice') {
                cosmetics++;
            }
        }
        expect(bundles).toBe(20);
        expect(cosmetics).toBe(10);
    });

    it('classified dossier has exactly 10 premium cosmetics: 1 instant purchase grant plus 9 tiered milestones', () => {
        const premiumRewards = TIER_REWARDS.filter((row) => row.premium !== null);
        expect(premiumRewards).toHaveLength(9);
        for (const row of premiumRewards) {
            expect(row.premium.label).toBeTruthy();
        }
        expect(PURCHASE_GRANT.itemdefid).toBe(4101);
        expect(premiumRewards.length + 1).toBe(10);
    });

    it('divides the pass into 3 chapters of 10 ranks each', () => {
        expect(PASS_CHAPTERS).toHaveLength(3);
        expect(PASS_CHAPTERS[0]).toMatchObject({ id: 'cold_start', startTier: 1, endTier: 10 });
        expect(PASS_CHAPTERS[1]).toMatchObject({ id: 'signal_below', startTier: 11, endTier: 20 });
        expect(PASS_CHAPTERS[2]).toMatchObject({ id: 'living_core', startTier: 21, endTier: 30 });
    });
});

describe('SeasonPassManager (Beta Season 1)', () => {
    it('starts at tier 0 with no XP', () => {
        const manager = new SeasonPassManager({ storage: createMemoryStorage() });
        expect(manager.getTotalXp()).toBe(0);
        expect(manager.getCurrentTier()).toBe(0);
    });

    it('advances tiers as XP crosses each 1500 threshold', () => {
        const manager = new SeasonPassManager({ storage: createMemoryStorage() });
        manager.addXp(1499, 'test');
        expect(manager.getCurrentTier()).toBe(0);
        manager.addXp(1, 'test');
        expect(manager.getCurrentTier()).toBe(1);
        manager.addXp(XP_PER_TIER * 2, 'test');
        expect(manager.getCurrentTier()).toBe(3);
    });

    it('returns every tier crossed by a single XP award for sequential ceremony playback', () => {
        const manager = new SeasonPassManager({ storage: createMemoryStorage() });
        expect(manager.addXp(XP_PER_TIER * 3 + 25, 'test').tiersCrossed).toEqual([1, 2, 3]);
    });

    it('never exceeds the max tier even with excess XP', () => {
        const manager = new SeasonPassManager({ storage: createMemoryStorage() });
        manager.addXp(XP_PER_TIER * (TOTAL_TIERS + 10), 'test');
        expect(manager.getCurrentTier()).toBe(TOTAL_TIERS);
    });

    it('reports tier progress fraction correctly', () => {
        const manager = new SeasonPassManager({ storage: createMemoryStorage() });
        manager.addXp(750, 'test');
        const progress = manager.getTierProgress();
        expect(progress.tier).toBe(0);
        expect(progress.xpIntoTier).toBe(750);
        expect(progress.fraction).toBeCloseTo(0.5);
    });

    it('gates claiming on reaching the tier first', () => {
        const manager = new SeasonPassManager({ storage: createMemoryStorage() });
        expect(manager.canClaim(1, 'free')).toBe(false);
        manager.addXp(XP_PER_TIER, 'test');
        expect(manager.canClaim(1, 'free')).toBe(true);
        expect(manager.canClaim(2, 'free')).toBe(false);
    });

    it('gates premium-track claims behind hasPremium', () => {
        const manager = new SeasonPassManager({ storage: createMemoryStorage() });
        manager.addXp(XP_PER_TIER * 3, 'test');
        expect(manager.canClaim(3, 'premium')).toBe(false);
        manager.setVerifiedEntitlement({ seasonId: SEASON_ONE.id, verified: true, owned: true });
        expect(manager.canClaim(3, 'premium')).toBe(true);
    });

    it('claim() persists intent and only confirms after delivery', () => {
        const manager = new SeasonPassManager({ storage: createMemoryStorage() });
        manager.addXp(XP_PER_TIER, 'test');
        const reward = manager.claim(1, 'free');
        expect(reward).toBeTruthy();
        expect(manager.isClaimed(1, 'free')).toBe(false);
        expect(manager.claim(1, 'free').receiptId).toBe(reward.receiptId);

        const pending = manager.getPendingClaims();
        expect(pending).toHaveLength(1);
        expect(pending[0].tier).toBe(1);
        expect(pending[0].track).toBe('free');
        expect(pending[0].status).toBe('pending');
        manager.resolvePendingClaim(reward.receiptId);
        expect(manager.isClaimed(1, 'free')).toBe(true);
        expect(manager.claim(1, 'free')).toBeNull();
    });

    it('free and premium claim state are independent', () => {
        const manager = new SeasonPassManager({ storage: createMemoryStorage() });
        manager.addXp(XP_PER_TIER * 3, 'test');
        manager.setVerifiedEntitlement({ seasonId: SEASON_ONE.id, verified: true, owned: true });
        const reward = manager.claim(3, 'free');
        manager.resolvePendingClaim(reward.receiptId);
        expect(manager.isClaimed(3, 'free')).toBe(true);
        expect(manager.isClaimed(3, 'premium')).toBe(false);
    });

    it('awards the purchase grant immediately upon unlocking premium', () => {
        const manager = new SeasonPassManager({ storage: createMemoryStorage() });
        expect(manager.claimPurchaseGrant()).toBeNull();
        manager.setVerifiedEntitlement({ seasonId: SEASON_ONE.id, verified: true, owned: true });
        const grant = manager.claimPurchaseGrant();
        expect(grant).toMatchObject({ itemdefid: 4101, label: 'Hazard Stripe SMG' });
        manager.resolvePendingClaim(grant.receiptId);
        expect(manager.claimPurchaseGrant()).toBeNull();
    });

    it('supports rank 15 class selection', () => {
        const manager = new SeasonPassManager({ storage: createMemoryStorage() });
        manager.addXp(XP_PER_TIER * 15, 'test');
        const reward = manager.claim(15, 'free', { selectedChoice: 4113 });
        expect(reward.kind).toBe('class_choice');
        expect(reward.selectedItemdefid).toBe(4113);
    });

    it('starts a separate season while preserving legacy progress and entitlement evidence', () => {
        const storage = createMemoryStorage();
        storage.setItem('hb_season_pass_v1', JSON.stringify({
            version: 1,
            xp: 7500,
            hasPremium: true
        }));

        const manager = new SeasonPassManager({ storage });
        expect(manager.getTotalXp()).toBe(0);
        expect(manager.getCurrentTier()).toBe(0);
        expect(manager.hasPremium()).toBe(false);
        expect(JSON.parse(storage.getItem('hb_season_pass_v1')).xp).toBe(7500);
    });

    it('resets cleanly', () => {
        const manager = new SeasonPassManager({ storage: createMemoryStorage() });
        manager.addXp(XP_PER_TIER * 5, 'test');
        manager.setVerifiedEntitlement({ seasonId: SEASON_ONE.id, verified: true, owned: true });
        manager.claim(1, 'free');
        manager.reset();
        expect(manager.getTotalXp()).toBe(0);
        expect(manager.hasPremium()).toBe(false);
        expect(manager.isClaimed(1, 'free')).toBe(false);
    });
});
