const STORAGE_KEY = 'hb_bank';

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

function clampCount(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.floor(numeric));
}

function createDefaultState() {
    return {
        med: 0,
        ammo: 0,
        tech: 0,
        coin: 0,
        o2GeneratorLevel: 0,
        unlocks: {
            o2Bubble: false,
            hullExpansion: false,
            radarNode: false,
            reactorCompressor: false
        }
    };
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

    base.med = clampCount(raw.med);
    base.ammo = clampCount(raw.ammo);
    base.tech = clampCount(raw.tech);
    base.coin = clampCount(raw.coin);

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
    return base;
}

function cloneState(state) {
    return {
        med: state.med,
        ammo: state.ammo,
        tech: state.tech,
        coin: state.coin,
        o2GeneratorLevel: state.o2GeneratorLevel,
        unlocks: {
            ...state.unlocks
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

            const parsed = JSON.parse(raw);
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

    reset() {
        this.state = createDefaultState();

        if (this.storage) {
            this.storage.removeItem(this.storageKey);
        }

        return this.getState();
    }
}
