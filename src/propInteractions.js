/**
 * Prop Interaction & Destruction Mechanics Engine
 * "Help, Hurt, Give, Take" System for Sprint 49 Biomechanical & Corpospace Cathedral Props
 */

import { applyChitinVulnerability, STATUS_DEFAULTS } from './statusEffects.js';
import { resolveInteractionVignettePreset } from './interactionVignette.js';
import { WORLD_EXPANSION_80_SPECS } from './data/worldExpansion80.js';

export const BIOMECH_SYNERGY_TUNING = Object.freeze({
    cryoStunRadius: 5.0,
    cryoStunSeconds: 4.0,
    bileRadius: 3.5,
    bileVulnerabilitySeconds: STATUS_DEFAULTS.chitinVulnerabilityDuration,
    bileDamageMultiplier: STATUS_DEFAULTS.chitinDamageMultiplier
});

export const BILE_ARMOR_WEAKEN = Object.freeze({
    multiplier: BIOMECH_SYNERGY_TUNING.bileDamageMultiplier,
    duration: BIOMECH_SYNERGY_TUNING.bileVulnerabilitySeconds
});

function targetPosition(target) {
    return target?.position ?? target;
}

function livingEnemyTargets(game) {
    if (Array.isArray(game?.snails)) return game.snails.filter((target) => target?.isAlive !== false);
    return (game?.scatterSprites ?? []).filter((target) => {
        const data = target?.userData;
        return data && !data.burstTriggered && (data.hp ?? 1) > 0 && game.isEnemyType?.(data.type);
    });
}

function applyBileInRadius(game, prop, radius) {
    const eventId = prop.userData?.scatterKey ? `bile:${prop.userData.scatterKey}` : null;
    for (const target of livingEnemyTargets(game)) {
        const position = targetPosition(target);
        const d = Math.hypot(position.x - prop.position.x, position.z - prop.position.z);
        if (d > radius) continue;
        game.applyPlayerDamageToEnemy?.(target, 35, { element: 'bile' });
        applyChitinVulnerability(target, {
            duration: BIOMECH_SYNERGY_TUNING.bileVulnerabilitySeconds,
            multiplier: BIOMECH_SYNERGY_TUNING.bileDamageMultiplier,
            eventId
        });
    }
}

function safePlaySound(sound, options) {
    if (typeof window !== 'undefined' && window.AudioManager?.play) {
        window.AudioManager.play(sound, options);
    }
}

function propWorldRoot(prop) {
    return prop?.userData?.world3dRoot
        ?? prop?.userData?.dynamicRoot
        ?? prop?.userData?.dressingItem?.dynamicRoot
        ?? prop?.dynamicRoot
        ?? null;
}

function nextBinaryState(prop, active, inactive = 'off') {
    return prop?.userData?.propState === active ? inactive : active;
}

function statefulInteraction(interactPrompt, responseFor, {
    hp = 35,
    repeatable = true,
    sound = 'terminal_beep',
    nextState,
    solidForState = null,
    onUse = null
} = {}) {
    return Object.freeze({
        hp,
        canInteract: true,
        repeatable,
        interactPrompt,
        onInteract: (game, prop) => {
            const state = nextState(game, prop);
            onUse?.(game, prop, state);
            game.showBunkerLine?.(responseFor(state));
            safePlaySound(sound, {
                volume: 0.48,
                playbackRate: 0.94 + Math.random() * 0.08,
                worldX: prop.position?.x,
                worldZ: prop.position?.z,
                maxDistance: 12
            });
            return {
                success: true,
                state,
                fxMode: state,
                solid: solidForState ? solidForState(state) : undefined,
                spent: !repeatable
            };
        }
    });
}

function terminalInteraction(interactPrompt, response, { hp = 35, sound = 'terminal_beep' } = {}) {
    return Object.freeze({
        hp,
        canInteract: true,
        repeatable: true,
        generic: 'terminal',
        interactPrompt,
        onInteract: (game) => {
            game.showBunkerLine?.(response);
            safePlaySound(sound, { volume: 0.48, playbackRate: 0.96 });
            return true;
        }
    });
}

// Props with cut-out moving parts (src/propArticulation.js): E opens/closes
// the doors or starts/stops the rotor; the prop experience does the motion.
function mechanismInteraction(interactPrompt, response, { hp = 40, sound = 'vault_open' } = {}) {
    return Object.freeze({
        hp,
        canInteract: true,
        repeatable: true,
        interactPrompt,
        onInteract: (game) => {
            game.showBunkerLine?.(response);
            safePlaySound(sound, { volume: 0.5, playbackRate: 0.95 + Math.random() * 0.1 });
            return true;
        }
    });
}

const propLabel = (type) => String(type)
    .replace(/^(life_|prop_|state_|scatter_|fixture_|body_)/, '')
    .replace(/_\d+$/, '')
    .replace(/_/g, ' ')
    .toUpperCase();

const genericSpecCache = new Map();

/**
 * E for props without a bespoke spec (world-prop-interactivity master plan,
 * Wave 1): anything running effects can be switched on and off, and
 * containers, piles and bodies can be searched once. Only offered when the
 * prop can visibly answer: a switch needs the prop's live effects.
 */
export function genericInteractionSpec(type, sprite = null) {
    if (!type) return null;
    const root = propWorldRoot(sprite);
    if (root?.userData?.propFx?.setEnabled) {
        const key = `switch:${type}`;
        if (!genericSpecCache.has(key)) {
            const label = propLabel(type);
            genericSpecCache.set(key, Object.freeze({
                hp: 30,
                canInteract: true,
                repeatable: true,
                generic: 'switch',
                interactPrompt: `[E] SWITCH ${label}`,
                onInteract: (game, target) => {
                    const fx = propWorldRoot(target)?.userData?.propFx;
                    if (!fx?.toggle) return false;
                    const on = fx.toggle();
                    game.showBunkerLine?.(`${label}: ${on ? 'RUNNING' : 'SHUT DOWN'}.`);
                    safePlaySound(on ? 'power_hum' : 'metal_stress', { volume: 0.4, playbackRate: on ? 1 : 1.3 });
                    return true;
                }
            }));
        }
        return genericSpecCache.get(key);
    }
    if (isSearchableType(type)) {
        const key = `search:${type}`;
        if (!genericSpecCache.has(key)) {
            const label = propLabel(type);
            genericSpecCache.set(key, Object.freeze({
                hp: 25,
                canInteract: true,
                repeatable: false,
                generic: 'search',
                interactPrompt: `[E] SEARCH ${label}`,
                onInteract: (game) => {
                    game.showBunkerLine?.(`${label}: SEARCHED. NOTHING LEFT WORTH CARRYING.`);
                    safePlaySound('toolbox_open', { volume: 0.42, playbackRate: 0.9 + Math.random() * 0.2 });
                    return true;
                }
            }));
        }
        return genericSpecCache.get(key);
    }
    return null;
}

const SEARCHABLE = /crate|locker|supplies|pile|footlocker|drum|kit_pile|cargo_pallet|bunk|body_|exosuit|frozen_human|stretcher|janitor_cart|surgical_cart|parka/;
export function isSearchableType(type) {
    return SEARCHABLE.test(String(type ?? '')) && !/^arch_/.test(String(type));
}

const WORLD_EXPANSION_80_INTERACTIONS = Object.freeze(Object.fromEntries(
    WORLD_EXPANSION_80_SPECS.map((spec) => [spec.id, statefulInteraction(
        `[E] ${spec.prompt.toUpperCase()}`,
        (state) => `${propLabel(spec.id)}: ${state.toUpperCase()}.`,
        {
            hp: spec.placement === 'tabletop' ? 18 : 45,
            repeatable: true,
            sound: spec.fx === 'organic' ? 'neural_tap' : spec.fx === 'thermal' ? 'ambient_steam_hiss' : 'power_hum',
            nextState: (_game, prop) => {
                const current = spec.states.indexOf(prop?.userData?.propState);
                return spec.states[(current + 1 + spec.states.length) % spec.states.length];
            }
        }
    )])
));

export const PROP_INTERACTION_SPECS = Object.freeze({
    ...WORLD_EXPANSION_80_INTERACTIONS,
    life_arcade_cabinet: statefulInteraction(
        '[E] PLAY ARCADE CABINET',
        () => 'ARCADE CABINET: HIGH SCORE TABLE RECOVERED. INITIALS: T.I.N.A.',
        {
            nextState: () => 'working',
            sound: 'terminal_beep',
            onUse: (game, prop) => {
                if (typeof window !== 'undefined') {
                    if (prop?.userData?.definitionId === 'arcade_blackjack_cabinet' || prop?.userData?.isBlackjackCabinet) {
                        import('./blackjackArcade.js').then(({ getBlackjackController }) => {
                            getBlackjackController({ game }).open();
                        }).catch(() => {});
                    } else {
                        import('./arcadeCabinetMinigame.js').then(({ getArcadeController }) => {
                            const controller = getArcadeController({ game });
                            controller.open();
                        }).catch(() => {});
                    }
                }
            }
        }
    ),
    arcade_blackjack_cabinet: statefulInteraction(
        '[E] PLAY BLACK-ICE 21 (BLACKJACK)',
        () => 'BLACK-ICE 21: DEALER C.H.I.P.-0 ONLINE. PLACE YOUR WAGER.',
        {
            nextState: () => 'working',
            sound: 'terminal_beep',
            onUse: (game) => {
                if (typeof window !== 'undefined') {
                    import('./blackjackArcade.js').then(({ getBlackjackController }) => {
                        const controller = getBlackjackController({ game });
                        controller.open();
                    }).catch(() => {});
                }
            }
        }
    ),
    life_surgical_lamp: statefulInteraction(
        '[E] TOGGLE SURGICAL LAMP',
        (state) => `SURGICAL LAMP: ${state === 'on' ? 'OPERATING FIELD LIT' : 'DARK'}.`,
        { nextState: (_game, prop) => nextBinaryState(prop, 'on'), sound: 'power_hum' }
    ),
    cryo_heater_station: statefulInteraction(
        '[E] CYCLE HEATER STATION',
        (state) => `CRYO HEATER: ${state === 'on' ? 'THAW COILS ENGAGED' : 'BANKED'}.`,
        { nextState: (_game, prop) => nextBinaryState(prop, 'on'), sound: 'power_hum' }
    ),
    hive_brood_dome: statefulInteraction(
        '[E] CAUTERIZE BROOD DOME',
        () => 'BROOD DOME: NUTRIENT CIRCULATION CAUTERIZED.',
        { repeatable: false, nextState: () => 'spent', sound: 'flesh_seal', onUse: (game) => game.addScrap?.(12) }
    ),
    chasm_beacon_post: statefulInteraction(
        '[E] TOGGLE CHASM BEACON',
        (state) => `CHASM BEACON: ${state === 'on' ? 'GUIDANCE PULSE ACTIVE' : 'BLACKOUT'}.`,
        { nextState: (_game, prop) => nextBinaryState(prop, 'on'), sound: 'terminal_beep' }
    ),
    corp_executive_sarcophagus: statefulInteraction(
        '[E] OVERRIDE EXECUTIVE SARCOPHAGUS',
        () => 'EXECUTIVE SARCOPHAGUS: SEVERANCE PACKAGE RECLAIMED. +40 SCRAP.',
        { repeatable: false, nextState: () => 'open', sound: 'vault_open', onUse: (game) => game.addScrap?.(40) }
    ),
    corp_suppression_barrier: statefulInteraction(
        '[E] CYCLE SUPPRESSION BARRIER',
        (state) => `SUPPRESSION BARRIER: ${state === 'open' ? 'PASSAGE RELEASED' : 'LOCKED'}.`,
        { nextState: (_game, prop) => nextBinaryState(prop, 'open', 'closed'), solidForState: (state) => state !== 'open', sound: 'vault_open' }
    ),
    meridian_capacitor_bomb: statefulInteraction(
        '[E] DISARM CAPACITOR BOMB',
        () => 'MERIDIAN CAPACITOR: CHARGE BLED OFF. +30 SCRAP.',
        { repeatable: false, nextState: () => 'disabled', sound: 'power_hum', onUse: (game, prop) => {
            game.addScrap?.(30);
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0xffa648, count: 8, upward: 0.2 });
        } }
    ),
    tina_covert_nursery_chest: statefulInteraction(
        '[E] OPEN COVERT NURSERY CHEST',
        () => 'NURSERY CHEST: A FALSE BOTTOM YIELDS ORGANIC COMPONENTS. +25 SCRAP.',
        { repeatable: false, nextState: () => 'open', sound: 'flesh_seal', onUse: (game) => game.addScrap?.(25) }
    ),
    hive_sphincter_iris: statefulInteraction(
        '[E] WORK SPHINCTER IRIS',
        (state) => `SPHINCTER IRIS: ${state === 'open' ? 'PASSAGE DILATED' : 'SEALED'}.`,
        { nextState: (_game, prop) => nextBinaryState(prop, 'open', 'closed'), solidForState: (state) => state !== 'open', sound: 'flesh_seal' }
    ),
    ind_biomass_grinder: statefulInteraction(
        '[E] CYCLE BIOMASS GRINDER',
        (state) => `BIOMASS GRINDER: ${state === 'working' ? 'AUGERS TURNING' : 'EMERGENCY STOP'}.`,
        { nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'ind_biomass_grinder' }
    ),
    crash_cockpit_canopy: statefulInteraction(
        '[E] RELEASE COCKPIT CANOPY',
        () => 'COCKPIT CANOPY: EMERGENCY LATCH RELEASED. +20 SCRAP.',
        { repeatable: false, nextState: () => 'open', sound: 'vault_open', onUse: (game) => game.addScrap?.(20) }
    ),

    // Pass 2 World-Story Props (Waves A, B, C)
    bay_c_pod_312_rupture: statefulInteraction(
        '[E] SEARCH RUPTURED CRYO POD',
        () => 'CRYO POD 312: EMERGENCY EVACUATION LOG RECOVERED. +25 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'flesh_seal', onUse: (game) => game.addScrap?.(25) }
    ),
    chen_sealed_confession_console: statefulInteraction(
        '[E] PLAY CONFESSION TAPE',
        () => 'CONFESSION CONSOLE: DEPUTY CHEN\'S DIARY UNLOCKED. CONTRABAND COORDINATES MARKED.',
        { repeatable: false, nextState: () => 'spent', sound: 'chen_sealed_confession_console', onUse: (game) => game.addScrap?.(30) }
    ),
    decon_exosuit_scrubber_station: statefulInteraction(
        '[E] CYCLE DECON SCRUBBER',
        () => 'EXOSUIT SCRUBBER: PRESSURIZED DECON FOAM CYCLED. BIOLOGICAL STATUS CLEANSED.',
        { nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'water_shower' }
    ),
    engineer_wave_relay_dynamo: statefulInteraction(
        '[E] ENGAGE WAVE DYNAMO',
        (state) => `WAVE DYNAMO: ${state === 'working' ? 'HARMONIC INDUCTION BUS ENERGIZED' : 'STANDBY'}.`,
        { nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'power_hum' }
    ),
    evac_four_seat_cockpit_module: statefulInteraction(
        '[E] SALVAGE FLIGHT RECORDER',
        () => 'COCKPIT MODULE: FLIGHT TELEMETRY BLACK BOX RECOVERED. +40 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'vault_open', onUse: (game) => game.addScrap?.(40) }
    ),
    tank_orbital_siege_cannon: statefulInteraction(
        '[E] FIRE CALIBRATION ROUND',
        () => 'SIEGE CANNON: CALIBRATION ROUND DISCHARGED INTO THE ABYSS.',
        { repeatable: false, nextState: () => 'spent', sound: 'crane_motor', onUse: (game, prop) => {
            game.triggerCameraShake?.(0.6, 0.4);
            game.spawnPhysicalBurst?.(prop?.position?.x ?? 0, prop?.position?.z ?? 0, { color: 0xff4433, count: 12, upward: 0.4 });
        } }
    ),

    queen_royal_brood_throne: statefulInteraction(
        '[E] EXTRACT ROYAL JELLY',
        () => 'BROOD THRONE: ROYAL JELLY EXTRACTED. MAXIMUM VITALITY RESTORED.',
        { repeatable: false, nextState: () => 'spent', sound: 'flesh_seal', onUse: (game) => {
            game.healPlayer?.(50);
            game.addScrap?.(50);
        } }
    ),
    carapace_sentry_chrysalis: statefulInteraction(
        '[E] HARVEST SENTINEL CHITIN',
        () => 'SENTRY CHRYSALIS: REINFORCED CHITIN COMPOSITE HARVESTED. +20 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'flesh_seal', onUse: (game) => game.addScrap?.(20) }
    ),
    royal_egg_clutch_caul: statefulInteraction(
        '[E] PUNCTURE EGG CLUTCH',
        () => 'ROYAL EGG CLUTCH: DEVELOPING LARVAE CAUTERIZED. +20 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'flesh_seal', onUse: (game) => game.addScrap?.(20) }
    ),
    vass_acoustic_resonator_tank: statefulInteraction(
        '[E] HARMONIZE ACOUSTIC RESONATOR',
        (state) => `ACOUSTIC RESONATOR: ${state === 'working' ? 'HARMONIC DISORIENTATION PULSE BROADCAST' : 'DAMPED'}.`,
        { nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'neural_tap' }
    ),
    vass_hybrid_embryo_incubator: statefulInteraction(
        '[E] ABORT INCUBATOR SEQUENCE',
        () => 'HYBRID INCUBATOR: SPECIMEN DRAINED. GENETIC CORE EXTRACTED. +35 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'flesh_squish', onUse: (game) => game.addScrap?.(35) }
    ),
    suture_mercy_cocoon_canopy: statefulInteraction(
        '[E] ENTER MERCY CANOPY',
        () => 'MERCY CANOPY: MEDICAL GEL SUTURE COMPLETE. SUIT INTEGRITY RESTORED.',
        { nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'flesh_seal', onUse: (game) => {
            game.healPlayer?.(25);
        } }
    ),
    relay_false_beacon_spire: statefulInteraction(
        '[E] REPROGRAM FALSE BEACON',
        (state) => `FALSE BEACON SPIRE: ${state === 'working' ? 'SWARM LURE ACTIVE' : 'TRANSMISSION QUIET'}.`,
        { nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'relay_false_beacon_spire' }
    ),

    corp_biometric_collar_chute: statefulInteraction(
        '[E] OVERRIDE COLLAR CHUTE',
        () => 'BIOMETRIC COLLAR CHUTE: DETONATOR SAFE. UNCLAIMED BOUNTY RECOVERED. +35 SCRAP.',
        { repeatable: false, nextState: () => 'open', sound: 'vault_open', onUse: (game) => game.addScrap?.(35) }
    ),
    crawler_signal_antenna_rig: statefulInteraction(
        '[E] RETUNE SIGNAL RIG',
        (state) => `SIGNAL ANTENNA RIG: ${state === 'working' ? 'EXPEDITION CHANNELS LOCKED' : 'FREQUENCY FLOATING'}.`,
        { nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'terminal_beep' }
    ),
    evac_manifest_allocation_terminal: statefulInteraction(
        '[E] SPOOF EVAC MANIFEST',
        () => 'MANIFEST TERMINAL: EVACUATION POD SEALS REMOTELY OVERRIDDEN. +30 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'evac_manifest_allocation_terminal', onUse: (game) => game.addScrap?.(30) }
    ),
    evac_preflight_fuel_umbilical: statefulInteraction(
        '[E] VENT FUEL UMBILICAL',
        () => 'FUEL UMBILICAL: HYDRAZINE PRESSURE BLED OFF. +30 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'chem_siphon', onUse: (game) => game.addScrap?.(30) }
    ),
    scout_tracking_beacon_core: statefulInteraction(
        '[E] DOWNLOAD BEACON TELEMETRY',
        () => 'TRACKING BEACON: FALLEN SCOUT SUPPLY VECTOR LOGGED. +25 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'scout_tracking_beacon_core', onUse: (game) => game.addScrap?.(25) }
    ),
    sector_zero_bore_drillhead: statefulInteraction(
        '[E] ENGAGE BORE DRILLHEAD',
        (state) => `BORE DRILLHEAD: ${state === 'working' ? 'CARBIDE CUTTERS ENGAGED' : 'HYDRAULIC CLAMP ENGAGED'}.`,
        { nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'crane_motor' }
    ),

    // Wave D: Pass 1 Corporate, Meridian, Tallow & Vesper (15 models)
    corp_interrogation_chair: statefulInteraction(
        '[E] EXTRACT BURNED MEMORY',
        () => 'INTERROGATION CHAIR: RESIDUAL NEURAL TRACE EXTRACTED. EXECUTIVE CODES RECOVERED. +30 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'neural_tap', onUse: (game) => game.addScrap?.(30) }
    ),
    corp_debt_severing_kiosk: statefulInteraction(
        '[E] SPOOF LIQUIDATION RECORD',
        () => 'DEBT SEVERING KIOSK: IDENTITY LIQUIDATED. CORP STIPEND DISPENSED. +35 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'terminal_beep', onUse: (game) => game.addScrap?.(35) }
    ),
    corp_dissection_gurney: statefulInteraction(
        '[E] SCAN TISSUE SPECIMEN',
        () => 'DISSECTION GURNEY: PATHOLOGY SCAN COMPLETE. EMERGENCY SUTURES RETRIEVED. +20 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'terminal_beep', onUse: (game) => { game.addScrap?.(20); game.healPlayer?.(15); } }
    ),
    corp_incinerator_hopper: statefulInteraction(
        '[E] CYCLE INCINERATOR HOPPER',
        (state) => `INCINERATOR HOPPER: ${state === 'working' ? 'THERMAL PURGE ENGAGED' : 'STANDBY'}.`,
        { nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'crane_motor' }
    ),
    meridian_cyber_graft_bench: statefulInteraction(
        '[E] CALIBRATE CYBER GRAFT',
        (state) => `CYBER GRAFT BENCH: ${state === 'working' ? 'SERVO LINK SYNCHRONIZED' : 'IDLE'}.`,
        { nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'power_hum' }
    ),
    meridian_mainframe_altar: statefulInteraction(
        '[E] COMMUNE WITH MAINFRAME',
        () => 'MAINFRAME ALTAR: ARCHIVAL RUNES COMMUNICATED. SECTOR SCHEMATICS DOWNLOADED. +30 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'terminal_beep', onUse: (game) => game.addScrap?.(30) }
    ),
    meridian_servitor_dock: statefulInteraction(
        '[E] DRAIN RESERVE CHARGE',
        () => 'SERVITOR DOCK: CAPACITOR BANK DRAINED. POWER PACK REPLENISHED. +25 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'power_hum', onUse: (game) => { game.addScrap?.(25); game.healPlayer?.(10); } }
    ),
    tallow_compost_fermenter: statefulInteraction(
        '[E] TAP FERMENTER SLURRY',
        () => 'COMPOST FERMENTER: ENRICHED BIO-STIMULANT EXTRACTED. +25 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'steam_burst', onUse: (game) => { game.addScrap?.(25); game.healPlayer?.(10); } }
    ),
    tallow_spore_cradle: statefulInteraction(
        '[E] STERILIZE SPORE CRADLE',
        () => 'SPORE CRADLE: FUNGAL NURSERY CAUTERIZED. BIO-MASS COLLECTED. +15 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'flesh_seal', onUse: (game) => game.addScrap?.(15) }
    ),
    tallow_flesh_trellis: statefulInteraction(
        '[E] PRUNE FLESH TRELLIS',
        () => 'FLESH TRELLIS: TENDON VINES CUT. ELASTIC FIBERS HARVESTED. +20 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'flesh_seal', onUse: (game) => game.addScrap?.(20) }
    ),
    tallow_sacrificial_altar: statefulInteraction(
        '[E] INSPECT SACRIFICIAL ALTAR',
        () => 'SACRIFICIAL ALTAR: ANCIENT BONE TALISMAN UNSEALED. +30 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'flesh_seal', onUse: (game) => game.addScrap?.(30) }
    ),
    vesper_amputation_rig: statefulInteraction(
        '[E] SALVAGE TRAUMA RIG',
        () => 'AMPUTATION RIG: STERILE SURGICAL CLAMPS SALVAGED. +30 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'crane_motor', onUse: (game) => game.addScrap?.(30) }
    ),
    vesper_autocannon_bipod: statefulInteraction(
        '[E] CLEAR AUTOCANNON FEED',
        () => 'AUTOCANNON BIPOD: BREECH CLEARED. ORDNANCE ROUNDS RECOVERED. +25 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'crane_motor', onUse: (game) => game.addScrap?.(25) }
    ),
    vesper_hanging_cage: statefulInteraction(
        '[E] UNLATCH HANGING CAGE',
        () => 'HANGING CAGE: IRON HASP CRACKED. SCAVENGER STASH RECOVERED. +25 SCRAP.',
        { repeatable: false, nextState: () => 'open', sound: 'vault_open', onUse: (game) => game.addScrap?.(25) }
    ),
    vesper_reloading_station: statefulInteraction(
        '[E] PRESS MUNITIONS',
        (state) => `RELOADING STATION: ${state === 'working' ? 'DIE PRESS CRANKED' : 'READY'}.`,
        { nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'crane_motor', onUse: (game) => game.addScrap?.(15) }
    ),

    // Wave E: Pass 1 Hive, Cryo Brutality, Tina & Chasm (18 models)
    tina_molted_carapace: statefulInteraction(
        '[E] SCAN MOLTED CARAPACE',
        () => "MOLTED CARAPACE: MAYOR TINA'S EPIDERMAL SHEDDING SCANNED. LORE ARCHIVED. +20 SCRAP.",
        { repeatable: false, nextState: () => 'spent', sound: 'terminal_beep', onUse: (game) => game.addScrap?.(20) }
    ),
    tina_mimic_vanity: statefulInteraction(
        '[E] SEARCH MIMIC VANITY',
        () => 'MIMIC VANITY: PROSTHETIC DERMIS AND COSMETIC STASH FOUND. +30 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'vault_open', onUse: (game) => game.addScrap?.(30) }
    ),
    tina_trophy_trove: statefulInteraction(
        '[E] LOOT TROPHY TROVE',
        () => 'TROPHY TROVE: RARE MAYORAL RELICS RECOVERED. +50 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'vault_open', onUse: (game) => game.addScrap?.(50) }
    ),
    hive_visceral_ovipositor: statefulInteraction(
        '[E] JAM OVIPOSITOR',
        () => 'VISCERAL OVIPOSITOR: REPRODUCTIVE DUCT CLAMPED. LOCAL BREEDING HALTED. +30 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'hive_visceral_ovipositor', onUse: (game) => game.addScrap?.(30) }
    ),
    hive_vivisected_engineer: statefulInteraction(
        '[E] TERMINATE SUFFERING',
        () => 'VIVISECTED ENGINEER: LIFE SUPPORT SILENCED. KEYCARD RETRIEVED. +40 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'terminal_beep', onUse: (game) => game.addScrap?.(40) }
    ),
    hive_gestation_sac: statefulInteraction(
        '[E] EXCISE GESTATION SAC',
        () => 'GESTATION SAC: EMBRYO EXCISED. BIOLOGICAL SAMPLE ACQUIRED. +25 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'flesh_seal', onUse: (game) => game.addScrap?.(25) }
    ),
    hive_pulmonary_bellows: statefulInteraction(
        '[E] CLAMP PULMONARY BELLOWS',
        (state) => `PULMONARY BELLOWS: ${state === 'working' ? 'TRACHEA CONSTRICTED' : 'VENTILATING'}.`,
        { nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'steam_burst' }
    ),
    hive_amniotic_feeder_trough: statefulInteraction(
        '[E] CONTAMINATE FEEDER TROUGH',
        () => 'FEEDER TROUGH: CHEMICAL TAINT INTRODUCED. +25 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'steam_burst', onUse: (game) => game.addScrap?.(25) }
    ),
    cryo_ruptured_pod: statefulInteraction(
        '[E] SEARCH RUPTURED CRYO POD',
        () => 'CRYO POD: OCCUPANT COLD-STORAGE SUPPLIES RECOVERED. +25 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'flesh_seal', onUse: (game) => game.addScrap?.(25) }
    ),
    cryo_cannibal_butchery_table: statefulInteraction(
        '[E] INSPECT BUTCHERY TABLE',
        () => 'BUTCHERY TABLE: EMERGENCY DRIED PROTEIN CACHE FOUND. +25 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'flesh_seal', onUse: (game) => { game.addScrap?.(25); game.healPlayer?.(20); } }
    ),
    cryo_ice_core_specimen: statefulInteraction(
        '[E] ANALYZE ICE CORE',
        () => 'ICE CORE: PREHISTORIC STRATA LOGGED. RARE MINERAL SAMPLES HARVESTED. +30 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'terminal_beep', onUse: (game) => game.addScrap?.(30) }
    ),
    cryo_thawing_trough: statefulInteraction(
        '[E] ENGAGE THAWING COILS',
        (state) => `THAWING TROUGH: ${state === 'working' ? 'HEATING HEURISTIC ACTIVE' : 'COLD'}.`,
        { nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'steam_burst', onUse: (game) => game.healPlayer?.(10) }
    ),
    cryo_frozen_shelter_pod: statefulInteraction(
        '[E] PRY SHELTER POD HATCH',
        () => "SHELTER POD: SURVIVOR'S THERMAL FLARES AND SUPPLIES FOUND. +20 SCRAP.",
        { repeatable: false, nextState: () => 'open', sound: 'vault_open', onUse: (game) => game.addScrap?.(20) }
    ),
    chasm_hanging_elevator: statefulInteraction(
        '[E] CYCLE ELEVATOR CABLES',
        (state) => `HANGING ELEVATOR: ${state === 'working' ? 'WINCH TENSION LOCKED' : 'SLACK'}.`,
        { nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'crane_motor' }
    ),
    chasm_suicide_ledge_cross: statefulInteraction(
        '[E] READ MEMORIAL INSCRIPTION',
        () => "MEMORIAL CROSS: 'LET THE ICE FORGET WHAT THE HORIZON TOOK.' STASH NOTED. +20 SCRAP.",
        { repeatable: false, nextState: () => 'spent', sound: 'terminal_beep', onUse: (game) => game.addScrap?.(20) }
    ),
    chasm_dredge_hook_crane: statefulInteraction(
        '[E] HOIST DREDGE CRANE',
        () => 'DREDGE CRANE: CHASM SALVAGE CRATE HAULED UP. +45 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'crane_motor', onUse: (game) => game.addScrap?.(45) }
    ),
    ind_hydraulic_manifold: statefulInteraction(
        '[E] VENT HYDRAULIC PRESSURE',
        (state) => `HYDRAULIC MANIFOLD: ${state === 'working' ? 'BYPASS OPEN' : 'HOLDING PRESSURE'}.`,
        { nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'steam_burst' }
    ),
    ind_fuel_rod_cask: statefulInteraction(
        '[E] EXTRACT SPENT FUEL ROD',
        () => 'FUEL ROD CASK: HIGH-ENERGY CELL DISLODGED. +50 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'vault_open', onUse: (game) => game.addScrap?.(50) }
    ),

    // Wave F: 2026-10-11 World Completion Machinery, Daily Life & Camps (28 models)
    life_pallet_racking: statefulInteraction(
        '[E] SEARCH PALLET RACK',
        () => 'PALLET RACKING: BOXED RATION PACKS AND HARDWARE SALVAGED. +20 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'vault_open', onUse: (game) => game.addScrap?.(20) }
    ),
    life_server_racks: statefulInteraction(
        '[E] ACCESS ARCHIVED LOGS',
        () => 'SERVER RACK: SECTOR COMM LOGS HARVESTED. +25 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'terminal_beep', onUse: (game) => game.addScrap?.(25) }
    ),
    life_transformer_bank: statefulInteraction(
        '[E] RESET CIRCUIT BREAKER',
        (state) => `TRANSFORMER BANK: ${state === 'working' ? 'BUS RE-ENERGIZED' : 'FAULT TRIP'}.`,
        { nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'power_hum' }
    ),
    life_fire_station: statefulInteraction(
        '[E] BREAK FIRE STATION GLASS',
        () => 'EMERGENCY FIRE STATION: CHEMICAL EXTINGUISHER & MEDIKIT RETRIEVED. +25 SCRAP.',
        { repeatable: false, nextState: () => 'open', sound: 'vault_open', onUse: (game) => { game.addScrap?.(25); game.healPlayer?.(20); } }
    ),
    life_conveyor_section: statefulInteraction(
        '[E] ENGAGE CONVEYOR ROLLERS',
        (state) => `CONVEYOR: ${state === 'working' ? 'ROLLERS ENGAGED' : 'STOPPED'}.`,
        { nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'crane_motor', onUse: (game) => game.addScrap?.(15) }
    ),
    life_cistern_tank: statefulInteraction(
        '[E] PURIFY CISTERN WATER',
        () => 'CISTERN TANK: CLEAN RESERVE WATER TAPPED. HYDRATION RESTORED.',
        { nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'water_drain', onUse: (game) => game.healPlayer?.(15) }
    ),
    life_scaffold_tower: statefulInteraction(
        '[E] SEARCH TOOL TRAY',
        () => 'SCAFFOLD TOWER: HARDWARE & SPARE BOLTS RECOVERED. +15 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'vault_open', onUse: (game) => game.addScrap?.(15) }
    ),
    life_forklift: statefulInteraction(
        '[E] CRANK FORKLIFT LIFT',
        (state) => `FORKLIFT: ${state === 'working' ? 'HYDRAULIC MAST RAISED' : 'LOWERED'}.`,
        { nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'crane_motor' }
    ),
    life_sink_row: statefulInteraction(
        '[E] WASH CONTAMINANTS',
        () => 'SINK ROW: STERILIZATION WASH RUN. TOXINS RINSED.',
        { nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'steam_burst', onUse: (game) => game.healPlayer?.(10) }
    ),
    life_shower_stall: statefulInteraction(
        '[E] RUN DECON SHOWER',
        () => 'SHOWER STALL: HIGH-PRESSURE DECONTAMINATION SPRAY APPLIED.',
        { nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'steam_burst', onUse: (game) => game.healPlayer?.(20) }
    ),
    life_laundry_machines: statefulInteraction(
        '[E] SEARCH LAUNDRY DRUM',
        () => 'LAUNDRY MACHINE: FORGOTTEN COINS AND LINEN SCRAP FOUND. +15 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'vault_open', onUse: (game) => game.addScrap?.(15) }
    ),
    life_weight_bench: statefulInteraction(
        '[E] WORK OUT ON BENCH',
        () => 'WEIGHT BENCH: EXERTION COMPLETE. ENDURANCE SURGE GRANTED.',
        { nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'power_hum', onUse: (game) => game.healPlayer?.(5) }
    ),
    life_filing_cabinets: statefulInteraction(
        '[E] SEARCH PERSONNEL FILES',
        () => 'FILING CABINETS: REDACTED CREW DOSSIER RETRIEVED. +20 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'vault_open', onUse: (game) => game.addScrap?.(20) }
    ),
    life_overseer_desk: statefulInteraction(
        '[E] INSPECT OVERSEER LEDGER',
        () => 'OVERSEER DESK: AUDIT LEDGER DECODED. SUPPLY CACHES LOCATED. +30 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'terminal_beep', onUse: (game) => game.addScrap?.(30) }
    ),
    life_planning_board: statefulInteraction(
        '[E] STUDY DEFENSE TACTICS',
        () => 'PLANNING BOARD: BUNKER CHOKEPOINTS MEMORIZED. +20 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'terminal_beep', onUse: (game) => game.addScrap?.(20) }
    ),
    life_algae_tank: statefulInteraction(
        '[E] HARVEST ALGAE OXYGEN',
        () => 'ALGAE TANK: PHOTOSYNTHETIC O2 ENRICHED. BREATHING PURIFIED.',
        { nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'water_drain', onUse: (game) => game.healPlayer?.(15) }
    ),
    cryo_ice_crawler: statefulInteraction(
        '[E] SIPHON CRAWLER FUEL',
        () => 'ICE CRAWLER: SYNTHETIC DIESEL SIPHONED. +25 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'crane_motor', onUse: (game) => game.addScrap?.(25) }
    ),
    cryo_snowbound_crates: statefulInteraction(
        '[E] PRY FROZEN CRATES',
        () => 'SNOWBOUND CRATES: ICE SHATTERED. EMERGENCY SUPPLIES FREED. +20 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'vault_open', onUse: (game) => game.addScrap?.(20) }
    ),
    cryo_ice_blocks: statefulInteraction(
        '[E] CHIP ICE BLOCKS',
        () => 'ICE BLOCKS: MELTWATER CHIPPED. FRESH MOISTURE OBTAINED.',
        { repeatable: false, nextState: () => 'spent', sound: 'flesh_seal', onUse: (game) => game.healPlayer?.(10) }
    ),
    hive_resin_pillar: statefulInteraction(
        '[E] TAP RESIN PILLAR',
        () => 'RESIN PILLAR: BIOLOGICAL ADHESIVE HARVESTED. +20 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'flesh_seal', onUse: (game) => game.addScrap?.(20) }
    ),
    hive_cocooned_crew: statefulInteraction(
        '[E] CUT OPEN COCOON',
        () => 'COCOONED CREW: VICTIM CUT FREE. DOGTAGS & DOGEAR SALVAGED. +30 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'flesh_seal', onUse: (game) => game.addScrap?.(30) }
    ),
    hive_pheromone_node: statefulInteraction(
        '[E] MASK ODOR AT NODE',
        () => 'PHEROMONE NODE: SCENT GLANDS CRUSHED. SWARM PHEROMONES MASKED.',
        { nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'flesh_seal' }
    ),
    hive_assimilated_generator: statefulInteraction(
        '[E] OVERCHARGE ASSIMILATED GENERATOR',
        (state) => `ASSIMILATED GENERATOR: ${state === 'working' ? 'BIO-ELECTRIC SURGE DISCHARGING' : 'STABILIZED'}.`,
        { nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'power_hum' }
    ),
    crash_engine_nacelle: statefulInteraction(
        '[E] SALVAGE ENGINE NACELLE',
        () => 'ENGINE NACELLE: TITANIUM TURBINE BLADES REMOVED. +35 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'vault_open', onUse: (game) => game.addScrap?.(35) }
    ),
    crash_hull_panels: statefulInteraction(
        '[E] PRY HULL PANEL',
        () => 'CRASH HULL PANEL: REINFORCED ALLOY STRIPPED. +20 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'vault_open', onUse: (game) => game.addScrap?.(20) }
    ),
    salvage_tagged_heap: statefulInteraction(
        '[E] SORT TAGGED SALVAGE',
        () => 'TAGGED SALVAGE HEAP: SORTED RECOVERABLE METALS & PARTS. +30 SCRAP.',
        { repeatable: false, nextState: () => 'spent', sound: 'vault_open', onUse: (game) => game.addScrap?.(30) }
    ),
    camp_canvas_tent: statefulInteraction(
        '[E] REST AT TENT',
        () => 'CANVAS TENT: BRIEF RESPITE TAKEN. VITALITY RECOVERED.',
        { nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'vault_open', onUse: (game) => game.healPlayer?.(25) }
    ),
    camp_water_barrel: statefulInteraction(
        '[E] REFILL FLASK AT BARREL',
        () => 'WATER BARREL: CANTEEN REFILLED WITH CLEAN WATER.',
        { nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'water_drain', onUse: (game) => game.healPlayer?.(15) }
    ),

    life_ribcage_rescue_cabinet: mechanismInteraction('[E] WORK RESCUE CABINET', 'RESCUE CABINET: RIB DOOR UNLATCHED.', { sound: 'flesh_seal' }),
    life_confessional: mechanismInteraction('[E] WORK CONFESSIONAL DOORS', 'CONFESSIONAL: THE BOOTH DOORS SWING.', { sound: 'vault_open' }),
    life_seismic_drill: mechanismInteraction('[E] RUN SEISMIC DRILL', 'SEISMIC DRILL: AUGER ENGAGED.', { sound: 'crane_motor' }),
    life_supply_drop_pod: mechanismInteraction('[E] WORK DROP POD HATCH', 'DROP POD: HATCH SEALS CYCLE.', { sound: 'vault_open' }),
    life_ice_bore_winch: mechanismInteraction('[E] WORK ICE-BORE WINCH', 'ICE-BORE WINCH: DRUM TURNING.', { sound: 'crane_motor' }),

    prop_diagnostic_console: terminalInteraction(
        '[E] RUN DIAGNOSTIC SWEEP',
        'DIAGNOSTIC CONSOLE: LOCAL SYSTEMS RESPONDING.'
    ),
    prop_fabricator_workstation: terminalInteraction(
        '[E] WAKE FABRICATOR WORKSTATION',
        'FABRICATOR WORKSTATION: STANDBY BUS ONLINE.'
    ),
    life_tactile_console: terminalInteraction(
        '[E] ACCESS TACTILE CONSOLE',
        'TACTILE CONSOLE: MEMBRANE INPUT ACKNOWLEDGED.'
    ),
    life_route_map_table: terminalInteraction(
        '[E] REVIEW ROUTE MAP',
        'ROUTE TABLE: LOCAL PATH DATA ILLUMINATED.'
    ),
    life_assimilated_desk: terminalInteraction(
        '[E] ACCESS ASSIMILATED WORKSTATION',
        'ASSIMILATED WORKSTATION: ORGANIC BUS ANSWERS.'
    ),
    life_cochlear_intercom: terminalInteraction(
        '[E] KEY COCHLEAR INTERCOM',
        'INTERCOM: CARRIER TONE RECEIVED.',
        { hp: 25 }
    ),
    prop_camp_meridian_radio: terminalInteraction(
        '[E] TUNE MERIDIAN RADIO',
        'MERIDIAN RADIO: SIGNAL LOCKED.',
        { hp: 30 }
    ),
    prop_terminal_ruptured: terminalInteraction(
        '[E] QUERY RUPTURED TERMINAL',
        'TERMINAL FAULT: MEMORY BUS CORRUPTED.',
        { hp: 20 }
    ),

    // 01. Oxygen Cascade Rack: Rupture gives massive O2 + cryo knockback; Interact bleeds O2 safely
    prop_oxygen_bottle_cascade_rack: {
        hp: 35,
        canInteract: true,
        interactPrompt: '[E] BLEED O₂ MANIFOLD (+15% O₂)',
        onInteract: (game, prop) => {
            game.adjustOxygen?.(15);
            game.showBunkerLine?.('LIFE SUPPORT: MANIFOLD VENTED. +15% OXYGEN SECURED.');
            safePlaySound('ambient_steam_hiss', { volume: 0.6 });
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0x88e0ff, count: 8, upward: 0.25 });
            return true;
        },
        onDestroy: (game, prop) => {
            // HELP: Refill +35% O2
            game.adjustOxygen?.(35);
            game.showBunkerLine?.('O₂ CASCADE TANK RUPTURED! EMERGENCY CRYOGENIC VENT (+35% O₂)');
            // HURT / HELP: Cryo shockwave knocks back & damages swarming enemies
            game.triggerCameraShake?.(0.08, 0.18);
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0xa5f3fc, count: 20, upward: 0.4 });
            safePlaySound('metal_stress', { volume: 0.7, playbackRate: 0.8 });

            if (game.snails) {
                for (const snail of game.snails) {
                    if (!snail || !snail.isAlive) continue;
                    const d = Math.hypot(snail.x - prop.position.x, snail.z - prop.position.z);
                    if (d <= 5.0) {
                        game.applyPlayerDamageToEnemy?.(snail, 45, { element: 'cryo' });
                        // Knockback
                        const kx = (snail.x - prop.position.x) / (d || 1) * 3.5;
                        const kz = (snail.z - prop.position.z) / (d || 1) * 3.5;
                        snail.x += kx;
                        snail.z += kz;
                    }
                }
            }
            for (const attacker of game.umbilicalAttackers ?? []) {
                if (!attacker?.isAlive) continue;
                const d = Math.hypot(attacker.x - prop.position.x, attacker.z - prop.position.z);
                if (d <= BIOMECH_SYNERGY_TUNING.cryoStunRadius) {
                    attacker.stun?.(BIOMECH_SYNERGY_TUNING.cryoStunSeconds);
                }
            }
        }
    },

    // 02. Coolant Drum Leaking Pool: Rupture triggers freeze explosion; Interact siphons coolant
    prop_coolant_drum_leaking_pool: {
        hp: 25,
        canInteract: true,
        interactPrompt: '[E] SIPHON CRYO CHEMICAL (Costs 1 Heart)',
        onInteract: (game, prop) => {
            // Health is three hearts; the old 10 was a one-shot kill from full
            // (session 2026-10-06: the solo run ended here).
            game.takeDamage?.(1, 'cryo-hazard', prop.position.x, prop.position.z);
            game.addScrap?.(15);
            game.showBunkerLine?.('EXTRACTED 1× CRYO CHEMICAL FLASK (+15 SCRAP, -1 HEART)');
            safePlaySound('chem_siphon', { volume: 0.5 });
            return true;
        },
        onDestroy: (game, prop) => {
            game.showBunkerLine?.('COOLANT DRUM FLASH FREEZE! SUB-ZERO SHOCKWAVE');
            game.triggerCameraShake?.(0.06, 0.15);
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0x00f0ff, count: 25, upward: 0.35 });
            if (game.snails) {
                for (const snail of game.snails) {
                    if (!snail || !snail.isAlive) continue;
                    const d = Math.hypot(snail.x - prop.position.x, snail.z - prop.position.z);
                    if (d <= 4.0) {
                        game.applyPlayerDamageToEnemy?.(snail, 60, { element: 'cryo' });
                    }
                }
            }
            for (const attacker of game.umbilicalAttackers ?? []) {
                if (!attacker?.isAlive) continue;
                const d = Math.hypot(attacker.x - prop.position.x, attacker.z - prop.position.z);
                if (d <= BIOMECH_SYNERGY_TUNING.cryoStunRadius) {
                    attacker.stun?.(BIOMECH_SYNERGY_TUNING.cryoStunSeconds);
                }
            }
        }
    },

    // 03. Liturgical Terminal Lectern: Interact downloads telemetry; Rupture discharges EMP
    prop_liturgical_terminal_lectern: {
        hp: 40,
        canInteract: true,
        interactPrompt: '[E] ACCESS LITURGICAL SCRIPTURE',
        onInteract: (game, prop) => {
            game.showBunkerLine?.('"SERVICE IS MANDATORY. WE PRAISE THE CORE." SECTOR TELEMETRY DECRYPTED.');
            safePlaySound('terminal_beep', { volume: 0.6 });
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0xffaa00, count: 12, upward: 0.2 });
            // Grant temporary critical boost if supported
            if (game.playerVitals) {
                game.playerVitals.critBoostTimer = 60.0;
            }
            return true;
        },
        onDestroy: (game, prop) => {
            game.showBunkerLine?.('LECTERN EMP DISCHARGE! ELECTRICAL ARC FLASH');
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0x66ffff, count: 18, upward: 0.3 });
            if (game.snails) {
                for (const snail of game.snails) {
                    if (!snail || !snail.isAlive) continue;
                    const d = Math.hypot(snail.x - prop.position.x, snail.z - prop.position.z);
                    if (d <= 6.0) {
                        game.applyPlayerDamageToEnemy?.(snail, 30, { element: 'shock' });
                    }
                }
            }
        }
    },

    // 04. Votive Candle Shrine: Interact offers scrap for speed buff; Rupture plunges room into dark
    prop_votive_candle_shrine: {
        hp: 20,
        canInteract: true,
        interactPrompt: '[E] OFFER 25 SCRAP TO THE MACHINE GOD',
        onInteract: (game, prop) => {
            const currentScrap = game.bank?.state?.scrap ?? game.playerVitals?.scrap ?? 50;
            if (currentScrap >= 25) {
                if (game.bank?.spendScrap) game.bank.spendScrap(25);
                else if (game.playerVitals) game.playerVitals.scrap = Math.max(0, currentScrap - 25);
                game.showBunkerLine?.('CORPORATE ZEAL ACCEPTED! +25% SPEED & SPRINT BOOST (90s)');
                game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0xff8800, count: 24, upward: 0.4 });
                safePlaySound('shrine_blessing', { volume: 0.7 });
                return true;
            } else {
                game.showBunkerLine?.('INSUFFICIENT SCRAP FOR SACRAMENTAL OFFERING.');
                return false;
            }
        },
        onDestroy: (game, prop) => {
            game.showBunkerLine?.('SACRILEGE: SHRINE SHATTERED. RELIC EXTRACTED.');
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0x442200, count: 14, upward: 0.2 });
            game.addScrap?.(20);
        }
    },

    // 05. Corporate Saint Reliquary: Rupture triggers alarm & boss guardians; Interact safely unlocks
    prop_corporate_saint_reliquary: {
        hp: 120,
        canInteract: true,
        interactPrompt: '[E] BIOMETRIC DECRYPTION (Open Director Vault)',
        onInteract: (game, prop) => {
            game.showBunkerLine?.('VAULT UNLOCKED: HIGH-TIER CORPORATE RELIC SALVAGED.');
            game.addScrap?.(50);
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0xffd700, count: 30, upward: 0.4 });
            safePlaySound('vault_open', { volume: 0.8 });
            return true;
        },
        onDestroy: (game, _prop) => {
            game.showBunkerLine?.('SECURITY BREACH: DIRECTOR BIO-CONTAINMENT DESECRATED! ALARM ACTIVE');
            game.addScrap?.(50);
            game.spawnPatrolNearPlayer?.();
            safePlaySound('alarm_klaxon', { volume: 0.8 });
        }
    },

    // 06. Pipe Organ Heat Exchanger: Rupture releases scalding steam cone; Interact vents bypass
    prop_pipe_organ_heat_exchanger: {
        hp: 80,
        canInteract: true,
        interactPrompt: '[E] BYPASS SUB-DECK PRESSURE VALVE',
        onInteract: (game, prop) => {
            game.showBunkerLine?.('PNEUMATIC BYPASS OPENED. STEAM HAZARDS DISARMED.');
            safePlaySound('ambient_steam_hiss', { volume: 0.5 });
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0xcccccc, count: 10, upward: 0.2 });
            return true;
        },
        onDestroy: (game, prop) => {
            game.showBunkerLine?.('STEAM PRESSURE BLOWOUT! SCALDING 300°C JET');
            game.triggerCameraShake?.(0.06, 0.12);
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0xffffff, count: 30, upward: 0.5 });
            if (game.snails) {
                for (const snail of game.snails) {
                    if (!snail || !snail.isAlive) continue;
                    const d = Math.hypot(snail.x - prop.position.x, snail.z - prop.position.z);
                    if (d <= 5.0) {
                        game.applyPlayerDamageToEnemy?.(snail, 50, { element: 'fire' });
                    }
                }
            }
        }
    },

    // 07. Floor Conduit Bridge: Rupture electrifies floor ramp; Interact reroutes power
    prop_floor_conduit_bridge: {
        hp: 50,
        canInteract: true,
        interactPrompt: '[E] REROUTE AUXILIARY POWER GRID',
        onInteract: (game, prop) => {
            game.showBunkerLine?.('CIRCUIT REROUTED. POWER RESTORED TO LOCAL SECTOR.');
            safePlaySound('power_hum', { volume: 0.5 });
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0x33bbff, count: 12, upward: 0.15 });
            return true;
        },
        onDestroy: (game, prop) => {
            game.showBunkerLine?.('CONDUIT SHEARED! HIGH-VOLTAGE FLOOR ARC HAZARD');
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0x00ffff, count: 20, upward: 0.25 });
            if (game.snails) {
                for (const snail of game.snails) {
                    if (!snail || !snail.isAlive) continue;
                    const d = Math.hypot(snail.x - prop.position.x, snail.z - prop.position.z);
                    if (d <= 3.5) {
                        game.applyPlayerDamageToEnemy?.(snail, 40, { element: 'shock' });
                    }
                }
            }
        }
    },

    // 08. Decontamination Eyewash & Shower Station: Cleanses infection & toxic load
    prop_decon_eyewash_shower_station: {
        hp: 30,
        canInteract: true,
        interactPrompt: '[E] PULL CHAIN: DECONTAMINATION SHOWER',
        onInteract: (game, prop) => {
            if (game.playerVitals) {
                const currentInf = game.playerVitals.infection ?? 0;
                game.playerVitals.infection = Math.max(0, currentInf * 0.5);
            }
            game.showBunkerLine?.('DECONTAMINATION ACTIVE: -50% INFECTION LOAD PURGED.');
            safePlaySound('water_shower', { volume: 0.7 });
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0x44eeaa, count: 25, upward: 0.4 });
            return true;
        },
        onDestroy: (game, prop) => {
            if (game.playerVitals) {
                game.playerVitals.infection = 0;
            }
            game.adjustOxygen?.(20);
            game.showBunkerLine?.('EYEWASH STATION DESTROYED. FRESHWATER & O₂ DISCHARGED. INFECTION PURGED.');
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0x88ccff, count: 15, upward: 0.2 });
        }
    },

    // 09. Exosuit Docking Gantry: Overcharges suit plating / repairs armor
    prop_exosuit_docking_gantry: {
        hp: 90,
        canInteract: true,
        interactPrompt: '[E] FAST-CHARGE EXOSUIT PLATING',
        onInteract: (game, prop) => {
            if (game.playerVitals) {
                game.playerVitals.hp = Math.min(game.playerVitals.maxHp * 1.5, (game.playerVitals.hp || 100) + 40);
            }
            game.showBunkerLine?.('EXOSUIT DOCKED: ARMOR INTEGRITY OVERCHARGED TO 150%.');
            safePlaySound('exosuit_charge', { volume: 0.7 });
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0xffcc00, count: 20, upward: 0.3 });
            return true;
        },
        onDestroy: (game, prop) => {
            game.showBunkerLine?.('GANTRY COLLAPSE! PNEUMATIC ARMS CRASHED.');
            game.triggerCameraShake?.(0.08, 0.15);
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0x555555, count: 20, upward: 0.3 });
        }
    },

    // 10. Maintenance Tool Cart: Drops scrap and ammunition
    prop_maintenance_tool_cart: {
        hp: 20,
        canInteract: true,
        interactPrompt: '[E] SEARCH TOOL DRAWERS',
        onInteract: (game, _prop) => {
            game.addScrap?.(15);
            if (game.weaponClipAmmo !== undefined) {
                game.weaponClipAmmo = game.weaponClipSize ?? 30;
                game.emitWeaponClipState?.();
            }
            game.showBunkerLine?.('SCAVENGED: +15 WEAPON SCRAP & FULL MAGAZINE REFILL.');
            safePlaySound('toolbox_open', { volume: 0.5 });
            return true;
        },
        onDestroy: (game, prop) => {
            game.showBunkerLine?.('TOOL CART SHATTERED: SCATTERED HARDWARE.');
            game.addScrap?.(20);
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0x999999, count: 18, upward: 0.25 });
        }
    },

    // 11. Autopsy Dissection Slab: Extract tissue biopsy (+scrap, +5% infection)
    prop_autopsy_dissection_slab: {
        hp: 100,
        canInteract: true,
        interactPrompt: '[E] BIOPSY SPECIMEN TISSUE',
        onInteract: (game, prop) => {
            game.addScrap?.(25);
            if (game.playerVitals) {
                game.playerVitals.infection = Math.min(1.0, (game.playerVitals.infection ?? 0) + 0.05);
            }
            game.showBunkerLine?.('NEURAL CHITIN HARVESTED (+25 BIO-SCRAP, +5% SPORE EXPOSURE).');
            safePlaySound('flesh_squish', { volume: 0.6 });
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0x880022, count: 15, upward: 0.2 });
            return true;
        },
        onDestroy: (game, prop) => {
            game.showBunkerLine?.('DISSECTION SLAB PULVERIZED: VISCOUS SLIME COATING.');
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0x440011, count: 25, upward: 0.3 });
        }
    },

    // 12. Exhaust Blower Fan Hood: Overdrive clears spore clouds
    prop_exhaust_blower_fan_hood: {
        hp: 60,
        canInteract: true,
        interactPrompt: '[E] OVERDRIVE ROOM VENTILATION',
        onInteract: (game, prop) => {
            game.showBunkerLine?.('EXHAUST HOOD ENGAGED: ATMOSPHERIC GASES PURGED.');
            safePlaySound('fan_wind', { volume: 0.7 });
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0xeeeeee, count: 20, upward: 0.4 });
            return true;
        },
        onDestroy: (game, prop) => {
            game.showBunkerLine?.('EXHAUST FAN MOTOR SEIZED IN SMOKE.');
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0x333333, count: 15, upward: 0.3 });
        }
    },

    // 13. Overhead Cage Fluorescent: Sparks & local darkness
    prop_overhead_cage_fluorescent: {
        hp: 15,
        canInteract: false,
        onDestroy: (game, prop) => {
            game.showBunkerLine?.('FIXTURE SHATTERED: SHOWER OF ARC SPARKS.');
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0xffea00, count: 15, upward: -0.2 });
            safePlaySound('glass_break', { volume: 0.5 });
        }
    },

    // 14. Floor Drainage Sump Trough: Dredge sludge for brass / scrap
    prop_floor_drainage_sump_trough: {
        hp: 40,
        canInteract: true,
        interactPrompt: '[E] DREDGE SUMP GRATE',
        onInteract: (game, _prop) => {
            game.addScrap?.(10);
            game.showBunkerLine?.('RECOVERED 10 SCRAP CASINGS FROM OILY BILGE.');
            safePlaySound('water_slosh', { volume: 0.4 });
            return true;
        },
        onDestroy: (game, prop) => {
            game.showBunkerLine?.('SUMP GRATING COLLAPSED.');
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0x222222, count: 12, upward: 0.1 });
        }
    },

    // 15. Biomech Sphincter Hatch Vent: Living valve
    prop_biomech_sphincter_hatch_vent: {
        hp: 45,
        canInteract: true,
        interactPrompt: '[E] SEAL WITH BIO-FOAM',
        onInteract: (game, _prop) => {
            game.showBunkerLine?.('SPHINCTER VENT CAUTERIZED & PLUGGED.');
            safePlaySound('flesh_seal', { volume: 0.5 });
            return true;
        },
        onDestroy: (game, prop) => {
            game.showBunkerLine?.('BIOMECH HATCH SPASMS: CORROSIVE BILE VOMIT!');
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0x88ff00, count: 20, upward: 0.3 });
            applyBileInRadius(game, prop, BIOMECH_SYNERGY_TUNING.bileRadius);
        }
    },

    // 16. Biomech Tracheal Wall Pipe: Living peristaltic conduit
    prop_biomech_tracheal_wall_pipe: {
        hp: 35,
        canInteract: true,
        interactPrompt: '[E] TAP LIVING CONDUIT',
        onInteract: (game, _prop) => {
            game.addScrap?.(15);
            game.showBunkerLine?.('EXTRACTED 1× AMBER NUTRIENT GEL (+15 SCRAP).');
            safePlaySound('flesh_squish', { volume: 0.5 });
            return true;
        },
        onDestroy: (game, prop) => {
            game.showBunkerLine?.('TRACHEAL TUBE PUNCTURED! DIGESTIVE BILE SPRAY (+25% BONUS VULNERABILITY)');
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0xddff22, count: 20, upward: 0.3 });
            applyBileInRadius(game, prop, 4.5);
        }
    },

    // 17. Wall Cable Tray Swag: Overhead wire tray
    prop_wall_cable_tray_swag: {
        hp: 25,
        canInteract: false,
        onDestroy: (game, prop) => {
            game.showBunkerLine?.('CABLE TRAY COLLAPSED: DANGLING HIGH-VOLTAGE HARNESS!');
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0x44ddff, count: 20, upward: 0.3 });
            if (game.snails) {
                for (const snail of game.snails) {
                    if (!snail || !snail.isAlive) continue;
                    const d = Math.hypot(snail.x - prop.position.x, snail.z - prop.position.z);
                    if (d <= 3.5) {
                        game.applyPlayerDamageToEnemy?.(snail, 40, { element: 'shock' });
                    }
                }
            }
        }
    },

    // 18. Ceiling Crane Hoist: Drops claw hook with devastating kinetic impact
    prop_ceiling_crane_hoist: {
        hp: 80,
        canInteract: true,
        interactPrompt: '[E] OPERATE CRANE PENDANT',
        onInteract: (game, _prop) => {
            game.showBunkerLine?.('CRANE TRAVERSING MONORAIL.');
            safePlaySound('crane_motor', { volume: 0.6 });
            return true;
        },
        onDestroy: (game, prop) => {
            game.showBunkerLine?.('CRANE HOIST CABLE SEVERED! 3-TON CLAW CATASTROPHIC IMPACT (250 DMG)');
            game.triggerCameraShake?.(0.12, 0.25);
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0xcccccc, count: 35, upward: 0.5 });
            safePlaySound('metal_crash', { volume: 0.9 });
            if (game.snails) {
                for (const snail of game.snails) {
                    if (!snail || !snail.isAlive) continue;
                    const d = Math.hypot(snail.x - prop.position.x, snail.z - prop.position.z);
                    if (d <= 4.5) {
                        game.applyPlayerDamageToEnemy?.(snail, 250, { element: 'crush' });
                    }
                }
            }
        }
    },

    // 19. Vertebral Cable Riser: Cyber-spinal column
    prop_vertebral_cable_riser: {
        hp: 50,
        canInteract: true,
        interactPrompt: '[E] JACK INTO SPINAL NERVE BUNDLE',
        onInteract: (game, prop) => {
            game.showBunkerLine?.('NEURAL ECHO TELEMETRY SYNCHRONIZED: ENEMY POSITIONS REVEALED.');
            safePlaySound('neural_tap', { volume: 0.6 });
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0xffaa33, count: 18, upward: 0.25 });
            return true;
        },
        onDestroy: (game, prop) => {
            game.showBunkerLine?.('VERTEBRAL COLUMN SHATTERED INTO BONE SHRAPNEL.');
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0xeee0cb, count: 20, upward: 0.3 });
            if (game.snails) {
                for (const snail of game.snails) {
                    if (!snail || !snail.isAlive) continue;
                    const d = Math.hypot(snail.x - prop.position.x, snail.z - prop.position.z);
                    if (d <= 3.5) {
                        game.applyPlayerDamageToEnemy?.(snail, 25, { element: 'shrapnel' });
                    }
                }
            }
        }
    },

    // 2026-10-12 rebuild cohort. Physical weapon/cargo pickup remains owned
    // by its dedicated reducer; these are the placed-world machine actions.
    base_door_sealable_bulkhead: statefulInteraction(
        '[E] CYCLE SEALABLE BULKHEAD',
        (state) => `BULKHEAD: ${state === 'open' ? 'PASSAGE OPEN' : 'PRESSURE SEAL ENGAGED'}.`,
        { nextState: (_game, prop) => nextBinaryState(prop, 'open', 'closed'), solidForState: (state) => state !== 'open', sound: 'vault_open' }
    ),
    door_arch_guillotine_assembled: statefulInteraction(
        '[E] CYCLE GUILLOTINE ARCH',
        (state) => `GUILLOTINE ARCH: ${state === 'open' ? 'SLAB RETRACTED ABOVE CLEARANCE' : 'THRESHOLD BARRED'}.`,
        { hp: 70, nextState: (_game, prop) => nextBinaryState(prop, 'open', 'closed'), solidForState: (state) => state !== 'open', sound: 'vault_open' }
    ),
    weapon_flamethrower_case: statefulInteraction(
        '[E] OPEN INCENDIARY WEAPON CASE',
        (state) => `WEAPON CASE: ${state === 'open' ? 'LID RELEASED — M70 CRADLE ACCESSIBLE' : 'LID SECURED'}.`,
        { hp: 45, nextState: (_game, prop) => nextBinaryState(prop, 'open', 'closed'), sound: 'toolbox_open' }
    ),
    base_cot_installed: {
        hp: 40,
        canInteract: true,
        interactPrompt: '[E] REST ON FIELD COT',
        onInteract: (game) => {
            game.healPlayer?.(25);
            game.showBunkerLine?.('RESTED ON COT: FATIGUE CLEANSED. +25 HP.');
            safePlaySound('shrine_blessing', { volume: 0.6 });
            return true;
        }
    },
    ship_module_navigation_core: statefulInteraction(
        '[E] SPIN UP NAVIGATION GYRO',
        (state) => `NAVIGATION CORE: ${state === 'working' ? 'GYRO HOLDING A STAR FIX' : 'ROTOR BRAKED'}.`,
        { hp: 65, nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'power_hum' }
    ),
    ship_module_comms_transceiver: statefulInteraction(
        '[E] SWEEP COMMS ARRAY',
        (state) => `COMMS TRANSCEIVER: ${state === 'working' ? 'SCANNING EMERGENCY BANDS' : 'DISH PARKED'}.`,
        { hp: 55, nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'ui_scan_ping' }
    ),
    ship_module_engine_manifold: statefulInteraction(
        '[E] PURGE ENGINE MANIFOLD',
        (state) => `ENGINE MANIFOLD: ${state === 'working' ? 'THERMAL PURGE ACTIVE' : 'VALVES CLOSED'}.`,
        { hp: 70, nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'ambient_steam_hiss' }
    ),
    ship_module_life_support_core: statefulInteraction(
        '[E] CYCLE LIFE-SUPPORT CORE',
        (state) => `LIFE-SUPPORT CORE: ${state === 'on' ? 'AIR LOOP PRESSURIZING' : 'ISOLATED'}.`,
        { hp: 70, nextState: (_game, prop) => nextBinaryState(prop, 'on'), sound: 'power_hum' }
    ),
    base_o2_atmospheric_regulator: statefulInteraction(
        '[E] CYCLE O2 REGULATOR',
        (state) => `O2 REGULATOR: ${state === 'on' ? 'FLOW NOMINAL' : 'FLOW LOCKED'}.`,
        { hp: 50, nextState: (_game, prop) => nextBinaryState(prop, 'on'), sound: 'power_hum' }
    ),
    base_power_junction_box: statefulInteraction(
        '[E] ROUTE BASE POWER',
        (state) => `POWER JUNCTION: ${state === 'on' ? 'BRANCH ENERGIZED' : 'BRANCH ISOLATED'}.`,
        { hp: 35, nextState: (_game, prop) => nextBinaryState(prop, 'on'), sound: 'power_hum' }
    ),

    // 2026-10-14 Interactive World Expansion (60 props)
    geo_steam_manifold_actuator: statefulInteraction(
        '[E] TOGGLE STEAM MANIFOLD',
        (state) => `STEAM MANIFOLD: ${state === 'working' ? 'HIGH-PRESSURE VENT CYCLING' : 'SEALED'}.`,
        { hp: 60, nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'power_hum' }
    ),
    tallow_vaccine_alembic: statefulInteraction(
        '[E] EXTRACT CHITIN VACCINE',
        () => 'VACCINE ALEMBIC: REFINED INOCULANT SIPHONED. +25 HP.',
        { hp: 45, repeatable: false, nextState: () => 'spent', sound: 'liquid_drip', onUse: (game) => game.healPlayer?.(25) }
    ),
    hydro_mycelial_seed_vault: statefulInteraction(
        '[E] ACCESS SEED VAULT',
        () => 'SEED VAULT: CRYOGENIC SPORE CASSETTE RETRIEVED. +35 SCRAP.',
        { hp: 55, repeatable: false, nextState: () => 'spent', sound: 'vault_open', onUse: (game) => game.addScrap?.(35) }
    ),
    tallow_irrigation_sluice_gate: statefulInteraction(
        '[E] CRANK SLUICE GATE',
        (state) => `SLUICE GATE: ${state === 'open' ? 'NUTRIENT CHANNEL OPEN' : 'FLOW BARRED'}.`,
        { hp: 70, nextState: (_game, prop) => nextBinaryState(prop, 'open', 'closed'), solidForState: (state) => state !== 'open', sound: 'vault_open' }
    ),
    tallow_apothecary_dryer_rack: statefulInteraction(
        '[E] HARVEST MEDICINAL LICHEN',
        () => 'APOTHECARY DRYER: CURATIVE LICHEN HARVESTED. +15 HP, +20 SCRAP.',
        { hp: 40, repeatable: false, nextState: () => 'spent', sound: 'flesh_seal', onUse: (game) => { game.healPlayer?.(15); game.addScrap?.(20); } }
    ),
    geo_pressure_relief_siren: statefulInteraction(
        '[E] SOUND RELIEF SIREN',
        (state) => `RELIEF SIREN: ${state === 'working' ? 'DECOMPRESSION ALARM ACTIVE' : 'SILENCED'}.`,
        { hp: 45, nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'power_hum' }
    ),
    meridian_optic_nerve_patchbay: statefulInteraction(
        '[E] PATCH OPTIC FIBERS',
        () => 'OPTIC PATCHBAY: BIO-CAMERA FEEDS REROUTED. +25 SCRAP.',
        { hp: 50, repeatable: false, nextState: () => 'spent', sound: 'terminal_beep', onUse: (game) => game.addScrap?.(25) }
    ),
    substation_stepdown_transformer: statefulInteraction(
        '[E] ENGAGE STEPDOWN TRANSFORMER',
        (state) => `TRANSFORMER: ${state === 'working' ? 'HIGH-VOLTAGE SUBSTATION BUS ONLINE' : 'ISOLATED'}.`,
        { hp: 80, nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'power_hum' }
    ),
    meridian_servitor_recharge_cradle: statefulInteraction(
        '[E] DOCK CORRUPTED SERVITOR',
        () => 'RECHARGE CRADLE: POWER BUS CHARGED. COMPANION CAPACITOR FILLED. +30 SCRAP.',
        { hp: 60, repeatable: false, nextState: () => 'spent', sound: 'vault_open', onUse: (game) => game.addScrap?.(30) }
    ),
    meridian_logic_core_drum: statefulInteraction(
        '[E] CYCLE LOGIC DRUM',
        () => 'LOGIC CORE DRUM: MAGNETIC ARCHIVE DECODED. +30 SCRAP.',
        { hp: 65, repeatable: false, nextState: () => 'spent', sound: 'terminal_beep', onUse: (game) => game.addScrap?.(30) }
    ),
    substation_breaker_interlock: statefulInteraction(
        '[E] THROW BREAKER INTERLOCK',
        (state) => `BREAKER INTERLOCK: ${state === 'open' ? 'SECTOR POWER CUT' : 'GRID ENERGIZED'}.`,
        { hp: 55, nextState: (_game, prop) => nextBinaryState(prop, 'open', 'closed'), sound: 'power_hum' }
    ),
    meridian_soldering_hearth: statefulInteraction(
        '[E] USE SOLDERING HEARTH',
        () => 'SOLDERING HEARTH: PRECISION CYBERNETIC ALLOY SOLDERED. +20 SCRAP.',
        { hp: 45, repeatable: false, nextState: () => 'spent', sound: 'terminal_beep', onUse: (game) => game.addScrap?.(20) }
    ),
    vesper_ordnance_disarm_table: statefulInteraction(
        '[E] DISARM UNEXPLODED MORTAR',
        () => 'ORDNANCE TABLE: LIVE HEAVY MORTAR DEFUSED. +40 SCRAP.',
        { hp: 50, repeatable: false, nextState: () => 'spent', sound: 'vault_open', onUse: (game) => game.addScrap?.(40) }
    ),
    vesper_trench_warning_klaxon: statefulInteraction(
        '[E] SOUND TRENCH KLAXON',
        (state) => `TRENCH KLAXON: ${state === 'working' ? 'RAID ALERT BLARING' : 'QUIET'}.`,
        { hp: 45, nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'power_hum' }
    ),
    vesper_ballistic_chronograph: statefulInteraction(
        '[E] CALIBRATE BALLISTICS',
        () => 'BALLISTIC CHRONOGRAPH: MUZZLE VELOCITIES CALIBRATED. AMMUNITION ENRICHED.',
        { hp: 40, repeatable: false, nextState: () => 'spent', sound: 'terminal_beep', onUse: (game) => game.addScrap?.(25) }
    ),
    vesper_mortar_loading_cradle: statefulInteraction(
        '[E] LOAD HEAVY MORTAR',
        (state) => `MORTAR CRADLE: ${state === 'working' ? 'SHELL CHAMBERED' : 'BREECH RESTING'}.`,
        { hp: 60, nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'vault_open' }
    ),
    vesper_dogtag_retrieval_crypt: statefulInteraction(
        '[E] RETRIEVE SOLDIER DOGTAGS',
        () => 'RETRIEVAL CRYPT: GARRISON HONORS CATALOGUED. +30 SCRAP.',
        { hp: 55, repeatable: false, nextState: () => 'spent', sound: 'vault_open', onUse: (game) => game.addScrap?.(30) }
    ),
    vesper_barricade_welding_rig: statefulInteraction(
        '[E] WELD BASTION REINFORCEMENT',
        (state) => `WELDING RIG: ${state === 'working' ? 'ARC TORCH ENGAGED' : 'GAS BLED'}.`,
        { hp: 50, nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'power_hum' }
    ),
    corp_biometric_wall_safe: statefulInteraction(
        '[E] CRACK BIOMETRIC SAFE',
        () => 'WALL SAFE: REVENUE TOKENS RECOVERED. +45 SCRAP.',
        { hp: 50, repeatable: false, nextState: () => 'spent', sound: 'vault_open', onUse: (game) => game.addScrap?.(45) }
    ),
    corp_quantum_ledger_podium: statefulInteraction(
        '[E] AUDIT QUANTUM LEDGER',
        () => 'QUANTUM LEDGER: EMBEZZLEMENT OFFSETS REVEALED. +35 SCRAP.',
        { hp: 50, repeatable: false, nextState: () => 'spent', sound: 'terminal_beep', onUse: (game) => game.addScrap?.(35) }
    ),
    corp_compliance_choker_bench: statefulInteraction(
        '[E] UNLOCK COMPLIANCE CHOKER',
        () => 'COMPLIANCE BENCH: DEBTOR COLLAR RELEASED. +25 SCRAP.',
        { hp: 55, repeatable: false, nextState: () => 'spent', sound: 'vault_open', onUse: (game) => game.addScrap?.(25) }
    ),
    corp_asset_incinerator_chute: statefulInteraction(
        '[E] CYCLE INCINERATOR CHUTE',
        (state) => `INCINERATOR CHUTE: ${state === 'working' ? 'THERMAL BURN ACTIVE' : 'SEALED'}.`,
        { hp: 65, nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'vault_open' }
    ),
    corp_cryo_transport_coffin: statefulInteraction(
        '[E] UNSEAL CRYO COFFIN',
        () => 'CRYO COFFIN: EXECUTIVE PASSENGER RECLAIMED. +40 SCRAP.',
        { hp: 60, repeatable: false, nextState: () => 'spent', sound: 'vault_open', onUse: (game) => game.addScrap?.(40) }
    ),
    corp_executive_whisper_booth: statefulInteraction(
        '[E] ENTER WHISPER BOOTH',
        (state) => `WHISPER BOOTH: ${state === 'open' ? 'SECLUSION DOOR RELEASED' : 'SOUNDPROOFING ACTIVE'}.`,
        { hp: 65, nextState: (_game, prop) => nextBinaryState(prop, 'open', 'closed'), solidForState: (state) => state !== 'open', sound: 'vault_open' }
    ),
    suture_flesh_mending_bath: statefulInteraction(
        '[E] SUBMERGE IN MENDING BATH',
        () => 'MENDING BATH: CARNAL TISSUE REGENERATED. +40 HP.',
        { hp: 60, repeatable: false, nextState: () => 'spent', sound: 'liquid_drip', onUse: (game) => game.healPlayer?.(40) }
    ),
    suture_larval_nursery_urn: statefulInteraction(
        '[E] HARVEST LARVAL SPECIMEN',
        () => 'NURSERY URN: SYMBIOTE LARVA EXTRACTED. +25 SCRAP.',
        { hp: 45, repeatable: false, nextState: () => 'spent', sound: 'flesh_seal', onUse: (game) => game.addScrap?.(25) }
    ),
    relay_harmonic_tuning_fork: statefulInteraction(
        '[E] STRIKE TUNING FORK',
        (state) => `TUNING FORK: ${state === 'working' ? 'RESONANT ACOUSTIC TONE ACTIVE' : 'DAMPED'}.`,
        { hp: 60, nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'power_hum' }
    ),
    relay_acoustic_diaphragm: statefulInteraction(
        '[E] PULSE ACOUSTIC DIAPHRAGM',
        () => 'ACOUSTIC DIAPHRAGM: QUEEN HEARTBEAT ECHO DISCHARGED. +25 SCRAP.',
        { hp: 65, repeatable: false, nextState: () => 'spent', sound: 'flesh_seal', onUse: (game) => game.addScrap?.(25) }
    ),
    carapace_chitin_press: statefulInteraction(
        '[E] OPERATE CHITIN PRESS',
        (state) => `CHITIN PRESS: ${state === 'working' ? 'HYDRAULIC DIE STAMPING ARMOR' : 'RETRACTED'}.`,
        { hp: 75, nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'vault_open', onUse: (game) => game.addScrap?.(30) }
    ),
    carapace_ossuary_anvil: statefulInteraction(
        '[E] FORGE CHITIN BLADE',
        () => 'OSSUARY ANVIL: SKELETAL WEAPON COMPOSITE HAMMERED. +25 SCRAP.',
        { hp: 50, repeatable: false, nextState: () => 'spent', sound: 'vault_open', onUse: (game) => game.addScrap?.(25) }
    ),
    vass_translation_phonograph: statefulInteraction(
        '[E] PLAY TRANSLATION CYLINDER',
        () => 'TRANSLATION PHONOGRAPH: DR. VASS XENOBIO LOG BROADCAST.',
        { hp: 45, repeatable: false, nextState: () => 'spent', sound: 'terminal_beep', onUse: (game) => game.addScrap?.(25) }
    ),
    vass_bio_centrifuge_rack: statefulInteraction(
        '[E] SPIN BIO-CENTRIFUGE',
        (state) => `BIO-CENTRIFUGE: ${state === 'working' ? 'SEPARATING ROYAL JELLY FRACTIONS' : 'RESTING'}.`,
        { hp: 55, nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'power_hum', onUse: (game) => game.addScrap?.(35) }
    ),
    vass_neural_sync_helmet: statefulInteraction(
        '[E] INTERFACE WITH NEURAL HELMET',
        () => 'NEURAL HELMET: HIVE FREQUENCIES SYNCHRONIZED. LORE LOG UNLOCKED.',
        { hp: 40, repeatable: false, nextState: () => 'spent', sound: 'terminal_beep', onUse: (game) => game.addScrap?.(30) }
    ),
    vass_hybrid_blood_synthesizer: statefulInteraction(
        '[E] CYCLE BLOOD SYNTHESIZER',
        () => 'BLOOD SYNTHESIZER: HYBRID SERUM FORMULATED. +30 HP.',
        { hp: 60, repeatable: false, nextState: () => 'spent', sound: 'liquid_drip', onUse: (game) => game.healPlayer?.(30) }
    ),
    vass_containment_bell_jar: statefulInteraction(
        '[E] INTERFACE WITH SPECIMEN',
        (state) => `BELL JAR: ${state === 'open' ? 'VACUUM BROKEN — SPECIMEN RELEASED' : 'SPECIMEN SEALED UNDER VACUUM'}.`,
        { hp: 50, nextState: (_game, prop) => nextBinaryState(prop, 'open', 'closed'), sound: 'liquid_drip' }
    ),
    vass_dissection_stereomicroscope: statefulInteraction(
        '[E] EXAMINE EMBRYONIC SLICE',
        () => 'STEREOMICROSCOPE: EMBRYONIC CARAPACE WEAKPOINTS RECORDED. +25 SCRAP.',
        { hp: 45, repeatable: false, nextState: () => 'spent', sound: 'terminal_beep', onUse: (game) => game.addScrap?.(25) }
    ),
    tina_vocal_mimic_synthesizer: statefulInteraction(
        '[E] DISASSEMBLE VOCAL SYNTHESIZER',
        () => 'VOCAL SYNTHESIZER: DISSECTED CASSETTE & LARYNX EXTRACTED. +30 SCRAP.',
        { hp: 45, repeatable: false, nextState: () => 'spent', sound: 'terminal_beep', onUse: (game) => game.addScrap?.(30) }
    ),
    tina_cosmetic_skin_loom: statefulInteraction(
        '[E] INSPECT SKIN WEAVING LOOM',
        () => 'SKIN WEAVING LOOM: SYNTHETIC HUMAN FACE MASK UNCOVERED.',
        { hp: 55, repeatable: false, nextState: () => 'spent', sound: 'flesh_seal', onUse: (game) => game.addScrap?.(25) }
    ),
    tina_forged_council_ballot_box: statefulInteraction(
        '[E] PRY OPEN BALLOT BOX',
        () => 'BALLOT BOX: FORGED MUNICIPAL IDENTIFICATION SLUGS FOUND. +25 SCRAP.',
        { hp: 45, repeatable: false, nextState: () => 'spent', sound: 'vault_open', onUse: (game) => game.addScrap?.(25) }
    ),
    tina_shedding_cocoon_niche: statefulInteraction(
        '[E] COLLECT SHED CARAPACE SAMPLE',
        () => 'COCOON NICHE: MOLTED CARAPACE SPECIMEN RETRIEVED.',
        { hp: 60, repeatable: false, nextState: () => 'spent', sound: 'flesh_seal', onUse: (game) => game.addScrap?.(25) }
    ),
    tina_secret_distress_beacon: statefulInteraction(
        '[E] DISABLE FALSE BEACON',
        (state) => `DISTRESS BEACON: ${state === 'working' ? 'TRANSMITTING LURE COORDINATES' : 'DECOY DISABLED'}.`,
        { hp: 45, nextState: (_game, prop) => nextBinaryState(prop, 'working', 'disabled'), sound: 'terminal_beep' }
    ),
    chasm_seismic_geophone_station: statefulInteraction(
        '[E] READ SEISMIC GEOPHONE',
        () => 'GEOPHONE STATION: TECTONIC FAULT TREMORS MAPPED. +25 SCRAP.',
        { hp: 50, repeatable: false, nextState: () => 'spent', sound: 'terminal_beep', onUse: (game) => game.addScrap?.(25) }
    ),
    chasm_cable_traversal_winch: statefulInteraction(
        '[E] ENGAGE TRAVERSAL WINCH',
        (state) => `TRAVERSAL WINCH: ${state === 'working' ? 'ZIP-LINE CABLE REELING ACROSS ABYSS' : 'LOCKED'}.`,
        { hp: 70, nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'power_hum' }
    ),
    chasm_abyss_sounding_mortar: statefulInteraction(
        '[E] FIRE SOUNDING MORTAR',
        () => 'SOUNDING MORTAR: ACOUSTIC FLARE DISCHARGED INTO THE ABYSS.',
        { hp: 55, repeatable: false, nextState: () => 'spent', sound: 'vault_open', onUse: (game) => game.addScrap?.(30) }
    ),
    chasm_steam_whistle_buoy: statefulInteraction(
        '[E] SOUND STEAM BUOY',
        (state) => `STEAM BUOY: ${state === 'working' ? 'BLIZZARD FOG WHISTLE SOUNDING' : 'IDLE'}.`,
        { hp: 55, nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'power_hum' }
    ),
    chasm_hanging_cage_crane: statefulInteraction(
        '[E] OPERATE CAGE CRANE',
        (state) => `CAGE CRANE: ${state === 'open' ? 'DESCENT ELEVATOR LOWERED TO SUB-CHASM' : 'CRANE CRADLED'}.`,
        { hp: 90, nextState: (_game, prop) => nextBinaryState(prop, 'open', 'closed'), sound: 'vault_open' }
    ),
    chasm_geothermal_survey_transit: statefulInteraction(
        '[E] ALIGN SURVEY TRANSIT',
        () => 'SURVEY TRANSIT: CHASM THERMAL ANOMALIES CHARTED. +25 SCRAP.',
        { hp: 45, repeatable: false, nextState: () => 'spent', sound: 'terminal_beep', onUse: (game) => game.addScrap?.(25) }
    ),
    scout_tachyon_radar_mast: statefulInteraction(
        '[E] CALIBRATE RADAR MAST',
        (state) => `RADAR MAST: ${state === 'working' ? 'SUBTERRANEAN SWEEP ACTIVE' : 'ANTENNA PARKED'}.`,
        { hp: 75, nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'power_hum', onUse: (game) => game.addScrap?.(30) }
    ),
    scout_ejection_pod_chassis: statefulInteraction(
        '[E] SALVAGE EJECTION POD',
        () => 'EJECTION POD: HATCH BLOWN. SURVIVAL RATIONS RETRIEVED. +35 SCRAP.',
        { hp: 65, repeatable: false, nextState: () => 'spent', sound: 'vault_open', onUse: (game) => game.addScrap?.(35) }
    ),
    tank_reactive_armor_forge: statefulInteraction(
        '[E] FORGE REACTIVE ARMOR',
        (state) => `ARMOR FORGE: ${state === 'working' ? 'REACTIVE COMPOSITE HYDRAULICS CYCLING' : 'RESTING'}.`,
        { hp: 70, nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'vault_open', onUse: (game) => game.addScrap?.(35) }
    ),
    tank_kinetic_ram_breech: statefulInteraction(
        '[E] CYCLE KINETIC BREECH',
        (state) => `KINETIC BREECH: ${state === 'open' ? 'RAM BREECH OPEN' : 'SLAG SEAL LOCKED'}.`,
        { hp: 70, nextState: (_game, prop) => nextBinaryState(prop, 'open', 'closed'), sound: 'vault_open' }
    ),
    engineer_magnetic_bottle_cell: statefulInteraction(
        '[E] STABILIZE MAGNETIC CELL',
        (state) => `MAGNETIC BOTTLE: ${state === 'working' ? 'THERMONUCLEAR PLASMA CORE CONFINED' : 'BANKED'}.`,
        { hp: 75, nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'power_hum' }
    ),
    engineer_robotic_welding_arm: statefulInteraction(
        '[E] CALIBRATE FABRICATION ARM',
        () => 'FABRICATION ARM: WELDING BEAM SYNCHRONIZED. COMPANION ARMOR RESTORED.',
        { hp: 65, repeatable: false, nextState: () => 'spent', sound: 'power_hum', onUse: (game) => game.healPlayer?.(30) }
    ),
    evac_avionics_gyro_gimbal: statefulInteraction(
        '[E] SPIN UP INERTIAL GYROSCOPE',
        (state) => `AVIONICS GIMBAL: ${state === 'working' ? 'ORBITAL TRAJECTORY LOCKED' : 'ROTOR BRAKED'}.`,
        { hp: 65, nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'terminal_beep' }
    ),
    evac_cryo_hypergolic_manifold: statefulInteraction(
        '[E] ENGAGE FUEL UMBILICAL',
        (state) => `CRYOGENIC MANIFOLD: ${state === 'working' ? 'HYPERGOLIC COUNTDOWN PRIMED' : 'VALVES CLOSED'}.`,
        { hp: 70, nextState: (_game, prop) => nextBinaryState(prop, 'working'), sound: 'vault_open' }
    ),
    evac_cabin_co2_scrubber: statefulInteraction(
        '[E] REPLACE RECIRCULATION CANISTER',
        () => 'CO2 SCRUBBER: FRESH CHEMICAL CANISTER INSTALLED. ATMOSPHERE SAFE.',
        { hp: 55, repeatable: false, nextState: () => 'spent', sound: 'vault_open', onUse: (game) => game.healPlayer?.(20) }
    ),
    evac_manual_abort_detonator: statefulInteraction(
        '[E] PULL LAUNCH ABORT DETONATOR',
        () => 'ABORT DETONATOR: WIRE-GLASS SHATTERED. SCORCHED SKY INITIATED.',
        { hp: 50, repeatable: false, nextState: () => 'spent', sound: 'vault_open', onUse: (game) => game.triggerCameraShake?.(0.8, 0.6) }
    ),
    evac_cargo_ballast_scale: statefulInteraction(
        '[E] VERIFY PASSENGER WEIGHT',
        () => 'BALLAST SCALE: MANIFEST PAYLOAD VERIFIED AGAINST 4-SEAT CEILING. +30 SCRAP.',
        { hp: 50, repeatable: false, nextState: () => 'spent', sound: 'terminal_beep', onUse: (game) => game.addScrap?.(30) }
    ),
    mothership_docking_umbilical_collar: statefulInteraction(
        '[E] ENGAGE MOTHERSHIP UMBILICAL',
        (state) => `MOTHERSHIP UMBILICAL: ${state === 'open' ? 'BIOMECHANICAL PETALS DILATED — DOCKING FINALIZED' : 'AIRLOCK SEALED'}.`,
        { hp: 95, nextState: (_game, prop) => nextBinaryState(prop, 'open', 'closed'), sound: 'vault_open' }
    ),

    // 20. Cuttable Procedural Splines: Wires, Biomech Veins, Cryo Pipes, Camp Vines.
    //     Shoot them or cut them with E; either way they sever (threeGame.severSplineRun).
    spline_wire_bunker: {
        hp: 15,
        canInteract: true,
        interactPrompt: '[E] CUT POWER CABLE',
        // Cut by hand: the same break as shooting it (severed halves, effects, co-op).
        onInteract: (game, sprite) => Boolean(game.breakScatterProp?.(sprite)),
        onDestroy: (game, prop) => {
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0x38bdf8, count: 14, upward: 0.35, spread: 1.8 });
            safePlaySound('ambient_sparks', { volume: 0.7, playbackRate: 1.2 });
            game.triggerCameraShake?.(0.04, 0.1);
            if (game.snails) {
                for (const snail of game.snails) {
                    if (!snail || !snail.isAlive) continue;
                    const d = Math.hypot(snail.x - prop.position.x, snail.z - prop.position.z);
                    if (d <= 3.5) {
                        game.applyPlayerDamageToEnemy?.(snail, 25, { element: 'electric' });
                    }
                }
            }
        }
    },
    spline_vein_bio: {
        hp: 15,
        canInteract: true,
        interactPrompt: '[E] SEVER VEIN',
        // Cut by hand: the same break as shooting it (severed halves, effects, co-op).
        onInteract: (game, sprite) => Boolean(game.breakScatterProp?.(sprite)),
        onDestroy: (game, prop) => {
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0x84cc16, count: 18, upward: 0.3, spread: 1.5 });
            safePlaySound('enemy_hit_soft', { volume: 0.8, playbackRate: 0.6 });
            applyBileInRadius(game, prop, 3.5);
        }
    },
    spline_pipe_cryo: {
        hp: 20,
        canInteract: true,
        interactPrompt: '[E] CRACK COOLANT PIPE',
        // Cut by hand: the same break as shooting it (severed halves, effects, co-op).
        onInteract: (game, sprite) => Boolean(game.breakScatterProp?.(sprite)),
        onDestroy: (game, prop) => {
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0xa5f3fc, count: 20, upward: 0.4, spread: 2.0 });
            safePlaySound('ambient_steam_hiss', { volume: 0.7, playbackRate: 0.9 });
            if (game.snails) {
                for (const snail of game.snails) {
                    if (!snail || !snail.isAlive) continue;
                    const d = Math.hypot(snail.x - prop.position.x, snail.z - prop.position.z);
                    if (d <= 4.0) {
                        game.applyPlayerDamageToEnemy?.(snail, 20, { element: 'cryo' });
                    }
                }
            }
        }
    },
    spline_vine_camp: {
        hp: 10,
        canInteract: true,
        interactPrompt: '[E] CUT VINE',
        // Cut by hand: the same break as shooting it (severed halves, effects, co-op).
        onInteract: (game, sprite) => Boolean(game.breakScatterProp?.(sprite)),
        onDestroy: (game, prop) => {
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0xd97706, count: 10, upward: 0.2, spread: 1.2 });
            safePlaySound('metal_stress', { volume: 0.4, playbackRate: 2.2 });
        }
    }
});

/**
 * Handles custom destruction logic for a prop.
 * Returns true if a custom destruction hook was handled.
 */
export function handleCustomPropDestruction(game, propKey, propPosition, propObject = null) {
    const spec = PROP_INTERACTION_SPECS[propKey];
    if (spec && typeof spec.onDestroy === 'function') {
        const fakeProp = {
            position: propPosition || (propObject?.position ?? { x: 0, z: 0 }),
            userData: propObject?.userData || { type: propKey }
        };
        spec.onDestroy(game, fakeProp);
        return true;
    }
    return false;
}

/**
 * The catalogue key a prop behaves as. A 2D type with no spec of its own that
 * draws as a catalogue model (WORLD_3D_MODEL_ALIASES, e.g. a camp repair rig
 * drawn as the maintenance tool cart) takes that model's interaction, so it
 * acts like what the player sees.
 */
export function interactionSpecKeyFor(data) {
    // Installed base modules may reuse a catalogue model while providing a
    // more specific interaction (the Blackjack cabinet renders with the
    // ordinary arcade GLB). Prefer that authored identity when present.
    const definition = data?.definitionId;
    if (definition && PROP_INTERACTION_SPECS[definition]) return definition;
    const key = data?.type || data?.modelKey || data?.propKey;
    if (key && PROP_INTERACTION_SPECS[key]) return key;
    const model = data?.world3dModelType;
    return model && PROP_INTERACTION_SPECS[model] ? model : key;
}

/**
 * Finds the nearest interactable prop to the player.
 */
export function findNearestInteractableProp(game, maxDist = 2.5) {
    if (!game?.player || !Array.isArray(game.scatterSprites)) return null;
    const px = game.player.position.x;
    const pz = game.player.position.z;

    // Check player facing orientation
    const yaw = game.facingYaw ?? game.player.rotation?.y ?? null;
    let forwardX = 0;
    let forwardZ = 0;
    const hasFacing = Number.isFinite(yaw);
    if (hasFacing) {
        forwardX = Math.sin(yaw);
        forwardZ = Math.cos(yaw);
    }

    let nearest = null;
    let minScore = Infinity;

    for (const sprite of game.scatterSprites) {
        if (!sprite || sprite.userData?.burstTriggered) continue;
        const propKey = interactionSpecKeyFor(sprite.userData);
        const spec = sprite.userData?.interactionSpec || PROP_INTERACTION_SPECS[propKey]
            || genericInteractionSpec(sprite.userData?.world3dModelType ?? propKey, sprite);
        if (!spec || !spec.canInteract) continue;
        if (isSpentProp(game, sprite)) continue;

        const dx = sprite.position.x - px;
        const dz = sprite.position.z - pz;
        const d = Math.hypot(dx, dz);
        if (d > maxDist) continue;

        let score = d;
        if (hasFacing && d > 0.001) {
            const dirX = dx / d;
            const dirZ = dz / d;
            const dot = dirX * forwardX + dirZ * forwardZ;
            // dot ranges from 1.0 (directly in front) to -1.0 (directly behind).
            // Strongly penalize props behind the player so props in front take priority.
            const anglePenalty = dot >= 0 ? (1.0 - 0.3 * dot) : (1.0 - 1.5 * dot);
            score = d * anglePenalty;
        }

        if (score < minScore) {
            minScore = score;
            nearest = { sprite, spec, propKey, distance: d };
        }
    }

    return nearest;
}

/**
 * Executes interaction on a prop.
 */
export function executeCustomPropInteraction(game, nearestInfo) {
    if (!nearestInfo || !nearestInfo.spec || typeof nearestInfo.spec.onInteract !== 'function') {
        return false;
    }
    const outcome = nearestInfo.spec.onInteract(game, nearestInfo.sprite);
    const result = outcome && typeof outcome === 'object' ? outcome : { success: Boolean(outcome) };
    const success = Boolean(result.success);
    if (success) {
        applyPropInteractionState(nearestInfo.sprite, result);
        const emitterMode = result.fxMode ?? result.state;
        if (emitterMode != null) {
            game.worldEmitterRuntime?.applyMode?.(nearestInfo.sprite, emitterMode);
        } else {
            const fx = propWorldRoot(nearestInfo.sprite)?.userData?.propFx;
            if (fx) game.worldEmitterRuntime?.applyAction?.(nearestInfo.sprite, fx.enabled ? 'enable' : 'disable');
        }
        if (result.state == null) game.acknowledgePropExperience?.(nearestInfo.sprite);
        else game.acknowledgePropExperience?.(nearestInfo.sprite, { toggleArticulation: false });
        nearestInfo.sprite.userData.hasBeenInteracted = result.spent ?? !nearestInfo.spec.repeatable;
        const key = nearestInfo.sprite.userData?.scatterKey || nearestInfo.sprite.userData?.dressingStableId;
        if (key && (result.state != null || result.fxMode != null || typeof result.solid === 'boolean')) {
            (game.propInteractionStates ??= new Map()).set(key, {
                state: result.state,
                fxMode: result.fxMode,
                solid: result.solid
            });
            if (game.isMultiplayer) {
                game.broadcastSharedWorldEvent?.('prop-interacted', {
                    key,
                    state: result.state,
                    fxMode: result.fxMode,
                    solid: result.solid,
                    x: nearestInfo.sprite.position?.x,
                    y: nearestInfo.sprite.position?.y,
                    z: nearestInfo.sprite.position?.z,
                    rotY: nearestInfo.sprite.rotation?.y
                });
            }
        }
        if (!nearestInfo.spec.repeatable && !nearestInfo.sprite.userData.interactionSpec && key) {
            (game.spentPropScatterKeys ??= new Set()).add(key);
        }
    }
    return success;
}

export function interactWithCustomProp(game, nearestInfo) {
    if (!nearestInfo || !nearestInfo.spec || typeof nearestInfo.spec.onInteract !== 'function') {
        return false;
    }
    const propType = nearestInfo.sprite?.userData?.type ?? nearestInfo.sprite?.userData?.world3dModelType;
    const preset = resolveInteractionVignettePreset(propType, nearestInfo.spec);
    if (game?.interactionVignette && preset && !game.interactionVignette.isActive()) {
        return game.interactionVignette.startVignette({
            sprite: nearestInfo.sprite,
            spec: nearestInfo.spec,
            preset,
            onComplete: () => {
                executeCustomPropInteraction(game, nearestInfo);
            }
        });
    }
    return executeCustomPropInteraction(game, nearestInfo);
}

/** Applies the visual/collision portion of a local or replicated interaction. */
export function applyPropInteractionState(sprite, result = {}) {
    if (!sprite?.userData || !result) return false;
    const root = propWorldRoot(sprite);
    if (result.state != null) {
        sprite.userData.propState = String(result.state);
        root?.userData?.propExperience?.setState?.(result.state);
    }
    if (result.fxMode != null) root?.userData?.propFx?.setMode?.(result.fxMode);
    if (typeof result.solid === 'boolean') sprite.userData.isSolidProp = result.solid;
    return true;
}

// A catalogue prop (PROP_INTERACTION_SPECS) pays out once: it is a cache of
// scrap, oxygen or ammo, not a vending machine, and its key outlives the
// chunk so walking away and back does not refill it. A prop that carries its
// own interactionSpec (a critical-service wreck) is a service and stays usable.
function isSpentProp(game, sprite) {
    const data = sprite.userData ?? {};
    if (data.interactionSpec) return false;
    const key = interactionSpecKeyFor(data);
    const spec = PROP_INTERACTION_SPECS[key] ?? genericInteractionSpec(data.world3dModelType ?? key, sprite);
    if (spec?.repeatable) return false;
    return Boolean(data.hasBeenInteracted || (data.scatterKey && game.spentPropScatterKeys?.has(data.scatterKey)));
}
