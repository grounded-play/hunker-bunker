const STORAGE_KEY = 'hb_bank';
const BANK_SCHEMA_VERSION = 4;

export const FOUNDRY_ACTIVATION_COST = Object.freeze({ tech: 25, coin: 10, med: 5 });

// Weapon skill tree ("COMBAT MATRIX"). Levels are 0..maxLevel; costs[level] is the
// price to advance FROM that level. Effects are applied in threeGame at run init.
export const WEAPON_UPGRADE_ORDER = Object.freeze([
    'ammoCapacity',
    'shotSpeed',
    'shotDamage',
    'shotAmount'
]);

export const WEAPON_UPGRADES_CONFIG = Object.freeze({
    ammoCapacity: Object.freeze({
        key: 'ammoCapacity',
        label: 'MAGAZINE CAPACITY',
        maxLevel: 3,
        desc: Object.freeze(['Clip +2 rounds', 'Clip +4 rounds', 'Clip +6 rounds']),
        costs: Object.freeze([{ tech: 30, coin: 10 }, { tech: 60, coin: 20 }, { tech: 100, coin: 35 }])
    }),
    shotSpeed: Object.freeze({
        key: 'shotSpeed',
        label: 'PROJECTILE VELOCITY',
        maxLevel: 3,
        desc: Object.freeze(['Shot speed +1', 'Shot speed +2', 'Shot speed +3']),
        costs: Object.freeze([{ tech: 25, coin: 8 }, { tech: 50, coin: 15 }, { tech: 90, coin: 30 }])
    }),
    shotDamage: Object.freeze({
        key: 'shotDamage',
        label: 'BALLISTIC PAYLOAD',
        maxLevel: 2,
        desc: Object.freeze(['+1 shot damage', '+2 shot damage']),
        costs: Object.freeze([{ tech: 80, coin: 25 }, { tech: 160, coin: 60 }])
    }),
    shotAmount: Object.freeze({
        key: 'shotAmount',
        label: 'BURST INJECTORS',
        maxLevel: 2,
        desc: Object.freeze(['Double-shot spread', 'Triple-shot spread']),
        costs: Object.freeze([{ tech: 120, coin: 50 }, { tech: 250, coin: 100 }])
    })
});

function createDefaultWeaponUpgrades() {
    return { ammoCapacity: 0, shotSpeed: 0, shotDamage: 0, shotAmount: 0 };
}

export const GOAL_ORDER = Object.freeze([
    'o2Bubble',
    'hullExpansion',
    'radarNode',
    'reactorCompressor'
]);

export const GOAL_COSTS = Object.freeze({
    o2Bubble: Object.freeze({ tech: 10, med: 5, coin: 5 }),
    hullExpansion: Object.freeze({ tech: 50, med: 20 }),
    radarNode: Object.freeze({ tech: 150, coin: 30 }),
    reactorCompressor: Object.freeze({ tech: 300, coin: 100 })
});

export const O2_GENERATOR_UPGRADES = Object.freeze([
    Object.freeze({
        level: 1,
        key: 'repair',
        label: 'REPAIR O₂ GENERATOR',
        cost: Object.freeze({ tech: 10, med: 5, coin: 5 }),
        radius: 4.5,
        refillRate: 2.8
    }),
    Object.freeze({
        level: 2,
        key: 'field-boost',
        label: 'EXPAND O₂ FIELD',
        cost: Object.freeze({ tech: 50, med: 20, coin: 15 }),
        radius: 6,
        refillRate: 3.6
    }),
    Object.freeze({
        level: 3,
        key: 'overclock',
        label: 'OVERCLOCK O₂ FIELD',
        cost: Object.freeze({ tech: 150, med: 35, coin: 40 }),
        radius: 7.5,
        refillRate: 4.6
    })
]);

export const MAX_O2_GENERATOR_LEVEL = O2_GENERATOR_UPGRADES.length;

export const TIER2_UPGRADE_ORDER = Object.freeze([
    'suitThermal',
    'deconFilters',
    'stimCache'
]);

export const TIER2_UPGRADE_CONFIGS = Object.freeze({
    // Reframed as the "Space Heater" cold-mitigation build (Note 5). Available
    // early (after the O₂ bubble) so players can push into CRYO; the storage key
    // stays `suitThermal` to preserve save compatibility (no schema bump).
    suitThermal: Object.freeze({
        key: 'suitThermal',
        label: 'SPACE HEATER',
        desc: 'Deploys a thermal heater that nearly eliminates O₂ drain in the CRYO sector.',
        cost: Object.freeze({ tech: 60, coin: 12 }),
        prereq: 'o2Bubble'
    }),
    deconFilters: Object.freeze({
        key: 'deconFilters',
        label: 'DECONTAMINATION FILTERS',
        desc: 'Reduces O₂ drain in BIO sector by 50%.',
        cost: Object.freeze({ tech: 100, coin: 20 }),
        prereq: 'reactorCompressor'
    }),
    stimCache: Object.freeze({
        key: 'stimCache',
        label: 'EMERGENCY STIM CACHE',
        desc: 'Each run starts with a STIM PACK in your kit. Use [F] for 3s immunity.',
        cost: Object.freeze({ tech: 60, coin: 25 }),
        prereq: 'reactorCompressor'
    })
});

function clampCount(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.floor(numeric));
}

function createDefaultState() {
    return {
        schemaVersion: BANK_SCHEMA_VERSION,
        med: 0,
        ammo: 0,
        tech: 0,
        coin: 0,
        o2GeneratorLevel: 0,
        foundryActivated: false,
        unlocks: {
            o2Bubble: false,
            hullExpansion: false,
            radarNode: false,
            reactorCompressor: false
        },
        tier2Unlocks: {
            suitThermal: false,
            deconFilters: false,
            stimCache: false
        },
        weaponUpgrades: createDefaultWeaponUpgrades()
    };
}

function migrateBank(raw) {
    if (!raw || typeof raw !== 'object') return raw;
    const version = raw.schemaVersion ?? 0;
    if (version < 1) {
        raw.schemaVersion = 1;
    }
    if (version < 2) {
        // v1 → v2: add tier2Unlocks object with all false defaults
        if (!raw.tier2Unlocks || typeof raw.tier2Unlocks !== 'object') {
            raw.tier2Unlocks = { suitThermal: false, deconFilters: false, stimCache: false };
        }
        raw.schemaVersion = 2;
    }
    if (version < 3) {
        // v2 → v3: add weaponUpgrades object with zero defaults
        if (!raw.weaponUpgrades || typeof raw.weaponUpgrades !== 'object') {
            raw.weaponUpgrades = createDefaultWeaponUpgrades();
        }
        raw.schemaVersion = 3;
    }
    if (version < 4) {
        // v3 → v4: add the persistent in-world Foundry activation flag.
        raw.foundryActivated = Boolean(raw.foundryActivated);
        raw.schemaVersion = 4;
    }
    return raw;
}

function deriveLegacyO2GeneratorLevel(unlocks) {
    if (!unlocks || typeof unlocks !== 'object') {
        return 0;
    }

    if (unlocks.reactorCompressor) return 3;
    if (unlocks.radarNode || unlocks.hullExpansion) return 2;
    if (unlocks.o2Bubble) return 1;
    return 0;
}

function syncLegacyUnlocksFromGeneratorLevel(state) {
    const level = clampCount(state?.o2GeneratorLevel);
    if (!state.unlocks || typeof state.unlocks !== 'object') {
        state.unlocks = {};
    }

    state.unlocks.o2Bubble = level >= 1;
    state.unlocks.hullExpansion = Boolean(state.unlocks.hullExpansion);
    state.unlocks.radarNode = Boolean(state.unlocks.radarNode);
    state.unlocks.reactorCompressor = Boolean(state.unlocks.reactorCompressor);
}

function toSerializableState(raw) {
    const base = createDefaultState();
    if (!raw || typeof raw !== 'object') return base;
    base.schemaVersion = BANK_SCHEMA_VERSION;

    base.med = clampCount(raw.med);
    base.ammo = clampCount(raw.ammo);
    base.tech = clampCount(raw.tech);
    base.coin = clampCount(raw.coin);
    base.foundryActivated = Boolean(raw.foundryActivated);

    let derivedLevel = 0;
    if (raw.unlocks && typeof raw.unlocks === 'object') {
        for (const key of GOAL_ORDER) {
            base.unlocks[key] = Boolean(raw.unlocks[key]);
        }
        derivedLevel = deriveLegacyO2GeneratorLevel(base.unlocks);
    }

    if (Object.prototype.hasOwnProperty.call(raw, 'o2GeneratorLevel')) {
        base.o2GeneratorLevel = Math.min(MAX_O2_GENERATOR_LEVEL, clampCount(raw.o2GeneratorLevel));
    } else {
        base.o2GeneratorLevel = Math.min(MAX_O2_GENERATOR_LEVEL, derivedLevel);
    }

    syncLegacyUnlocksFromGeneratorLevel(base);

    // Tier 2 unlocks
    if (raw.tier2Unlocks && typeof raw.tier2Unlocks === 'object') {
        for (const key of TIER2_UPGRADE_ORDER) {
            base.tier2Unlocks[key] = Boolean(raw.tier2Unlocks[key]);
        }
    }

    // Weapon upgrades (clamped 0..maxLevel per key)
    if (raw.weaponUpgrades && typeof raw.weaponUpgrades === 'object') {
        for (const key of WEAPON_UPGRADE_ORDER) {
            const max = WEAPON_UPGRADES_CONFIG[key].maxLevel;
            base.weaponUpgrades[key] = Math.min(max, clampCount(raw.weaponUpgrades[key]));
        }
    }

    return base;
}

function cloneState(state) {
    return {
        schemaVersion: state.schemaVersion ?? BANK_SCHEMA_VERSION,
        med: state.med,
        ammo: state.ammo,
        tech: state.tech,
        coin: state.coin,
        o2GeneratorLevel: state.o2GeneratorLevel,
        foundryActivated: Boolean(state.foundryActivated),
        unlocks: {
            ...state.unlocks
        },
        tier2Unlocks: {
            ...(state.tier2Unlocks ?? { suitThermal: false, deconFilters: false, stimCache: false })
        },
        weaponUpgrades: {
            ...(state.weaponUpgrades ?? createDefaultWeaponUpgrades())
        }
    };
}

function emit(name, detail) {
    if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
        return;
    }

    window.dispatchEvent(new CustomEvent(name, { detail }));
}

function normalizeInventory(inventory) {
    const source = inventory && typeof inventory === 'object' ? inventory : {};
    return {
        med: clampCount(source.med ?? source.health),
        ammo: clampCount(source.ammo),
        tech: clampCount(source.tech ?? source.weapon),
        coin: clampCount(source.coin)
    };
}

export class BankManager {
    constructor({ storage = null, storageKey = STORAGE_KEY } = {}) {
        this.storage = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
        this.storageKey = storageKey;
        this.state = createDefaultState();
        this.load();
    }

    load() {
        if (!this.storage) {
            this.state = createDefaultState();
            return this.getState();
        }

        try {
            const raw = this.storage.getItem(this.storageKey);
            if (!raw) {
                this.state = createDefaultState();
                return this.getState();
            }

            const parsed = migrateBank(JSON.parse(raw));
            this.state = toSerializableState(parsed);
            return this.getState();
        } catch {
            this.state = createDefaultState();
            return this.getState();
        }
    }

    save(nextState = this.state) {
        this.state = toSerializableState(nextState);

        if (!this.storage) {
            return this.getState();
        }

        this.storage.setItem(this.storageKey, JSON.stringify(this.state));
        return this.getState();
    }

    getState() {
        return cloneState(this.state);
    }

    deposit(inventory) {
        const incoming = normalizeInventory(inventory);
        this.state.med += incoming.med;
        this.state.ammo += incoming.ammo;
        this.state.tech += incoming.tech;
        this.state.coin += incoming.coin;
        this.save();

        emit('bank-deposited', {
            deposited: incoming,
            bank: this.getState()
        });

        return incoming;
    }

    canAfford(costs = {}) {
        const requested = normalizeInventory(costs);
        return this.state.med >= requested.med
            && this.state.ammo >= requested.ammo
            && this.state.tech >= requested.tech
            && this.state.coin >= requested.coin;
    }

    spend(costs = {}) {
        const requested = normalizeInventory(costs);
        if (!this.canAfford(requested)) {
            return false;
        }

        this.state.med -= requested.med;
        this.state.ammo -= requested.ammo;
        this.state.tech -= requested.tech;
        this.state.coin -= requested.coin;
        this.save();
        return true;
    }

    getUnlocks() {
        return { ...this.state.unlocks };
    }

    getO2GeneratorLevel() {
        return clampCount(this.state.o2GeneratorLevel);
    }

    getO2GeneratorUpgrade(level = this.getO2GeneratorLevel() + 1) {
        if (!Number.isFinite(level)) return null;
        const normalized = Math.max(1, Math.floor(level));
        return O2_GENERATOR_UPGRADES.find((entry) => entry.level === normalized) ?? null;
    }

    canUpgradeO2Generator() {
        const upgrade = this.getO2GeneratorUpgrade();
        if (!upgrade) return false;
        return this.canAfford(upgrade.cost);
    }

    upgradeO2Generator() {
        const upgrade = this.getO2GeneratorUpgrade();
        if (!upgrade) return null;
        if (!this.spend(upgrade.cost)) return null;

        this.state.o2GeneratorLevel = upgrade.level;
        syncLegacyUnlocksFromGeneratorLevel(this.state);
        this.save();

        emit('o2-generator-upgraded', {
            level: upgrade.level,
            upgrade,
            bank: this.getState()
        });

        return upgrade;
    }

    markO2GeneratorLevelOnly(level) {
        const upgrade = O2_GENERATOR_UPGRADES.find((entry) => entry.level === level) ?? null;
        if (!upgrade) return null;
        this.state.o2GeneratorLevel = upgrade.level;
        syncLegacyUnlocksFromGeneratorLevel(this.state);
        this.save();
        emit('o2-generator-upgraded', { level: upgrade.level, upgrade, bank: this.getState() });
        return upgrade;
    }

    isFoundryActivated() {
        return Boolean(this.state.foundryActivated);
    }

    canActivateFoundry() {
        if (this.isFoundryActivated()) return false;
        return this.canAfford(FOUNDRY_ACTIVATION_COST);
    }

    activateFoundry() {
        if (this.isFoundryActivated()) return true;
        if (!this.spend(FOUNDRY_ACTIVATION_COST)) return false;
        this.state.foundryActivated = true;
        this.save();
        emit('foundry-activated', { bank: this.getState() });
        return true;
    }

    getGoalCost(goalKey) {
        return GOAL_COSTS[goalKey] ?? null;
    }

    canUnlock(goalKey) {
        if (!GOAL_ORDER.includes(goalKey)) return false;
        if (this.state.unlocks[goalKey]) return false;

        const index = GOAL_ORDER.indexOf(goalKey);
        if (index > 0) {
            const prereqKey = GOAL_ORDER[index - 1];
            if (!this.state.unlocks[prereqKey]) return false;
        }

        const costs = this.getGoalCost(goalKey);
        return this.canAfford(costs ?? {});
    }

    setUnlock(goalKey) {
        if (!GOAL_ORDER.includes(goalKey)) return false;
        if (this.state.unlocks[goalKey]) return true;

        const index = GOAL_ORDER.indexOf(goalKey);
        if (index > 0) {
            const prereqKey = GOAL_ORDER[index - 1];
            if (!this.state.unlocks[prereqKey]) return false;
        }

        this.state.unlocks[goalKey] = true;
        this.state.o2GeneratorLevel = Math.max(
            this.state.o2GeneratorLevel,
            Math.min(MAX_O2_GENERATOR_LEVEL, deriveLegacyO2GeneratorLevel(this.state.unlocks))
        );
        syncLegacyUnlocksFromGeneratorLevel(this.state);
        this.save();

        emit('goal-unlocked', {
            goalKey,
            unlocks: this.getUnlocks(),
            bank: this.getState()
        });

        return true;
    }

    getTier2Unlocks() {
        return { ...(this.state.tier2Unlocks ?? {}) };
    }

    canUnlockTier2(key) {
        if (!TIER2_UPGRADE_ORDER.includes(key)) return false;
        if (this.state.tier2Unlocks?.[key]) return false;
        const cfg = TIER2_UPGRADE_CONFIGS[key];
        if (!cfg) return false;
        if (cfg.prereq && !this.state.unlocks?.[cfg.prereq]) return false;
        return this.canAfford(cfg.cost);
    }

    unlockTier2(key) {
        if (!this.canUnlockTier2(key)) return false;
        const cfg = TIER2_UPGRADE_CONFIGS[key];
        if (!cfg) return false;
        if (!this.spend(cfg.cost)) return false;
        if (!this.state.tier2Unlocks) this.state.tier2Unlocks = {};
        this.state.tier2Unlocks[key] = true;
        this.save();
        emit('tier2-unlocked', { key, unlocks: this.getTier2Unlocks(), bank: this.getState() });
        return true;
    }

    getWeaponUpgrades() {
        return { ...(this.state.weaponUpgrades ?? createDefaultWeaponUpgrades()) };
    }

    getWeaponUpgradeLevel(key) {
        return clampCount(this.state.weaponUpgrades?.[key]);
    }

    getWeaponUpgradeNextCost(key) {
        const cfg = WEAPON_UPGRADES_CONFIG[key];
        if (!cfg) return null;
        const level = this.getWeaponUpgradeLevel(key);
        if (level >= cfg.maxLevel) return null;
        return cfg.costs[level] ?? null;
    }

    canUpgradeWeapon(key) {
        const cost = this.getWeaponUpgradeNextCost(key);
        if (!cost) return false;
        return this.canAfford(cost);
    }

    upgradeWeapon(key) {
        const cfg = WEAPON_UPGRADES_CONFIG[key];
        if (!cfg) return false;
        const cost = this.getWeaponUpgradeNextCost(key);
        if (!cost) return false;
        if (!this.spend(cost)) return false;
        if (!this.state.weaponUpgrades) this.state.weaponUpgrades = createDefaultWeaponUpgrades();
        this.state.weaponUpgrades[key] = this.getWeaponUpgradeLevel(key) + 1;
        this.save();
        emit('weapon-upgraded', {
            key,
            level: this.state.weaponUpgrades[key],
            weaponUpgrades: this.getWeaponUpgrades(),
            bank: this.getState()
        });
        return true;
    }

    reset() {
        this.state = createDefaultState();

        if (this.storage) {
            this.storage.removeItem(this.storageKey);
        }

        return this.getState();
    }
}
