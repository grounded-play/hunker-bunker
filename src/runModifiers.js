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
            economy: { tallowMedPayMult: 2 },
            hazards: { sporeBloom: true }
        }
    },
    {
        key: 'patrol_surge',
        type: CARD_TYPES.THREAT,
        label: 'PATROL SURGE',
        blurb: 'Hostile routing tightens, but Vesper dumps cheap ammunition.',
        effects: {
            spawnBias: { patrolBias: true, snailDensityMult: 1.35, snailSpeedMult: 1.12 },
            economy: { vesperAmmoCostMult: 0.5 }
        }
    },
    {
        key: 'ice_collapse',
        type: CARD_TYPES.WORLD,
        label: 'ICE COLLAPSE',
        blurb: 'Canyon gaps seal under pressure and one camp needs a dig-out route.',
        effects: {
            routeBlocks: { landform: 'canyon', sealedGapCount: 3, digOutCamp: true },
            economy: { digOutRewardShells: 12 }
        }
    },
    {
        key: 'camp_paranoia',
        type: CARD_TYPES.FACTION,
        label: 'CAMP PARANOIA',
        blurb: 'Survivors spook twice as fast, and bond work pays twice as much.',
        effects: {
            suspicionMult: 2,
            questPayMult: 2,
            faction: { campPressure: true }
        }
    },
    {
        key: 'egg_instability',
        type: CARD_TYPES.FACTION,
        label: 'EGG INSTABILITY',
        blurb: 'The clutch destabilizes unless Nahl has a seat on the manifest.',
        effects: {
            manifest: { eggSeatRequiresNahl: true },
            faction: { hivePressure: true }
        }
    }
]);

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

function shuffledCards(random) {
    return RUN_MODIFIER_CARDS
        .map((card) => ({ card, sort: random() }))
        .sort((a, b) => a.sort - b.sort)
        .map((entry) => entry.card);
}

export function drawRunCards(seed = 'default', { minCards = 2, maxCards = 3 } = {}) {
    const random = createSeededRandom(seed);
    const targetCount = minCards + Math.floor(random() * (Math.max(minCards, maxCards) - minCards + 1));
    const selected = [];
    const typeCounts = { [CARD_TYPES.WORLD]: 0, [CARD_TYPES.FACTION]: 0, [CARD_TYPES.THREAT]: 0 };

    for (const card of shuffledCards(random)) {
        if (card.type === CARD_TYPES.WORLD && typeCounts[CARD_TYPES.WORLD] >= 1) continue;
        if (card.type === CARD_TYPES.FACTION && typeCounts[CARD_TYPES.FACTION] >= 1) continue;
        selected.push(card);
        typeCounts[card.type] += 1;
        if (selected.length >= targetCount) break;
    }

    return Object.freeze(selected);
}

export function createRunCardState(seed = 'default', options = {}) {
    const cards = drawRunCards(seed, options);
    return deepFreeze({
        seed: String(seed ?? 'default'),
        cards,
        effects: mergeEffects(...cards.map((card) => card.effects))
    });
}

export function serializeRunCards(cards = []) {
    return cards.map(({ key, label, blurb }) => ({ key, label, blurb }));
}
