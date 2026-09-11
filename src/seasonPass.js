// ── Beta Season 1: Deep Crust Protocol — Tactical Dossier ──────────────────
// Source of truth: docs/hunker-bunker-beta-season-1-plan.md §4, §6.
//
// 30 Ranks @ 1,500 XP / Rank = 45,000 XP total.
// Free Track: every rank has a reward (10 cosmetics + 20 supply bundles).
// Classified Dossier: 10 premium cosmetics + purchase grant (4101 Hazard Stripe SMG).
// Dual-track progression with retry-safe idempotent receipt tracking.

import { SEASON_ONE, releasedSeasonWeeks, seasonDirectives } from './data/seasonOneConfig.js';
import { getSeasonOneCosmetic } from './data/seasonOneCatalog.js';

export const XP_PER_TIER = SEASON_ONE.xpPerRank;
export const TOTAL_TIERS = 30;
export const STORAGE_KEY = 'hb_season_deep_crust_beta_1_v1';
export const LEGACY_STORAGE_KEY = 'hb_season_pass_v1';

export const PASS_CHAPTERS = Object.freeze([
    { id: 'cold_start', name: 'Cold Start', startTier: 1, endTier: 10 },
    { id: 'signal_below', name: 'Signal Below', startTier: 11, endTier: 20 },
    { id: 'living_core', name: 'The Living Core', startTier: 21, endTier: 30 }
]);

// XP awarded per gameplay milestone (docs/hunker-bunker-beta-season-1-plan.md §7).
export const XP_SOURCES = Object.freeze({
    roomCleared: 50, depthCrossed: 250, qualifyingExtraction: 300,
    bossDefeated: 500, weeklyDirective: 1000, onboarding: 1000
});

// Reward descriptors:
function item(itemdefid, label, qty = 1) {
    return Object.freeze({ kind: 'item', itemdefid, qty, label: getSeasonOneCosmetic(itemdefid)?.name ?? label });
}
function supply(tech = 5, coin = 2, med = 1, label = 'Supply Bundle (5 Tech, 2 Coin, 1 Med)') {
    return { kind: 'supply_bundle', tech, coin, med, qty: 1, label };
}
function classChoice() {
    return {
        kind: 'class_choice',
        choices: [4112, 4113, 4114],
        qty: 1,
        label: 'Class Choice: Drill Engineer (4112) / Vanguard Scout (4113) / Trench Warden (4114)'
    };
}

// Purchase grant immediately available upon unlocking Classified Dossier
export const PURCHASE_GRANT = Object.freeze(item(4101, 'Hazard Stripe SMG'));

// Canonical 30-rank schedule (Beta Season 1 Deep Crust Protocol §6)
export const TIER_REWARDS = Object.freeze([
    // Chapter 1: Cold Start (Ranks 1–10)
    { free: item(4120, 'Sub-Zero Pioneer Patch'), premium: null },                                // Rank 1
    { free: supply(), premium: null },                                                            // Rank 2
    { free: item(4130, 'Mini Cryo-Core Charm'), premium: item(4121, 'Radiation Trefoil Emblem') },// Rank 3
    { free: supply(), premium: null },                                                            // Rank 4
    { free: supply(), premium: null },                                                            // Rank 5
    { free: item(4100, 'Sub-Zero Frostbite Sidearm'), premium: item(4131, 'Spent 50-Cal Casing Charm') }, // Rank 6
    { free: supply(), premium: null },                                                            // Rank 7
    { free: supply(), premium: null },                                                            // Rank 8
    { free: item(4122, 'Sporesnail Hunter Crest'), premium: item(4103, 'Cryo-Plasma Arc Driver') }, // Rank 9
    { free: supply(), premium: null },                                                            // Rank 10

    // Chapter 2: Signal Below (Ranks 11–20)
    { free: supply(), premium: null },                                                            // Rank 11
    { free: item(4132, 'Sporesnail Pearl Charm'), premium: item(4124, 'Cyber-Skull Tactical Pin') }, // Rank 12
    { free: supply(), premium: null },                                                            // Rank 13
    { free: supply(), premium: null },                                                            // Rank 14
    { free: classChoice(), premium: item(4116, 'Bio-Synthesizer Harness') },                     // Rank 15
    { free: supply(), premium: null },                                                            // Rank 16
    { free: supply(), premium: null },                                                            // Rank 17
    { free: item(4104, 'Rust & Bone Trench Carbine'), premium: item(4134, 'Glitched RAM Card Charm') }, // Rank 18
    { free: supply(), premium: null },                                                            // Rank 19
    { free: supply(), premium: null },                                                            // Rank 20

    // Chapter 3: The Living Core (Ranks 21–30)
    { free: item(4135, 'Geodetic Compass Charm'), premium: item(4115, 'Void Commando Recon') },    // Rank 21
    { free: supply(), premium: null },                                                            // Rank 22
    { free: supply(), premium: null },                                                            // Rank 23
    { free: supply(), premium: null },                                                            // Rank 24
    { free: item(4125, 'Cryo-Phoenix Insignia'), premium: item(4138, 'Dark Matter Micro-Singularity Charm') }, // Rank 25
    { free: supply(), premium: null },                                                            // Rank 26
    { free: supply(), premium: null },                                                            // Rank 27
    { free: supply(), premium: null },                                                            // Rank 28
    { free: supply(), premium: null },                                                            // Rank 29
    { free: item(4110, "Queen's Carapace Carbine"), premium: item(4119, 'Hive-Lord Symbiote Exosuit') } // Rank 30
]);


const copy = value => JSON.parse(JSON.stringify(value));
const validTrack = track => track === 'free' || track === 'premium';
const noAward = source => ({ xpAwarded: 0, source, tiersCrossed: [] });
function createDefaultState() {
    return { seasonId: SEASON_ONE.id, version: SEASON_ONE.version, xp: 0,
        events: [], runs: {}, activeRunId: null, directives: {}, receipts: {},
        onboarding: {}, pinnedTarget: null, fragments: { common: 0, rareWeeks: [] } };
}

// Local progression only. Never accepted as evidence for a Steam grant or purchase.
// All changes persist before publishing state; callers serialize browser mutations
// with the Web Locks API. Delivery adapters additionally deduplicate at the sink.
export class SeasonPassManager {
    constructor({ storage = null, now = () => Date.now(), entitlement = null } = {}) {
        this.storage = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
        this.now = now;
        this.entitlement = entitlement;
        try { this.state = this.load(); }
        catch { this.state = createDefaultState(); }
    }

    load() {
        const raw = this.storage?.getItem(STORAGE_KEY);
        if (!raw) return createDefaultState();
        const parsed = JSON.parse(raw);
        if (parsed?.seasonId !== SEASON_ONE.id || parsed.version !== SEASON_ONE.version
            || !Number.isSafeInteger(parsed.xp) || parsed.xp < 0) {
            throw new Error('Season save is incompatible. Preserve it for recovery.');
        }
        return { ...createDefaultState(), ...parsed };
    }

    refresh() { if (this.storage) this.state = this.load(); return this.state; }
    save(next = this.state) {
        this.storage?.setItem(STORAGE_KEY, JSON.stringify(next));
        this.state = next;
    }
    mutate(callback) {
        this.refresh();
        const next = copy(this.state);
        const result = callback(next);
        this.save(next);
        return result;
    }
    getTotalXp() { return this.state.xp; }
    getCurrentTier() { return Math.min(TOTAL_TIERS, Math.floor(this.state.xp / XP_PER_TIER)); }
    getTierProgress() {
        const tier = this.getCurrentTier();
        const xpIntoTier = tier === TOTAL_TIERS ? 0 : this.state.xp % XP_PER_TIER;
        return { tier, xpIntoTier, xpForNextTier: tier === TOTAL_TIERS ? 0 : XP_PER_TIER,
            fraction: tier === TOTAL_TIERS ? 1 : xpIntoTier / XP_PER_TIER };
    }
    // Entitlement is supplied by a verified service adapter, never persisted as a
    // self-asserted premium flag. Production adapter remains disabled for this beta.
    hasPremium() { return this.entitlement?.seasonId === SEASON_ONE.id && this.entitlement?.verified === true && this.entitlement?.owned === true; }
    setPremium() { return false; }
    setVerifiedEntitlement(entitlement) { this.entitlement = entitlement; }
    getReleasedWeeks() { return releasedSeasonWeeks(this.now()); }

    award(next, amount, source) {
        const before = Math.min(TOTAL_TIERS, Math.floor(next.xp / XP_PER_TIER));
        const previousXp = next.xp;
        next.xp = Math.min(TOTAL_TIERS * XP_PER_TIER, next.xp + amount);
        const after = Math.min(TOTAL_TIERS, Math.floor(next.xp / XP_PER_TIER));
        return { xpAwarded: next.xp - previousXp, source,
            tiersCrossed: Array.from({ length: after - before }, (_, index) => before + index + 1) };
    }
    addXp(amount, source = 'unknown', eventId = null) {
        if (!Number.isSafeInteger(amount) || amount <= 0) return noAward(source);
        return this.mutate(next => {
            if (eventId && next.events.includes(eventId)) return noAward(source);
            if (eventId) next.events.push(eventId);
            return this.award(next, amount, source);
        });
    }
    beginRun(runId, initialDepth = 0) {
        if (typeof runId !== 'string' || !runId) return false;
        return this.mutate(next => {
            if (next.runs[runId]) return false;
            const previous = next.runs[next.activeRunId];
            if (previous?.status === 'active') previous.status = 'abandoned';
            next.activeRunId = runId;
            next.runs[runId] = { status: 'active', objectives: [], depths: [], bosses: [],
                initialDepth, xpBefore: next.xp, xpAfter: next.xp };
            return true;
        });
    }
    progressDirectives(next, kind) {
        let xp = 0;
        for (const directive of seasonDirectives(this.getReleasedWeeks())) {
            if (directive.kind !== kind) continue;
            const progress = next.directives[directive.id] ?? 0;
            if (progress >= directive.target) continue;
            next.directives[directive.id] = progress + 1;
            if (progress + 1 === directive.target) xp += directive.xp;
        }
        for (let week = 1; week <= this.getReleasedWeeks(); week++) {
            const set = seasonDirectives(week).filter(entry => entry.week === week);
            if (set.every(entry => next.directives[entry.id] >= entry.target) && !next.fragments.rareWeeks.includes(week)) {
                next.fragments.rareWeeks.push(week);
                this.intent(next, `fragment:rare:${week}`, { kind: 'item', itemdefid: 1100, qty: 1, label: 'Rare Relic Fragment' });
            }
        }
        return xp;
    }
    recordActivity(id) {
        if (typeof id !== 'string' || !id) return noAward('activity');
        return this.mutate(next => {
            const key = `activity:${id}`;
            if (next.events.includes(key)) return noAward('activity');
            next.events.push(key);
            return this.award(next, this.progressDirectives(next, 'activity'), 'activity');
        });
    }
    recordEvent({ runId, kind, id, tier, crossing = false } = {}) {
        if (!['objective', 'depth', 'boss', 'activity'].includes(kind) || typeof id !== 'string' || !id) return noAward(kind);
        return this.mutate(next => {
            const run = next.runs[runId];
            if (!run || run.status !== 'active' || next.activeRunId !== runId) return noAward(kind);
            const eventKey = `${runId}:${kind}:${id}`;
            if (next.events.includes(eventKey)) return noAward(kind);
            let xp = 0;
            if (kind === 'depth') {
                if (!crossing || !Number.isInteger(tier) || tier <= run.initialDepth || tier > 3 || run.depths.includes(tier)) return noAward(kind);
                run.depths.push(tier);
                xp = XP_SOURCES.depthCrossed;
            } else if (kind === 'objective') {
                if (run.objectives.includes(id)) return noAward(kind);
                run.objectives.push(id);
                if (run.objectives.length <= 6) xp = XP_SOURCES.roomCleared;
                if (!next.onboarding.objective) {
                    next.onboarding.objective = true;
                    xp += XP_SOURCES.onboarding;
                    this.intent(next, 'onboarding:supplies', { kind: 'supply_bundle', tech: 20, coin: 10, med: 5, qty: 1, label: 'First objective supplies: 20 Tech / 10 Coin / 5 Med' });
                }
            } else if (kind === 'boss') {
                if (run.bosses.includes(id)) return noAward(kind);
                run.bosses.push(id);
                xp = XP_SOURCES.bossDefeated;
            }
            next.events.push(eventKey);
            xp += this.progressDirectives(next, kind);
            const result = this.award(next, xp, kind);
            run.xpAfter = next.xp;
            return result;
        });
    }
    settleRun(runId, outcome) {
        if (!['extracted', 'failed', 'abandoned'].includes(outcome)) return noAward('settlement');
        return this.mutate(next => {
            const run = next.runs[runId];
            if (!run || run.status !== 'active') return noAward('settlement');
            const qualifying = outcome === 'extracted' && run.objectives.length >= 3;
            run.status = outcome;
            run.extractionBonus = qualifying ? XP_SOURCES.qualifyingExtraction : 0;
            if (qualifying && next.fragments.common < this.getReleasedWeeks() * SEASON_ONE.commonPerWeek) {
                next.fragments.common++;
                this.intent(next, `fragment:common:${runId}`, { kind: 'item', itemdefid: 1000, qty: 1, label: 'Common Relic Fragment' });
            }
            const result = this.award(next, run.extractionBonus, 'settlement');
            run.xpAfter = next.xp;
            return result;
        });
    }
    completeOnboarding(stage, target = null) {
        if (!['target', 'fabricated', 'equipped'].includes(stage)) return noAward('onboarding');
        return this.mutate(next => {
            if (stage === 'target' && target) next.pinnedTarget = target;
            if (next.onboarding[stage]) return noAward('onboarding');
            next.onboarding[stage] = true;
            let xp = stage === 'target' ? XP_SOURCES.onboarding : 0;
            if (next.onboarding.fabricated && next.onboarding.equipped && !next.onboarding.usefulLoop) {
                next.onboarding.usefulLoop = true;
                xp += XP_SOURCES.onboarding;
            }
            return this.award(next, xp, 'onboarding');
        });
    }
    getActiveWeeklies() {
        return seasonDirectives(this.getReleasedWeeks()).map(entry => {
            const progress = this.state.directives[entry.id] ?? 0;
            return { ...entry, progress, completed: progress >= entry.target, claimed: progress >= entry.target };
        });
    }
    getReward(tier, track) {
        if (!validTrack(track) || !Number.isInteger(tier)) return null;
        if (tier === 0 && track === 'premium') return PURCHASE_GRANT;
        return TIER_REWARDS[tier - 1]?.[track] ?? null;
    }
    claimKey(tier, track) { return `rank:${tier}:${track}`; }
    isClaimed(tier, track) { return this.state.receipts[this.claimKey(tier, track)]?.status === 'confirmed'; }
    canClaim(tier, track) {
        return Boolean(this.getReward(tier, track)) && tier <= this.getCurrentTier()
            && (track !== 'premium' || this.hasPremium()) && !this.isClaimed(tier, track);
    }
    intent(next, key, reward, details = {}) {
        if (!next.receipts[key]) next.receipts[key] = {
            id: `${SEASON_ONE.id}:${key}`, key, reward, ...details, status: 'pending'
        };
        return copy(next.receipts[key]);
    }
    claim(tier, track, { selectedChoice = null, ownedChoices = [] } = {}) {
        this.refresh();
        if (!this.canClaim(tier, track)) return null;
        const key = this.claimKey(tier, track);
        const existing = this.state.receipts[key];
        if (existing) return { ...existing.reward, receiptId: existing.id };
        let reward = this.getReward(tier, track);
        if (reward.kind === 'class_choice') {
            const unowned = reward.choices.filter(id => !ownedChoices.includes(id));
            if (!(unowned.length ? unowned : reward.choices).includes(selectedChoice)) return null;
            reward = { ...reward, selectedItemdefid: selectedChoice, itemdefid: selectedChoice,
                label: getSeasonOneCosmetic(selectedChoice).name };
        }
        const receipt = this.mutate(next => this.intent(next, key, reward, { tier, track }));
        return { ...receipt.reward, receiptId: receipt.id };
    }
    claimPurchaseGrant() { return this.claim(0, 'premium'); }
    getPendingClaims() { return Object.values(this.state.receipts).filter(entry => entry.status !== 'confirmed').map(copy); }
    resolvePendingClaim(id, status = 'confirmed') {
        if (!['confirmed', 'pending', 'failed'].includes(status)) return false;
        return this.mutate(next => {
            const receipt = Object.values(next.receipts).find(entry => entry.id === id);
            if (!receipt || receipt.status === 'confirmed') return false;
            receipt.status = status;
            return true;
        });
    }
    async settleRewards(deliver) {
        this.refresh();
        for (const { tier, track } of this.getClaimableTiers()) {
            if (this.getReward(tier, track).kind !== 'class_choice') this.claim(tier, track);
        }
        if (this.hasPremium()) this.claimPurchaseGrant();
        const results = [];
        for (const receipt of this.getPendingClaims()) {
            if (receipt.track === 'premium' && !this.hasPremium()) continue;
            try {
                const result = await deliver(receipt.reward, receipt.id);
                if (result?.ok === true) this.resolvePendingClaim(receipt.id);
                results.push({ id: receipt.id, ...result });
            } catch { results.push({ id: receipt.id, ok: false, reason: 'delivery_pending' }); }
        }
        return results;
    }
    getClaimableTiers() {
        const result = [];
        for (let tier = 1; tier <= this.getCurrentTier(); tier++) {
            for (const track of ['free', 'premium']) if (this.canClaim(tier, track)) result.push({ tier, track });
        }
        return result;
    }
    getChapterForTier(tier) { return PASS_CHAPTERS.find(ch => tier >= ch.startTier && tier <= ch.endTier) ?? null; }
    reset() { this.entitlement = null; this.save(createDefaultState()); }
}

let localQueue = Promise.resolve();
export function withSeasonLock(action) {
    if (globalThis.navigator?.locks?.request) return navigator.locks.request(STORAGE_KEY, action);
    const result = localQueue.then(action);
    localQueue = result.catch(() => {});
    return result;
}
