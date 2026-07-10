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
        sprite: '/martha_camp_walk_v2.png',
        bossSprite: '/boss_corrupted_scout.png',
        color: 0x7dff5a
    }),
    TANK: Object.freeze({
        class: 'Tank',
        leader: 'Commander Briggs',
        callsign: 'BULWARK',
        title: 'Siege Commander',
        sprite: '/briggs_camp_walk_v2.png',
        bossSprite: '/boss_corrupted_tank.png',
        color: 0xffb700
    }),
    ENGINEER: Object.freeze({
        class: 'Engineer',
        leader: 'Overseer Kaelen',
        callsign: 'WRENCHLIGHT',
        title: 'Systems Overseer',
        sprite: '/kaelen_camp_walk_v2.png',
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

export const ACT2_HIVE_RESCUE_BOND_THRESHOLD = 3;
export const ACT2_DIALOGUE_FINAL_STAGE = 3;
export const ACT2_FINAL_URGE_BASE_COST = 15;
export const ACT2_FINAL_URGE_COST_STEP = 10;

// The queen's pull grows with every final you resist.
export function campFinalUrgeCost(finalsDone = 0) {
    return ACT2_FINAL_URGE_BASE_COST + ACT2_FINAL_URGE_COST_STEP * Math.max(0, finalsDone);
}

export const ACT2_ENDINGS = Object.freeze({
    FULL_BROOD: 'full_brood',
    CLEAN_ESCAPE: 'clean_escape',
    MIXED_CREW: 'mixed_crew',
    CARRIERS_BARGAIN: 'carriers_bargain',
    SCORCHED_SKY: 'scorched_sky',
    // Expanded families (docs/hive-swarm-camps-and-humanity-system-design.md)
    MOTHERSHIP_INFECTION: 'mothership_infection',
    ALIEN_EXODUS: 'alien_exodus',
    OUTED_ESCAPE: 'outed_escape',
    FAILED_CARRIER: 'failed_carrier',
    EMPTY_HUSK: 'empty_husk'
});

export const ACT2_ENDING_CUTSCENES = Object.freeze({
    [ACT2_ENDINGS.FULL_BROOD]: 'ending-fullbrood',
    [ACT2_ENDINGS.CLEAN_ESCAPE]: 'ending-cleanescape',
    [ACT2_ENDINGS.MIXED_CREW]: 'ending-mixedcrew',
    [ACT2_ENDINGS.CARRIERS_BARGAIN]: 'ending-carriersbargain',
    [ACT2_ENDINGS.SCORCHED_SKY]: 'ending-scorchedsky',
    [ACT2_ENDINGS.MOTHERSHIP_INFECTION]: 'ending-mothershipinfection',
    [ACT2_ENDINGS.ALIEN_EXODUS]: 'ending-alienexodus',
    [ACT2_ENDINGS.OUTED_ESCAPE]: 'ending-outedescape',
    [ACT2_ENDINGS.FAILED_CARRIER]: 'ending-failedcarrier',
    [ACT2_ENDINGS.EMPTY_HUSK]: 'ending-emptyhusk'
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
    campDiscovered: [
        'SYSTEM: SURVIVOR CAMP LOCATED. FLARE DOUSED.',
        'SYSTEM: SURVIVORS SHARE SUPPLIES — SHELLS AND O₂ RECEIVED.',
        'SYSTEM: SUPPORTED CAMPS DOUBLE AS O₂ HAVENS. INVEST SHELLS TO FORTIFY.'
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
    ],
    [ACT2_ENDINGS.MOTHERSHIP_INFECTION]: [
        'SYSTEM: MOTHERSHIP CLEARANCE ACCEPTED. SURVIVOR RESCUE FLIGHT LOGGED.',
        'SYSTEM: THREE PASSENGERS SLEEPING. VITALS CLEAN. YOURS READ CLEAN TOO.',
        'QUEEN: GO QUIETLY, CARRIER. THE BIG SHIP IS WARM, AND WE ARE PATIENT.'
    ],
    [ACT2_ENDINGS.ALIEN_EXODUS]: [
        'SYSTEM: LAUNCH COMPLETE. CARGO: THREE NON-HUMAN SIGNATURES. FRIENDLY.',
        'SYSTEM: THE QUEEN\'S SIGNAL IS SCREAMING FROM THE ICE. FADING. GONE.',
        'SYSTEM: NAHL IS SINGING SOMETHING THROUGH THE HULL. IT SOUNDS LIKE THANK YOU.'
    ],
    [ACT2_ENDINGS.OUTED_ESCAPE]: [
        'SYSTEM: LAUNCH COMPLETE. CABIN LOCKS ENGAGED FROM THE PASSENGER SIDE.',
        'SYSTEM: THE SURVIVORS KNOW. THEY BOARDED ANYWAY.',
        'SYSTEM: QUARANTINE COURSE SET. NOBODY IS SLEEPING ON THIS FLIGHT.'
    ],
    [ACT2_ENDINGS.FAILED_CARRIER]: [
        'SYSTEM: LAUNCH COMPLETE. COOLANT CELL BREACH IN COMPARTMENT FOUR.',
        'SYSTEM: THE AMBER GLOW IS FLICKERING. SOMEONE IS ASKING WHAT THAT LIGHT IS.',
        'SYSTEM: YOU HID THE FUTURE IN A COLD BOX AND THE COLD BOX IS FAILING.'
    ],
    [ACT2_ENDINGS.EMPTY_HUSK]: [
        'SYSTEM: LAUNCH COMPLETE. CREW MANIFEST: ONE.',
        'SYSTEM: THE CAMPS ARE SILENT. THE HIVES ARE SILENT. THE QUEEN IS SILENT.',
        'SYSTEM: THERE WAS SO MUCH TO CARRY. YOU CARRIED NOTHING.'
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

function normalizeCycleKey(value) {
    return typeof value === 'string' && value.trim()
        ? value.trim().slice(0, 32)
        : null;
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
        discovered: Boolean(raw?.discovered),
        status,
        suspicion,
        passengerState,
        knowsPlayerInfected: Boolean(raw?.knowsPlayerInfected),
        relayLinked: Boolean(raw?.relayLinked),
        leaderAlive: raw?.leaderAlive !== false && status !== 'culled',
        dialogueStage: clampInteger(raw?.dialogueStage, 0, ACT2_DIALOGUE_FINAL_STAGE, 0),
        stageTalks: clampInteger(raw?.stageTalks, 0, 9, 0),
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
        relayJammed: Boolean(source.relayJammed),
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
        dialogueStage: clampInteger(raw?.dialogueStage, 0, ACT2_DIALOGUE_FINAL_STAGE, 0),
        stageTalks: clampInteger(raw?.stageTalks, 0, 9, 0),
        questFlags: raw?.questFlags && typeof raw.questFlags === 'object' ? { ...raw.questFlags } : {},
        networked: Boolean(raw?.networked),
        aboard: Boolean(raw?.aboard) || status === 'aboard',
        lastHarvestCycle: normalizeCycleKey(raw?.lastHarvestCycle)
    };
}

function buildManifestFromNormalizedState(state, options = {}) {
    const humans = state.camps
        .filter((camp) => ['recruited', 'turned'].includes(camp.status))
        .map((camp) => camp.id);
    const aliens = state.hives
        .filter((hive) => hive.aboard || ['rescued', 'aboard'].includes(hive.status))
        .map((hive) => hive.id);
    const queen = state.queenStatus === 'aboard';
    const egg = state.eggsStatus === 'aboard' || state.eggsStatus === 'hidden';
    const sutureAboard = state.hives.some((hive) => hive.id === 'hive_suture' && (hive.aboard || hive.status === 'aboard'));
    const seatsUsed = 1 + humans.length + aliens.length + (queen ? 2 : 0) + (egg ? 1 : 0);
    const invalidReasons = [];
    if (seatsUsed > ACT2_MANIFEST_SEATS_MAX) {
        invalidReasons.push('seat_capacity_exceeded');
    }
    if (egg && options.eggSeatRequiresNahl && !sutureAboard) {
        invalidReasons.push('egg_requires_nahl');
    } else if (egg && !queen && !sutureAboard) {
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

export function buildAct2Manifest(rawState = {}, options = {}) {
    return buildManifestFromNormalizedState(normalizeAct2State(rawState), options);
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
// Priority order per docs/hive-swarm-camps-and-humanity-system-design.md:
// stealth infiltration > obedience > alien exodus > clean defiance > exposure
// > egg gambits > sweeps > compromise.
export function pickAct2Ending(rawState = DEFAULT_ACT2_STATE) {
    const state = normalizeAct2State(rawState);
    const manifest = state.manifest;
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

    const recruitedCamps = camps.filter((c) => c.status === 'recruited');
    const humansKnow = state.outedToHumans
        || recruitedCamps.some((c) => c.knowsPlayerInfected
            || c.passengerState === 'human_outed'
            || c.passengerState === 'human_suspicious');
    const playerLatentInfected = state.infectionStage === 'latent' || state.infectionStage === 'strained';
    const aliensAboard = manifest.aliens.length;
    const relayHive = state.hives.find((h) => h.id === 'hive_relay');
    const falseClearance = relayHive?.questFlags?.false_clearance === 'done';

    // 1. Mothership infection: the stealth-hardest path. Three unsuspecting
    // humans, a latent carrier, no visible hive presence, forged clearance.
    if (
        playerLatentInfected
        && allHumanRecruited
        && !humansKnow
        && aliensAboard === 0
        && turned === 0
        && !queenAboard
        && state.eggsStatus !== 'aboard'
        && falseClearance
    ) {
        return ACT2_ENDINGS.MOTHERSHIP_INFECTION;
    }

    // 2. Absolute obedience.
    if (queenAboard && eggsAboard && allCulled && state.queenObedience >= ACT2_MAX_OBEDIENCE) {
        return ACT2_ENDINGS.FULL_BROOD;
    }

    // 3. The alien friends over everyone: all three hive allies, no queen.
    if (aliensAboard >= ACT2_HIVE_SITES.length && queenGone) {
        return ACT2_ENDINGS.ALIEN_EXODUS;
    }

    // 4. Absolute defiance. A cured player is clean even if humans were told.
    if (queenGone && eggsDestroyed && allHumanRecruited
        && (!humansKnow || state.infectionStage === 'cured')) {
        return ACT2_ENDINGS.CLEAN_ESCAPE;
    }

    // 5. Humans board knowing what you still are: tense containment flight.
    if (queenGone && recruited > 0 && humansKnow
        && state.infectionStage !== 'cured' && !eggsAboard) {
        return ACT2_ENDINGS.OUTED_ESCAPE;
    }

    // 6. Egg gambits without the queen.
    if (queenGone && eggsAboard && anySurvivorsBoarded) {
        return state.eggsStatus === 'hidden' && manifest.invalidReasons.includes('egg_unstable')
            ? ACT2_ENDINGS.FAILED_CARRIER
            : ACT2_ENDINGS.CARRIERS_BARGAIN;
    }

    // 7. Sweeps: nobody meaningful aboard.
    if (queenGone && !eggsAboard && manifest.humans.length === 0 && aliensAboard === 0 && turned === 0) {
        return allCulled ? ACT2_ENDINGS.SCORCHED_SKY : ACT2_ENDINGS.EMPTY_HUSK;
    }

    // 8. Compromise: the queen keeps a fragile peace over a mixed cabin.
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

    // Act 1 exploration: first contact with a camp is persisted so the
    // discovery payout can never be farmed across deaths or sessions.
    discoverCamp(id) {
        return this._mutate((s) => {
            const camp = s.camps.find((c) => c.id === id);
            if (camp) camp.discovered = true;
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

    // ── Hive reducers (the alien mirror of the camps) ──

    setHivePosition(id, x, z) {
        return this._mutate((s) => {
            const hive = s.hives.find((h) => h.id === id);
            if (hive && Number.isFinite(x) && Number.isFinite(z)) {
                hive.x = x;
                hive.z = z;
            }
        });
    }

    // Act 1 extraction: each pull yields resources in-world but wounds the
    // being inside. Level 3 leaves the hive starting Act 2 wounded, and every
    // level costs the bond you could have had.
    mineHive(id, { harvestCycle = null } = {}) {
        return this._mutate((s) => {
            const hive = s.hives.find((h) => h.id === id);
            if (!hive || hive.extractionLevel >= 3) return;
            if (!['dormant', 'mined', 'wounded', 'awakened'].includes(hive.status)) return;
            const cycleKey = normalizeCycleKey(harvestCycle);
            if (cycleKey && hive.lastHarvestCycle === cycleKey) return;
            hive.extractionLevel += 1;
            hive.bond = Math.max(0, hive.bond - 1);
            hive.status = hive.extractionLevel >= 3 ? 'wounded' : 'mined';
            if (cycleKey) hive.lastHarvestCycle = cycleKey;
        });
    }

    adjustHiveBond(id, delta = 0) {
        return this._mutate((s) => {
            const hive = s.hives.find((h) => h.id === id);
            if (!hive) return;
            hive.bond = clampInteger(hive.bond + Math.round(Number(delta) || 0), 0, ACT2_MAX_BOND, hive.bond);
            if (hive.bond >= ACT2_HIVE_RESCUE_BOND_THRESHOLD
                && ['dormant', 'mined', 'wounded'].includes(hive.status)) {
                hive.status = 'bonded';
            }
        });
    }

    // Giving resources back heals extraction wounds.
    healHiveExtraction(id, amount = 1) {
        return this._mutate((s) => {
            const hive = s.hives.find((h) => h.id === id);
            if (!hive || ['slain', 'queen_consumed', 'expired_by_cure'].includes(hive.status)) return;
            hive.extractionLevel = clampInteger(hive.extractionLevel - Math.max(0, Math.round(amount)), 0, 3, hive.extractionLevel);
            if (hive.status === 'wounded' && hive.extractionLevel < 3) hive.status = 'mined';
            if (hive.status === 'mined' && hive.extractionLevel === 0) hive.status = 'dormant';
        });
    }

    completeHiveQuest(id, questId, bondDelta = 1) {
        return this._mutate((s) => {
            const hive = s.hives.find((h) => h.id === id);
            if (!hive || !questId || hive.questFlags[questId] === 'done') return;
            hive.questFlags[questId] = 'done';
            hive.bond = clampInteger(hive.bond + Math.max(0, Math.round(bondDelta)), 0, ACT2_MAX_BOND, hive.bond);
            if (hive.bond >= ACT2_HIVE_RESCUE_BOND_THRESHOLD
                && ['dormant', 'mined', 'wounded', 'awakened'].includes(hive.status)) {
                hive.status = 'bonded';
            }
        });
    }

    // Take the ally aboard. Needs earned trust; defies the queen's monopoly.
    rescueHive(id) {
        return this._mutate((s) => {
            const hive = s.hives.find((h) => h.id === id);
            if (!hive) return;
            if (hive.bond < ACT2_HIVE_RESCUE_BOND_THRESHOLD) return;
            if (!['bonded', 'awakened', 'mined', 'dormant', 'wounded'].includes(hive.status)) return;
            hive.status = 'rescued';
            hive.aboard = true;
            s.queenObedience = Math.max(-ACT2_MAX_OBEDIENCE, (s.queenObedience ?? 0) - 1);
        });
    }

    abandonHive(id) {
        return this._mutate((s) => {
            const hive = s.hives.find((h) => h.id === id);
            if (!hive || ['slain', 'queen_consumed', 'expired_by_cure'].includes(hive.status)) return;
            hive.status = 'abandoned';
            hive.aboard = false;
        });
    }

    // Feed the ally to the queen. She approves. Nahl/Vey/Rhun do not.
    sacrificeHive(id) {
        return this._mutate((s) => {
            const hive = s.hives.find((h) => h.id === id);
            if (!hive || ['slain', 'queen_consumed', 'expired_by_cure', 'rescued', 'aboard'].includes(hive.status)) return;
            hive.status = 'queen_consumed';
            hive.aboard = false;
            s.queenObedience = Math.min(ACT2_MAX_OBEDIENCE, (s.queenObedience ?? 0) + 1);
        });
    }

    // Strip a hive for parts in Act 2: kills the being inside.
    harvestHive(id) {
        return this._mutate((s) => {
            const hive = s.hives.find((h) => h.id === id);
            if (!hive || ['slain', 'queen_consumed', 'expired_by_cure', 'rescued', 'aboard'].includes(hive.status)) return;
            hive.status = 'slain';
            hive.aboard = false;
            s.queenObedience = Math.min(ACT2_MAX_OBEDIENCE, (s.queenObedience ?? 0) + 1);
        });
    }

    setHiveNetworked(id, networked = true) {
        return this._mutate((s) => {
            const hive = s.hives.find((h) => h.id === id);
            if (!hive) return;
            hive.networked = Boolean(networked);
            s.networks.hiveSynapseOnline = s.hives.every((h) => h.networked
                || ['slain', 'queen_consumed', 'expired_by_cure'].includes(h.status));
        });
    }

    // ── Network reducers ──

    setNetworkFlag(flag, online = true) {
        return this._mutate((s) => {
            if (['humanRelayOnline', 'relayJammed', 'hiveSynapseOnline', 'bridgeOnline'].includes(flag)) {
                s.networks[flag] = Boolean(online);
            }
        });
    }

    markCampRelayLinked(id, linked = true) {
        return this._mutate((s) => {
            const camp = s.camps.find((c) => c.id === id);
            if (camp) camp.relayLinked = Boolean(linked);
        });
    }

    // Outing propagation rule: exposure at one camp spreads across the human
    // relay unless it is offline or jammed.
    propagateOuting(campId) {
        return this._mutate((s) => {
            const origin = s.camps.find((c) => c.id === campId);
            if (!origin) return;
            origin.knowsPlayerInfected = true;
            origin.suspicion = 100;
            s.suspicion[origin.id] = 100;
            s.outedToHumans = true;
            if (!['cured', 'ascendant'].includes(s.infectionStage)) s.infectionStage = 'outed';
            if (!s.networks.knownByCamps.includes(origin.id)) s.networks.knownByCamps.push(origin.id);

            if (s.networks.humanRelayOnline && !s.networks.relayJammed) {
                for (const camp of s.camps) {
                    if (camp.id === origin.id || !camp.relayLinked || !origin.relayLinked) continue;
                    camp.knowsPlayerInfected = true;
                    camp.suspicion = Math.max(camp.suspicion, 80);
                    s.suspicion[camp.id] = camp.suspicion;
                    if (!s.networks.knownByCamps.includes(camp.id)) s.networks.knownByCamps.push(camp.id);
                }
            }
        });
    }

    // ── Infection reducers ──

    adjustInfectionLoad(delta = 0) {
        return this._mutate((s) => {
            if (['cured', 'ascendant'].includes(s.infectionStage)) return;
            s.infectionLoad = clampInteger(s.infectionLoad + Math.round(Number(delta) || 0), 0, 100, s.infectionLoad);
            s.humanity = clampInteger(100 - s.infectionLoad, 0, 100, s.humanity);
            if (s.humanity <= 0) s.infectionStage = 'outed';
            else if (s.humanity <= 50) s.infectionStage = 'symptomatic';
            else if (s.humanity <= 75) s.infectionStage = 'strained';
            else s.infectionStage = 'latent';
        });
    }

    // The cure: powerful and costly. The queen link must already be broken,
    // and every alien ally you didn't independently secure dies with it.
    uninfectSelf() {
        return this._mutate((s) => {
            if (s.queenStatus === 'aboard') return;
            if (['cured'].includes(s.infectionStage)) return;
            s.infectionStage = 'cured';
            s.humanity = 100;
            s.infectionLoad = 0;
            s.coverIntegrity = 100;
            for (const hive of s.hives) {
                if (!['rescued', 'aboard', 'bonded'].includes(hive.status)) {
                    hive.status = 'expired_by_cure';
                    hive.aboard = false;
                }
            }
        });
    }

    // Quietly seed a trusted camp: they board believing they are clean.
    latentInfectCamp(id) {
        return this._mutate((s) => {
            const camp = s.camps.find((c) => c.id === id);
            if (!camp || camp.status !== 'alive') return;
            if (camp.bond < ACT2_RECRUIT_BOND_THRESHOLD || camp.suspicion >= 50) return;
            const suture = s.hives.find((h) => h.id === 'hive_suture');
            if (suture?.questFlags?.host_mercy !== 'done') return;
            camp.status = 'recruited';
            camp.passengerState = 'latent_infected';
            s.queenObedience = Math.min(ACT2_MAX_OBEDIENCE, (s.queenObedience ?? 0) + 1);
        });
    }

    // Tell them the truth before they board. Safer ethically; kills the
    // infiltration path.
    warnCamp(id) {
        return this._mutate((s) => {
            const camp = s.camps.find((c) => c.id === id);
            if (!camp || camp.status !== 'alive') return;
            if (camp.bond < 2) return;
            camp.status = 'recruited';
            camp.passengerState = 'human_suspicious';
            camp.knowsPlayerInfected = true;
            if (!s.networks.knownByCamps.includes(camp.id)) s.networks.knownByCamps.push(camp.id);
            s.queenObedience = Math.max(-ACT2_MAX_OBEDIENCE, (s.queenObedience ?? 0) - 1);
        });
    }

    // ── Leader dialogue ladders (Elden Ring grammar) ──

    _findSpeaker(s, kind, id) {
        return kind === 'hive'
            ? s.hives.find((h) => h.id === id)
            : s.camps.find((c) => c.id === id);
    }

    recordDialogueTalk(kind, id) {
        return this._mutate((s) => {
            const who = this._findSpeaker(s, kind, id);
            if (who) who.stageTalks = clampInteger(who.stageTalks + 1, 0, 9, who.stageTalks);
        });
    }

    advanceDialogueStage(kind, id) {
        return this._mutate((s) => {
            const who = this._findSpeaker(s, kind, id);
            if (!who || who.dialogueStage >= ACT2_DIALOGUE_FINAL_STAGE) return;
            who.dialogueStage += 1;
            who.stageTalks = 1; // the advance visit plays the new stage's first beat
        });
    }

    countCampFinalsDone() {
        return this.getState().camps.filter((c) => c.questFlags?.final_vigil === 'done').length;
    }

    // The human final: only available once you have turned. Resist the
    // queen's pull quietly (humanity cost that escalates per final), or defy
    // her openly (obedience hit, and the camp learns what you are).
    completeCampFinal(id, { mode = 'urge' } = {}) {
        return this._mutate((s) => {
            const camp = s.camps.find((c) => c.id === id);
            if (!camp || camp.status !== 'alive' || !s.begun) return;
            if (camp.dialogueStage < ACT2_DIALOGUE_FINAL_STAGE) return;
            if (camp.questFlags.final_vigil === 'done') return;
            const finalsDone = s.camps.filter((c) => c.questFlags?.final_vigil === 'done').length;

            if (mode === 'urge') {
                const cost = campFinalUrgeCost(finalsDone);
                if (s.humanity <= cost) return; // the urge is too strong
                s.humanity = clampInteger(s.humanity - cost, 0, 100, s.humanity);
                s.infectionLoad = clampInteger(100 - s.humanity, 0, 100, s.infectionLoad);
                if (s.humanity <= 50) s.infectionStage = 'symptomatic';
                else if (s.humanity <= 75) s.infectionStage = 'strained';
            } else {
                s.queenObedience = Math.max(-ACT2_MAX_OBEDIENCE, (s.queenObedience ?? 0) - (1 + finalsDone));
                camp.knowsPlayerInfected = true;
                if (!s.networks.knownByCamps.includes(camp.id)) s.networks.knownByCamps.push(camp.id);
            }

            camp.questFlags.final_vigil = 'done';
            camp.bond = ACT2_MAX_BOND;
        });
    }

    // The hive final: their rite completes and they are fully yours.
    completeHiveFinal(id) {
        return this._mutate((s) => {
            const hive = s.hives.find((h) => h.id === id);
            if (!hive || !s.begun) return;
            if (hive.dialogueStage < ACT2_DIALOGUE_FINAL_STAGE) return;
            if (['slain', 'queen_consumed', 'expired_by_cure', 'abandoned'].includes(hive.status)) return;
            const riteByHive = {
                hive_suture: 'host_mercy',
                hive_relay: 'false_clearance',
                hive_carapace: 'guard_oath'
            };
            const rite = riteByHive[hive.id];
            if (rite) hive.questFlags[rite] = 'done';
            hive.bond = ACT2_MAX_BOND;
            if (!['rescued', 'aboard'].includes(hive.status)) hive.status = 'bonded';
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
