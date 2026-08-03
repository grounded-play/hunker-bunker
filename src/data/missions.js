// ── Mission briefings (data) ──────────────────────────────────
// doc 11 §2 (mission variety) + §3.4 (content pipeline). The run lifecycle
// already supports the retrieval / survey / elimination mission TYPES; this
// catalog just adds label variety per type so deploys read differently, voiced
// in the bunker's procurement-bureaucracy register. Targets/types stay in the
// game logic — this is purely the briefing text.

export const MISSION_BRIEFINGS = Object.freeze({
    retrieval: Object.freeze([
        'RETRIEVE: PRIORITY TECH CACHE',
        'RETRIEVE: HIGH-VALUE TECH ASSET',
        'RECOVER: SEALED PROCUREMENT CRATE',
        'RECLAIM: BONDED SALVAGE LOCKER',
        'EXTRACT: MISFILED HARDWARE REQUISITION'
    ]),
    survey: Object.freeze([
        'SURVEY: CRYO SECTOR BOUNDARY',
        'SURVEY: DEEP SECTOR RECON',
        'MAP: UNLOGGED PILLAR NETWORK',
        'CHART: STRUCTURAL DRIFT ZONE',
        'AUDIT: SUPPORTS PENDING DEMOLITION'
    ]),
    elimination: Object.freeze([
        'ELIMINATE: BIO-ENTITY CLUSTER',
        'PURGE: HOSTILE PATROL NEST',
        'CULL: REACTIVATED LIVESTOCK',
        'CLEAR: INFESTED MAINTENANCE BAY',
        'DECOMMISSION: NON-COMPLIANT FAUNA'
    ]),
    caveSignal: Object.freeze([
        'OBJECTIVE: INVESTIGATE CAVE SIGNAL',
        'INVESTIGATE: UNAUTHORIZED SUBTERRANEAN CAVITY',
        'RECOVER: SIGNAL SOURCE SAMPLE'
    ]),
    mapping: Object.freeze([
        'MAPPING: CHART CORRIDOR SECTOR PATHS',
        'CARTOGRAPHY: SCAN ROUTE TO RELAY WAYPOINT',
        'SURVEY NETWORK: MAP SCANNED PATHWAY TO OBJECTIVE',
        'CHARTING: ESTABLISH CONTINUOUS SCAN CORRIDOR'
    ])
});

export function pickMissionBriefing(type, random = Math.random) {
    const pool = MISSION_BRIEFINGS[type];
    if (!pool?.length) return null;
    return pool[Math.max(0, Math.min(pool.length - 1, Math.floor(random() * pool.length)))];
}
