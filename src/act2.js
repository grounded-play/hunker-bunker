const STORAGE_KEY = 'hb_act2_v1';
const ACT2_STATE_VERSION = 3;

// ── Act 2: the PregAlien loop ─────────────────────────────────
// Unlocks after the cave reveal (arcState 'hive_awakened_tease'). The player is
// the queen's carrier. The act runs a single persisted objective ladder:
//
//   gestation    → sever the Mothership uplink at your own wreck
//   dish         → grow a signal dish at the (hive-warped) foundry
//   camps_help   → three survivor camps found — help each finish the vessel
//   launch_ready → vessel done: choose camp fates, then board from command camp
//   departed     → Act 2 complete (Act 3 hook)
//
// Progress is meta (survives death/runs), mirroring arcState.js. World
// placement of camps is chosen once by threeGame and persisted here.

export const ACT2_PHASES = Object.freeze([
    'dormant',
    'gestation',
    'dish',
    'camps_help',
    'camps_betray',
    'launch_ready',
    'departed'
]);

export const ACT2_CAMP_IDS = Object.freeze(['camp_meridian', 'camp_tallow', 'camp_vesper']);

export const ACT2_CAMP_LABELS = Object.freeze({
    camp_meridian: 'CAMP MERIDIAN',
    camp_tallow: 'CAMP TALLOW',
    camp_vesper: 'CAMP VESPER'
});

export const ACT2_CLASS_CAST = Object.freeze({
    SCOUT: Object.freeze({
        class: 'Scout',
        leader: 'Sister Martha',
        callsign: 'VESPERS',
        title: 'Pathfinder Prior',
        sprite: '/martha_camp_walk.png',
        bossSprite: '/boss_corrupted_scout.png',
        color: 0x7dff5a
    }),
    TANK: Object.freeze({
        class: 'Tank',
        leader: 'Commander Briggs',
        callsign: 'BULWARK',
        title: 'Siege Commander',
        sprite: '/briggs_camp_walk.png',
        bossSprite: '/boss_corrupted_tank.png',
        color: 0xffb700
    }),
    ENGINEER: Object.freeze({
        class: 'Engineer',
        leader: 'Overseer Kaelen',
        callsign: 'WRENCHLIGHT',
        title: 'Systems Overseer',
        sprite: '/kaelen_camp_walk.png',
        bossSprite: '/boss_corrupted_engineer.png',
        color: 0x00e5ff
    })
});

export const ACT2_CLASS_RPS_ORDER = Object.freeze({
    // The player always meets the two other disciplines first, then the
    // inverted mirror of their own class at the final command camp.
    SCOUT: Object.freeze(['TANK', 'ENGINEER', 'SCOUT']),
    TANK: Object.freeze(['ENGINEER', 'SCOUT', 'TANK']),
    ENGINEER: Object.freeze(['SCOUT', 'TANK', 'ENGINEER'])
});

export function normalizeClassId(playerType = 'ENGINEER') {
    const key = String(playerType ?? '').trim().toUpperCase();
    return ACT2_CLASS_CAST[key] ? key : 'ENGINEER';
}

export function getClassCampOrder(playerType = 'ENGINEER') {
    const playerClass = normalizeClassId(playerType);
    return ACT2_CLASS_RPS_ORDER[playerClass].map((classId, index) => {
        const cast = ACT2_CLASS_CAST[classId];
        const id = ACT2_CAMP_IDS[index];
        return {
            id,
            order: index + 1,
            classId,
            class: cast.class,
            leader: cast.leader,
            callsign: cast.callsign,
            title: cast.title,
            sprite: cast.sprite,
            bossSprite: cast.bossSprite,
            color: cast.color,
            isBoss: index === ACT2_CAMP_IDS.length - 1,
            role: index === ACT2_CAMP_IDS.length - 1 ? 'inverted_self' : 'ally'
        };
    });
}

export function getBoardingCampId(playerType = 'ENGINEER') {
    return getClassCampOrder(playerType).at(-1)?.id ?? ACT2_CAMP_IDS.at(-1);
}

// Camps can be supported during Act 1 (human prelude). Each level costs
// shells, buys real Act 1 utility (O2 haven), and — the dramatic irony — arms
// the camp's defenses for the Act 2 betrayal while fattening its cull loot.
export const ACT2_CAMP_MAX_LEVEL = 3;
export const ACT2_CAMP_SUPPORT_COSTS = Object.freeze([5, 10, 20]);

export function campSupportCost(currentLevel = 0) {
    const level = Math.max(0, Math.min(ACT2_CAMP_MAX_LEVEL - 1, Math.floor(currentLevel)));
    return ACT2_CAMP_SUPPORT_COSTS[level];
}

// ── Faction state machine (docs/implementation_plan.md) ──────────
// Camps resolve to exactly one status; the boarding vector reads these plus
// the queen/egg decisions to pick an ending.
export const ACT2_CAMP_STATUSES = Object.freeze([
    'alive',
    'robbed',
    'culled',
    'recruited',
    'turned'
]);

export const ACT2_QUEEN_STATUSES = Object.freeze(['aboard', 'rejected', 'killed', 'abandoned']);
export const ACT2_EGGS_STATUSES = Object.freeze(['aboard', 'destroyed', 'abandoned', 'hidden']);
export const ACT2_INFECTION_STAGES = Object.freeze(['latent', 'strained', 'symptomatic', 'outed', 'cured', 'ascendant']);
export const ACT2_HIVE_STATUSES = Object.freeze([
    'dormant',
    'mined',
    'wounded',
    'awakened',
    'bonded',
    'rescued',
    'aboard',
    'abandoned',
    'slain',
    'expired_by_cure',
    'queen_consumed'
]);
export const ACT2_HUMAN_PASSENGER_STATES = Object.freeze([
    'none',
    'human_unsuspecting',
    'human_suspicious',
    'human_outed',
    'latent_infected',
    'turned',
    'dead'
]);
export const ACT2_HIVE_SITES = Object.freeze([
    Object.freeze({ id: 'hive_suture', characterId: 'nahl', label: 'SUTURE HIVE', resource: 'suture_resin' }),
    Object.freeze({ id: 'hive_relay', characterId: 'vey', label: 'RELAY HIVE', resource: 'neural_filament' }),
    Object.freeze({ id: 'hive_carapace', characterId: 'rhun', label: 'CARAPACE HIVE', resource: 'living_chitin' })
]);
export const ACT2_MANIFEST_SEATS_MAX = 4;

export const ACT2_MAX_BOND = 5;
export const ACT2_RECRUIT_BOND_THRESHOLD = 4;
export const ACT2_MAX_OBEDIENCE = 3;

export const ACT2_ENDINGS = Object.freeze({
    FULL_BROOD: 'full_brood',
    CLEAN_ESCAPE: 'clean_escape',
    MIXED_CREW: 'mixed_crew',
    CARRIERS_BARGAIN: 'carriers_bargain',
    SCORCHED_SKY: 'scorched_sky'
});

export const ACT2_ENDING_CUTSCENES = Object.freeze({
    [ACT2_ENDINGS.FULL_BROOD]: 'ending-fullbrood',
    [ACT2_ENDINGS.CLEAN_ESCAPE]: 'ending-cleanescape',
    [ACT2_ENDINGS.MIXED_CREW]: 'ending-mixedcrew',
    [ACT2_ENDINGS.CARRIERS_BARGAIN]: 'ending-carriersbargain',
    [ACT2_ENDINGS.SCORCHED_SKY]: 'ending-scorchedsky'
});

// Queen/system copy for each beat. Rendered through the brief-transmission
// panel; QUEEN: gets its own dialogue speaker.
export const ACT2_LINES = Object.freeze({
    intro: [
        'QUEEN: TWO HEARTBEATS. ONE PURPOSE.',
        'QUEEN: THE MOTHERSHIP STILL WHISPERS THROUGH YOUR WRECK. IT WILL SEND EXTERMINATORS.',
        'SYSTEM: NEW INSTINCT — SEVER THE MOTHERSHIP UPLINK AT YOUR SHIP CONSOLE.'
    ],
    resume: [
        'QUEEN: WE CONTINUE. THE INSTINCT REMEMBERS THE WAY.'
    ],
    uplinkSilenced: [
        'SYSTEM: UPLINK SEVERED. MOTHERSHIP TELEMETRY LOST.',
        'QUEEN: GOOD. THEIR ANTI-BROOD GRID DIES WITH IT.',
        'QUEEN: NOW LET US SPEAK FARTHER. GROW A DISH AT THE FOUNDRY.'
    ],
    dishBuilt: [
        'SYSTEM: SIGNAL DISH GROWN. WIDEBAND SWEEP COMPLETE.',
        'QUEEN: THREE CAMPS OF SURVIVORS. THEY BUILD A VESSEL TO FLEE THIS WORLD.',
        'QUEEN: HELP THEM FINISH IT. WE WILL NEED THEIR WINGS.'
    ],
    campAided: [
        'SYSTEM: VESSEL SECTION COMPLETE. SURVIVORS GRATEFUL.'
    ],
    allAided: [
        'SYSTEM: VESSEL ASSEMBLY COMPLETE. FOUR SEATS PRESSURIZED.',
        'QUEEN: FOUR SEATS. YOU. ME. THE EGGS MAKE FOUR.',
        'QUEEN: THE BUILDERS CANNOT BOARD. CULL THEM, TURN THEM, OR DEFY ME AND HIDE THEM.'
    ],
    campCulled: [
        'SYSTEM: SURVIVOR BEACON OFFLINE.'
    ],
    allCulled: [
        'SYSTEM: NO SURVIVOR BEACONS REMAIN IN SECTOR 9.',
        'QUEEN: THE VESSEL IS OURS ALONE. CARRY US TO THE STARS.'
    ],
    departed: [
        'SYSTEM: LAUNCH SEQUENCE COMPLETE. HULL INTEGRITY NOMINAL.',
        'QUEEN: FOUR SEATS. FOUR HEARTBEATS. THE WORLD SHRINKS TO A COLD LIGHT BELOW.',
        'QUEEN: SLEEP, CARRIER. WHEN YOU WAKE, WE CHOOSE A NEW WORLD.'
    ],
    campRobbed: [
        'SYSTEM: VAULT BREACHED. STOCKPILE TRANSFERRED.',
        'QUEEN: THEY WILL HATE YOU NOW. HATE IS ACCEPTABLE. DEAD IS BETTER.'
    ],
    campRecruited: [
        'SYSTEM: SURVIVORS BRIEFED. CARGO HOLD MANIFEST UPDATED.',
        'QUEEN: YOU HIDE WARM BODIES IN MY SHIP, CARRIER. I FEEL EVERY HEARTBEAT.'
    ],
    campTurned: [
        'SYSTEM: SPORE EXPOSURE COMPLETE. NEURAL COMPLIANCE AT 100%.',
        'QUEEN: SEE HOW THEY SMILE NOW. YOU GAVE THEM PEACE. YOU GAVE ME HANDS.'
    ],
    queenRejected: [
        'SYSTEM: NEURAL LINK SEVERED. HIVE SIGNAL FADING.',
        'QUEEN: YOU CANNOT UNCARRY WHAT YOU CARRIED. REMEMBER THAT, LITTLE HOST.'
    ],
    queenKilled: [
        'SYSTEM: BIO-SIGNATURE TERMINATED. THE CAVE IS SILENT.',
        'SYSTEM: ...RESIDUAL NEURAL STATIC DETECTED IN OPERATOR CORTEX.'
    ],
    eggsDestroyed: [
        'SYSTEM: INCUBATION PODS PURGED. AMBER GLOW EXTINGUISHED.'
    ]
});

// Per-ending departure copy, played before the ending cutscene.
export const ACT2_ENDING_LINES = Object.freeze({
    [ACT2_ENDINGS.FULL_BROOD]: [
        'SYSTEM: LAUNCH COMPLETE. CARGO: ONE QUEEN. ONE CLUTCH. NO PASSENGERS.',
        'QUEEN: PERFECT OBEDIENCE. THE CORE WORLDS ARE WARM AND CROWDED.',
        'QUEEN: SLEEP, CARRIER. WE HAVE SO MANY WORLDS TO MEET.'
    ],
    [ACT2_ENDINGS.CLEAN_ESCAPE]: [
        'SYSTEM: LAUNCH COMPLETE. ALL SURVIVOR MANIFESTS ACCOUNTED FOR. HUMAN.',
        'SYSTEM: NO HIVE SIGNATURE DETECTED ABOARD.',
        'SYSTEM: COURSE SET FOR THE RELAY. TELL THEM WHAT HAPPENED HERE.'
    ],
    [ACT2_ENDINGS.MIXED_CREW]: [
        'SYSTEM: LAUNCH COMPLETE. CABIN PARTITION FIELDS HOLDING.',
        'QUEEN: HUMANS ON ONE SIDE. MINE ON THE OTHER. YOU IN BETWEEN.',
        'QUEEN: A FRAGILE PEACE. FRAGILE THINGS ARE MY FAVORITE.'
    ],
    [ACT2_ENDINGS.CARRIERS_BARGAIN]: [
        'SYSTEM: LAUNCH COMPLETE. COOLANT CELL TEMPERATURE ANOMALY LOGGED.',
        'SYSTEM: OPERATOR VITALS NOMINAL. SUBDERMAL READINGS... FLAGGED.',
        'SYSTEM: THE SURVIVORS ARE SAFE. NOBODY CHECKED YOUR NECK.'
    ],
    [ACT2_ENDINGS.SCORCHED_SKY]: [
        'SYSTEM: LAUNCH COMPLETE. CREW MANIFEST: ONE.',
        'SYSTEM: NO BEACONS BEHIND. NO SIGNAL AHEAD.',
        'SYSTEM: FOUR SEATS. ONE HEARTBEAT.'
    ]
});

export function getAct2EndingLines(ending) {
    return ACT2_ENDING_LINES[ending] ?? ACT2_LINES.departed;
}

export function getCampClassMapping(playerType = 'ENGINEER') {
    return Object.fromEntries(getClassCampOrder(playerType).map((entry) => [
        entry.id,
        {
            class: entry.class,
            classId: entry.classId,
            leader: entry.leader,
            callsign: entry.callsign,
            title: entry.title,
            sprite: entry.sprite,
            bossSprite: entry.bossSprite,
            color: entry.color,
            isBoss: entry.isBoss,
            order: entry.order,
            role: entry.role
        }
    ]));
}

function getStorage(storage) {
    return storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
}

function clampInteger(value, min, max, fallback = min) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, Math.floor(numeric)));
}

function normalizeCampStatus(raw = {}) {
    if (ACT2_CAMP_STATUSES.includes(raw?.status)) return raw.status;
    // v1 saves only had booleans.
    if (raw?.destroyed === true) return 'culled';
    if (raw?.turned === true) return 'turned';
    if (raw?.robbed === true) return 'robbed';
    return 'alive';
}

function normalizeCamp(raw = {}, id) {
    const status = normalizeCampStatus(raw);
    const suspicion = clampInteger(raw?.suspicion, 0, 100, 0);
    const passengerState = ACT2_HUMAN_PASSENGER_STATES.includes(raw?.passengerState)
        ? raw.passengerState
        : status === 'recruited' ? 'human_unsuspecting'
            : status === 'turned' ? 'turned'
                : status === 'culled' ? 'dead'
                    : 'none';
    return {
        id,
        x: Number.isFinite(raw?.x) ? raw.x : null,
        z: Number.isFinite(raw?.z) ? raw.z : null,
        level: clampInteger(raw?.level, 0, ACT2_CAMP_MAX_LEVEL, 0),
        bond: clampInteger(raw?.bond, 0, ACT2_MAX_BOND, 0),
        aided: Boolean(raw?.aided),
        status,
        suspicion,
        passengerState,
        knowsPlayerInfected: Boolean(raw?.knowsPlayerInfected),
        relayLinked: Boolean(raw?.relayLinked),
        leaderAlive: raw?.leaderAlive !== false && status !== 'culled',
        questFlags: raw?.questFlags && typeof raw.questFlags === 'object' ? { ...raw.questFlags } : {},
        // Compatibility projections while visuals migrate off booleans.
        destroyed: status === 'culled',
        robbed: status === 'robbed',
        turned: status === 'turned'
    };
}

function normalizeSuspicion(raw = {}, camps = []) {
    const source = raw && typeof raw === 'object' ? raw : {};
    return Object.fromEntries(camps.map((camp) => [
        camp.id,
        clampInteger(source[camp.id] ?? camp.suspicion, 0, 100, 0)
    ]));
}

function normalizeNetworks(raw = {}) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const normalizeKnownIds = (ids, validIds) => (
        Array.isArray(ids)
            ? [...new Set(ids.filter((id) => validIds.includes(id)))]
            : []
    );
    return {
        humanRelayOnline: Boolean(source.humanRelayOnline),
        hiveSynapseOnline: Boolean(source.hiveSynapseOnline),
        bridgeOnline: Boolean(source.bridgeOnline),
        knownByCamps: normalizeKnownIds(source.knownByCamps, ACT2_CAMP_IDS),
        knownByHives: normalizeKnownIds(source.knownByHives, ACT2_HIVE_SITES.map((site) => site.id))
    };
}

function normalizeHive(raw = {}, site = ACT2_HIVE_SITES[0]) {
    const status = ACT2_HIVE_STATUSES.includes(raw?.status) ? raw.status : 'dormant';
    return {
        id: site.id,
        label: site.label,
        characterId: site.characterId,
        resource: site.resource,
        x: Number.isFinite(raw?.x) ? raw.x : null,
        z: Number.isFinite(raw?.z) ? raw.z : null,
        status,
        extractionLevel: clampInteger(raw?.extractionLevel, 0, 3, 0),
        bond: clampInteger(raw?.bond, 0, ACT2_MAX_BOND, 0),
        questFlags: raw?.questFlags && typeof raw.questFlags === 'object' ? { ...raw.questFlags } : {},
        networked: Boolean(raw?.networked),
        aboard: Boolean(raw?.aboard) || status === 'aboard'
    };
}

function buildManifestFromNormalizedState(state) {
    const humans = state.camps
        .filter((camp) => ['recruited'].includes(camp.status))
        .map((camp) => camp.id);
    const aliens = state.hives
        .filter((hive) => hive.aboard || ['rescued', 'aboard'].includes(hive.status))
        .map((hive) => hive.id);
    const queen = state.queenStatus === 'aboard';
    const egg = state.eggsStatus === 'aboard' || state.eggsStatus === 'hidden';
    const seatsUsed = 1 + humans.length + aliens.length + (queen ? 2 : 0) + (egg ? 1 : 0);
    const invalidReasons = [];
    if (seatsUsed > ACT2_MANIFEST_SEATS_MAX) {
        invalidReasons.push('seat_capacity_exceeded');
    }
    if (egg && !queen && !state.hives.some((hive) => hive.id === 'hive_suture' && (hive.aboard || hive.status === 'aboard'))) {
        invalidReasons.push('egg_unstable');
    }

    return {
        player: state.infectionStage === 'cured' ? 'human' : 'infected',
        humans,
        aliens,
        queen,
        egg,
        seatsUsed,
        seatsMax: ACT2_MANIFEST_SEATS_MAX,
        valid: invalidReasons.length === 0,
        invalidReasons
    };
}

export function buildAct2Manifest(rawState = {}) {
    return buildManifestFromNormalizedState(normalizeAct2State(rawState));
}

export function normalizeAct2State(raw = {}) {
    const parsed = raw && typeof raw === 'object' ? raw : {};
    const camps = ACT2_CAMP_IDS.map((id) => {
        const existing = Array.isArray(parsed.camps) ? parsed.camps.find((c) => c?.id === id) : null;
        return normalizeCamp(existing ?? {}, id);
    });
    const hives = ACT2_HIVE_SITES.map((site) => {
        const existing = Array.isArray(parsed.hives) ? parsed.hives.find((h) => h?.id === site.id) : null;
        return normalizeHive(existing ?? {}, site);
    });

    // Migration: v1 saves had no obedience meter — derive it from culls so an
    // old completed save still reads as the FULL BROOD path.
    const culledCount = camps.filter((c) => c.status === 'culled').length;
    const obedienceRaw = Number(parsed.queenObedience);
    const queenObedience = Number.isFinite(obedienceRaw)
        ? Math.max(-ACT2_MAX_OBEDIENCE, Math.min(ACT2_MAX_OBEDIENCE, Math.round(obedienceRaw)))
        : Math.min(ACT2_MAX_OBEDIENCE, culledCount);

    const humanity = clampInteger(parsed.humanity, 0, 100, 100);
    const infectionLoad = clampInteger(parsed.infectionLoad, 0, 100, 0);
    const infectionStage = ACT2_INFECTION_STAGES.includes(parsed.infectionStage)
        ? parsed.infectionStage
        : humanity <= 0 ? 'outed'
            : humanity <= 50 ? 'symptomatic'
                : humanity <= 75 ? 'strained'
                    : 'latent';
    const normalized = {
        begun: Boolean(parsed.begun),
        uplinkSilenced: Boolean(parsed.uplinkSilenced),
        dishBuilt: Boolean(parsed.dishBuilt),
        departed: Boolean(parsed.departed),
        queenObedience,
        queenStatus: ACT2_QUEEN_STATUSES.includes(parsed.queenStatus) ? parsed.queenStatus : 'aboard',
        eggsStatus: ACT2_EGGS_STATUSES.includes(parsed.eggsStatus) ? parsed.eggsStatus : 'aboard',
        humanity,
        infectionLoad,
        infectionStage,
        coverIntegrity: clampInteger(parsed.coverIntegrity, 0, 100, 100),
        outedToHumans: Boolean(parsed.outedToHumans) || infectionStage === 'outed',
        suspicion: normalizeSuspicion(parsed.suspicion, camps),
        networks: normalizeNetworks(parsed.networks),
        camps,
        hives,
        manifest: null,
        version: ACT2_STATE_VERSION
    };
    normalized.manifest = buildManifestFromNormalizedState(normalized);
    return normalized;
}

export const DEFAULT_ACT2_STATE = Object.freeze(normalizeAct2State({}));

// Pure phase derivation — the ladder only ever moves forward because the
// underlying flags are monotonic. Once the vessel is complete (all camps
// aided) the launch is available regardless of camp fates: what you do with
// the camps is a choice, not a gate. 'camps_betray' stays in ACT2_PHASES for
// old saves/tests but is no longer derived.
export function deriveAct2Phase(state = DEFAULT_ACT2_STATE) {
    const s = normalizeAct2State(state);
    if (!s.begun) return 'dormant';
    if (s.departed) return 'departed';
    if (!s.uplinkSilenced) return 'gestation';
    if (!s.dishBuilt) return 'dish';
    if (!s.camps.every((c) => c.aided)) return 'camps_help';
    return 'launch_ready';
}

// ── Ending picker: the boarding vector, pure. ────────────────────
export function pickAct2Ending(rawState = DEFAULT_ACT2_STATE) {
    const state = normalizeAct2State(rawState);
    const camps = state.camps;
    const total = camps.length;
    const count = (status) => camps.filter((c) => c.status === status).length;

    const culled = count('culled');
    const recruited = count('recruited');
    const turned = count('turned');
    const robbed = count('robbed');
    const allCulled = culled === total;
    const allHumanRecruited = recruited === total;
    const anySurvivorsBoarded = recruited > 0 || turned > 0;
    const queenGone = state.queenStatus === 'rejected' || state.queenStatus === 'killed' || state.queenStatus === 'abandoned';
    const queenAboard = state.queenStatus === 'aboard';
    const eggsAboard = state.eggsStatus === 'aboard' || state.eggsStatus === 'hidden';
    const eggsDestroyed = state.eggsStatus === 'destroyed' || state.eggsStatus === 'abandoned';

    if (queenAboard && eggsAboard && allCulled && state.queenObedience >= ACT2_MAX_OBEDIENCE) {
        return ACT2_ENDINGS.FULL_BROOD;
    }
    if (queenGone && eggsDestroyed && allHumanRecruited) {
        return ACT2_ENDINGS.CLEAN_ESCAPE;
    }
    if (queenGone && eggsAboard && anySurvivorsBoarded) {
        return ACT2_ENDINGS.CARRIERS_BARGAIN;
    }
    if (queenGone && eggsDestroyed && allCulled) {
        return ACT2_ENDINGS.SCORCHED_SKY;
    }
    if (queenAboard && (turned > 0 || recruited > 0 || robbed > 0)) {
        return ACT2_ENDINGS.MIXED_CREW;
    }
    // Narratively messy but valid vectors resolve to the compromise ending.
    return ACT2_ENDINGS.MIXED_CREW;
}

export class Act2Manager {
    constructor({ storage = null, storageKey = STORAGE_KEY, onTransition = null } = {}) {
        this.storage = getStorage(storage);
        this.storageKey = storageKey;
        this.onTransition = onTransition;
        this.state = this.load();
    }

    load() {
        try {
            const raw = this.storage?.getItem(this.storageKey);
            if (!raw) return normalizeAct2State({});
            return normalizeAct2State(JSON.parse(raw));
        } catch {
            return normalizeAct2State({});
        }
    }

    save() {
        this.state = normalizeAct2State(this.state);
        try {
            this.storage?.setItem(this.storageKey, JSON.stringify(this.state));
        } catch {
            // Best-effort persistence, matching the other hb_* stores.
        }
        return this.state;
    }

    getState() {
        return normalizeAct2State(this.state);
    }

    getPhase() {
        return deriveAct2Phase(this.state);
    }

    _mutate(mutator) {
        const from = this.getPhase();
        mutator(this.state);
        this.save();
        const to = this.getPhase();
        if (to !== from && typeof this.onTransition === 'function') {
            this.onTransition(from, to, this.getState());
        }
        return { from, to, state: this.getState() };
    }

    begin() {
        return this._mutate((s) => { s.begun = true; });
    }

    silenceUplink() {
        return this._mutate((s) => { s.uplinkSilenced = true; });
    }

    buildDish() {
        return this._mutate((s) => { s.dishBuilt = true; });
    }

    setCampPosition(id, x, z) {
        return this._mutate((s) => {
            const camp = s.camps.find((c) => c.id === id);
            if (camp && Number.isFinite(x) && Number.isFinite(z)) {
                camp.x = x;
                camp.z = z;
            }
        });
    }

    aidCamp(id) {
        return this._mutate((s) => {
            const camp = s.camps.find((c) => c.id === id);
            if (camp) camp.aided = true;
        });
    }

    // Act 1 support: monotonic level 0→3. Valid any time before the camp is
    // resolved (the ladder itself never depends on levels).
    upgradeCamp(id) {
        return this._mutate((s) => {
            const camp = s.camps.find((c) => c.id === id);
            if (camp && camp.status === 'alive' && camp.level < ACT2_CAMP_MAX_LEVEL) {
                camp.level += 1;
            }
        });
    }

    // ── Choice reducers (docs/implementation_plan.md Sprint 1) ──

    recordQueenObedience(delta = 0) {
        return this._mutate((s) => {
            const next = (Number.isFinite(s.queenObedience) ? s.queenObedience : 0) + Math.round(Number(delta) || 0);
            s.queenObedience = Math.max(-ACT2_MAX_OBEDIENCE, Math.min(ACT2_MAX_OBEDIENCE, next));
        });
    }

    setQueenStatus(status) {
        return this._mutate((s) => {
            if (ACT2_QUEEN_STATUSES.includes(status)) s.queenStatus = status;
        });
    }

    setEggsStatus(status) {
        return this._mutate((s) => {
            if (ACT2_EGGS_STATUSES.includes(status)) s.eggsStatus = status;
        });
    }

    setCampStatus(id, status) {
        return this._mutate((s) => {
            const camp = s.camps.find((c) => c.id === id);
            if (!camp || !ACT2_CAMP_STATUSES.includes(status)) return;
            camp.status = status;
            if (status === 'recruited') camp.passengerState = 'human_unsuspecting';
            if (status === 'turned') camp.passengerState = 'turned';
            if (status === 'culled') {
                camp.passengerState = 'dead';
                camp.leaderAlive = false;
            }
            if (status === 'robbed' || status === 'alive') camp.passengerState = 'none';
        });
    }

    adjustCampBond(id, delta = 0) {
        return this._mutate((s) => {
            const camp = s.camps.find((c) => c.id === id);
            if (!camp) return;
            const next = camp.bond + Math.round(Number(delta) || 0);
            camp.bond = Math.max(0, Math.min(ACT2_MAX_BOND, next));
        });
    }

    completeCampQuest(id, questId, bondDelta = 1) {
        return this._mutate((s) => {
            const camp = s.camps.find((c) => c.id === id);
            if (!camp || !questId || camp.questFlags[questId] === 'done') return;
            camp.questFlags[questId] = 'done';
            camp.bond = Math.max(0, Math.min(ACT2_MAX_BOND, camp.bond + Math.max(0, Math.round(bondDelta))));
        });
    }

    isQuestDone(id, questId) {
        const camp = this.getState().camps.find((c) => c.id === id);
        return camp?.questFlags?.[questId] === 'done';
    }

    // Rob the stockpile: the camp survives but is lost to every other path.
    stealCamp(id) {
        return this._mutate((s) => {
            const camp = s.camps.find((c) => c.id === id);
            if (camp && camp.status === 'alive') {
                camp.status = 'robbed';
                camp.passengerState = 'none';
            }
        });
    }

    // Wipe the camp. Pleases the queen.
    cullCamp(id) {
        return this._mutate((s) => {
            const camp = s.camps.find((c) => c.id === id);
            if (!camp || !camp.aided) return;
            if (camp.status !== 'alive' && camp.status !== 'robbed') return;
            camp.status = 'culled';
            camp.passengerState = 'dead';
            camp.leaderAlive = false;
            s.queenObedience = Math.min(ACT2_MAX_OBEDIENCE, (s.queenObedience ?? 0) + 1);
        });
    }

    // Defy (human) or dark-bargain (turned). Both need earned trust.
    recruitCamp(id, { mode = 'human' } = {}) {
        return this._mutate((s) => {
            const camp = s.camps.find((c) => c.id === id);
            if (!camp || camp.status !== 'alive') return;
            if (camp.bond < ACT2_RECRUIT_BOND_THRESHOLD) return;
            if (mode === 'turned') {
                camp.status = 'turned';
                camp.passengerState = 'turned';
                s.queenObedience = Math.min(ACT2_MAX_OBEDIENCE, (s.queenObedience ?? 0) + 1);
            } else {
                camp.status = 'recruited';
                camp.passengerState = camp.suspicion >= 50 || camp.knowsPlayerInfected
                    ? 'human_suspicious'
                    : 'human_unsuspecting';
                s.queenObedience = Math.max(-ACT2_MAX_OBEDIENCE, (s.queenObedience ?? 0) - 1);
            }
        });
    }

    adjustCampSuspicion(id, delta = 0) {
        return this._mutate((s) => {
            const camp = s.camps.find((c) => c.id === id);
            if (!camp) return;
            camp.suspicion = clampInteger(camp.suspicion + Math.round(Number(delta) || 0), 0, 100, camp.suspicion);
            s.suspicion[camp.id] = camp.suspicion;
            if (camp.suspicion >= 80) camp.knowsPlayerInfected = true;
        });
    }

    adjustHumanity(delta = 0) {
        return this._mutate((s) => {
            s.humanity = clampInteger(s.humanity + Math.round(Number(delta) || 0), 0, 100, s.humanity);
            s.infectionLoad = clampInteger(100 - s.humanity, 0, 100, s.infectionLoad);
            if (s.humanity <= 0) s.infectionStage = 'outed';
            else if (s.humanity <= 50) s.infectionStage = 'symptomatic';
            else if (s.humanity <= 75) s.infectionStage = 'strained';
            else s.infectionStage = 'latent';
        });
    }

    setHiveStatus(id, status) {
        return this._mutate((s) => {
            const hive = s.hives.find((h) => h.id === id);
            if (!hive || !ACT2_HIVE_STATUSES.includes(status)) return;
            hive.status = status;
            hive.aboard = status === 'aboard' || status === 'rescued';
        });
    }

    // Compatibility alias while callers migrate.
    destroyCamp(id) {
        return this.cullCamp(id);
    }

    getEndingVector() {
        const state = this.getState();
        return {
            ending: pickAct2Ending(state),
            queenObedience: state.queenObedience,
            queenStatus: state.queenStatus,
            eggsStatus: state.eggsStatus,
            humanity: state.humanity,
            infectionStage: state.infectionStage,
            manifest: state.manifest,
            camps: state.camps.map((c) => ({ id: c.id, status: c.status, level: c.level, bond: c.bond }))
        };
    }

    depart() {
        return this._mutate((s) => { s.departed = true; });
    }

    reset() {
        this.state = normalizeAct2State({});
        return this.save();
    }
}
