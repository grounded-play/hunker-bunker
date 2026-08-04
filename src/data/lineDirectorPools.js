// Tagged line pools consumed by src/lineDirector.js. Content is migrated
// (not moved) from src/data/dialogueLines.js's `director` pools and
// main.js's Mothership Reactive `lines` object — see
// docs/superpowers/specs/2026-08-02-line-director-overhaul-design.md.

export const DIRECTOR_AMBIENT_LINES = Object.freeze([
    // corporate
    { id: 'director_welcome_committee', register: 'corporate', text: 'Movement logged. Facilities has dispatched a welcome committee to your position.', tags: { eventTrigger: null, directorActions: ['patrol'], cooldownClass: 'director_ambient', minRepeatSeconds: 90 } },
    { id: 'director_pillar_lighting', register: 'corporate', text: 'Unauthorized exploration detected. Local lighting has been suspended.', tags: { eventTrigger: null, directorActions: ['lightsout'], depthTier: { min: 1 }, cooldownClass: 'director_ambient', minRepeatSeconds: 90 } },
    { id: 'director_curiosity_clearance', register: 'corporate', text: 'Your curiosity continues to exceed your clearance.', tags: { eventTrigger: null, directorActions: ['taunt'], depthTier: { min: 1 }, cooldownClass: 'director_ambient', minRepeatSeconds: 90 } },
    { id: 'director_power_rerouted', register: 'corporate', text: 'Local illumination power has been rerouted.', tags: { eventTrigger: null, directorActions: ['lightsout'], cooldownClass: 'director_ambient', minRepeatSeconds: 90 } },
    { id: 'director_depth_disapproval', register: 'corporate', text: 'The structure notes your depth and disapproves.', tags: { eventTrigger: null, directorActions: ['taunt'], depthTier: { min: 2 }, cooldownClass: 'director_ambient', minRepeatSeconds: 90 } },
    { id: 'director_column_field', register: 'corporate', text: 'Navigation telemetry is no longer considered authoritative.', tags: { eventTrigger: null, directorActions: ['corrupt'], cooldownClass: 'director_ambient', minRepeatSeconds: 90 } },
    { id: 'director_productivity', register: 'corporate', text: 'Productivity is being monitored. So are your vital signs.', tags: { eventTrigger: null, directorActions: ['taunt'], cooldownClass: 'director_ambient', minRepeatSeconds: 90 } },
    { id: 'director_maintenance_event', register: 'corporate', text: 'A hostile maintenance team is converging on your location.', tags: { eventTrigger: null, directorActions: ['patrol'], cooldownClass: 'director_ambient', minRepeatSeconds: 90 } },

    // glitched
    { id: 'director_glitch_curiosity', register: 'glitched', text: 'DE-DETECTION... unauthorized cur-curiosity remains logged.', tags: { eventTrigger: null, directorActions: ['taunt'], cooldownClass: 'director_ambient', minRepeatSeconds: 90 } },
    { id: 'director_glitch_breaker', register: 'glitched', text: 'WARNING: Sector breaker opened. Lights are... gone.', tags: { eventTrigger: null, directorActions: ['lightsout'], cooldownClass: 'director_ambient', minRepeatSeconds: 90 } },
    { id: 'director_glitch_containment', register: 'glitched', text: 'Department of containment reports... zero surviving staff.', tags: { eventTrigger: null, directorActions: ['taunt'], cooldownClass: 'director_ambient', minRepeatSeconds: 90 } },
    { id: 'director_glitch_navigation', register: 'glitched', text: 'NAV-NAVIGATION checksum failed. Compass output corrupted.', tags: { eventTrigger: null, directorActions: ['corrupt'], cooldownClass: 'director_ambient', minRepeatSeconds: 90 } },
    { id: 'director_glitch_remembers', register: 'glitched', text: 'SYSTEM: Movement signatures converging. The structure... remembers you.', tags: { eventTrigger: null, directorActions: ['patrol'], depthTier: { min: 2 }, cooldownClass: 'director_ambient', minRepeatSeconds: 90 } },

    // reverent
    { id: 'director_reverent_ghost', register: 'reverent', text: 'The Director is a ghost in a machine. The Queen hears every step.', tags: { eventTrigger: null, directorActions: ['taunt'], cooldownClass: 'director_ambient', minRepeatSeconds: 90 } },
    { id: 'director_reverent_column', register: 'reverent', text: 'The column turns your compass away from the sky.', tags: { eventTrigger: null, directorActions: ['corrupt'], cooldownClass: 'director_ambient', minRepeatSeconds: 90 } },
    { id: 'director_reverent_darkness', register: 'reverent', text: 'The lights are gone. The dark is where the chitin grows.', tags: { eventTrigger: null, directorActions: ['lightsout'], cooldownClass: 'director_ambient', minRepeatSeconds: 90 } },
    { id: 'director_reverent_descent', register: 'reverent', text: 'The structure sends its children to welcome your descent.', tags: { eventTrigger: null, directorActions: ['patrol'], depthTier: { min: 2 }, cooldownClass: 'director_ambient', minRepeatSeconds: 90 } }
]);

const MOTHERSHIP_CRITICAL_IDS = new Set(['mothership_hp_critical', 'mothership_objective_found', 'mothership_first_boss']);

function mothershipLine(id, trigger, text) {
    return {
        id,
        text: `> MOTHERSHIP: ${text}`,
        tags: {
            eventTrigger: `mothership:${trigger}`,
            cooldownClass: 'mothership_reactive',
            cooldownSeconds: 45,
            bypassSharedCooldown: MOTHERSHIP_CRITICAL_IDS.has(id),
            once: true
        }
    };
}

export const MOTHERSHIP_REACTIVE_LINES = Object.freeze([
    mothershipLine('mothership_first_kill', 'first_kill', 'AGENT — FIRST THREAT NEUTRALIZED. PROCEED.'),
    mothershipLine('mothership_first_cryo', 'first_cryo', 'WARNING: CRYO SECTOR BOUNDARY CROSSED. THERMAL PROTOCOL ACTIVE.'),
    mothershipLine('mothership_first_bio', 'first_bio', 'ALERT: BIO-CONTAINMENT ZONE ENTERED. SUIT FILTERS AT LIMIT.'),
    mothershipLine('mothership_hp_critical', 'hp_critical', 'DISTRESS SIGNAL: VITAL SIGNS CRITICAL. EXTRACTION WINDOW OPEN EARLY.'),
    mothershipLine('mothership_objective_found', 'objective_found', 'UPLINK: OBJECTIVE CONFIRMED. MAX SHIP SYSTEMS REQUIRED FOR EXTRACTION.'),
    mothershipLine('mothership_first_deposit', 'first_deposit', 'SALVAGE RECEIVED. BANK SECURE. CONTINUE OPERATIONS.'),
    mothershipLine('mothership_lore_found', 'lore_found', 'AGENT — BUNKER DATA FRAGMENT RECOVERED. TRANSMITTING TO ARCHIVE.'),
    mothershipLine('mothership_sentinel_spotted', 'sentinel_spotted', 'WARNING: AUTOMATED DEFENSE SYSTEM ACTIVE. RECOMMEND COVER.'),
    mothershipLine('mothership_crawler_detected', 'crawler_detected', 'ALERT: FAST-MOVING BIO-ENTITY DETECTED. MAINTAIN DISTANCE.'),
    mothershipLine('mothership_armory_found', 'armory_found', 'UPLINK: ARMORY CACHE LOCATED. HIGH-VALUE ASSET — EXPECT RESISTANCE.'),
    mothershipLine('mothership_the_nest', 'the_nest', 'WARNING: BIO-ENTITY NEST CONFIRMED. MAXIMUM THREAT DENSITY. CAUTION.'),
    mothershipLine('mothership_weapon_calibrated', 'weapon_calibrated', 'NOTED: AGENT WEAPON OUTPUT RISING. ... WHY DO YOU NEED MORE.'),
    mothershipLine('mothership_first_boss', 'first_boss', 'CONFIRMED KILL: APEX BIO-ENTITY DOWN. THE SIGNAL FELT THAT.'),
    mothershipLine('mothership_specimen_notices', 'specimen_notices', '[UNAUTHORIZED CHANNEL] ...0047 HAS STOPPED BUILDING. IT IS LISTENING TO YOU NOW.')
]);
