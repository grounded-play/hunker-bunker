const STORAGE_KEY = 'hb_bank';
const BANK_SCHEMA_VERSION = 8;

export function shellPriceOf(cost = {}) {
    const tech = Number(cost?.tech) || 0;
    const coin = Number(cost?.coin) || 0;
    const med = Number(cost?.med) || 0;
    return Math.max(1, Math.round((tech + coin * 2 + med * 3) / 12));
}

export const CLASS_SKILL_TREES = Object.freeze({
    SCOUT: Object.freeze([
        Object.freeze({
            id: 'scout_magnet_1',
            label: 'MAGNET EXPANSION I',
            desc: 'Scavenger magnet radius increased to 5.5u.',
            cost: Object.freeze({ tech: 20, coin: 5 }),
            prereqs: Object.freeze([]),
            row: 1, col: 3
        }),
        Object.freeze({
            id: 'scout_speed_1',
            label: 'TACTICAL PACE',
            desc: 'Base movement speed increased by 15%.',
            cost: Object.freeze({ tech: 30, coin: 10 }),
            prereqs: Object.freeze(['scout_magnet_1']),
            row: 3, col: 1
        }),
        Object.freeze({
            id: 'scout_ammo_1',
            label: 'POUCH CAPACITY',
            desc: 'Max clip size increased by +3 rounds.',
            cost: Object.freeze({ tech: 25, coin: 8 }),
            prereqs: Object.freeze(['scout_magnet_1']),
            row: 3, col: 5
        }),
        Object.freeze({
            id: 'scout_special_unlock',
            label: 'EVASIVE INSTINCT',
            desc: 'EVASIVE passive strengthened: enemy slow/freeze effect duration reduced by 75% (up from 50%).',
            cost: Object.freeze({ tech: 50, coin: 15, med: 5 }),
            prereqs: Object.freeze(['scout_speed_1', 'scout_ammo_1']),
            prereqMode: 'any',
            requiredGoal: 'hullExpansion',
            row: 5, col: 3
        }),
        Object.freeze({
            id: 'scout_special_upgrade_1',
            label: 'WINDRUNNER',
            desc: 'Reload speed bonus increased to -35% (from -20%).',
            cost: Object.freeze({ tech: 80, coin: 20 }),
            prereqs: Object.freeze(['scout_special_unlock']),
            requiredGoal: 'reactorCompressor',
            requiredO2Level: 3,
            row: 7, col: 1
        }),
        Object.freeze({
            id: 'scout_special_upgrade_2',
            label: 'FAST RECOVERY',
            desc: 'EVASIVE passive fully negates enemy slow/freeze effects.',
            cost: Object.freeze({ tech: 80, coin: 20 }),
            prereqs: Object.freeze(['scout_special_unlock']),
            requiredGoal: 'reactorCompressor',
            requiredO2Level: 3,
            row: 7, col: 5
        })
    ]),
    TANK: Object.freeze([
        Object.freeze({
            id: 'tank_plating_1',
            label: 'REINFORCED PLATING',
            desc: 'Increase max suit integrity by +1 heart.',
            cost: Object.freeze({ tech: 20, coin: 5 }),
            prereqs: Object.freeze([]),
            row: 1, col: 3
        }),
        Object.freeze({
            id: 'tank_damage_1',
            label: 'HEAVY MUNITIONS',
            desc: 'All weapon shots deal +1 base damage.',
            cost: Object.freeze({ tech: 40, coin: 12 }),
            prereqs: Object.freeze(['tank_plating_1']),
            row: 3, col: 1
        }),
        Object.freeze({
            id: 'tank_o2_efficiency',
            label: 'EXO-SEAL EFFICIENCY',
            desc: 'Reduce general O2 drain rate by 15%.',
            cost: Object.freeze({ tech: 30, coin: 10 }),
            prereqs: Object.freeze(['tank_plating_1']),
            row: 3, col: 5
        }),
        Object.freeze({
            id: 'tank_special_unlock',
            label: 'HARDENED BULWARK',
            desc: 'BULWARK passive strengthened: block chance increased to 30% (from 20%).',
            cost: Object.freeze({ tech: 50, coin: 15, med: 5 }),
            prereqs: Object.freeze(['tank_damage_1', 'tank_o2_efficiency']),
            prereqMode: 'any',
            requiredGoal: 'hullExpansion',
            row: 5, col: 3
        }),
        Object.freeze({
            id: 'tank_special_upgrade_1',
            label: 'IRON WALL',
            desc: 'BULWARK block chance increased to 40%.',
            cost: Object.freeze({ tech: 80, coin: 20 }),
            prereqs: Object.freeze(['tank_special_unlock']),
            requiredGoal: 'reactorCompressor',
            requiredO2Level: 3,
            row: 7, col: 1
        }),
        Object.freeze({
            id: 'tank_special_upgrade_2',
            label: 'AEGIS GENERATION',
            desc: 'O2 refill speed inside O2 bubble increased by 20% while braced.',
            cost: Object.freeze({ tech: 80, coin: 20 }),
            prereqs: Object.freeze(['tank_special_unlock']),
            requiredGoal: 'reactorCompressor',
            requiredO2Level: 3,
            row: 7, col: 5
        })
    ]),
    ENGINEER: Object.freeze([
        Object.freeze({
            id: 'engineer_radar_1',
            label: 'EXTENDED SCAN',
            desc: 'Radar scan radius increased by +30% (uncovers more area).',
            cost: Object.freeze({ tech: 20, coin: 5 }),
            prereqs: Object.freeze([]),
            row: 1, col: 3
        }),
        Object.freeze({
            id: 'engineer_magnet_1',
            label: 'SCRAP MAGNET',
            desc: 'Scrap/med magnet radius increased to 5.0u.',
            cost: Object.freeze({ tech: 25, coin: 8 }),
            prereqs: Object.freeze(['engineer_radar_1']),
            row: 3, col: 1
        }),
        Object.freeze({
            id: 'engineer_battery_1',
            label: 'BATTERY OVERHAUL',
            desc: 'Reduce general O2 drain rate by 10%.',
            cost: Object.freeze({ tech: 30, coin: 10 }),
            prereqs: Object.freeze(['engineer_radar_1']),
            row: 3, col: 5
        }),
        Object.freeze({
            id: 'engineer_special_unlock',
            label: 'UNLOCK REROUTE',
            desc: 'Unlocks Class Special Ability: Reroute [F]. 0.5x O2 drain, 3x O2 refill rate.',
            cost: Object.freeze({ tech: 50, coin: 15, med: 5 }),
            prereqs: Object.freeze(['engineer_magnet_1', 'engineer_battery_1']),
            prereqMode: 'any',
            requiredGoal: 'hullExpansion',
            row: 5, col: 3
        }),
        Object.freeze({
            id: 'engineer_special_upgrade_1',
            label: 'SYSTEM OVERCLOCK',
            desc: 'Reroute active ability grants +20% firing rate & projectile speed.',
            cost: Object.freeze({ tech: 80, coin: 20 }),
            prereqs: Object.freeze(['engineer_special_unlock']),
            requiredGoal: 'reactorCompressor',
            requiredO2Level: 3,
            row: 7, col: 1
        }),
        Object.freeze({
            id: 'engineer_special_upgrade_2',
            label: 'SAFETY STANDARDS',
            desc: 'Reroute active ability reduces radar scan cooldown by 50%.',
            cost: Object.freeze({ tech: 80, coin: 20 }),
            prereqs: Object.freeze(['engineer_special_unlock']),
            requiredGoal: 'reactorCompressor',
            requiredO2Level: 3,
            row: 7, col: 5
        })
    ])
});

export const FOUNDRY_ACTIVATION_COST = Object.freeze({ tech: 25, coin: 10, med: 5 });

// Weapon skill tree ("COMBAT MATRIX"). Levels are 0..maxLevel; costs[level] is the
// price to advance FROM that level. Effects are applied in threeGame at run init.
export const WEAPON_UPGRADE_ORDER = Object.freeze([
    'ammoCapacity',
    'ammoRefill',
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
    ammoRefill: Object.freeze({
        key: 'ammoRefill',
        label: 'AMMO CONDENSER',
        maxLevel: 3,
        desc: Object.freeze(['Passive ammo refill every 7.9s', 'Passive ammo refill every 5.8s', 'Passive ammo refill every 3.7s']),
        costs: Object.freeze([{ tech: 45, coin: 12 }, { tech: 80, coin: 30 }, { tech: 130, coin: 55 }])
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
    return { ammoCapacity: 0, ammoRefill: 0, shotSpeed: 0, shotDamage: 0, shotAmount: 0 };
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

export const GOAL_LEVEL2_COSTS = Object.freeze({
    hullExpansion: Object.freeze({ tech: 100, med: 40 }),
    radarNode: Object.freeze({ tech: 200, coin: 50 }),
    reactorCompressor: Object.freeze({ tech: 400, coin: 150 })
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
    'stimCache',
    'fallHardening'
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
    }),
    fallHardening: Object.freeze({
        key: 'fallHardening',
        label: 'IMPACT DAMPENERS',
        desc: 'Halves fall damage — survive a second fall through a hole in the same run.',
        cost: Object.freeze({ tech: 70, coin: 18 }),
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
        hullExpansionLevel: 0,
        radarNodeLevel: 0,
        reactorCompressorLevel: 0,
        tier2Unlocks: {
            suitThermal: false,
            deconFilters: false,
            stimCache: false,
            fallHardening: false
        },
        weaponUpgrades: createDefaultWeaponUpgrades(),
        unlockedSkills: [],
        shells: 0
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
    if (version < 5) {
        // v4 → v5: add the persistent classSkills / unlockedSkills list
        if (!Array.isArray(raw.unlockedSkills)) {
            raw.unlockedSkills = [];
        }
        raw.schemaVersion = 5;
    }
    if (version < 6) {
        raw.shells = Number.isFinite(raw.shells) ? raw.shells : 0;
        raw.schemaVersion = 6;
    }
    if (version < 7) {
        if (!raw.weaponUpgrades || typeof raw.weaponUpgrades !== 'object') {
            raw.weaponUpgrades = createDefaultWeaponUpgrades();
        }
        raw.weaponUpgrades.ammoRefill = Number.isFinite(raw.weaponUpgrades.ammoRefill)
            ? raw.weaponUpgrades.ammoRefill
            : 0;
        raw.schemaVersion = 7;
    }
    if (version < 8) {
        raw.hullExpansionLevel = raw.hullExpansionLevel ?? (raw.unlocks?.hullExpansion ? 1 : 0);
        raw.radarNodeLevel = raw.radarNodeLevel ?? (raw.unlocks?.radarNode ? 1 : 0);
        raw.reactorCompressorLevel = raw.reactorCompressorLevel ?? (raw.unlocks?.reactorCompressor ? 1 : 0);
        raw.schemaVersion = 8;
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
    base.shells = clampCount(raw.shells);
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

    base.hullExpansionLevel = Math.max(0, Math.floor(Number(raw.hullExpansionLevel) || (base.unlocks.hullExpansion ? 1 : 0)));
    base.radarNodeLevel = Math.max(0, Math.floor(Number(raw.radarNodeLevel) || (base.unlocks.radarNode ? 1 : 0)));
    base.reactorCompressorLevel = Math.max(0, Math.floor(Number(raw.reactorCompressorLevel) || (base.unlocks.reactorCompressor ? 1 : 0)));

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

    if (raw.unlockedSkills && Array.isArray(raw.unlockedSkills)) {
        base.unlockedSkills = [...raw.unlockedSkills];
    } else {
        base.unlockedSkills = [];
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
        hullExpansionLevel: state.hullExpansionLevel ?? (state.unlocks?.hullExpansion ? 1 : 0),
        radarNodeLevel: state.radarNodeLevel ?? (state.unlocks?.radarNode ? 1 : 0),
        reactorCompressorLevel: state.reactorCompressorLevel ?? (state.unlocks?.reactorCompressor ? 1 : 0),
        tier2Unlocks: {
            ...(state.tier2Unlocks ?? { suitThermal: false, deconFilters: false, stimCache: false })
        },
        weaponUpgrades: {
            ...(state.weaponUpgrades ?? createDefaultWeaponUpgrades())
        },
        unlockedSkills: [
            ...(state.unlockedSkills ?? [])
        ],
        shells: clampCount(state.shells)
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

    getShells() {
        return clampCount(this.state.shells);
    }

    addShells(amount = 0) {
        const gained = Math.max(0, Math.floor(Number(amount) || 0));
        if (gained <= 0) return this.getShells();
        this.state.shells = this.getShells() + gained;
        this.save();
        emit('shells-changed', { shells: this.state.shells, gained, bank: this.getState() });
        emit('bank-updated', { bank: this.getState() });
        return this.state.shells;
    }

    canAffordShells(amount = 0) {
        return this.getShells() >= Math.max(0, Math.floor(Number(amount) || 0));
    }

    spendShells(amount = 0) {
        const spent = Math.max(0, Math.floor(Number(amount) || 0));
        if (!this.canAffordShells(spent)) return false;
        this.state.shells = this.getShells() - spent;
        this.save();
        emit('shells-changed', { shells: this.state.shells, spent, bank: this.getState() });
        emit('bank-updated', { bank: this.getState() });
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

    setUnlock(goalKey) {
        if (!GOAL_ORDER.includes(goalKey)) return false;
        if (this.state.unlocks[goalKey]) return true;

        const index = GOAL_ORDER.indexOf(goalKey);
        if (index > 0) {
            const prereqKey = GOAL_ORDER[index - 1];
            if (!this.state.unlocks[prereqKey]) return false;
        }

        this.state.unlocks[goalKey] = true;
        if (goalKey === 'hullExpansion') this.state.hullExpansionLevel = 1;
        if (goalKey === 'radarNode') this.state.radarNodeLevel = 1;
        if (goalKey === 'reactorCompressor') this.state.reactorCompressorLevel = 1;

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

    getGoalUpgradeCost(goalKey, level = 2) {
        if (level === 2) {
            return GOAL_LEVEL2_COSTS[goalKey] ?? null;
        }
        return GOAL_COSTS[goalKey] ?? null;
    }

    canUpgradeGoal(goalKey) {
        if (!GOAL_ORDER.includes(goalKey)) return false;
        if (!this.state.unlocks[goalKey]) return false;
        const currentLevel = this.state[`${goalKey}Level`] ?? 1;
        if (currentLevel >= 2) return false;
        const cost = this.getGoalUpgradeCost(goalKey, 2);
        return this.canAfford(cost ?? {});
    }

    upgradeGoal(goalKey) {
        if (!this.canUpgradeGoal(goalKey)) return false;
        const cost = this.getGoalUpgradeCost(goalKey, 2);
        if (!this.spend(cost)) return false;
        this.state[`${goalKey}Level`] = 2;
        this.save();
        emit('goal-upgraded', {
            goalKey,
            level: 2,
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
        return this.canAffordShells(shellPriceOf(cfg.cost));
    }

    unlockTier2(key) {
        if (!this.canUnlockTier2(key)) return false;
        const cfg = TIER2_UPGRADE_CONFIGS[key];
        if (!cfg) return false;
        if (!this.spendShells(shellPriceOf(cfg.cost))) return false;
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

    upgradeWeapon(key) {
        const cfg = WEAPON_UPGRADES_CONFIG[key];
        if (!cfg) return false;
        const cost = this.getWeaponUpgradeNextCost(key);
        if (!cost) return false;
        if (!this.spendShells(shellPriceOf(cost))) return false;
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

    isSkillUnlocked(key) {
        return Array.isArray(this.state.unlockedSkills) && this.state.unlockedSkills.includes(key);
    }

    canUnlockSkill(key, playerClass) {
        const tree = CLASS_SKILL_TREES[playerClass];
        const node = tree?.find(n => n.id === key);
        if (!node) return false;

        // 1. Already unlocked
        if (this.isSkillUnlocked(key)) return false;

        // 2. Prereq check
        if (node.prereqs && node.prereqs.length > 0) {
            const unlockedCount = node.prereqs.filter(p => this.isSkillUnlocked(p)).length;
            if (node.prereqMode === 'any') {
                if (unlockedCount === 0) return false;
            } else {
                if (unlockedCount < node.prereqs.length) return false;
            }
        }

        if (node.requiredGoal && !this.state.unlocks?.[node.requiredGoal]) return false;
        if (node.requiredO2Level && this.getO2GeneratorLevel() < node.requiredO2Level) return false;

        // 3. Cost check
        return this.canAffordShells(shellPriceOf(node.cost));
    }

    unlockSkill(key, playerClass) {
        const tree = CLASS_SKILL_TREES[playerClass];
        const node = tree?.find(n => n.id === key);
        if (!node || !this.canUnlockSkill(key, playerClass)) return false;

        if (this.spendShells(shellPriceOf(node.cost))) {
            if (!this.state.unlockedSkills) this.state.unlockedSkills = [];
            this.state.unlockedSkills.push(key);
            this.save();
            emit('bank-updated', { bank: this.getState() });
            emit('skill-unlocked', { key, playerClass });
            return true;
        }
        return false;
    }

    reset() {
        this.state = createDefaultState();

        if (this.storage) {
            this.storage.removeItem(this.storageKey);
        }

        return this.getState();
    }
}
