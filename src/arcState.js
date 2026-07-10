const STORAGE_KEY = 'hb_arc_v1';

export const ARC_STATES = Object.freeze([
    'human_prelude',
    'cave_signal',
    'cave_discovered',
    'infected_blackout',
    'hive_awakened_tease'
]);

export const ARC_TRANSITION_EVENTS = Object.freeze({
    CAVE_INTERACTION: 'cave_interaction',
    REVEAL_BLACKOUT: 'reveal_blackout',
    BLACKOUT_COMPLETE: 'blackout_complete'
});

export const CAVE_SIGNAL_MIN_DEPTH = 2;
export const CAVE_SIGNAL_MIN_BLACK_BOXES = 1;
export const CAVE_SIGNAL_MIN_SNAIL_KILLS = 18;
export const CAVE_SIGNAL_MIN_BLOCKED_EXTRACTIONS = 1;
export const ARC_EVALUATION_CADENCE_SECONDS = 1;

export const DEFAULT_ARC_SIGNALS = Object.freeze({
    deepestDepthTier: 0,
    blackBoxesRecovered: 0,
    snailsKilled: 0,
    blockedExtractions: 0,
    heardCaveSignal: false,
    sawOrganicAnomaly: false
});

export const DEFAULT_ARC_STATE = Object.freeze({
    arcState: 'human_prelude',
    signals: DEFAULT_ARC_SIGNALS,
    caveSignalIndex: 0,
    inheritance: null,
    version: 1
});

function getStorage(storage) {
    return storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
}

function clampCount(value) {
    return Math.max(0, Math.floor(Number(value) || 0));
}

function normalizeStateName(value) {
    return ARC_STATES.includes(value) ? value : 'human_prelude';
}

function normalizeSignals(signals = {}) {
    return {
        deepestDepthTier: clampCount(signals.deepestDepthTier),
        blackBoxesRecovered: clampCount(signals.blackBoxesRecovered),
        snailsKilled: clampCount(signals.snailsKilled),
        blockedExtractions: clampCount(signals.blockedExtractions),
        heardCaveSignal: Boolean(signals.heardCaveSignal),
        sawOrganicAnomaly: Boolean(signals.sawOrganicAnomaly)
    };
}

export function normalizeArcState(raw = {}) {
    const parsed = raw && typeof raw === 'object' ? raw : {};
    return {
        arcState: normalizeStateName(parsed.arcState),
        signals: normalizeSignals(parsed.signals),
        caveSignalIndex: clampCount(parsed.caveSignalIndex),
        inheritance: parsed.inheritance && typeof parsed.inheritance === 'object' ? { ...parsed.inheritance } : null,
        version: 1
    };
}

function stateIndex(state) {
    return ARC_STATES.indexOf(normalizeStateName(state));
}

function advanceToAtLeast(current, requested) {
    return stateIndex(requested) > stateIndex(current) ? requested : current;
}

function hasPreludeOwnershipBeat(signals) {
    return signals.blockedExtractions >= CAVE_SIGNAL_MIN_BLOCKED_EXTRACTIONS;
}

function meetsCaveSignalReadiness(signals) {
    return signals.deepestDepthTier >= CAVE_SIGNAL_MIN_DEPTH
        && (signals.blackBoxesRecovered >= CAVE_SIGNAL_MIN_BLACK_BOXES || signals.snailsKilled >= CAVE_SIGNAL_MIN_SNAIL_KILLS)
        && hasPreludeOwnershipBeat(signals);
}

export function evaluateArcTransition(state = 'human_prelude', signals = {}, random = Math.random) {
    void random; // Kept injectable for future rare/tunable beats and parity with director.js.
    const arcState = normalizeStateName(state);
    const safeSignals = normalizeSignals(signals);
    const event = typeof signals.event === 'string' ? signals.event : null;

    if (arcState === 'human_prelude' && meetsCaveSignalReadiness(safeSignals)) return 'cave_signal';
    if (arcState === 'cave_signal' && event === ARC_TRANSITION_EVENTS.CAVE_INTERACTION) return 'cave_discovered';
    if (arcState === 'cave_discovered' && event === ARC_TRANSITION_EVENTS.REVEAL_BLACKOUT) return 'infected_blackout';
    if (arcState === 'infected_blackout' && event === ARC_TRANSITION_EVENTS.BLACKOUT_COMPLETE) return 'hive_awakened_tease';
    return arcState;
}

export class ArcStateManager {
    constructor({ storage = null, storageKey = STORAGE_KEY, now = () => Date.now(), onTransition = null, cadence = ARC_EVALUATION_CADENCE_SECONDS } = {}) {
        this.storage = getStorage(storage);
        this.storageKey = storageKey;
        this.now = now;
        this.onTransition = onTransition;
        this.cadence = Math.max(0, Number(cadence) || 0);
        this._sinceEval = 0;
        this.state = this.load();
    }

    load() {
        try {
            const raw = this.storage?.getItem(this.storageKey);
            if (!raw) return normalizeArcState(DEFAULT_ARC_STATE);
            return normalizeArcState(JSON.parse(raw));
        } catch {
            return normalizeArcState(DEFAULT_ARC_STATE);
        }
    }

    save() {
        this.state = normalizeArcState(this.state);
        try {
            this.storage?.setItem(this.storageKey, JSON.stringify(this.state));
        } catch {
            // Persistence is best-effort so save migration never blocks play.
        }
        return this.state;
    }

    getState() {
        return normalizeArcState(this.state);
    }

    recordSignal(partial = {}) {
        const previous = normalizeSignals(this.state.signals);
        const next = { ...previous };
        if ('deepestDepthTier' in partial) next.deepestDepthTier = Math.max(previous.deepestDepthTier, clampCount(partial.deepestDepthTier));
        if ('blackBoxesRecovered' in partial) next.blackBoxesRecovered = previous.blackBoxesRecovered + clampCount(partial.blackBoxesRecovered);
        if ('snailsKilled' in partial) next.snailsKilled = previous.snailsKilled + clampCount(partial.snailsKilled);
        if ('blockedExtractions' in partial) next.blockedExtractions = previous.blockedExtractions + clampCount(partial.blockedExtractions);
        if ('heardCaveSignal' in partial) next.heardCaveSignal = previous.heardCaveSignal || Boolean(partial.heardCaveSignal);
        if ('sawOrganicAnomaly' in partial) next.sawOrganicAnomaly = previous.sawOrganicAnomaly || Boolean(partial.sawOrganicAnomaly);
        this.state = { ...this.state, signals: next };
        return this.save();
    }

    evaluate(event = null, random = Math.random) {
        const from = this.state.arcState;
        const to = evaluateArcTransition(from, { ...this.state.signals, event }, random);
        if (to !== from) {
            this.state = { ...this.state, arcState: to };
            this.save();
            if (typeof this.onTransition === 'function') this.onTransition(from, to, this.getState());
        }
        return this.getState();
    }

    tick(dt = 0, random = Math.random) {
        this._sinceEval += Math.max(0, Number(dt) || 0);
        if (this._sinceEval < this.cadence) return this.getState();
        this._sinceEval = 0;
        return this.evaluate(null, random);
    }

    forceState(nextState) {
        const normalized = normalizeStateName(nextState);
        const from = this.state.arcState;
        const to = advanceToAtLeast(from, normalized);
        if (to !== from) {
            this.state = { ...this.state, arcState: to };
            this.save();
            if (typeof this.onTransition === 'function') this.onTransition(from, to, this.getState());
        }
        return this.getState();
    }

    setCaveSignalIndex(index) {
        this.state = { ...this.state, caveSignalIndex: clampCount(index) };
        return this.save();
    }

    recordInheritance(inheritance) {
        this.state = { ...this.state, inheritance: inheritance && typeof inheritance === 'object' ? { ...inheritance } : null };
        return this.save();
    }

    reset() {
        this.state = normalizeArcState(DEFAULT_ARC_STATE);
        this._sinceEval = 0;
        return this.save();
    }
}

export const arcStateStore = new ArcStateManager({
    storage: typeof window !== 'undefined' ? window.localStorage : null
});
