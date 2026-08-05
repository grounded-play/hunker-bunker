const DEFAULT_DURATION_MS = 3600;
const DEFAULT_FRAME_MS = 1700;

export const DEATH_CINEMATICS = Object.freeze({
    oxygen: Object.freeze({
        kicker: 'SUIT TELEMETRY // SIGNAL LOST',
        title: 'NO AIR LEFT TO BARGAIN WITH',
        body: 'The scrubbers fall silent. Your black box keeps listening.',
        images: Object.freeze(['/cutscenes/poster-art/death-oxygen.png'])
    }),
    o2: Object.freeze({
        kicker: 'SUIT TELEMETRY // SIGNAL LOST',
        title: 'NO AIR LEFT TO BARGAIN WITH',
        body: 'The scrubbers fall silent. Your black box keeps listening.',
        images: Object.freeze(['/cutscenes/poster-art/death-oxygen.png'])
    }),
    abyss: Object.freeze({
        kicker: 'DEPTH CONTROL // CONTACT LOST',
        title: 'THE BUNKER HAS NO BOTTOM',
        body: 'Your lamp vanishes first. The impact never reaches the radio.',
        images: Object.freeze(['/cutscenes/poster-art/death-abyss.png'])
    }),
    crawler: Object.freeze({
        kicker: 'MOTION ALERT // TOO CLOSE',
        title: 'SOMETHING LEARNED YOUR RHYTHM',
        body: 'The corridor goes still. A second set of footsteps does not.',
        images: Object.freeze(['/cutscenes/poster-art/death-crawler.png'])
    }),
    queen: Object.freeze({
        kicker: 'SECTOR ZERO // CARRIER DOWN',
        title: 'THE QUEEN REMEMBERS',
        body: 'Your signal joins the voices beneath the ice.',
        images: Object.freeze(['/cutscenes/poster-art/death-queen.png'])
    }),
    ship: Object.freeze({
        kicker: 'HULL TELEMETRY // CASCADE FAILURE',
        title: 'THE WRECK DIES A SECOND TIME',
        body: 'The bunker outlasts another attempt to leave it.',
        images: Object.freeze(['/cutscenes/poster-art/death-ship.png'])
    }),
    biohazard: Object.freeze({
        kicker: 'SUIT MEDICAL // SYSTEMIC FAILURE',
        title: 'THE ICE GOT INSIDE',
        body: 'Filters close. The black box records what kept moving.',
        images: Object.freeze(['/cutscenes/poster-art/death-biohazard.png'])
    }),
    combat: Object.freeze({
        kicker: 'COMBAT TELEMETRY // OPERATOR DOWN',
        title: 'THE CORRIDOR GOES QUIET',
        body: 'Your weapon cools. Something else crosses the extraction route.',
        images: Object.freeze(['/cutscenes/poster-art/death-combat.png'])
    }),
    'mission-abort': Object.freeze({
        kicker: 'MISSION CONTROL // MANUAL ABORT',
        title: 'THE ICE KEEPS WHAT YOU LEFT',
        body: 'The run ends here. Banked knowledge survives the retreat.',
        images: Object.freeze(['/cutscenes/poster-art/death-mission-abort.png'])
    }),
    hazard: Object.freeze({
        kicker: 'CONTRACTOR SIGNAL // TERMINATED',
        title: 'ANOTHER BLACK BOX IN THE DARK',
        body: 'The bunker records the last thing your suit understood.',
        images: Object.freeze(['/cutscenes/poster-art/death-hazard.png'])
    })
});

export const EVENT_CINEMATICS = Object.freeze({
    foundry_discovered: Object.freeze({
        kicker: 'BUNKER SYSTEM // INDUSTRIAL HEART',
        title: 'THE FOUNDRY IS STILL WARM',
        body: 'Old machinery wakes beneath the ice. Every useful thing asks for fuel.',
        images: Object.freeze(['/cutscenes/poster-art/event-foundry-discovered.png'])
    }),
    black_box_recovered: Object.freeze({
        kicker: 'RECOVERY DECK // LAST SIGNAL',
        title: 'SOMEONE ELSE MADE IT THIS FAR',
        body: 'Their run is over. Their route, warning, and salvage are yours now.',
        images: Object.freeze(['/cutscenes/poster-art/event-black-box-recovered.png'])
    }),
    cave_revealed: Object.freeze({
        kicker: 'SECTOR ZERO // GEOLOGY MISMATCH',
        title: 'THE WALL WAS BUILT AROUND A MOUTH',
        body: 'Warm air moves upward. Something below has been waiting for circulation.',
        images: Object.freeze(['/cutscenes/poster-art/event-cave-revealed-1.png', '/cutscenes/poster-art/event-cave-revealed-2.png'])
    }),
    queen_encounter: Object.freeze({
        kicker: 'UNKNOWN SIGNAL // SOURCE CONFIRMED',
        title: 'THE QUEEN OPENS HER EYES',
        body: 'The voice under Sector Zero no longer needs the radio.',
        images: Object.freeze(['/cutscenes/poster-art/event-queen-encounter.png'])
    }),
    o2_generator_upgraded: Object.freeze({
        kicker: 'BUNKER SYSTEM // LIFE SUPPORT',
        title: 'THE AIR HOLDS A LITTLE LONGER',
        body: 'Oxygen reclamation comes back online. The safe bubble widens around what you rebuilt.',
        images: Object.freeze(['/cutscenes/poster-art/event-o2-generator-upgraded.png'])
    }),
    boss_encounter_cryosnail: Object.freeze({
        kicker: 'PERIMETER BREACH // HOSTILE SIGNATURE',
        title: 'THE ICE SENDS SOMETHING BACK',
        body: 'A cryosnail-class hostile converges on your position.',
        images: Object.freeze(['/cutscenes/poster-art/event-boss-cryosnail.png'])
    }),
    boss_encounter_cybersnail: Object.freeze({
        kicker: 'PERIMETER BREACH // HOSTILE SIGNATURE',
        title: 'THE GRID ANSWERS WITH TEETH',
        body: 'A cybersnail-class hostile converges on your position.',
        images: Object.freeze(['/cutscenes/poster-art/event-boss-cybersnail.png'])
    }),
    boss_encounter_sporesnail: Object.freeze({
        kicker: 'PERIMETER BREACH // HOSTILE SIGNATURE',
        title: 'THE BLOOM LEARNED TO HUNT',
        body: 'A sporesnail-class hostile converges on your position.',
        images: Object.freeze(['/cutscenes/poster-art/event-boss-sporesnail.png'])
    })
});

function cleanString(value, fallback = '') {
    const text = typeof value === 'string' ? value.trim() : '';
    return text || fallback;
}

function cleanImages(images = []) {
    return [...new Set(
        (Array.isArray(images) ? images : [images])
            .filter((src) => typeof src === 'string' && src.trim())
            .map((src) => src.trim())
    )].slice(0, 2);
}

export function normalizeCinematicStillSpec(spec = {}) {
    const images = cleanImages(spec.images ?? [spec.firstImage, spec.lastImage]);
    return Object.freeze({
        id: cleanString(spec.id, 'cinematic-event'),
        kicker: cleanString(spec.kicker, 'BUNKER ARCHIVE // EVENT'),
        title: cleanString(spec.title, 'SIGNAL RECOVERED'),
        body: cleanString(spec.body),
        images: Object.freeze(images),
        durationMs: Math.max(1200, Number(spec.durationMs) || DEFAULT_DURATION_MS),
        frameMs: Math.max(600, Number(spec.frameMs) || DEFAULT_FRAME_MS),
        allowSkip: spec.allowSkip !== false,
        fit: spec.fit === 'cover' ? 'cover' : 'contain',
        tone: cleanString(spec.tone, 'neutral')
    });
}

export function getDeathCinematicSpec(reason = 'hazard') {
    const rawKey = cleanString(reason, 'hazard').toLowerCase();
    let key = rawKey;
    if (rawKey.includes('o2') || rawKey.includes('oxygen')) key = 'oxygen';
    else if (rawKey.includes('queen')) key = 'queen';
    else if (rawKey.includes('ship')) key = 'ship';
    else if (rawKey.includes('poison') || rawKey.includes('spore') || rawKey.includes('bio')) key = 'biohazard';
    else if (
        rawKey.includes('projectile')
        || rawKey.includes('turret')
        || rawKey.includes('slam')
        || rawKey.includes('shockwave')
        || rawKey.includes('frost')
    ) key = 'combat';
    const resolvedKey = DEATH_CINEMATICS[key] ? key : 'hazard';
    const base = DEATH_CINEMATICS[resolvedKey];
    return normalizeCinematicStillSpec({
        ...base,
        id: `death-${resolvedKey}`,
        tone: 'death'
    });
}

export function getEventCinematicSpec(eventId) {
    const id = cleanString(eventId).toLowerCase();
    const base = EVENT_CINEMATICS[id];
    if (!base) return null;
    return normalizeCinematicStillSpec({
        ...base,
        id: `event-${id}`,
        tone: 'event'
    });
}

export function shouldPlayAuthoredEventCinematic({
    appPhase,
    revealMode = 'animated',
    source = ''
} = {}) {
    if (appPhase !== 'gameplay') return false;
    if (revealMode === 'instant') return false;
    return !String(source).includes('state-restore');
}
