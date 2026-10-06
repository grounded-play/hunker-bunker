// Room envelopes are local room bounds including the outer wall. They do not
// alter CHUNK_SIZE. Motif rectangles are normalized into the available interior.

export const INDUSTRIAL_ROOM_PROFILE = Object.freeze({
    id: 'industrial',
    tiers: Object.freeze({
        standard: Object.freeze([[19, 15], [21, 17], [23, 19]].map(Object.freeze)),
        major: Object.freeze([[27, 19], [29, 23], [31, 25]].map(Object.freeze))
    }),
    motifs: Object.freeze([
        Object.freeze({ id: 'machine-island', blocks: Object.freeze([
            Object.freeze({ role: 'exchanger', x: 0.35, y: 0.3, w: 0.3, h: 0.4 })
        ]) }),
        Object.freeze({ id: 'paired-work-bays', blocks: Object.freeze([
            Object.freeze({ role: 'repair-bay', x: 0.28, y: 0.25, w: 0.16, h: 0.45 }),
            Object.freeze({ role: 'supply-bay', x: 0.64, y: 0.35, w: 0.13, h: 0.3 })
        ]) }),
        Object.freeze({ id: 'offset-service-spine', blocks: Object.freeze([
            Object.freeze({ role: 'service-spine', x: 0.25, y: 0.35, w: 0.5, h: 0.14 }),
            Object.freeze({ role: 'tool-store', x: 0.6, y: 0.64, w: 0.15, h: 0.14 })
        ]) })
    ])
});

export const CRYO_MEDICAL_ROOM_PROFILE = Object.freeze({
    id: 'cryo-medical',
    tiers: Object.freeze({
        standard: Object.freeze([[19, 15], [21, 17], [23, 19]].map(Object.freeze)),
        major: Object.freeze([[27, 19], [29, 23], [31, 25]].map(Object.freeze))
    }),
    motifs: Object.freeze([
        Object.freeze({ id: 'quarantine-triage-ward', blocks: Object.freeze([
            Object.freeze({ role: 'triage-bay', x: 0.24, y: 0.28, w: 0.18, h: 0.44 }),
            Object.freeze({ role: 'quarantine-cells', x: 0.58, y: 0.28, w: 0.18, h: 0.44 })
        ]) }),
        Object.freeze({ id: 'central-autopsy-theater', blocks: Object.freeze([
            Object.freeze({ role: 'autopsy-theater', x: 0.36, y: 0.30, w: 0.28, h: 0.40 })
        ]) }),
        Object.freeze({ id: 'stasis-cryo-vault', blocks: Object.freeze([
            Object.freeze({ role: 'stasis-bank-west', x: 0.25, y: 0.32, w: 0.16, h: 0.36 }),
            Object.freeze({ role: 'stasis-bank-east', x: 0.59, y: 0.32, w: 0.16, h: 0.36 })
        ]) })
    ])
});

export const BIOMECH_ROOM_PROFILE = Object.freeze({
    id: 'biomech',
    tiers: Object.freeze({
        standard: Object.freeze([[19, 15], [21, 17], [23, 19]].map(Object.freeze)),
        major: Object.freeze([[27, 19], [29, 23], [31, 25]].map(Object.freeze))
    }),
    motifs: Object.freeze([
        Object.freeze({ id: 'incubation-cyst-nave', blocks: Object.freeze([
            Object.freeze({ role: 'incubation-cysts', x: 0.34, y: 0.28, w: 0.32, h: 0.44 })
        ]) }),
        Object.freeze({ id: 'tracheal-peristaltic-junction', blocks: Object.freeze([
            Object.freeze({ role: 'tracheal-artery', x: 0.26, y: 0.38, w: 0.48, h: 0.18 }),
            Object.freeze({ role: 'sphincter-vent', x: 0.42, y: 0.20, w: 0.16, h: 0.14 })
        ]) }),
        Object.freeze({ id: 'biomech-spore-cathedral', blocks: Object.freeze([
            Object.freeze({ role: 'spore-organ', x: 0.35, y: 0.22, w: 0.30, h: 0.24 }),
            Object.freeze({ role: 'umbilical-hive', x: 0.38, y: 0.54, w: 0.24, h: 0.20 })
        ]) })
    ])
});

export const ROOM_GRAMMAR_PROFILES = Object.freeze({
    industrial: INDUSTRIAL_ROOM_PROFILE,
    'cryo-medical': CRYO_MEDICAL_ROOM_PROFILE,
    medical: CRYO_MEDICAL_ROOM_PROFILE,
    biomech: BIOMECH_ROOM_PROFILE
});

export function getRoomGrammarProfile(areaId = 'industrial') {
    return ROOM_GRAMMAR_PROFILES[areaId] ?? INDUSTRIAL_ROOM_PROFILE;
}
