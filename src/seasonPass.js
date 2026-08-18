// ── Season 0 Tactical Dossier — Battle Pass Progression ──────────────────
// Source of truth for the reward schedule: docs/season-zero-protocol/
// 04-battle-pass-and-progression-tiers.md §2-3. This module owns XP storage,
// tier math, and claim state; it does not grant items itself — callers pass
// a `grant(reward)` function (see src/seasonPassUi.js) so this stays testable
// without touching the DOM/inventory.

export const XP_PER_TIER = 5000;
export const TOTAL_TIERS = 50;
export const STORAGE_KEY = 'hb_season_pass_v1';

// XP awarded per gameplay milestone (doc 04 §2).
export const XP_SOURCES = Object.freeze({
    roomCleared: 50,
    eliteNestPurged: 250,
    floorCleared: 1000,
    bossDefeated: 2500,
    dailyBounty: 1500,
    weeklyDirective: 7500
});

// Reward descriptor shapes:
//   { kind: 'item', itemdefid, qty, label }   — Steam-catalog-style item (skin/charm/decal/mod/etc)
//   { kind: 'currency', currency, qty, label } — in-run economy currency, not itemdef-backed
//   { kind: 'cache', itemdefid, qty, label }   — Deep Relic Cache (reuses the existing 4000/4001
//                                                 sandbox cache+key itemdefs already used by
//                                                 src/steamVaultUi.js's crate-opening flow)
// `label` is always present so the UI can render something even when `itemdefid` isn't yet
// registered in src/data/steamItemCatalog.js (most of the 4100-4159 season catalog isn't — that's
// a known gap in the generated Steam schema, not something this module papers over).
function item(itemdefid, label, qty = 1) {
    return { kind: 'item', itemdefid, qty, label };
}
function currency(currencyId, qty, label) {
    return { kind: 'currency', currency: currencyId, qty, label };
}
function cache(label = 'Deep Relic Cache') {
    return { kind: 'cache', itemdefid: 4000, qty: 1, label };
}
function key(label = 'Relic Decryption Key') {
    return { kind: 'item', itemdefid: 4154, qty: 1, label };
}

// One entry per tier (index 0 = Tier 1 ... index 49 = Tier 50). `free`/`premium` are a reward
// descriptor or null (no reward that tier on that track). Transcribed from doc 04 §3.
export const TIER_REWARDS = Object.freeze([
    { free: currency('scrap', 500, '500x Fabrication Scrap'), premium: item(4100, 'Sub-Zero Frostbite Sidearm') },
    { free: null, premium: item(4130, 'Mini Cryo-Core Charm') },
    { free: item(4120, 'Sub-Zero Pioneer Patch'), premium: key() },
    { free: null, premium: item(4140, 'Cryo-Capacitor Overclock') },
    { free: cache(), premium: item(4101, 'Hazard Stripe SMG') },
    { free: null, premium: item(4121, 'Radiation Trefoil Emblem') },
    { free: item(4156, '20x Cryo-Alloy Ingots', 20), premium: item(4131, 'Spent 50-Cal Casing Charm') },
    { free: null, premium: item(4112, 'Sub-Terran Drill Engineer') },
    { free: null, premium: item(4141, 'Magnetic Scavenger Coil') },
    { free: cache(), premium: item(4113, 'Cryo-Vanguard Scout') },
    { free: null, premium: item(4102, 'Tectonic Driller Shotgun') },
    { free: item(4159, '10x Deep Core Shards', 10), premium: item(4132, 'Sporesnail Pearl Charm') },
    { free: null, premium: item(4122, 'Sporesnail Hunter Crest') },
    { free: null, premium: item(4142, 'Bio-Hazard Filter Vent') },
    { free: key(), premium: item(4103, 'Cryo-Plasma Railgun') },
    { free: null, premium: item(4114, 'Trench Warden Heavy') },
    { free: currency('scrap', 500, '500x Fabrication Scrap'), premium: item(4133, 'Trench Whistle Charm') },
    { free: null, premium: item(4150, 'Amber CRT Monitor Theme') },
    { free: item(4123, 'Bunker 404 Lost Squad Decal'), premium: item(4143, 'Kinetic Impact Bushing') },
    { free: cache(), premium: item(4104, 'Rust & Bone Trench Carbine') },
    { free: null, premium: item(4124, 'Cyber-Skull Tactical Pin') },
    { free: item(4156, '25x Cryo-Alloy Ingots', 25), premium: item(4134, 'Glitched RAM Card Charm') },
    { free: null, premium: item(4115, 'Void Commando Recon') },
    { free: null, premium: item(4144, 'Thermal Heat Exchanger') },
    { free: cache(), premium: item(4105, 'Obsidian Shard Revolver') },
    { free: null, premium: item(4135, 'Geodetic Compass Charm') },
    { free: item(4159, '20x Deep Core Shards', 20), premium: item(4125, 'Cryo-Phoenix Insignia') },
    { free: null, premium: item(4116, 'Bio-Synthesizer Medic') },
    { free: null, premium: item(4148, 'Soviet Sub-Commander Radio') },
    { free: key(), premium: item(4106, 'Biolume Spore Sprayer') },
    { free: null, premium: item(4151, 'Emerald Radar Phosphor HUD') },
    { free: currency('scrap', 1000, '1000x Fabrication Scrap'), premium: item(4136, 'Miniaturized Drone Bobble') },
    { free: null, premium: item(4145, 'Echo-Location Transceiver') },
    { free: null, premium: item(4126, 'Queen Slayer Gold Seal') },
    { free: cache(), premium: item(4107, 'Deep Core Melter') },
    { free: null, premium: item(4137, 'Amber Bio-Flask Charm') },
    { free: item(4156, '50x Cryo-Alloy Ingots', 50), premium: item(4117, 'Dreadnought Exo-Juggernaut') },
    { free: null, premium: item(4146, 'Symbiotic Adrenaline Pump') },
    { free: null, premium: item(4127, 'Void Horizon Sigil') },
    { free: cache(), premium: item(4108, 'Glitched Circuit Bolter') },
    { free: null, premium: item(4149, "Synthesized AI Unit 'AURA'") },
    { free: item(4159, '50x Deep Core Shards', 50), premium: item(4138, 'Dark Matter Singularity Charm') },
    { free: null, premium: item(4128, 'Ancient Core Glyphs Decal') },
    { free: null, premium: item(4118, 'Cyber-Spectre Infiltrator') },
    { free: key(), premium: item(4109, 'Void-Walker Beam Cannon') },
    { free: null, premium: item(4152, 'Emerald Void Tracer Rounds') },
    { free: null, premium: item(4153, 'Cryo Shockwave Muzzle Flare') },
    { free: item(4159, '50x Deep Core Shards', 50), premium: item(4147, 'Zero-Point Flux Overdrive') },
    { free: null, premium: item(4139, 'Golden Sub-Bunker Key Charm') },
    { free: item(4110, "Queen's Carapace Carbine"), premium: item(4119, 'Hive-Lord Symbiote Exosuit') }
]);

function createDefaultState() {
    return {
        version: 1,
        xp: 0,
        hasPremium: false,
        claimedFree: [],
        claimedPremium: []
    };
}

export class SeasonPassManager {
    constructor({ storage = null } = {}) {
        this.storage = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
        this.state = this.load();
    }

    load() {
        try {
            const raw = this.storage?.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object' && parsed.version === 1) {
                    return {
                        ...createDefaultState(),
                        ...parsed,
                        claimedFree: Array.isArray(parsed.claimedFree) ? parsed.claimedFree : [],
                        claimedPremium: Array.isArray(parsed.claimedPremium) ? parsed.claimedPremium : []
                    };
                }
            }
        } catch {
            // fall through to defaults
        }
        return createDefaultState();
    }

    save() {
        try {
            this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.state));
        } catch {
            // best-effort
        }
    }

    getTotalXp() {
        return this.state.xp;
    }

    // Returns { xpAwarded } so callers (e.g. a HUD toast) know what to show,
    // even though the running total is the source of truth for tier math.
    addXp(amount, source = 'unknown') {
        const awarded = Math.max(0, Math.floor(amount) || 0);
        if (awarded === 0) return { xpAwarded: 0, source };
        this.state.xp += awarded;
        this.save();
        return { xpAwarded: awarded, source };
    }

    getCurrentTier() {
        return Math.min(TOTAL_TIERS, Math.floor(this.state.xp / XP_PER_TIER));
    }

    // 1-indexed tier progress within the *next* unearned tier (0 once maxed).
    getTierProgress() {
        const tier = this.getCurrentTier();
        if (tier >= TOTAL_TIERS) {
            return { tier, xpIntoTier: 0, xpForNextTier: 0, fraction: 1 };
        }
        const xpIntoTier = this.state.xp - tier * XP_PER_TIER;
        return { tier, xpIntoTier, xpForNextTier: XP_PER_TIER, fraction: xpIntoTier / XP_PER_TIER };
    }

    hasPremium() {
        return Boolean(this.state.hasPremium);
    }

    setPremium(owned) {
        this.state.hasPremium = Boolean(owned);
        this.save();
    }

    isClaimed(tierNumber, track) {
        const list = track === 'premium' ? this.state.claimedPremium : this.state.claimedFree;
        return list.includes(tierNumber);
    }

    getReward(tierNumber, track) {
        const row = TIER_REWARDS[tierNumber - 1];
        if (!row) return null;
        return track === 'premium' ? row.premium : row.free;
    }

    canClaim(tierNumber, track) {
        if (tierNumber < 1 || tierNumber > TOTAL_TIERS) return false;
        if (tierNumber > this.getCurrentTier()) return false;
        if (track === 'premium' && !this.hasPremium()) return false;
        if (this.isClaimed(tierNumber, track)) return false;
        return Boolean(this.getReward(tierNumber, track));
    }

    // Marks the tier claimed and returns its reward descriptor for the caller to actually grant
    // (via src/seasonPassUi.js, which knows how to hand items/currency to the rest of the game).
    // Returns null without mutating state if the tier isn't claimable right now.
    claim(tierNumber, track) {
        if (!this.canClaim(tierNumber, track)) return null;
        const reward = this.getReward(tierNumber, track);
        const list = track === 'premium' ? this.state.claimedPremium : this.state.claimedFree;
        list.push(tierNumber);
        this.save();
        return reward;
    }

    // Every currently-unclaimed, currently-claimable reward across both tracks — used to badge
    // the menu button ("3 rewards ready") and to drive a "claim all" action.
    getClaimableTiers() {
        const currentTier = this.getCurrentTier();
        const claimable = [];
        for (let t = 1; t <= currentTier; t++) {
            if (this.canClaim(t, 'free')) claimable.push({ tier: t, track: 'free' });
            if (this.canClaim(t, 'premium')) claimable.push({ tier: t, track: 'premium' });
        }
        return claimable;
    }

    reset() {
        this.state = createDefaultState();
        this.save();
    }
}
