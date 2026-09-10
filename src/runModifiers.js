const CARD_TYPES = Object.freeze({
    WORLD: 'world',
    FACTION: 'faction',
    THREAT: 'threat'
});

const deepFreeze = (value) => {
    if (!value || typeof value !== 'object') return value;
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
    return value;
};

export const RUN_MODIFIER_CARDS = deepFreeze([
    {
        key: 'relay_blackout',
        type: CARD_TYPES.WORLD,
        label: 'RELAY BLACKOUT',
        blurb: 'Radar pulses short and camp outing reports cannot jump the relay.',
        effects: {
            radar: { rangeMult: 0.65, cooldownMult: 1.35 },
            environment: { blackoutPulseSeconds: 18, blackoutDurationSeconds: 3 },
            outing: { propagationBlocked: true }
        }
    },
    {
        key: 'spore_bloom',
        type: CARD_TYPES.WORLD,
        label: 'SPORE BLOOM',
        blurb: 'Bio growth thickens routes; Tallow pays double for medical salvage.',
        effects: {
            biomeBias: { bio: 1.35 },
            economy: { tallowMedPayMult: 2 }
        }
    },
    {
        key: 'patrol_surge',
        type: CARD_TYPES.THREAT,
        label: 'PATROL SURGE',
        blurb: 'Hostile routing tightens and the broods press harder — but Vesper\'s ammunition stocks run deep.',
        effects: {
            spawnBias: { patrolBias: true, snailDensityMult: 1.35, snailSpeedMult: 1.12 },
            economy: { vesperAmmoPayMult: 2 }
        }
    },
    {
        key: 'ice_collapse',
        type: CARD_TYPES.WORLD,
        label: 'ICE COLLAPSE',
        blurb: 'The canyons shift and seal. Three crossings you would have used are simply gone.',
        effects: {
            routeBlocks: { landform: 'canyon', sealedGapCount: 3 }
        }
    },
    {
        key: 'camp_paranoia',
        type: CARD_TYPES.FACTION,
        label: 'CAMP PARANOIA',
        blurb: 'Survivors spook twice as fast, and bond work pays twice as much.',
        effects: {
            suspicionMult: 2,
            questPayMult: 2
        }
    },
    {
        key: 'egg_instability',
        type: CARD_TYPES.FACTION,
        label: 'EGG INSTABILITY',
        blurb: 'The clutch destabilizes unless Nahl has a seat on the manifest.',
        effects: {
            manifest: { eggSeatRequiresNahl: true }
        }
    },
    // Three further THREAT cards. Before these the pile held exactly one card,
    // and because WORLD and FACTION are capped at one each, every three-card
    // draw was forced to fill its last slot with PATROL SURGE -- measured at
    // 206/206 deep draws and 70.5% of all runs. A deck that always plays the
    // same card is a difficulty dial, not run variety.
    //
    // Each is a bargain rather than a penalty, and every effect key below was
    // verified to have a live consumer before it was authored: `spawnBias`
    // (threeGame.js proto-spawn bias and the director's patrol snapshot),
    // `radar.rangeMult`/`cooldownMult` (radar pulse range and cooldown),
    // `environment.blackout*` (the rolling-blackout runtime), and
    // `suspicionMult`. Cards must not promise deltas nothing applies.
    {
        key: 'hunter_pack',
        type: CARD_TYPES.THREAT,
        label: 'HUNTER PACK',
        blurb: 'Broods run in coordinated packs — but they are loud, and your radar cuts straight through them.',
        effects: {
            spawnBias: { proto: 1.4, patrolBias: true },
            radar: { rangeMult: 1.3 }
        }
    },
    {
        key: 'sensor_ghosts',
        type: CARD_TYPES.THREAT,
        label: 'SENSOR GHOSTS',
        blurb: 'Radar returns cannot be trusted. Whatever is out there is thinner on the ground than it sounds.',
        effects: {
            radar: { rangeMult: 0.6, cooldownMult: 1.5 },
            spawnBias: { proto: 0.72 }
        }
    },
    {
        key: 'grid_flicker',
        type: CARD_TYPES.THREAT,
        label: 'GRID FLICKER',
        blurb: 'Power browns out in long waves. The disruption leaves the camps too rattled to gossip about you.',
        effects: {
            environment: { blackoutPulseSeconds: 26, blackoutDurationSeconds: 5 },
            suspicionMult: 0.6
        }
    }
]);

// Last few runs' draws, so consecutive expeditions do not replay the same
// pressure. Stored rather than derived because "what did the previous run
// look like" is not recoverable from this run's seed.
export const RUN_CARD_HISTORY_KEY = 'hb_run_card_history_v1';
const RUN_CARD_HISTORY_LIMIT = 2;

function resolveStorage(storage) {
    if (storage !== undefined) return storage;
    try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function readRunCardHistory(storage = undefined) {
    const store = resolveStorage(storage);
    try {
        const parsed = JSON.parse(store?.getItem(RUN_CARD_HISTORY_KEY) ?? 'null');
        return Array.isArray(parsed) ? parsed.filter(Array.isArray) : [];
    } catch { return []; }
}

export function recordRunCardDraw(keys = [], storage = undefined) {
    const store = resolveStorage(storage);
    const history = [...readRunCardHistory(storage), [...keys]].slice(-RUN_CARD_HISTORY_LIMIT);
    try { store?.setItem(RUN_CARD_HISTORY_KEY, JSON.stringify(history)); } catch { /* best-effort */ }
    return history;
}

export function hashRunSeed(seed = 'default') {
    const text = String(seed ?? 'default');
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0 || 1;
}

export function createSeededRandom(seed = 'default') {
    let state = hashRunSeed(seed);
    return () => {
        state += 0x6D2B79F5;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function getRunCardByKey(key) {
    return RUN_MODIFIER_CARDS.find((card) => card.key === key) ?? null;
}

function mergeValue(left, right) {
    if (Array.isArray(left) || Array.isArray(right)) {
        return [...(Array.isArray(left) ? left : []), ...(Array.isArray(right) ? right : [])];
    }
    if (left && right && typeof left === 'object' && typeof right === 'object') {
        return mergeEffects(left, right);
    }
    return right ?? left;
}

export function mergeEffects(...effectsList) {
    const merged = {};
    for (const effects of effectsList) {
        if (!effects || typeof effects !== 'object') continue;
        for (const [key, value] of Object.entries(effects)) {
            merged[key] = mergeValue(merged[key], value);
        }
    }
    return deepFreeze(merged);
}

// Recently drawn cards sort to the back rather than being removed. Banning
// them outright starves a deck this small -- with the type caps it can make a
// three-card draw impossible -- and a card that can never immediately repeat is
// its own kind of predictable.
function shuffledCards(random, recentKeys = []) {
    const recent = new Set(recentKeys);
    return RUN_MODIFIER_CARDS
        .map((card) => ({ card, recent: recent.has(card.key) ? 1 : 0, sort: random() }))
        .sort((a, b) => (a.recent - b.recent) || (a.sort - b.sort))
        .map((entry) => entry.card);
}

// One of each world/faction card keeps a run's bargain legible; threat is
// allowed to double so a run can genuinely spike, but never fill every slot.
const TYPE_LIMITS = Object.freeze({
    [CARD_TYPES.WORLD]: 1,
    [CARD_TYPES.FACTION]: 1,
    [CARD_TYPES.THREAT]: 2
});

export function drawRunCards(seed = 'default', { minCards = 2, maxCards = 3, recentKeys = [] } = {}) {
    const random = createSeededRandom(seed);
    const targetCount = minCards + Math.floor(random() * (Math.max(minCards, maxCards) - minCards + 1));
    const selected = [];
    const typeCounts = { [CARD_TYPES.WORLD]: 0, [CARD_TYPES.FACTION]: 0, [CARD_TYPES.THREAT]: 0 };

    for (const card of shuffledCards(random, recentKeys)) {
        if (typeCounts[card.type] >= (TYPE_LIMITS[card.type] ?? Infinity)) continue;
        selected.push(card);
        typeCounts[card.type] += 1;
        if (selected.length >= targetCount) break;
    }

    return Object.freeze(selected);
}

// `recentKeys` defaults to the persisted history so ordinary consecutive runs
// vary. Passing it explicitly (including as []) opts out, which is what seed
// reconstruction needs: a named seed must be replayable exactly.
export function createRunCardState(seed = 'default', options = {}) {
    const { storage, ...drawOptions } = options;
    const recentKeys = Object.prototype.hasOwnProperty.call(options, 'recentKeys')
        ? options.recentKeys
        : readRunCardHistory(storage).flat();
    const cards = drawRunCards(seed, { ...drawOptions, recentKeys });
    recordRunCardDraw(cards.map((card) => card.key), storage);
    return deepFreeze({
        seed: String(seed ?? 'default'),
        cards,
        effects: mergeEffects(...cards.map((card) => card.effects))
    });
}

export function serializeRunCards(cards = []) {
    return cards.map(({ key, label, blurb }) => ({ key, label, blurb }));
}

export function applyCampPayoutEffects(payout = {}, { campId = '', effects = {} } = {}) {
    const adjusted = { ...payout };
    const scale = (field, mult) => {
        const base = Number(adjusted[field]);
        if (Number.isFinite(base) && Number.isFinite(mult) && mult > 1) {
            adjusted[field] = Math.max(0, Math.round(base * mult));
        }
    };
    if (campId === 'camp_tallow') scale('med', Number(effects?.economy?.tallowMedPayMult));
    // PATROL SURGE's ammunition half. There is no ammo storefront to make
    // "cheap", but Vesper payouts do carry ammo, so pay is the honest lever.
    if (campId === 'camp_vesper') scale('ammo', Number(effects?.economy?.vesperAmmoPayMult));
    return adjusted;
}
