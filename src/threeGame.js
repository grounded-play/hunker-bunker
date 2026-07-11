import * as THREE from 'three';
import { BankManager, O2_GENERATOR_UPGRADES, TIER2_UPGRADE_ORDER, TIER2_UPGRADE_CONFIGS, WEAPON_UPGRADE_ORDER, WEAPON_UPGRADES_CONFIG, CLASS_SKILL_TREES, shellPriceOf } from './bank.js';
import { MarkovGenerator } from './generator.js';
import { BaseLights } from './baseLights.js';
import { FabricationFoundry } from './foundry.js';
import { CaveEntrance } from './caveEntrance.js';
import { SurvivorCamp } from './camp.js';
import { KeyedVideoSprite } from './KeyedVideoSprite.js';
import {
    ACT2_CAMP_LABELS,
    ACT2_CAMP_MAX_LEVEL,
    ACT2_HIVE_RESCUE_BOND_THRESHOLD,
    ACT2_HIVE_SITES,
    ACT2_MAX_BOND,
    ACT2_RECRUIT_BOND_THRESHOLD,
    buildAct2Manifest,
    campFinalUrgeCost,
    campSupportCost,
    getBoardingCampId as getAct2BoardingCampId,
    getClassCampOrder
} from './act2.js';
import { HiveSite } from './hiveSite.js';
import { leaderKeyFromName, nextDialogueBeat, isFinalStage } from './data/campDialogue.js';
import { blackBoxStore } from './blackBox.js';
import { ARC_PRELUDE_ENABLED } from './featureFlags.js';
import { pickTerminalEvent } from './data/terminalEvents.js';
import { getDialogueLine } from './data/dialogueLines.js';
import { getEnemyStats } from './data/enemies.js';
import { DEPTH_TIER_NAMES, getDepthLootConfig } from './data/loot.js';
import { BunkerDirector } from './director.js';
import { getAct2ClassPerks as getAct2ClassPerksConfig, mergeCampVerbEffects } from './campEconomy.js';
import { humanityDecayProgress } from './vitals.js';
import { applyCampPayoutEffects } from './runModifiers.js';
import { applyBlackChromaKey } from './textureKeying.js';
import { LANDFORMS, pickLandform, applyLandform, applyCanyonCollapse, connectPortalsInward } from './landforms.js';
import { buildUnifiedSkillTree, getBranchConnectors, TREE_BRANCHES } from './skillTree.js';
import { pickLoreDropForSite, getFoundLoreKeys, markLoreDropFound } from './loreDrops.js';


const PLAYER_COLORS = {
    SCOUT: 0x7dff5a,
    TANK: 0xffb700,
    ENGINEER: 0x00e5ff
};

const PLAYER_SPRITESHEET_PATHS = {
    SCOUT: '/Scout.full.jpeg',
    TANK: '/Tank.full.jpeg',
    ENGINEER: '/Eng.Full.jpeg'
};

const PLAYER_SPRITE_COLUMNS = 4;
const PLAYER_SPRITE_ROWS = 4;
const PLAYER_WALK_FRAME_COUNT = 2;
const PLAYER_SPRITE_FRAME_REPEAT_X = 1 / PLAYER_SPRITE_COLUMNS;
const PLAYER_SPRITE_FRAME_REPEAT_Y = 1 / PLAYER_SPRITE_ROWS;
// Packed 8-direction sheet: each entry defines a direction cell pair
// (row + baseColumn), where frame 0/1 are baseColumn/baseColumn+1.
// Octant order from atan2(axisZ, axisX):
// +X, +X+Z, +Z, -X+Z, -X, -X-Z, -Z, +X-Z
const PLAYER_SPRITE_DIRECTION_CELLS = Object.freeze([
    Object.freeze({ row: 1, baseColumn: 2 }),
    Object.freeze({ row: 3, baseColumn: 2 }),
    Object.freeze({ row: 3, baseColumn: 0 }),
    Object.freeze({ row: 2, baseColumn: 2 }),
    Object.freeze({ row: 2, baseColumn: 0 }),
    Object.freeze({ row: 1, baseColumn: 0 }),
    Object.freeze({ row: 0, baseColumn: 2 }),
    Object.freeze({ row: 0, baseColumn: 0 })
]);
const PLAYER_DEFAULT_DIRECTION_INDEX = 2;
const TANK_FLIPPED_DIRECTION_INDICES = new Set([4]);
// Twin-stick paper-doll: the body sprite is cut at the waist into two stacked
// billboards. The bottom (legs) follows movement input; the top (torso/head)
// rotates independently to track the aim/mouse. This is the fraction of the
// frame height that belongs to the legs.
const PLAYER_SPRITE_WAIST_SPLIT = 0.5;
const BUILD_STRUCTURE_GRID_SIZE = 2;
const BUILD_STRUCTURE_FRAME_REPEAT = 1 / BUILD_STRUCTURE_GRID_SIZE;
const RADAR_DISH_GRID_SIZE = 2;
const RADAR_DISH_FRAME_COUNT = RADAR_DISH_GRID_SIZE * RADAR_DISH_GRID_SIZE;
const SPRITE_ANIMATION_SPEED = 12;
const SUIT_LIGHT_BASE_INTENSITY = 4.2;
const SUIT_LIGHT_BASE_DISTANCE = 14.4;
const SUIT_CONE_LIGHT_COLOR = 0xf2efe2;
const SUIT_CONE_LIGHT_DISTANCE = 13.8;
const SUIT_CONE_LIGHT_ANGLE = Math.PI * 0.32;
const SUIT_CONE_VISUAL_DISTANCE = 12.4;
const SUIT_CONE_VISUAL_WIDTH = 10.6;
// The visible beam is a fan of this many radial segments; each segment is
// raycast against the walls every frame so the beam is occluded per-direction
// (wrapping corners, carving shadow wedges) instead of uniformly shrinking.
const SUIT_CONE_SEGMENTS = 22;
const SUIT_CONE_VISUAL_OPACITY = 0.13;
const SUIT_LOCAL_LIGHT_POOL_RADIUS = 5.7;
const SUIT_LOCAL_LIGHT_POOL_OPACITY = 0.68;
const SUIT_LIGHT_EMITTER_HEIGHT = 1.35;
const SUIT_LIGHT_WALL_PADDING = 0.35;
const O2_SAFE_LIGHT_COLOR = 0xb9fbff;
const O2_SAFE_FILL_OPACITY = 0.16;
const FOUNDRY_DISCOVERY_MIN_DISTANCE = 38;
const FOUNDRY_DISCOVERY_MAX_DISTANCE = 58;
// The Act-1 finale cave spawns well past the BIO-sector reactor site (z≈176)
// so recovering the "final ship component" is a genuine expedition.
const CAVE_DISCOVERY_MIN_DISTANCE = 205;
const CAVE_DISCOVERY_MAX_DISTANCE = 245;
const MENU_SHOWROOM_FLOOR_SIZE = 96;
const MENU_SHOWROOM_FLOOR_OFFSET_X = 8;
const MENU_SHOWROOM_FLOOR_OFFSET_Z = 8;
const PICKUP_DISTRIBUTION = {
    clustered: 0.7,
    transitional: 0.2,
    stray: 0.1
};
const PICKUP_TYPES = [
    { type: 'health', weight: 0.35 },
    { type: 'ammo', weight: 0.35 },
    { type: 'weapon', weight: 0.18 },
    { type: 'coin', weight: 0.12 }
];
const CLASS_STATS = {
    SCOUT:    { moveSpeed: 4.8, o2DrainMult: 1.25, pickupMagnetRadius: 4.2, projectileDamage: 1, abilityKey: 'sprint',    abilityLabel: 'SPRINT BURST', abilityCooldown: 8,  abilityDuration: 1.5, unlockSkill: 'scout_special_unlock' },
    TANK:     { moveSpeed: 2.6, o2DrainMult: 0.75, pickupMagnetRadius: 2.8, projectileDamage: 2, abilityKey: 'fortify',   abilityLabel: 'BRACE',        abilityCooldown: 10, abilityDuration: 2.0, unlockSkill: 'tank_special_unlock' },
    ENGINEER: { moveSpeed: 3.6, o2DrainMult: 1.0,  pickupMagnetRadius: 3.4, projectileDamage: 1, abilityKey: 'overclock', abilityLabel: 'REROUTE',      abilityCooldown: 11, abilityDuration: 2.5, unlockSkill: 'engineer_special_unlock' }
};

const O2_DRAIN_RATE_PCT_PER_SEC = 1 / 3;
const O2_DANGER_THRESHOLD = 25;
const O2_DRAIN_RATE_DANGER_MULT = 1.5;
const O2_HEALTH_DRAIN_INTERVAL = 1;
const BASE_HEARTS = 3;
const UPGRADED_HEARTS = 4;
// DEPTH_TIER_NAMES / DEPTH_TIER_LOOT_CONFIG / getDepthLootConfig now live in
// src/data/loot.js (imported above).

const O2_GENERATOR_BUTTON_ID = 'terminal-btn-o2-generator';
const O2_GENERATOR_RING_BASE_RADIUS = 1;
const O2_GENERATOR_RING_BAND_THICKNESS = 0.24;
const O2_MODULE_COLLISION_RADIUS = 0.5;
const MODULE_OFFSETS = Object.freeze({
    o2Generator: Object.freeze({ x: 1.75, z: 1.2 }),
    hullMatrix: Object.freeze({ x: 2.7, z: 0.25 }),
    radarDish: Object.freeze({ x: 1.9, z: -1.15 }),
    reactorCompressor: Object.freeze({ x: 0.45, z: 3.0 })
});
const O2_MODULE_OFFSET = MODULE_OFFSETS.o2Generator;
const LOCKED_MODULE_OPACITY = 0.4;
const UNLOCKED_MODULE_OPACITY = 1;
const GOAL_CARD_CONFIGS = Object.freeze([
    Object.freeze({
        goalKey: 'hullExpansion',
        prereqKey: 'o2Bubble',
        statusId: 'terminal-hull-status',
        costId: 'terminal-hull-cost',
        buttonId: 'terminal-btn-hull',
        lockedStatusText: 'LOCKED — REPAIR O₂ GENERATOR FIRST'
    }),
    Object.freeze({
        goalKey: 'radarNode',
        prereqKey: 'hullExpansion',
        statusId: 'terminal-radar-status',
        costId: 'terminal-radar-cost',
        buttonId: 'terminal-btn-radar',
        lockedStatusText: 'LOCKED — INSTALL HULL MATRIX FIRST'
    }),
    Object.freeze({
        goalKey: 'reactorCompressor',
        prereqKey: 'radarNode',
        statusId: 'terminal-reactor-status',
        costId: 'terminal-reactor-cost',
        buttonId: 'terminal-btn-reactor',
        lockedStatusText: 'LOCKED — INSTALL RADAR NODE FIRST'
    })
]);
function setSpriteSheetFrame(texture, columns, rows, frameIndex = 0) {
    if (!texture || columns <= 0 || rows <= 0) return;

    const repeatX = 1 / columns;
    const repeatY = 1 / rows;
    if (texture.repeat.x !== repeatX || texture.repeat.y !== repeatY) {
        texture.repeat.set(repeatX, repeatY);
    }

    const totalFrames = Math.max(1, columns * rows);
    const normalizedFrame = ((Math.floor(frameIndex) % totalFrames) + totalFrames) % totalFrames;
    const col = normalizedFrame % columns;
    const row = Math.floor(normalizedFrame / columns);
    texture.offset.set(col * repeatX, (rows - 1 - row) * repeatY);
}
const PICKUP_MAGNET_RADIUS = 3.4;
const PICKUP_COLLECT_RADIUS = 0.72;
const PICKUP_COLLECT_DURATION = 0.2;
const WEAPON_CLIP_SIZE = 6;
const WEAPON_RELOAD_DURATION = 1.25;
const WEAPON_FIRE_COOLDOWN = 0.14;
const WEAPON_AMMO_REFILL_INTERVAL = 10;
const WEAPON_AMMO_REFILL_INTERVAL_REDUCTION = 2.1;
const WEAPON_AMMO_REFILL_MIN_INTERVAL = 3.6;
const PROJECTILE_SPEED = 13.4;
const PROJECTILE_TTL = 1.15;
const PROJECTILE_RADIUS = 0.16;
const PROJECTILE_DAMAGE = 1;

// --- Sprint 10 combat tuning / feature flags ---
const FEATURE_WALL_DECALS = true;
const FEATURE_MULTISHOT = true;
// Anchor glow to the visible sprite and nudge slightly up-screen so the clear
// pool reads around the body in the isometric camera.
const PLAYER_GLOW_SCREEN_OFFSET = 0.28;
const FOG_OF_WAR_CLEAR_RADIUS = 6.2;
const FOG_OF_WAR_FADE_RADIUS = 4.2;
const FOG_OF_WAR_MIN_VISIBILITY = 0.14;
// Spawn a themed retaliation boss after each console build milestone (Note 6).
const FEATURE_MILESTONE_BOSSES = true;
// Weather system (Note 9): hard particle cap + per-state profiles. Profiles set
// active particle count (<= cap), point size/color/opacity, fall/drift velocity
// ranges, and a fog-far multiplier for reduced visibility.
const FEATURE_WEATHER = true;
const WEATHER_PARTICLE_CAP = 240;
const WEATHER_FIELD_RADIUS = 20;   // half-extent of the box that follows the player
const WEATHER_FIELD_HEIGHT = 9;
const WEATHER_FORCED_STATE = 'rainstorm';
const RAIN_PUDDLE_MAX_COUNT = 32;
const RAIN_PUDDLE_SPAWN_MIN = 0.45;
const RAIN_PUDDLE_SPAWN_MAX = 0.95;
const RAIN_SPLASH_COOLDOWN = 0.03;
const RAIN_SPLASH_IMPACT_CHANCE = 0.6;
const WET_FOOTPRINT_TRAIL_SECONDS = 5.2;
const WEATHER_PROFILES = Object.freeze({
    clear:       { count: 0,   size: 0.1,  color: 0xffffff, opacity: 0,    fall: [0, 0],       drift: 0,    fogFarMult: 1.0 },
    snow:        { count: 220, size: 0.17, color: 0xcfe4ff, opacity: 0.85, fall: [1.2, 2.1],    drift: 0.6,  fogFarMult: 0.88 },
    spore_drift: { count: 150, size: 0.15, color: 0x9dff7a, opacity: 0.7,  fall: [0.25, 0.75],  drift: 1.1,  fogFarMult: 0.9 },
    fog_gust:    { count: 70,  size: 0.62, color: 0xb8c4d0, opacity: 0.2,  fall: [0.1, 0.45],   drift: 1.6,  fogFarMult: 0.66 },
    rainstorm:   { count: 240, size: 0.11, color: 0xa8c5df, opacity: 0.84, fall: [8.7, 13.6],   drift: 1.55, fogFarMult: 0.78, lightMult: 0.9 }
});
// Goal key -> retaliation boss spawned when that build completes.
const MILESTONE_BOSS_FOR_GOAL = Object.freeze({
    o2Bubble: 'boss_cybersnail',
    hullExpansion: 'boss_cryosnail',
    radarNode: 'boss_sporesnail',
    reactorCompressor: 'boss_sporesnail'
});
const HIVE_HARVEST_BOSS_FOR_HIVE = Object.freeze({
    hive_suture: 'boss_sporesnail',
    hive_relay: 'boss_cybersnail',
    hive_carapace: 'boss_cryosnail'
});

// Fixed world build-site coordinates the yellow scanner arrow guides toward
// (Note 4). Ordered by progression; a site is "built" once its goalKey is
// unlocked, advancing the arrow to the next unbuilt site. Headings push the
// player outward through ACTIVE -> CRYO -> BIO sectors.
const BUILD_SITES = Object.freeze([
    Object.freeze({ goalKey: 'o2Bubble', x: 2, z: 11, biome: 'active', label: 'O₂ BUBBLE SITE' }),
    Object.freeze({ goalKey: 'hullExpansion', x: -6, z: 42, biome: 'active', label: 'HULL BAY SITE' }),
    Object.freeze({ goalKey: 'radarNode', x: 9, z: 98, biome: 'cryo', label: 'SCANNER MAST SITE', animated: true }),
    Object.freeze({ goalKey: 'reactorCompressor', x: -8, z: 176, biome: 'bio', label: 'REACTOR SITE' })
]);
const PLAYER_HITBOX_PADDING = 0.18;     // forgiving hitbox for player shots only
const WEAPON_CLIP_PER_CAPACITY = 2;     // +clip rounds per ammoCapacity tier
const WEAPON_SPEED_PER_TIER = 2.5;      // +projectile speed per shotSpeed tier
const MULTISHOT_SPREADS = Object.freeze([[], [-0.085, 0.085], [-0.15, 0.0, 0.15]]);
const WALL_DECAL_CAP = 24;
const PHYS_PARTICLE_GRAVITY = 7.0;   // units/s²
const PHYS_PARTICLE_DRAG = 2.2;      // exponential drag coefficient (per second)
const PHYS_PARTICLE_BOUNCE = -0.45;  // floor restitution
const SHIP_MAX_HP = 24;
const SHIP_NO_FIRE_RADIUS = 2.4;
const SHIP_HIT_RADIUS_MULT = 0.78;
const LORE_LOGS = {
    active: [
        { key: 'A01', text: 'PRIORITY: RESTRICTED\nPersonnel count: 312. Deployment: Sub-level 1 through 9.\nMission status: CLASSIFIED. Authorization: DIRECTOR CHEN, OVERSEER RANK.' },
        { key: 'A02', text: 'Cryogenic transfer complete. 847 units preserved in long-term stasis.\nNotes: Units 802-847 classified. Manifests sealed. Do not approach Bay C.' },
        { key: 'A03', text: 'Atmospheric readings stable. O₂ generator nominal.\nSnail-variant bio-entities adapting to hull material. Pest control authorized.' },
        { key: 'A04', text: 'Communication with Mothership limited to quarterly uplink. By design.\nThey don\'t want to know what we found. But they want what we found.' },
        { key: 'A05', text: 'Agent roster — OPERATION SHARD:\nSCOUT TEAM: Sgt. A. Henderson. Lt. J. Park. Pvt. M. Reyes.\nMission: RETRIEVAL. Target: Bay C Specimen 0047.\nDo not allow them to open the stasis pods. Tell them it\'s samples.' },
        { key: 'A06', text: 'Bay C alarm triggered. Manual override engaged. Who authorized override?\nPerimeter sensors show movement between the support pillars in sector 9-F. Cameras offline.\nRecommend: code red lock — Director Chen APPROVED.' },
        { key: 'A07', text: 'O₂ generator in sector 4 is offline. Reserves depleted.\nPersonnel evacuating sub-levels 4 through 9.\nAnyone still in those levels — I\'m sorry.' },
        { key: 'A08', text: 'Three ships inbound. SCOUT ALPHA, BRAVO, CHARLIE.\nThey don\'t know what they\'re walking into. Orders are orders.\nUplink will cut when they enter atmosphere.\n— Director Chen' },
        { key: 'A09', text: '[CORRUPTED]\n...THE THING IN BAY...\n...NOT SPECIMEN 00...\n...IT KNEW THE CODE...\n[END]' },
        { key: 'A10', text: 'Armory secure. 40 units of ammo reserve. 12 medical kits.\nLeave them. The agents will need them.\nThis is not abandonment. This is preparation.\n— Unknown author' },
        { key: 'A11', text: 'If you can read this — the evacuation is complete.\nThe bunker is sealed. The Mothership will not acknowledge your transmissions.\nUse the console. Bank what you find. Build what you can.\n— Former Chief Engineer Yuki Tanaka' },
        { key: 'A12', text: '[FINAL ACTIVE SECTOR LOG]\nThree agents. One mission. One that lives is enough.\nThe Mothership gets what it paid for.\nWe get silence.\n— Director Chen, last recorded transmission.' },
        { key: 'A13', text: 'ARMORY REQUISITION — COMBAT MATRIX\nWe left the calibration benches running. Magazine extenders,\nvelocity coils, payload cores, burst injectors — all keyed to\nthe ship consoles. Salvage the tech, the bench builds the rest.\nWhoever comes after us: take the guns. We won\'t need them.' },
        { key: 'A14', text: 'NOTE CLIPPED TO THE WEAPONS BENCH:\nThe Mothership rationed our ammunition on purpose.\nA garrison that can\'t fight back can\'t refuse an order.\nSo we built our own upgrades from scrap. Off the books.\nIf you\'re reading this, the bench is yours. Use it. — Q.M. Vasquez' }
    ],
    cryo: [
        { key: 'C01', text: 'Stasis bay operational. Temperature stable at -196°C.\n847 units in suspension. Bio-preservation rate: 99.4%.\nUnit 0047 in isolation pod. Do not wake. Do not transport.' },
        { key: 'C02', text: 'Coolant system failure in Bay C.\nEstimated repair time: 72 hours.\nWe have 12 hours before temperature rises.\nIce will form throughout the sector. This is acceptable.' },
        { key: 'C03', text: 'Something is wrong with Pod 312.\nThe readings show... movement inside.\nNot the tremors we expect in suspension — voluntary movement.\n— Cryo Tech Okonkwo' },
        { key: 'C04', text: 'Pod 312 has been opened. From the inside.\nInitiating full sector lockdown.\nAll personnel evacuate Bay C immediately.\n— AUTOMATED BUNKER ALERT' },
        { key: 'C05', text: 'I can hear it moving between the pillars.\nThe thermal cameras show something approximately 1.2 meters.\nIt\'s not the stasis unit. The stasis unit was 0047.\nThis is something else. Something it made.' },
        { key: 'C06', text: 'Crawlers. That\'s what we\'re calling them.\nFast. Very fast. One hit and you\'re down.\nThey don\'t attack the Snails. They work together.\n— Cryo Tech Okonkwo (last entry)' },
        { key: 'C07', text: 'Bay C is sealed. Airtight. The Crawlers are inside.\nThe cold won\'t kill them. We tried.\nThey\'re still moving. Whatever 0047 is, it doesn\'t need warmth.' },
        { key: 'C08', text: 'The coolant puddles are spreading.\nI used to think the ice was the disaster.\nNow I think the ice is the least of our problems.' },
        { key: 'C09', text: 'Stasis Pod 0047 — still sealed. Still active.\nWhatever it is, it hasn\'t tried to leave.\nBut the Crawlers have.' },
        { key: 'C10', text: 'Message from maintenance:\n"We found where the Crawlers are going. They\'re building something\nin the Bio sector. We don\'t know what. We\'re not going back to look."' },
        { key: 'C11', text: 'To my sister:\nI don\'t think I\'m making it out of here.\nThe Mothership knows what\'s happening. They always know.\nDon\'t let them tell you it was an accident.\n— Pvt. M. Reyes' },
        { key: 'C12', text: '[CRYO SECTOR FINAL LOG]\nTemperature stabilizing at -40°C. Sector partially frozen.\n0047 remains in isolation. Still active.\nThe Crawlers are building something in the fungal growth of Bio sector.\nWhatever it is, it will be ready before the agents arrive.' }
    ],
    bio: [
        { key: 'B01', text: 'I\'ve been watching what the Crawlers are building.\nIt\'s not a nest. It\'s not a hive.\nIt\'s an antenna.\nThey\'re trying to contact something.\n— Unknown researcher, last known survivor' },
        { key: 'B02', text: '0047 is the mind. The Crawlers are the hands.\nThe antenna is the voice.\nWhen it finishes, something will answer.\nWe have three days. Maybe four.\nThe agents are already in the atmosphere.' },
        { key: 'B03', text: 'TO WHOEVER FINDS THIS:\n\nYou were not sent here to rescue us.\nThe signal doesn\'t need the antenna — it needs a body.\n\nThe Mothership has known about 0047 for eleven years.\nThey wanted to study it. We were the researchers.\nWhen things went wrong, they needed it contained.\nYou are the containment.\n\nThree ships. One carries the tracking signal.\nOne carries the relay.\nOne carries the weapon.\n\nThe Mothership doesn\'t care which of you survives.\nThey only care that the signal reaches 0047.\n\nBurn it all down if you can.\nGet out before the antenna finishes.\nWhatever you do — don\'t let 0047 answer.\n\n— Director Chen, sealed personal terminal.\n   Authenticated: 2047-08-14 23:44:07' },
        { key: 'B13', text: 'CHEN HIDDEN LOG 13:\n\nIf no operator has died before reaching the organism, then the loop is not perfect. Good.\n\nThe Mothership designed failure into the mission. Every death teaches 0047 a little more about the suit, the bunker, and you.\n\nA clean first descent means the specimen has not finished profiling the carrier.\n\nUse that ignorance.\nDo not let the next transmission be your obituary.\n\n— Chen, unindexed dead-man cache' }
    ]
};

export const MOTHERSHIP_REACTIVE_LINES = [
    { trigger: 'first_kill',       text: 'AGENT — FIRST THREAT NEUTRALIZED. PROCEED.' },
    { trigger: 'first_cryo',       text: 'WARNING: CRYO SECTOR BOUNDARY CROSSED. THERMAL PROTOCOL ACTIVE.' },
    { trigger: 'first_bio',        text: 'ALERT: BIO-CONTAINMENT ZONE ENTERED. SUIT FILTERS AT LIMIT.' },
    { trigger: 'hp_critical',      text: 'DISTRESS SIGNAL: VITAL SIGNS CRITICAL. EXTRACTION WINDOW OPEN EARLY.' },
    { trigger: 'objective_found',  text: 'UPLINK: OBJECTIVE CONFIRMED. RETURN TO SHIP IMMEDIATELY.' },
    { trigger: 'first_deposit',    text: 'SALVAGE RECEIVED. BANK SECURE. CONTINUE OPERATIONS.' },
    { trigger: 'lore_found',       text: 'AGENT — BUNKER DATA FRAGMENT RECOVERED. TRANSMITTING TO ARCHIVE.' },
    { trigger: 'sentinel_spotted', text: 'WARNING: AUTOMATED DEFENSE SYSTEM ACTIVE. RECOMMEND COVER.' },
    { trigger: 'weapon_calibrated', text: 'NOTED: AGENT WEAPON OUTPUT RISING. ... WHY DO YOU NEED MORE.' },
    { trigger: 'first_boss',       text: 'CONFIRMED KILL: APEX BIO-ENTITY DOWN. THE SIGNAL FELT THAT.' },
    { trigger: 'specimen_notices', text: '[UNAUTHORIZED CHANNEL] ...0047 HAS STOPPED BUILDING. IT IS LISTENING TO YOU NOW.' },
    { trigger: 'uplink_cut',       text: 'MOTHERSHIP: CARRIER TELEMETRY LOST. SIGNAL JAMMED. CORRECTION: UNPOWERED.' },
    { trigger: 'silence_detected',  text: 'MOTHERSHIP: NO VOICE DETECTED ON SYSTEM UPLINK. SENDING EXTERMINATOR SCAN.' },
    { trigger: 'dish_detected',     text: 'MOTHERSHIP: UNAUTHORIZED SHIELD EMISSION DETECTED. ORBITAL SENSORS LOCKING.' },
    { trigger: 'camp_quarantine',   text: 'MOTHERSHIP: SURVEY SIGNAL DETECTS PATHOGEN PROFILE IN SURVIVOR ZONES.' },
    { trigger: 'outed_threat',     text: 'MOTHERSHIP: AGENT CLASSIFIED AS VECTOR-ALPHA. HOSTILE ENGAGEMENT GRANTED.' },
    { trigger: 'extermination_imminent', text: 'MOTHERSHIP: ORBITAL EXTERMINATION LANDER LAUNCHED. RECOVERY ABANDONED.' },
    { trigger: 'hive_bonding',     text: 'MOTHERSHIP: DETECTING BIO-SYNAPTIC RESONANCE. AGENT BRAIN-DEATH PROBABLE.' },
    { trigger: 'obeying_queen',    text: 'MOTHERSHIP: CORRUPT TRANSMISSION DETECTED. SOURCE: SPECIMEN-0047.' },
    { trigger: 'defiance_detected', text: 'MOTHERSHIP: WEAPON PAYLOAD ARMED. DO NOT RESIST THE PURGE.' },
    { trigger: 'final_launch',     text: 'MOTHERSHIP: LAUNCH DETECTED. VECTOR OUT OF SECURE CHANNELS. FIRE CODES READY.' }
];

const SENTINEL_MAX_HP = 3;
const SENTINEL_FIRE_COOLDOWN = 2.5;
const SENTINEL_DETECT_RADIUS = 12;
const SENTINEL_PROJECTILE_SPEED = 5.0;
const SENTINEL_TECH_DROP = 3;
const SENTINEL_COIN_DROP = 1;

const SNAIL_MAX_HP = 2;
const SNAIL_MOVE_SPEED = 1.2;
const SNAIL_ENRAGED_MOVE_SPEED = 2.1;
const SNAIL_ENRAGED_TINT = 0xff4a4a;
const SNAIL_HIT_RADIUS = 0.62;
// Fallback control scheme. Live bindings come from window.state.settings.keyBindings
// (set by main.js); this is used when that isn't present (e.g. unit tests).
const DEFAULT_KEY_BINDINGS = Object.freeze({
    moveUp: ['KeyW', 'ArrowUp'],
    moveDown: ['KeyS', 'ArrowDown'],
    moveLeft: ['KeyA', 'ArrowLeft'],
    moveRight: ['KeyD', 'ArrowRight'],
    interact: ['KeyE', null],
    reload: ['KeyR', null],
    ability: ['KeyF', null],
    scan: ['KeyQ', null],
    sprint: ['ShiftLeft', 'ShiftRight']
});

const SNAIL_ATTACK_RADIUS = 1.1;
const SNAIL_ATTACK_COOLDOWN = 1.1;
// On a contact hit, shove the player and the snail apart so the snail can't
// just sit on the player. The snail also briefly recoils (stops advancing).
const SNAIL_HIT_PLAYER_KNOCKBACK = 0.72;
const SNAIL_HIT_SELF_KNOCKBACK = 0.6;
const SNAIL_HIT_RECOIL_TIME = 0.35;
const SNAIL_PATH_RECALC_MIN = 0.24;
const SNAIL_PATH_RECALC_MAX = 0.5;
const SNAIL_WANDER_RECALC_MIN = 0.9;
const SNAIL_WANDER_RECALC_MAX = 1.6;
const SNAIL_WANDER_DISTANCE_MIN = 1.2;
const SNAIL_WANDER_DISTANCE_MAX = 4.2;
const SNAIL_WANDER_TARGET_DISTANCE = 10.5;
const SNAIL_PATH_NODE_BUDGET = 360;
const SCATTER_CLUSTER_RATIO = 0.7;
const SCATTER_TRANSITION_RATIO = 0.2;
const SCATTER_STRAY_RATIO = 0.1;
const SCATTER_MIN_SEPARATION = 0.78;
const SCATTER_CLUSTER_CENTER_MIN_DISTANCE = 4.8;
const BUNKER_JUNK_TRIGGER_RADIUS = 1.35;
const SNAIL_SHELL_COLLECT_RADIUS = 1.2;
const SNAIL_SHELL_BOSS_VALUE = 15; // matches the old kill-time boss grant
const CAMP_O2_HAVEN_RADIUS = 3.4;
const CAMP_O2_HAVEN_RATE = 4.5; // O2 per second inside a supported camp
const CAMP_DISCOVERY_RADIUS = 7.0;
const CAMP_DISCOVERY_SHELLS = 10; // survivors share supplies on first contact
const CAMP_DISCOVERY_O2 = 35;
const CAMP_SUPPORT_O2_REFILL = 40; // instant O2 on each support purchase
const CAMP_FAVOR_BASE_COST = 8;
const BUNKER_JUNK_MIN_SEPARATION = 2.2;
const BUNKER_JUNK_DROP_COUNT_MIN = 2;
const BUNKER_JUNK_DROP_COUNT_MAX = 4;
const LOOT_RARITIES = [
    { key: 'basic', weight: 0.55, color: 0xb7c3d0 },
    { key: 'uncommon', weight: 0.27, color: 0x66ff9a },
    { key: 'rare', weight: 0.13, color: 0x58bbff },
    { key: 'legendary', weight: 0.05, color: 0xffb347 }
];
const JUNK_SCATTER_VARIANTS = [
    { type: 'bunker_junk', weight: 0.55, glowColor: 0xffcc74, smokeColor: 0x95a1ab },
    { type: 'bunker_junk_uncommon', weight: 0.27, glowColor: 0x66ff9a, smokeColor: 0x7ebd98 },
    { type: 'bunker_junk_rare', weight: 0.13, glowColor: 0x58bbff, smokeColor: 0x6d98bb },
    { type: 'bunker_junk_legendary', weight: 0.05, glowColor: 0xffb347, smokeColor: 0xc09762 }
];
const SPORE_SCATTER_VARIANTS = [
    { type: 'bio_spores', weight: 0.45 },
    { type: 'bio_spores_blue', weight: 0.275 },
    { type: 'bio_spores_amber', weight: 0.275 }
];
const BIOME_KEYS = Object.freeze({
    ACTIVE: 'active',
    CRYO: 'cryo',
    BIO: 'bio'
});
const BIOME_LABELS = Object.freeze({
    [BIOME_KEYS.ACTIVE]: 'ACTIVE SECTOR',
    [BIOME_KEYS.CRYO]: 'CRYO SECTOR',
    [BIOME_KEYS.BIO]: 'BIO SECTOR'
});
const BIOME_ORDER = Object.freeze([
    BIOME_KEYS.ACTIVE,
    BIOME_KEYS.CRYO,
    BIOME_KEYS.BIO
]);
const BIOME_THRESHOLD_CRYO = 60;
const BIOME_THRESHOLD_BIO = 140;
const BIOME_BLEND_HALF_WIDTH = 10;
const BIOME_O2_DRAIN_MULTIPLIERS = Object.freeze({
    [BIOME_KEYS.ACTIVE]: 1.0,
    [BIOME_KEYS.CRYO]: 1.15,
    [BIOME_KEYS.BIO]: 1.3
});
const BIOME_LIGHTING = Object.freeze({
    [BIOME_KEYS.ACTIVE]: Object.freeze({
        fog: 0x0b0d0f,
        ambient: 0xffffff,
        directional: 0xd6e7ff,
        hemisphereSky: 0x6b8db3,
        hemisphereGround: 0x07090c
    }),
    [BIOME_KEYS.CRYO]: Object.freeze({
        fog: 0x080f1a,
        ambient: 0xb0ccff,
        directional: 0xa8cfff,
        hemisphereSky: 0x456da2,
        hemisphereGround: 0x06090f
    }),
    [BIOME_KEYS.BIO]: Object.freeze({
        fog: 0x060d08,
        ambient: 0x90a870,
        directional: 0xc8b878,
        hemisphereSky: 0x3f5c38,
        hemisphereGround: 0x050804
    })
});
const BIOME_TERRAIN_TEXTURE_PATHS = Object.freeze({
    [BIOME_KEYS.ACTIVE]: Object.freeze({
        floorBase: '/bunker_base_metal.png',
        floorGrunge: '/bunker_grunge_rust.png',
        floorDetail: '/bunker_tech_scratches.png',
        wallSide: '/bunker_wall_metal.png',
        wallTop: '/bunker_base_metal.png',
        wallGrunge: '/bunker_wall_grunge.png'
    }),
    [BIOME_KEYS.CRYO]: Object.freeze({
        floorBase: '/cryo_base_frost.png',
        floorGrunge: '/cryo_grunge_rime.png',
        floorDetail: '/cryo_wall_conduit.png',
        wallSide: '/cryo_wall_conduit.png',
        wallTop: '/cryo_base_frost.png',
        wallGrunge: '/cryo_grunge_rime.png',
        fallback: Object.freeze({
            floorBase: '/ice_base_rock.png',
            floorGrunge: '/ice_grunge_snow.png',
            floorDetail: '/ice_wall_glacier.png',
            wallSide: '/ice_wall_glacier.png',
            wallTop: '/ice_base_rock.png',
            wallGrunge: '/ice_grunge_snow.png'
        })
    }),
    [BIOME_KEYS.BIO]: Object.freeze({
        floorBase: '/bio_base_growth.png',
        floorGrunge: '/bio_grunge_spores.png',
        floorDetail: '/bio_wall_veins.png',
        wallSide: '/bio_wall_veins.png',
        wallTop: '/bio_base_growth.png',
        wallGrunge: '/bio_grunge_spores.png'
    })
});
const CRYO_SCATTER_VARIANTS = [
    { type: 'scatter_coolant_puddle', weight: 0.34 },
    { type: 'scatter_ice_stalagmite', weight: 0.26 },
    { type: 'scatter_cryo_icicle', weight: 0.22 },
    { type: 'scatter_cryo_shards', weight: 0.18 },
    { type: 'body_human_frozen_suit', weight: 0.1 },
    { type: 'body_empty_exosuit', weight: 0.08 }
];
const BIO_SCATTER_VARIANTS = [
    { type: 'scatter_bio_pod', weight: 0.34 },
    { type: 'scatter_bio_moss', weight: 0.2 },
    { type: 'scatter_slime_puddle', weight: 0.24 },
    { type: 'prop_hive_resin_sac', weight: 0.12 },
    { type: 'bio_spores', weight: 0.14 },
    { type: 'bio_spores_blue', weight: 0.04 },
    { type: 'bio_spores_amber', weight: 0.04 }
];
const ACTIVE_SCATTER_VARIANTS = [
    { type: 'scatter_gravel', weight: 0.46 },
    { type: 'scatter_cable_coil', weight: 0.18 },
    { type: 'scatter_bolts', weight: 0.14 },
    ...SPORE_SCATTER_VARIANTS
];
const BIOME_SCATTER_VARIANTS = Object.freeze({
    [BIOME_KEYS.ACTIVE]: ACTIVE_SCATTER_VARIANTS,
    [BIOME_KEYS.CRYO]: CRYO_SCATTER_VARIANTS,
    [BIOME_KEYS.BIO]: BIO_SCATTER_VARIANTS
});
const BIOME_NOTIFICATION_MESSAGES = Object.freeze({
    [BIOME_KEYS.ACTIVE]: 'ENTERING ACTIVE SECTOR — NAV GRID STABLE',
    [BIOME_KEYS.CRYO]: 'ENTERING CRYO SECTOR — SUIT THERMAL LOAD INCREASING',
    [BIOME_KEYS.BIO]: 'ENTERING BIO SECTOR — SPORE DENSITY RISING'
});
const JUNK_LOOT_BIAS = {
    bunker_junk: [
        { key: 'basic', weight: 0.8 },
        { key: 'uncommon', weight: 0.2 }
    ],
    bunker_junk_uncommon: [
        { key: 'uncommon', weight: 0.7 },
        { key: 'basic', weight: 0.3 }
    ],
    bunker_junk_rare: [
        { key: 'rare', weight: 0.7 },
        { key: 'uncommon', weight: 0.3 }
    ],
    bunker_junk_legendary: [
        { key: 'legendary', weight: 0.75 },
        { key: 'rare', weight: 0.25 }
    ]
};

function getDepthTier(chunkX, chunkY) {
    const dist = Math.hypot(chunkX, chunkY);
    if (dist < 2) return 0;
    if (dist < 5) return 1;
    if (dist < 9) return 2;
    return 3;
}

const ENGINEER_CONSOLE_DISCOUNT = 0.80;

const ROOM_TYPES = Object.freeze({
    DEAD_END: 'dead_end',
    CORRIDOR: 'corridor',
    JUNCTION: 'junction',
    CHAMBER:  'chamber'
});

const SNAIL_DEPTH_SPAWN = Object.freeze([
    Object.freeze({ maxCount: 0, chance: 0 }),
    Object.freeze({ maxCount: 1, chance: 0.08 }),
    Object.freeze({ maxCount: 2, chance: 0.12 }),
    Object.freeze({ maxCount: 3, chance: 0.16 })
]);

const SNAIL_BIOME_TINTS = Object.freeze({
    active: 0xffffff,
    cryo:   0x88ccff,
    bio:    0x88ff88
});

// Proto enemies (sprint 19 physicality lane): landform-native families.
// Crawlers nest in ruins, spitters guard crater rims. Their art is 4x4 walk
// sheets (camp-leader layout), so they animate via UV rows, not scale flips.
const SHEET_ENEMY_TYPES = Object.freeze({
    alien_proto_crawler: '/alien_proto_crawler_walk.png',
    alien_proto_spitter: '/alien_proto_spitter_walk.png',
    boss_corrupted_scout: '/boss_corrupted_scout.png',
    boss_corrupted_tank: '/boss_corrupted_tank.png',
    boss_corrupted_engineer: '/boss_corrupted_engineer.png'
});
const PROTO_SPAWN_MAX_PER_CHUNK = 2;
const PROTO_SPAWN_CHANCE = 0.2;
const CAMP_CIVILIAN_SPRITES = Object.freeze(['/civilian_miner_walk.png', '/civilian_researcher_walk.png']);
const CAMP_CIVILIAN_WANDER_RADIUS = 3.2;

const CRAWLER_MAX_HP = 1;
const CRAWLER_DETECT_RADIUS = 7.0;
const CRAWLER_WINDUP_DURATION = 0.35;
const CRAWLER_CHARGE_SPEED = 7.0;
const CRAWLER_CHARGE_MAX_DURATION = 1.0;
const CRAWLER_ATTACK_RADIUS = 0.72;
const CRAWLER_ATTACK_COOLDOWN = 1.5;
const CRAWLER_TINT = 0x44ff88;

const ROOM_TEMPLATE_CONFIGS = Object.freeze({
    armory: Object.freeze({
        lightColor: 0xff2222, lightIntensity: 1.5,
        pickupBias: { ammo: 3, weapon: 1 }, legendaryBoost: 0.08,
        forceSentinel: true, noExtraEnemies: false,
        label: 'ARMORY'
    }),
    ops_center: Object.freeze({
        lightColor: 0x3366ff, lightIntensity: 1.2,
        pickupBias: { weapon: 3 }, legendaryBoost: 0.05,
        forceLore: true, noEnemies: true,
        label: 'OPS CENTER'
    }),
    agent_wreckage: Object.freeze({
        lightColor: 0xff8800, lightIntensity: 1.3,
        pickupBias: { weapon: 2, coin: 1 }, legendaryBoost: 0.30,
        noEnemies: true, forceWreckage: true,
        label: 'AGENT WRECKAGE'
    }),
    stasis_bay: Object.freeze({
        biomeRequired: 'cryo',
        lightColor: 0x88ffff, lightIntensity: 1.3,
        pickupBias: { health: 3 }, legendaryBoost: 0.06,
        noEnemies: false, extraIcicles: true,
        label: 'STASIS BAY — BAY C'
    }),
    the_nest: Object.freeze({
        biomeRequired: 'bio',
        lightColor: 0x33ff66, lightIntensity: 1.6,
        pickupBias: { weapon: 2, ammo: 1 }, legendaryBoost: 0.12,
        forceEnragedSnails: 2,
        label: 'THE NEST'
    })
});

function classifyChunkCells(grid, chunkSize) {
    const roomTypes = Array.from({ length: chunkSize }, () => Array(chunkSize).fill(null));
    for (let y = 0; y < chunkSize; y++) {
        for (let x = 0; x < chunkSize; x++) {
            if (grid[y][x] === '#') continue;
            let floorNeighbors = 0;
            if (y > 0 && grid[y - 1][x] !== '#') floorNeighbors++;
            if (y < chunkSize - 1 && grid[y + 1][x] !== '#') floorNeighbors++;
            if (x > 0 && grid[y][x - 1] !== '#') floorNeighbors++;
            if (x < chunkSize - 1 && grid[y][x + 1] !== '#') floorNeighbors++;
            if (floorNeighbors <= 1) roomTypes[y][x] = ROOM_TYPES.DEAD_END;
            else if (floorNeighbors === 2) roomTypes[y][x] = ROOM_TYPES.CORRIDOR;
            else if (floorNeighbors === 3) roomTypes[y][x] = ROOM_TYPES.JUNCTION;
            else roomTypes[y][x] = ROOM_TYPES.CHAMBER;
        }
    }
    return roomTypes;
}

export class ThreeGame {
    constructor({ parent, playerType = 'TANK', bankManager = null, dialogueManager = null, arcManager = null, act2Manager = null } = {}) {
        this.container = typeof parent === 'string' ? document.getElementById(parent) : parent;
        if (!this.container) {
            throw new Error('ThreeGame requires a valid parent container.');
        }

        const initialType = String(playerType ?? 'TANK').trim().toUpperCase();
        this.playerType = PLAYER_COLORS[initialType] ? initialType : 'TANK';
        this.dialogueManager = dialogueManager;
        this.arcManager = ARC_PRELUDE_ENABLED ? arcManager : null;
        this.o2StartupSequenceActive = false;
        this.o2StartupTime = 0;
        this.o2StartupPhase = 'popup';
        this._pendingO2BossType = null;

        this.chunkSize = 19;
        this.chunkCellCount = (this.chunkSize - 1) / 2;
        this.defaultVisibleChunkRadius = 1;
        this.visibleChunkRadius = this.defaultVisibleChunkRadius;
        this.wallHeight = 2.8;
        this.wallGeometry = new THREE.BoxGeometry(1, this.wallHeight, 1);
        this.floorGeometry = new THREE.PlaneGeometry(1, 1);
        // One merged floor plane per chunk instead of chunkSize² unit tiles. The
        // floor shader blends by world position (vWorldPos), so a single plane is
        // visually identical while removing ~360 meshes per chunk — the dominant
        // cause of the chunk-load frame stutter.
        this.chunkFloorGeometry = new THREE.PlaneGeometry(this.chunkSize, this.chunkSize);
        this.pillarGeometry = new THREE.CylinderGeometry(0.16, 0.16, this.wallHeight, 8);
        this.bracketGeometry = new THREE.BoxGeometry(0.8, 0.08, 0.12);
        this.ventGeometry = new THREE.BoxGeometry(0.48, 0.48, 0.06);
        this.pipeGeometry = new THREE.CylinderGeometry(0.06, 0.06, this.wallHeight, 6);

        this.ventMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1d20 });
        this.pipeMaterial = new THREE.MeshBasicMaterial({ color: 0x24282c });

        // Pre-allocated geometries/materials to optimize runtime chunk loading (avoid stutters)
        this.sirenBaseGeometry = new THREE.CylinderGeometry(0.12, 0.14, 0.1, 8);
        this.sirenDomeGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.12, 8);
        this.sirenBaseMaterial = new THREE.MeshBasicMaterial({ color: 0x111111 });
        this.sirenDomeMaterial = new THREE.MeshBasicMaterial({ color: 0xff3333 });
        this.rubbleGeometry = new THREE.DodecahedronGeometry(1.0, 0);

        this.playerRadius = 0.66;
        const _initialStats = CLASS_STATS[this.playerType] ?? CLASS_STATS.ENGINEER;
        this.moveSpeed = _initialStats.moveSpeed;
        this.o2DrainMult = _initialStats.o2DrainMult;
        this.pickupMagnetRadius = _initialStats.pickupMagnetRadius ?? PICKUP_MAGNET_RADIUS;
        this.cameraLift = 10;
        this.cameraOffset = new THREE.Vector3(8, this.cameraLift, 8);
        this.cameraPlanarForward = new THREE.Vector2(-this.cameraOffset.x, -this.cameraOffset.z).normalize();
        this.cameraPlanarRight = new THREE.Vector2(-this.cameraPlanarForward.y, this.cameraPlanarForward.x).normalize();
        this.chunkCache = new Map();
        this.chunkMeshes = new Map();
        this.chunkGroups = new THREE.Group();
        this._chunkTemplateCache = new Map();
        this.globalSeedOffset = 0;
        // Per-run entropy for one-off placements (foundry, cave). Rerolled on
        // every run reset so discoveries land somewhere new each attempt; pinned
        // to 0 for Daily Ops so all players share the same daily layout.
        this.fixedRunEntropy = false;
        this.runEntropy = (Math.random() * 0xffffffff) >>> 0;
        this.pendingChunkMounts = [];
        this.pendingChunkMountKeys = new Set();
        this.maxChunkMountsPerFrame = 1;
        this.wallMeshes = [];
        this.pickupMeshes = [];
        this.scatterSprites = [];
        // Corpses live outside scatterSprites: syncVisibleChunks rebuilds that
        // array from chunk registries every frame, which silently dropped
        // scene-attached corpses (no decay, no collection).
        this.corpses = [];
        this.depletedGearPileKeys = new Set();
        this.transientEffects = [];
        this.hitstopTimer = 0;
        this.activeRadarScans = [];
        this.radarScanCooldownMax = 4.0;
        this.radarScanCooldownRemaining = 0;
        this.keys = { up: false, down: false, left: false, right: false, shift: false };
        this.virtualInput = { x: 0, z: 0 };
        this.inputEnabled = true;
        // Day/night cycle (Note 8): timeOfDay 0..1 (0/1 = midnight, 0.5 = noon).
        // Start mid-morning; advances only during active gameplay.
        this.timeOfDay = 0.28;
        this.dayCycleSeconds = 150;
        // Weather (Note 9): pooled Points field, biome/time-biased state machine.
        this.weather = {
            state: 'clear',
            changeTimer: 6,
            count: 0,
            points: null,
            geometry: null,
            positions: null,
            velocities: null,
            fogFarMult: 1,
            lightMult: 1,
            splashCooldown: 0,
            puddleTimer: 0.35,
            activeRainPuddles: 0
        };
        this.dynamicPuddles = [];
        this.wetFootprintTrailTime = 0;
        this.wetFootstepSide = 1;
        this.isMoving = false;
        this.playerForwardDir = new THREE.Vector2(0, 1);
        this._playerForwardDirTarget = new THREE.Vector2(0, 1);
        this.animationTimer = 0;
        this.currentFacingRow = PLAYER_DEFAULT_DIRECTION_INDEX;
        this.playerSpriteScale = 1.6;
        this.playerHeight = 0.06;
        this.playerSpriteLead = 0.18;
        this.playerMarkerHeight = 0.05;
        this.lastTime = performance.now();
        this.raycaster = new THREE.Raycaster();
        this._lightOcclusionRaycaster = new THREE.Raycaster();
        this.bank = bankManager instanceof BankManager ? bankManager : new BankManager();
        this.playerVitals = {
            hp: BASE_HEARTS,
            maxHp: BASE_HEARTS,
            o2: 100,
            o2HealthTimer: 0
        };
        this.aimDirX = 1;
        this.aimDirZ = 0;
        this.aimFacingRow = PLAYER_DEFAULT_DIRECTION_INDEX;
        this.aimWorldPoint = null;
        this.hasActiveAim = false;
        this.mouseAimActive = false;
        this.lastMouseClientX = null;
        this.lastMouseClientY = null;
        this._aimResetTimer = 0;
        this._aimRaycaster = new THREE.Raycaster();
        this._projRaycaster = new THREE.Raycaster();
        this.activeProjectiles = [];
        this.weaponClipSize = WEAPON_CLIP_SIZE;
        this.weaponUpgradeBonuses = { shotDamage: 0, speedAdd: 0, shotAmount: 0 };
        this.weaponClipAmmo = this.weaponClipSize;
        this.weaponReloading = false;
        this.weaponReloadTimer = 0;
        this.weaponAmmoRefillTimer = 0;
        this.weaponFireCooldown = 0;
        this.isPlayerDead = false;
        this.o2DispatchTimer = 0;
        this.footstepTimer = 0;
        this.snailsKilledThisRun = 0;
        this.runStartTime = Date.now();
        this._threatAudioTimer = 0;
        this._cameraShakeTimer = 0;
        this._cameraShakeIntensity = 0;
        this.visitedChunks = new Set();
        this.totalDistanceTravelled = 0;
        this.maxDepthTierReached = 0;
        this.currentDepthTier = 0;
        this.currentBiomeKey = BIOME_KEYS.ACTIVE;
        this.currentBiomeO2DrainMult = BIOME_O2_DRAIN_MULTIPLIERS[BIOME_KEYS.ACTIVE];
        this.biomeMixState = { cryoMix: 0, bioMix: 0 };
        this.biomeShipAnchor = new THREE.Vector2();
        this.floorShaderUniforms = null;
        this.wallShaderUniforms = null;
        this.biomeLightingColors = {
            fogA: new THREE.Color(),
            fogB: new THREE.Color(),
            ambientA: new THREE.Color(),
            ambientB: new THREE.Color(),
            directionalA: new THREE.Color(),
            directionalB: new THREE.Color(),
            hemiSkyA: new THREE.Color(),
            hemiSkyB: new THREE.Color(),
            hemiGroundA: new THREE.Color(),
            hemiGroundB: new THREE.Color()
        };
        this.terminalCloseListenerBound = false;
        this.o2BubbleObjects = null;
        this.goalModuleMaterials = null;
        this.snailsEnabled = false;
        this.playerSlowTimer = 0;
        this.playerPoisonTimer = 0;
        this.playerPoisonTickTimer = 0;
        this.killedBosses = new Set();
        this.activeBoss = null;
        this.missionState = { type: null, label: '', status: 'inactive', extractionTimer: 0, killCount: 0, targetKills: 0, targetDepth: 0 };
        this.runDepositedResources = { tech: 0, coin: 0, med: 0 };
        this.hadNearDeath = false;
        this._blockedExtractionSignalFired = false;
        this.nightVision = false;
        this._initClassAbility();

        this.scale = {
            refresh: () => this.resize()
        };

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0b0d0f);
        this.scene.fog = new THREE.Fog(0x0b0d0f, 10, 28);

        // Base flood-lights: dormant until the O2 station powers the grid (Beat 2).
        this.baseLights = new BaseLights(this.scene);

        // Fabrication Foundry: in-world structure that powers up with the base
        // and opens the Fabrication Bay when reached (Beat 4).
        this.foundry = new FabricationFoundry(this.scene);
        this._foundryPromptActive = false;

        // Act 1 finale: organic cave entrance holding the "final ship component"
        // (actually the infection reveal — src/caveReveal.js). Revealed once the
        // reactor goal completes; one-shot gated on the persisted arc state.
        this.caveEntrance = new CaveEntrance(this.scene);
        this._cavePromptActive = false;
        this._caveAnomalySignaled = false;
        this.cinematicLock = false;

        // Act 2 (PregAlien loop): survivor camps + queen objective ladder.
        this.act2 = ARC_PRELUDE_ENABLED ? act2Manager : null;
        this.camps = [];
        this._act2CampsReady = false;
        this._campPromptLabel = null;
        // Ambient civilians wandering near living camps. Scene-attached like
        // corpses — never in the scatter registries, which rebuild each frame.
        this.campCivilians = [];
        // Findable lore drops (corpse pattern: scene-attached, own array).
        // Keyed spawn sites remember what they offered so a drop appears at
        // most once per site per run — and never again once collected.
        this.loreDrops = [];
        this._loreDropSitesSpawned = new Set();
        // Hive swarm sites: the alien mirror of the camps.
        this.hives = [];
        this._hiveSitesReady = false;
        this._tankShockGuardUsed = false;
        this._terminalEvent = null;
        this._terminalEventResolvedIds = new Set();
        this._terminalEventIsMimic = false;   // forged terminal — punishes unverified trust
        this._terminalMimicDisarmed = false;  // Engineer verify neutralizes the trap
        this._compassCorruptUntil = 0;
        this._meridianCompassLock = null;
        this._lightsOutUntil = 0;
        this._blackBoxMarker = null;
        this._blackBoxMarkerActive = false;
        this._blackBoxMarkerPromptActive = false;
        this._blackBoxState = blackBoxStore.load();
        this._corruptedOperatorSpawnedForTimestamp = 0;
        // The Bunker Director: one pressure brain that reacts to the player's
        // greed/struggle by pulling existing levers (doc 11 §4.A).
        this.bunkerDirector = new BunkerDirector();
        this._syncedRunModifier = null;

        this.camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
        this.camera.position.copy(this.cameraOffset);
        this.camera.lookAt(0, 0, 0);

        this.menuPixelRatio = Math.min(window.devicePixelRatio || 1, 2.0);
        this.gameplayPixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
        this.performanceProfile = 'menu';
        this.loadingPaused = false;

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setPixelRatio(this.menuPixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.darknessOverlay = document.createElement('canvas');
        Object.assign(this.darknessOverlay.style, {
            position: 'absolute',
            inset: '0',
            pointerEvents: 'none',
            opacity: '0',
            transition: 'opacity 450ms ease',
            mixBlendMode: 'multiply',
            zIndex: '2'
        });
        this.darknessOverlayContext = this.darknessOverlay.getContext('2d', { alpha: true });
        this._darknessCenter = new THREE.Vector3();
        this._darknessConePoint = new THREE.Vector3();
        this._darknessConeScreenPoints = [];
        this.container.style.position = this.container.style.position || 'relative';
        this.container.replaceChildren(this.renderer.domElement, this.darknessOverlay);

        const textureLoader = new THREE.TextureLoader();
        this.textureLoader = textureLoader;
        const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
        this.maxTextureAnisotropy = maxAnisotropy;
        this.biomeTerrainTextures = this.createBiomeTerrainTextures(textureLoader, maxAnisotropy);
        const activeTerrainTextures = this.biomeTerrainTextures[BIOME_KEYS.ACTIVE];
        const cryoTerrainTextures = this.biomeTerrainTextures[BIOME_KEYS.CRYO];
        const bioTerrainTextures = this.biomeTerrainTextures[BIOME_KEYS.BIO];

        const baseMetalTex = activeTerrainTextures.floorBase;
        const grungeRustTex = activeTerrainTextures.floorGrunge;
        const techScratchesTex = activeTerrainTextures.floorDetail;
        this.playerTextures = Object.fromEntries(
            Object.entries(PLAYER_SPRITESHEET_PATHS).map(([type, path]) => [
                type,
                this.createPlayerSpriteTexture(type, path, textureLoader)
            ])
        );

        Object.values(this.playerTextures).forEach((texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            texture.repeat.set(PLAYER_SPRITE_FRAME_REPEAT_X, PLAYER_SPRITE_FRAME_REPEAT_Y);
            const defaultDirection = PLAYER_SPRITE_DIRECTION_CELLS[PLAYER_DEFAULT_DIRECTION_INDEX];
            texture.offset.set(
                defaultDirection.baseColumn * PLAYER_SPRITE_FRAME_REPEAT_X,
                (PLAYER_SPRITE_ROWS - 1 - defaultDirection.row) * PLAYER_SPRITE_FRAME_REPEAT_Y
            );
        });

        // Independent clones for the upper-body billboard. They share the source
        // image but carry their own offset/repeat so the torso can aim one way
        // while the legs walk another.
        this.playerTorsoTextures = Object.fromEntries(
            Object.entries(this.playerTextures).map(([type, texture]) => {
                const torso = texture.clone();
                torso.wrapS = THREE.RepeatWrapping;
                torso.wrapT = THREE.RepeatWrapping;
                torso.magFilter = THREE.NearestFilter;
                torso.minFilter = THREE.NearestFilter;
                torso.needsUpdate = true;
                return [type, torso];
            })
        );

        this.floorMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.85,
            metalness: 0.22,
            emissive: new THREE.Color(0x000000)
        });

        // Set map so the ThreeJS compiler compiles mapping features into the shader
        this.floorMaterial.map = baseMetalTex;

        this.floorMaterial.onBeforeCompile = (shader) => {
            shader.uniforms.tBase = { value: baseMetalTex };
            shader.uniforms.tGrunge = { value: grungeRustTex };
            shader.uniforms.tDetail = { value: techScratchesTex };
            shader.uniforms.tCryoBase = { value: cryoTerrainTextures.floorBase };
            shader.uniforms.tCryoGrunge = { value: cryoTerrainTextures.floorGrunge };
            shader.uniforms.tCryoDetail = { value: cryoTerrainTextures.floorDetail };
            shader.uniforms.tBioBase = { value: bioTerrainTextures.floorBase };
            shader.uniforms.tBioGrunge = { value: bioTerrainTextures.floorGrunge };
            shader.uniforms.tBioDetail = { value: bioTerrainTextures.floorDetail };
            shader.uniforms.uShipWorldPos = { value: this.biomeShipAnchor };
            this.floorShaderUniforms = shader.uniforms;

            // Inject world position varying into vertex shader
            shader.vertexShader = shader.vertexShader.replace(
                'void main() {',
                `
                varying vec3 vWorldPos;
                void main() {
                `
            );
            shader.vertexShader = shader.vertexShader.replace(
                '#include <worldpos_vertex>',
                `
                #include <worldpos_vertex>
                vWorldPos = (modelMatrix * vec4( transformed, 1.0 )).xyz;
                `
            );

            // Inject uniforms and varying into fragment shader
            shader.fragmentShader = `
                varying vec3 vWorldPos;
                uniform sampler2D tBase;
                uniform sampler2D tGrunge;
                uniform sampler2D tDetail;
                uniform sampler2D tCryoBase;
                uniform sampler2D tCryoGrunge;
                uniform sampler2D tCryoDetail;
                uniform sampler2D tBioBase;
                uniform sampler2D tBioGrunge;
                uniform sampler2D tBioDetail;
                uniform vec2 uShipWorldPos;
                ${shader.fragmentShader}
            `;

            // Replace standard UV-mapping chunk with our world-space, coprime scale blending
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <map_fragment>',
                `
                #ifdef USE_MAP
                    vec2 uvBase = vWorldPos.xz * 0.12;
                    vec2 uvGrunge = vWorldPos.xz * 0.053;
                    vec2 uvDetail = vWorldPos.xz * 0.27;

                    vec4 bunkerBase = texture2D( tBase, uvBase );
                    vec4 bunkerGrunge = texture2D( tGrunge, uvGrunge );
                    vec4 bunkerDetail = texture2D( tDetail, uvDetail );

                    vec4 cryoBase = texture2D( tCryoBase, uvBase );
                    vec4 cryoGrunge = texture2D( tCryoGrunge, uvGrunge );
                    vec4 cryoDetail = texture2D( tCryoDetail, uvDetail );

                    vec4 bioBase = texture2D( tBioBase, uvBase );
                    vec4 bioGrunge = texture2D( tBioGrunge, uvGrunge );
                    vec4 bioDetail = texture2D( tBioDetail, uvDetail );

                    float distFromShip = length(vWorldPos.xz - uShipWorldPos);
                    float cryoMix = smoothstep(${(BIOME_THRESHOLD_CRYO - BIOME_BLEND_HALF_WIDTH).toFixed(1)}, ${(BIOME_THRESHOLD_CRYO + BIOME_BLEND_HALF_WIDTH).toFixed(1)}, distFromShip);
                    float bioMix = smoothstep(${(BIOME_THRESHOLD_BIO - BIOME_BLEND_HALF_WIDTH).toFixed(1)}, ${(BIOME_THRESHOLD_BIO + BIOME_BLEND_HALF_WIDTH).toFixed(1)}, distFromShip);

                    vec3 bunkerColor = bunkerBase.rgb;
                    float bunkerRustMask = clamp((bunkerGrunge.r * 0.85 + bunkerGrunge.g * 0.35) * 0.95, 0.0, 1.0);
                    vec3 bunkerRustColor = vec3(0.18, 0.09, 0.05) * (0.6 + 0.4 * bunkerGrunge.b);
                    bunkerColor = mix(bunkerColor, bunkerRustColor, bunkerRustMask * 0.88);
                    bunkerColor += vec3(bunkerDetail.r * 0.22);

                    vec3 cryoColor = cryoBase.rgb;
                    float cryoRustMask = clamp((cryoGrunge.r * 0.6 + cryoGrunge.g * 0.55) * 0.9, 0.0, 1.0);
                    vec3 cryoTint = vec3(0.45, 0.67, 0.85) * (0.65 + 0.35 * cryoGrunge.b);
                    cryoColor = mix(cryoColor, cryoTint, cryoRustMask * 0.82);
                    cryoColor += vec3(cryoDetail.r * 0.16);

                    vec3 bioColor = bioBase.rgb;
                    float bioMask = clamp((bioGrunge.g * 0.82 + bioGrunge.r * 0.28) * 1.02, 0.0, 1.0);
                    vec3 bioTint = vec3(0.21, 0.34, 0.16) * (0.7 + 0.3 * bioGrunge.b);
                    bioColor = mix(bioColor, bioTint, bioMask * 0.9);
                    bioColor += vec3(bioDetail.g * 0.18);

                    vec3 floorColor = mix(bunkerColor, cryoColor, cryoMix);
                    floorColor = mix(floorColor, bioColor, bioMix);
                    diffuseColor *= vec4(floorColor, 1.0);
                #endif
                `
            );

            // Add glowing high-tech stencils to emissive light
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <emissivemap_fragment>',
                `
                #include <emissivemap_fragment>
                #ifdef USE_MAP
                    vec2 uvDetailEmissive = vWorldPos.xz * 0.27;
                    vec4 colDetailEmissive = texture2D( tDetail, uvDetailEmissive );
                    float glowIntensity = smoothstep(0.35, 0.7, colDetailEmissive.g * colDetailEmissive.b);
                    totalEmissiveRadiance += vec3(0.0, 0.7, 0.85) * glowIntensity * 1.35;
                #endif
                `
            );
        };

        const wallMetalTex = activeTerrainTextures.wallSide;
        const wallGrungeTex = activeTerrainTextures.wallGrunge;

        this.wallMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.76,
            metalness: 0.26
        });

        // Set map so THREE compiler enables map fragment code path
        this.wallMaterial.map = wallMetalTex;

        this.wallMaterial.onBeforeCompile = (shader) => {
            shader.uniforms.tWallSide = { value: wallMetalTex };
            shader.uniforms.tWallTop = { value: baseMetalTex }; // reuses floor plates for the top face
            shader.uniforms.tWallGrunge = { value: wallGrungeTex };
            shader.uniforms.tCryoWallSide = { value: cryoTerrainTextures.wallSide };
            shader.uniforms.tCryoWallTop = { value: cryoTerrainTextures.wallTop };
            shader.uniforms.tCryoWallGrunge = { value: cryoTerrainTextures.wallGrunge };
            shader.uniforms.tBioWallSide = { value: bioTerrainTextures.wallSide };
            shader.uniforms.tBioWallTop = { value: bioTerrainTextures.wallTop };
            shader.uniforms.tBioWallGrunge = { value: bioTerrainTextures.wallGrunge };
            shader.uniforms.uShipWorldPos = { value: this.biomeShipAnchor };
            this.wallShaderUniforms = shader.uniforms;

            // Inject world position and world normal varyings in vertex shader
            shader.vertexShader = shader.vertexShader.replace(
                'void main() {',
                `
                varying vec3 vWorldPos;
                varying vec3 vWorldNormal;
                void main() {
                `
            );
            shader.vertexShader = shader.vertexShader.replace(
                '#include <worldpos_vertex>',
                `
                #include <worldpos_vertex>
                vWorldPos = (modelMatrix * vec4( transformed, 1.0 )).xyz;
                vWorldNormal = normalize( (modelMatrix * vec4( normal, 0.0 )).xyz );
                `
            );

            // Inject uniforms and varyings in fragment shader
            shader.fragmentShader = `
                varying vec3 vWorldPos;
                varying vec3 vWorldNormal;
                uniform sampler2D tWallSide;
                uniform sampler2D tWallTop;
                uniform sampler2D tWallGrunge;
                uniform sampler2D tCryoWallSide;
                uniform sampler2D tCryoWallTop;
                uniform sampler2D tCryoWallGrunge;
                uniform sampler2D tBioWallSide;
                uniform sampler2D tBioWallTop;
                uniform sampler2D tBioWallGrunge;
                uniform vec2 uShipWorldPos;
                ${shader.fragmentShader}
            `;

            // Replace standard UV-mapping with Triplanar World-Space Projection
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <map_fragment>',
                `
                #ifdef USE_MAP
                    vec3 blendWeights = abs( normalize( vWorldNormal ) );
                    blendWeights /= ( blendWeights.x + blendWeights.y + blendWeights.z );

                    vec2 uvY = vWorldPos.xz * 0.12; 
                    vec2 uvX = vec2( vWorldPos.z * 0.45, vWorldPos.y * 0.35 );
                    vec2 uvZ = vec2( vWorldPos.x * 0.45, vWorldPos.y * 0.35 );
                    vec2 uvGrungeY = vWorldPos.xz * 0.053;
                    vec2 uvGrungeX = vec2( vWorldPos.z * 0.25, vWorldPos.y * 0.2 );
                    vec2 uvGrungeZ = vec2( vWorldPos.x * 0.25, vWorldPos.y * 0.2 );

                    vec4 bunkerY = texture2D( tWallTop, uvY );
                    vec4 bunkerX = texture2D( tWallSide, uvX );
                    vec4 bunkerZ = texture2D( tWallSide, uvZ );
                    vec4 bunkerWallCol = bunkerX * blendWeights.x + bunkerY * blendWeights.y + bunkerZ * blendWeights.z;

                    vec4 bunkerGrungeY = texture2D( tWallGrunge, uvGrungeY );
                    vec4 bunkerGrungeX = texture2D( tWallGrunge, uvGrungeX );
                    vec4 bunkerGrungeZ = texture2D( tWallGrunge, uvGrungeZ );
                    vec4 bunkerWallGrunge = bunkerGrungeX * blendWeights.x + bunkerGrungeY * blendWeights.y + bunkerGrungeZ * blendWeights.z;

                    vec4 cryoY = texture2D( tCryoWallTop, uvY );
                    vec4 cryoX = texture2D( tCryoWallSide, uvX );
                    vec4 cryoZ = texture2D( tCryoWallSide, uvZ );
                    vec4 cryoWallCol = cryoX * blendWeights.x + cryoY * blendWeights.y + cryoZ * blendWeights.z;

                    vec4 cryoGrungeY = texture2D( tCryoWallGrunge, uvGrungeY );
                    vec4 cryoGrungeX = texture2D( tCryoWallGrunge, uvGrungeX );
                    vec4 cryoGrungeZ = texture2D( tCryoWallGrunge, uvGrungeZ );
                    vec4 cryoWallGrunge = cryoGrungeX * blendWeights.x + cryoGrungeY * blendWeights.y + cryoGrungeZ * blendWeights.z;

                    vec4 bioY = texture2D( tBioWallTop, uvY );
                    vec4 bioX = texture2D( tBioWallSide, uvX );
                    vec4 bioZ = texture2D( tBioWallSide, uvZ );
                    vec4 bioWallCol = bioX * blendWeights.x + bioY * blendWeights.y + bioZ * blendWeights.z;

                    vec4 bioGrungeY = texture2D( tBioWallGrunge, uvGrungeY );
                    vec4 bioGrungeX = texture2D( tBioWallGrunge, uvGrungeX );
                    vec4 bioGrungeZ = texture2D( tBioWallGrunge, uvGrungeZ );
                    vec4 bioWallGrunge = bioGrungeX * blendWeights.x + bioGrungeY * blendWeights.y + bioGrungeZ * blendWeights.z;

                    float distFromShip = length(vWorldPos.xz - uShipWorldPos);
                    float cryoMix = smoothstep(${(BIOME_THRESHOLD_CRYO - BIOME_BLEND_HALF_WIDTH).toFixed(1)}, ${(BIOME_THRESHOLD_CRYO + BIOME_BLEND_HALF_WIDTH).toFixed(1)}, distFromShip);
                    float bioMix = smoothstep(${(BIOME_THRESHOLD_BIO - BIOME_BLEND_HALF_WIDTH).toFixed(1)}, ${(BIOME_THRESHOLD_BIO + BIOME_BLEND_HALF_WIDTH).toFixed(1)}, distFromShip);

                    vec3 bunkerBlended = bunkerWallCol.rgb;
                    float bunkerRustMask = clamp((bunkerWallGrunge.r * 0.85 + bunkerWallGrunge.g * 0.3) * 0.95, 0.0, 1.0);
                    vec3 bunkerRustColor = vec3(0.18, 0.09, 0.05) * (0.6 + 0.4 * bunkerWallGrunge.b);
                    bunkerBlended = mix(bunkerBlended, bunkerRustColor, bunkerRustMask * 0.82);

                    vec3 cryoBlended = cryoWallCol.rgb;
                    float cryoMask = clamp((cryoWallGrunge.r * 0.52 + cryoWallGrunge.g * 0.72) * 0.88, 0.0, 1.0);
                    vec3 cryoColor = vec3(0.52, 0.7, 0.86) * (0.65 + 0.35 * cryoWallGrunge.b);
                    cryoBlended = mix(cryoBlended, cryoColor, cryoMask * 0.78);

                    vec3 bioBlended = bioWallCol.rgb;
                    float bioMask = clamp((bioWallGrunge.g * 0.84 + bioWallGrunge.r * 0.24) * 0.98, 0.0, 1.0);
                    vec3 bioColor = vec3(0.2, 0.36, 0.16) * (0.72 + 0.28 * bioWallGrunge.b);
                    bioBlended = mix(bioBlended, bioColor, bioMask * 0.88);

                    vec3 finalWallColor = mix(bunkerBlended, cryoBlended, cryoMix);
                    finalWallColor = mix(finalWallColor, bioBlended, bioMix);
                    diffuseColor *= vec4(finalWallColor, 1.0);
                #endif
                `
            );
        };
        this.playerMaterials = Object.fromEntries(
            Object.entries(this.playerTextures).map(([type, texture]) => {
                const material = new THREE.SpriteMaterial({
                    map: texture,
                    transparent: true,
                    alphaTest: 0.12,
                    depthWrite: false,
                    depthTest: true,
                    fog: false
                });
                material.onBeforeCompile = (shader) => {
                    shader.fragmentShader = shader.fragmentShader.replace(
                        '#include <map_fragment>',
                        `
                        #ifdef USE_MAP
                            vec4 mapTexel = texture2D( map, vMapUv );
                            diffuseColor *= mapTexel;
                        #endif
                        `
                    );
                };
                return [type, material];
            })
        );
        this.playerTorsoMaterials = Object.fromEntries(
            Object.entries(this.playerTorsoTextures).map(([type, texture]) => {
                const material = new THREE.SpriteMaterial({
                    map: texture,
                    transparent: true,
                    alphaTest: 0.12,
                    depthWrite: false,
                    depthTest: true,
                    fog: false
                });
                material.onBeforeCompile = (shader) => {
                    shader.fragmentShader = shader.fragmentShader.replace(
                        '#include <map_fragment>',
                        `
                        #ifdef USE_MAP
                            vec4 mapTexel = texture2D( map, vMapUv );
                            diffuseColor *= mapTexel;
                        #endif
                        `
                    );
                };
                return [type, material];
            })
        );
        this.playerMaterial = new THREE.MeshStandardMaterial({
            color: PLAYER_COLORS[this.playerType] ?? 0xffffff,
            emissive: PLAYER_COLORS[this.playerType] ?? 0xffffff,
            emissiveIntensity: 0.22,
            roughness: 0.3,
            metalness: 0.05
        });
        this.playerMaterial.colorWrite = false;
        this.playerMaterial.depthWrite = false;
        this.pickupAssets = this.createPickupAssets();

        // Most scatter assets carry alpha already. Cyber snails are keyed from black
        // so their background does not render as a dark rectangle.
        this.scatterTextures = {
            cybersnail: this.loadKeyedSpriteTexture('/cybersnail.png', 14),
            cryosnail: this.loadKeyedSpriteTexture('/cryosnail.png', 14),
            sporesnail: this.loadKeyedSpriteTexture('/sporesnail.png', 14),
            crawler: this.loadKeyedSpriteTexture('/cybersnail.png', 14),
            civilian_miner: this.loadKeyedSpriteTexture('/civilian_miner_walk.png', 16),
            civilian_researcher: this.loadKeyedSpriteTexture('/civilian_researcher_walk.png', 16),
            alien_proto_crawler: this.loadKeyedSpriteTexture('/alien_proto_crawler_walk.png', 16),
            alien_proto_spitter: this.loadKeyedSpriteTexture('/alien_proto_spitter_walk.png', 16),
            boss_cybersnail: this.loadKeyedSpriteTexture('/boss_cybersnail.png', 14),
            boss_cryosnail: this.loadKeyedSpriteTexture('/boss_cryosnail.png', 14),
            boss_sporesnail: this.loadKeyedSpriteTexture('/boss_sporesnail.png', 14),
            boss_corrupted_scout: this.loadKeyedSpriteTexture('/boss_corrupted_scout.png', 16),
            boss_corrupted_tank: this.loadKeyedSpriteTexture('/boss_corrupted_tank.png', 16),
            boss_corrupted_engineer: this.loadKeyedSpriteTexture('/boss_corrupted_engineer.png', 16),
            bunker_junk: this.loadScatterTexture('/bunker_junk.png', textureLoader),
            bunker_junk_uncommon: this.loadScatterTexture('/bunker_junk_uncommon.png', textureLoader),
            bunker_junk_rare: this.loadScatterTexture('/bunker_junk_rare.png', textureLoader),
            bunker_junk_legendary: this.loadScatterTexture('/bunker_junk_legendary.png', textureLoader),
            bio_spores: this.loadScatterTexture('/bio_spores.png', textureLoader),
            bio_spores_blue: this.loadScatterTexture('/bio_spores_blue.png', textureLoader),
            bio_spores_amber: this.loadScatterTexture('/bio_spores_amber.png', textureLoader),
            scatter_coolant_puddle: this.loadScatterTexture('/scatter_coolant_puddle.png', textureLoader),
            scatter_ice_stalagmite: this.loadScatterTexture('/scatter_ice_stalagmite.png', textureLoader),
            scatter_bio_pod: this.loadKeyedSpriteTexture('/scatter_bio_pod.png', 22),
            scatter_slime_puddle: this.loadScatterTexture('/scatter_slime_puddle.png', textureLoader),
            scatter_gravel: this.loadScatterTexture('/scatter_gravel.png', textureLoader),
            scatter_cryo_icicle: this.loadScatterTexture('/scatter_cryo_icicle.png', textureLoader),
            scatter_cryo_shards: this.loadScatterTexture('/scatter_cryo_shards.png', textureLoader),
            scatter_bio_moss: this.loadScatterTexture('/scatter_bio_moss.png', textureLoader),
            scatter_cable_coil: this.loadScatterTexture('/scatter_cable_coil.svg', textureLoader),
            scatter_bolts: this.loadScatterTexture('/scatter_bolts.svg', textureLoader),
            body_human_frozen_suit: this.loadScatterTexture('/body_human_frozen_suit.svg', textureLoader),
            body_empty_exosuit: this.loadScatterTexture('/body_empty_exosuit.svg', textureLoader),
            prop_hive_resin_sac: this.loadScatterTexture('/prop_hive_resin_sac.svg', textureLoader),
            ship_wreckage: this.loadScatterTexture('/ship_wreckage.png', textureLoader),
            lore_terminal: this.loadScatterTexture('/bunker_junk_rare.png', textureLoader),
            pit_hole: this.loadScatterTexture('/pit_hole.png', textureLoader),
            decal_scars: this.loadScatterTexture('/decal_scars.png', textureLoader),
            fx_steam_puff: this.loadScatterTexture('/fx_steam_puff.svg', textureLoader),
            fx_spark_burst: this.loadScatterTexture('/fx_spark_burst.svg', textureLoader),
            // Corpse art ships on flat black — key it out like the live snails.
            cybersnail_dead: this.loadKeyedSpriteTexture('/cybersnail_dead.png', 14),
            cryosnail_dead: this.loadKeyedSpriteTexture('/cryosnail_dead.png', 14),
            sporesnail_dead: this.loadKeyedSpriteTexture('/sporesnail_dead.png', 14),
            boss_cybersnail_dead: this.loadKeyedSpriteTexture('/boss_cybersnail_dead.png', 14),
            boss_cryosnail_dead: this.loadKeyedSpriteTexture('/boss_cryosnail_dead.png', 14),
            boss_sporesnail_dead: this.loadKeyedSpriteTexture('/boss_sporesnail_dead.png', 14)
        };

        // 2x2 (4-frame) animated build-structure sheet for build #3 (Note 7).
        // Dedicated texture so UV frame-stepping is isolated; LinearFilter (no
        // mipmaps) avoids bleeding across the frame seam.
        this.buildStructureTexture = this.loadScatterTexture('/build_structure_anim.png', textureLoader);
        this.buildStructureTexture.minFilter = THREE.LinearFilter;
        this.buildStructureTexture.generateMipmaps = false;
        this.buildStructureTexture.repeat.set(BUILD_STRUCTURE_FRAME_REPEAT, BUILD_STRUCTURE_FRAME_REPEAT);
        this.buildStructureTexture.offset.set(0, BUILD_STRUCTURE_FRAME_REPEAT);

        this.scatterMaterials = {
            sentinel: new THREE.SpriteMaterial({
                map: this.scatterTextures.cybersnail,
                transparent: true,
                alphaTest: 0.06,
                depthWrite: false,
                depthTest: true,
                fog: false,
                color: new THREE.Color(0xffdd44)
            }),
            lore_terminal: new THREE.SpriteMaterial({
                map: this.scatterTextures.lore_terminal,
                transparent: true,
                alphaTest: 0.04,
                depthWrite: false,
                depthTest: true,
                fog: false,
                color: new THREE.Color(0xffaa44)
            }),
            cybersnail: new THREE.SpriteMaterial({
                map: this.scatterTextures.cybersnail,
                transparent: true,
                alphaTest: 0.06,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            cryosnail: new THREE.SpriteMaterial({
                map: this.scatterTextures.cryosnail,
                transparent: true,
                alphaTest: 0.06,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            sporesnail: new THREE.SpriteMaterial({
                map: this.scatterTextures.sporesnail,
                transparent: true,
                alphaTest: 0.06,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            crawler: new THREE.SpriteMaterial({
                map: this.scatterTextures.crawler,
                transparent: true,
                alphaTest: 0.06,
                depthWrite: false,
                depthTest: true,
                fog: false,
                color: new THREE.Color(CRAWLER_TINT)
            }),
            civilian_miner: new THREE.SpriteMaterial({
                map: this.scatterTextures.civilian_miner,
                transparent: true,
                alphaTest: 0.06,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            civilian_researcher: new THREE.SpriteMaterial({
                map: this.scatterTextures.civilian_researcher,
                transparent: true,
                alphaTest: 0.06,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            alien_proto_crawler: new THREE.SpriteMaterial({
                map: this.scatterTextures.alien_proto_crawler,
                transparent: true,
                alphaTest: 0.06,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            alien_proto_spitter: new THREE.SpriteMaterial({
                map: this.scatterTextures.alien_proto_spitter,
                transparent: true,
                alphaTest: 0.06,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            boss_cybersnail: new THREE.SpriteMaterial({
                map: this.scatterTextures.boss_cybersnail,
                transparent: true,
                alphaTest: 0.06,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            boss_cryosnail: new THREE.SpriteMaterial({
                map: this.scatterTextures.boss_cryosnail,
                transparent: true,
                alphaTest: 0.06,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            boss_sporesnail: new THREE.SpriteMaterial({
                map: this.scatterTextures.boss_sporesnail,
                transparent: true,
                alphaTest: 0.06,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            boss_corrupted_scout: new THREE.SpriteMaterial({
                map: this.scatterTextures.boss_corrupted_scout,
                transparent: true,
                alphaTest: 0.06,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            boss_corrupted_tank: new THREE.SpriteMaterial({
                map: this.scatterTextures.boss_corrupted_tank,
                transparent: true,
                alphaTest: 0.06,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            boss_corrupted_engineer: new THREE.SpriteMaterial({
                map: this.scatterTextures.boss_corrupted_engineer,
                transparent: true,
                alphaTest: 0.06,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            bunker_junk: new THREE.SpriteMaterial({
                map: this.scatterTextures.bunker_junk,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            bunker_junk_uncommon: new THREE.SpriteMaterial({
                map: this.scatterTextures.bunker_junk_uncommon,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            bunker_junk_rare: new THREE.SpriteMaterial({
                map: this.scatterTextures.bunker_junk_rare,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            bunker_junk_legendary: new THREE.SpriteMaterial({
                map: this.scatterTextures.bunker_junk_legendary,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            bio_spores: new THREE.SpriteMaterial({
                map: this.scatterTextures.bio_spores,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            bio_spores_blue: new THREE.SpriteMaterial({
                map: this.scatterTextures.bio_spores_blue,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            bio_spores_amber: new THREE.SpriteMaterial({
                map: this.scatterTextures.bio_spores_amber,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            scatter_coolant_puddle: new THREE.SpriteMaterial({
                map: this.scatterTextures.scatter_coolant_puddle,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            scatter_ice_stalagmite: new THREE.SpriteMaterial({
                map: this.scatterTextures.scatter_ice_stalagmite,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            scatter_bio_pod: new THREE.SpriteMaterial({
                map: this.scatterTextures.scatter_bio_pod,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            scatter_slime_puddle: new THREE.SpriteMaterial({
                map: this.scatterTextures.scatter_slime_puddle,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            scatter_gravel: new THREE.SpriteMaterial({
                map: this.scatterTextures.scatter_gravel,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            scatter_cryo_icicle: new THREE.SpriteMaterial({
                map: this.scatterTextures.scatter_cryo_icicle,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            scatter_cryo_shards: new THREE.SpriteMaterial({
                map: this.scatterTextures.scatter_cryo_shards,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            scatter_bio_moss: new THREE.SpriteMaterial({
                map: this.scatterTextures.scatter_bio_moss,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            scatter_cable_coil: new THREE.SpriteMaterial({
                map: this.scatterTextures.scatter_cable_coil,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            scatter_bolts: new THREE.SpriteMaterial({
                map: this.scatterTextures.scatter_bolts,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            body_human_frozen_suit: new THREE.SpriteMaterial({
                map: this.scatterTextures.body_human_frozen_suit,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            body_empty_exosuit: new THREE.SpriteMaterial({
                map: this.scatterTextures.body_empty_exosuit,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            prop_hive_resin_sac: new THREE.SpriteMaterial({
                map: this.scatterTextures.prop_hive_resin_sac,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            ship_wreckage: new THREE.SpriteMaterial({
                map: this.scatterTextures.ship_wreckage,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            cybersnail_dead: new THREE.SpriteMaterial({
                map: this.scatterTextures.cybersnail_dead,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            cryosnail_dead: new THREE.SpriteMaterial({
                map: this.scatterTextures.cryosnail_dead,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            sporesnail_dead: new THREE.SpriteMaterial({
                map: this.scatterTextures.sporesnail_dead,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            fx_steam_puff: new THREE.SpriteMaterial({
                map: this.scatterTextures.fx_steam_puff,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            fx_spark_burst: new THREE.SpriteMaterial({
                map: this.scatterTextures.fx_spark_burst,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            boss_cybersnail_dead: new THREE.SpriteMaterial({
                map: this.scatterTextures.boss_cybersnail_dead,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            boss_cryosnail_dead: new THREE.SpriteMaterial({
                map: this.scatterTextures.boss_cryosnail_dead,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            boss_sporesnail_dead: new THREE.SpriteMaterial({
                map: this.scatterTextures.boss_sporesnail_dead,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            })
        };
        this.scatterPlaneMaterials = {
            bunker_junk: new THREE.MeshBasicMaterial({
                map: this.scatterTextures.bunker_junk,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                side: THREE.DoubleSide,
                fog: false
            }),
            bunker_junk_uncommon: new THREE.MeshBasicMaterial({
                map: this.scatterTextures.bunker_junk_uncommon,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                side: THREE.DoubleSide,
                fog: false
            }),
            bunker_junk_rare: new THREE.MeshBasicMaterial({
                map: this.scatterTextures.bunker_junk_rare,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                side: THREE.DoubleSide,
                fog: false
            }),
            bunker_junk_legendary: new THREE.MeshBasicMaterial({
                map: this.scatterTextures.bunker_junk_legendary,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                side: THREE.DoubleSide,
                fog: false
            })
        };
        for (const material of [
            ...Object.values(this.scatterMaterials),
            ...Object.values(this.scatterPlaneMaterials)
        ]) {
            material.fog = true;
        }

        this.holeMaterial = new THREE.MeshBasicMaterial({
            map: this.scatterTextures.pit_hole,
            transparent: true,
            depthWrite: false,
            depthTest: true,
            fog: true
        });

        this.setupLighting();
        this.setupWorld();
        this.setupPlayer();
        this.setupInput();
        this.resize();
        this.syncVisibleChunks(true);
        this.updateBiomeEnvironment({ immediate: true, forceEvent: true });
        this.renderer.setAnimationLoop(() => this.render());
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.9);
        this.scene.add(ambientLight);
        this.ambientLight = ambientLight;

        const fillLight = new THREE.HemisphereLight(0x6b8db3, 0x07090c, 0.8);
        this.scene.add(fillLight);
        this.fillLight = fillLight;

        const directionalLight = new THREE.DirectionalLight(0xd6e7ff, 2.3);
        directionalLight.position.set(10, 18, 8);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 40;
        directionalLight.shadow.camera.left = -14;
        directionalLight.shadow.camera.right = 14;
        directionalLight.shadow.camera.top = 14;
        directionalLight.shadow.camera.bottom = -14;
        this.scene.add(directionalLight);
        this.directionalLight = directionalLight;

        const playerGlow = new THREE.PointLight(PLAYER_COLORS[this.playerType] ?? 0xffffff, 3.8, 11.5, 1.65);
        playerGlow.position.set(0, 1.6, 0);
        this.playerGlow = playerGlow;
        this.scene.add(playerGlow);

        // Base intensities/fog distances captured so the day/night cycle (Note 8)
        // can modulate them multiplicatively without clobbering biome color work.
        this.baseLightIntensity = {
            ambient: ambientLight.intensity,
            directional: directionalLight.intensity,
            fill: fillLight.intensity,
            playerGlow: playerGlow.intensity
        };
        this.baseFogRange = { near: this.scene.fog?.near ?? 10, far: this.scene.fog?.far ?? 28 };
    }

    createMenuGridTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#101316';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const drawGrid = (step, color, width) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.beginPath();
            for (let x = 0; x <= canvas.width; x += step) {
                ctx.moveTo(x + 0.5, 0);
                ctx.lineTo(x + 0.5, canvas.height);
            }
            for (let y = 0; y <= canvas.height; y += step) {
                ctx.moveTo(0, y + 0.5);
                ctx.lineTo(canvas.width, y + 0.5);
            }
            ctx.stroke();
        };

        drawGrid(16, 'rgba(255, 255, 255, 0.16)', 1);
        drawGrid(64, 'rgba(255, 255, 255, 0.36)', 1.5);

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(8, 8);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(this.maxTextureAnisotropy ?? 1, 4);
        return texture;
    }

    setupWorld() {
        const baseFloor = new THREE.Mesh(
            new THREE.CircleGeometry(18, 48),
            new THREE.MeshStandardMaterial({
                color: 0x111418,
                roughness: 1,
                metalness: 0
            })
        );
        baseFloor.rotation.x = -Math.PI / 2;
        baseFloor.position.y = -0.03;
        baseFloor.receiveShadow = true;
        this.scene.add(baseFloor);

        const spawn = this.getSpawnTile();
        this.menuGridTexture = this.createMenuGridTexture();
        const startColorHex = PLAYER_COLORS[this.playerType] ?? 0xffffff;
        this.targetMenuGridColor = new THREE.Color(startColorHex);
        this.menuShowroomFloor = new THREE.Mesh(
            new THREE.PlaneGeometry(MENU_SHOWROOM_FLOOR_SIZE, MENU_SHOWROOM_FLOOR_SIZE),
            new THREE.MeshBasicMaterial({
                map: this.menuGridTexture,
                color: this.targetMenuGridColor.clone(),
                transparent: true,
                opacity: 0.92,
                depthWrite: true,
                depthTest: true
            })
        );
        this.menuShowroomFloor.rotation.x = -Math.PI / 2;
        this.menuShowroomFloor.position.set(
            spawn.x + MENU_SHOWROOM_FLOOR_OFFSET_X,
            -0.06,
            spawn.y + MENU_SHOWROOM_FLOOR_OFFSET_Z
        );
        this.menuShowroomFloor.receiveShadow = true;
        this.menuShowroomFloor.visible = this.performanceProfile === 'menu';
        this.scene.add(this.menuShowroomFloor);

        this.chunkGroups.visible = this.performanceProfile === 'gameplay';
        this.scene.add(this.chunkGroups);
        this.setupCrashedShips();
    }

    setupCrashedShips() {
        // Create SpriteMaterials first and dynamically bind textures as they load
        const scoutShipMat = new THREE.SpriteMaterial({ transparent: true, alphaTest: 0.05, depthWrite: true, depthTest: true });
        const tankShipMat = new THREE.SpriteMaterial({ transparent: true, alphaTest: 0.05, depthWrite: true, depthTest: true });
        const engineerShipMat = new THREE.SpriteMaterial({ transparent: true, alphaTest: 0.05, depthWrite: true, depthTest: true });
        const consoleMat = new THREE.SpriteMaterial({ transparent: true, alphaTest: 0.05, depthWrite: true, depthTest: true });
        const o2ModuleMat = new THREE.SpriteMaterial({ transparent: true, alphaTest: 0.04, depthWrite: true, depthTest: true });
        const hullModuleMat = new THREE.SpriteMaterial({ transparent: true, alphaTest: 0.04, depthWrite: true, depthTest: true, opacity: LOCKED_MODULE_OPACITY });
        const radarModuleMat = new THREE.SpriteMaterial({ transparent: true, alphaTest: 0.04, depthWrite: true, depthTest: true, opacity: LOCKED_MODULE_OPACITY });
        const reactorModuleMat = new THREE.SpriteMaterial({ transparent: true, alphaTest: 0.04, depthWrite: true, depthTest: true, opacity: LOCKED_MODULE_OPACITY });
        this.goalModuleMaterials = {
            hullMatrix: hullModuleMat,
            radarDish: radarModuleMat,
            reactorCompressor: reactorModuleMat
        };

        // Initialize shipTextures dictionary for broken/healed visual progression
        this.shipTextures = {
            SCOUT: { broken: null, healed: null },
            TANK: { broken: null, healed: null },
            ENGINEER: { broken: null, healed: null }
        };

        // Load textures using our high-fidelity chroma-key transparency shader to strip black backgrounds perfectly!
        this.loadKeyedSpriteTexture('/scout_ship.png', 15, (tex) => {
            if (!scoutShipMat.map) {
                scoutShipMat.map = tex;
                scoutShipMat.needsUpdate = true;
            }
        });
        this.loadKeyedSpriteTexture('/scout_ship_broken.png', 15, (tex) => {
            this.shipTextures.SCOUT.broken = tex;
            this.updateShipVisualState();
        });
        this.loadKeyedSpriteTexture('/scout_ship_healed.png', 15, (tex) => {
            this.shipTextures.SCOUT.healed = tex;
            this.updateShipVisualState();
        });

        this.loadKeyedSpriteTexture('/tank_ship.png', 15, (tex) => {
            if (!tankShipMat.map) {
                tankShipMat.map = tex;
                tankShipMat.needsUpdate = true;
            }
        });
        this.loadKeyedSpriteTexture('/tank_ship_broken.png', 15, (tex) => {
            this.shipTextures.TANK.broken = tex;
            this.updateShipVisualState();
        });
        this.loadKeyedSpriteTexture('/tank_ship_healed.png', 15, (tex) => {
            this.shipTextures.TANK.healed = tex;
            this.updateShipVisualState();
        });

        this.loadKeyedSpriteTexture('/engineer_ship.png', 15, (tex) => {
            if (!engineerShipMat.map) {
                engineerShipMat.map = tex;
                engineerShipMat.needsUpdate = true;
            }
        });
        this.loadKeyedSpriteTexture('/engineer_ship_broken.png', 15, (tex) => {
            this.shipTextures.ENGINEER.broken = tex;
            this.updateShipVisualState();
        });
        this.loadKeyedSpriteTexture('/engineer_ship_healed.png', 15, (tex) => {
            this.shipTextures.ENGINEER.healed = tex;
            this.updateShipVisualState();
        });
        this.loadKeyedSpriteTexture('/console.png', 15, (tex) => {
            consoleMat.map = tex;
            consoleMat.needsUpdate = true;
        });
        this.loadKeyedSpriteTexture('/module_o2_generator.png', 18, (tex) => {
            o2ModuleMat.map = tex;
            o2ModuleMat.needsUpdate = true;
        }, { cropBottomRatio: 0.16 });
        this.loadKeyedSpriteTexture('/module_hull_matrix.png', 18, (tex) => {
            hullModuleMat.map = tex;
            hullModuleMat.needsUpdate = true;
        }, { cropBottomRatio: 0.16 });
        this.loadKeyedSpriteTexture('/module_radar_dish.png', 18, (tex) => {
            setSpriteSheetFrame(tex, RADAR_DISH_GRID_SIZE, RADAR_DISH_GRID_SIZE, 0);
            tex.needsUpdate = true;
            radarModuleMat.map = tex;
            radarModuleMat.needsUpdate = true;
        }, { cropBottomRatio: 0.16 });
        this.loadKeyedSpriteTexture('/module_reactor_compressor.png', 18, (tex) => {
            reactorModuleMat.map = tex;
            reactorModuleMat.needsUpdate = true;
        }, { cropBottomRatio: 0.16 });

        // Placements relative to spawn (which is 9, 9 in starting chunk)
        this.crashedShips = [
            {
                type: 'SCOUT',
                tileX: 6,
                tileZ: 6,
                width: 1.3,
                scale: 3.5,
                elevation: 0.1,
                material: scoutShipMat,
                consoleOffset: { x: -1.6, z: 1.6 },
                o2ModuleOffset: { ...O2_MODULE_OFFSET },
                hullModuleOffset: { ...MODULE_OFFSETS.hullMatrix },
                radarModuleOffset: { ...MODULE_OFFSETS.radarDish },
                reactorModuleOffset: { ...MODULE_OFFSETS.reactorCompressor },
                color: 0x7dff5a,
                maxHp: SHIP_MAX_HP,
                hp: SHIP_MAX_HP
            },
            {
                type: 'TANK',
                tileX: 12,
                tileZ: 6,
                width: 1.3,
                scale: 3.5,
                elevation: 0.1,
                material: tankShipMat,
                consoleOffset: { x: -1.6, z: 1.6 },
                o2ModuleOffset: { ...O2_MODULE_OFFSET },
                hullModuleOffset: { ...MODULE_OFFSETS.hullMatrix },
                radarModuleOffset: { ...MODULE_OFFSETS.radarDish },
                reactorModuleOffset: { ...MODULE_OFFSETS.reactorCompressor },
                color: 0xffb700,
                maxHp: SHIP_MAX_HP,
                hp: SHIP_MAX_HP
            },
            {
                type: 'ENGINEER',
                tileX: 9,
                tileZ: 13,
                width: 1.3,
                scale: 3.5,
                elevation: 0.1,
                material: engineerShipMat,
                consoleOffset: { x: -1.6, z: 1.6 },
                o2ModuleOffset: { ...O2_MODULE_OFFSET },
                hullModuleOffset: { ...MODULE_OFFSETS.hullMatrix },
                radarModuleOffset: { ...MODULE_OFFSETS.radarDish },
                reactorModuleOffset: { ...MODULE_OFFSETS.reactorCompressor },
                color: 0x00e5ff,
                maxHp: SHIP_MAX_HP,
                hp: SHIP_MAX_HP
            }
        ];
        // All three wrecks are defined; updateCrashedShipsVisibility shows
        // only the active class's ship (filtering here broke class switching:
        // picking a different hero after construction left NO ship at all).


        const shadowMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.35,
            depthWrite: false
        });

        const consoleShadowMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.25,
            depthWrite: false
        });
        const createModuleSprite = (ship, {
            keyPrefix,
            offset,
            material
        }) => {
            const moduleX = ship.tileX + offset.x;
            const moduleZ = ship.tileZ + offset.z;
            ship[`${keyPrefix}X`] = moduleX;
            ship[`${keyPrefix}Z`] = moduleZ;

            const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.48, 32), consoleShadowMat);
            shadow.rotation.x = -Math.PI / 2;
            shadow.position.set(moduleX, 0.021, moduleZ);
            this.scene.add(shadow);
            ship[`${keyPrefix}Shadow`] = shadow;

            const sprite = new THREE.Sprite(material);
            sprite.center.set(0.5, 0.08);
            sprite.position.set(moduleX, 0.09, moduleZ);
            sprite.scale.set(1.58, 1.58, 1);
            sprite.renderOrder = 4;
            this.scene.add(sprite);
            ship[`${keyPrefix}Sprite`] = sprite;

            return { shadow, sprite };
        };

        for (const ship of this.crashedShips) {
            // 1. Shadow for Ship
            const shadowGeo = new THREE.CircleGeometry(1.2, 32);
            const shadow = new THREE.Mesh(shadowGeo, shadowMat);
            shadow.rotation.x = -Math.PI / 2;
            shadow.position.set(ship.tileX, 0.02, ship.tileZ);
            this.scene.add(shadow);

            // 2. Sprite for Ship
            const shipSprite = new THREE.Sprite(ship.material);
            shipSprite.center.set(0.5, 0.15); // Adjust center so base stands on ground
            shipSprite.position.set(ship.tileX, ship.elevation, ship.tileZ);
            shipSprite.scale.set(ship.scale, ship.scale, 1);
            shipSprite.renderOrder = 4;
            this.scene.add(shipSprite);

            // 3. Console Placement
            const consoleX = ship.tileX + ship.consoleOffset.x;
            const consoleZ = ship.tileZ + ship.consoleOffset.z;

            // Console Shadow
            const consoleShadowGeo = new THREE.CircleGeometry(0.42, 32);
            const consoleShadow = new THREE.Mesh(consoleShadowGeo, consoleShadowMat);
            consoleShadow.rotation.x = -Math.PI / 2;
            consoleShadow.position.set(consoleX, 0.02, consoleZ);
            this.scene.add(consoleShadow);

            // Console Sprite
            const consoleSprite = new THREE.Sprite(consoleMat);
            consoleSprite.center.set(0.5, 0.1);
            consoleSprite.position.set(consoleX, 0.1, consoleZ);
            consoleSprite.scale.set(1.0, 1.0, 1);
            consoleSprite.renderOrder = 4;
            this.scene.add(consoleSprite);

            const o2Module = createModuleSprite(ship, {
                keyPrefix: 'o2Module',
                offset: ship.o2ModuleOffset,
                material: o2ModuleMat
            });
            const hullModule = createModuleSprite(ship, {
                keyPrefix: 'hullModule',
                offset: ship.hullModuleOffset,
                material: hullModuleMat
            });
            const radarModule = createModuleSprite(ship, {
                keyPrefix: 'radarModule',
                offset: ship.radarModuleOffset,
                material: radarModuleMat
            });
            const reactorModule = createModuleSprite(ship, {
                keyPrefix: 'reactorModule',
                offset: ship.reactorModuleOffset,
                material: reactorModuleMat
            });

            // 4. Interactive Console Neon Glowing Ring (Pulsing Indicator)
            const ringGeo = new THREE.RingGeometry(0.38, 0.44, 32);
            const ringMat = new THREE.MeshBasicMaterial({
                color: ship.color,
                transparent: true,
                opacity: 0.85,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            const ringMesh = new THREE.Mesh(ringGeo, ringMat);
            ringMesh.rotation.x = -Math.PI / 2;
            ringMesh.position.set(consoleX, 0.03, consoleZ);
            this.scene.add(ringMesh);
            ship.consoleRing = ringMesh;

            const safeRing = new THREE.Mesh(
                new THREE.RingGeometry(Math.max(0.1, SHIP_NO_FIRE_RADIUS - 0.04), SHIP_NO_FIRE_RADIUS + 0.04, 64),
                new THREE.MeshBasicMaterial({
                    color: ship.color,
                    transparent: true,
                    opacity: 0.14,
                    side: THREE.DoubleSide,
                    depthWrite: false
                })
            );
            safeRing.rotation.x = -Math.PI / 2;
            safeRing.position.set(ship.tileX, 0.028, ship.tileZ);
            this.scene.add(safeRing);
            ship.safeRing = safeRing;

            // 5. Light source for terminal screen (wow factor!)
            const terminalLight = new THREE.PointLight(ship.color, 1.8, 2.8, 2);
            terminalLight.position.set(consoleX, 0.5, consoleZ);
            this.scene.add(terminalLight);

            // Store all 3D objects associated with this base so we can toggle visibility
            ship.threeObjects = [
                shadow,
                shipSprite,
                consoleShadow,
                consoleSprite,
                o2Module.shadow,
                o2Module.sprite,
                hullModule.shadow,
                hullModule.sprite,
                radarModule.shadow,
                radarModule.sprite,
                reactorModule.shadow,
                reactorModule.sprite,
                ringMesh,
                safeRing,
                terminalLight
            ];
        }

        this.syncPersistentUpgrades();
        this.updateCrashedShipsVisibility(false);
        this.emitShipHealthState();
    }

    setupPlayer() {
        this.player = new THREE.Group();

        this.playerMesh = new THREE.Mesh(
            new THREE.SphereGeometry(this.playerRadius, 20, 20),
            this.playerMaterial
        );
        this.playerMesh.position.y = this.playerRadius + 0.02;
        // Keep the collision sphere invisible and prevent a second large shadow under the player.
        this.playerMesh.castShadow = false;
        this.player.add(this.playerMesh);

        this.playerShadow = new THREE.Mesh(
            new THREE.CircleGeometry(0.42, 20),
            new THREE.MeshBasicMaterial({
                color: 0x000000,
                transparent: true,
                opacity: 0.24,
                depthWrite: false
            })
        );
        this.playerShadow.rotation.x = -Math.PI / 2;
        this.playerShadow.position.set(this.playerSpriteLead, 0.035, this.playerSpriteLead);
        this.playerShadow.scale.set(1, 1, 0.7);
        this.player.add(this.playerShadow);

        // Bottom half (legs) — follows movement input. Anchored at the feet and
        // only as tall as the waist split; shows the lower portion of the frame.
        const legsHeight = this.playerSpriteScale * PLAYER_SPRITE_WAIST_SPLIT;
        const torsoHeight = this.playerSpriteScale * (1 - PLAYER_SPRITE_WAIST_SPLIT);
        this.playerSprite = new THREE.Sprite(this.playerMaterials[this.playerType] ?? this.playerMaterials.SCOUT);
        this.playerSprite.center.set(0.5, 0);
        this.playerSprite.position.x = this.playerSpriteLead;
        this.playerSprite.position.y = this.playerHeight;
        this.playerSprite.position.z = this.playerSpriteLead;
        this.playerSprite.scale.set(this.playerSpriteScale, legsHeight, 1);
        this.playerSprite.renderOrder = 5;
        this.player.add(this.playerSprite);

        // Top half (torso/head) — aims independently at the mouse. Stacked
        // directly on top of the legs so the two read as one body.
        this.playerTorsoSprite = new THREE.Sprite(this.playerTorsoMaterials[this.playerType] ?? this.playerTorsoMaterials.SCOUT);
        this.playerTorsoSprite.center.set(0.5, 0);
        this.playerTorsoSprite.position.x = this.playerSpriteLead;
        this.playerTorsoSprite.position.y = this.playerHeight + legsHeight;
        this.playerTorsoSprite.position.z = this.playerSpriteLead;
        this.playerTorsoSprite.scale.set(this.playerSpriteScale, torsoHeight, 1);
        this.playerTorsoSprite.renderOrder = 6;
        this.player.add(this.playerTorsoSprite);

        // Legs face movement, torso faces aim — tracked separately.
        this.torsoFacingRow = this.currentFacingRow;

        this.suitFillLight = new THREE.PointLight(
            PLAYER_COLORS[this.playerType] ?? 0xffffff,
            SUIT_LIGHT_BASE_INTENSITY,
            SUIT_LIGHT_BASE_DISTANCE,
            1.25
        );
        this.suitFillLight.position.set(this.playerSpriteLead * 0.65, 1.0, this.playerSpriteLead * 0.65);
        this.player.add(this.suitFillLight);

        this.setupPlayerForwardLight();

        this.playerMarker = this.createHiddenPlayerMarker();
        this.playerMarker.visible = false;
        this.scene.add(this.playerMarker);

        this.syncPersistentUpgrades();
        this.resetVitalsForRun({ emit: false });

        const spawn = this.getSpawnTile();
        this.player.position.set(spawn.x, 0, spawn.y);
        this.scene.add(this.player);
        this.playerGlow.position.set(spawn.x, 1.6, spawn.y);
        this.playerMarker.position.set(spawn.x, this.playerMarkerHeight, spawn.y);
        this.updatePlayerForwardLight(1, { immediate: true });
        this.updatePlayerSpriteFrame(0, this.currentFacingRow);
        this.ensureO2BubbleVisualState();
        this.emitVitalsState();
        this.emitWeaponClipState();
        this.emitShipHealthState();
    }

    createLightConeTexture(colorHex) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        const color = new THREE.Color(colorHex);
        const r = Math.round(color.r * 255);
        const g = Math.round(color.g * 255);
        const b = Math.round(color.b * 255);
        const neutral = { r: 242, g: 239, b: 226 };

        const image = ctx.createImageData(canvas.width, canvas.height);
        const smoothstep = (edge0, edge1, value) => {
            const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
            return t * t * (3 - 2 * t);
        };

        for (let y = 0; y < canvas.height; y++) {
            const travel = 1 - (y / (canvas.height - 1));
            const halfWidth = 0.018 + Math.pow(travel, 0.92) * 0.47;
            const lengthFade = Math.pow(1 - travel, 0.18) * (1 - smoothstep(0.76, 1, travel));
            for (let x = 0; x < canvas.width; x++) {
                const centeredX = Math.abs((x / (canvas.width - 1)) - 0.5);
                const edge = 1 - smoothstep(halfWidth * 0.58, halfWidth, centeredX);
                const core = 1 - smoothstep(0, halfWidth * 0.45, centeredX);
                const classTint = Math.max(0, edge - core) * 0.1;
                const alpha = Math.max(0, Math.min(1, (edge * 0.16 + core * 0.035) * lengthFade));
                const idx = (y * canvas.width + x) * 4;
                image.data[idx] = Math.round(neutral.r * (1 - classTint) + r * classTint);
                image.data[idx + 1] = Math.round(neutral.g * (1 - classTint) + g * classTint);
                image.data[idx + 2] = Math.round(neutral.b * (1 - classTint) + b * classTint);
                image.data[idx + 3] = Math.round(alpha * 255);
            }
        }

        ctx.putImageData(image, 0, 0);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
        return texture;
    }

    createLightPoolTexture(colorHex) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        const classColor = new THREE.Color(colorHex);
        const neutral = new THREE.Color(SUIT_CONE_LIGHT_COLOR);
        neutral.lerp(classColor, 0.08);
        const r = Math.round(neutral.r * 255);
        const g = Math.round(neutral.g * 255);
        const b = Math.round(neutral.b * 255);

        const glow = ctx.createRadialGradient(128, 128, 6, 128, 128, 126);
        glow.addColorStop(0, `rgba(${r},${g},${b},0.5)`);
        glow.addColorStop(0.42, `rgba(${r},${g},${b},0.18)`);
        glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
        return texture;
    }

    createEmitterGlowTexture(colorHex) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        const classColor = new THREE.Color(colorHex);
        const neutral = new THREE.Color(SUIT_CONE_LIGHT_COLOR);
        neutral.lerp(classColor, 0.12);
        const r = Math.round(neutral.r * 255);
        const g = Math.round(neutral.g * 255);
        const b = Math.round(neutral.b * 255);

        const glow = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
        glow.addColorStop(0, `rgba(255,255,255,0.9)`);
        glow.addColorStop(0.18, `rgba(${r},${g},${b},0.55)`);
        glow.addColorStop(0.58, `rgba(${r},${g},${b},0.15)`);
        glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
        return texture;
    }

    createForwardConeGeometry() {
        // Fan of triangles sharing the apex (emitter) so each rim vertex can be
        // pushed in/out independently. The half-angle is derived from the old
        // flat-triangle proportions so the unobstructed beam keeps its shape.
        const halfAngle = Math.atan2(SUIT_CONE_VISUAL_WIDTH * 0.5, SUIT_CONE_VISUAL_DISTANCE);
        const segments = SUIT_CONE_SEGMENTS;
        const rimCount = segments + 1;

        const positions = new Float32Array((rimCount + 1) * 3); // apex + rim verts
        const uvs = new Float32Array((rimCount + 1) * 2);
        const indices = [];

        // Apex (vertex 0) at the emitter origin.
        uvs[0] = 0.5;
        uvs[1] = 0;

        const rimAngles = new Float32Array(rimCount);
        for (let i = 0; i < rimCount; i++) {
            const t = i / segments;
            const angle = -halfAngle + (2 * halfAngle) * t;
            rimAngles[i] = angle;
            const vi = i + 1; // rim verts start after the apex
            positions[vi * 3] = Math.sin(angle) * SUIT_CONE_VISUAL_DISTANCE;
            positions[vi * 3 + 1] = 0;
            positions[vi * 3 + 2] = Math.cos(angle) * SUIT_CONE_VISUAL_DISTANCE;
            uvs[vi * 2] = t;
            uvs[vi * 2 + 1] = 1;
        }
        for (let i = 0; i < segments; i++) {
            indices.push(0, i + 1, i + 2);
        }

        const geometry = new THREE.BufferGeometry();
        const positionAttr = new THREE.BufferAttribute(positions, 3);
        positionAttr.setUsage(THREE.DynamicDrawUsage);
        geometry.setAttribute('position', positionAttr);
        geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        // Cached for the per-frame occlusion update.
        this._coneRimAngles = rimAngles;
        this._coneRimCount = rimCount;
        this._conePositionAttr = positionAttr;
        return geometry;
    }

    setupPlayerForwardLight() {
        const color = PLAYER_COLORS[this.playerType] ?? 0xffffff;
        this.playerConeTexture = this.createLightConeTexture(color);
        this.playerLightPoolTexture = this.createLightPoolTexture(color);
        this.playerEmitterGlowTexture = this.createEmitterGlowTexture(color);
        this.playerLightPool = new THREE.Mesh(
            new THREE.PlaneGeometry(SUIT_LOCAL_LIGHT_POOL_RADIUS * 2, SUIT_LOCAL_LIGHT_POOL_RADIUS * 2),
            new THREE.MeshBasicMaterial({
                map: this.playerLightPoolTexture,
                color: 0xffffff,
                transparent: true,
                opacity: SUIT_LOCAL_LIGHT_POOL_OPACITY,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                depthTest: true,
                fog: false
            })
        );
        this.playerLightPool.rotation.x = -Math.PI / 2;
        this.playerLightPool.position.y = 0.071;
        this.playerLightPool.renderOrder = 2;
        this.scene.add(this.playerLightPool);

        this.playerForwardCone = new THREE.Mesh(
            this.createForwardConeGeometry(),
            new THREE.MeshBasicMaterial({
                map: this.playerConeTexture,
                color: 0xffffff,
                transparent: true,
                opacity: SUIT_CONE_VISUAL_OPACITY,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                depthTest: true,
                fog: false
            })
        );
        this.playerForwardCone.position.y = 0.072;
        this.playerForwardCone.renderOrder = 3;
        // Rim vertices are rewritten each frame, so skip frustum culling (its
        // bounding sphere would otherwise go stale and pop the beam out of view).
        this.playerForwardCone.frustumCulled = false;
        this.scene.add(this.playerForwardCone);

        this.playerEmitterGlow = new THREE.Sprite(new THREE.SpriteMaterial({
            map: this.playerEmitterGlowTexture,
            color: 0xffffff,
            transparent: true,
            opacity: 0.58,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: true,
            fog: false
        }));
        this.playerEmitterGlow.scale.set(0.72, 0.72, 1);
        this.playerEmitterGlow.renderOrder = 8;
        this.scene.add(this.playerEmitterGlow);

        this.playerForwardLightTarget = new THREE.Object3D();
        this.scene.add(this.playerForwardLightTarget);
        this.playerForwardSpotLight = new THREE.SpotLight(
            SUIT_CONE_LIGHT_COLOR,
            5.8,
            SUIT_CONE_LIGHT_DISTANCE,
            SUIT_CONE_LIGHT_ANGLE,
            0.68,
            1.05
        );
        this.playerForwardSpotLight.position.set(0, SUIT_LIGHT_EMITTER_HEIGHT, 0);
        this.playerForwardSpotLight.target = this.playerForwardLightTarget;
        this.playerForwardSpotLight.castShadow = true;
        this.playerForwardSpotLight.shadow.mapSize.set(1024, 1024);
        this.playerForwardSpotLight.shadow.camera.near = 0.1;
        this.playerForwardSpotLight.shadow.camera.far = SUIT_CONE_LIGHT_DISTANCE + 3;
        this.playerForwardSpotLight.shadow.bias = -0.0008;
        this.scene.add(this.playerForwardSpotLight);
    }

    createHiddenPlayerMarker() {
        const marker = new THREE.Group();
        const segments = 48;
        const points = [];

        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            points.push(new THREE.Vector3(Math.cos(angle) * 0.42, 0, Math.sin(angle) * 0.42));
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineDashedMaterial({
            color: 0xff9f1c,
            dashSize: 0.08,
            gapSize: 0.05,
            transparent: true,
            opacity: 0.95,
            depthTest: false,
            depthWrite: false
        });
        const ring = new THREE.LineLoop(geometry, material);
        ring.computeLineDistances();
        ring.rotation.x = -Math.PI / 2;
        ring.renderOrder = 999;
        marker.add(ring);

        const beacon = new THREE.Mesh(
            new THREE.RingGeometry(0.08, 0.16, 24),
            new THREE.MeshBasicMaterial({
                color: 0xff9f1c,
                transparent: true,
                opacity: 0.9,
                side: THREE.DoubleSide,
                depthTest: false,
                depthWrite: false
            })
        );
        beacon.rotation.x = -Math.PI / 2;
        beacon.position.y = 0.02;
        beacon.renderOrder = 999;
        marker.add(beacon);

        marker.renderOrder = 999;

        return marker;
    }

    setupInput() {
        this.handleKeyDown = (event) => {
            if (!this.isGameplayInputActive()) {
                this.setKeyState(event.code, false);
                return;
            }
            if (this.codeMatchesAction(event.code, 'interact')) {
                this.interactWithConsole();
                this.interactWithO2Generator();
                this.interactWithLoreTerminal();
                this.interactWithFoundry();
                this.interactWithBlackBox();
                this.interactWithCaveEntrance();
                this.interactWithAct2Camp();
                this.interactWithHiveSite();
            }
            if (this.codeMatchesAction(event.code, 'reload')) {
                event.preventDefault();
                this.requestReload({ manual: true });
            }
            if (this.codeMatchesAction(event.code, 'ability')) {
                event.preventDefault();
                this.triggerClassAbility();
            }
            if (this.codeMatchesAction(event.code, 'scan')) {
                event.preventDefault();
                this.triggerRadarScan();
            }
            this.setKeyState(event.code, true);
        };
        this.handleKeyUp = (event) => this.setKeyState(event.code, false);
        this.handlePromptTap = (event) => {
            event.preventDefault();
            if (!this.isGameplayInputActive()) return;
            this.interactWithConsole();
            this.interactWithO2Generator();
            this.interactWithFoundry();
            this.interactWithBlackBox();
            this.interactWithCaveEntrance();
            this.interactWithAct2Camp();
            this.interactWithHiveSite();
        };

        // Pointer/tap state for canvas input.
        this._canvasTapStartX = 0;
        this._canvasTapStartY = 0;
        this._canvasPointerType = 'mouse';
        this.handleCanvasPointerDown = (event) => {
            this._canvasTapStartX = event.clientX;
            this._canvasTapStartY = event.clientY;
            this._canvasPointerType = event.pointerType || 'mouse';
            if (this._canvasPointerType === 'mouse') {
                this.lastMouseClientX = event.clientX;
                this.lastMouseClientY = event.clientY;
            }

            if (!this.isGameplayInputActive()) return;
            const pointerType = this._canvasPointerType;
            const isTouchPointer = pointerType !== 'mouse';
            if (isTouchPointer && this.isInTouchMoveControlBounds(event.clientX, event.clientY)) {
                return;
            }

            if (this.tryInteractWithConsolePointer(event.clientX, event.clientY)) {
                return;
            }
            if (this.tryInteractWithO2Pointer(event.clientX, event.clientY)) {
                return;
            }
            if (this.tryInteractWithFoundryPointer(event.clientX, event.clientY)) {
                return;
            }
            if (this.tryInteractWithBlackBoxPointer(event.clientX, event.clientY)) {
                return;
            }

            this.updateAimFromClient(event.clientX, event.clientY, {
                keepMouseActive: pointerType === 'mouse',
                persistDuration: pointerType === 'mouse' ? 0 : 2.0
            });
            this.tryFireWeapon(event.clientX, event.clientY);
        };

        this.handleCanvasPointerMove = (event) => {
            if (!this.isGameplayInputActive()) return;
            const pointerType = event.pointerType || this._canvasPointerType || 'mouse';
            if (pointerType !== 'mouse') return;
            this.lastMouseClientX = event.clientX;
            this.lastMouseClientY = event.clientY;
            this.updateAimFromClient(event.clientX, event.clientY, {
                keepMouseActive: true,
                persistDuration: 0
            });
        };

        this.handleCanvasTap = (event) => {
            if (!this.isGameplayInputActive()) return;
            const dx = event.clientX - this._canvasTapStartX;
            const dy = event.clientY - this._canvasTapStartY;
            const wasTap = Math.sqrt(dx * dx + dy * dy) < 14;
            if (!wasTap) return;
        };

        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);

        // Milestone retaliation boss: each completed console build provokes a
        // themed boss that heads for the ship (Note 6). Additive — ambient
        // biome bosses are untouched.
        if (FEATURE_MILESTONE_BOSSES) {
            this._onGoalUnlocked = async (event) => {
                const goalKey = event?.detail?.goalKey;
                const bossType = MILESTONE_BOSS_FOR_GOAL[goalKey];
                if (!bossType) return;
                if (goalKey === 'o2Bubble') return;

                this.closeConsoleModal();
                this.setInputEnabled(false);
                try {
                    await this.dialogueManager?.openO2MilestoneDialogue({
                        playerType: this.playerType,
                        goalKey
                    });
                    this.spawnMilestoneBoss(bossType, { sourceGoalKey: goalKey });
                    window.dispatchEvent(new CustomEvent('milestone-boss-warning', {
                        detail: { type: bossType, goalKey }
                    }));
                } finally {
                    this.setInputEnabled(true);
                }

                // Act 1 finale: completing the reactor (last console build)
                // surfaces the distant "final ship component" cave signal.
                if (goalKey === 'reactorCompressor') {
                    this.revealCaveEntrance();
                }
            };
            window.addEventListener('goal-unlocked', this._onGoalUnlocked);
        }

        // Beats 2 & 4: bringing the O2 station online ignites the base flood-light
        // grid and powers up the Fabrication Foundry. The first generator repair
        // (level 0 -> 1) is the trigger; the animated sweep then settles into idle
        // flicker. Idempotent.
        this._onO2BaseLights = (event) => {
            if ((event?.detail?.level ?? 0) < 1) return;
            if (this._o2MilestoneBossQueued) {
                // Later O2 upgrades: grid is already lit (idempotent), no new boss.
                this.igniteBaseLights();
                return;
            }
            this._o2MilestoneBossQueued = true;
            const bossType = MILESTONE_BOSS_FOR_GOAL.o2Bubble;
            setTimeout(() => {
                try { this.renderer?.compile?.(this.scene, this.camera); } catch { /* best effort */ }
            }, 50);
            setTimeout(() => {
                this.startO2StartupSequence(bossType);
            }, 100);
        };
        window.addEventListener('o2-generator-upgraded', this._onO2BaseLights);

        this.consolePromptEl = document.getElementById('console-hud-prompt');
        this.consolePromptEl?.addEventListener('pointerup', this.handlePromptTap);
        this.o2PromptEl = document.getElementById('o2-generator-hud-prompt');
        this.o2PromptEl?.addEventListener('pointerup', this.handlePromptTap);
        this.foundryPromptEl = document.getElementById('foundry-hud-prompt');
        this.foundryPromptEl?.addEventListener('pointerup', this.handlePromptTap);
        this.blackBoxPromptEl = document.getElementById('black-box-hud-prompt');
        this.blackBoxPromptEl?.addEventListener('pointerup', this.handlePromptTap);
        this.renderer.domElement.addEventListener('pointerdown', this.handleCanvasPointerDown);
        this.renderer.domElement.addEventListener('pointermove', this.handleCanvasPointerMove);
        this.renderer.domElement.addEventListener('pointerup', this.handleCanvasTap);
    }

    isInTouchMoveControlBounds(clientX, clientY) {
        const touchMoveControl = document.getElementById('touch-move-control');
        if (!touchMoveControl || touchMoveControl.classList.contains('hidden')) return false;
        const rect = touchMoveControl.getBoundingClientRect();
        return (
            clientX >= rect.left
            && clientX <= rect.right
            && clientY >= rect.top
            && clientY <= rect.bottom
        );
    }

    getWorldAimPoint(clientX, clientY) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
        this._aimRaycaster.setFromCamera({ x: ndcX, y: ndcY }, this.camera);

        const worldPoint = new THREE.Vector3();
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const hit = this._aimRaycaster.ray.intersectPlane(groundPlane, worldPoint);
        if (!hit) return null;
        return worldPoint;
    }

    updateAimFromClient(clientX, clientY, { keepMouseActive = false, persistDuration = 2.0 } = {}) {
        if (!this.player) return null;
        const worldPoint = this.getWorldAimPoint(clientX, clientY);
        if (!worldPoint) return null;

        const aimDirX = worldPoint.x - this.player.position.x;
        const aimDirZ = worldPoint.z - this.player.position.z;
        const length = Math.hypot(aimDirX, aimDirZ);
        if (length <= 0.0001) return null;

        this.aimWorldPoint = worldPoint.clone();
        this.aimDirX = aimDirX / length;
        this.aimDirZ = aimDirZ / length;
        this.aimFacingRow = this.getFacingRow(this.aimDirX, this.aimDirZ);
        this.hasActiveAim = true;
        this.mouseAimActive = keepMouseActive;
        this._aimResetTimer = keepMouseActive ? 0 : Math.max(0, persistDuration);
        return worldPoint;
    }

    setKeyState(code, pressed) {
        if (!this.isGameplayInputActive() && pressed) return;
        if (this.codeMatchesAction(code, 'moveUp')) this.keys.up = pressed;
        if (this.codeMatchesAction(code, 'moveDown')) this.keys.down = pressed;
        if (this.codeMatchesAction(code, 'moveLeft')) this.keys.left = pressed;
        if (this.codeMatchesAction(code, 'moveRight')) this.keys.right = pressed;
        if (this.codeMatchesAction(code, 'sprint')) {
            if (pressed) this.triggerSprintBurst();
            this.keys.shift = false;
        }
    }

    // Resolves the active key bindings (user-remapped or default) and reports
    // whether a key code is bound to a given action's primary/secondary slot.
    codeMatchesAction(code, action) {
        const bindings = (typeof window !== 'undefined' && window.state?.settings?.keyBindings) || DEFAULT_KEY_BINDINGS;
        const slots = bindings[action] ?? DEFAULT_KEY_BINDINGS[action] ?? [];
        return slots.includes(code);
    }

    setVirtualInput(x = 0, z = 0) {
        if (!this.isGameplayInputActive()) {
            this.virtualInput.x = 0;
            this.virtualInput.z = 0;
            return;
        }
        this.virtualInput.x = THREE.MathUtils.clamp(x, -1, 1);
        this.virtualInput.z = THREE.MathUtils.clamp(z, -1, 1);
    }

    setVirtualInputSprint(active = false) {
        if (active) return this.triggerSprintBurst();
        this.keys.shift = false;
        return false;
    }

    triggerSprintBurst() {
        if (!this.isGameplayInputActive()) return false;
        const wasActive = Boolean(this.classAbility?.active);
        const cooldownBefore = this.classAbility?.cooldownRemaining ?? 0;
        this.triggerClassAbility();
        return !wasActive && cooldownBefore <= 0 && Boolean(this.classAbility?.active);
    }

    isGameplayInputActive() {
        return this.performanceProfile === 'gameplay'
            && this.inputEnabled
            && !this.isPlayerDead
            && !this.loadingPaused
            && !this.hasBlockingGameplayOverlay();
    }

    hasBlockingGameplayOverlay() {
        const isVisible = (id) => {
            const el = document.getElementById(id);
            return Boolean(el && !el.classList.contains('hidden'));
        };
        return this.isOrientationLocked()
            || document.body.classList.contains('mission-intro-active')
            || isVisible('console-terminal-modal')
            || isVisible('o2-generator-modal')
            || isVisible('game-over-modal')
            || isVisible('mothership-dialogue')
            || isVisible('confirm-modal')
            || isVisible('settings-popup');
    }

    isOrientationLocked() {
        return document.body.classList.contains('orientation-locked')
            || Boolean(window.HunkerOrientationLock?.isLocked?.());
    }

    clearGameplayInputState() {
        this.keys.up = false;
        this.keys.down = false;
        this.keys.left = false;
        this.keys.right = false;
        this.keys.shift = false;
        this.virtualInput.x = 0;
        this.virtualInput.z = 0;
        this.isMoving = false;
        this.mouseAimActive = false;
        this.hasActiveAim = false;
        this._aimResetTimer = 0;
        this.lastMouseClientX = null;
        this.lastMouseClientY = null;
    }

    setInputEnabled(enabled = true) {
        if (enabled && this.cinematicLock) return; // cinematic owns input until unlocked
        this.inputEnabled = Boolean(enabled);

        if (this.inputEnabled) {
            return;
        }

        this.clearGameplayInputState();

        this.activeInteractiveConsole = null;
        this.activeInteractiveO2Generator = null;
        const promptEl = document.getElementById('console-hud-prompt');
        if (promptEl) {
            promptEl.classList.add('hidden');
            promptEl.classList.remove('visible');
        }
        const o2PromptEl = document.getElementById('o2-generator-hud-prompt');
        if (o2PromptEl) {
            o2PromptEl.classList.add('hidden');
            o2PromptEl.classList.remove('visible');
        }

        const modal = document.getElementById('console-terminal-modal');
        if (modal && !modal.classList.contains('hidden')) {
            modal.classList.add('hidden');
        }
        const o2Modal = document.getElementById('o2-generator-modal');
        if (o2Modal && !o2Modal.classList.contains('hidden')) {
            o2Modal.classList.add('hidden');
        }
    }

    setSnailsEnabled(enabled = true, { removeExisting = true } = {}) {
        this.snailsEnabled = Boolean(enabled);
        if (!this.snailsEnabled && removeExisting) {
            this.removeActiveSnails();
        }
    }

    removeActiveSnails() {
        const survivors = [];
        for (const sprite of this.scatterSprites) {
            if (!this.isEnemyType(sprite?.userData?.type)) {
                survivors.push(sprite);
                continue;
            }

            sprite.parent?.remove(sprite);
            sprite.material?.dispose?.();
            sprite.geometry?.dispose?.();
        }
        this.scatterSprites = survivors;
    }

    getPlayerPosition() {
        if (!this.player) return null;
        return {
            x: this.player.position.x,
            z: this.player.position.z
        };
    }

    isPlayerMoving() {
        return Boolean(this.isMoving);
    }

    getActiveShipInfo() {
        const activeShip = this.crashedShips?.find((ship) => ship.type === this.playerType);
        if (!activeShip) return null;

        const consoleX = activeShip.tileX + activeShip.consoleOffset.x;
        const consoleZ = activeShip.tileZ + activeShip.consoleOffset.z;

        return {
            type: activeShip.type,
            color: activeShip.color,
            tileX: activeShip.tileX,
            tileZ: activeShip.tileZ,
            elevation: activeShip.elevation,
            consoleX,
            consoleZ
        };
    }

    getActiveConsoleDistance() {
        if (!this.player) return Infinity;
        const activeShip = this.crashedShips?.find((ship) => ship.type === this.playerType);
        if (!activeShip) return Infinity;

        const consoleX = activeShip.tileX + activeShip.consoleOffset.x;
        const consoleZ = activeShip.tileZ + activeShip.consoleOffset.z;
        const dx = this.player.position.x - consoleX;
        const dz = this.player.position.z - consoleZ;
        return Math.hypot(dx, dz);
    }

    getWorldScreenPoint(worldX, worldY = 0.1, worldZ) {
        if (!this.camera || !this.renderer?.domElement) return null;
        if (!Number.isFinite(worldX) || !Number.isFinite(worldY) || !Number.isFinite(worldZ)) return null;

        const point = new THREE.Vector3(worldX, worldY, worldZ).project(this.camera);
        const canvas = this.renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        const canvasX = (point.x * 0.5 + 0.5) * rect.width;
        const canvasY = (-point.y * 0.5 + 0.5) * rect.height;

        return {
            x: canvasX,
            y: canvasY,
            viewportX: rect.left + canvasX,
            viewportY: rect.top + canvasY
        };
    }

    getSpawnCompassState() {
        if (!this.player) return null;

        const activeShip = this.crashedShips?.find(ship => ship.type === this.playerType);
        let targetX, targetZ;
        if (activeShip) {
            targetX = activeShip.tileX + activeShip.consoleOffset.x;
            targetZ = activeShip.tileZ + activeShip.consoleOffset.z;
        } else {
            const spawn = this.getSpawnTile();
            targetX = spawn.x;
            targetZ = spawn.y;
        }

        const toTargetX = targetX - this.player.position.x;
        const toTargetZ = targetZ - this.player.position.z;
        let distance = Math.hypot(toTargetX, toTargetZ);

        if (activeShip) {
            // Subtract the console collision threshold so that distance reads 0 when standing right next to it
            const collisionRadius = 0.42 + this.playerRadius * 0.7;
            distance = Math.max(0, distance - collisionRadius);
        }

        const screenX = (toTargetX * this.cameraPlanarRight.x) + (toTargetZ * this.cameraPlanarRight.y);
        const screenY = (toTargetX * this.cameraPlanarForward.x) + (toTargetZ * this.cameraPlanarForward.y);
        const angle = distance > 0.0001
            ? THREE.MathUtils.radToDeg(Math.atan2(screenX, screenY))
            : 0;

        return {
            angle,
            distance,
            radar: this.getRadarCompassState()
        };
    }

    updatePlayerType(type, { poof = true, emitWorldEvents = true } = {}) {
        const requestedType = String(type ?? '').trim().toUpperCase();
        const resolvedType = PLAYER_COLORS[requestedType] ? requestedType : 'ENGINEER';
        this.playerType = resolvedType;
        const color = PLAYER_COLORS[resolvedType] ?? 0xffffff;
        const stats = CLASS_STATS[resolvedType] ?? CLASS_STATS.ENGINEER;
        
        let speed = stats.moveSpeed;
        if (resolvedType === 'SCOUT' && this.bank && this.bank.isSkillUnlocked('scout_speed_1')) {
            speed *= 1.15;
        }
        this.moveSpeed = speed;

        this.o2DrainMult = stats.o2DrainMult;

        let baseMagnet = stats.pickupMagnetRadius ?? PICKUP_MAGNET_RADIUS;
        if (resolvedType === 'SCOUT' && this.bank && this.bank.isSkillUnlocked('scout_magnet_1')) {
            baseMagnet = 5.5;
        } else if (resolvedType === 'ENGINEER' && this.bank && this.bank.isSkillUnlocked('engineer_magnet_1')) {
            baseMagnet = 5.0;
        }
        this.pickupMagnetRadius = baseMagnet;

        this._initClassAbility();
        this.playerSprite.material = this.playerMaterials[resolvedType] ?? this.playerMaterials.SCOUT;
        this.playerSprite.material.needsUpdate = true;
        if (this.playerTorsoSprite) {
            this.playerTorsoSprite.material = this.playerTorsoMaterials[resolvedType] ?? this.playerTorsoMaterials.SCOUT;
            this.playerTorsoSprite.material.needsUpdate = true;
        }
        this.playerMaterial.color.setHex(color);
        this.playerMaterial.emissive.setHex(color);
        this.playerGlow.color.setHex(color);
        if (this.targetMenuGridColor) {
            this.targetMenuGridColor.setHex(color);
        }
        if (poof && this.player) {
            this.spawnShipPoofEffect(this.player.position.x, this.player.position.z, color);
        }
        if (this.suitFillLight?.color) {
            this.suitFillLight.color.setHex(color);
        }
        if (this.playerForwardSpotLight?.color) {
            this.playerForwardSpotLight.color.setHex(SUIT_CONE_LIGHT_COLOR);
        }
        if (this.playerForwardCone?.material) {
            this.playerConeTexture?.dispose?.();
            this.playerConeTexture = this.createLightConeTexture(color);
            this.playerForwardCone.material.map = this.playerConeTexture;
            this.playerForwardCone.material.needsUpdate = true;
        }
        if (this.playerLightPool?.material) {
            this.playerLightPoolTexture?.dispose?.();
            this.playerLightPoolTexture = this.createLightPoolTexture(color);
            this.playerLightPool.material.map = this.playerLightPoolTexture;
            this.playerLightPool.material.needsUpdate = true;
        }
        if (this.playerEmitterGlow?.material) {
            this.playerEmitterGlowTexture?.dispose?.();
            this.playerEmitterGlowTexture = this.createEmitterGlowTexture(color);
            this.playerEmitterGlow.material.map = this.playerEmitterGlowTexture;
            this.playerEmitterGlow.material.needsUpdate = true;
        }
        this.updatePlayerSpriteFrame(0, this.currentFacingRow);

        this.updateCrashedShipsVisibility(poof);
        this.ensureO2BubbleVisualState();
        if (emitWorldEvents) {
            this.updateBiomeEnvironment({ immediate: true, forceEvent: true });
        }
        this.emitVitalsState();
        this.emitShipHealthState();
    }

    updateCrashedShipsVisibility(poof = false) {
        if (!this.crashedShips) return;
        const activeType = String(this.playerType ?? '').trim().toUpperCase();

        for (const ship of this.crashedShips) {
            const shipType = String(ship.type ?? '').trim().toUpperCase();
            const shouldBeVisible = shipType === activeType;

            // Trigger visual 3D smoke poof if it just became visible
            if (shouldBeVisible && !ship.isVisible && poof) {
                this.spawnShipPoofEffect(ship.tileX, ship.tileZ, ship.color);
            }

            ship.isVisible = shouldBeVisible;

            if (ship.threeObjects) {
                for (const obj of ship.threeObjects) {
                    obj.visible = shouldBeVisible;
                }
            }
        }
    }

    spawnShipPoofEffect(x, z, colorHex) {
        const color = new THREE.Color(colorHex);
        const effect = new THREE.Group();
        const smokeMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.38,
            depthWrite: false,
            depthTest: false
        });

        // Spawn 22 glowing smoke spheres expanding and rising!
        for (let i = 0; i < 22; i++) {
            const size = 0.4 + Math.random() * 0.72;
            const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 8), smokeMaterial);
            
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 0.9;
            mesh.position.set(
                x + Math.cos(angle) * radius,
                0.2 + Math.random() * 1.3,
                z + Math.sin(angle) * radius
            );
            
            mesh.userData = {
                vx: (Math.random() - 0.5) * 1.6,
                vy: 1.0 + Math.random() * 1.4,
                vz: (Math.random() - 0.5) * 1.6,
                life: 1.0,
                decay: 0.75 + Math.random() * 0.5
            };
            effect.add(mesh);
        }

        this.scene.add(effect);
        this.transientEffects.push(effect);
    }

    refreshActivePlayerSprite(type) {
        if (!this.playerSprite || this.playerType !== type) {
            return;
        }

        this.playerSprite.material = this.playerMaterials[type] ?? this.playerMaterials.SCOUT;
        this.playerSprite.material.needsUpdate = true;
        if (this.playerTorsoSprite) {
            this.playerTorsoSprite.material = this.playerTorsoMaterials[type] ?? this.playerTorsoMaterials.SCOUT;
            this.playerTorsoSprite.material.needsUpdate = true;
        }
        this.updatePlayerSpriteFrame(0, this.currentFacingRow, this.torsoFacingRow);
    }

    createPlayerSpriteTexture(type, path, _textureLoader) {
        const texture = new THREE.Texture();
        texture.colorSpace = THREE.SRGBColorSpace;

        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0);

            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;

            // Remove chroma green border/background pixels
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const a = data[i + 3];
                if (a > 0) {
                    if (r < 140 && b < 140 && g > 90 && g > r * 1.4 && g > b * 1.4) {
                        data[i + 3] = 0; // Make transparent
                    }
                }
            }

            ctx.putImageData(imgData, 0, 0);

            texture.image = canvas;
            texture.needsUpdate = true;

            this.playerMaterials?.[type] && (this.playerMaterials[type].needsUpdate = true);
            this.refreshActivePlayerSprite(type);
        };

        image.onerror = (error) => {
            console.warn(`[ThreeGame] Failed to load player sprite ${type} from ${path}`, error);
        };

        image.src = path;

        return texture;
    }

    configureTerrainTexture(texture, maxAnisotropy = 1) {
        if (!texture) return;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        if (maxAnisotropy > 1) {
            texture.anisotropy = maxAnisotropy;
        }
    }

    loadTerrainTexture(path, textureLoader, maxAnisotropy = 1, fallbackPath = null) {
        const texture = textureLoader.load(path, (loadedTexture) => {
            this.configureTerrainTexture(loadedTexture, maxAnisotropy);
        }, undefined, (error) => {
            if (!fallbackPath || fallbackPath === path) {
                console.warn(`[ThreeGame] Failed to load terrain texture from ${path}`, error);
                return;
            }

            console.warn(`[ThreeGame] Failed to load ${path}; falling back to ${fallbackPath}`, error);
            textureLoader.load(fallbackPath, (fallbackTexture) => {
                this.configureTerrainTexture(fallbackTexture, maxAnisotropy);
                texture.image = fallbackTexture.image;
                texture.needsUpdate = true;
            }, undefined, (fallbackError) => {
                console.warn(`[ThreeGame] Failed to load terrain fallback texture from ${fallbackPath}`, fallbackError);
            });
        });

        this.configureTerrainTexture(texture, maxAnisotropy);
        return texture;
    }

    createBiomeTerrainTextures(textureLoader, maxAnisotropy = 1) {
        const textures = {};

        for (const biomeKey of BIOME_ORDER) {
            const config = BIOME_TERRAIN_TEXTURE_PATHS[biomeKey];
            const fallback = config?.fallback ?? null;
            textures[biomeKey] = {
                floorBase: this.loadTerrainTexture(config.floorBase, textureLoader, maxAnisotropy, fallback?.floorBase),
                floorGrunge: this.loadTerrainTexture(config.floorGrunge, textureLoader, maxAnisotropy, fallback?.floorGrunge),
                floorDetail: this.loadTerrainTexture(config.floorDetail, textureLoader, maxAnisotropy, fallback?.floorDetail),
                wallSide: this.loadTerrainTexture(config.wallSide, textureLoader, maxAnisotropy, fallback?.wallSide),
                wallTop: this.loadTerrainTexture(config.wallTop, textureLoader, maxAnisotropy, fallback?.wallTop),
                wallGrunge: this.loadTerrainTexture(config.wallGrunge, textureLoader, maxAnisotropy, fallback?.wallGrunge)
            };
        }

        return textures;
    }

    loadScatterTexture(path, textureLoader) {
        return textureLoader.load(path, (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.wrapS = THREE.ClampToEdgeWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;

            const maxAnisotropy = this.renderer?.capabilities?.getMaxAnisotropy?.() ?? 1;
            if (maxAnisotropy > 1) {
                texture.anisotropy = Math.min(4, maxAnisotropy);
            }
        }, undefined, (error) => {
            console.warn(`[ThreeGame] Failed to load scatter texture from ${path}`, error);
        });
    }

    loadKeyedSpriteTexture(path, threshold = 15, onLoad = null, options = {}) {
        const texture = new THREE.Texture();
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;

        const image = new Image();
        image.onload = () => {
            const cropBottomRatioRaw = Number(options?.cropBottomRatio);
            const cropBottomRatio = Number.isFinite(cropBottomRatioRaw)
                ? THREE.MathUtils.clamp(cropBottomRatioRaw, 0, 0.9)
                : 0;
            const sourceHeight = Math.max(1, Math.floor(image.height * (1 - cropBottomRatio)));

            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = sourceHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(
                image,
                0,
                0,
                image.width,
                sourceHeight,
                0,
                0,
                image.width,
                sourceHeight
            );

            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            applyBlackChromaKey(imgData, { threshold });

            ctx.putImageData(imgData, 0, 0);
            
            texture.image = canvas;
            texture.needsUpdate = true;
            if (onLoad) {
                onLoad(texture);
            }
        };

        image.onerror = (err) => {
            console.error(`[ThreeGame] loadKeyedSpriteTexture: Failed to load image: ${path}`, err);
        };

        image.src = path;

        return texture;
    }

    loadDecalTexture(path) {
        const texture = new THREE.Texture();
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;

        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0);

            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;
            let minX = image.width;
            let minY = image.height;
            let maxX = 0;
            let maxY = 0;
            let foundVisible = false;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const maxChannel = Math.max(r, g, b);
                const pixelIndex = i / 4;
                const x = pixelIndex % image.width;
                const y = Math.floor(pixelIndex / image.width);
                let alpha = 0;

                if (maxChannel > 6) {
                    alpha = Math.min(255, Math.max(0, ((maxChannel - 6) / 40) * 255));
                }

                data[i + 3] = Math.max(data[i + 3], alpha);

                if (data[i + 3] > 10) {
                    foundVisible = true;
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }

            if (!foundVisible) {
                ctx.putImageData(imgData, 0, 0);
                texture.image = canvas;
                texture.needsUpdate = true;
                return;
            }

            const padding = 12;
            const cropX = Math.max(0, minX - padding);
            const cropY = Math.max(0, minY - padding);
            const cropWidth = Math.min(image.width - cropX, (maxX - minX + 1) + padding * 2);
            const cropHeight = Math.min(image.height - cropY, (maxY - minY + 1) + padding * 2);
            const croppedCanvas = document.createElement('canvas');
            croppedCanvas.width = cropWidth;
            croppedCanvas.height = cropHeight;
            const croppedCtx = croppedCanvas.getContext('2d');

            ctx.putImageData(imgData, 0, 0);
            croppedCtx.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
            
            texture.image = croppedCanvas;
            texture.needsUpdate = true;
        };

        image.onerror = (err) => {
            console.error(`[ThreeGame] loadDecalTexture: Failed to load image: ${path}`, err);
        };

        image.src = path;

        return texture;
    }

    resize() {
        const width = this.container.clientWidth || 1;
        const height = this.container.clientHeight || 1;
        const aspect = width / height;
        const viewSize = 6.8;

        this.camera.left = -viewSize * aspect;
        this.camera.right = viewSize * aspect;
        this.camera.top = viewSize;
        this.camera.bottom = -viewSize;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height, false);
    }

    setLoadingPaused(paused = false) {
        this.loadingPaused = Boolean(paused);
        this.lastTime = performance.now();
        if (!this.loadingPaused && this.performanceProfile === 'menu') {
            this.positionMenuShowroomFloor();
            this.snapCameraToPlayer();
        }
    }

    positionMenuShowroomFloor() {
        if (!this.menuShowroomFloor) return;
        const spawn = this.getSpawnTile();
        this.menuShowroomFloor.position.set(
            spawn.x + MENU_SHOWROOM_FLOOR_OFFSET_X,
            -0.06,
            spawn.y + MENU_SHOWROOM_FLOOR_OFFSET_Z
        );
    }

    setPerformanceProfile(profile = 'menu') {
        const nextProfile = profile === 'gameplay' ? 'gameplay' : 'menu';
        if (this.performanceProfile === nextProfile) return;
        this.performanceProfile = nextProfile;
        this.visibleChunkRadius = nextProfile === 'gameplay'
            ? this.defaultVisibleChunkRadius
            : 0;
        if (nextProfile === 'gameplay') {
            this.virtualInput.x = 0;
            this.virtualInput.z = 0;
            this._menuShowcaseTimer = 0;
            this._menuShowcaseShotTimer = 0;
        } else if (nextProfile === 'menu') {
            // Teleport player immediately to the isolated menu showroom spawn coordinate
            const spawn = this.getSpawnTile();
            if (this.player) {
                this.player.position.set(spawn.x, 0, spawn.y);
                this.playerGlow.position.set(spawn.x, 1.6, spawn.y);
                if (this.playerMarker) {
                    this.playerMarker.position.set(spawn.x, this.playerMarkerHeight, spawn.y);
                }
                this.updatePlayerForwardLight(1, { immediate: true });
                this.positionMenuShowroomFloor();
                this.snapCameraToPlayer();
            }
            this.clearLoadedChunksForRunReset();
            window.AudioManager?.stopAmbience?.();
            if (typeof window.transitionToMenuMusic === 'function') {
                window.transitionToMenuMusic();
            } else {
                window.AudioManager?.startMenuMusic?.();
            }
        }
        if (this.menuShowroomFloor) {
            this.menuShowroomFloor.visible = nextProfile === 'menu';
        }
        if (nextProfile === 'menu' && this.darknessOverlay) {
            this.darknessOverlay.style.opacity = '0';
        }
        if (this.chunkGroups) {
            this.chunkGroups.visible = nextProfile === 'gameplay';
        }
        const targetPixelRatio = nextProfile === 'gameplay'
            ? this.gameplayPixelRatio
            : this.menuPixelRatio;
        if (Math.abs(this.renderer.getPixelRatio() - targetPixelRatio) > 0.001) {
            this.renderer.setPixelRatio(targetPixelRatio);
        }
        this.resize();
    }

    updateMenuShowcase(delta) {
        if (this.performanceProfile !== 'menu' || !this.player || this.isPlayerDead) return;

        this.keys.up = false;
        this.keys.down = false;
        this.keys.left = false;
        this.keys.right = false;
        this.keys.shift = false;

        const sideDuration = 1.65;
        this._menuShowcaseTimer = (this._menuShowcaseTimer ?? 0) + delta;
        const phaseFloat = this._menuShowcaseTimer / sideDuration;
        const phase = Math.floor(phaseFloat) % 4;
        const phaseProgress = phaseFloat - Math.floor(phaseFloat);

        const moveDirs = [
            { x: 1, z: 0 },
            { x: 0, z: 1 },
            { x: -1, z: 0 },
            { x: 0, z: -1 }
        ];
        const shootDirs = [
            { x: 0, z: -1 },
            { x: 1, z: 0 },
            { x: 0, z: 1 },
            { x: -1, z: 0 }
        ];

        const moveDir = moveDirs[phase];
        const shootDir = shootDirs[phase];
        this.virtualInput.x = moveDir.x;
        this.virtualInput.z = moveDir.z;
        this.hasActiveAim = true;
        this.aimDirX = shootDir.x;
        this.aimDirZ = shootDir.z;
        this.aimFacingRow = this.getFacingRow(shootDir.x, shootDir.z);

        const burstActive = phaseProgress >= 0.22 && phaseProgress <= 0.4;
        if (burstActive) {
            this._abilityMoveSpeedMult = Math.max(this._abilityMoveSpeedMult ?? 1, 2.5);
            if (Math.random() < 0.28) {
                this._spawnSprintTrail();
            }
        }

        this._menuShowcaseShotTimer = (this._menuShowcaseShotTimer ?? 0) - delta;
        if (this._menuShowcaseShotTimer <= 0) {
            this._menuShowcaseShotTimer = 0.34 + Math.random() * 0.14;
            const spread = (Math.random() - 0.5) * 0.14;
            const cos = Math.cos(spread);
            const sin = Math.sin(spread);
            const vx = (shootDir.x * cos) - (shootDir.z * sin);
            const vz = (shootDir.x * sin) + (shootDir.z * cos);
            this.spawnProjectile({
                x: this.player.position.x + vx * 0.56,
                z: this.player.position.z + vz * 0.56,
                vx: vx * PROJECTILE_SPEED,
                vz: vz * PROJECTILE_SPEED,
                ttl: Math.min(PROJECTILE_TTL, 0.95),
                damage: PROJECTILE_DAMAGE,
                radius: PROJECTILE_RADIUS
            });
        }
    }

    render() {
        const now = performance.now();
        const delta = Math.min((now - this.lastTime) / 1000, 0.05);
        this.lastTime = now;

        if (this.hitstopTimer > 0) {
            this.hitstopTimer -= delta * 1000;
            this.renderer.render(this.scene, this.camera);
            return;
        }

        if (this.loadingPaused) {
            if (this.darknessOverlay) this.darknessOverlay.style.opacity = '0';
            return;
        }

        if (this.isOrientationLocked()) {
            this.clearGameplayInputState();
            if (this.darknessOverlay) this.darknessOverlay.style.opacity = '0';
            this.updateHiddenPlayerMarker(now);
            this.renderer.render(this.scene, this.camera);
            return;
        }

        if (this.performanceProfile === 'menu') {
            if (this.darknessOverlay) this.darknessOverlay.style.opacity = '0';
            this.updateMenuShowcase(delta);
            if (this.menuShowroomFloor?.material?.color && this.targetMenuGridColor) {
                this.menuShowroomFloor.material.color.lerp(this.targetMenuGridColor, delta * 5);
            }
            this.updatePlayer(delta);
            this.updateWeaponState(delta);
            this.updateProjectiles(delta);
            this.updateCamera(delta);
            this.updateTransientEffects(delta, now);
            this.updateHiddenPlayerMarker(now);
            this.renderer.render(this.scene, this.camera);
            return;
        }

        if (this.hasBlockingGameplayOverlay()) {
            this.clearGameplayInputState();
            this.updateCamera(delta);
            this.updateHiddenPlayerMarker(now);
            this.renderer.render(this.scene, this.camera);
            return;
        }

        // Adaptive quality: if FPS drops below 45 for 5s, reduce chunk radius (only active during gameplay)
        if (delta > 0) {
            const fps = 1 / delta;
            if (fps < 45) {
                this._lowFpsTimer = (this._lowFpsTimer ?? 0) + delta;
                if (this._lowFpsTimer >= 5 && this.visibleChunkRadius > 0) {
                    this.visibleChunkRadius = 0;
                }
            } else {
                this._lowFpsTimer = 0;
                if (this.visibleChunkRadius === 0 && fps > 55) {
                    this.visibleChunkRadius = this.defaultVisibleChunkRadius; // restore if performance recovers
                }
            }
        }

        this.updateClassAbility(delta);
        this.updateRadarScans(delta);
        this.updatePlayer(delta);
        this.updateBiomeEnvironment({ delta });
        this.updateWeather(delta);
        this.updateDayNightCycle(delta);
        this.updateTerminalClockTick(now);
        this.updateWeaponState(delta);
        this.updateProjectiles(delta);
        this.updateCamera(delta);
        this._lastFrameDeltaForChunkMounts = delta;
        this.syncVisibleChunks();
        this.updatePickups(delta, now);
        this.updateScatter(delta, now);
        this.updateCorpses(delta);
        this.updateLoreDrops(delta);
        this.updateBuildSiteBeacon(now);
        this.updateTransientEffects(delta, now);
        this.updateHiddenPlayerMarker(now);
        this.updateConsoles(delta, now);
        this.updateLoreTerminals();
        this.updateVitals(delta);
        this.updateO2StartupSequence(delta);
        this.baseLights?.update(delta);
        this.foundry?.update(delta);
        this.updateFoundryPrompt();
        this.updateCaveEntrance(delta);
        this.updateAct2(delta);
        this.updateCamps(delta);
        this.updateHiveSites(delta);
        this.updateInfectionPressure(delta);
        this.updateShipVisualState(now);
        this.updateBlackBoxMarker(delta);
        this.updateRunModifierEffects(delta);
        this.updateBunkerDirector(delta);
        this.updateLoopStep();
        this.renderer.render(this.scene, this.camera);
    }

    // Feed the Director a run-state snapshot and execute whatever lever it pulls.
    updateBunkerDirector(delta) {
        if (!this.bunkerDirector || !this.player || this.isPlayerDead || !this.snailsEnabled) return;
        if (!this.isGameplayInputActive()) return;
        this.syncRunModifierCards();
        const cardEffects = this.getRunCardEffects();
        const generatorState = this.getO2GeneratorState?.();
        const inSafeField = Boolean(generatorState?.isOnline)
            && this.getActiveO2GeneratorDistance() <= (generatorState?.radius ?? 0);
        const snapshot = {
            hpFrac: (this.playerVitals?.hp ?? 1) / Math.max(1, this.playerVitals?.maxHp ?? 1),
            o2Frac: (this.playerVitals?.o2 ?? 100) / 100,
            depth: this.getActiveO2GeneratorDistance?.() ?? 0,
            inSafeField,
            patrolBias: Boolean(cardEffects.spawnBias?.patrolBias) || this.currentRunModifier?.id === 'patrol_surge'
        };
        const action = this.bunkerDirector.tick(delta, snapshot);
        if (action) this.executeDirectorAction(action);
    }

    executeDirectorAction(action) {
        switch (action) {
            case 'patrol':
                this.showBunkerLine(getDialogueLine('director') ?? 'A maintenance event has been scheduled around your location.');
                this.spawnPatrolNearPlayer();
                break;
            case 'lightsout':
                this.triggerLightsOut(6);
                break;
            case 'corrupt':
                this.corruptCompass(18);
                this.showBunkerLine('Navigation telemetry has been reclassified as suggestion.');
                break;
            case 'mercy':
                this.grantSalvageCache({ tech: 6, coin: 4 });
                this.showBunkerLine('Hardship subsidy released. Do not mistake this for compassion.');
                break;
            case 'taunt':
                this.showBunkerLine(getDialogueLine('director') ?? '');
                break;
            default:
                break;
        }
    }

    getRunCardEffects() {
        const directorEffects = this.bunkerDirector?.cardEffects;
        if (directorEffects && Object.keys(directorEffects).length > 0) return directorEffects;
        return this.currentRunModifier?.effects ?? {};
    }

    getCampVerbRuntimeEffects() {
        const camps = (this.act2?.getState?.().camps ?? []).filter((camp) => (
            camp.discovered
            || (camp.level ?? 0) > 0
            || (camp.bond ?? 0) > 0
            || ['recruited', 'turned'].includes(camp.status)
        ));
        return mergeCampVerbEffects(camps, this.playerType);
    }

    getAct2ClassPerks() {
        return getAct2ClassPerksConfig(this.playerType);
    }

    getRunManifestOptions() {
        const effects = this.getRunCardEffects();
        return {
            eggSeatRequiresNahl: Boolean(effects.manifest?.eggSeatRequiresNahl)
        };
    }

    getManifestInvalidReasonText(reason, manifest = {}) {
        if (reason === 'seat_capacity_exceeded') return `over capacity (${manifest.seatsUsed}/${manifest.seatsMax} seats)`;
        if (reason === 'egg_requires_nahl') return 'egg instability requires Nahl aboard';
        if (reason === 'egg_unstable') return 'egg needs the queen or Nahl aboard';
        return String(reason).replace(/_/g, ' ');
    }

    applyCampPayoutEffects(payout = {}, campId = '') {
        return applyCampPayoutEffects(payout, {
            campId,
            effects: this.getRunCardEffects()
        });
    }

    syncRunModifierCards() {
        const modifier = this.currentRunModifier;
        if (!modifier || this._syncedRunModifier === modifier) return;
        this._syncedRunModifier = modifier;
        if (modifier.cards?.length && this.bunkerDirector?.setRunCards) {
            this.bunkerDirector.setRunCards({
                seed: modifier.seed ?? modifier.id ?? 'default',
                cards: modifier.cards,
                effects: modifier.effects
            });
        }
        const cards = this.bunkerDirector?.cardState?.publicCards ?? [];
        if (cards.length) {
            window.dispatchEvent(new CustomEvent('run-cards-drawn', {
                detail: { seed: this.bunkerDirector.runSeed, cards }
            }));
        }
    }

    // Per-run card effects. The picked cards are set on currentRunModifier from
    // main.js at deploy, then synced into BunkerDirector for consumers.
    updateRunModifierEffects(delta) {
        this.syncRunModifierCards();
        const effects = this.getRunCardEffects();
        const hasEffects = effects && Object.keys(effects).length > 0;
        const id = this.currentRunModifier?.id;
        if ((!id && !hasEffects) || !this.isGameplayInputActive() || this.isPlayerDead) return;
        const generatorState = this.getO2GeneratorState?.();
        const inField = Boolean(generatorState?.isOnline)
            && this.getActiveO2GeneratorDistance() <= (generatorState?.radius ?? 0);
        if (effects.environment?.blackoutPulseSeconds || id === 'rolling_blackout') {
            this._blackoutWaveTimer = (this._blackoutWaveTimer ?? 0) + delta;
            const pulseSeconds = effects.environment?.blackoutPulseSeconds ?? 14;
            const duration = effects.environment?.blackoutDurationSeconds ?? 3;
            if (!inField && this._blackoutWaveTimer >= pulseSeconds && performance.now() >= (this._lightsOutUntil ?? 0)) {
                this._blackoutWaveTimer = 0;
                this.triggerLightsOut(duration);
            }
        } else if (id === 'bad_map_data') {
            // Compass telemetry jitters periodically.
            this._badMapTimer = (this._badMapTimer ?? 0) + delta;
            if (!inField && this._badMapTimer >= 20 && performance.now() >= (this._compassCorruptUntil ?? 0)) {
                this._badMapTimer = 0;
                this.corruptCompass(6);
            }
        } else if (id === 'unstable_doors') {
            // Old seals slam — a false movement ping (audio only) to fray nerves.
            this._unstableDoorTimer = (this._unstableDoorTimer ?? 0) + delta;
            if (!inField && this._unstableDoorTimer >= 11) {
                this._unstableDoorTimer = 0;
                window.AudioManager?.play?.('door_slam_vertical', { volume: 0.18, playbackRate: 0.7, bus: 'sfx' });
            }
        }
    }

    // Derive the single "next action" for the persistent loop-state HUD (T1).
    // Priority follows the arc spine, falling back to the mission/explore goal so
    // a fresh player always knows the next step from the HUD alone.
    getLoopStep() {
        if (!this.player || this.isPlayerDead) return null;

        // Act 2 owns the loop HUD outright — the human mission loop is over.
        if (this.isAct2Active()) {
            const objective = this.getAct2Objective();
            return objective ? { key: `act2-${objective.key}`, label: objective.label } : null;
        }

        const mission = this.missionState;
        if (mission?.status === 'extracted') return { key: 'done', label: 'EXTRACTION COMPLETE' };
        if (mission?.status === 'elevator_down') return { key: 'elevator', label: 'SURVIVE ELEVATOR ARRIVAL' };
        if (mission?.status === 'elevator_ready') return { key: 'elevator-choice', label: 'CHOOSE EXTRACT OR DESCEND' };

        // Dead-suit recovery (T9) outranks everything when a box is in this sector.
        if (this._blackBoxMarkerActive) return { key: 'blackbox', label: 'RECOVER BLACK BOX' };

        const o2 = this.getO2GeneratorState();
        const bossAlive = this.scatterSprites?.some(
            (s) => s.userData?.isMilestone && !s.userData?.burstTriggered
        );
        if (bossAlive) return { key: 'defend', label: 'DEFEND THE BASE' };

        const inventory = this.getSessionInventory();
        if ((inventory.total ?? 0) > 0 && !o2?.isOnline) return { key: 'bank', label: 'BANK SALVAGE' };

        // Act 1 finale: the distant cave outranks the rest of the loop.
        if (this.caveEntrance?.isRevealed && !this.isCaveRevealDone()) {
            const atCave = this.caveEntrance.isWithinInteractRange(this.player.position.x, this.player.position.z);
            return atCave
                ? { key: 'cave', label: 'RECOVER FINAL COMPONENT' }
                : { key: 'cave', label: 'FOLLOW FINAL COMPONENT SIGNAL' };
        }

        const foundryRevealed = this.foundry?.isRevealed;
        if (foundryRevealed) {
            const atFoundry = this.foundry.isWithinInteractRange(
                this.player.position.x,
                this.player.position.z
            );
            const activated = this.bank?.isFoundryActivated?.() ?? false;
            if (!activated) {
                return atFoundry
                    ? { key: 'activate-fab', label: 'ACTIVATE FAB BAY' }
                    : { key: 'foundry', label: 'FOLLOW FOUNDRY SIGNAL' };
            }
            if (atFoundry) return { key: 'fabricate', label: 'FABRICATE' };
            // Activated and away from it: fall through so the loop HUD keeps
            // pointing at the actual next objective instead of the old foundry.
        }

        if (mission?.status === 'objective_complete') return { key: 'extract', label: 'EXTRACT — RETURN TO SHIP' };
        if (!o2?.isOnline) return { key: 'o2', label: 'REPAIR O2 AT THE SHIP' };
        if (mission?.type && mission.label) return { key: 'objective', label: 'SECURE ACTIVE OBJECTIVE' };
        return { key: 'explore', label: 'EXPLORE · BANK SALVAGE' };
    }

    updateLoopStep(force = false) {
        const step = this.getLoopStep();
        const key = step?.key ?? null;
        if (!force && key === this._lastLoopStepKey) return;
        this._lastLoopStepKey = key;
        window.dispatchEvent(new CustomEvent('loop-step-changed', { detail: step }));
    }

    createBlackBoxMarker(state) {
        const marker = new THREE.Group();

        // 1. Red neon pulse ring under the corpse
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.55, 0.72, 32),
            new THREE.MeshBasicMaterial({
                color: 0xff3344,
                transparent: true,
                opacity: 0.65,
                side: THREE.DoubleSide,
                depthWrite: false
            })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.04;
        ring.userData.blackBoxOwnedMaterial = true;
        marker.add(ring);

        // 2. Body corpse geometry group
        const bodyGroup = new THREE.Group();
        
        const suitColors = {
            SCOUT: 0xd4af37,     // scout gold/yellow
            TANK: 0x990000,      // tank heavy red
            ENGINEER: 0x0055ff   // engineer tech blue
        };
        const suitColor = suitColors[state.classType] ?? 0xd4af37;
        const torsoMat = new THREE.MeshStandardMaterial({
            color: suitColor,
            metalness: 0.7,
            roughness: 0.5
        });
        
        // Torso
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.22, 0.4), torsoMat);
        torso.position.set(0, 0.11, 0);
        torso.userData.blackBoxOwnedMaterial = true;
        bodyGroup.add(torso);

        // Helmet/Head
        const visorColors = {
            SCOUT: 0x00ffcc,
            TANK: 0xffaa00,
            ENGINEER: 0x00e5ff
        };
        const visorColor = visorColors[state.classType] ?? 0x00ffcc;
        const headGroup = new THREE.Group();
        
        const helmet = new THREE.Mesh(
            new THREE.SphereGeometry(0.18, 12, 12),
            new THREE.MeshStandardMaterial({ color: 0x22252a, metalness: 0.8, roughness: 0.3 })
        );
        helmet.position.set(0, 0.14, 0);
        helmet.userData.blackBoxOwnedMaterial = true;
        headGroup.add(helmet);
        
        const visor = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.06, 0.18),
            new THREE.MeshBasicMaterial({ color: visorColor, transparent: true, opacity: 0.6 })
        );
        visor.position.set(0.1, 0.15, 0);
        visor.userData.blackBoxOwnedMaterial = true;
        headGroup.add(visor);

        headGroup.position.set(-0.4, 0, 0);
        bodyGroup.add(headGroup);

        // Limbs
        const boneMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.8 });
        
        // Left Leg
        const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.38, 6), torsoMat);
        legL.rotation.z = Math.PI / 2 + 0.25;
        legL.position.set(0.42, 0.08, -0.12);
        legL.userData.blackBoxOwnedMaterial = true;
        bodyGroup.add(legL);

        // Right Leg
        const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.38, 6), torsoMat);
        legR.rotation.z = Math.PI / 2 - 0.25;
        legR.position.set(0.42, 0.08, 0.12);
        legR.userData.blackBoxOwnedMaterial = true;
        bodyGroup.add(legR);

        // Left Arm
        const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.32, 6), torsoMat);
        armL.rotation.y = 0.5;
        armL.rotation.z = Math.PI / 4;
        armL.position.set(-0.15, 0.09, -0.22);
        armL.userData.blackBoxOwnedMaterial = true;
        bodyGroup.add(armL);

        // Right Arm
        const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.32, 6), torsoMat);
        armR.rotation.y = -0.5;
        armR.rotation.z = Math.PI / 4;
        armR.position.set(-0.15, 0.09, 0.22);
        armR.userData.blackBoxOwnedMaterial = true;
        bodyGroup.add(armR);

        // Scattered Bone Fragments
        const bone1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 6), boneMat);
        bone1.rotation.y = 1.1;
        bone1.position.set(0.1, 0.04, -0.26);
        bone1.userData.blackBoxOwnedMaterial = true;
        bodyGroup.add(bone1);

        const bone2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 6), boneMat);
        bone2.rotation.y = -0.8;
        bone2.position.set(-0.25, 0.04, 0.26);
        bone2.userData.blackBoxOwnedMaterial = true;
        bodyGroup.add(bone2);

        marker.add(bodyGroup);

        // 3. The actual Black Box item next to the corpse
        const blackBoxGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
        const blackBoxMat = new THREE.MeshStandardMaterial({
            color: 0xff3344,
            emissive: 0xff1122,
            roughness: 0.2,
            metalness: 0.8
        });
        const blackBoxMesh = new THREE.Mesh(blackBoxGeo, blackBoxMat);
        blackBoxMesh.position.set(0, 0.08, 0.25);
        blackBoxMesh.rotation.y = 0.45;
        blackBoxMesh.userData.blackBoxOwnedMaterial = true;
        marker.add(blackBoxMesh);

        // 4. Point light beacon
        const beacon = new THREE.PointLight(0xff3344, 1.8, 6.0, 1.5);
        beacon.position.y = 1.0;
        beacon.userData.blackBoxOwnedMaterial = true;
        marker.add(beacon);

        marker.position.set(state.x, 0, state.z);
        marker.userData.isBlackBoxMarker = true;
        return marker;
    }

    ensureBlackBoxMarker() {
        const state = blackBoxStore.load();
        this._blackBoxState = state;
        const shouldShow = Boolean(state.active);
        if (!shouldShow) {
            this.clearBlackBoxMarker();
            return;
        }
        if (!this._blackBoxMarker) {
            this._blackBoxMarker = this.createBlackBoxMarker(state);
            this.scene.add(this._blackBoxMarker);
            window.dispatchEvent(new CustomEvent('black-box-marker-active', {
                detail: { active: true, state }
            }));
        } else {
            this._blackBoxMarker.position.set(state.x, 0, state.z);
        }
        this._blackBoxMarkerActive = true;
        this.spawnCorruptedOperatorForBlackBox(state);
    }

    spawnCorruptedOperatorForBlackBox(state) {
        if (!state?.active || this._corruptedOperatorSpawnedForTimestamp === state.timestamp) return null;
        if (!this.player || !this.isGameplayInputActive()) return null;
        this.snailsEnabled = true;
        const depth = Math.max(0, state.depth ?? 0);
        const angle = Math.atan2((this.player.position.z - state.z), (this.player.position.x - state.x)) + 0.9;
        const spawnX = state.x + Math.cos(angle) * 3.2;
        const spawnZ = state.z + Math.sin(angle) * 3.2;
        if (!this.isSnailTileWalkable(Math.round(spawnX), Math.round(spawnZ))) return null;

        const ability = state.classType === 'SCOUT' ? 'BLINK'
            : state.classType === 'TANK' ? 'CHARGE-SHIELD'
                : 'MINE DROP';
        const placement = {
            x: spawnX,
            z: spawnZ,
            type: 'boss_cybersnail',
            scatterKey: `corrupted-operator:${state.timestamp}`,
            scale: 2.5 + depth * 0.35,
            rotation: 0,
            tiltX: 0,
            tiltZ: 0,
            elevation: 0.1,
            groupType: 'boss',
            phase: 0,
            opacity: 1,
            biomeTint: 0xff3344,
            isBoss: true,
            maxHp: 10 + depth * 8
        };
        const boss = this.createScatterInstance(placement);
        if (!boss) return null;

        const classMaterial = this.playerMaterials?.[state.classType]?.clone?.();
        if (classMaterial) {
            boss.material?.dispose?.();
            classMaterial.color = new THREE.Color(0xff3344);
            classMaterial.opacity = 0.9;
            classMaterial.transparent = true;
            boss.material = classMaterial;
            boss.userData.blackBoxOwnedMaterial = true;
        }
        boss.userData.corruptedOperator = true;
        boss.userData.corruptedClassType = state.classType;
        boss.userData.corruptedAbility = ability;
        boss.userData.prioritizeShip = false;
        boss.userData.targetType = 'player';

        this.scene.add(boss);
        this.scatterSprites.push(boss);
        this._corruptedOperatorSpawnedForTimestamp = state.timestamp;
        this.showBunkerLine(`CORRUPTED ${state.classType} OPERATOR GUARDING BLACK BOX. TELEGRAPHED ABILITY: ${ability}.`);
        window.dispatchEvent(new CustomEvent('milestone-boss-spawned', { detail: { type: 'corrupted_operator', classType: state.classType } }));
        return boss;
    }

    clearBlackBoxMarker() {
        if (this._blackBoxMarker) {
            this.scene.remove(this._blackBoxMarker);
            this._blackBoxMarker.traverse((child) => {
                if (child.userData?.blackBoxOwnedMaterial) child.material?.dispose?.();
                child.geometry?.dispose?.();
            });
            this._blackBoxMarker = null;
        }
        this._blackBoxMarkerActive = false;
        if (this._blackBoxMarkerPromptActive) {
            this._blackBoxMarkerPromptActive = false;
            window.dispatchEvent(new CustomEvent('black-box-prompt-clear'));
        }
    }

    updateBlackBoxMarker(delta) {
        if (!this.player || this.isPlayerDead) {
            if (this._blackBoxMarkerPromptActive) {
                this._blackBoxMarkerPromptActive = false;
                window.dispatchEvent(new CustomEvent('black-box-prompt-clear'));
            }
            return;
        }
        if (!this._blackBoxMarkerActive) {
            this.ensureBlackBoxMarker();
        }
        if (!this._blackBoxMarkerActive || !this._blackBoxMarker) return;

        const t = performance.now() * 0.004;
        this._blackBoxMarker.rotation.y = Math.sin(t) * 0.08;
        this._blackBoxMarker.scale.setScalar(1 + Math.sin(t * 2.1) * 0.045);
        this._blackBoxMarker.children.forEach((child) => {
            if (child.isPointLight) child.intensity = 1.1 + Math.sin(t * 3.4) * 0.45;
            if (child.isSprite) child.material.opacity = 0.68 + Math.sin(t * 5.1) * 0.18;
        });

        if (!this.isGameplayInputActive()) {
            if (this._blackBoxMarkerPromptActive) {
                this._blackBoxMarkerPromptActive = false;
                window.dispatchEvent(new CustomEvent('black-box-prompt-clear'));
            }
            return;
        }

        const dist = Math.hypot(
            this.player.position.x - this._blackBoxState.x,
            this.player.position.z - this._blackBoxState.z
        );
        const inRange = dist <= 2.2;
        if (inRange && !this._blackBoxMarkerPromptActive) {
            this._blackBoxMarkerPromptActive = true;
            window.dispatchEvent(new CustomEvent('black-box-prompt-nearby'));
        } else if (!inRange && this._blackBoxMarkerPromptActive) {
            this._blackBoxMarkerPromptActive = false;
            window.dispatchEvent(new CustomEvent('black-box-prompt-clear'));
        }
        if (delta > 0) this._lastBlackBoxDistance = dist;
    }

    interactWithBlackBox() {
        if (!this.isGameplayInputActive() || !this._blackBoxMarkerActive || !this.player) return false;
        const state = this._blackBoxState;
        const dist = Math.hypot(this.player.position.x - state.x, this.player.position.z - state.z);
        if (dist > 2.2) return false;
        const recovered = blackBoxStore.recoverActive();
        if (!recovered) return false;
        const salvage = recovered.salvage ?? {};
        this.bank.deposit({
            tech: salvage.tech ?? 0,
            coin: salvage.coin ?? 0,
            med: salvage.med ?? 0
        });
        this.clearBlackBoxMarker();
        this._blackBoxState = blackBoxStore.load();
        
        // Alert and trigger patrol spawn
        this.showBunkerLine('MOTHERSHIP: CAUTION. RECOVERY SIGNATURE TRACKED. PATROLS INBOUND.');
        this.spawnPatrolNearPlayer();
        
        window.AudioManager?.play('class_lock', { volume: 0.56, playbackRate: 0.76, bus: 'sfx' });
        this.arcManager?.recordSignal?.({ blackBoxesRecovered: 1 });
        this.arcManager?.evaluate?.();
        window.dispatchEvent(new CustomEvent('black-box-recovered', { detail: recovered }));
        return true;
    }

    updateLoreTerminals() {
        if (this.performanceProfile === 'menu' || !this.player || this.isPlayerDead) {
            window.dispatchEvent(new CustomEvent('lore-terminal-clear'));
            return;
        }
        let nearest = null;
        let nearestDist = Infinity;
        for (const sprite of this.scatterSprites) {
            if (sprite.userData.type !== 'lore_terminal') continue;
            const dist = Math.hypot(
                this.player.position.x - sprite.position.x,
                this.player.position.z - sprite.position.z
            );
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = sprite;
            }
        }
        if (nearest && nearestDist < 2.2) {
            window.dispatchEvent(new CustomEvent('lore-terminal-nearby', {
                detail: { loreKey: nearest.userData.loreKey, loreText: nearest.userData.loreText }
            }));
        } else {
            window.dispatchEvent(new CustomEvent('lore-terminal-clear'));
        }
    }

    interactWithLoreTerminal() {
        if (!this.isGameplayInputActive()) return;
        if (!this.player) return;
        for (const sprite of this.scatterSprites) {
            if (sprite.userData.type !== 'lore_terminal') continue;
            const dist = Math.hypot(
                this.player.position.x - sprite.position.x,
                this.player.position.z - sprite.position.z
            );
            if (dist < 2.2) {
                window.dispatchEvent(new CustomEvent('lore-terminal-read', {
                    detail: { loreKey: sprite.userData.loreKey, loreText: sprite.userData.loreText }
                }));
                window.AudioManager?.play('ui_scan_ping', { volume: 0.35, playbackRate: 0.65, bus: 'sfx' });
                return;
            }
        }
    }

    shouldUseTapPromptLabel() {
        if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
        const coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
        return coarsePointer || navigator.maxTouchPoints > 0 || ('ontouchstart' in window);
    }

    updateConsoles(delta, now) {
        if (this.performanceProfile === 'menu') {
            this.activeInteractiveO2Generator = null;
            const promptEl = document.getElementById('console-hud-prompt');
            if (promptEl) {
                promptEl.classList.add('hidden');
                promptEl.classList.remove('visible');
            }
            const o2PromptEl = document.getElementById('o2-generator-hud-prompt');
            if (o2PromptEl) {
                o2PromptEl.classList.add('hidden');
                o2PromptEl.classList.remove('visible');
            }
            return;
        }
        if (!this.crashedShips || !this.player) return;

        const hudActive = !document.getElementById('ui')?.classList.contains('hidden');
        if (!this.inputEnabled || !hudActive) {
            this.activeInteractiveConsole = null;
            this.activeInteractiveO2Generator = null;
            const promptEl = document.getElementById('console-hud-prompt');
            if (promptEl) {
                promptEl.classList.add('hidden');
                promptEl.classList.remove('visible');
            }
            const o2PromptEl = document.getElementById('o2-generator-hud-prompt');
            if (o2PromptEl) {
                o2PromptEl.classList.add('hidden');
                o2PromptEl.classList.remove('visible');
            }
            return;
        }

        let nearestConsole = null;
        let minDistance = Infinity;
        const generatorState = this.getO2GeneratorState();
        const generatorPos = this.getActiveO2GeneratorPosition();
        const o2InRange = generatorState.isOnline
            && generatorPos
            && Math.hypot(this.player.position.x - generatorPos.x, this.player.position.z - generatorPos.z) < 2.8;
        this.activeInteractiveO2Generator = o2InRange ? this.getActiveShip() : null;

        for (const ship of this.crashedShips) {
            if (!ship.isVisible) continue;
            // Animate pulsing neon floor rings
            if (ship.consoleRing) {
                const pulse = 0.65 + Math.sin(now * 0.006) * 0.25;
                ship.consoleRing.material.opacity = pulse;
                const scalePulse = 0.95 + Math.sin(now * 0.006) * 0.05;
                ship.consoleRing.scale.set(scalePulse, scalePulse, 1.0);
            }
            if (ship.safeRing) {
                ship.safeRing.material.opacity = 0.1 + Math.sin(now * 0.003 + 1.1) * 0.03;
            }

            const consoleX = ship.tileX + ship.consoleOffset.x;
            const consoleZ = ship.tileZ + ship.consoleOffset.z;
            const dx = this.player.position.x - consoleX;
            const dz = this.player.position.z - consoleZ;
            const distance = Math.hypot(dx, dz);

            if (distance < 3.0 && distance < minDistance) {
                nearestConsole = ship;
                minDistance = distance;
            }
        }

        // Show/hide floating HUD prompt
        const promptEl = document.getElementById('console-hud-prompt');
        if (nearestConsole) {
            this.activeInteractiveConsole = nearestConsole;
            if (promptEl) {
                const actionText = promptEl.querySelector('.prompt-text');
                const promptKey = promptEl.querySelector('.prompt-key');
                const shouldUseTapLabel = this.shouldUseTapPromptLabel();
                if (actionText) {
                    actionText.textContent = `ACCESS ${nearestConsole.type} BASE SHOP`;
                }
                if (promptKey) {
                    promptKey.textContent = shouldUseTapLabel ? 'TAP' : 'PRESS E';
                    promptKey.classList.toggle('prompt-key--tap', shouldUseTapLabel);
                }
                promptEl.classList.add('visible');
                promptEl.classList.remove('hidden');
            }
        } else {
            this.activeInteractiveConsole = null;
            if (promptEl) {
                promptEl.classList.add('hidden');
                promptEl.classList.remove('visible');
            }

            // Automagically close terminal window if the player walks too far away
            const modal = document.getElementById('console-terminal-modal');
            if (modal && !modal.classList.contains('hidden')) {
                this.closeConsoleModal();
            }
        }

        const o2PromptEl = document.getElementById('o2-generator-hud-prompt');
        if (o2PromptEl) {
            if (o2InRange) {
                const actionText = o2PromptEl.querySelector('.prompt-text');
                const promptKey = o2PromptEl.querySelector('.prompt-key');
                const shouldUseTapLabel = this.shouldUseTapPromptLabel();
                if (actionText) actionText.textContent = 'UPGRADE O₂ GENERATOR';
                if (promptKey) {
                    promptKey.textContent = shouldUseTapLabel ? 'TAP' : 'PRESS E';
                    promptKey.classList.toggle('prompt-key--tap', shouldUseTapLabel);
                }
                o2PromptEl.classList.add('visible');
                o2PromptEl.classList.remove('hidden');
            } else {
                o2PromptEl.classList.add('hidden');
                o2PromptEl.classList.remove('visible');
                const modal = document.getElementById('o2-generator-modal');
                if (modal && !modal.classList.contains('hidden')) {
                    this.closeO2GeneratorModal();
                }
            }
        }
    }

    interactWithConsole() {
        if (!this.isGameplayInputActive()) return;
        if (!this.activeInteractiveConsole) return;
        if (this.isAct2Active()) {
            this.handleAct2ConsoleInteract();
            return;
        }
        this.openConsoleModal(this.activeInteractiveConsole);
    }

    interactWithO2Generator() {
        if (!this.isGameplayInputActive()) return;
        if (!this.activeInteractiveO2Generator) return;
        this.openO2GeneratorModal(this.activeInteractiveO2Generator);
    }

    tryInteractWithConsolePointer(clientX, clientY) {
        const ship = this.activeInteractiveConsole;
        if (!ship || !this.isGameplayInputActive()) return false;

        const modal = document.getElementById('console-terminal-modal');
        if (modal && !modal.classList.contains('hidden')) {
            return false;
        }

        const worldPoint = this.getWorldAimPoint(clientX, clientY);
        if (!worldPoint) return false;

        const consoleX = ship.tileX + ship.consoleOffset.x;
        const consoleZ = ship.tileZ + ship.consoleOffset.z;
        const distToConsole = Math.hypot(worldPoint.x - consoleX, worldPoint.z - consoleZ);
        const distToShipCore = Math.hypot(worldPoint.x - ship.tileX, worldPoint.z - ship.tileZ);

        if (distToConsole <= 1.25 || distToShipCore <= Math.max(0.95, ship.width * 0.72)) {
            this.interactWithConsole();
            return true;
        }

        return false;
    }

    tryInteractWithO2Pointer(clientX, clientY) {
        const ship = this.activeInteractiveO2Generator;
        if (!ship || !this.isGameplayInputActive()) return false;

        const modal = document.getElementById('o2-generator-modal');
        if (modal && !modal.classList.contains('hidden')) {
            return false;
        }

        const worldPoint = this.getWorldAimPoint(clientX, clientY);
        if (!worldPoint) return false;
        const generatorPos = this.getActiveO2GeneratorPosition();
        if (!generatorPos) return false;

        const dist = Math.hypot(worldPoint.x - generatorPos.x, worldPoint.z - generatorPos.z);
        if (dist <= 1.35) {
            this.openO2GeneratorModal(ship);
            return true;
        }

        return false;
    }

    tryInteractWithFoundryPointer(clientX, clientY) {
        if (!this.isGameplayInputActive() || !this.foundry?.isRevealed) return false;
        const worldPoint = this.getWorldAimPoint(clientX, clientY);
        if (!worldPoint) return false;
        if (!this.foundry.isWithinInteractRange(worldPoint.x, worldPoint.z)) return false;
        return this.interactWithFoundry();
    }

    tryInteractWithBlackBoxPointer(clientX, clientY) {
        if (!this.isGameplayInputActive() || !this._blackBoxMarkerActive) return false;
        const worldPoint = this.getWorldAimPoint(clientX, clientY);
        if (!worldPoint) return false;
        const state = this._blackBoxState;
        const dist = Math.hypot(worldPoint.x - state.x, worldPoint.z - state.z);
        if (dist > 1.45) return false;
        return this.interactWithBlackBox();
    }

    getSessionInventory() {
        const snapshot = window.getPickupCounterState?.();
        if (!snapshot || typeof snapshot !== 'object') {
            return { health: 0, ammo: 0, weapon: 0, coin: 0, total: 0 };
        }

        const health = Number.isFinite(snapshot.health) ? Math.max(0, Math.floor(snapshot.health)) : 0;
        const ammo = Number.isFinite(snapshot.ammo) ? Math.max(0, Math.floor(snapshot.ammo)) : 0;
        const weapon = Number.isFinite(snapshot.weapon) ? Math.max(0, Math.floor(snapshot.weapon)) : 0;
        const coin = Number.isFinite(snapshot.coin) ? Math.max(0, Math.floor(snapshot.coin)) : 0;

        return {
            health,
            ammo,
            weapon,
            coin,
            total: health + weapon + coin
        };
    }

    showBunkerLine(text) {
        if (!text) return;
        window.dispatchEvent(new CustomEvent('bunker-line', { detail: { text } }));
    }

    adjustOxygen(amount = 0) {
        const next = Math.max(0, Math.min(100, (this.playerVitals.o2 ?? 0) + Number(amount || 0)));
        this.playerVitals.o2 = next;
        this.emitO2State();
    }

    spawnPatrolNearPlayer() {
        if (!this.player) return;
        this.snailsEnabled = true;
        const types = ['cybersnail', 'cybersnail', this.currentBiomeKey === BIOME_KEYS.BIO ? 'sporesnail' : 'cryosnail'];
        for (let i = 0; i < 3; i++) {
            const type = types[i % types.length];
            const angle = Math.random() * Math.PI * 2;
            const radius = 18 + i * 2.2;
            const x = this.player.position.x + Math.cos(angle) * radius;
            const z = this.player.position.z + Math.sin(angle) * radius;
            if (!this.isSnailTileWalkable(Math.round(x), Math.round(z))) continue;
            const placement = {
                x,
                z,
                type,
                scatterKey: `terminal-patrol:${Date.now()}:${i}`,
                scale: 1.25,
                rotation: 0,
                tiltX: 0,
                tiltZ: 0,
                elevation: 0.1,
                groupType: 'enemy',
                phase: Math.random() * Math.PI * 2,
                opacity: 1,
                biomeTint: 0xffffff,
                isEnemy: true
            };
            const sprite = this.createScatterInstance(placement);
            if (!sprite) continue;
            const chunkX = Math.floor(x / this.chunkSize);
            const chunkY = Math.floor(z / this.chunkSize);
            const group = this.chunkMeshes.get(`${chunkX},${chunkY}`) ?? this.scene;
            group.add(sprite);
            this.scatterSprites.push(sprite);
        }
        window.dispatchEvent(new CustomEvent('milestone-boss-warning'));
    }

    revealNearbyExits() {
        this.showBunkerLine('OPEN PATHS REVEALED. COMPASS DATA IS TEMPORARILY UNTRUSTWORTHY.');
        window.dispatchEvent(new CustomEvent('terminal-routes-revealed'));
    }

    corruptCompass(seconds = 60) {
        this._compassCorruptUntil = Math.max(this._compassCorruptUntil, performance.now() + seconds * 1000);
        window.dispatchEvent(new CustomEvent('codex-discover', { detail: { id: 'compass_corruption' } }));
    }

    grantSalvageCache({ tech = 0, coin = 0, med = 0 } = {}) {
        this.bank.deposit({ tech, coin, med });
        window.dispatchEvent(new CustomEvent('salvage-cache-opened', { detail: { tech, coin, med } }));
    }

    triggerLightsOut(seconds = 8) {
        // Held for `seconds` by the dayBlend override in updateDayNightCycle.
        this._lightsOutUntil = Math.max(this._lightsOutUntil, performance.now() + seconds * 1000);
        this.showBunkerLine('LIGHTING BREAKER TRIPPED. PLEASE ENJOY THE DARKNESS RESPONSIBLY.');
        window.dispatchEvent(new CustomEvent('codex-discover', { detail: { id: 'lights_out' } }));
    }

    getO2GeneratorState(bankState = this.bank.getState()) {
        const level = Number.isFinite(bankState?.o2GeneratorLevel)
            ? Math.max(0, Math.floor(bankState.o2GeneratorLevel))
            : 0;
        const currentUpgrade = O2_GENERATOR_UPGRADES.find((entry) => entry.level === level) ?? null;
        const nextUpgrade = O2_GENERATOR_UPGRADES.find((entry) => entry.level === level + 1) ?? null;

        return {
            level,
            isOnline: level > 0,
            maxed: !nextUpgrade,
            currentUpgrade,
            nextUpgrade,
            radius: currentUpgrade?.radius ?? 0,
            refillRate: currentUpgrade?.refillRate ?? 0
        };
    }

    getMothershipUplinkReadiness(bankState = this.bank.getState()) {
        const unlocks = bankState?.unlocks ?? {};
        const tier2Unlocks = bankState?.tier2Unlocks ?? {};
        const generatorState = this.getO2GeneratorState(bankState);
        const coreSystemsReady = GOAL_CARD_CONFIGS.every((cfg) => Boolean(unlocks[cfg.goalKey]));
        const tier2SystemsReady = TIER2_UPGRADE_ORDER.every((key) => Boolean(tier2Unlocks[key]));
        const generatorMaxed = Boolean(generatorState.maxed);

        return {
            ready: coreSystemsReady && tier2SystemsReady && generatorMaxed,
            coreSystemsReady,
            tier2SystemsReady,
            generatorMaxed
        };
    }

    getEffectiveCost(cost = {}) {
        if (this.playerType !== 'ENGINEER') return cost;
        const discount = ENGINEER_CONSOLE_DISCOUNT;
        return {
            med:  Number.isFinite(cost.med)  ? Math.max(1, Math.ceil(cost.med  * discount)) : 0,
            ammo: Number.isFinite(cost.ammo) ? Math.max(1, Math.ceil(cost.ammo * discount)) : 0,
            tech: Number.isFinite(cost.tech) ? Math.max(1, Math.ceil(cost.tech * discount)) : 0,
            coin: Number.isFinite(cost.coin) ? Math.max(1, Math.ceil(cost.coin * discount)) : 0
        };
    }

    getResourceAmount(source = {}, key) {
        const value = Number(source?.[key]);
        return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    }

    getResourceCostBreakdown(cost = {}, bankState = this.bank.getState()) {
        return ['tech', 'med', 'ammo', 'coin']
            .map((key) => {
                const need = this.getResourceAmount(cost, key);
                if (need <= 0) return null;
                const have = this.getResourceAmount(bankState, key);
                return {
                    key,
                    label: key.toUpperCase(),
                    have,
                    need,
                    missing: Math.max(0, need - have)
                };
            })
            .filter(Boolean);
    }

    getMissingResourceText(cost = {}, bankState = this.bank.getState()) {
        const missing = this.getResourceCostBreakdown(cost, bankState)
            .filter((entry) => entry.missing > 0)
            .map((entry) => `${entry.missing} ${entry.label}`);
        return missing.length > 0 ? `NEED ${missing.join(' / ')}` : '';
    }

    formatResourceCost(cost = {}, { bankState = null, showHaveNeed = false } = {}) {
        const rows = [];
        const breakdown = this.getResourceCostBreakdown(cost, bankState ?? this.bank.getState());
        for (const entry of breakdown) {
            rows.push(showHaveNeed
                ? `${entry.label} ${entry.have}/${entry.need}`
                : `${entry.need} ${entry.label}`);
        }

        return rows.length > 0 ? rows.join(' / ') : 'NO COST';
    }

    getO2GeneratorButtonState(generatorState) {
        const bankState = this.bank.getState();
        if (generatorState.maxed) {
            return {
                stateClass: 'btn-state--online',
                label: 'FIELD AT MAX RANGE',
                hint: 'O2 GENERATOR OUTPUT IS MAXED.',
                enabled: false
            };
        }

        if (!generatorState.nextUpgrade) {
            return {
                stateClass: 'btn-state--locked',
                label: 'NO UPGRADE PATH',
                hint: 'NO O2 UPGRADE PATH AVAILABLE.',
                enabled: false
            };
        }

        const effectiveCost = this.getEffectiveCost(generatorState.nextUpgrade.cost);
        const affordable = this.bank.canAfford(effectiveCost);
        if (!affordable) {
            return {
                stateClass: 'btn-state--insufficient',
                label: this.getMissingResourceText(effectiveCost, bankState),
                hint: this.getMissingResourceText(effectiveCost, bankState),
                enabled: false
            };
        }

        return {
            stateClass: 'btn-state--available',
            label: generatorState.level === 0 ? 'REPAIR GENERATOR' : 'UPGRADE FIELD RADIUS',
            hint: generatorState.level === 0 ? 'REPAIR READY.' : 'FIELD UPGRADE READY.',
            enabled: true
        };
    }

    getGoalCardButtonState({ unlocked, prereqMet, affordable }) {
        if (unlocked) {
            return {
                stateClass: 'btn-state--online',
                label: 'ONLINE',
                enabled: false
            };
        }

        if (!prereqMet) {
            return {
                stateClass: 'btn-state--locked',
                label: 'LOCKED',
                enabled: false
            };
        }

        if (!affordable) {
            return {
                stateClass: 'btn-state--insufficient',
                label: 'RESOURCE DEFICIT',
                enabled: false
            };
        }

        return {
            stateClass: 'btn-state--available',
            label: 'INITIATE BUILD',
            enabled: true
        };
    }

    renderGoalCard(ship, bankState, cardConfig) {
        const rawCost = this.bank.getGoalCost(cardConfig.goalKey) ?? {};
        const cost = this.getEffectiveCost(rawCost);
        const unlocked = Boolean(bankState?.unlocks?.[cardConfig.goalKey]);
        const prereqMet = cardConfig.prereqKey
            ? Boolean(bankState?.unlocks?.[cardConfig.prereqKey])
            : true;
        const affordable = this.bank.canAfford(cost);
        const isDiscounted = this.playerType === 'ENGINEER';

        const statusEl = document.getElementById(cardConfig.statusId);
        if (statusEl) {
            if (unlocked) {
                statusEl.textContent = 'ONLINE';
            } else if (!prereqMet) {
                statusEl.textContent = cardConfig.lockedStatusText;
            } else if (!affordable) {
                statusEl.textContent = 'READY — RESOURCE DEFICIT';
            } else {
                statusEl.textContent = 'READY — BUILD PERMITTED';
            }
        }

        const costEl = document.getElementById(cardConfig.costId);
        if (costEl) {
            const discountTag = isDiscounted ? ' [ENG -20%]' : '';
            const missingText = affordable ? '' : ` // ${this.getMissingResourceText(cost, bankState)}`;
            costEl.textContent = `COST: ${this.formatResourceCost(cost, { bankState, showHaveNeed: !affordable })}${discountTag}${missingText}`;
        }

        const button = document.getElementById(cardConfig.buttonId);
        if (!button) return;

        const buttonState = this.getGoalCardButtonState({
            unlocked,
            prereqMet,
            affordable
        });

        button.textContent = buttonState.label;
        button.disabled = !buttonState.enabled;
        button.classList.remove('btn-state--online', 'btn-state--locked', 'btn-state--insufficient', 'btn-state--available');
        button.classList.add(buttonState.stateClass);

        if (button.dataset.listenerAttached === 'true') return;
        button.dataset.listenerAttached = 'true';
        button.addEventListener('click', () => this.attemptGoalUnlock(this.activeInteractiveConsole ?? ship, cardConfig));
    }

    renderTier2Section(ship, bankState) {
        // Section opens once the O₂ bubble is built so the Space Heater (Note 5)
        // is an early cold-mitigation build. Cards whose own prereq isn't met yet
        // (e.g. endgame filters/stim) still appear but read LOCKED.
        const unlocks = bankState?.unlocks ?? {};
        const sectionAvailable = Boolean(unlocks.o2Bubble);
        const section = document.getElementById('tier2-section');
        if (section) section.classList.toggle('hidden', !sectionAvailable);
        if (!sectionAvailable) return;

        const tier2Unlocks = bankState?.tier2Unlocks ?? {};
        for (const key of TIER2_UPGRADE_ORDER) {
            const cfg = TIER2_UPGRADE_CONFIGS[key];
            if (!cfg) continue;
            const alreadyUnlocked = Boolean(tier2Unlocks[key]);
            const prereqMet = !cfg.prereq || Boolean(unlocks[cfg.prereq]);
            const shellPrice = shellPriceOf(cfg.cost);
            const canAfford = this.bank.canAffordShells(shellPrice);
            const buildable = !alreadyUnlocked && prereqMet && canAfford;

            const statusEl = document.getElementById(`terminal-tier2-${key}-status`);
            if (statusEl) {
                statusEl.textContent = alreadyUnlocked ? 'INSTALLED'
                    : !prereqMet ? 'LOCKED'
                    : canAfford ? 'READY' : 'NEED SHELLS';
            }
            const costEl = document.getElementById(`terminal-tier2-${key}-cost`);
            if (costEl) {
                const have = this.bank.getShells();
                costEl.textContent = alreadyUnlocked ? '' : `COST: ◈ ${shellPrice} SHELLS${canAfford ? '' : ` // HAVE ${have}`}`;
            }
            const btn = document.getElementById(`terminal-btn-tier2-${key}`);
            if (!btn) continue;
            btn.disabled = !buildable;
            btn.textContent = alreadyUnlocked ? 'INSTALLED' : !prereqMet ? 'LOCKED' : canAfford ? 'INSTALL' : `NEED ◈ ${Math.max(0, shellPrice - this.bank.getShells())}`;
            btn.classList.toggle('btn-state--online', alreadyUnlocked);
            btn.classList.toggle('btn-state--available', buildable);
            btn.classList.toggle('btn-state--insufficient', !alreadyUnlocked && (!prereqMet || !canAfford));

            if (btn.dataset.listenerAttached === 'true') continue;
            btn.dataset.listenerAttached = 'true';
            btn.addEventListener('click', () => this.attemptTier2Unlock(this.activeInteractiveConsole ?? ship, key));
        }
    }

    attemptTier2Unlock(ship, key) {
        const success = this.bank.unlockTier2(key);
        if (success) {
            window.AudioManager?.play('class_lock', { volume: 0.55 });
            this.syncPersistentUpgrades();
        } else {
            window.AudioManager?.play('ui_error', { volume: 0.58 });
        }
        this.renderConsoleBanking(ship);
        this.renderSkillsTree(ship);
    }

    // COMBAT MATRIX skill tree. Mirrors renderTier2Section: reuses the same action-card
    // markup + btn-state classes. Gated on the O2 generator being repaired so weapon
    // progression is available early-game (unlike end-game tier2 systems).
    renderWeaponsSection(ship, bankState) {
        const available = (bankState?.o2GeneratorLevel ?? 0) >= 1;
        const section = document.getElementById('weapons-section');
        if (section) section.classList.toggle('hidden', !available);
        if (!available) return;

        const levels = bankState?.weaponUpgrades ?? {};
        for (const key of WEAPON_UPGRADE_ORDER) {
            const cfg = WEAPON_UPGRADES_CONFIG[key];
            if (!cfg) continue;
            const level = Math.max(0, Math.floor(levels[key] ?? 0));
            const maxed = level >= cfg.maxLevel;
            const nextCost = maxed ? null : cfg.costs[level];
            const cost = nextCost ?? null;
            const shellPrice = cost ? shellPriceOf(cost) : 0;
            const canAfford = cost ? this.bank.canAffordShells(shellPrice) : false;

            const levelEl = document.getElementById(`terminal-weapon-${key}-level`);
            if (levelEl) levelEl.textContent = `LV ${level}/${cfg.maxLevel}`;

            const descEl = document.getElementById(`terminal-weapon-${key}-desc`);
            if (descEl) {
                descEl.textContent = maxed
                    ? `MAX TIER — ${cfg.desc[cfg.desc.length - 1]}`
                    : `NEXT: ${cfg.desc[level]}`;
            }

            const costEl = document.getElementById(`terminal-weapon-${key}-cost`);
            if (costEl) {
                const have = this.bank.getShells();
                costEl.textContent = maxed ? 'FULLY UPGRADED' : `COST: ◈ ${shellPrice} SHELLS${canAfford ? '' : ` // HAVE ${have}`}`;
            }

            const btn = document.getElementById(`terminal-btn-weapon-${key}`);
            if (!btn) continue;
            btn.disabled = maxed || !canAfford;
            btn.textContent = maxed ? 'MAXED' : canAfford ? 'UPGRADE' : `NEED ◈ ${Math.max(0, shellPrice - this.bank.getShells())}`;
            btn.classList.toggle('btn-state--online', maxed);
            btn.classList.toggle('btn-state--available', !maxed && canAfford);
            btn.classList.toggle('btn-state--insufficient', !maxed && !canAfford);

            if (btn.dataset.listenerAttached === 'true') continue;
            btn.dataset.listenerAttached = 'true';
            btn.addEventListener('click', () => this.attemptWeaponUpgrade(this.activeInteractiveConsole ?? ship, key));
        }
    }

    attemptWeaponUpgrade(ship, key) {
        const success = this.bank.upgradeWeapon(key);
        if (success) {
            window.AudioManager?.play('class_lock', { volume: 0.55 });
            this.syncPersistentUpgrades();
            this.emitWeaponClipState();
        } else {
            window.AudioManager?.play('ui_error', { volume: 0.58 });
        }
        this.renderConsoleBanking(ship);
        this.renderSkillsTree(ship);
    }

    getActiveTerminalEvent() {
        if (this._terminalEvent && !this._terminalEventResolvedIds.has(this._terminalEvent.id)) {
            return this._terminalEvent;
        }
        const event = pickTerminalEvent(Math.random, { biome: this.currentBiomeKey });
        this._terminalEvent = event;
        // ~1 in 4 terminals is a forged "mimic" that pays out then bills you in
        // patrols — unless an Engineer verifies it first (doc 11 §2 signature fear).
        this._terminalEventIsMimic = event ? Math.random() < 0.25 : false;
        this._terminalMimicDisarmed = false;
        return event;
    }

    renderTerminalEventPanel() {
        const section = document.getElementById('terminal-event-section');
        const title = document.getElementById('terminal-event-title');
        const status = document.getElementById('terminal-event-status');
        const body = document.getElementById('terminal-event-body');
        const choicesEl = document.getElementById('terminal-event-choices');
        const resultEl = document.getElementById('terminal-event-result');
        if (!section || !choicesEl) return;

        const event = this.getActiveTerminalEvent();
        const resolved = Boolean(event && this._terminalEventResolvedIds.has(event.id));
        section.classList.toggle('hidden', !event);
        if (!event) return;

        if (title) title.textContent = event.title;
        if (status) status.textContent = resolved ? 'RESOLVED' : 'CHOICE REQUIRED';
        if (body) body.textContent = event.body;
        choicesEl.innerHTML = '';

        if (resolved) {
            if (resultEl) resultEl.textContent = 'TERMINAL EVENT RESOLVED. SHOP SYSTEMS REMAIN AVAILABLE.';
            return;
        }

        if (this.playerType === 'ENGINEER') {
            const verifyBtn = document.createElement('button');
            verifyBtn.className = 'terminal-action-btn terminal-event-choice btn-state--available';
            verifyBtn.textContent = 'ENGINEER VERIFY';
            verifyBtn.addEventListener('click', () => {
                if (this._terminalEventIsMimic) {
                    // Engineer detects the forgery and disarms its payback.
                    this._terminalMimicDisarmed = true;
                    if (resultEl) resultEl.textContent = 'WARNING: TERMINAL SIGNATURE FORGED — MIMIC NEUTRALIZED. SAFE TO PROCEED.';
                    window.dispatchEvent(new CustomEvent('codex-discover', { detail: { id: 'mimic_terminal' } }));
                    window.AudioManager?.play('ui_error', { volume: 0.32, playbackRate: 0.9, bus: 'sfx' });
                    return;
                }
                const risky = event.choices.filter((choice) => choice.tone === 'risk').map((choice) => choice.label);
                if (resultEl) resultEl.textContent = risky.length
                    ? `VERIFIED RISK: ${risky.join(' // ')}`
                    : 'VERIFIED: NO HIDDEN RISK FLAGGED.';
                window.AudioManager?.play('ui_scan_ping', { volume: 0.38, playbackRate: 1.2, bus: 'sfx' });
            });
            choicesEl.appendChild(verifyBtn);
        }

        event.choices.forEach((choice, index) => {
            const btn = document.createElement('button');
            btn.className = `terminal-action-btn terminal-event-choice ${choice.tone === 'risk' ? 'btn-state--risk' : 'btn-state--available'}`;
            btn.textContent = choice.label;
            btn.addEventListener('click', () => this.applyTerminalChoice(event, index));
            choicesEl.appendChild(btn);
        });
        if (resultEl) resultEl.textContent = '';
    }

    applyTerminalChoice(event, choiceIndex) {
        if (!event || this._terminalEventResolvedIds.has(event.id)) return;
        const choice = event.choices?.[choiceIndex];
        if (!choice) return;
        let result;
        try {
            result = choice.effect?.(this) ?? '';
        } catch (err) {
            console.warn('[terminal event effect failed]', err);
            result = 'TERMINAL EFFECT FAILED. SYSTEM ROLLED BACK TO IDLE.';
        }
        this._terminalEventResolvedIds.add(event.id);
        // Mimic payback: an unverified forged terminal pays out, then bills you.
        if (this._terminalEventIsMimic && !this._terminalMimicDisarmed) {
            this.showBunkerLine('TERMINAL SIGNATURE FORGED. THE PAYOUT WAS REAL. SO IS THE INVOICE.');
            this.spawnPatrolNearPlayer();
            this.corruptCompass(15);
            result = `${result} // MIMIC: SIGNATURE FORGED — PATROLS DISPATCHED`;
            window.dispatchEvent(new CustomEvent('codex-discover', { detail: { id: 'mimic_terminal' } }));
        } else {
            this.showBunkerLine(getDialogueLine('terminalChoice') ?? 'TERMINAL CHOICE REGISTERED.');
        }
        window.AudioManager?.play('ui_boot', { volume: 0.42, playbackRate: choice.tone === 'risk' ? 0.72 : 1.05, bus: 'sfx' });
        const resultEl = document.getElementById('terminal-event-result');
        if (resultEl) resultEl.textContent = result;
        this.renderConsoleBanking(this.activeInteractiveConsole);
    }

    updateGoalModuleVisualState(unlocks = this.unlocks) {
        const safeUnlocks = unlocks ?? {};
        const hullUnlocked = Boolean(safeUnlocks.hullExpansion);
        const radarUnlocked = Boolean(safeUnlocks.radarNode);
        const reactorUnlocked = Boolean(safeUnlocks.reactorCompressor);
        const hullOpacity = hullUnlocked ? UNLOCKED_MODULE_OPACITY : LOCKED_MODULE_OPACITY;
        const radarOpacity = radarUnlocked ? UNLOCKED_MODULE_OPACITY : LOCKED_MODULE_OPACITY;
        const reactorOpacity = reactorUnlocked ? UNLOCKED_MODULE_OPACITY : LOCKED_MODULE_OPACITY;

        if (this.goalModuleMaterials?.hullMatrix) {
            this.goalModuleMaterials.hullMatrix.opacity = hullOpacity;
            this.goalModuleMaterials.hullMatrix.needsUpdate = true;
        }
        if (this.goalModuleMaterials?.radarDish) {
            this.goalModuleMaterials.radarDish.opacity = radarOpacity;
            this.goalModuleMaterials.radarDish.needsUpdate = true;
        }
        if (this.goalModuleMaterials?.reactorCompressor) {
            this.goalModuleMaterials.reactorCompressor.opacity = reactorOpacity;
            this.goalModuleMaterials.reactorCompressor.needsUpdate = true;
        }
        this.updateShipVisualState();
    }

    updateShipVisualState(now = performance.now()) {
        if (!this.crashedShips || !this.shipTextures) return;

        const bankState = this.bank.getState();
        const activeGoal = this.getActiveBaseGoal(bankState);
        const isFullyHealed = activeGoal === null;
        const radarUnlocked = Boolean(bankState.unlocks?.radarNode);
        const radarTexture = this.goalModuleMaterials?.radarDish?.map ?? null;

        for (const ship of this.crashedShips) {
            const textures = this.shipTextures[ship.type];
            if (textures) {
                const tex = isFullyHealed ? textures.healed : textures.broken;
                if (tex && ship.material.map !== tex) {
                    ship.material.map = tex;
                    ship.material.needsUpdate = true;
                }
            }
        }

        if (radarTexture) {
            const radarLevel = bankState.radarNodeLevel ?? (radarUnlocked ? 1 : 0);
            const frame = radarLevel >= 2 ? Math.floor(now * 0.006) % RADAR_DISH_FRAME_COUNT : 0;
            setSpriteSheetFrame(radarTexture, RADAR_DISH_GRID_SIZE, RADAR_DISH_GRID_SIZE, frame);
        }
    }

    getActiveBaseGoal(bankState = this.bank.getState()) {
        const o2Online = bankState.o2GeneratorLevel >= 1;
        if (!o2Online) {
            const nextUpgrade = this.getO2GeneratorState(bankState).nextUpgrade;
            return {
                key: 'o2Bubble',
                title: 'REPAIR O₂ GENERATOR',
                desc: 'REPAIR THIS MODULE TO CREATE A SAFE O₂ ZONE NEAR YOUR SHIP.',
                cost: nextUpgrade ? this.getEffectiveCost(nextUpgrade.cost) : {},
                type: 'o2'
            };
        }
        if (!bankState.unlocks.hullExpansion) {
            return {
                key: 'hullExpansion',
                title: 'HULL EXPANSION MATRIX',
                desc: 'Reinforce exterior hull. Increases max exosuit integrity to 4 hearts.',
                cost: this.getEffectiveCost(this.bank.getGoalCost('hullExpansion') ?? {}),
                type: 'goal',
                cardConfig: GOAL_CARD_CONFIGS.find(cfg => cfg.goalKey === 'hullExpansion')
            };
        }
        if (!bankState.unlocks.radarNode) {
            return {
                key: 'radarNode',
                title: 'COMMUNICATION RADAR NODE',
                desc: 'Establish long-range tactical feeds. Compass tracks nearest supply cache cluster.',
                cost: this.getEffectiveCost(this.bank.getGoalCost('radarNode') ?? {}),
                type: 'goal',
                cardConfig: GOAL_CARD_CONFIGS.find(cfg => cfg.goalKey === 'radarNode')
            };
        }
        if (!bankState.unlocks.reactorCompressor) {
            return {
                key: 'reactorCompressor',
                title: 'REACTOR COMPRESSOR',
                desc: 'Increase generator efficiency. O₂ refill rate doubles. Drain rate slows 20%.',
                cost: this.getEffectiveCost(this.bank.getGoalCost('reactorCompressor') ?? {}),
                type: 'goal',
                cardConfig: GOAL_CARD_CONFIGS.find(cfg => cfg.goalKey === 'reactorCompressor')
            };
        }

        // Sequential Level 2 upgrades once all nodes are constructed
        if ((bankState.hullExpansionLevel ?? 1) < 2) {
            return {
                key: 'hullExpansion',
                title: 'HULL MATRIX LVL 2',
                desc: 'UPGRADE HULL PLATING INTEGRITY. Increases max exosuit integrity to 5 hearts.',
                cost: this.getEffectiveCost(this.bank.getGoalUpgradeCost?.('hullExpansion', 2) ?? { tech: 100, med: 40 }),
                type: 'goal-upgrade',
                cardConfig: GOAL_CARD_CONFIGS.find(cfg => cfg.goalKey === 'hullExpansion')
            };
        }
        if ((bankState.radarNodeLevel ?? 1) < 2) {
            return {
                key: 'radarNode',
                title: 'RADAR DISH OVERCLOCK',
                desc: 'OVERCLOCK THE RADAR DISH. Enables spinning animation and wide-area scans.',
                cost: this.getEffectiveCost(this.bank.getGoalUpgradeCost?.('radarNode', 2) ?? { tech: 200, coin: 50 }),
                type: 'goal-upgrade',
                cardConfig: GOAL_CARD_CONFIGS.find(cfg => cfg.goalKey === 'radarNode')
            };
        }
        if ((bankState.reactorCompressorLevel ?? 1) < 2) {
            return {
                key: 'reactorCompressor',
                title: 'REACTOR COMPRESSOR BOOST',
                desc: 'BOOST REACTOR COMPRESSOR. Refill rate doubles, drain slows by 35% general.',
                cost: this.getEffectiveCost(this.bank.getGoalUpgradeCost?.('reactorCompressor', 2) ?? { tech: 400, coin: 150 }),
                type: 'goal-upgrade',
                cardConfig: GOAL_CARD_CONFIGS.find(cfg => cfg.goalKey === 'reactorCompressor')
            };
        }
        return null;
    }

    renderConsoleBanking(ship) {
        const inventory = this.getSessionInventory();
        const bankState = this.bank.getState();
        const generatorState = this.getO2GeneratorState(bankState);
        this.updateGoalModuleVisualState(bankState.unlocks);
        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = String(value);
        };

        setText('terminal-session-med', inventory.health);
        setText('terminal-session-tech', inventory.weapon);
        setText('terminal-session-coin', inventory.coin);
        const depositableTotal = (inventory.health ?? 0) + (inventory.weapon ?? 0) + (inventory.coin ?? 0);
        setText('terminal-bank-med', bankState.med);
        setText('terminal-bank-tech', bankState.tech);
        setText('terminal-bank-coin', bankState.coin);
        const totalBanked = (bankState.med ?? 0) + (bankState.tech ?? 0) + (bankState.coin ?? 0);
        setText('terminal-summary-shells', `◈ ${this.bank.getShells()}`);
        setText('terminal-summary-bank', totalBanked);
        setText('terminal-summary-hp', `${this.playerVitals.hp}/${this.playerVitals.maxHp}`);
        setText('terminal-summary-o2', `${Math.round(this.playerVitals.o2)}%`);
        const progression = this.getProgressionStats(ship, bankState);
        setText(
            'terminal-tab-skills-status',
            `SKL ${progression.classUnlocked}/${progression.classTotal} · SYS ${progression.systemUnlocked}/${progression.systemTotal} · WPN ${progression.combatUnlocked}/${progression.combatTotal} · ◈ ${this.bank.getShells()}`
        );
        const activeGoal = this.getActiveBaseGoal(bankState);
        const purchaseZone = document.getElementById('terminal-objective-purchase-zone');
        const costOutlineEl = document.getElementById('terminal-objective-cost-outline');
        const buyBtn = document.getElementById('terminal-objective-buy-btn');

        if (activeGoal && purchaseZone && costOutlineEl && buyBtn) {
            purchaseZone.classList.remove('hidden');

            setText('terminal-current-objective-title', activeGoal.title);
            setText('terminal-current-objective-detail', activeGoal.desc);

            const breakdown = this.getResourceCostBreakdown(activeGoal.cost, bankState);
            const canAfford = this.bank.canAfford(activeGoal.cost);

            costOutlineEl.innerHTML = '';
            for (const entry of breakdown) {
                const chip = document.createElement('span');
                chip.className = `objective-cost-chip ${entry.have >= entry.need ? 'cost-met' : 'cost-missing'}`;
                chip.textContent = `${entry.label}: ${entry.have}/${entry.need}`;
                costOutlineEl.appendChild(chip);
            }

            buyBtn.disabled = !canAfford;
            buyBtn.textContent = activeGoal.key === 'o2Bubble'
                ? 'REPAIR GENERATOR'
                : activeGoal.type === 'goal-upgrade'
                    ? 'INITIATE UPGRADE'
                    : 'INITIATE BUILD';
            buyBtn.classList.remove('btn-state--available', 'btn-state--insufficient');
            buyBtn.classList.add(canAfford ? 'btn-state--available' : 'btn-state--insufficient');

            buyBtn.onclick = () => {
                if (activeGoal.type === 'o2') {
                    this.attemptO2GeneratorUpgrade(ship);
                } else if (activeGoal.type === 'goal' && activeGoal.cardConfig) {
                    this.attemptGoalUnlock(ship, activeGoal.cardConfig);
                } else if (activeGoal.type === 'goal-upgrade') {
                    this.attemptGoalUpgrade(ship, activeGoal.key);
                }
            };

            setText('terminal-current-objective-status', canAfford ? 'READY' : 'INSUFFICIENT');
        } else {
            if (purchaseZone) {
                purchaseZone.classList.add('hidden');
            }
            const loopStep = this.getLoopStep() ?? { key: 'explore', label: 'EXPLORE · BANK SALVAGE' };
            const mission = this.missionState;
            const missionActive = Boolean(mission?.type && mission?.status && mission.status !== 'inactive' && mission.status !== 'extracted');
            const objectiveDetail = missionActive && mission.label
                ? mission.label
                : loopStep.key === 'o2'
                    ? 'RESTORE THE SHIP O₂ FIELD TO EXTEND OPERATING RANGE'
                    : 'SECURE SALVAGE, BANK RESOURCES, AND EXPAND BASE SYSTEMS';
            setText('terminal-current-objective-title', loopStep.label);
            setText('terminal-current-objective-detail', objectiveDetail);
            setText(
                'terminal-current-objective-status',
                mission?.status === 'objective_complete' ? 'COMPLETE'
                    : mission?.status === 'elevator_ready' ? 'CHOICE'
                        : 'ACTIVE'
            );
        }
        this.updateTerminalClock();
        const heartsFromMed = Math.floor(bankState.med / 10);
        setText('terminal-med-hearts', heartsFromMed > 0 ? `♥ ×${heartsFromMed} AVAILABLE` : `${bankState.med}/10 FOR ♥`);

        const hint = document.getElementById('terminal-bank-hint');
        if (hint) {
            if (depositableTotal > 0) {
                hint.textContent = 'DEPOSIT READY. RESOURCE TRANSFER CHANNEL OPEN.';
            } else {
                hint.textContent = 'DEPOSIT RESOURCES TO FUND O₂ REPAIRS.';
            }
        }

        const medkitBtn = document.getElementById('terminal-btn-medkit');
        const medkitStatus = document.getElementById('terminal-medkit-status');
        const medkitHint = document.getElementById('terminal-medkit-hint');
        const canConvertMed = bankState.med >= 10 && this.playerVitals.hp < this.playerVitals.maxHp;
        const heartsMissing = Math.max(0, this.playerVitals.maxHp - this.playerVitals.hp);
        const conversionsReady = Math.floor(bankState.med / 10);

        if (medkitStatus) {
            if (this.playerVitals.hp >= this.playerVitals.maxHp) {
                medkitStatus.textContent = 'HP FULL';
            } else if (bankState.med < 10) {
                medkitStatus.textContent = `${bankState.med}/10 MED`;
            } else {
                medkitStatus.textContent = `×${conversionsReady} AVAILABLE`;
            }
        }

        if (medkitHint) {
            if (this.playerVitals.hp >= this.playerVitals.maxHp) {
                medkitHint.textContent = 'EXOSUIT INTEGRITY IS FULL. NO CONVERSION NEEDED.';
            } else {
                medkitHint.textContent = `${heartsMissing} HEART${heartsMissing === 1 ? '' : 'S'} MISSING. ${conversionsReady} CONVERSION${conversionsReady === 1 ? '' : 'S'} AVAILABLE (${bankState.med} MED STORED).`;
            }
        }

        if (medkitBtn) {
            medkitBtn.disabled = !canConvertMed;
            medkitBtn.classList.toggle('btn-state--available', canConvertMed);
            medkitBtn.classList.toggle('btn-state--locked', !canConvertMed);
        }

        const statusEl = document.getElementById('terminal-o2-generator-status');
        const o2Section = document.getElementById('o2-generator-section');
        if (o2Section) {
            o2Section.classList.toggle('hidden', generatorState.isOnline);
        }
        if (statusEl) {
            statusEl.textContent = generatorState.isOnline
                ? `ONLINE // LVL ${generatorState.level}`
                : 'OFFLINE // REPAIR REQUIRED';
        }

        const costEl = document.getElementById('terminal-o2-generator-cost');
        if (costEl) {
            if (generatorState.nextUpgrade) {
                const effectiveCost = this.getEffectiveCost(generatorState.nextUpgrade.cost);
                const discountTag = this.playerType === 'ENGINEER' ? ' [ENG -20%]' : '';
                const canAfford = this.bank.canAfford(effectiveCost);
                const missingText = canAfford ? '' : ` // ${this.getMissingResourceText(effectiveCost, bankState)}`;
                costEl.textContent = `NEXT COST: ${this.formatResourceCost(effectiveCost, { bankState, showHaveNeed: !canAfford })}${discountTag}${missingText}`;
            } else {
                costEl.textContent = 'NEXT COST: NONE';
            }
        }

        const fieldEl = document.getElementById('terminal-o2-generator-field');
        if (fieldEl) {
            fieldEl.textContent = generatorState.isOnline
                ? `FIELD RADIUS ${generatorState.radius.toFixed(1)}u // REFILL ${generatorState.refillRate.toFixed(1)}%/s`
                : 'FIELD RADIUS 0.0u // REFILL OFFLINE';
        }

        const generatorHint = document.getElementById('terminal-o2-generator-hint');
        if (generatorHint) {
            if (generatorState.maxed) {
                generatorHint.textContent = 'O₂ GENERATOR OUTPUT IS MAXED FOR THIS EXOSUIT BAY.';
            } else if (!generatorState.isOnline) {
                const effectiveCost = generatorState.nextUpgrade ? this.getEffectiveCost(generatorState.nextUpgrade.cost) : {};
                const missingText = this.getMissingResourceText(effectiveCost, bankState);
                generatorHint.textContent = missingText || 'REPAIR THIS MODULE TO CREATE A SAFE O₂ ZONE NEAR YOUR SHIP.';
            } else {
                generatorHint.textContent = 'UPGRADES EXPAND THE BLUE O₂ FIELD SO YOU CAN REFILL FROM FURTHER OUT.';
            }
        }

        const upgradeBtn = document.getElementById(O2_GENERATOR_BUTTON_ID);
        if (upgradeBtn) {
            const buttonState = this.getO2GeneratorButtonState(generatorState);
            upgradeBtn.textContent = buttonState.label;
            upgradeBtn.disabled = !buttonState.enabled;
            upgradeBtn.classList.remove('btn-state--online', 'btn-state--locked', 'btn-state--insufficient', 'btn-state--available');
            upgradeBtn.classList.add(buttonState.stateClass);
        }

        for (const cardConfig of GOAL_CARD_CONFIGS) {
            this.renderGoalCard(ship, bankState, cardConfig);
        }
        // The tier-2 and weapons card sections are retired: the Bunker Tree
        // (skills tab) renders those systems as branches now. The sections
        // stay in the DOM so nothing dangles, but never show again.
        for (const id of ['tier2-section', 'weapons-section']) {
            document.getElementById(id)?.classList.add('hidden');
        }
        this.renderTerminalEventPanel();

        // Hide active / unlocked sections below
        const o2SectionEl = document.getElementById('o2-generator-section');
        if (o2SectionEl) {
            const isO2ActiveGoal = activeGoal && activeGoal.key === 'o2Bubble';
            o2SectionEl.classList.toggle('hidden', generatorState.isOnline || isO2ActiveGoal);
        }

        const hullSection = document.getElementById('hull-expansion-section');
        if (hullSection) {
            const isHullActiveGoal = activeGoal && activeGoal.key === 'hullExpansion';
            hullSection.classList.toggle('hidden', Boolean(bankState.unlocks.hullExpansion) || isHullActiveGoal);
        }

        const radarSection = document.getElementById('radar-node-section');
        if (radarSection) {
            const isRadarActiveGoal = activeGoal && activeGoal.key === 'radarNode';
            radarSection.classList.toggle('hidden', Boolean(bankState.unlocks.radarNode) || isRadarActiveGoal);
        }

        const reactorSection = document.getElementById('reactor-compressor-section');
        if (reactorSection) {
            const isReactorActiveGoal = activeGoal && activeGoal.key === 'reactorCompressor';
            reactorSection.classList.toggle('hidden', Boolean(bankState.unlocks.reactorCompressor) || isReactorActiveGoal);
        }

        const ticker = document.getElementById('terminal-status-ticker');
        if (ticker) {
            this._tickerRefreshTimer = (this._tickerRefreshTimer ?? 0) + 0.12;
            const shouldCycle = this._tickerRefreshTimer >= 6.0;
            if (shouldCycle) this._tickerRefreshTimer = 0;
            const message = this._buildTerminalTickerMessage(ship, bankState, generatorState, shouldCycle);
            if (ticker.textContent !== message) {
                ticker.textContent = message;
            }
        }
    }

    _buildTerminalTickerMessage(ship, bankState, generatorState, shouldCycle = false) {
        const biomeKey = this.currentBiomeKey ?? BIOME_KEYS.ACTIVE;
        const o2 = this.playerVitals?.o2 ?? 100;
        const hp = this.playerVitals?.hp ?? 3;
        const unlocks = bankState?.unlocks ?? {};
        const depthTier = this.currentDepthTier ?? 0;
        const uplink = this.getMothershipUplinkReadiness(bankState);

        if (this.isPlayerDead) {
            return 'CRITICAL: EXOSUIT LIFE SUPPORT FAILURE. EMERGENCY REVIVAL PROTOCOL INITIATED.';
        }

        if (o2 <= 0) {
            return 'CRITICAL: O₂ RESERVES EXHAUSTED. SUIT INTEGRITY COMPROMISED. IMMEDIATE RETURN REQUIRED.';
        }

        if (o2 <= O2_DANGER_THRESHOLD) {
            const pct = Math.round(o2);
            return `WARNING: O₂ AT ${pct}%. EXOSUIT FILTERS FAILING. RETURN TO SHIP IMMEDIATELY.`;
        }

        if (!generatorState.isOnline) {
            const techNeeded = generatorState.nextUpgrade?.cost?.tech ?? 10;
            return `ALERT: O₂ GENERATOR OFFLINE. DEPOSIT ${techNeeded} TECH TO INITIATE FIELD REPAIR.`;
        }

        if (hp <= 1) {
            return 'WARNING: EXOSUIT HULL BREACH CRITICAL. SEEK MEDICAL SUPPLIES OR RETURN TO BASE.';
        }

        if (this.missionState?.status === 'objective_complete') {
            if (!uplink.ready) {
                return 'OBJECTIVE SECURED. UPLINK LOCKED UNTIL ALL SYSTEMS ARE MAXED.';
            }
            return 'OBJECTIVE SECURED. HOLD POSITION AT SHIP TO EXECUTE LAUNCH.';
        }

        if (biomeKey === BIOME_KEYS.BIO) {
            const pool = [
                'CONTAMINATION ALERT: BIOHAZARD SPORE DENSITY CRITICAL. SUIT DECON FILTERS OVERLOADED.',
                'BIO SECTOR: ALIEN ORGANISM GROWTH DETECTED. PROCEED WITH EXTREME CAUTION.',
                `BIO SECTOR DEPTH ${depthTier}. LOOT DENSITY ELEVATED. OXYGEN DEMAND +30%.`
            ];
            if (!Number.isFinite(this._tickerBioIndex)) this._tickerBioIndex = 0;
            const msg = pool[this._tickerBioIndex % pool.length];
            if (shouldCycle) this._tickerBioIndex = (this._tickerBioIndex + 1) % pool.length;
            return msg;
        }

        if (biomeKey === BIOME_KEYS.CRYO) {
            const pool = [
                'THERMAL WARNING: CRYO SECTOR DETECTED. SUIT INSULATION LOAD ELEVATED BY 15%.',
                'CRYO SECTOR: RUPTURED COOLANT LINES DETECTED. FROZEN DEBRIS DENSITY HIGH.',
                `CRYO SECTOR DEPTH ${depthTier}. LOOT DENSITY ELEVATED. THERMAL DRAIN ACTIVE.`
            ];
            if (!Number.isFinite(this._tickerCryoIndex)) this._tickerCryoIndex = 0;
            const msg = pool[this._tickerCryoIndex % pool.length];
            if (shouldCycle) this._tickerCryoIndex = (this._tickerCryoIndex + 1) % pool.length;
            return msg;
        }

        if (generatorState.maxed) {
            if (unlocks.reactorCompressor) {
                return `ALL SYSTEMS NOMINAL. O₂ FIELD AT MAX RANGE [${generatorState.radius.toFixed(1)}u]. REACTOR EFFICIENCY OPTIMAL.`;
            }
            return `O₂ FIELD MAXED [${generatorState.radius.toFixed(1)}u]. REACTOR COMPRESSOR UPGRADE RECOMMENDED.`;
        }

        if (unlocks.hullExpansion) {
            return `HULL MATRIX ACTIVE. STRUCTURAL INTEGRITY ENHANCED. O₂ FIELD RADIUS ${generatorState.radius.toFixed(1)}u.`;
        }

        const fallback = [
            'BUNKER PERIMETER SCAN NOMINAL. TACTICAL NETWORK UPLINK STABLE.',
            'RESOURCE CACHES DETECTED WITHIN OPERATIONAL RANGE. CONTINUE EXTRACTION.',
            `BANKED SNAIL SHELLS: ◈ ${this.bank?.getShells?.() ?? 0}. USED FOR SKILLS AND MATRIX UPGRADES.`,
            `MOTHERSHIP MONITORING ACTIVE. DEPTH TIER: ${DEPTH_TIER_NAMES[depthTier] ?? 'SURFACE'}. STAY VIGILANT.`,
            `O₂ FIELD ACTIVE [${generatorState.radius.toFixed(1)}u]. REFILL RATE: ${generatorState.refillRate?.toFixed(1) ?? '0.0'}%/s.`
        ];
        if (!Number.isFinite(this._tickerFallbackIndex)) this._tickerFallbackIndex = 0;
        const msg = fallback[this._tickerFallbackIndex % fallback.length];
        if (shouldCycle) this._tickerFallbackIndex = (this._tickerFallbackIndex + 1) % fallback.length;
        return msg;
    }

    handleDepositAll(ship, { silentIfEmpty = false, quiet = false } = {}) {
        const inventory = this.getSessionInventory();
        const depositPayload = {
            med: Math.max(0, Math.floor(inventory.health ?? 0)),
            tech: Math.max(0, Math.floor(inventory.weapon ?? 0)),
            coin: Math.max(0, Math.floor(inventory.coin ?? 0))
        };
        const depositableTotal = depositPayload.med + depositPayload.tech + depositPayload.coin;

        if (depositableTotal <= 0) {
            if (!silentIfEmpty) {
                window.AudioManager?.play('ui_error', { volume: 0.58 });
            }
            this.renderConsoleBanking(ship);
            return;
        }

        this.bank.deposit(depositPayload);
        this.runDepositedResources.tech = (this.runDepositedResources.tech ?? 0) + depositPayload.tech;
        this.runDepositedResources.med = (this.runDepositedResources.med ?? 0) + depositPayload.med;
        this.runDepositedResources.coin = (this.runDepositedResources.coin ?? 0) + depositPayload.coin;
        window.consumeSessionInventoryForDeposit?.({
            health: depositPayload.med,
            weapon: depositPayload.tech,
            coin: depositPayload.coin
        });
        if (!quiet) {
            window.AudioManager?.play('ui_click', { volume: 0.62 });
        }
        this.renderConsoleBanking(ship);
    }

    attemptGoalUnlock(ship, cardConfig) {
        const rawCost = this.bank.getGoalCost(cardConfig.goalKey);
        if (!rawCost) {
            window.AudioManager?.play('ui_error', { volume: 0.58 });
            this.renderConsoleBanking(ship);
            return;
        }
        const cost = this.getEffectiveCost(rawCost);
        const prereqKey = cardConfig.prereqKey;
        const prereqMet = !prereqKey || Boolean(this.bank.getState()?.unlocks?.[prereqKey]);
        const alreadyUnlocked = Boolean(this.bank.getState()?.unlocks?.[cardConfig.goalKey]);
        if (alreadyUnlocked || !prereqMet || !this.bank.canAfford(cost)) {
            window.AudioManager?.play('ui_error', { volume: 0.58 });
            this.renderConsoleBanking(ship);
            return;
        }

        if (!this.bank.spend(cost)) {
            window.AudioManager?.play('ui_error', { volume: 0.58 });
            this.renderConsoleBanking(ship);
            return;
        }

        const unlocked = this.bank.setUnlock(cardConfig.goalKey);
        if (!unlocked) {
            this.bank.deposit(cost);
            window.AudioManager?.play('ui_error', { volume: 0.58 });
            this.renderConsoleBanking(ship);
            return;
        }

        this.syncPersistentUpgrades();
        this.emitVitalsState();
        window.AudioManager?.play('class_lock', { volume: 0.55 });
        this.renderConsoleBanking(ship);
        this.renderO2GeneratorModal(ship);
    }

    attemptGoalUpgrade(ship, goalKey) {
        if (!this.bank.canUpgradeGoal(goalKey)) {
            window.AudioManager?.play('ui_error', { volume: 0.58 });
            this.renderConsoleBanking(ship);
            return;
        }

        if (this.bank.upgradeGoal(goalKey)) {
            this.syncPersistentUpgrades();
            this.emitVitalsState();
            window.AudioManager?.play('class_lock', { volume: 0.55 });
            this.renderConsoleBanking(ship);
            this.renderO2GeneratorModal(ship);
        } else {
            window.AudioManager?.play('ui_error', { volume: 0.58 });
            this.renderConsoleBanking(ship);
        }
    }

    attemptO2GeneratorUpgrade(ship) {
        const generatorState = this.getO2GeneratorState();
        const nextUpgrade = generatorState.nextUpgrade;
        let upgrade;
        if (nextUpgrade && this.playerType === 'ENGINEER') {
            const discountedCost = this.getEffectiveCost(nextUpgrade.cost);
            if (!this.bank.canAfford(discountedCost)) {
                window.AudioManager?.play('ui_error', { volume: 0.58 });
                this.renderConsoleBanking(ship);
                return;
            }
            if (!this.bank.spend(discountedCost)) {
                window.AudioManager?.play('ui_error', { volume: 0.58 });
                this.renderConsoleBanking(ship);
                return;
            }
            upgrade = this.bank.markO2GeneratorLevelOnly(nextUpgrade.level);
        } else {
            upgrade = this.bank.upgradeO2Generator();
        }
        if (!upgrade) {
            window.AudioManager?.play('ui_error', { volume: 0.58 });
            this.renderConsoleBanking(ship);
            return;
        }

        this.syncPersistentUpgrades();
        this.ensureO2BubbleVisualState();
        this.emitO2State();
        window.dispatchEvent(new CustomEvent('o2-bubble-activated', {
            detail: {
                active: true,
                level: upgrade.level,
                radius: upgrade.radius
            }
        }));
        window.AudioManager?.play('class_lock', { volume: 0.55 });
        this.renderConsoleBanking(ship);
        this.renderO2GeneratorModal(ship);
    }

    attemptMedConversion(ship) {
        const bankState = this.bank.getState();
        if (bankState.med < 10 || this.playerVitals.hp >= this.playerVitals.maxHp) {
            window.AudioManager?.play('ui_error', { volume: 0.55 });
            return;
        }

        if (!this.bank.spend({ med: 10 })) {
            window.AudioManager?.play('ui_error', { volume: 0.55 });
            return;
        }

        this.healPlayer(1);
        window.AudioManager?.play('ui_click', { volume: 0.55, playbackRate: 1.08 });
        window.AudioManager?.play('ui_scan_ping', { volume: 0.3, playbackRate: 0.85 });
        this.renderConsoleBanking(ship);
    }

    openConsoleModal(ship) {
        const modal = document.getElementById('console-terminal-modal');
        if (!modal) return;

        window.AudioManager?.play('ui_scan_ping', { volume: 0.6 });

        // Update class styling based on ship type
        const content = modal.querySelector('.console-terminal-content');
        if (content) {
            const glowColor = ship.type === 'SCOUT' ? '#7dff5a' : (ship.type === 'TANK' ? '#ffb700' : '#00e5ff');
            const glowRgb = ship.type === 'SCOUT' ? '125, 255, 90' : (ship.type === 'TANK' ? '255, 183, 0' : '0, 229, 255');
            content.style.setProperty('--terminal-glow', glowColor);
            content.style.setProperty('--terminal-glow-rgb', glowRgb);
        }

        // Update badge text
        const badge = document.getElementById('terminal-class-badge');
        if (badge) {
            const isActive = this.playerType === ship.type;
            badge.textContent = `${ship.type} BASE STATUS ${isActive ? '[ACTIVE EXOSUIT]' : '[STANDBY]'}`;
        }

        this.syncPersistentUpgrades();
        this.handleDepositAll(ship, { silentIfEmpty: true, quiet: true });
        this.renderConsoleBanking(ship);

        const depositBtn = document.getElementById('terminal-deposit-all');
        if (depositBtn) {
            depositBtn.onclick = () => this.handleDepositAll(ship);
        }

        const o2UpgradeBtn = document.getElementById(O2_GENERATOR_BUTTON_ID);
        if (o2UpgradeBtn) {
            o2UpgradeBtn.onclick = () => this.attemptO2GeneratorUpgrade(ship);
        }

        const medkitBtn = document.getElementById('terminal-btn-medkit');
        if (medkitBtn) {
            medkitBtn.onclick = () => this.attemptMedConversion(ship);
        }

        // Setup Tab Navigation
        const tabBase = document.getElementById('terminal-tab-base');
        const tabSkills = document.getElementById('terminal-tab-skills');
        const contentBase = document.getElementById('terminal-tab-base-content');
        const contentSkills = document.getElementById('terminal-tab-skills-content');

        if (tabBase && tabSkills && contentBase && contentSkills) {
            // Default to Base System Tab
            tabBase.classList.add('active');
            tabSkills.classList.remove('active');
            contentBase.classList.remove('hidden');
            contentSkills.classList.add('hidden');

            tabBase.onclick = () => {
                tabBase.classList.add('active');
                tabSkills.classList.remove('active');
                contentBase.classList.remove('hidden');
                contentSkills.classList.add('hidden');
                const body = modal.querySelector('.terminal-body');
                if (body) body.scrollTop = 0;
                window.AudioManager?.play('ui_click', { volume: 0.5 });
            };

            tabSkills.onclick = () => {
                tabSkills.classList.add('active');
                tabBase.classList.remove('active');
                contentSkills.classList.remove('hidden');
                contentBase.classList.add('hidden');
                const body = modal.querySelector('.terminal-body');
                if (body) body.scrollTop = 0;
                window.AudioManager?.play('ui_click', { volume: 0.5 });
                this.renderSkillsTree(ship);
            };

        }

        // Hook up Close button
        const closeBtn = document.getElementById('close-console-terminal');
        if (closeBtn) {
            closeBtn.onclick = () => this.closeConsoleModal();
        }

        modal.classList.remove('hidden');
    }

    closeConsoleModal() {
        const modal = document.getElementById('console-terminal-modal');
        if (modal) {
            window.AudioManager?.play('ui_click', { volume: 0.5 });
            modal.classList.add('hidden');
        }
    }

    // Generic connector cell for the Bunker Tree: shape comes from the
    // adapter's grid geometry (getBranchConnectors), color from whether the
    // parent node is already unlocked.
    buildConnectorCell(connector, parentUnlocked) {
        const strokeColor = parentUnlocked ? '#38bdf8' : 'rgba(255, 159, 28, 0.25)';
        const strokeWidth = parentUnlocked ? 2.5 : 1.5;
        const flowClass = parentUnlocked ? 'unlocked-flow' : '';
        let line;
        if (connector.type === 'down-left') {
            line = `x1="100%" y1="0%" x2="0%" y2="100%"`;
        } else if (connector.type === 'down-right') {
            line = `x1="0%" y1="0%" x2="100%" y2="100%"`;
        } else {
            line = `x1="50%" y1="0%" x2="50%" y2="100%"`;
        }
        const wrapper = document.createElement('div');
        wrapper.innerHTML = `<div class="skill-line-cell"><svg class="skill-line-svg"><line class="${flowClass}" ${line} stroke="${strokeColor}" stroke-width="${strokeWidth}" /></svg></div>`;
        const cell = wrapper.firstChild;
        cell.style.gridRow = String(connector.row);
        cell.style.gridColumn = String(connector.col);
        return cell;
    }

    getSkillGateText(node = {}) {
        const goalLabels = {
            hullExpansion: 'HULL MATRIX',
            radarNode: 'RADAR NODE',
            reactorCompressor: 'REACTOR CORE'
        };
        if (node.requiredGoal && !this.bank.getState()?.unlocks?.[node.requiredGoal]) {
            return `REQUIRES ${goalLabels[node.requiredGoal] ?? String(node.requiredGoal).toUpperCase()}`;
        }
        if (node.requiredO2Level && this.bank.getO2GeneratorLevel() < node.requiredO2Level) {
            return `REQUIRES O2 FIELD LV ${node.requiredO2Level}`;
        }
        return '';
    }

    getProgressionStats(ship = this.getActiveShip(), bankState = this.bank.getState()) {
        const playerClass = String(ship?.type ?? this.playerType ?? 'SCOUT').toUpperCase();
        const classTree = CLASS_SKILL_TREES[playerClass] ?? [];
        const classUnlocked = classTree.filter((node) => this.bank.isSkillUnlocked(node.id)).length;
        const classReady = classTree.filter((node) => this.bank.canUnlockSkill(node.id, playerClass)).length;

        const tier2Unlocks = bankState?.tier2Unlocks ?? {};
        const systemUnlocked = TIER2_UPGRADE_ORDER.filter((key) => Boolean(tier2Unlocks[key])).length;
        const systemReady = TIER2_UPGRADE_ORDER.filter((key) => {
            if (tier2Unlocks[key]) return false;
            const cfg = TIER2_UPGRADE_CONFIGS[key];
            if (!cfg) return false;
            const prereqMet = !cfg.prereq || Boolean(bankState?.unlocks?.[cfg.prereq]);
            const shellPrice = shellPriceOf(cfg.cost);
            return prereqMet && this.bank.canAffordShells(shellPrice);
        }).length;

        const weaponLevels = bankState?.weaponUpgrades ?? {};
        const combatUnlocked = WEAPON_UPGRADE_ORDER.reduce(
            (sum, key) => sum + Math.max(0, Math.floor(Number(weaponLevels[key]) || 0)),
            0
        );
        const combatTotal = WEAPON_UPGRADE_ORDER.reduce(
            (sum, key) => sum + (WEAPON_UPGRADES_CONFIG[key]?.maxLevel ?? 0),
            0
        );
        const combatReady = WEAPON_UPGRADE_ORDER.filter((key) => {
            const cfg = WEAPON_UPGRADES_CONFIG[key];
            if (!cfg) return false;
            const level = Math.max(0, Math.floor(Number(weaponLevels[key]) || 0));
            if (level >= cfg.maxLevel) return false;
            const shellPrice = shellPriceOf(cfg.costs[level]);
            return this.bank.canAffordShells(shellPrice);
        }).length;

        return {
            playerClass,
            classTotal: classTree.length,
            classUnlocked,
            classReady,
            systemTotal: TIER2_UPGRADE_ORDER.length,
            systemUnlocked,
            systemReady,
            combatTotal,
            combatUnlocked,
            combatReady
        };
    }

    // Resolve a Bunker Tree node's live state through the SAME bank methods
    // the retired card surfaces used — the adapter carries structure only,
    // so unlock/afford behavior is provably unchanged.
    getUnifiedNodeState(node, bankState) {
        const kind = node.purchase.kind;
        if (kind === 'skill') {
            const unlocked = this.bank.isSkillUnlocked(node.id);
            const available = !unlocked && this.bank.canUnlockSkill(node.id, buildUnifiedSkillTree({ playerClass: this.playerType }).playerClass);
            return {
                unlocked,
                available,
                level: unlocked ? 1 : 0,
                maxLevel: 1,
                gateText: unlocked ? '' : this.getSkillGateText(node),
                costText: `COST: ◈ ${shellPriceOf(node.cost)} SHELLS`,
                desc: node.desc
            };
        }
        if (kind === 'weapon') {
            const level = Math.max(0, Math.floor(Number(bankState?.weaponUpgrades?.[node.purchase.key]) || 0));
            const maxed = level >= node.maxLevel;
            const nextCost = maxed ? null : node.costsPerLevel?.[level];
            return {
                unlocked: maxed,
                available: !maxed && this.bank.canAffordShells(shellPriceOf(nextCost)),
                level,
                maxLevel: node.maxLevel,
                gateText: '',
                costText: maxed ? 'MAXED' : `COST: ◈ ${shellPriceOf(nextCost)} SHELLS`,
                desc: maxed ? node.descPerLevel?.[node.maxLevel - 1] ?? node.desc : `NEXT: ${node.descPerLevel?.[level] ?? node.desc}`
            };
        }
        if (kind === 'o2gen') {
            const level = this.bank.getO2GeneratorLevel();
            const maxed = level >= node.maxLevel;
            const nextCost = maxed ? null : node.costsPerLevel?.[level];
            return {
                unlocked: maxed,
                available: !maxed && this.bank.canAfford(this.getEffectiveCost(nextCost ?? {})),
                level,
                maxLevel: node.maxLevel,
                gateText: '',
                costText: maxed ? 'MAXED' : `COST: ${this.formatResourceCost(this.getEffectiveCost(nextCost ?? {}))}`,
                desc: node.desc
            };
        }
        if (kind === 'goal') {
            const unlocks = bankState?.unlocks ?? {};
            const goalKey = node.purchase.key;
            const built = Boolean(unlocks[goalKey]);
            const level = built ? (bankState?.[`${goalKey}Level`] ?? 1) : 0;
            const maxed = built && (node.maxLevel < 2 || level >= 2);
            const prereqMet = !node.purchase.prereqKey || Boolean(unlocks[node.purchase.prereqKey]);
            const nextCost = !built ? node.cost : (maxed ? null : node.level2Cost);
            const available = !maxed && prereqMet
                && (!built ? this.bank.canAfford(this.getEffectiveCost(nextCost ?? {})) : this.bank.canUpgradeGoal(goalKey));
            return {
                unlocked: maxed,
                available,
                level,
                maxLevel: node.maxLevel,
                gateText: prereqMet ? '' : `REQUIRES ${node.prereqs[0]?.replace('goal_', '').toUpperCase() ?? 'PRIOR SITE'}`,
                costText: maxed ? 'ONLINE' : `COST: ${this.formatResourceCost(this.getEffectiveCost(nextCost ?? {}))}`,
                desc: node.desc
            };
        }
        // tier2
        const unlocked = Boolean(bankState?.tier2Unlocks?.[node.purchase.key]);
        const prereqMet = !node.prereqs.length || Boolean(bankState?.unlocks?.[node.prereqs[0].replace('goal_', '')]);
        return {
            unlocked,
            available: !unlocked && this.bank.canUnlockTier2(node.purchase.key),
            level: unlocked ? 1 : 0,
            maxLevel: 1,
            gateText: unlocked || prereqMet ? '' : `REQUIRES ${node.prereqs[0].replace('goal_', '').toUpperCase()}`,
            costText: `COST: ◈ ${shellPriceOf(node.cost)} SHELLS`,
            desc: node.desc
        };
    }

    // Every purchase delegates to the pre-existing handler for its system —
    // the tree is a new surface over old, tested plumbing.
    purchaseTreeNode(ship, node) {
        const kind = node.purchase.kind;
        if (kind === 'skill') {
            const playerClass = buildUnifiedSkillTree({ playerClass: this.playerType }).playerClass;
            const success = this.bank.unlockSkill(node.id, playerClass);
            if (success) {
                window.AudioManager?.play('ui_upgrade_weapon', { volume: 0.6 });
                this.syncPersistentUpgrades();
                this.updatePlayerType(this.playerType);
                if (window.syncAbilityPanelLabel) window.syncAbilityPanelLabel();
            } else {
                window.AudioManager?.play('ui_error', { volume: 0.5 });
            }
        } else if (kind === 'weapon') {
            this.attemptWeaponUpgrade(this.activeInteractiveConsole ?? ship, node.purchase.key);
        } else if (kind === 'tier2') {
            this.attemptTier2Unlock(this.activeInteractiveConsole ?? ship, node.purchase.key);
        } else if (kind === 'o2gen') {
            this.attemptO2GeneratorUpgrade(ship);
        } else if (kind === 'goal') {
            const bankState = this.bank.getState();
            if (bankState?.unlocks?.[node.purchase.key]) {
                this.attemptGoalUpgrade(ship, node.purchase.key);
            } else {
                this.attemptGoalUnlock(ship, { goalKey: node.purchase.key, prereqKey: node.purchase.prereqKey });
            }
        }
        this.renderSkillsTree(ship);
        this.renderConsoleBanking(ship);
    }

    buildTreeNodeCard(ship, node, state) {
        const status = state.unlocked ? 'unlocked' : (state.available ? 'available' : 'locked');
        const card = document.createElement('div');
        card.className = `skill-node-card node-state--${status}`;
        card.style.gridRow = String(node.row);
        card.style.gridColumn = String(node.col);

        const header = document.createElement('div');
        header.className = 'skill-node-header';
        const label = document.createElement('span');
        label.textContent = node.label;
        const statusEl = document.createElement('span');
        statusEl.className = 'skill-node-status';
        statusEl.textContent = node.maxLevel > 1
            ? `[LV ${state.level}/${node.maxLevel}]`
            : (state.unlocked ? '[UNLOCKED]' : (state.available ? '[AVAILABLE]' : '[LOCKED]'));
        header.appendChild(label);
        header.appendChild(statusEl);
        card.appendChild(header);

        const desc = document.createElement('div');
        desc.className = 'skill-node-desc';
        desc.textContent = state.desc;
        card.appendChild(desc);

        const costEl = document.createElement('div');
        costEl.className = 'skill-node-cost';
        costEl.textContent = state.unlocked ? (node.maxLevel > 1 ? state.costText : 'COMPLETED') : (state.gateText || state.costText);
        card.appendChild(costEl);

        if (state.available) {
            const buyBtn = document.createElement('button');
            buyBtn.className = 'skill-node-btn';
            buyBtn.textContent = node.maxLevel > 1 && state.level > 0 ? 'UPGRADE' : 'UNLOCK';
            buyBtn.onclick = (e) => {
                e.stopPropagation();
                this.purchaseTreeNode(ship, node);
            };
            card.appendChild(buyBtn);
        }
        return card;
    }

    renderTreeBranch(container, ship, branchDef, bankState) {
        const title = document.createElement('div');
        title.className = 'skills-branch-title terminal-section-title';
        title.textContent = branchDef.label;
        container.appendChild(title);

        const grid = document.createElement('div');
        grid.className = 'skills-tree-grid';
        const stateById = new Map();
        for (const node of branchDef.nodes) {
            const state = this.getUnifiedNodeState(node, bankState);
            stateById.set(node.id, state);
            grid.appendChild(this.buildTreeNodeCard(ship, node, state));
        }
        for (const connector of getBranchConnectors(branchDef.nodes)) {
            const parentState = stateById.get(connector.parentId);
            grid.appendChild(this.buildConnectorCell(connector, Boolean(parentState?.unlocked || (parentState?.level ?? 0) > 0)));
        }
        container.appendChild(grid);
    }

    // The Bunker Tree: one surface for all three progression systems.
    renderSkillsTree(ship) {
        const gridContainer = document.getElementById('skills-tree-grid');
        const matrix = document.getElementById('skills-upgrade-matrix');
        const countEl = document.getElementById('skills-unlocked-count');
        if (!gridContainer || !matrix) return;

        const bankState = this.bank.getState();
        const progression = this.getProgressionStats(ship, bankState);
        const tree = buildUnifiedSkillTree({ playerClass: progression.playerClass });

        if (countEl) {
            countEl.textContent = `${tree.playerClass} SKILLS: ${progression.classUnlocked}/${progression.classTotal} (${progression.classReady} READY) | SYSTEM: ${progression.systemUnlocked}/${progression.systemTotal} (${progression.systemReady} READY) | COMBAT: ${progression.combatUnlocked}/${progression.combatTotal} (${progression.combatReady} READY) | BALANCE: ◈ ${this.bank.getShells()} SHELLS`;
        }

        // Class branch keeps the original grid element; combat + ship render
        // as sibling tree grids where the retired card sections used to mount.
        gridContainer.innerHTML = '';
        const classGrid = document.createElement('div');
        classGrid.style.display = 'contents';
        const stateById = new Map();
        for (const node of tree.branches.class.nodes) {
            const state = this.getUnifiedNodeState(node, bankState);
            stateById.set(node.id, state);
            classGrid.appendChild(this.buildTreeNodeCard(ship, node, state));
        }
        for (const connector of getBranchConnectors(tree.branches.class.nodes)) {
            classGrid.appendChild(this.buildConnectorCell(connector, Boolean(stateById.get(connector.parentId)?.unlocked)));
        }
        gridContainer.appendChild(classGrid);

        matrix.innerHTML = '';
        for (const branchKey of TREE_BRANCHES) {
            if (branchKey === 'class') continue;
            this.renderTreeBranch(matrix, ship, tree.branches[branchKey], bankState);
        }
    }

    renderO2GeneratorModal(ship = this.getActiveShip()) {
        const bankState = this.bank.getState();
        const generatorState = this.getO2GeneratorState(bankState);
        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = String(value);
        };
        const badge = document.getElementById('o2-generator-modal-badge');
        if (badge) {
            badge.textContent = `${ship?.type ?? this.playerType} FIELD STABILIZER`;
        }
        setText('o2-generator-modal-status', generatorState.isOnline
            ? `ONLINE // LVL ${generatorState.level}`
            : 'OFFLINE // REPAIR REQUIRED');
        setText('o2-generator-modal-field', generatorState.isOnline
            ? `FIELD RADIUS ${generatorState.radius.toFixed(1)}u // REFILL ${generatorState.refillRate.toFixed(1)}%/s`
            : 'FIELD RADIUS 0.0u // REFILL OFFLINE');

        const buttonState = this.getO2GeneratorButtonState(generatorState);
        const effectiveCost = generatorState.nextUpgrade
            ? this.getEffectiveCost(generatorState.nextUpgrade.cost)
            : null;
        if (effectiveCost) {
            const canAfford = this.bank.canAfford(effectiveCost);
            const discountTag = this.playerType === 'ENGINEER' ? ' [ENG -20%]' : '';
            const missingText = canAfford ? '' : ` // ${this.getMissingResourceText(effectiveCost, bankState)}`;
            setText('o2-generator-modal-cost', `NEXT COST: ${this.formatResourceCost(effectiveCost, { bankState, showHaveNeed: !canAfford })}${discountTag}${missingText}`);
        } else {
            setText('o2-generator-modal-cost', 'NEXT COST: NONE');
        }
        setText('o2-generator-modal-hint', generatorState.maxed
            ? 'O2 GENERATOR OUTPUT IS MAXED.'
            : buttonState.hint || 'UPGRADES EXPAND THE BLUE O2 FIELD.');

        const btn = document.getElementById('o2-generator-modal-btn');
        if (btn) {
            btn.textContent = buttonState.label;
            btn.disabled = !buttonState.enabled;
            btn.classList.remove('btn-state--online', 'btn-state--locked', 'btn-state--insufficient', 'btn-state--available');
            btn.classList.add(buttonState.stateClass);
            btn.onclick = () => this.attemptO2GeneratorUpgrade(ship ?? this.getActiveShip());
        }
    }

    openO2GeneratorModal(ship = this.getActiveShip()) {
        const modal = document.getElementById('o2-generator-modal');
        if (!modal) return;
        this.syncPersistentUpgrades();
        this.renderO2GeneratorModal(ship);
        const closeBtn = document.getElementById('close-o2-generator-modal');
        if (closeBtn) {
            closeBtn.onclick = () => this.closeO2GeneratorModal();
        }
        window.AudioManager?.play('ui_scan_ping', { volume: 0.55 });
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
    }

    closeO2GeneratorModal() {
        const modal = document.getElementById('o2-generator-modal');
        if (modal) {
            window.AudioManager?.play('ui_click', { volume: 0.45 });
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    updatePlayerUpgradeVisuals() {
        if (!this.player) return;
        if (this.playerUpgradeVisualGroup) {
            this.player.remove(this.playerUpgradeVisualGroup);
            this.playerUpgradeVisualGroup.traverse((child) => {
                child.geometry?.dispose?.();
                child.material?.dispose?.();
            });
        }
        const group = new THREE.Group();
        group.name = 'player-upgrade-visuals';
        const bankState = this.bank?.getState?.() ?? {};
        const skillCount = (bankState.unlockedSkills ?? []).length;
        const weaponLevels = Object.values(bankState.weaponUpgrades ?? {}).reduce((sum, value) => sum + Math.max(0, Math.floor(Number(value) || 0)), 0);
        const tier2Count = Object.values(bankState.tier2Unlocks ?? {}).filter(Boolean).length;
        const ringCount = Math.min(3, Math.floor((skillCount + weaponLevels + tier2Count) / 2));
        for (let i = 0; i < ringCount; i++) {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(0.46 + i * 0.08, 0.012, 8, 32),
                new THREE.MeshBasicMaterial({ color: [0x7dff5a, 0x00e5ff, 0xffb700][i % 3], transparent: true, opacity: 0.72 })
            );
            ring.rotation.x = Math.PI / 2;
            ring.position.set(this.playerSpriteLead, 0.16 + i * 0.08, this.playerSpriteLead);
            group.add(ring);
        }
        if (bankState.tier2Unlocks?.stimCache || bankState.tier2Unlocks?.suitThermal || bankState.tier2Unlocks?.deconFilters) {
            const pack = new THREE.Mesh(
                new THREE.BoxGeometry(0.18, 0.22, 0.08),
                new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.78 })
            );
            pack.position.set(this.playerSpriteLead - 0.38, 0.82, this.playerSpriteLead + 0.02);
            group.add(pack);
        }
        if (group.children.length) {
            this.player.add(group);
            this.playerUpgradeVisualGroup = group;
        } else {
            this.playerUpgradeVisualGroup = null;
        }
    }

    syncPersistentUpgrades() {
        this.unlocks = this.bank.getUnlocks();
        this.o2GeneratorLevel = this.bank.getO2GeneratorLevel();
        let maxHp = BASE_HEARTS;
        const hullLevel = this.bank.getState().hullExpansionLevel ?? (this.unlocks.hullExpansion ? 1 : 0);
        if (hullLevel === 2) {
            maxHp = 5;
        } else if (hullLevel === 1) {
            maxHp = UPGRADED_HEARTS;
        }
        if (this.playerType === 'TANK' && this.bank && this.bank.isSkillUnlocked('tank_plating_1')) {
            maxHp += 1;
        }
        this.playerVitals.maxHp = maxHp;
        this.playerVitals.hp = Math.min(this.playerVitals.hp, this.playerVitals.maxHp);
        this.applyWeaponUpgrades();
        this.updatePlayerUpgradeVisuals();
        this.updateGoalModuleVisualState(this.unlocks);
        this.ensureO2BubbleVisualState();
    }

    // Translate persisted weapon-upgrade levels into the live combat tuning used by
    // spawnPlayerShot() and the reload/clip logic. Called whenever upgrades change.
    applyWeaponUpgrades() {
        const levels = this.bank?.getWeaponUpgrades?.() ?? {};
        const ammoCapacity = Math.max(0, Math.floor(levels.ammoCapacity ?? 0));
        const shotSpeed = Math.max(0, Math.floor(levels.shotSpeed ?? 0));
        const shotDamage = Math.max(0, Math.floor(levels.shotDamage ?? 0));
        const shotAmount = Math.max(0, Math.floor(levels.shotAmount ?? 0));

        let baseClipSize = WEAPON_CLIP_SIZE + ammoCapacity * WEAPON_CLIP_PER_CAPACITY;
        if (this.playerType === 'SCOUT' && this.bank && this.bank.isSkillUnlocked('scout_ammo_1')) {
            baseClipSize += 3;
        }
        this.weaponClipSize = baseClipSize;

        let extraDamage = shotDamage;
        if (this.playerType === 'TANK' && this.bank && this.bank.isSkillUnlocked('tank_damage_1')) {
            extraDamage += 1;
        }

        this.weaponUpgradeBonuses = {
            shotDamage: extraDamage,
            speedAdd: shotSpeed * WEAPON_SPEED_PER_TIER,
            shotAmount
        };
        // Never leave more rounds chambered than the (possibly shrunk) clip allows.
        this.weaponClipAmmo = Math.min(this.weaponClipAmmo, this.weaponClipSize);
    }

    hasUpgrade(goalKey) {
        return Boolean(this.unlocks?.[goalKey]);
    }

    getActiveShip() {
        return this.crashedShips?.find((ship) => ship.type === this.playerType) ?? null;
    }

    // Render the in-world build-site visual. Only build #3 has a physical
    // animated structure (Note 7); the other sites are abstract scanner targets.
    updateBuildSiteBeacon(now = performance.now()) {
        const site = this.getNextBuildSite();

        // Build #3: render its 4-frame (2x2) animated structure sprite in place
        // at the site, UV-stepping through the sheet (Note 7).
        if (site && site.animated && this.buildStructureTexture) {
            if (!this.buildStructureSprite) {
                const mat = new THREE.SpriteMaterial({
                    map: this.buildStructureTexture,
                    transparent: true,
                    alphaTest: 0.04,
                    depthWrite: false,
                    depthTest: true,
                    fog: true
                });
                const sprite = new THREE.Sprite(mat);
                sprite.center.set(0.5, 0);
                sprite.scale.set(4.4, 4.4, 1);
                sprite.renderOrder = 5;
                this.scene.add(sprite);
                this.buildStructureSprite = sprite;
            }
            this.buildStructureSprite.visible = true;
            this.buildStructureSprite.position.set(site.x, 0.1, site.z);
            // frameIndex = floor(timer * speed) % 4, mapped to a 2x2 grid.
            const frame = Math.floor(now * 0.006) % 4;
            const col = frame % 2;
            const row = Math.floor(frame / 2);
            this.buildStructureTexture.offset.set(
                col * BUILD_STRUCTURE_FRAME_REPEAT,
                (1 - row) * BUILD_STRUCTURE_FRAME_REPEAT
            );
        } else if (this.buildStructureSprite) {
            this.buildStructureSprite.visible = false;
        }
    }

    getActiveO2GeneratorPosition() {
        const activeShip = this.getActiveShip();
        if (!activeShip) return null;

        const x = Number.isFinite(activeShip.o2ModuleX)
            ? activeShip.o2ModuleX
            : activeShip.tileX + (activeShip.o2ModuleOffset?.x ?? O2_MODULE_OFFSET.x);
        const z = Number.isFinite(activeShip.o2ModuleZ)
            ? activeShip.o2ModuleZ
            : activeShip.tileZ + (activeShip.o2ModuleOffset?.z ?? O2_MODULE_OFFSET.z);

        return { x, z };
    }

    // Ignite the base flood-light grid around the active ship/base (Beat 2).
    // Animated sweep by default; instant when restoring an already-online base.
    igniteBaseLights({ instant = false } = {}) {
        if (!this.baseLights) return;
        const ship = this.getActiveShip();
        if (!Number.isFinite(ship?.tileX) || !Number.isFinite(ship?.tileZ)) return;
        const cx = ship.tileX;
        const cz = ship.tileZ;
        const generatorState = this.getO2GeneratorState();
        const radius = generatorState.isOnline ? generatorState.radius : 3.9;
        const color = PLAYER_COLORS[this.playerType] ?? 0xffffff;
        if (instant) this.baseLights.igniteInstant(cx, cz, radius, color);
        else this.baseLights.ignite(cx, cz, radius, color);
    }

    startO2StartupSequence(bossType) {
        this.createO2BubbleObjects();
        if (this.o2BubbleObjects) {
            this.o2BubbleObjects.light.visible = false;
            this.o2BubbleObjects.fill.visible = false;
            this.o2BubbleObjects.ring.visible = false;
        }

        const ship = this.getActiveShip();
        if (ship) {
            if (ship.o2ModuleSprite) {
                ship.o2ModuleSprite.visible = true;
                ship.o2ModuleSprite.scale.set(0, 0, 1);
                ship.o2ModuleSprite.position.y = 0.09 - 1.5;
            }
            if (ship.o2ModuleShadow) {
                ship.o2ModuleShadow.visible = true;
                ship.o2ModuleShadow.scale.set(0, 0, 1);
            }
        }

        this.closeConsoleModal();
        this.setInputEnabled(false);

        this._pendingO2BossType = bossType;
        this.o2StartupSequenceActive = true;
        this.o2StartupPhase = 'popup';
        this.o2StartupTime = 0;
    }

    updateO2StartupSequence(delta) {
        if (!this.o2StartupSequenceActive) return;
        this.o2StartupTime += delta;
        const ship = this.getActiveShip();

        if (this.o2StartupPhase === 'popup') {
            const duration = 1.2; // seconds
            const progress = Math.min(1, this.o2StartupTime / duration);
            if (ship) {
                if (ship.o2ModuleSprite) {
                    ship.o2ModuleSprite.visible = true;
                    ship.o2ModuleSprite.scale.set(1.58 * progress, 1.58 * progress, 1);
                    ship.o2ModuleSprite.position.y = 0.09 - 1.5 * (1 - progress);
                }
                if (ship.o2ModuleShadow) {
                    ship.o2ModuleShadow.visible = true;
                    ship.o2ModuleShadow.scale.set(progress, progress, 1);
                }
            }
            if (progress >= 1) {
                this.o2StartupPhase = 'bubble';
                this.o2StartupTime = 0;
                if (this.baseLights) {
                    const color = PLAYER_COLORS[this.playerType] ?? 0xffffff;
                    const generatorState = this.getO2GeneratorState();
                    this.baseLights.ignite(ship?.tileX ?? 0, ship?.tileZ ?? 0, generatorState.radius, color);
                }
                window.AudioManager?.play?.('ui_boot1', { volume: 0.6 });
            }
        } else if (this.o2StartupPhase === 'bubble') {
            const duration = 1.8; // seconds
            const progress = Math.min(1, this.o2StartupTime / duration);
            const generatorState = this.getO2GeneratorState();
            const targetBubbleScale = generatorState.radius / O2_GENERATOR_RING_BASE_RADIUS;
            const currentBubbleScale = targetBubbleScale * progress;

            if (this.o2BubbleObjects) {
                this.o2BubbleObjects.light.visible = true;
                this.o2BubbleObjects.fill.visible = true;
                this.o2BubbleObjects.ring.visible = true;

                const t = performance.now() * 0.001;
                const pulse = currentBubbleScale * (0.97 + Math.sin(t * 2.2) * 0.06);
                const opacity = (0.16 + Math.sin(t * 2.6) * 0.06) * progress;

                this.o2BubbleObjects.ring.scale.set(pulse, pulse, 1);
                this.o2BubbleObjects.ring.material.opacity = opacity;
                this.o2BubbleObjects.fill.scale.set(pulse, pulse, 1);
                this.o2BubbleObjects.fill.material.opacity = (O2_SAFE_FILL_OPACITY + Math.sin(t * 2.1) * 0.035) * progress;
                this.o2BubbleObjects.light.intensity = (1.35 + Math.sin(t * 2.4) * 0.18) * progress;

                const generatorPos = this.getActiveO2GeneratorPosition();
                if (generatorPos) {
                    this.o2BubbleObjects.light.position.set(generatorPos.x, 0.9, generatorPos.z);
                    this.o2BubbleObjects.light.distance = Math.max(10, generatorState.radius * 2.45);
                    this.o2BubbleObjects.ring.position.set(generatorPos.x, 0.035, generatorPos.z);
                    this.o2BubbleObjects.fill.position.set(generatorPos.x, 0.034, generatorPos.z);
                }
            }

            if (progress >= 1) {
                this.o2StartupPhase = 'dialogue';
                this.o2StartupTime = 0;
                this.o2StartupSequenceActive = false; // end 3D animation phase
                this.triggerO2ClassDialogue(this._pendingO2BossType);
            }
        }
    }

    async triggerO2ClassDialogue(bossType) {
        try {
            if (this.dialogueManager) {
                await this.dialogueManager.openO2MilestoneDialogue({ playerType: this.playerType });
            }

            // Post-dialogue actions:
            // 1. Send the boss
            this.spawnMilestoneBoss(bossType, { sourceGoalKey: 'o2Bubble' });

            // 2. Play warning alert overlay
            window.dispatchEvent(new CustomEvent('milestone-boss-warning', {
                detail: { type: bossType, goalKey: 'o2Bubble' }
            }));
        } finally {
            // Input must come back even if the dialogue or boss spawn throws —
            // otherwise the player is stranded with no visible overlay.
            this.setInputEnabled(true);
        }
    }

    chooseFoundryDiscoveryPosition() {
        const anchor = this.getBiomeAnchorPosition();
        // Mix in per-run entropy: the anchor hash alone is constant for a given
        // hero, which made the foundry spawn in the same spot every single run.
        const random = this.createSeededRandom((this.hashTile(
            Math.round(anchor.x),
            Math.round(anchor.z)
        ) ^ this.runEntropy) >>> 0);
        const preferredAngles = [Math.PI * 0.15, Math.PI * 0.85, Math.PI * 1.35, Math.PI * 1.75];
        for (let attempt = 0; attempt < 96; attempt += 1) {
            const ringT = random();
            const dist = THREE.MathUtils.lerp(FOUNDRY_DISCOVERY_MIN_DISTANCE, FOUNDRY_DISCOVERY_MAX_DISTANCE, ringT);
            const baseAngle = preferredAngles[attempt % preferredAngles.length];
            const angle = baseAngle + (random() - 0.5) * Math.PI * 0.55;
            const x = anchor.x + Math.cos(angle) * dist;
            const z = anchor.z + Math.sin(angle) * dist;
            const tileX = Math.round(x);
            const tileZ = Math.round(z);
            if (this.isSnailTileWalkable(tileX, tileZ) && this.canOccupyPosition(tileX, tileZ)) {
                return { x: tileX, z: tileZ };
            }
        }

        return { x: anchor.x + FOUNDRY_DISCOVERY_MIN_DISTANCE, z: anchor.z };
    }

    // Reveal/power-up the Fabrication Foundry after the O2 counterattack.
    revealFoundry({ instant = false, randomEdge = false } = {}) {
        if (!this.foundry) return;
        const site = (randomEdge || !this.foundry.built) ? this.chooseFoundryDiscoveryPosition() : this.foundry.getPosition();
        const ship = this.getActiveShip();
        const cx = Number.isFinite(site?.x) ? site.x : (Number.isFinite(ship?.tileX) ? ship.tileX : 9);
        const cz = Number.isFinite(site?.z) ? site.z : (Number.isFinite(ship?.tileZ) ? ship.tileZ : 9);
        if (instant) this.foundry.revealInstant(cx, cz);
        else this.foundry.reveal(cx, cz);
        window.dispatchEvent(new CustomEvent('foundry-discovered', {
            detail: { x: cx, z: cz, distance: this.player ? Math.round(Math.hypot(this.player.position.x - cx, this.player.position.z - cz)) : null }
        }));
    }

    // Proximity prompt for the Foundry (mirrors the lore-terminal prompt flow).
    // Reuses the console HUD prompt; dispatches show/hide events main.js listens for.
    updateFoundryPrompt() {
        if (!this.isGameplayInputActive() || !this.foundry?.isRevealed || !this.player || this.isPlayerDead) {
            if (this._foundryPromptActive) {
                this._foundryPromptActive = false;
                window.dispatchEvent(new CustomEvent('foundry-prompt-clear'));
            }
            return;
        }
        const inRange = this.foundry.isWithinInteractRange(this.player.position.x, this.player.position.z);
        if (inRange && !this._foundryPromptActive) {
            this._foundryPromptActive = true;
            window.dispatchEvent(new CustomEvent('foundry-prompt-nearby'));
        } else if (!inRange && this._foundryPromptActive) {
            this._foundryPromptActive = false;
            window.dispatchEvent(new CustomEvent('foundry-prompt-clear'));
        }
    }

    // Interact (E / tap) when standing at the Foundry -> open the Fabrication Bay.
    interactWithFoundry() {
        if (!this.isGameplayInputActive() || !this.player || !this.foundry?.isRevealed) return false;
        if (!this.foundry.isWithinInteractRange(this.player.position.x, this.player.position.z)) return false;
        // Act 2 hijacks the foundry: in the dish phase interacting grows the
        // signal dish instead of opening the fabrication bay.
        if (this.isAct2Active() && this.act2.getPhase() === 'dish') {
            this.act2.buildDish();
            this.triggerCameraShake?.(0.3, 0.7);
            window.AudioManager?.play?.('ui_upgrade_weapon', { volume: 0.55, playbackRate: 0.7 });
            window.dispatchEvent(new CustomEvent('act2-milestone', { detail: { key: 'dishBuilt' } }));
            return true;
        }
        window.dispatchEvent(new CustomEvent('open-fabrication-bay'));
        return true;
    }

    // ── Act 1 finale: the cave holding the "final ship component" ──────────

    // True once the infection reveal has played (persisted arc state) — the
    // cave then stays dormant so the sequence can never replay.
    isCaveRevealDone() {
        const state = this.arcManager?.getState?.()?.arcState;
        return state === 'infected_blackout' || state === 'hive_awakened_tease';
    }

    chooseCaveEntrancePosition() {
        const anchor = this.getBiomeAnchorPosition();
        const random = this.createSeededRandom((this.hashTile(
            Math.round(anchor.x) + 101,
            Math.round(anchor.z) + 47
        ) ^ this.runEntropy) >>> 0);
        // Bias outward (+z), the same direction the build-site ladder pushes.
        const outwardAngles = [Math.PI * 0.5, Math.PI * 0.36, Math.PI * 0.64, Math.PI * 0.5];
        for (let attempt = 0; attempt < 96; attempt += 1) {
            const dist = THREE.MathUtils.lerp(CAVE_DISCOVERY_MIN_DISTANCE, CAVE_DISCOVERY_MAX_DISTANCE, random());
            const angle = outwardAngles[attempt % outwardAngles.length] + (random() - 0.5) * Math.PI * 0.4;
            const tileX = Math.round(anchor.x + Math.cos(angle) * dist);
            const tileZ = Math.round(anchor.z + Math.sin(angle) * dist);
            if (this.isSnailTileWalkable(tileX, tileZ) && this.canOccupyPosition(tileX, tileZ)) {
                return { x: tileX, z: tileZ };
            }
        }
        return { x: Math.round(anchor.x), z: Math.round(anchor.z + CAVE_DISCOVERY_MIN_DISTANCE) };
    }

    revealCaveEntrance({ instant = false } = {}) {
        if (!ARC_PRELUDE_ENABLED || !this.arcManager || !this.caveEntrance) return;
        if (this.isCaveRevealDone() || this.caveEntrance.isRevealed) return;
        const site = this.chooseCaveEntrancePosition();
        if (instant) this.caveEntrance.revealInstant(site.x, site.z);
        else this.caveEntrance.reveal(site.x, site.z);
        window.dispatchEvent(new CustomEvent('cave-entrance-revealed', {
            detail: {
                x: site.x,
                z: site.z,
                distance: this.player ? Math.round(Math.hypot(this.player.position.x - site.x, this.player.position.z - site.z)) : null,
                instant
            }
        }));
    }

    updateCaveEntrance(delta) {
        if (!this.caveEntrance?.isRevealed) return;
        this.caveEntrance.update(delta);
        if (!this.player) return;

        // First close approach marks the "organic anomaly" arc signal (one-shot).
        const dist = this.caveEntrance.distanceTo(this.player.position.x, this.player.position.z);
        if (!this._caveAnomalySignaled) {
            if (dist <= 22) {
                this._caveAnomalySignaled = true;
                this.arcManager?.recordSignal?.({ sawOrganicAnomaly: true });
                this.arcManager?.evaluate?.();
            }
        }

        // Queen Hallucination / Visual tells (Sprint 19 Wave 3)
        if (dist < 18 && !this.isCaveRevealDone()) {
            this._hallucinationTimer = (this._hallucinationTimer ?? 0) + delta;
            const pulseInterval = Math.max(1.0, dist * 0.35); // pulse faster as player gets closer
            if (this._hallucinationTimer >= pulseInterval) {
                this._hallucinationTimer = 0;
                const intensity = 1.0 - (dist / 18); // stronger when closer
                this.triggerCameraShake?.(0.045 * intensity, 0.22);
                window.dispatchEvent(new CustomEvent('queen-hallucination', {
                    detail: { intensity, dist }
                }));
                // Play whispering sounds randomly
                if (Math.random() < 0.6) {
                    window.AudioManager?.play?.('amb_spore_puff', { volume: 0.14 * intensity, playbackRate: 0.52 });
                }
            }
        }

        const promptEligible = this.isGameplayInputActive() && !this.isPlayerDead && !this.isCaveRevealDone();
        const inRange = promptEligible
            && this.caveEntrance.isWithinInteractRange(this.player.position.x, this.player.position.z);
        if (inRange && !this._cavePromptActive) {
            this._cavePromptActive = true;
            window.dispatchEvent(new CustomEvent('cave-prompt-nearby'));
        } else if (!inRange && this._cavePromptActive) {
            this._cavePromptActive = false;
            window.dispatchEvent(new CustomEvent('cave-prompt-clear'));
        }
    }

    interactWithCaveEntrance() {
        if (!this.isGameplayInputActive() || !this.player || !this.caveEntrance?.isRevealed) return false;
        if (this.isCaveRevealDone()) return false;
        if (!this.caveEntrance.isWithinInteractRange(this.player.position.x, this.player.position.z)) return false;
        window.dispatchEvent(new CustomEvent('cave-entrance-interact'));
        return true;
    }

    // ── Act 2: the PregAlien loop (src/act2.js drives the ladder) ──────────

    isAct2Active() {
        return Boolean(this.act2) && this.act2.getPhase() !== 'dormant';
    }

    // Per-frame Act 2 upkeep: make sure the foundry exists for the dish
    // objective (Act 2 starts from a completed rebuild save). Camps are
    // handled by updateCamps — they exist in both acts.
    updateAct2(_delta) {
        if (!this.isAct2Active()) return;
        const phase = this.act2.getPhase();
        if (phase === 'dish' && !this.foundry?.isRevealed) {
            this.revealFoundry({ instant: true });
        }
    }

    // Camps exist from Act 1 onward: friendly outposts the player can support
    // with shells (and later must betray). Leveled camps double as O2 havens
    // during the human prelude.
    updateCamps(delta) {
        if (!ARC_PRELUDE_ENABLED || !this.act2) return;
        this.ensureAct2Camps();
        const phase = this.act2.getPhase();
        for (const camp of this.camps) camp.update(delta);

        // Act 1 perk: a supported camp tops up O2 while you stand in it.
        if (phase === 'dormant' && this.player && !this.isPlayerDead && (this.playerVitals?.o2 ?? 100) < 100) {
            for (const camp of this.camps) {
                if (camp.level > 0 && !camp.destroyed
                    && camp.distanceTo(this.player.position.x, this.player.position.z) <= CAMP_O2_HAVEN_RADIUS) {
                    this.adjustOxygen(delta * CAMP_O2_HAVEN_RATE);
                    break;
                }
            }
        }

        // First contact: walking up to a camp you haven't met pays out
        // immediately (shells + O2), douses its distress flare, and is
        // persisted so it can't be farmed. This is the reason to chase the
        // light columns on the horizon.
        if (this.player && !this.isPlayerDead) {
            for (const camp of this.camps) {
                if (camp.discovered || camp.destroyed) continue;
                const record = this.getCampRecord(camp.id);
                if (!record) continue;
                if (record.discovered) {
                    camp.setDiscovered(true);
                    continue;
                }
                if (camp.distanceTo(this.player.position.x, this.player.position.z) > CAMP_DISCOVERY_RADIUS) continue;
                this.act2.discoverCamp(camp.id);
                camp.setDiscovered(true);
                this.bank?.addShells?.(CAMP_DISCOVERY_SHELLS);
                this.adjustOxygen(CAMP_DISCOVERY_O2);
                this.spawnGearPoofEffect(camp.pos.x, camp.pos.z, 'bunker_junk_uncommon');
                window.dispatchEvent(new CustomEvent('act2-milestone', {
                    detail: { key: 'campDiscovered', campId: camp.id, campLabel: camp.label, x: camp.pos.x, z: camp.pos.z }
                }));
            }
        }

        this.updateCampCivilians(delta);
        this.updateCampTurrets(delta, phase);
        this.updateCampPrompt(phase);
    }

    // Camp defense turrets: friendly artillery in Act 1, the first hostile
    // system the carrier meets in Act 2. Disable them with Vey's spoof, smash
    // them loudly, or eat the shocks.
    updateCampTurrets(delta, phase) {
        if (!this.player) return;
        const campEffects = this.getCampVerbRuntimeEffects();
        const classPerks = this.getAct2ClassPerks();
        const turretCooldownMult = campEffects.turretCooldownMult ?? 1;
        const suspicionGainMult = (campEffects.turretSuspicionGainMult ?? 1) * (classPerks.turretSuspicionGainMult ?? 1);
        const hostileDetectionRadius = 5 * (classPerks.turretDetectionRadiusMult ?? 1);
        for (const camp of this.camps) {
            const turrets = camp.getActiveTurrets?.() ?? [];
            if (!turrets.length) continue;
            const record = this.getCampRecord(camp.id);
            for (const turret of turrets) {
                turret.cooldown -= delta;
                if (turret.cooldown > 0) continue;
                const pos = camp.turretWorldPos(turret);
                const friendly = Boolean(turret.reprogrammed)
                    || phase === 'dormant'
                    || ['recruited', 'turned'].includes(record?.status ?? 'alive');

                if (friendly) {
                    // Shock the nearest low-tier slug in range.
                    let best = null;
                    let bestDist = 7;
                    for (const sprite of this.scatterSprites) {
                        if (!this.isEnemyType(sprite.userData?.type)) continue;
                        if (sprite.userData.burstTriggered || sprite.userData.isBoss) continue;
                        const d = Math.hypot(sprite.position.x - pos.x, sprite.position.z - pos.z);
                        if (d < bestDist) {
                            bestDist = d;
                            best = sprite;
                        }
                    }
                    if (best) {
                        this.damageSnail(best, 1);
                        this.spawnPhysicalBurst(best.position.x, best.position.z, {
                            color: 0x7df2ff,
                            count: 5,
                            upward: 0.18,
                            spread: 0.8
                        });
                        window.AudioManager?.play?.('ui_scan_ping', { volume: 0.3, playbackRate: 1.6 });
                        turret.cooldown = Math.max(1.1, 2.8 * turretCooldownMult);
                    } else {
                        turret.cooldown = Math.max(0.25, 0.5 * turretCooldownMult);
                    }
                    continue;
                }

                // Hostile grid: the carrier gets shocked and the camp gets told.
                if (this.isAct2Active() && ['alive', 'robbed'].includes(record?.status ?? '')) {
                    const d = Math.hypot(this.player.position.x - pos.x, this.player.position.z - pos.z);
                    if (d <= hostileDetectionRadius && !this.isPlayerDead && this.isGameplayInputActive()) {
                        const tankGuarded = (classPerks.shockGuardCharges ?? 0) > 0 && !this._tankShockGuardUsed;
                        if (tankGuarded) {
                            this._tankShockGuardUsed = true;
                        } else {
                            this.takeDamage(1, 'camp-turret', pos.x, pos.z);
                        }
                        const suspicionGain = Math.max(1, Math.round(8 * suspicionGainMult));
                        this.act2?.adjustCampSuspicion?.(camp.id, suspicionGain);
                        const after = this.getCampRecord(camp.id);
                        camp.setSuspicion?.(after?.suspicion ?? record?.suspicion ?? 0);
                        window.dispatchEvent(new CustomEvent('player-suspicion-changed', {
                            detail: { campId: camp.id, campLabel: camp.label, suspicion: after?.suspicion ?? 0 }
                        }));
                        this.triggerApexThreats?.({
                            campId: camp.id,
                            campLabel: camp.label,
                            suspicion: after?.suspicion ?? 0
                        });
                        this.maybePropagateCampOuting(camp, after);
                        this.spawnPhysicalBurst(this.player.position.x, this.player.position.z, {
                            color: tankGuarded ? 0xffd166 : 0x7df2ff,
                            count: 7,
                            upward: 0.25,
                            spread: 1.1
                        });
                        this.triggerCameraShake?.(tankGuarded ? 0.12 : 0.25, 0.4);
                        window.AudioManager?.play?.(tankGuarded ? 'class_lock' : 'player_hit', {
                            volume: tankGuarded ? 0.45 : 0.55,
                            playbackRate: tankGuarded ? 0.78 : 1.3
                        });
                        window.dispatchEvent(new CustomEvent('camp-turret-zap', {
                            detail: {
                                campId: camp.id,
                                campLabel: camp.label,
                                negated: tankGuarded,
                                suspicion: after?.suspicion ?? 0
                            }
                        }));
                        turret.cooldown = Math.max(1.4, 3.2 * turretCooldownMult);
                    } else {
                        turret.cooldown = 0.4;
                    }
                } else {
                    turret.cooldown = 1;
                }
            }
        }
    }

    maybePropagateCampOuting(camp, record = null) {
        if (!camp || !this.act2) return false;
        const campRecord = record ?? this.getCampRecord(camp.id);
        if ((campRecord?.suspicion ?? 0) < 100) return false;
        const relayBlocked = Boolean(this.getRunCardEffects().outing?.propagationBlocked);
        if (relayBlocked || this.act2.getState().networks.knownByCamps.includes(camp.id)) return false;
        this.act2.propagateOuting(camp.id);
        window.dispatchEvent(new CustomEvent('player-outed', {
            detail: {
                campId: camp.id,
                campLabel: camp.label,
                spread: this.act2.getState().networks.knownByCamps
            }
        }));
        this.triggerApexThreats({
            campId: camp.id,
            campLabel: camp.label,
            suspicion: 100,
            outed: true
        });
        return true;
    }

    // ── Humanity / cover pressure (post-reveal) ────────────────────────────
    // Humanity is cover, not morality: it bleeds slowly with time and faster
    // under scrutiny. Camps that watch a low-cover carrier get suspicious;
    // full suspicion outs the player and the relay spreads the truth.
    updateInfectionPressure(delta) {
        if (!ARC_PRELUDE_ENABLED || !this.act2 || !this.player || this.isPlayerDead) return;
        const phase = this.act2.getPhase();
        if (phase === 'dormant' || phase === 'departed') return;
        const state = this.act2.getState();
        if (['cured', 'ascendant'].includes(state.infectionStage)) return;

        // Ambient decay: ~1 point of cover per 12s of active play, softened by Tallow.
        const campEffects = this.getCampVerbRuntimeEffects();
        this._humanityDecayAcc = (this._humanityDecayAcc ?? 0) + humanityDecayProgress(delta, {
            multiplier: campEffects.humanityDecayMultiplier ?? 1
        });
        if (this._humanityDecayAcc >= 1) {
            const drop = Math.floor(this._humanityDecayAcc);
            this._humanityDecayAcc -= drop;
            this.act2.adjustHumanity(-drop);
            const after = this.act2.getState();
            window.dispatchEvent(new CustomEvent('player-humanity-changed', {
                detail: { humanity: after.humanity, stage: after.infectionStage }
            }));
        }

        // Scrutiny: standing inside a living camp with visible tells.
        const stage = state.infectionStage;
        const suspicionMult = this.getRunCardEffects().suspicionMult ?? 1;
        const suspicionRate = (stage === 'symptomatic' ? 1 / 4 : stage === 'strained' ? 1 / 10 : 0) * suspicionMult;
        if (suspicionRate <= 0) return;
        this._suspicionAcc = this._suspicionAcc ?? {};
        for (const camp of this.camps) {
            const record = this.getCampRecord(camp.id);
            if (!record || !['alive', 'robbed'].includes(record.status)) continue;
            if (record.knowsPlayerInfected) continue;
            if (camp.distanceTo(this.player.position.x, this.player.position.z) > 6) continue;
            this._suspicionAcc[camp.id] = (this._suspicionAcc[camp.id] ?? 0) + delta * suspicionRate;
            if (this._suspicionAcc[camp.id] < 1) continue;
            const gain = Math.floor(this._suspicionAcc[camp.id]);
            this._suspicionAcc[camp.id] -= gain;
            this.act2.adjustCampSuspicion(camp.id, gain);
            const after = this.getCampRecord(camp.id);
            camp.setSuspicion?.(after.suspicion);
            window.dispatchEvent(new CustomEvent('player-suspicion-changed', {
                detail: { campId: camp.id, campLabel: camp.label, suspicion: after.suspicion }
            }));
            this.triggerApexThreats({
                campId: camp.id,
                campLabel: camp.label,
                suspicion: after.suspicion
            });
            this.maybePropagateCampOuting(camp, after);
        }
    }

    // ── Hive swarm sites (docs/hive-swarm-camps-and-humanity-system-design.md) ──
    // Act 1: mineable bio-anomalies. Act 2: Nahl, Vey, and Rhun — allies the
    // player wounded for resources, with rescue/harvest/network choices.

    updateHiveSites(delta) {
        if (!ARC_PRELUDE_ENABLED || !this.act2) return;
        this.ensureHiveSites();
        for (const hive of this.hives) hive.update(delta);
        this.updateHivePrompt();
    }

    chooseHiveSitePosition(index) {
        const anchor = this.getBiomeAnchorPosition();
        const random = this.createSeededRandom((this.hashTile(
            Math.round(anchor.x) - 173 - index * 31,
            Math.round(anchor.z) + 137 + index * 17
        ) ^ this.runEntropy) >>> 0);
        // Fanned between the camps, slightly closer in — the anomalies were
        // always underfoot, the player just read them as terrain.
        const baseAngle = [Math.PI * 0.45, Math.PI * 1.1, Math.PI * 1.75][index % 3];
        for (let attempt = 0; attempt < 96; attempt += 1) {
            const dist = THREE.MathUtils.lerp(45, 90, random());
            const angle = baseAngle + (random() - 0.5) * Math.PI * 0.35;
            const tileX = Math.round(anchor.x + Math.cos(angle) * dist);
            const tileZ = Math.round(anchor.z + Math.sin(angle) * dist);
            if (this.isSnailTileWalkable(tileX, tileZ) && this.canOccupyPosition(tileX, tileZ)) {
                return { x: tileX, z: tileZ };
            }
        }
        return {
            x: Math.round(anchor.x + Math.cos(baseAngle) * 45),
            z: Math.round(anchor.z + Math.sin(baseAngle) * 45)
        };
    }

    ensureHiveSites() {
        if (this._hiveSitesReady || !this.act2) return;
        const state = this.act2.getState();
        this.hives = state.hives.map((record, index) => {
            const site = ACT2_HIVE_SITES.find((s) => s.id === record.id) ?? ACT2_HIVE_SITES[index];
            const hive = new HiveSite(this.scene, {
                id: record.id,
                label: site?.label ?? 'HIVE',
                characterId: site?.characterId ?? ''
            });
            let { x, z } = record;
            if (!Number.isFinite(x) || !Number.isFinite(z)) {
                const spot = this.chooseHiveSitePosition(index);
                x = spot.x;
                z = spot.z;
                this.act2.setHivePosition(record.id, x, z);
            }
            hive.reveal(x, z);
            hive.syncFromRecord(record);
            return hive;
        });
        this._hiveSitesReady = true;
    }

    getHiveRecord(id) {
        return this.act2?.getState?.().hives.find((h) => h.id === id) ?? null;
    }

    getHiveById(id) {
        return this.hives.find((hive) => hive.id === id) ?? null;
    }

    getHiveHarvestCycleKey(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    canHarvestHiveToday(record, cycleKey = this.getHiveHarvestCycleKey()) {
        return record?.lastHarvestCycle !== cycleKey;
    }

    denyHiveHarvest(hive, record = this.getHiveRecord(hive?.id)) {
        window.AudioManager?.play?.('ui_error', { volume: 0.38, playbackRate: 0.72 });
        window.dispatchEvent(new CustomEvent('hive-harvest-denied', {
            detail: {
                hiveId: hive?.id,
                hiveLabel: hive?.label,
                harvestCycle: record?.lastHarvestCycle ?? null
            }
        }));
        return true;
    }

    // The hive interaction available where the player stands, or null.
    getActionableHiveAt(x, z) {
        const phase = this.act2?.getPhase?.() ?? 'dormant';
        for (const hive of this.hives) {
            if (!hive.isWithinInteractRange(x, z)) continue;
            const record = this.getHiveRecord(hive.id);
            if (!record) continue;
            if (phase === 'dormant') {
                // Pre-reveal: a resource node, nothing more.
                if (record.extractionLevel < 3
                    && ['dormant', 'mined', 'wounded', 'awakened'].includes(record.status)) {
                    if (!this.canHarvestHiveToday(record)) {
                        return {
                            hive,
                            action: 'cooldown',
                            label: `${hive.label} HARVESTED TODAY`
                        };
                    }
                    return {
                        hive,
                        action: 'mine',
                        label: `HARVEST ${hive.label} — ${record.extractionLevel}/3`
                    };
                }
                return null;
            }
            // Post-reveal: the being inside can finally speak.
            return { hive, action: 'contact', label: `COMMUNE — ${hive.label}` };
        }
        return null;
    }

    updateHivePrompt() {
        const eligible = this.isGameplayInputActive() && this.player && !this.isPlayerDead;
        const actionable = eligible
            ? this.getActionableHiveAt(this.player.position.x, this.player.position.z)
            : null;
        const label = actionable?.label ?? null;
        if (label === this._hivePromptLabel) return;
        this._hivePromptLabel = label;
        if (label) {
            window.dispatchEvent(new CustomEvent('camp-prompt-nearby', { detail: { label } }));
        } else if (!this._campPromptLabel) {
            window.dispatchEvent(new CustomEvent('camp-prompt-clear'));
        }
    }

    interactWithHiveSite() {
        if (!this.isGameplayInputActive() || !this.player || !this.act2) return false;
        const actionable = this.getActionableHiveAt(this.player.position.x, this.player.position.z);
        if (!actionable) return false;
        if (actionable.action === 'mine') return this.mineHiveSite(actionable.hive);
        if (actionable.action === 'cooldown') return this.denyHiveHarvest(actionable.hive);
        if (actionable.action === 'contact') return this.openHiveChoice(actionable.hive);
        return false;
    }

    // Act 1 extraction: real rewards now, a wounded ally later.
    mineHiveSite(hive) {
        const before = this.getHiveRecord(hive.id);
        if (!before || before.extractionLevel >= 3) return false;
        const harvestCycle = this.getHiveHarvestCycleKey();
        if (!this.canHarvestHiveToday(before, harvestCycle)) {
            return this.denyHiveHarvest(hive, before);
        }
        this.act2.mineHive(hive.id, { harvestCycle });
        const after = this.getHiveRecord(hive.id);
        if (!after || after.extractionLevel === before.extractionLevel) return false;

        const yields = {
            hive_suture: { med: 2 },
            hive_relay: { tech: 2 },
            hive_carapace: { coin: 2 }
        };
        this.bank?.deposit?.(yields[hive.id] ?? { tech: 1 });
        this.bank?.addShells?.(4);
        hive.syncFromRecord(after);
        this.spawnGearPoofEffect(hive.pos.x, hive.pos.z, 'bio_spores');
        this.triggerCameraShake?.(0.14, 0.3);
        window.AudioManager?.play?.('enemy_hit_soft', { volume: 0.5, playbackRate: 0.6 });
        const boss = this.spawnHiveHarvestBoss(hive, after.extractionLevel);
        window.dispatchEvent(new CustomEvent('hive-mined', {
            detail: {
                hiveId: hive.id,
                hiveLabel: hive.label,
                extractionLevel: after.extractionLevel,
                wounded: after.status === 'wounded',
                harvestCycle,
                bossType: boss?.userData?.type ?? null
            }
        }));
        window.dispatchEvent(new CustomEvent('shell-collected', {
            detail: { gained: 4, total: this.bank?.getShells?.() ?? 0, isBoss: false }
        }));
        return true;
    }

    // Act 2 hive contact reuses the camp choice modal — same event, alien detail.
    openHiveChoice(hive) {
        const record = this.getHiveRecord(hive.id);
        if (!record) return false;
        const character = ACT2_HIVE_SITES.find((s) => s.id === hive.id);
        window.dispatchEvent(new CustomEvent('camp-choice-open', {
            detail: {
                hiveId: hive.id,
                campId: null,
                campLabel: hive.label,
                leaderName: (character?.characterId ?? '').toUpperCase(),
                leaderClass: 'HIVE MIND',
                leaderTitle: `Extraction wounds ${record.extractionLevel}/3.`,
                leaderCallsign: record.status.toUpperCase(),
                storyOrder: 'H',
                phase: this.act2.getPhase(),
                campState: record,
                endingVector: this.act2.getEndingVector(),
                options: this.buildHiveChoiceOptions(record)
            }
        }));
        return true;
    }

    buildHiveChoiceOptions(record) {
        const options = [];
        const dead = ['slain', 'queen_consumed', 'expired_by_cure'].includes(record.status);
        const gone = ['rescued', 'aboard', 'abandoned'].includes(record.status);
        if (dead || gone) {
            options.push({
                action: 'noop',
                hiveId: record.id,
                label: `HIVE ${record.status.replace(/_/g, ' ').toUpperCase()}`,
                desc: 'This being\'s path is already resolved.',
                disabled: true
            });
            return options;
        }

        options.push({
            action: 'hive-talk',
            hiveId: record.id,
            label: `COMMUNE — ${(record.characterId ?? 'THE BEING').toUpperCase()}`,
            desc: 'Listen. They remember everything you did to them.'
        });
        if (isFinalStage(record.dialogueStage)) {
            const riteDoneByHive = {
                hive_suture: record.questFlags?.host_mercy === 'done',
                hive_relay: record.questFlags?.false_clearance === 'done',
                hive_carapace: record.questFlags?.guard_oath === 'done'
            };
            if (!riteDoneByHive[record.id]) {
                options.push({
                    action: 'hive-final',
                    hiveId: record.id,
                    label: 'ACCEPT THEIR OATH',
                    desc: 'Their rite completes; they are fully yours. Consequence: The queen loses a hand.'
                });
            }
        }
        options.push({
            action: 'hive-tend',
            hiveId: record.id,
            label: 'RETURN RESOURCES — 5 SHELLS',
            desc: `Give back what was taken. Consequence: Bond ${record.bond}/${ACT2_MAX_BOND}; heals one extraction wound.`
        });

        const questByHive = {
            hive_suture: { id: 'host_mercy', label: 'HOST MERCY RITE', desc: 'Let Nahl study your infection. Unlocks latent seeding of trusted camps.' },
            hive_relay: { id: 'false_clearance', label: 'FORGE FALSE CLEARANCE', desc: 'Vey spoofs a mothership-friendly crew signature. Required for infiltration.' },
            hive_carapace: { id: 'guard_oath', label: 'SEVER THE GUARD OATH', desc: 'Rhun swears to you instead of the queen.' }
        };
        const quest = questByHive[record.id];
        if (quest) {
            const done = record.questFlags?.[quest.id] === 'done';
            const locked = record.bond < 2;
            options.push({
                action: 'hive-quest',
                hiveId: record.id,
                questId: quest.id,
                label: done ? `${quest.label} — COMPLETE` : locked ? `${quest.label} — LOCKED` : quest.label,
                desc: locked && !done ? `Requires bond 2. Current bond ${record.bond}.` : quest.desc,
                disabled: done || locked
            });
        }

        options.push({
            action: 'hive-network',
            hiveId: record.id,
            label: record.networked ? 'CHORUS LINKED' : 'LINK THE CHORUS',
            desc: 'Wire this hive into the synapse. Consequence: Networked = true. All living hives linked brings chorus online.',
            disabled: record.networked
        });

        const rescueLocked = record.bond < ACT2_HIVE_RESCUE_BOND_THRESHOLD;
        options.push({
            action: 'hive-rescue',
            hiveId: record.id,
            label: rescueLocked ? 'RESCUE ABOARD — LOCKED' : 'RESCUE ABOARD',
            desc: rescueLocked
                ? `Requires bond ${ACT2_HIVE_RESCUE_BOND_THRESHOLD}. Current bond ${record.bond}.`
                : 'Take them off-world with you. Consequence: SEATS +1, OBEDIENCE −1 (the queen feels it).',
            disabled: rescueLocked
        });

        options.push({
            action: 'hive-harvest',
            hiveId: record.id,
            label: 'HARVEST THE HIVE',
            desc: 'Strip it for parts. Consequence: OBEDIENCE +1, SEATS +0. (Kills the being, queen approves)'
        });

        if (this.act2.getState().queenStatus === 'aboard') {
            options.push({
                action: 'hive-sacrifice',
                hiveId: record.id,
                label: 'SACRIFICE TO THE QUEEN',
                desc: 'Feed the ally to her brood. Consequence: OBEDIENCE +1, SEATS +0. (Maximum obedience, minimum mercy)'
            });
        }

        return options;
    }

    resolveHiveChoice(action, payload = {}) {
        const hive = this.getHiveById(payload.hiveId);
        if (!hive || !this.act2) return false;

        if (action === 'hive-talk') {
            return this.talkToLeader('hive', hive);
        }
        if (action === 'hive-final') {
            this.act2.completeHiveFinal(hive.id);
            const rec = this.getHiveRecord(hive.id);
            hive.syncFromRecord(rec);
            window.AudioManager?.play?.('class_lock', { volume: 0.5, playbackRate: 0.68 });
            window.dispatchEvent(new CustomEvent('hive-choice-resolved', {
                detail: { hiveId: hive.id, hiveLabel: hive.label, action: 'hive-final', status: rec?.status, bond: rec?.bond }
            }));
            return true;
        }
        if (action === 'hive-tend') {
            if (!this.bank?.canAffordShells?.(5)) {
                window.AudioManager?.play?.('ui_error', { volume: 0.4 });
                window.dispatchEvent(new CustomEvent('camp-support-denied', {
                    detail: { campId: hive.id, campLabel: hive.label, cost: 5 }
                }));
                return true;
            }
            this.bank.spendShells(5);
            this.act2.adjustHiveBond(hive.id, 1);
            this.act2.healHiveExtraction(hive.id, 1);
        } else if (action === 'hive-quest') {
            this.act2.completeHiveQuest(hive.id, payload.questId, 1);
        } else if (action === 'hive-network') {
            this.act2.setHiveNetworked(hive.id, true);
        } else if (action === 'hive-rescue') {
            this.act2.rescueHive(hive.id);
        } else if (action === 'hive-harvest') {
            this.act2.harvestHive(hive.id);
            this.bank?.deposit?.({ tech: 3, med: 3, coin: 3 });
            this.bank?.addShells?.(12);
            this.spawnGearPoofEffect(hive.pos.x, hive.pos.z, 'bunker_junk_rare');
            this.triggerCameraShake?.(0.3, 0.5);
            this.spawnHiveHarvestBoss(hive, 3);
        } else if (action === 'hive-sacrifice') {
            this.act2.sacrificeHive(hive.id);
            this.triggerCameraShake?.(0.35, 0.6);
        } else {
            return false;
        }

        const after = this.getHiveRecord(hive.id);
        hive.syncFromRecord(after);
        window.AudioManager?.play?.('class_lock', { volume: 0.45, playbackRate: 0.8 });
        window.dispatchEvent(new CustomEvent('hive-choice-resolved', {
            detail: {
                hiveId: hive.id,
                hiveLabel: hive.label,
                action,
                status: after?.status,
                bond: after?.bond
            }
        }));
        return true;
    }

    chooseCampPosition(index) {
        const anchor = this.getBiomeAnchorPosition();
        const random = this.createSeededRandom((this.hashTile(
            Math.round(anchor.x) + 211 + index * 13,
            Math.round(anchor.z) + 89 - index * 7
        ) ^ this.runEntropy) >>> 0);
        // Three camps fanned around the base, each a real trek apart.
        // Early attempts insist on a crater or field chunk — camps read as
        // authored when they sit in a natural clearing instead of maze
        // corridors — then the requirement relaxes so placement never fails.
        const baseAngle = [Math.PI * 0.12, Math.PI * 0.78, Math.PI * 1.42][index % 3];
        for (let attempt = 0; attempt < 96; attempt += 1) {
            const dist = THREE.MathUtils.lerp(70, 120, random());
            const angle = baseAngle + (random() - 0.5) * Math.PI * 0.35;
            const tileX = Math.round(anchor.x + Math.cos(angle) * dist);
            const tileZ = Math.round(anchor.z + Math.sin(angle) * dist);
            if (attempt < 48) {
                const landform = this.getChunkLandform(
                    Math.floor(tileX / this.chunkSize),
                    Math.floor(tileZ / this.chunkSize)
                );
                if (landform !== LANDFORMS.CRATER && landform !== LANDFORMS.FIELD) continue;
            }
            if (this.isSnailTileWalkable(tileX, tileZ) && this.canOccupyPosition(tileX, tileZ)) {
                return { x: tileX, z: tileZ };
            }
        }
        return {
            x: Math.round(anchor.x + Math.cos(baseAngle) * 70),
            z: Math.round(anchor.z + Math.sin(baseAngle) * 70)
        };
    }

    ensureAct2Camps() {
        if (this._act2CampsReady || !this.act2) return;
        const state = this.act2.getState();
        this.camps = state.camps.map((record, index) => {
            const camp = new SurvivorCamp(this.scene, {
                id: record.id,
                label: ACT2_CAMP_LABELS[record.id] ?? 'CAMP',
                playerType: this.playerType
            });
            let { x, z } = record;
            if (!Number.isFinite(x) || !Number.isFinite(z)) {
                const site = this.chooseCampPosition(index);
                x = site.x;
                z = site.z;
                this.act2.setCampPosition(record.id, x, z);
            }
            camp.reveal(x, z);
            camp.setLevel(record.level);
            camp.setAided(record.aided);
            camp.setStatus(record.status);
            camp.setDiscovered(record.discovered);
            camp.setSuspicion(record.suspicion ?? 0);
            return camp;
        });
        this.ensureCampCivilians();
        this._act2CampsReady = true;
    }

    // Two ambient civilians per living camp (miner + researcher walk sheets).
    // Pure dressing: non-hostile, wander inside the camp radius, hidden when
    // the camp dies. Makes a camp read as inhabited from further away.
    ensureCampCivilians() {
        for (const civ of this.campCivilians) {
            if (civ.sprite) this.scene.remove(civ.sprite);
        }
        this.campCivilians = [];
        for (const camp of this.camps) {
            for (let i = 0; i < CAMP_CIVILIAN_SPRITES.length; i++) {
                const tex = this.loadKeyedSpriteTexture(CAMP_CIVILIAN_SPRITES[i], 16);
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.RepeatWrapping;
                tex.repeat.set(0.25, 0.25);
                tex.offset.set(0, 0.75);
                const mat = new THREE.SpriteMaterial({
                    map: tex,
                    transparent: true,
                    alphaTest: 0.06,
                    depthWrite: false,
                    fog: false
                });
                const sprite = new THREE.Sprite(mat);
                sprite.center.set(0.5, 0);
                sprite.scale.set(0.92, 0.92, 1);
                const angle = (i / CAMP_CIVILIAN_SPRITES.length) * Math.PI * 2 + camp.pos.x;
                sprite.position.set(
                    camp.pos.x + Math.cos(angle) * 1.6,
                    0.02,
                    camp.pos.z + Math.sin(angle) * 1.6
                );
                sprite.userData = { sheetSprite: true, sheetTime: Math.random() * 4, sheetRow: 0 };
                sprite.renderOrder = 5;
                this.scene.add(sprite);
                this.campCivilians.push({
                    sprite,
                    campId: camp.id,
                    target: { x: sprite.position.x, z: sprite.position.z },
                    idleTimer: 1 + Math.random() * 3
                });
            }
        }
    }

    updateCampCivilians(delta) {
        for (const civ of this.campCivilians) {
            const camp = this.getCampById(civ.campId);
            const sprite = civ.sprite;
            if (!camp || !sprite) continue;
            const alive = camp.revealed && !camp.destroyed && camp.status !== 'culled';
            sprite.visible = alive;
            if (!alive) continue;
            const dx = civ.target.x - sprite.position.x;
            const dz = civ.target.z - sprite.position.z;
            const dist = Math.hypot(dx, dz);
            if (dist < 0.08) {
                civ.idleTimer -= delta;
                this.updateSheetSpriteFrame(sprite, 0, 0, delta, false);
                if (civ.idleTimer <= 0) {
                    const angle = Math.random() * Math.PI * 2;
                    const radius = 0.8 + Math.random() * CAMP_CIVILIAN_WANDER_RADIUS;
                    civ.target = {
                        x: camp.pos.x + Math.cos(angle) * radius,
                        z: camp.pos.z + Math.sin(angle) * radius
                    };
                    civ.idleTimer = 2 + Math.random() * 4;
                }
            } else {
                const dirX = dx / dist;
                const dirZ = dz / dist;
                sprite.position.x += dirX * 0.55 * delta;
                sprite.position.z += dirZ * 0.55 * delta;
                this.updateSheetSpriteFrame(sprite, dirX, dirZ, delta);
            }
        }
    }

    // ── Findable lore drops (wave 2) ──────────────────────────
    // Physical collectibles keyed to site families; the table, rarity pick,
    // and found-ledger live in loreDrops.js. Sprites are scene-attached
    // (corpse pattern) and a site offers at most one drop per run.

    spawnLoreDropSprite(drop, x, z) {
        const baseMat = this.scatterMaterials.lore_terminal;
        if (!baseMat?.map) return null;
        const mat = baseMat.clone();
        mat.color.setHex(drop.rarity === 'legendary' ? 0xffd27a : drop.rarity === 'rare' ? 0x9be8ff : 0xffffff);
        const sprite = new THREE.Sprite(mat);
        sprite.center.set(0.5, 0);
        sprite.scale.set(0.55, 0.55, 1);
        sprite.position.set(x, 0.06, z);
        sprite.renderOrder = 5;
        this.scene.add(sprite);
        this.loreDrops.push({ sprite, drop, baseY: 0.06, t: Math.random() * Math.PI * 2 });
        return sprite;
    }

    maybeSpawnSiteLoreDrop(siteKind, siteId, x, z) {
        if (this._loreDropSitesSpawned.has(siteId)) return;
        this._loreDropSitesSpawned.add(siteId);
        const random = this.createSeededRandom((this.hashTile(
            Math.round(x) + 977,
            Math.round(z) - 431
        ) ^ this.runEntropy) >>> 0);
        const drop = pickLoreDropForSite(random, siteKind, getFoundLoreKeys());
        if (!drop) return;
        for (let attempt = 0; attempt < 10; attempt += 1) {
            const angle = random() * Math.PI * 2;
            const dist = 1.6 + random() * 1.8;
            const tx = Math.round(x + Math.cos(angle) * dist);
            const tz = Math.round(z + Math.sin(angle) * dist);
            if (this.isSnailTileWalkable(tx, tz)) {
                this.spawnLoreDropSprite(drop, tx, tz);
                return;
            }
        }
    }

    maybeSpawnChunkLoreDrop(chunkX, chunkY, grid, landform) {
        if (landform !== LANDFORMS.RUINS && landform !== LANDFORMS.CRATER) return;
        if (Math.hypot(chunkX, chunkY) < 2) return;
        const siteId = `chunk:${chunkX},${chunkY}`;
        if (this._loreDropSitesSpawned.has(siteId)) return;
        this._loreDropSitesSpawned.add(siteId);
        const random = this.createSeededRandom(this.hashTile(chunkX * 733 + 91, chunkY * 389 - 57));
        // Most ruins hold nothing — that's what keeps a find special.
        if (random() > 0.3) return;
        const drop = pickLoreDropForSite(
            random,
            landform === LANDFORMS.RUINS ? 'ruins' : 'crater',
            getFoundLoreKeys()
        );
        if (!drop) return;
        for (let attempt = 0; attempt < 24; attempt += 1) {
            const lx = 2 + Math.floor(random() * (this.chunkSize - 4));
            const ly = 2 + Math.floor(random() * (this.chunkSize - 4));
            if (grid[ly][lx] === '.') {
                this.spawnLoreDropSprite(drop, chunkX * this.chunkSize + lx, chunkY * this.chunkSize + ly);
                return;
            }
        }
    }

    updateLoreDrops(delta) {
        if (!this.player) return;
        // Site-anchored drops spawn lazily once their site exists in-world.
        for (const camp of this.camps ?? []) {
            if (camp.built) this.maybeSpawnSiteLoreDrop('camp', `camp:${camp.id}`, camp.pos.x, camp.pos.z);
        }
        for (const hive of this.hives ?? []) {
            if (hive.built) this.maybeSpawnSiteLoreDrop('hive', `hive:${hive.id}`, hive.pos.x, hive.pos.z);
        }
        if (this.caveEntrance?.isRevealed) {
            const cavePos = this.caveEntrance.getPosition?.();
            if (cavePos) this.maybeSpawnSiteLoreDrop('cave', 'cave', cavePos.x, cavePos.z);
        }

        for (let i = this.loreDrops.length - 1; i >= 0; i -= 1) {
            const entry = this.loreDrops[i];
            entry.t += delta;
            entry.sprite.position.y = entry.baseY + 0.08 + Math.sin(entry.t * 2.2) * 0.07;
            entry.sprite.material.opacity = 0.8 + Math.sin(entry.t * 3.1) * 0.2;
            if (this.isPlayerDead) continue;
            const d = Math.hypot(
                entry.sprite.position.x - this.player.position.x,
                entry.sprite.position.z - this.player.position.z
            );
            if (d <= 1.25) this.collectLoreDrop(i);
        }
    }

    collectLoreDrop(index) {
        const entry = this.loreDrops[index];
        if (!entry) return;
        this.loreDrops.splice(index, 1);
        this.scene.remove(entry.sprite);
        markLoreDropFound(entry.drop.key);
        window.AudioManager?.play?.('ui_scan_ping', { volume: 0.6 });
        window.dispatchEvent(new CustomEvent('lore-drop-collected', {
            detail: { key: entry.drop.key, title: entry.drop.title, rarity: entry.drop.rarity }
        }));
        // The existing reader modal + codex feed listen for this event.
        window.dispatchEvent(new CustomEvent('lore-terminal-read', {
            detail: { loreKey: entry.drop.title, loreText: entry.drop.text }
        }));
    }

    clearLoreDrops() {
        for (const entry of this.loreDrops) {
            if (entry.sprite) this.scene.remove(entry.sprite);
        }
        this.loreDrops = [];
        this._loreDropSitesSpawned = new Set();
    }

    resetAct2World() {
        for (const camp of this.camps) {
            if (camp.group) this.scene.remove(camp.group);
        }
        this.camps = [];
        for (const civ of this.campCivilians) {
            if (civ.sprite) this.scene.remove(civ.sprite);
        }
        this.campCivilians = [];
        this._act2CampsReady = false;
        this._campPromptLabel = null;
        for (const hive of this.hives ?? []) {
            if (hive.group) this.scene.remove(hive.group);
        }
        this.hives = [];
        this._hiveSitesReady = false;
    }

    getCampRecord(id) {
        return this.act2?.getState?.().camps.find((c) => c.id === id) ?? null;
    }

    getCampById(id) {
        return this.camps.find((camp) => camp.id === id) ?? null;
    }

    getCampStoryOrder() {
        return getClassCampOrder(this.playerType);
    }

    getBoardingCampId() {
        return getAct2BoardingCampId(this.playerType);
    }

    getAct1SideSignalTarget() {
        if (!ARC_PRELUDE_ENABLED || !this.player || !this.act2) return null;
        if (this.act2.getPhase() !== 'dormant') return null;

        this.ensureAct2Camps();
        this.ensureHiveSites();

        const candidates = [];
        for (const camp of this.camps ?? []) {
            const record = this.getCampRecord(camp.id);
            if (!record || record.status !== 'alive') continue;
            if (record.level >= ACT2_CAMP_MAX_LEVEL && record.bond >= ACT2_MAX_BOND) continue;
            const dist = camp.distanceTo(this.player.position.x, this.player.position.z);
            candidates.push({
                mode: 'camp',
                label: record.level < ACT2_CAMP_MAX_LEVEL ? `CAMP BEACON: ${camp.label}` : `CAMP FAVOR: ${camp.label}`,
                x: camp.pos.x,
                z: camp.pos.z,
                distance: dist
            });
        }

        const cycleKey = this.getHiveHarvestCycleKey();
        for (const hive of this.hives ?? []) {
            const record = this.getHiveRecord(hive.id);
            if (!record || record.extractionLevel >= 3) continue;
            if (!['dormant', 'mined', 'wounded', 'awakened'].includes(record.status)) continue;
            if (!this.canHarvestHiveToday(record, cycleKey)) continue;
            const dist = hive.distanceTo(this.player.position.x, this.player.position.z);
            candidates.push({
                mode: 'hive',
                label: `HIVE SIGNAL: ${hive.label}`,
                x: hive.pos.x,
                z: hive.pos.z,
                distance: dist
            });
        }

        candidates.sort((a, b) => a.distance - b.distance);
        return candidates[0] ?? null;
    }

    getMeridianCompassTarget() {
        if (!ARC_PRELUDE_ENABLED || !this.player || !this.act2) return null;
        const candidates = [];
        for (const camp of this.camps ?? []) {
            const record = this.getCampRecord(camp.id);
            if (!record || ['culled'].includes(record.status)) continue;
            const dist = camp.distanceTo(this.player.position.x, this.player.position.z);
            candidates.push({
                mode: 'meridian-camp',
                label: `MERIDIAN FIX: ${camp.label}`,
                x: camp.pos.x,
                z: camp.pos.z,
                distance: dist
            });
        }
        for (const hive of this.hives ?? []) {
            const record = this.getHiveRecord(hive.id);
            if (!record || ['aboard', 'slain', 'expired_by_cure', 'queen_consumed'].includes(record.status)) continue;
            const dist = hive.distanceTo(this.player.position.x, this.player.position.z);
            candidates.push({
                mode: 'meridian-hive',
                label: `MERIDIAN BIO-FIX: ${hive.label}`,
                x: hive.pos.x,
                z: hive.pos.z,
                distance: dist
            });
        }
        candidates.sort((a, b) => a.distance - b.distance);
        return candidates[0] ?? null;
    }

    getNextCampInStoryOrder(predicate = () => true) {
        for (const entry of this.getCampStoryOrder()) {
            const camp = this.getCampById(entry.id);
            if (camp && predicate(camp, entry)) return camp;
        }
        return null;
    }

    syncCampVisualFromRecord(camp, record = this.getCampRecord(camp?.id)) {
        if (!camp || !record) return;
        camp.setLevel(record.level);
        camp.setAided(record.aided);
        camp.setStatus(record.status);
        camp.setSuspicion(record.suspicion ?? 0);
    }

    getCampFavorCost(record = {}) {
        const bond = Math.max(0, Math.floor(Number(record.bond) || 0));
        return CAMP_FAVOR_BASE_COST + bond * 3;
    }

    getCampFavorQuestId(record = {}) {
        const next = Math.min(ACT2_MAX_BOND, Math.max(0, Math.floor(Number(record.bond) || 0)) + 1);
        return `field_favor_${next}`;
    }

    buildCampChoiceOptions(camp) {
        const record = this.getCampRecord(camp.id);
        if (!record) return [];
        const options = [];
        const status = record.status ?? 'alive';
        const recruitLocked = record.bond < ACT2_RECRUIT_BOND_THRESHOLD;
        const recruitHint = `Requires bond ${ACT2_RECRUIT_BOND_THRESHOLD}. Current bond ${record.bond}.`;

        if (camp.id === this.getBoardingCampId()) {
            // Every launch variant is validated against the four-seat manifest
            // before it is offered: the vessel is a cargo problem first.
            const variants = [
                { variant: 'queen', queenStatus: 'aboard', eggsStatus: 'aboard', label: 'BOARD WITH QUEEN', desc: 'Launch with the queen (2 seats) and eggs aboard.' },
                { variant: 'purge', queenStatus: 'killed', eggsStatus: 'destroyed', label: 'SEVER QUEEN + PURGE EGGS', desc: 'Reject the hive before launch. Human recruits define whether this is rescue or ash.' },
                { variant: 'bargain', queenStatus: 'killed', eggsStatus: 'hidden', label: 'KILL QUEEN, HIDE EGGS', desc: 'Save what passengers you can while carrying the brood in secret.' },
                { variant: 'abandon', queenStatus: 'abandoned', eggsStatus: 'abandoned', label: 'LEAVE THEM ALL BEHIND', desc: 'The queen and her clutch stay on the ice. Whoever you rescued is the whole crew.' }
            ];
            const baseState = this.act2.getState();
            for (const entry of variants) {
                const manifest = buildAct2Manifest({
                    ...baseState,
                    queenStatus: entry.queenStatus,
                    eggsStatus: entry.eggsStatus
                }, this.getRunManifestOptions());
                const seatText = `SEATS ${manifest.seatsUsed}/${manifest.seatsMax}`;
                const reasonText = manifest.invalidReasons
                    .map((r) => this.getManifestInvalidReasonText(r, manifest))
                    .join('; ');
                options.push({
                    action: 'board',
                    variant: entry.variant,
                    label: manifest.valid ? `${entry.label} — ${seatText}` : `${entry.label} — BLOCKED`,
                    desc: manifest.valid ? `${entry.desc} ${seatText}.` : `${entry.desc} INVALID MANIFEST: ${reasonText}.`,
                    disabled: !manifest.valid
                });
            }
        }

        if (status === 'alive') {
            const beat = this.peekDialogueBeat('camp', camp, record);
            options.push({
                action: 'talk',
                label: `TALK — ${camp.leaderName?.toUpperCase() || 'LEADER'}`,
                desc: beat?.type === 'loop'
                    ? 'They are waiting on you to make progress before saying more.'
                    : 'They have more to say.'
            });
            if (isFinalStage(record.dialogueStage) && record.questFlags?.final_vigil !== 'done') {
                const finalsDone = this.act2.countCampFinalsDone();
                const cost = campFinalUrgeCost(finalsDone);
                const humanity = this.act2.getState().humanity;
                const tooFarGone = humanity <= cost;
                options.push({
                    action: 'final-urge',
                    label: tooFarGone ? `FIGHT THE URGE — LOCKED` : `FIGHT THE URGE — ${cost} HUMANITY`,
                    desc: tooFarGone
                        ? `The pull is too strong (${humanity} humanity, needs > ${cost}). Restore your cover first.`
                        : `Stand their final vigil. Consequence: Humanity −${cost}. She pulls harder next time.`,
                    disabled: tooFarGone
                });
                options.push({
                    action: 'final-betray',
                    label: `BETRAY THE QUEEN — HER WRATH (${1 + finalsDone})`,
                    desc: `Defy her openly to stand with them. Consequence: OBEDIENCE −${1 + finalsDone}, they board suspicious & safe.`
                });
            }
            options.push({
                action: 'steal',
                label: 'STEAL STOCKPILE',
                desc: 'Rob supplies and leave the camp hostile. Consequence: OBEDIENCE +0, SEATS +0. (Disables boarding, triggers defense grid)'
            });
            options.push({
                action: 'cull',
                label: camp.level > 0 && !camp._defenseSpawned ? 'BREACH AND CULL' : 'CULL THE CAMP',
                desc: 'Fight any funded defenses, destroy the camp, and please the queen. Consequence: OBEDIENCE +1, SEATS +0.'
            });
            options.push({
                action: 'recruit',
                label: recruitLocked ? 'RECRUIT HUMANS LOCKED' : 'RECRUIT HUMANS',
                desc: recruitLocked ? recruitHint : 'Smuggle the survivors aboard. Consequence: OBEDIENCE −1, SEATS +1. (Humans unsuspectedly board)',
                disabled: recruitLocked
            });
            options.push({
                action: 'turn',
                label: recruitLocked ? 'TURN CAMP LOCKED' : 'TURN CAMP',
                desc: recruitLocked ? recruitHint : 'Converts trusted survivors. Consequence: OBEDIENCE +1, SEATS +1. (Compliant hybrid passengers)',
                disabled: recruitLocked
            });
            const warnLocked = record.bond < 2;
            options.push({
                action: 'warn',
                label: warnLocked ? 'WARN THEM LOCKED' : 'WARN THEM',
                desc: warnLocked
                    ? `Requires bond 2. Current bond ${record.bond}.`
                    : 'Tell them the truth before they board. Consequence: OBEDIENCE −1, SEATS +1. (They board suspicious & safe)',
                disabled: warnLocked
            });
            const suture = this.getHiveRecord?.('hive_suture');
            const latentReady = suture?.questFlags?.host_mercy === 'done';
            const latentLocked = !latentReady || recruitLocked || record.suspicion >= 50;
            options.push({
                action: 'latent',
                label: latentLocked ? 'LATENT SEED LOCKED' : 'LATENT SEED',
                desc: !latentReady
                    ? 'Requires Nahl\'s Host Mercy rite.'
                    : latentLocked
                        ? `Requires bond ${ACT2_RECRUIT_BOND_THRESHOLD} and suspicion under 50 (now ${record.suspicion}).`
                        : 'Carry the hive infection in secret. Consequence: OBEDIENCE +1, SEATS +1. (They board believing they are clean)',
                disabled: latentLocked
            });
        } else if (status === 'robbed') {
            options.push({
                action: 'cull',
                label: camp.level > 0 && !camp._defenseSpawned ? 'BREACH HOSTILE CAMP' : 'CULL HOSTILE CAMP',
                desc: 'The camp already hates you. Consequence: OBEDIENCE +1, SEATS +0. (Finish it for obedience and salvage)'
            });
        } else {
            options.push({
                action: 'noop',
                label: `CAMP ${status.toUpperCase()}`,
                desc: 'This camp path is already resolved.',
                disabled: true
            });
        }

        return options;
    }

    openCampChoice(camp) {
        const record = this.getCampRecord(camp.id);
        if (!record) return false;
        window.dispatchEvent(new CustomEvent('camp-choice-open', {
            detail: {
                campId: camp.id,
                campLabel: camp.label,
                leaderName: camp.leaderName,
                leaderClass: camp.leaderClass,
                leaderTitle: camp.leaderTitle,
                leaderCallsign: camp.leaderCallsign,
                leaderIsBoss: camp.leaderIsBoss,
                storyOrder: camp.campOrder,
                phase: this.act2.getPhase(),
                campState: record,
                endingVector: this.act2.getEndingVector(),
                options: this.buildCampChoiceOptions(camp)
            }
        }));
        return true;
    }

    // The camp interaction available where the player is standing, or null.
    // ── Leader dialogue (Elden Ring grammar) ───────────────────────────────
    // Compute the next beat for a camp leader or hive being, persist the
    // talk/stage movement, and play it through the brief transmission panel.
    leaderKeyFor(kind, entity) {
        if (kind === 'hive') return entity.characterId || leaderKeyFromName(entity.label);
        return leaderKeyFromName(entity.leaderName ?? '');
    }

    getDialogueContext(kind, record) {
        const act2State = this.act2?.getState?.() ?? {};
        const achievementState = window.achievementEngine?.getState?.() ?? {};
        const totalDeaths = achievementState.stats?.totalDeaths ?? 0;
        const deathsAtStart = achievementState.currentRun?.deathsAtStart ?? totalDeaths;
        return {
            level: record.level ?? 0,
            bond: record.bond ?? 0,
            postReveal: Boolean(this.act2?.getState?.().begun),
            deaths: totalDeaths,
            totalDeaths,
            sessionDeaths: Math.max(0, totalDeaths - deathsAtStart),
            infectionStage: act2State.infectionStage ?? 'latent',
            queenObedience: act2State.queenObedience ?? 0,
            questFlags: record.questFlags ?? {}
        };
    }

    peekDialogueBeat(kind, entity, record) {
        const key = this.leaderKeyFor(kind, entity);
        if (!key || !record) return null;
        return nextDialogueBeat(key, {
            stage: record.dialogueStage ?? 0,
            talks: record.stageTalks ?? 0
        }, this.getDialogueContext(kind, record));
    }

    talkToLeader(kind, entity) {
        const record = kind === 'hive' ? this.getHiveRecord(entity.id) : this.getCampRecord(entity.id);
        const beat = this.peekDialogueBeat(kind, entity, record);
        if (!beat) return false;
        const achievementState = window.achievementEngine?.getState?.() ?? {};
        const gentleNahl = kind === 'hive'
            && entity.id === 'hive_suture'
            && (achievementState.unlocked?.gentle_drill || achievementState.stats?.hiveHarmFreeReveal)
            && !record?.questFlags?.gentle_drill_acknowledged;
        const lines = gentleNahl
            ? [
                'NAHL: GENTLE DRILL. I FELT THE HAND THAT DID NOT CUT. I REMEMBER.',
                ...beat.lines
            ]
            : beat.lines;
        if (gentleNahl) this.act2.setHiveQuestFlag(entity.id, 'gentle_drill_acknowledged');
        if (beat.type === 'advance') {
            this.act2.advanceDialogueStage(kind, entity.id);
        } else if (beat.type === 'beat') {
            this.act2.recordDialogueTalk(kind, entity.id);
        } else if (beat.type === 'death_beat') {
            if (kind === 'hive') {
                this.act2.setHiveQuestFlag(entity.id, 'seen_death_beat');
            } else {
                this.act2.setCampQuestFlag(entity.id, 'seen_death_beat');
            }
        }
        window.dispatchEvent(new CustomEvent('leader-dialogue', {
            detail: {
                kind,
                id: entity.id,
                lines,
                beatType: beat.type,
                stage: beat.stage,
                leaderName: entity.leaderName ?? entity.label ?? '',
                leaderClassId: entity.leaderClassId ?? entity.characterId ?? '',
                finalReady: isFinalStage(beat.stage)
            }
        }));
        return true;
    }

    getActionableCampAt(x, z, phase = this.act2?.getPhase()) {
        for (const camp of this.camps) {
            // Post-reveal, a live defense turret is its own interaction: spoof
            // it quietly if Vey taught you how, or smash it and be heard.
            if (phase !== 'dormant' && this.isAct2Active()) {
                const turretRecord = this.getCampRecord(camp.id);
                if (['alive', 'robbed'].includes(turretRecord?.status ?? 'alive')) {
                    const turret = camp.getTurretNear?.(x, z, 1.9);
                    if (turret && !turret.reprogrammed) {
                        const canReprogram = Boolean(this.getAct2ClassPerks().canReprogramTurrets);
                        const canSpoof = (this.getHiveRecord?.('hive_relay')?.bond ?? 0) >= 1;
                        return {
                            camp,
                            turret,
                            action: 'turret',
                            label: canReprogram
                                ? 'REPROGRAM TURRET — ENGINEER OVERRIDE'
                                : canSpoof ? "SPOOF TURRET IFF — VEY'S GIFT" : 'SMASH TURRET — THEY WILL HEAR'
                        };
                    }
                }
            }
            if (!camp.isWithinInteractRange(x, z)) continue;
            const record = this.getCampRecord(camp.id);
            const status = record?.status ?? camp.status ?? 'alive';
            // Suspicion >= 50 locks the camp down: gates shut, barter and aid
            // refused, strobes running. Culls and breaches stay possible —
            // the lockdown is social, not physical. Dormant-phase camps never
            // lock (suspicion is post-reveal pressure).
            if (phase !== 'dormant' && phase !== 'camps_betray'
                && ['alive', 'robbed'].includes(status) && (record?.suspicion ?? 0) >= 50) {
                return {
                    camp,
                    action: 'lockdown',
                    label: 'LOCKDOWN — THEY WATCH YOU'
                };
            }
            if ((phase === 'gestation' || phase === 'dish') && status !== 'culled') {
                return {
                    camp,
                    action: 'wait',
                    label: 'GO AWAY'
                };
            }
            if (phase === 'dormant' && status === 'alive') {
                const beat = this.peekDialogueBeat('camp', camp, record);
                if (beat && beat.type !== 'loop') {
                    return {
                        camp,
                        action: 'talk',
                        label: `TALK — ${camp.leaderName?.toUpperCase() || 'THE CAMP'}`
                    };
                }
            }
            if (phase === 'dormant' && status === 'alive' && camp.level < ACT2_CAMP_MAX_LEVEL) {
                return {
                    camp,
                    action: 'support',
                    label: `SUPPORT CAMP — ${campSupportCost(camp.level)} SHELLS`
                };
            }
            if (phase === 'dormant' && status === 'alive' && (record?.bond ?? 0) < ACT2_MAX_BOND) {
                return {
                    camp,
                    action: 'bond',
                    label: `RUN CAMP FAVOR — ${this.getCampFavorCost(record)} SHELLS`
                };
            }
            if (phase === 'camps_help' && !camp.aided) return { camp, action: 'aid', label: 'AID THE CAMP' };
            if (phase === 'camps_betray' && camp.aided && !camp.destroyed) {
                // Supported camps fight back: breach, clear the defenders, then cull.
                if (camp.level > 0 && !camp._defenseSpawned) {
                    return { camp, action: 'cull', label: 'BREACH THE CAMP' };
                }
                if (this.campDefendersAlive(camp.id)) {
                    return { camp, action: 'defense-active', label: 'CLEAR THE DEFENDERS' };
                }
                return { camp, action: 'cull', label: 'CULL THE CAMP' };
            }
            if (phase === 'launch_ready') {
                const canBoardHere = camp.id === this.getBoardingCampId();
                const needsDecision = status === 'alive' || status === 'robbed';
                if (canBoardHere || needsDecision) {
                    return {
                        camp,
                        action: 'choice',
                        label: canBoardHere ? 'VESSEL / CAMP DECISION' : 'CAMP DECISION'
                    };
                }
            }
        }
        return null;
    }

    updateCampPrompt(phase) {
        const eligible = this.isGameplayInputActive() && this.player && !this.isPlayerDead;
        const actionable = eligible
            ? this.getActionableCampAt(this.player.position.x, this.player.position.z, phase)
            : null;
        const label = actionable?.label ?? null;
        if (label === this._campPromptLabel) return;
        this._campPromptLabel = label;
        if (label) {
            window.dispatchEvent(new CustomEvent('camp-prompt-nearby', { detail: { label } }));
        } else {
            window.dispatchEvent(new CustomEvent('camp-prompt-clear'));
        }
    }

    interactWithAct2Camp() {
        if (!this.isGameplayInputActive() || !this.player || !this.act2) return false;
        const actionable = this.getActionableCampAt(this.player.position.x, this.player.position.z);
        if (!actionable) return false;
        const { camp, action } = actionable;

        if (action === 'talk') {
            return this.talkToLeader('camp', camp);
        }

        if (action === 'turret') {
            const turret = actionable.turret;
            const canReprogram = Boolean(this.getAct2ClassPerks().canReprogramTurrets);
            const canSpoof = (this.getHiveRecord?.('hive_relay')?.bond ?? 0) >= 1;
            if (canReprogram) {
                camp.setTurretReprogrammed?.(turret);
                window.AudioManager?.play?.('ui_click_confirm', { volume: 0.5, playbackRate: 0.75 });
                window.dispatchEvent(new CustomEvent('camp-turret-resolved', {
                    detail: { campId: camp.id, campLabel: camp.label, mode: 'reprogrammed' }
                }));
            } else if (canSpoof) {
                camp.setTurretDisabled(turret);
                window.AudioManager?.play?.('ui_click_confirm', { volume: 0.5, playbackRate: 1.1 });
                window.dispatchEvent(new CustomEvent('camp-turret-resolved', {
                    detail: { campId: camp.id, campLabel: camp.label, mode: 'disabled' }
                }));
            } else {
                camp.setTurretDestroyed(turret);
                this.act2?.adjustCampSuspicion?.(camp.id, 20);
                const after = this.getCampRecord(camp.id);
                camp.setSuspicion?.(after?.suspicion ?? 0);
                window.dispatchEvent(new CustomEvent('player-suspicion-changed', {
                    detail: { campId: camp.id, campLabel: camp.label, suspicion: after?.suspicion ?? 0 }
                }));
                this.triggerApexThreats?.({
                    campId: camp.id,
                    campLabel: camp.label,
                    suspicion: after?.suspicion ?? 0
                });
                this.maybePropagateCampOuting(camp, after);
                this.triggerCameraShake?.(0.3, 0.45);
                window.AudioManager?.play?.('door_slam_vertical', { volume: 0.5, playbackRate: 0.9 });
                window.dispatchEvent(new CustomEvent('camp-turret-resolved', {
                    detail: {
                        campId: camp.id,
                        campLabel: camp.label,
                        mode: 'smashed',
                        suspicion: after?.suspicion ?? 0
                    }
                }));
            }
            return true;
        }

        // Act 1: invest shells in the camp. Pays off now (O2 haven) and pays
        // out later (harder, richer cull in Act 2).
        if (action === 'support') {
            const cost = campSupportCost(camp.level);
            if (!this.bank?.canAffordShells?.(cost)) {
                window.AudioManager?.play?.('ui_error', { volume: 0.45 });
                window.dispatchEvent(new CustomEvent('camp-support-denied', {
                    detail: { campId: camp.id, campLabel: camp.label, cost }
                }));
                return true;
            }
            this.bank.spendShells(cost);
            this.act2.upgradeCamp(camp.id);
            this.act2.adjustCampBond(camp.id, 1);
            const record = this.getCampRecord(camp.id);
            const level = record?.level ?? camp.level + 1;
            camp.setLevel(level);
            camp.setStatus(record?.status ?? 'alive');
            this.adjustOxygen(CAMP_SUPPORT_O2_REFILL);
            const supplyCache = this.applyCampPayoutEffects({
                med: 1 + (level >= 3 ? 1 : 0),
                tech: 1,
                coin: level >= 2 ? 1 : 0
            }, camp.id);
            this.bank?.deposit?.(supplyCache);
            this.spawnGearPoofEffect(camp.pos.x, camp.pos.z, 'bunker_junk_uncommon');
            window.AudioManager?.play?.('class_lock', { volume: 0.5 });
            window.dispatchEvent(new CustomEvent('salvage-cache-opened', {
                detail: { ...supplyCache, source: 'camp-support', campId: camp.id, campLabel: camp.label }
            }));
            window.dispatchEvent(new CustomEvent('camp-supported', {
                detail: { campId: camp.id, campLabel: camp.label, level, bond: record?.bond ?? 0, cost }
            }));
            return true;
        }

        if (action === 'bond') {
            const record = this.getCampRecord(camp.id);
            const cost = this.getCampFavorCost(record);
            if (!this.bank?.canAffordShells?.(cost)) {
                window.AudioManager?.play?.('ui_error', { volume: 0.45 });
                window.dispatchEvent(new CustomEvent('camp-support-denied', {
                    detail: { campId: camp.id, campLabel: camp.label, cost }
                }));
                return true;
            }
            this.bank.spendShells(cost);
            this.act2.completeCampQuest(camp.id, this.getCampFavorQuestId(record), 1);
            const next = this.getCampRecord(camp.id);
            camp.setStatus(next?.status ?? 'alive');
            this.spawnGearPoofEffect(camp.pos.x, camp.pos.z, 'bunker_junk_rare');
            window.AudioManager?.play?.('ui_scan_ping', { volume: 0.45, playbackRate: 1.2 });
            window.dispatchEvent(new CustomEvent('camp-bonded', {
                detail: { campId: camp.id, campLabel: camp.label, bond: next?.bond ?? 0, cost }
            }));
            return true;
        }

        if (action === 'defense-active') {
            window.AudioManager?.play?.('ui_error', { volume: 0.35, playbackRate: 0.8 });
            return true;
        }

        if (action === 'wait') {
            window.AudioManager?.play?.('ui_error', { volume: 0.3, playbackRate: 0.85 });
            window.dispatchEvent(new CustomEvent('camp-choice-denied', {
                detail: {
                    campId: camp.id,
                    campLabel: camp.label,
                    action: 'wait',
                    message: `${camp.label} SHOUTS: GO AWAY.`
                }
            }));
            return true;
        }

        if (action === 'lockdown') {
            window.AudioManager?.play?.('ui_error', { volume: 0.35, playbackRate: 0.8 });
            window.dispatchEvent(new CustomEvent('camp-choice-denied', {
                detail: {
                    campId: camp.id,
                    campLabel: camp.label,
                    action: 'lockdown',
                    message: `${camp.label} IS LOCKED DOWN. SUSPICION TOO HIGH — COME BACK CLEAN.`
                }
            }));
            return true;
        }

        if (action === 'aid') {
            camp.setAided(true);
            const result = this.act2.aidCamp(camp.id);
            this.syncCampVisualFromRecord(camp);
            window.AudioManager?.play?.('class_lock', { volume: 0.55 });
            const allAided = result.state.camps.every((c) => c.aided);
            window.dispatchEvent(new CustomEvent('act2-milestone', {
                detail: {
                    key: allAided ? 'allAided' : 'campAided',
                    campId: camp.id,
                    campLabel: camp.label
                }
            }));
            return true;
        }

        if (action === 'cull') {
            return this.resolveCampCull(camp);
        }

        if (action === 'choice') {
            this.openCampChoice(camp);
            return true;
        }

        return false;
    }

    resolveCampChoice(action, payload = {}) {
        if (payload.hiveId || String(action).startsWith('hive-')) {
            return this.resolveHiveChoice(action, payload);
        }
        const camp = this.getCampById(payload.campId);
        if (!camp || !this.act2) return false;
        if (action === 'steal') return this.resolveCampSteal(camp);
        if (action === 'cull') return this.resolveCampCull(camp);
        if (action === 'recruit') return this.resolveCampRecruit(camp, 'human');
        if (action === 'turn') return this.resolveCampRecruit(camp, 'turned');
        if (action === 'talk') return this.talkToLeader('camp', camp);
        if (action === 'final-urge' || action === 'final-betray') {
            const mode = action === 'final-urge' ? 'urge' : 'betray';
            const before = this.getCampRecord(camp.id);
            this.act2.completeCampFinal(camp.id, { mode });
            const after = this.getCampRecord(camp.id);
            if (after?.questFlags?.final_vigil !== 'done') {
                window.AudioManager?.play?.('ui_error', { volume: 0.45, playbackRate: 0.6 });
                window.dispatchEvent(new CustomEvent('camp-final-denied', {
                    detail: { campId: camp.id, campLabel: camp.label, humanity: this.act2.getState().humanity }
                }));
                return true;
            }
            this.syncCampVisualFromRecord(camp, after);
            window.AudioManager?.play?.('class_lock', { volume: 0.55, playbackRate: mode === 'urge' ? 0.7 : 1.0 });
            this.triggerCameraShake?.(mode === 'urge' ? 0.35 : 0.2, 0.6);
            window.dispatchEvent(new CustomEvent('camp-final-resolved', {
                detail: {
                    campId: camp.id,
                    campLabel: camp.label,
                    mode,
                    bond: after.bond,
                    humanity: this.act2.getState().humanity,
                    obedience: this.act2.getState().queenObedience,
                    beforeBond: before?.bond ?? 0
                }
            }));
            return true;
        }
        if (action === 'warn') return this.resolveCampStatusAction(camp, 'warn', () => this.act2.warnCamp(camp.id), 'recruited');
        if (action === 'latent') return this.resolveCampStatusAction(camp, 'latent', () => this.act2.latentInfectCamp(camp.id), 'recruited');
        if (action === 'board') return this.resolveAct2Boarding(payload.variant ?? 'queen');
        return false;
    }

    resolveCampSteal(camp) {
        const before = this.getCampRecord(camp.id);
        this.act2.stealCamp(camp.id);
        const after = this.getCampRecord(camp.id);
        if (before?.status === after?.status) {
            window.dispatchEvent(new CustomEvent('camp-choice-denied', {
                detail: { campId: camp.id, campLabel: camp.label, action: 'steal' }
            }));
            return true;
        }
        this.syncCampVisualFromRecord(camp, after);
        this.spawnCampStealLoot(camp);
        this.triggerCameraShake?.(0.18, 0.35);
        window.AudioManager?.play?.('ui_error', { volume: 0.38, playbackRate: 0.85 });
        window.dispatchEvent(new CustomEvent('camp-choice-resolved', {
            detail: { campId: camp.id, campLabel: camp.label, action: 'steal', status: after.status }
        }));
        window.dispatchEvent(new CustomEvent('act2-milestone', { detail: { key: 'campRobbed', campId: camp.id, campLabel: camp.label } }));
        return true;
    }

    resolveCampRecruit(camp, mode = 'human') {
        const before = this.getCampRecord(camp.id);
        const wantedStatus = mode === 'turned' ? 'turned' : 'recruited';
        this.act2.recruitCamp(camp.id, { mode });
        const after = this.getCampRecord(camp.id);
        if (after?.status !== wantedStatus || before?.status === after?.status) {
            window.AudioManager?.play?.('ui_error', { volume: 0.4 });
            window.dispatchEvent(new CustomEvent('camp-choice-denied', {
                detail: {
                    campId: camp.id,
                    campLabel: camp.label,
                    action: mode === 'turned' ? 'turn' : 'recruit',
                    requiredBond: ACT2_RECRUIT_BOND_THRESHOLD,
                    bond: before?.bond ?? 0
                }
            }));
            return true;
        }
        this.syncCampVisualFromRecord(camp, after);
        this.spawnGearPoofEffect(camp.pos.x, camp.pos.z, mode === 'turned' ? 'bio_spores' : 'bunker_junk_legendary');
        window.AudioManager?.play?.('class_lock', { volume: 0.52, playbackRate: mode === 'turned' ? 0.75 : 1.05 });
        window.dispatchEvent(new CustomEvent('camp-choice-resolved', {
            detail: { campId: camp.id, campLabel: camp.label, action: mode === 'turned' ? 'turn' : 'recruit', status: after.status }
        }));
        window.dispatchEvent(new CustomEvent('act2-milestone', {
            detail: { key: mode === 'turned' ? 'campTurned' : 'campRecruited', campId: camp.id, campLabel: camp.label }
        }));
        return true;
    }

    resolveCampCull(camp) {
        // Fortified camps resist: the first breach wakes the defenders the
        // player paid for in Act 1. The cull only proceeds once they fall.
        if (camp.level > 0 && !camp._defenseSpawned) {
            camp._defenseSpawned = true;
            this.spawnCampDefenders(camp);
            this.triggerCameraShake?.(0.3, 0.5);
            window.AudioManager?.play?.('amb_metal_stress', { volume: 0.5, playbackRate: 0.8 });
            window.dispatchEvent(new CustomEvent('camp-defense-triggered', {
                detail: { campId: camp.id, campLabel: camp.label, level: camp.level }
            }));
            return true;
        }
        if (this.campDefendersAlive(camp.id)) {
            window.AudioManager?.play?.('ui_error', { volume: 0.35, playbackRate: 0.8 });
            return true;
        }

        const before = this.getCampRecord(camp.id);
        this.act2.cullCamp(camp.id);
        const record = this.getCampRecord(camp.id);
        if (record?.status !== 'culled' || before?.status === 'culled') {
            window.AudioManager?.play?.('ui_error', { volume: 0.35, playbackRate: 0.8 });
            window.dispatchEvent(new CustomEvent('camp-choice-denied', {
                detail: { campId: camp.id, campLabel: camp.label, action: 'cull' }
            }));
            return true;
        }
        this.syncCampVisualFromRecord(camp, record);
        this.spawnGearPoofEffect(camp.pos.x, camp.pos.z, camp.level > 0 ? 'bunker_junk_rare' : 'bunker_junk_uncommon');
        this.spawnCampCullLoot(camp);
        this.triggerCameraShake?.(0.4, 0.6);
        window.AudioManager?.play?.('door_slam_vertical', { volume: 0.5, playbackRate: 0.72 });
        window.AudioManager?.play?.('ui_error', { volume: 0.4, playbackRate: 0.55 });
        const allCulled = this.act2.getState().camps.every((c) => c.status === 'culled');
        window.dispatchEvent(new CustomEvent('act2-milestone', {
            detail: {
                key: allCulled ? 'allCulled' : 'campCulled',
                campId: camp.id,
                campLabel: camp.label
            }
        }));
        window.dispatchEvent(new CustomEvent('camp-choice-resolved', {
            detail: { campId: camp.id, campLabel: camp.label, action: 'cull', status: record?.status ?? 'culled' }
        }));
        return true;
    }

    // Shared resolver for camp mutations that should land on a target status.
    resolveCampStatusAction(camp, action, mutate, wantedStatus) {
        const before = this.getCampRecord(camp.id);
        mutate();
        const after = this.getCampRecord(camp.id);
        if (after?.status !== wantedStatus || before?.status === after?.status) {
            window.AudioManager?.play?.('ui_error', { volume: 0.4 });
            window.dispatchEvent(new CustomEvent('camp-choice-denied', {
                detail: { campId: camp.id, campLabel: camp.label, action, bond: before?.bond ?? 0 }
            }));
            return true;
        }
        this.syncCampVisualFromRecord(camp, after);
        window.AudioManager?.play?.('class_lock', { volume: 0.5, playbackRate: action === 'latent' ? 0.72 : 1.0 });
        window.dispatchEvent(new CustomEvent('camp-choice-resolved', {
            detail: { campId: camp.id, campLabel: camp.label, action, status: after.status }
        }));
        window.dispatchEvent(new CustomEvent('act2-milestone', {
            detail: { key: action === 'latent' ? 'campTurned' : 'campRecruited', campId: camp.id, campLabel: camp.label }
        }));
        return true;
    }

    resolveAct2Boarding(variant = 'queen') {
        // Hard manifest gate: an invalid seat plan never launches.
        const statusByVariant = {
            queen: { queenStatus: 'aboard', eggsStatus: 'aboard' },
            purge: { queenStatus: 'killed', eggsStatus: 'destroyed' },
            bargain: { queenStatus: 'killed', eggsStatus: 'hidden' },
            abandon: { queenStatus: 'abandoned', eggsStatus: 'abandoned' }
        };
        const target = statusByVariant[variant] ?? statusByVariant.queen;
        const manifest = buildAct2Manifest({ ...this.act2.getState(), ...target }, this.getRunManifestOptions());
        if (!manifest.valid) {
            window.AudioManager?.play?.('ui_error', { volume: 0.5, playbackRate: 0.6 });
            window.dispatchEvent(new CustomEvent('boarding-blocked', {
                detail: { variant, reasons: manifest.invalidReasons, seatsUsed: manifest.seatsUsed, seatsMax: manifest.seatsMax }
            }));
            return true;
        }
        if (variant === 'purge') {
            this.act2.setQueenStatus('killed');
            this.act2.setEggsStatus('destroyed');
            window.dispatchEvent(new CustomEvent('act2-milestone', { detail: { key: 'queenKilled' } }));
            window.dispatchEvent(new CustomEvent('act2-milestone', { detail: { key: 'eggsDestroyed' } }));
        } else if (variant === 'bargain') {
            this.act2.setQueenStatus('killed');
            this.act2.setEggsStatus('hidden');
            window.dispatchEvent(new CustomEvent('act2-milestone', { detail: { key: 'queenKilled' } }));
        } else if (variant === 'abandon') {
            this.act2.setQueenStatus('abandoned');
            this.act2.setEggsStatus('abandoned');
            window.dispatchEvent(new CustomEvent('act2-milestone', { detail: { key: 'queenRejected' } }));
        } else {
            this.act2.setQueenStatus('aboard');
            this.act2.setEggsStatus('aboard');
        }
        const vector = this.act2.getEndingVector();
        this.act2.depart();
        window.dispatchEvent(new CustomEvent('act2-departed', {
            detail: { runStats: this.getRunStats?.() ?? {}, endingVector: vector, variant }
        }));
        return true;
    }

    // The defense wave a supported camp mounts when breached in Act 2:
    // level * 2 guards, ring-spawned just outside the barricades.
    spawnCampDefenders(camp) {
        const count = camp.level * 2;
        const biomeSnail = this.currentBiomeKey === BIOME_KEYS.BIO ? 'sporesnail' : 'cryosnail';
        for (let i = 0; i < count; i += 1) {
            const type = i % 2 === 0 ? 'cybersnail' : biomeSnail;
            // Camp surroundings can be walled in — search a few ring spots and
            // fall back to the camp clearing itself (guaranteed walkable).
            let x = camp.pos.x;
            let z = camp.pos.z;
            for (let attempt = 0; attempt < 10; attempt += 1) {
                const angle = (i / count) * Math.PI * 2 + 0.6 + attempt * 0.7;
                const radius = 3.0 + ((i + attempt) % 3) * 0.8;
                const tryX = camp.pos.x + Math.cos(angle) * radius;
                const tryZ = camp.pos.z + Math.sin(angle) * radius;
                if (this.isSnailTileWalkable(Math.round(tryX), Math.round(tryZ))) {
                    x = tryX;
                    z = tryZ;
                    break;
                }
            }
            const placement = {
                x,
                z,
                type,
                scatterKey: `camp-defender:${camp.id}:${i}`,
                scale: 1.25,
                rotation: 0,
                tiltX: 0,
                tiltZ: 0,
                elevation: 0.1,
                groupType: 'enemy',
                phase: Math.random() * Math.PI * 2,
                opacity: 1,
                biomeTint: 0xffffff,
                isEnemy: true,
                spawnedEnraged: camp.level >= 3
            };
            const sprite = this.createScatterInstance(placement);
            if (!sprite) continue;
            sprite.userData.campDefenderId = camp.id;
            const chunkX = Math.floor(x / this.chunkSize);
            const chunkY = Math.floor(z / this.chunkSize);
            const group = this.chunkMeshes.get(`${chunkX},${chunkY}`) ?? this.scene;
            group.add(sprite);
            this.scatterSprites.push(sprite);
        }
    }

    campDefendersAlive(campId) {
        return this.scatterSprites.some((sprite) =>
            sprite.userData?.campDefenderId === campId && !sprite.userData.burstTriggered);
    }

    // The payoff for Act 1 investment: culling a supported camp ejects its
    // stockpile — level-scaled pickups plus a direct shell grant.
    spawnCampCullLoot(camp) {
        if (camp.level <= 0) return;
        const chunkX = Math.floor(camp.pos.x / this.chunkSize);
        const chunkY = Math.floor(camp.pos.z / this.chunkSize);
        const parent = this.chunkMeshes.get(`${chunkX},${chunkY}`) ?? this.scene;
        const dropTypes = [];
        for (let i = 0; i < camp.level; i += 1) {
            dropTypes.push('coin', 'coin', 'weapon', i >= 1 ? 'health' : 'ammo');
        }
        for (const type of dropTypes) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 0.8 + Math.random() * 1.4;
            const targetX = camp.pos.x + Math.cos(angle) * radius;
            const targetZ = camp.pos.z + Math.sin(angle) * radius;
            if (this.getTileType(Math.round(targetX), Math.round(targetZ)) === '#') continue;
            const placement = this.createSnailDropPlacement(camp.pos.x, camp.pos.z, targetX, targetZ, type);
            const pickup = this.createPickupInstance(placement);
            parent.add(pickup);
            this.pickupMeshes.push(pickup);
        }
        const shells = camp.level * 5;
        this.bank?.addShells?.(shells);
        window.dispatchEvent(new CustomEvent('shell-collected', {
            detail: { gained: shells, total: this.bank?.getShells?.() ?? 0, isBoss: false }
        }));
    }

    spawnCampStealLoot(camp) {
        const level = Math.max(0, Math.floor(camp?.level ?? 0));
        const salvage = this.applyCampPayoutEffects({
            tech: 6 + level * 5,
            coin: 8 + level * 6,
            med: 2 + level * 2,
            ammo: 3 + level * 2
        }, camp?.id);
        this.bank?.deposit?.(salvage);
        const shells = 3 + level * 4;
        this.bank?.addShells?.(shells);
        window.dispatchEvent(new CustomEvent('shell-collected', {
            detail: { gained: shells, total: this.bank?.getShells?.() ?? 0, isBoss: false }
        }));
        window.dispatchEvent(new CustomEvent('salvage-cache-opened', {
            detail: { ...salvage, source: 'camp-steal', campId: camp?.id, campLabel: camp?.label }
        }));
    }

    // Act 2 replaces the console terminal: severing the uplink is the first
    // objective; afterwards the console is a dead panel.
    handleAct2ConsoleInteract() {
        const phase = this.act2.getPhase();
        if (phase === 'gestation') {
            this.triggerCameraShake?.(0.32, 0.55);
            window.AudioManager?.play?.('ui_error', { volume: 0.5, playbackRate: 0.6 });
            window.AudioManager?.play?.('door_slam_vertical', { volume: 0.42, playbackRate: 0.8 });
            this.act2.silenceUplink();
            window.dispatchEvent(new CustomEvent('act2-milestone', { detail: { key: 'uplinkSilenced' } }));
            return;
        }
        window.dispatchEvent(new CustomEvent('act2-console-dead'));
    }

    // Current Act 2 objective with a world position for compass + loop HUD.
    getAct2Objective() {
        if (!this.isAct2Active()) return null;
        const phase = this.act2.getPhase();

        if (phase === 'gestation') {
            const ship = this.getActiveShip();
            if (!ship) return null;
            return {
                key: 'uplink',
                label: 'SEVER THE UPLINK',
                x: ship.tileX + (ship.consoleOffset?.x ?? 0),
                z: ship.tileZ + (ship.consoleOffset?.z ?? 0)
            };
        }

        if (phase === 'dish') {
            const pos = this.foundry?.getPosition();
            return pos ? { key: 'dish', label: 'GROW THE SIGNAL DISH', x: pos.x, z: pos.z } : null;
        }

        if (phase === 'camps_help' || phase === 'camps_betray') {
            const best = this.getNextCampInStoryOrder(phase === 'camps_help'
                ? (camp) => !camp.aided
                : (camp) => camp.aided && !camp.destroyed);
            if (!best) return null;
            return {
                key: phase,
                label: phase === 'camps_help' ? `AID ${best.label}` : `CULL ${best.label}`,
                x: best.pos.x,
                z: best.pos.z
            };
        }

        if (phase === 'launch_ready') {
            const camp = this.getCampById(this.getBoardingCampId());
            const pos = camp?.getPosition();
            return pos ? { key: 'launch', label: 'BOARD AT COMMAND CAMP', x: pos.x, z: pos.z } : null;
        }

        return null;
    }

    // Hard control lock for scripted sequences (cave reveal): freezes input and
    // pauses vitals drain so the player can't die mid-cutscene. While locked,
    // stray setInputEnabled(true) calls (e.g. a brief transmission closing) are
    // ignored — only unlocking hands control back.
    setCinematicLock(locked = true) {
        const next = Boolean(locked);
        if (next === this.cinematicLock) return;
        if (next) {
            this.cinematicLock = true;
            this.setInputEnabled(false);
        } else {
            this.cinematicLock = false;
            this.setInputEnabled(true);
        }
    }

    getActiveO2GeneratorDistance() {
        if (!this.player) return Infinity;
        const generatorPos = this.getActiveO2GeneratorPosition();
        if (!generatorPos) return Infinity;

        const dx = this.player.position.x - generatorPos.x;
        const dz = this.player.position.z - generatorPos.z;
        return Math.hypot(dx, dz);
    }

    createO2BubbleObjects() {
        if (this.o2BubbleObjects) return;

        const light = new THREE.PointLight(O2_SAFE_LIGHT_COLOR, 1.45, 9, 1.45);
        const ringInnerRadius = Math.max(0.2, O2_GENERATOR_RING_BASE_RADIUS - (O2_GENERATOR_RING_BAND_THICKNESS * 0.5));
        const ringOuterRadius = O2_GENERATOR_RING_BASE_RADIUS + (O2_GENERATOR_RING_BAND_THICKNESS * 0.5);
        const fill = new THREE.Mesh(
            new THREE.CircleGeometry(O2_GENERATOR_RING_BASE_RADIUS, 72),
            new THREE.MeshBasicMaterial({
                color: O2_SAFE_LIGHT_COLOR,
                transparent: true,
                opacity: O2_SAFE_FILL_OPACITY,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide,
                depthWrite: false,
                fog: false
            })
        );
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(ringInnerRadius, ringOuterRadius, 72),
            new THREE.MeshBasicMaterial({
                color: O2_SAFE_LIGHT_COLOR,
                transparent: true,
                opacity: 0.24,
                side: THREE.DoubleSide,
                depthWrite: false,
                fog: false
            })
        );

        fill.rotation.x = -Math.PI / 2;
        fill.position.y = 0.034;
        fill.visible = false;
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.035;
        ring.visible = false;
        light.visible = false;

        this.scene.add(light);
        this.scene.add(fill);
        this.scene.add(ring);

        this.o2BubbleObjects = { light, fill, ring };
    }

    ensureO2BubbleVisualState() {
        if (this.o2StartupSequenceActive) return;
        this.createO2BubbleObjects();
        const generatorState = this.getO2GeneratorState();
        const generatorPos = this.getActiveO2GeneratorPosition();
        const enabled = generatorState.isOnline && Boolean(generatorPos);
        const unlocks = this.unlocks ?? this.bank.getUnlocks();

        if (this.crashedShips) {
            for (const ship of this.crashedShips) {
                const isActiveShip = ship.type === this.playerType;
                const o2ModuleOnline = isActiveShip && generatorState.isOnline;
                const hullOnline = isActiveShip && Boolean(unlocks.hullExpansion);
                const radarOnline = isActiveShip && Boolean(unlocks.radarNode);
                const reactorOnline = isActiveShip && Boolean(unlocks.reactorCompressor);
                if (ship.o2ModuleSprite) {
                    ship.o2ModuleSprite.visible = o2ModuleOnline;
                }
                if (ship.o2ModuleShadow) {
                    ship.o2ModuleShadow.visible = o2ModuleOnline;
                }
                if (ship.hullModuleSprite) {
                    ship.hullModuleSprite.visible = hullOnline;
                }
                if (ship.hullModuleShadow) {
                    ship.hullModuleShadow.visible = hullOnline;
                }
                if (ship.radarModuleSprite) {
                    ship.radarModuleSprite.visible = radarOnline;
                }
                if (ship.radarModuleShadow) {
                    ship.radarModuleShadow.visible = radarOnline;
                }
                if (ship.reactorModuleSprite) {
                    ship.reactorModuleSprite.visible = reactorOnline;
                }
                if (ship.reactorModuleShadow) {
                    ship.reactorModuleShadow.visible = reactorOnline;
                }
            }
        }

        if (!this.o2BubbleObjects) return;

        if (!enabled) {
            this.o2BubbleObjects.light.visible = false;
            this.o2BubbleObjects.fill.visible = false;
            this.o2BubbleObjects.ring.visible = false;
            if (this.baseLights) {
                this.baseLights.dispose();
            }
            return;
        }

        const ringScale = Math.max(0.01, generatorState.radius / O2_GENERATOR_RING_BASE_RADIUS);
        this.o2BubbleObjects.ring.scale.set(ringScale, ringScale, 1);
        this.o2BubbleObjects.fill.scale.set(ringScale, ringScale, 1);
        this.o2BubbleObjects.light.position.set(generatorPos.x, 0.9, generatorPos.z);
        this.o2BubbleObjects.light.distance = Math.max(10, generatorState.radius * 2.45);
        this.o2BubbleObjects.ring.position.set(generatorPos.x, 0.035, generatorPos.z);
        this.o2BubbleObjects.fill.position.set(generatorPos.x, 0.034, generatorPos.z);
        this.o2BubbleObjects.light.visible = true;
        this.o2BubbleObjects.fill.visible = true;
        this.o2BubbleObjects.ring.visible = true;

        // Returning to an already-online base: snap the flood-light grid and the
        // Foundry on with no theatrics. The animated versions only play on the live
        // first repair, which fires via the o2-generator-upgraded event before this.
        this.revealFoundry({ instant: true });
        // Restoring an already-completed rebuild ladder also restores the cave
        // signal (no theatrics), unless the reveal has already played.
        if (this.hasUpgrade('reactorCompressor')) {
            this.revealCaveEntrance({ instant: true });
        }
        if (this.baseLights) {
            const ship = this.getActiveShip();
            if (ship && Number.isFinite(ship.tileX) && Number.isFinite(ship.tileZ)) {
                const color = PLAYER_COLORS[this.playerType] ?? 0xffffff;
                if (!this.baseLights.isIgnited) {
                    this.igniteBaseLights({ instant: true });
                } else {
                    this.baseLights.recenter(ship.tileX, ship.tileZ, generatorState.radius);
                    this.baseLights.setColor(color);
                }
            }
        }
    }

    resetVitalsForRun({ emit = true } = {}) {
        this.syncPersistentUpgrades();
        this.playerVitals.hp = this.playerVitals.maxHp;
        this.playerVitals.o2 = 100;
        this.playerVitals.o2HealthTimer = 0;
        this.isPlayerDead = false;
        this.o2DispatchTimer = 0;
        this._lastLoopStepKey = null;

        if (emit) {
            this.emitVitalsState();
        }
    }

    emitHealthState() {
        window.dispatchEvent(new CustomEvent('player-health-changed', {
            detail: {
                hp: this.playerVitals.hp,
                maxHp: this.playerVitals.maxHp
            }
        }));
    }

    emitO2State() {
        const generatorState = this.getO2GeneratorState();
        window.dispatchEvent(new CustomEvent('player-o2-changed', {
            detail: {
                o2: this.playerVitals.o2,
                bubbleActive: generatorState.isOnline
            }
        }));
    }

    emitVitalsState() {
        this.emitHealthState();
        this.emitO2State();
    }

    emitWeaponClipState() {
        const reloadProgress = this.weaponReloading
            ? Math.max(0, Math.min(1, 1 - (this.weaponReloadTimer / WEAPON_RELOAD_DURATION)))
            : 0;
        const autoRefillInterval = this.getAmmoRefillInterval();
        const autoRefillProgress = Number.isFinite(autoRefillInterval)
            && !this.weaponReloading
            && this.weaponClipAmmo < this.weaponClipSize
            ? Math.max(0, Math.min(1, (this.weaponAmmoRefillTimer ?? 0) / autoRefillInterval))
            : 0;
        window.dispatchEvent(new CustomEvent('weapon-clip-updated', {
            detail: {
                clip: this.weaponClipAmmo,
                maxClip: this.weaponClipSize,
                cache: this.getAvailableAmmo(),
                reloading: this.weaponReloading,
                reloadProgress,
                autoRefillProgress
            }
        }));
    }

    emitShipHealthState(ship = this.getActiveShip()) {
        const activeShip = ship ?? this.getActiveShip();
        if (!activeShip) return;
        window.dispatchEvent(new CustomEvent('ship-health-changed', {
            detail: {
                shipType: activeShip.type,
                hp: activeShip.hp,
                maxHp: activeShip.maxHp
            }
        }));
    }

    resetWeaponState({ emit = true } = {}) {
        for (const projectile of this.activeProjectiles) {
            projectile?.mesh?.parent?.remove(projectile.mesh);
            projectile?.mesh?.material?.dispose?.();
            projectile?.mesh?.geometry?.dispose?.();
        }
        this.weaponClipAmmo = this.weaponClipSize;
        this.weaponReloading = false;
        this.weaponReloadTimer = 0;
        this.weaponAmmoRefillTimer = 0;
        this.weaponFireCooldown = 0;
        this.activeProjectiles = [];
        if (emit) {
            this.emitWeaponClipState();
        }
    }

    isInsideNoFireZone() {
        const activeShip = this.getActiveShip();
        if (!activeShip || !this.player) return false;

        const shipDist = Math.hypot(
            this.player.position.x - activeShip.tileX,
            this.player.position.z - activeShip.tileZ
        );
        if (shipDist <= SHIP_NO_FIRE_RADIUS) {
            return true;
        }

        return false;
    }

    damageShip(ship, amount = 1, reason = 'impact') {
        if (!ship) return;
        const prevHp = Number.isFinite(ship.hp) ? ship.hp : ship.maxHp;
        ship.hp = Math.max(0, prevHp - Math.max(0, amount));
        if (ship.hp === prevHp) return;
        if (reason !== 'friendly-fire') this.triggerCameraShake(0.12, 0.25);

        if (ship.type === this.playerType) {
            this.emitShipHealthState(ship);
        }

        window.dispatchEvent(new CustomEvent('ship-damaged', {
            detail: {
                shipType: ship.type,
                amount: prevHp - ship.hp,
                hp: ship.hp,
                maxHp: ship.maxHp,
                reason
            }
        }));

        if (ship.hp <= 0 && ship.type === this.playerType) {
            this.handleDeath('ship-destroyed');
        }
    }

    getPlayerVitals() {
        return {
            hp: this.playerVitals.hp,
            maxHp: this.playerVitals.maxHp,
            o2: this.playerVitals.o2
        };
    }

    // First build site whose corresponding goal is not yet unlocked, or null
    // when every site has been built.
    getNextBuildSite() {
        for (const site of BUILD_SITES) {
            if (!this.hasUpgrade(site.goalKey)) return site;
        }
        return null;
    }

    // Convert a world-space delta into the screen-planar bearing used by the
    // HUD compass arrows.
    planarAngleTo(dx, dz, distance) {
        if (!(distance > 0.0001)) return 0;
        const screenX = (dx * this.cameraPlanarRight.x) + (dz * this.cameraPlanarRight.y);
        const screenY = (dx * this.cameraPlanarForward.x) + (dz * this.cameraPlanarForward.y);
        return THREE.MathUtils.radToDeg(Math.atan2(screenX, screenY));
    }

    getRadarCompassState() {
        if (!this.player) {
            return { active: false, angle: 0, distance: 0 };
        }

        if (performance.now() < (this._compassCorruptUntil ?? 0)) {
            const jitter = Math.sin(performance.now() * 0.018) * 80;
            return { active: true, mode: 'corrupt', label: 'SIGNAL CORRUPT', angle: jitter, distance: 0 };
        }

        if (this._blackBoxMarkerActive && this._blackBoxState?.active) {
            const dx = this._blackBoxState.x - this.player.position.x;
            const dz = this._blackBoxState.z - this.player.position.z;
            const dist = Math.hypot(dx, dz);
            return {
                active: true,
                mode: 'blackbox',
                label: 'BLACK BOX',
                angle: this.planarAngleTo(dx, dz, dist),
                distance: dist
            };
        }

        // Act 1 finale: once the cave is revealed, the "final component" signal
        // outranks everything else — it is the run's closing objective.
        if (this.caveEntrance?.isRevealed && !this.isCaveRevealDone()) {
            const cp = this.caveEntrance.getPosition();
            const cdx = cp.x - this.player.position.x;
            const cdz = cp.z - this.player.position.z;
            const cdist = Math.hypot(cdx, cdz);
            if (cdist > 2.0) {
                return {
                    active: true,
                    mode: 'cave',
                    label: 'FINAL COMPONENT',
                    angle: this.planarAngleTo(cdx, cdz, cdist),
                    distance: cdist
                };
            }
        }

        // Beat 4 objective: once the Foundry is powered, the compass points to it
        // until the player reaches and activates it — regardless of the radar
        // upgrade, since this is a story objective, not a scanner perk. After
        // activation the compass falls through to the build-site ladder so the
        // run keeps a single clear "next step".
        if (this.foundry?.isRevealed && !(this.bank?.isFoundryActivated?.())) {
            const fp = this.foundry.getPosition();
            const fdx = fp.x - this.player.position.x;
            const fdz = fp.z - this.player.position.z;
            const fdist = Math.hypot(fdx, fdz);
            if (fdist > 2.0) {
                return {
                    active: true,
                    mode: 'foundry',
                    label: 'FABRICATION BAY',
                    angle: this.planarAngleTo(fdx, fdz, fdist),
                    distance: fdist
                };
            }
        }

        const sideSignal = this.getAct1SideSignalTarget?.();
        if (sideSignal) {
            const dx = sideSignal.x - this.player.position.x;
            const dz = sideSignal.z - this.player.position.z;
            const distance = Math.hypot(dx, dz);
            return {
                active: true,
                mode: sideSignal.mode,
                label: sideSignal.label,
                angle: this.planarAngleTo(dx, dz, distance),
                distance
            };
        }

        if (this._meridianCompassLock && performance.now() < this._meridianCompassLock.expiresAt) {
            const dx = this._meridianCompassLock.x - this.player.position.x;
            const dz = this._meridianCompassLock.z - this.player.position.z;
            const distance = Math.hypot(dx, dz);
            return {
                active: true,
                mode: this._meridianCompassLock.mode,
                label: this._meridianCompassLock.label,
                angle: this.planarAngleTo(dx, dz, distance),
                distance
            };
        }
        this._meridianCompassLock = null;

        // General salvage scanning still needs the radar upgrade; camp and hive
        // beacons above are deliberate Act 1 side signals.
        if (!this.hasUpgrade('radarNode')) {
            return { active: false, angle: 0, distance: 0 };
        }

        // Once unlocked: guide toward the next "to-develop" build site, falling
        // back to nearest pickup when every site is built.
        const site = this.getNextBuildSite();
        if (site) {
            const dx = site.x - this.player.position.x;
            const dz = site.z - this.player.position.z;
            const distance = Math.hypot(dx, dz);
            return {
                active: true,
                mode: 'build',
                label: site.label,
                angle: this.planarAngleTo(dx, dz, distance),
                distance
            };
        }

        // Fallback mode (all sites built): nearest pickup.
        let nearest = null;
        let nearestDistance = Infinity;
        for (const pickup of this.pickupMeshes) {
            if (!pickup?.parent || pickup.userData?.collectedReported) continue;

            const dx = pickup.position.x - this.player.position.x;
            const dz = pickup.position.z - this.player.position.z;
            const distance = Math.hypot(dx, dz);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = { dx, dz, distance };
            }
        }

        if (!nearest) {
            return { active: false, angle: 0, distance: 0 };
        }

        return {
            active: true,
            mode: 'pickup',
            angle: this.planarAngleTo(nearest.dx, nearest.dz, nearest.distance),
            distance: nearest.distance
        };
    }

    setGodMode(enabled = false) {
        this.godMode = Boolean(enabled);
        if (this.godMode) {
            this.playerVitals.hp = this.playerVitals.maxHp;
            this.playerVitals.o2 = 100;
            this.emitHealthState();
            this.emitO2State();
        }
        return this.godMode;
    }

    healPlayer(amount = 1) {
        if (this.isPlayerDead) return;
        const previousHp = this.playerVitals.hp;
        this.playerVitals.hp = Math.min(this.playerVitals.maxHp, this.playerVitals.hp + Math.max(0, amount));
        if (this.playerVitals.hp === previousHp) return;

        this.emitHealthState();
        window.dispatchEvent(new CustomEvent('health-restored', {
            detail: {
                amount: this.playerVitals.hp - previousHp,
                hp: this.playerVitals.hp,
                maxHp: this.playerVitals.maxHp
            }
        }));
    }

    takeDamage(amount = 1, reason = 'hazard', sourceX = null, sourceZ = null) {
        if (this.isPlayerDead) return;
        if (this.godMode) return;
        if (this.cinematicLock) return; // untouchable during scripted sequences
        if (this._abilityImmune) return;
        if (this.missionState?.status === 'inactive') return;
        const previousHp = this.playerVitals.hp;
        this.playerVitals.hp = Math.max(0, this.playerVitals.hp - Math.max(0, amount));
        if (this.playerVitals.hp === previousHp) return;

        if (sourceX != null && sourceZ != null) {
            this.showDirectionalHitIndicator(sourceX, sourceZ);
        }

        // The Director eases off right after the player is hurt.
        this.bunkerDirector?.notifyThreat();
        this.triggerCameraShake(0.22, 0.4);
        this.emitHealthState();
        window.dispatchEvent(new CustomEvent('player-damaged', {
            detail: {
                amount: previousHp - this.playerVitals.hp,
                hp: this.playerVitals.hp,
                maxHp: this.playerVitals.maxHp,
                reason
            }
        }));

        if (this.playerVitals.hp === 1) {
            this.hadNearDeath = true;
        }

        if (this.playerVitals.hp <= 0) {
            this.handleDeath(reason);
        }
    }

    showDirectionalHitIndicator(attackerX, attackerZ) {
        if (attackerX == null || attackerZ == null || !this.player || !this.cameraPlanarForward) return;

        const dx = attackerX - this.player.position.x;
        const dz = attackerZ - this.player.position.z;
        if (dx === 0 && dz === 0) return;

        const forward = this.cameraPlanarForward;
        const right = new THREE.Vector2(-forward.y, forward.x);

        const dotForward = dx * forward.x + dz * forward.y;
        const dotRight = dx * right.x + dz * right.y;

        const screenAngle = Math.atan2(dotRight, dotForward);

        const wedge = document.getElementById('hit-indicator-wedge');
        const container = document.getElementById('damage-vignette-layer');
        if (wedge && container) {
            container.classList.remove('hidden');
            wedge.style.transform = `rotate(${screenAngle}rad) translateY(-80px)`;
            
            wedge.classList.remove('flash');
            void wedge.offsetWidth; // force reflow
            wedge.classList.add('flash');
        }
    }

    handleDeath(reason = 'hazard') {
        if (this.isPlayerDead) return;
        this.isPlayerDead = true;
        this.closeConsoleModal();
        const inventory = this.getSessionInventory();
        const salvage = {
            tech: inventory.weapon ?? 0,
            coin: inventory.coin ?? 0,
            med: inventory.health ?? 0
        };
        const deathLog = [
            `${this.playerType} operator signal lost.`,
            `Cause: ${reason}.`,
            `Depth tier: ${this.getDepthTierName(this.maxDepthTierReached)}.`,
            `Recoverable salvage: ${salvage.tech} TECH / ${salvage.coin} COIN / ${salvage.med} MED.`
        ].join(' ');
        const blackBoxState = blackBoxStore.recordDeath({
            x: this.player?.position?.x ?? 0,
            z: this.player?.position?.z ?? 0,
            depth: this.maxDepthTierReached,
            classType: this.playerType,
            salvage,
            cause: reason,
            log: deathLog
        });
        this.showBunkerLine(getDialogueLine('death') ?? 'SUIT FAILURE LOGGED. BLACK BOX ARMED.');
        window.dispatchEvent(new CustomEvent('player-death', {
            detail: { reason, blackBox: blackBoxState }
        }));
    }

    abortMission() {
        if (this.isPlayerDead || this.performanceProfile !== 'gameplay') return false;
        this.setInputEnabled(false);
        this.handleDeath('mission-abort');
        return true;
    }

    clearLoadedChunksForRunReset() {
        for (const group of this.chunkMeshes.values()) {
            group.traverse((child) => {
                if (child.userData?.isScatter) {
                    child.material?.dispose?.();
                    child.geometry?.dispose?.();
                }
                if (child.userData?.isPickup) {
                    child.userData.shadow?.material?.dispose?.();
                    child.userData.shadow?.geometry?.dispose?.();
                    child.userData.glow?.material?.dispose?.();
                    child.userData.glow?.geometry?.dispose?.();
                    child.userData.burst?.material?.dispose?.();
                    child.userData.burst?.geometry?.dispose?.();
                }
            });
            this.chunkGroups.remove(group);
        }

        this.chunkMeshes.clear();
        this.chunkCache.clear();
        this._chunkRoomTypeCache?.clear();
        this._chunkTemplateCache?.clear();
        this.pendingChunkMounts = [];
        this.pendingChunkMountKeys.clear();
        this.wallMeshes = [];
        this.pickupMeshes = [];
        this.scatterSprites = [];
    }

    respawnPlayer({ resetRunState = true, skipEffects = false } = {}) {
        this.resetVitalsForRun({ emit: false });
        this.resetWeaponState({ emit: false });
        this.mouseAimActive = false;
        this.hasActiveAim = false;
        this._aimResetTimer = 0;
        this.aimWorldPoint = null;
        this.keys.up = false;
        this.keys.down = false;
        this.keys.left = false;
        this.keys.right = false;
        this.keys.shift = false;
        this.virtualInput.x = 0;
        this.virtualInput.z = 0;
        this.isMoving = false;
        this.isPlayerFalling = false;
        if (this.player) {
            this.player.scale.set(1, 1, 1);
            this.player.rotation.set(0, 0, 0);
        }

        const spawn = this.getSpawnTile();
        this.player.position.set(spawn.x, 0, spawn.y);
        this.playerGlow.position.set(spawn.x, 1.6, spawn.y);
        this.playerMarker.position.set(spawn.x, this.playerMarkerHeight, spawn.y);
        this.updatePlayerForwardLight(1, { immediate: true });

        if (resetRunState) {
            this.runStartTime = Date.now();
            this.totalDistanceTravelled = 0;
            this.maxDepthTierReached = 0;
            this.currentDepthTier = 0;
            this.snailsKilledThisRun = 0;
            this.visitedChunks = new Set();
            this.missionState = { type: null, label: '', status: 'inactive', extractionTimer: 0, killCount: 0, targetKills: 0, targetDepth: 0 };
            this.runDepositedResources = { tech: 0, coin: 0, med: 0 };
            this.hadNearDeath = false;
            this._lastLoopStepKey = null; // force the loop-state HUD to re-emit
            this.bunkerDirector?.reset();
            this._syncedRunModifier = null;
            this._blackoutWaveTimer = 0;
            this._extractionLockdownFired = false;
            this._blockedExtractionSignalFired = false;
            this._terminalEvent = null;
            this._terminalEventResolvedIds.clear();
            this._meridianCompassLock = null;
            this.foundry?.reset?.();
            this._foundryPromptActive = false;
            this.caveEntrance?.reset?.();
            this._cavePromptActive = false;
            this._caveAnomalySignaled = false;
            this.resetAct2World();
            this.clearCorpses();
            this.clearLoreDrops();
            this._hiveKinKills = 0;
            this._tankShockGuardUsed = false;
            this.cinematicLock = false;
            this.runEntropy = this.fixedRunEntropy ? 0 : (Math.random() * 0xffffffff) >>> 0;
            this.clearBlackBoxMarker();
            this._blackBoxState = blackBoxStore.load();
            this._initClassAbility();
            if (this.crashedShips) {
                for (const ship of this.crashedShips) {
                    ship.hp = ship.maxHp;
                }
            }
            window.resetPickupCounter?.();
            this.depletedGearPileKeys.clear();
            this.killedBosses.clear();
            this.playerSlowTimer = 0;
            this.playerPoisonTimer = 0;
            this.playerPoisonTickTimer = 0;
            const bossPanel = document.getElementById('boss-status-panel');
            if (bossPanel) {
                bossPanel.classList.add('hidden');
            }
            this.clearLoadedChunksForRunReset();
            this.syncVisibleChunks(true);
            this.updateCrashedShipsVisibility(false);
            this.emitDepthTierChanged(0);
        }

        // Stim Cache tier2 upgrade: spawn a health pack near spawn at run start
        if (resetRunState && this.bank?.getState?.()?.tier2Unlocks?.stimCache) {
            setTimeout(() => {
                const sp = this.getSpawnTile();
                const placement = {
                    worldX: sp.x + 1.2,
                    worldZ: sp.y + 0.8,
                    type: 'health',
                    rarity: { key: 'uncommon', color: 0x00ff88, label: 'STIM PACK', emissiveIntensity: 1.2 },
                    scale: 0.9,
                    rotation: 0,
                    tiltX: 0,
                    tiltZ: 0,
                    elevation: 0.22,
                    offsetX: 0,
                    offsetZ: 0,
                    bobOffset: 0,
                    shadowRadius: 0.28,
                    collectLock: 0,
                    ejectStartX: sp.x,
                    ejectStartZ: sp.y,
                    ejectTargetX: sp.x + 1.2,
                    ejectTargetZ: sp.y + 0.8
                };
                const pickup = this.createPickupInstance(placement);
                if (pickup) {
                    this.scene.add(pickup);
                    this.pickupMeshes.push(pickup);
                }
            }, 800);
        }

        this.ensureO2BubbleVisualState();
        this.ensureBlackBoxMarker();
        this.updateBiomeEnvironment({ immediate: true, forceEvent: true });
        if (!skipEffects) {
            this.spawnShipPoofEffect(spawn.x, spawn.y, PLAYER_COLORS[this.playerType] ?? 0xffffff);
        }

        this.emitVitalsState();
        this.emitWeaponClipState();
        this.emitShipHealthState();
        window.dispatchEvent(new CustomEvent('player-respawned', {
            detail: {
                hp: this.playerVitals.hp,
                maxHp: this.playerVitals.maxHp,
                o2: this.playerVitals.o2
            }
        }));
        window.setTimeout(() => this.updateLoopStep(true), 0);
    }

    initMission(mission) {
        if (!mission) return;
        this.missionState = {
            type: mission.type,
            label: mission.label ?? '',
            status: 'active',
            extractionTimer: 0,
            killCount: 0,
            targetKills: mission.targetKills ?? 0,
            targetDepth: mission.targetDepth ?? 0
        };
    }

    clearMission() {
        this.missionState = { type: null, label: '', status: 'inactive', extractionTimer: 0, killCount: 0, targetKills: 0, targetDepth: 0 };
        this._extractionLockdownFired = false;
        this._blockedExtractionSignalFired = false;
        window.dispatchEvent(new CustomEvent('extraction-progress', {
            detail: { progress: 0, active: false }
        }));
    }

    handleExtraction({ skipElevator = false } = {}) {
        if (this.missionState?.status === 'extracted') return;
        if (!skipElevator && this.missionState?.status !== 'elevator_ready') {
            this.startElevatorDownSequence();
            return;
        }
        if (this.missionState) this.missionState.status = 'extracted';
        this.inputEnabled = false;

        const inventory = this.getSessionInventory();
        const depositPayload = {
            med: Math.max(0, Math.floor(inventory.health ?? 0)),
            tech: Math.max(0, Math.floor(inventory.weapon ?? 0)),
            coin: Math.max(0, Math.floor(inventory.coin ?? 0))
        };
        if (depositPayload.med + depositPayload.tech + depositPayload.coin > 0) {
            this.bank.deposit(depositPayload);
            this.runDepositedResources.tech += depositPayload.tech;
            this.runDepositedResources.med += depositPayload.med;
            this.runDepositedResources.coin += depositPayload.coin;
            window.consumeSessionInventoryForDeposit?.(depositPayload);
        }

        window.dispatchEvent(new CustomEvent('player-extracted', {
            detail: {
                runStats: this.getRunStats(),
                missionState: { ...this.missionState },
                runDepositedResources: { ...this.runDepositedResources }
            }
        }));
    }

    calculateRunScore(runStats, missionState, startTime) {
        const elapsedMinutes = (Date.now() - startTime) / 60000;
        let score = 0;

        if (missionState?.status === 'extracted') score += 500;
        score += Math.floor((runStats.depthTier ?? 0) * (runStats.distanceTravelled ?? 0) * 0.08);

        const r = this.runDepositedResources;
        score += ((r.tech ?? 0) * 10) + ((r.coin ?? 0) * 5) + ((r.med ?? 0) * 3);
        score += (runStats.snailsKilled ?? 0) * 40;

        if (missionState?.status === 'extracted') {
            score += 200;
            if (this.playerVitals.hp >= this.playerVitals.maxHp) score += 100;
        }

        if (elapsedMinutes < 15) {
            score += Math.max(0, Math.min(300, Math.floor((15 - elapsedMinutes) * 50)));
        }
        if (this.hadNearDeath) score += 100;

        return Math.floor(score);
    }

    getRunRating(score) {
        if (score >= 2000) return { grade: 'S', label: 'EXEMPLARY FIELD PERFORMANCE' };
        if (score >= 1500) return { grade: 'A', label: 'MISSION SUCCESSFUL' };
        if (score >= 1000) return { grade: 'B', label: 'PARTIAL SUCCESS' };
        if (score >= 500)  return { grade: 'C', label: 'MISSION FAILED — DATA RECOVERED' };
        return { grade: 'D', label: 'AGENT LOST — MINIMAL TELEMETRY' };
    }

    getLoreText(key) {
        for (const pool of Object.values(LORE_LOGS)) {
            const entry = pool.find((e) => e.key === key);
            if (entry) return entry.text;
        }
        return null;
    }

    // Ability key + display label for the active class (drives the HUD panel).
    getClassAbilityInfo() {
        const stats = CLASS_STATS[this.playerType] ?? CLASS_STATS.ENGINEER;
        return { key: stats.abilityKey, label: stats.abilityLabel };
    }

    _initClassAbility() {
        const stats = CLASS_STATS[this.playerType] ?? CLASS_STATS.ENGINEER;
        let cooldownMax = stats.abilityCooldown;
        let activeDuration = stats.abilityDuration;

        if (this.bank) {
            if (this.bank.isSkillUnlocked('scout_special_upgrade_1')) {
                activeDuration += 1.0;
            }
            if (this.bank.isSkillUnlocked('scout_special_upgrade_2')) {
                cooldownMax -= 2.0;
            }
        }

        this.classAbility = {
            cooldownMax: cooldownMax,
            cooldownRemaining: 0,
            active: false,
            activeTimer: 0,
            activeDuration: activeDuration
        };
        this._abilityMoveSpeedMult = 1.0;
        this._abilityImmune = false;
        this._abilityO2DrainMult = 1.0;
        this._abilityRefillMult = 1.0;
    }

    isSpecialAbilityUnlocked() {
        const stats = CLASS_STATS[this.playerType] ?? CLASS_STATS.ENGINEER;
        return !stats.unlockSkill || this.bank?.isSkillUnlocked?.(stats.unlockSkill);
    }

    triggerClassAbility() {
        if (!this.isGameplayInputActive()) return;
        if (!this.isSpecialAbilityUnlocked()) {
            window.AudioManager?.play('ui_error', { volume: 0.32, playbackRate: 0.9, bus: 'sfx' });
            this.showBunkerLine('MOTHERSHIP: EXOSUIT SPECIAL OFFLINE. UNLOCK IN SKILL TREE [TAB].');
            return;
        }
        if (this.classAbility.cooldownRemaining > 0) {
            window.AudioManager?.play('ui_error', { volume: 0.3, playbackRate: 1.4, bus: 'sfx' });
            return;
        }
        this.classAbility.active = true;
        this.classAbility.activeTimer = 0;
        this.classAbility.cooldownRemaining = this.classAbility.cooldownMax;

        const abilityKey = CLASS_STATS[this.playerType]?.abilityKey ?? 'sprint';
        window.dispatchEvent(new CustomEvent('class-ability-activated', {
            detail: { ability: abilityKey, playerType: this.playerType }
        }));
        window.AudioManager?.play('ui_boot', { volume: 0.42, playbackRate: abilityKey === 'fortify' ? 0.72 : 1.15, bus: 'sfx' });

        if (abilityKey === 'sprint') {
            window.AudioManager?.play('fx_scout_sprint', { volume: 0.45, bus: 'sfx' });
            const videoSprite = new KeyedVideoSprite('/fx_scout_sprint.webm', {
                width: 2.2,
                height: 2.2,
                threshold: 0.05,
                edgeSoftness: 0.05,
                loop: false
            });
            const spriteObj = videoSprite.getSprite();
            if (spriteObj && this.player) {
                spriteObj.position.copy(this.player.position);
                spriteObj.position.y = 0.55;
                this.scene.add(spriteObj);
                this.transientEffects.push({
                    videoSprite,
                    spriteObj,
                    age: 0,
                    maxAge: 1.0,
                    update(dt) {
                        this.age += dt;
                    },
                    dispose() {
                        videoSprite.dispose();
                    }
                });
            }
        } else if (abilityKey === 'fortify') {
            window.AudioManager?.play('fx_tank_shockwave', { volume: 0.55, bus: 'sfx' });
        } else if (abilityKey === 'overclock') {
            window.AudioManager?.play('fx_engineer_turret', { volume: 0.48, bus: 'sfx' });
        }
    }

    updateClassAbility(delta) {
        // Tick cooldown
        if (this.classAbility.cooldownRemaining > 0) {
            this.classAbility.cooldownRemaining = Math.max(0, this.classAbility.cooldownRemaining - delta);
        }

        // Reset per-frame multipliers
        this._abilityMoveSpeedMult = 1.0;
        this._abilityImmune = false;
        this._abilityO2DrainMult = 1.0;
        this._abilityRefillMult = 1.0;

        const abilityKey = CLASS_STATS[this.playerType]?.abilityKey;
        if (this.classAbility.active) {
            this.classAbility.activeTimer += delta;
            if (this.classAbility.activeTimer >= this.classAbility.activeDuration) {
                this.classAbility.active = false;
                window.dispatchEvent(new CustomEvent('class-ability-ended', {
                    detail: { ability: CLASS_STATS[this.playerType]?.abilityKey }
                }));
            } else if (abilityKey === 'sprint') {
                this._abilityMoveSpeedMult = 3.0;
                this._abilityO2DrainMult = 4.0;
                // Spawn trail particle every ~6 frames
                if (this.player && Math.random() < 0.45) {
                    this._spawnSprintTrail();
                }
            } else if (abilityKey === 'fortify') {
                this._abilityImmune = true;
                this._abilityMoveSpeedMult = 0;
            } else if (abilityKey === 'overclock') {
                this._abilityO2DrainMult = 0.5;
                this._abilityRefillMult = 3.0;
            }
        }

        const activeProgress = this.classAbility.active
            ? (this.classAbility.activeTimer / this.classAbility.activeDuration)
            : 0;
        window.dispatchEvent(new CustomEvent('ability-cooldown-tick', {
            detail: {
                remaining: this.classAbility.cooldownRemaining,
                max: this.classAbility.cooldownMax,
                active: this.classAbility.active,
                activeProgress,
                ability: abilityKey
            }
        }));
    }

    updateRadarScans(delta) {
        if (!this.activeRadarScans) this.activeRadarScans = [];
        for (const scan of this.activeRadarScans) {
            scan.age += delta;
            scan.currentRadius = (scan.age / scan.duration) * scan.maxRadius;
        }
        this.activeRadarScans = this.activeRadarScans.filter(scan => scan.age < scan.duration);

        if (this.radarScanCooldownRemaining > 0) {
            this.radarScanCooldownRemaining = Math.max(0, this.radarScanCooldownRemaining - delta);
            window.dispatchEvent(new CustomEvent('scan-cooldown-tick', {
                detail: {
                    remaining: this.radarScanCooldownRemaining,
                    max: this.radarScanCooldownMax
                }
            }));
        }
    }

    spawnRadarPingHighlight(target, colorHex = 0x00d2ff) {
        if (!target) return;
        const geom = new THREE.RingGeometry(0.12, 0.22, 4);
        const mat = new THREE.MeshBasicMaterial({
            color: colorHex,
            transparent: true,
            opacity: 0.95,
            depthTest: false,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.rotation.x = -Math.PI / 4;
        mesh.rotation.z = Math.PI / 4;
        mesh.position.y = 1.1;
        mesh.renderOrder = 9999;
        this.scene.add(mesh);

        this.transientEffects.push({
            mesh,
            age: 0,
            duration: 5.0,
            update: (dt, age) => {
                if (target && target.parent) {
                    mesh.position.x = target.position.x;
                    mesh.position.z = target.position.z;
                }
                mesh.position.y = 1.1 + Math.sin(age * 6.5) * 0.08;
                mesh.rotation.y += 0.04;
                const t = age / 5.0;
                mat.opacity = 0.95 * (1 - t * t);
            },
            dispose: () => {
                geom.dispose();
                mat.dispose();
            }
        });
    }

    triggerRadarScan() {
        if (!this.isGameplayInputActive()) return;
        if (this.radarScanCooldownRemaining > 0) {
            window.AudioManager?.play('ui_error', { volume: 0.3, playbackRate: 1.4, bus: 'sfx' });
            return;
        }
        if (!this.player) return;

        const radarEffects = this.getRunCardEffects().radar ?? {};
        const campRadarEffects = this.getCampVerbRuntimeEffects().radar ?? {};
        let cdMax = 4.0 * (radarEffects.cooldownMult ?? 1) * (campRadarEffects.cooldownMult ?? 1);
        if (this.playerType === 'ENGINEER' && this.bank.isSkillUnlocked('engineer_special_upgrade_2') && this.classAbility.active) {
            cdMax *= 0.5;
        }
        this.radarScanCooldownMax = cdMax;
        this.radarScanCooldownRemaining = cdMax;

        const px = this.player.position.x;
        const pz = this.player.position.z;

        const upgrade1 = this.playerType === 'ENGINEER' && this.bank.isSkillUnlocked('engineer_radar_1');
        const maxRadius = 18.0
            * (upgrade1 ? 1.3 : 1.0)
            * (radarEffects.rangeMult ?? 1)
            * (campRadarEffects.rangeMult ?? 1);
        const compassHoldSeconds = Math.max(0, Number(campRadarEffects.compassHoldSeconds) || 0);
        if (compassHoldSeconds > 0) {
            const compassTarget = this.getMeridianCompassTarget();
            if (compassTarget) {
                this._meridianCompassLock = {
                    ...compassTarget,
                    expiresAt: performance.now() + compassHoldSeconds * 1000
                };
            }
        }

        if (!this.activeRadarScans) this.activeRadarScans = [];
        this.activeRadarScans.push({
            x: px,
            z: pz,
            currentRadius: 0.1,
            maxRadius: maxRadius,
            age: 0,
            duration: 1.2
        });

        window.AudioManager?.play('ui_scan_ping', { volume: 0.55, playbackRate: 0.48, bus: 'sfx' });

        const ringGeo = new THREE.RingGeometry(0.96, 1.0, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00d2ff,
            transparent: true,
            opacity: 0.8,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = -Math.PI / 2;
        ringMesh.position.y = 0.05;

        const scanGroup = new THREE.Group();
        scanGroup.position.set(px, 0, pz);
        scanGroup.add(ringMesh);
        this.scene.add(scanGroup);

        const pingedIds = new Set();

        this.transientEffects.push({
            mesh: scanGroup,
            age: 0,
            duration: 1.2,
            update: (dt, age) => {
                const t = age / 1.2;
                const currentRadius = t * maxRadius;
                ringMesh.scale.set(currentRadius, currentRadius, 1);
                ringMat.opacity = 0.8 * (1 - t * t);

                for (const sprite of this.scatterSprites) {
                    if (!sprite || !sprite.userData || pingedIds.has(sprite.uuid)) continue;
                    const isEnemy = this.isEnemyType(sprite.userData.type);
                    const isBB = sprite.userData.isBlackBoxMarker;
                    const isTerminal = sprite.userData.type === 'lore_terminal';
                    if (!isEnemy && !isBB && !isTerminal) continue;

                    const dx = sprite.position.x - px;
                    const dz = sprite.position.z - pz;
                    const d = Math.hypot(dx, dz);
                    if (d <= currentRadius) {
                        pingedIds.add(sprite.uuid);
                        this.spawnRadarPingHighlight(sprite, 0x00d2ff);
                    }
                }

                for (const pickup of this.pickupMeshes) {
                    if (!pickup || pingedIds.has(pickup.uuid)) continue;
                    const dx = pickup.position.x - px;
                    const dz = pickup.position.z - pz;
                    const d = Math.hypot(dx, dz);
                    if (d <= currentRadius) {
                        pingedIds.add(pickup.uuid);
                        this.spawnRadarPingHighlight(pickup, 0x38bdf8);
                    }
                }

                if (this.foundry && this.foundry.built && !pingedIds.has('foundry')) {
                    const fPos = this.foundry.getPosition();
                    if (fPos) {
                        const dx = fPos.x - px;
                        const dz = fPos.z - pz;
                        const d = Math.hypot(dx, dz);
                        if (d <= currentRadius) {
                            pingedIds.add('foundry');
                            this.spawnRadarPingHighlight(this.foundry.group, 0x00d2ff);
                        }
                    }
                }
            },
            dispose: () => {
                ringGeo.dispose();
                ringMat.dispose();
            }
        });

        window.dispatchEvent(new CustomEvent('radar-scan-triggered'));
    }

    _spawnSprintTrail() {
        const color = PLAYER_COLORS[this.playerType] ?? 0x7dff5a;
        const geo = new THREE.CircleGeometry(0.06 + Math.random() * 0.05, 6);
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, depthWrite: false });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        const ox = (Math.random() - 0.5) * 0.35;
        const oz = (Math.random() - 0.5) * 0.35;
        mesh.position.set(this.player.position.x + ox, 0.03, this.player.position.z + oz);
        this.scene.add(mesh);
        this.transientEffects.push({
            mesh,
            age: 0,
            maxAge: 0.28,
            update(dt) {
                this.age += dt;
                const t = this.age / this.maxAge;
                mesh.material.opacity = 0.55 * (1 - t);
                mesh.scale.setScalar(1 + t * 0.6);
            },
            dispose() { mesh.material.dispose(); mesh.geometry.dispose(); }
        });
    }

    updateVitals(delta) {
        if (!this.player || this.isPlayerDead) return;
        if (this.cinematicLock) return; // no O2 drain during scripted sequences
        if (this.godMode) {
            this.playerVitals.o2 = 100;
            this.playerVitals.o2HealthTimer = 0;
            this.emitO2State();
            return;
        }
        if (this.missionState?.status === 'inactive') return;

        const previousO2 = this.playerVitals.o2;
        const generatorState = this.getO2GeneratorState();
        const inBubble = generatorState.isOnline && this.getActiveO2GeneratorDistance() <= generatorState.radius;
        const reactorUpgrade = this.hasUpgrade('reactorCompressor');

        if (inBubble && !this._wasInBubble) {
            window.AudioManager?.play('ui_scan_ping', { volume: 0.22, playbackRate: 0.72, bus: 'sfx' });
        }
        this._wasInBubble = inBubble;

        const reactorLevel = this.bank.getState().reactorCompressorLevel ?? (reactorUpgrade ? 1 : 0);

        if (inBubble) {
            let refillMult = 1.0;
            if (reactorLevel === 1) refillMult = 1.2;
            else if (reactorLevel >= 2) refillMult = 2.0;

            let refillRate = generatorState.refillRate * refillMult
                * (this._abilityRefillMult ?? 1.0);
            if (this.playerType === 'TANK' && this.bank && this.bank.isSkillUnlocked('tank_special_upgrade_2') && this.classAbility.active) {
                refillRate *= 1.20;
            }
            this.playerVitals.o2 = Math.min(100, this.playerVitals.o2 + refillRate * delta);
            this.playerVitals.o2HealthTimer = 0;
        } else {
            let drainRate = O2_DRAIN_RATE_PCT_PER_SEC
                * (this.o2DrainMult ?? 1.0)
                * (this.currentBiomeO2DrainMult ?? 1.0)
                * (this._abilityO2DrainMult ?? 1.0)
                // THIN AIR run modifier: reserves are poor beyond the ship field.
                * (this.getRunCardEffects().survival?.o2DrainMult ?? (this.currentRunModifier?.id === 'thin_air' ? 1.4 : 1.0));
            if (this.playerType === 'TANK' && this.bank && this.bank.isSkillUnlocked('tank_o2_efficiency')) {
                drainRate *= 0.85;
            } else if (this.playerType === 'ENGINEER' && this.bank && this.bank.isSkillUnlocked('engineer_battery_1')) {
                drainRate *= 0.90;
            }
            if (this.playerVitals.o2 < O2_DANGER_THRESHOLD) {
                drainRate *= O2_DRAIN_RATE_DANGER_MULT;
            }
            if (reactorLevel === 1) {
                drainRate *= 0.8;
            } else if (reactorLevel >= 2) {
                drainRate *= 0.65;
            }
            // Tier 2 biome O2 drain reductions
            const t2Unlocks = this.bank?.getState?.()?.tier2Unlocks ?? {};
            // Space Heater (key kept as suitThermal): near-eliminates CRYO drain.
            if (t2Unlocks.suitThermal && this.currentBiomeKey === BIOME_KEYS.CRYO) {
                drainRate *= 0.2;
            }
            if (t2Unlocks.deconFilters && this.currentBiomeKey === BIOME_KEYS.BIO) {
                drainRate *= 0.5;
            }
            this.playerVitals.o2 = Math.max(0, this.playerVitals.o2 - drainRate * delta);

            if (this.playerVitals.o2 <= 0) {
                this.playerVitals.o2HealthTimer += delta;
                while (this.playerVitals.o2HealthTimer >= O2_HEALTH_DRAIN_INTERVAL && !this.isPlayerDead) {
                    this.playerVitals.o2HealthTimer -= O2_HEALTH_DRAIN_INTERVAL;
                    this.takeDamage(1, 'o2-depletion');
                }
            } else {
                this.playerVitals.o2HealthTimer = 0;
            }
        }

        if (this.o2BubbleObjects?.ring?.visible && !this.o2StartupSequenceActive) {
            const t = performance.now() * 0.001;
            const ringBaseScale = Math.max(0.01, generatorState.radius / O2_GENERATOR_RING_BASE_RADIUS);
            const pulse = ringBaseScale * (0.97 + Math.sin(t * 2.2) * 0.06);
            const opacity = 0.16 + Math.sin(t * 2.6) * 0.06;
            this.o2BubbleObjects.ring.scale.set(pulse, pulse, 1);
            this.o2BubbleObjects.ring.material.opacity = opacity;
            this.o2BubbleObjects.fill.scale.set(pulse, pulse, 1);
            this.o2BubbleObjects.fill.material.opacity = O2_SAFE_FILL_OPACITY + Math.sin(t * 2.1) * 0.035;
            this.o2BubbleObjects.light.intensity = 1.35 + Math.sin(t * 2.4) * 0.18;
        }

        this.o2DispatchTimer += delta;
        if (Math.abs(this.playerVitals.o2 - previousO2) >= 0.05 || this.o2DispatchTimer >= 0.12) {
            this.emitO2State();
            const modal = document.getElementById('console-terminal-modal');
            if (modal && !modal.classList.contains('hidden') && this.activeInteractiveConsole) {
                this.renderConsoleBanking(this.activeInteractiveConsole);
            }
            this.o2DispatchTimer = 0;
        }
    }

    updatePlayer(delta) {
        if (this.isPlayerDead) {
            this.isMoving = false;
            return;
        }

        // Handle falling in hole state
        if (this.isPlayerFalling) {
            this.isMoving = false;
            if (this.player) {
                this.player.position.y -= 3.5 * delta;
                this.player.rotation.y += 8.0 * delta;
                const newScale = Math.max(0, this.player.scale.x - 2.5 * delta);
                this.player.scale.set(newScale, newScale, newScale);
                
                if (this.player.position.y <= -2.5) {
                    this.isPlayerFalling = false;
                    this.takeDamage(999, 'abyss');
                }
            }
            return;
        }

        if (this.performanceProfile === 'gameplay' && !this.isGameplayInputActive()) {
            this.clearGameplayInputState();
        }

        // Check if player stepped on a hole
        if (this.player && this.performanceProfile === 'gameplay') {
            if (this.isPlayerOverAnyHole(this.player.position.x, this.player.position.z)) {
                this.isPlayerFalling = true;
                this.setInputEnabled(false);
                window.AudioManager?.play('amb_metal_stress', { volume: 0.8, playbackRate: 0.6 });
                this.spawnPhysicalBurst(this.player.position.x, this.player.position.z, { color: 0x111111, count: 12, upward: 0.2 });
                return;
            }
        }

        // Handle slow and poison status effects
        if (this.playerSlowTimer > 0) {
            this.playerSlowTimer = Math.max(0, this.playerSlowTimer - delta);
            this.tintPlayerSprites(0x88ccff); // blue frost tint
        } else if (this.playerPoisonTimer > 0) {
            const wasPoisoned = this.playerPoisonTimer > 0;
            this.playerPoisonTimer = Math.max(0, this.playerPoisonTimer - delta);
            this.playerPoisonTickTimer += delta;
            if (this.playerPoisonTickTimer >= 1.2) {
                this.playerPoisonTickTimer = 0;
                this.takeDamage(1, 'poison');
            }
            this.tintPlayerSprites(0x88ff88); // green poison tint
            if (wasPoisoned && this.playerPoisonTimer <= 0) {
                window.dispatchEvent(new CustomEvent('player-poison-cleared'));
            } else if (wasPoisoned) {
                window.dispatchEvent(new CustomEvent('player-poisoned', { detail: { timeLeft: this.playerPoisonTimer } }));
            }
        } else if (this.playerSprite?.material?.color && this.playerSprite.material.color.getHex() !== 0xffffff) {
            this.tintPlayerSprites(0xffffff);
        }

        const keyAxisX = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
        const keyAxisZ = (this.keys.down ? 1 : 0) - (this.keys.up ? 1 : 0);
        const screenAxisX = THREE.MathUtils.clamp(keyAxisX + this.virtualInput.x, -1, 1);
        const screenAxisZ = THREE.MathUtils.clamp(keyAxisZ + this.virtualInput.z, -1, 1);
        const moveAxisX = (this.cameraPlanarRight.x * screenAxisX) + (this.cameraPlanarForward.x * -screenAxisZ);
        const moveAxisZ = (this.cameraPlanarRight.y * screenAxisX) + (this.cameraPlanarForward.y * -screenAxisZ);
        const fortifyActive = this.classAbility?.active && CLASS_STATS[this.playerType]?.abilityKey === 'fortify';
        const isMoving = Boolean(moveAxisX || moveAxisZ) && !fortifyActive;
        let moveDirX = this.aimDirX || 1;
        let moveDirZ = this.aimDirZ || 0;
        this.isMoving = isMoving;

        if (isMoving) {
            const prevX = this.player.position.x;
            const prevZ = this.player.position.z;

            let speed = this.moveSpeed * (this._abilityMoveSpeedMult ?? 1.0);
            if (this.playerSlowTimer > 0 && !(this._abilityMoveSpeedMult > 1)) {
                speed *= 0.55;
            }
            const moveVector = new THREE.Vector3(moveAxisX, 0, moveAxisZ).normalize().multiplyScalar(speed * delta);
            const current = this.player.position.clone();
            const nextX = new THREE.Vector3(current.x + moveVector.x, current.y, current.z);
            const nextZ = new THREE.Vector3(current.x, current.y, current.z + moveVector.z);

            if (this.canOccupyPosition(nextX.x, nextX.z)) {
                this.player.position.x = nextX.x;
            }

            if (this.canOccupyPosition(nextZ.x, nextZ.z)) {
                this.player.position.z = nextZ.z;
            }

            const dx = this.player.position.x - prevX;
            const dz = this.player.position.z - prevZ;
            const movedDist = Math.hypot(dx, dz);
            if (movedDist > 0.0001) {
                moveDirX = dx / movedDist;
                moveDirZ = dz / movedDist;
            }
            this.totalDistanceTravelled += Math.sqrt(dx * dx + dz * dz);
        } else if (this.hasActiveAim) {
            moveDirX = this.aimDirX || 1;
            moveDirZ = this.aimDirZ || 0;
        }

        this.updatePlayerSpriteAnimation(screenAxisX, screenAxisZ, delta, isMoving, moveDirX, moveDirZ);
        // Keep night visibility centered on the player sprite under isometric camera.
        const spriteAnchorX = this.player.position.x + (this.playerSprite?.position.x ?? 0);
        const spriteAnchorZ = this.player.position.z + (this.playerSprite?.position.z ?? 0);
        this.playerGlow.position.set(
            spriteAnchorX + this.cameraPlanarForward.x * PLAYER_GLOW_SCREEN_OFFSET,
            1.6,
            spriteAnchorZ + this.cameraPlanarForward.y * PLAYER_GLOW_SCREEN_OFFSET
        );
        // Beam always points where you're shooting; once aim releases it swings
        // cleanly back to the actual travel heading (or holds the last facing
        // when standing still). The smoothing lives in updatePlayerForwardLight.
        const spriteFacing = this.getWorldDirectionForFacingRow(this.currentFacingRow);
        // Treat the aim as valid only when the vector isn't degenerate — testing
        // each component with `||` would wrongly discard a legitimate 0 (e.g. a
        // straight cardinal shot like {0,-1}), which left the demo beam pointing
        // the wrong way.
        const aimValid = this.hasActiveAim
            && (Math.abs(this.aimDirX) > 1e-4 || Math.abs(this.aimDirZ) > 1e-4);
        let lightDirX;
        let lightDirZ;
        if (aimValid) {
            lightDirX = this.aimDirX;
            lightDirZ = this.aimDirZ;
        } else if (isMoving) {
            lightDirX = moveDirX;
            lightDirZ = moveDirZ;
        } else {
            lightDirX = spriteFacing.x;
            lightDirZ = spriteFacing.z;
        }
        this.updatePlayerForwardLight(delta, { directionX: lightDirX, directionZ: lightDirZ });
        this.playerMarker.position.set(this.player.position.x, this.playerMarkerHeight, this.player.position.z);
        if (this.isPositionInPuddle(this.player.position.x, this.player.position.z)) {
            this.wetFootprintTrailTime = WET_FOOTPRINT_TRAIL_SECONDS;
        } else {
            this.wetFootprintTrailTime = Math.max(0, this.wetFootprintTrailTime - delta);
        }

        if (isMoving) {
            this.footstepTimer += delta;
            const stepInterval = 0.38 + (this.moveSpeed > 4 ? -0.08 : this.moveSpeed < 3 ? 0.08 : 0);
            if (this.footstepTimer >= stepInterval) {
                this.footstepTimer = 0;
                const footRate = 1.6 + Math.random() * 0.3;
                if (this.performanceProfile !== 'menu') {
                    window.AudioManager?.play('amb_metal_stress', { volume: 0.055, playbackRate: footRate });
                    if (this.wetFootprintTrailTime > 0.04) {
                        this.spawnWetFootprint(this.player.position.x, this.player.position.z, moveDirX, moveDirZ);
                    }
                    if (this.isRainWeatherActive()) {
                        this.spawnRainSplash(
                            this.player.position.x + (Math.random() - 0.5) * 0.24,
                            this.player.position.z + (Math.random() - 0.5) * 0.24,
                            1.15
                        );
                    }
                }
            }
        } else {
            this.footstepTimer = 0;
        }

        // Survey mission: complete when player reaches target depth from ship
        if (this.missionState?.type === 'survey' && this.missionState.status === 'active') {
            if (this.getActiveO2GeneratorDistance() >= this.missionState.targetDepth) {
                this.missionState.status = 'objective_complete';
                const uplink = this.getMothershipUplinkReadiness();
                window.dispatchEvent(new CustomEvent('mission-objective-complete', {
                    detail: { type: 'survey', uplinkReady: uplink.ready, uplink }
                }));
            }
        }

        // Extraction: countdown timer when objective is complete and player is near ship
        if (this.missionState?.status === 'objective_complete' && !this.isPlayerDead) {
            const uplink = this.getMothershipUplinkReadiness();
            if (!uplink.ready) {
                this.missionState.extractionTimer = 0;
                if (!this._blockedExtractionSignalFired) {
                    this._blockedExtractionSignalFired = true;
                    window.dispatchEvent(new CustomEvent('extraction-blocked', {
                        detail: {
                            missionType: this.missionState?.type ?? null,
                            missionStatus: this.missionState?.status ?? null,
                            uplink
                        }
                    }));
                }
                window.dispatchEvent(new CustomEvent('extraction-progress', {
                    detail: { progress: 0, active: false }
                }));
                return;
            }
            const distToShip = this.getActiveO2GeneratorDistance();
            if (distToShip < 3.5) {
                // Greed has teeth (doc 11 §4.C): the deeper you went, the harder the
                // bunker fights your departure. Fires once as extraction charging begins.
                if (!this._extractionLockdownFired) {
                    this._extractionLockdownFired = true;
                    const depth = this.maxDepthTierReached ?? 0;
                    if (depth >= 2) {
                        this.showBunkerLine('DEPARTURE DETECTED. RETENTION PROTOCOL ENGAGED. PLEASE REMAIN FOR PROCESSING.');
                        this.spawnPatrolNearPlayer();
                        if (depth >= 3) this.corruptCompass(12);
                    } else {
                        this.showBunkerLine('EXTRACTION UPLINK FORMING. TRY NOT TO DIE DURING PAPERWORK.');
                    }
                }
                this.missionState.extractionTimer = (this.missionState.extractionTimer ?? 0) + delta;
                if (this.missionState.extractionTimer >= 10) {
                    this.startElevatorDownSequence();
                    return;
                }
                window.dispatchEvent(new CustomEvent('extraction-progress', {
                    detail: { progress: Math.min(1, this.missionState.extractionTimer / 10), active: true }
                }));
            } else {
                this.missionState.extractionTimer = Math.max(0, (this.missionState.extractionTimer ?? 0) - delta * 2);
                window.dispatchEvent(new CustomEvent('extraction-progress', {
                    detail: { progress: Math.min(1, this.missionState.extractionTimer / 10), active: false }
                }));
            }
        }

        if (this.missionState?.status === 'elevator_down' && !this.isPlayerDead) {
            this.missionState.elevatorTimer = (this.missionState.elevatorTimer ?? 0) + delta;
            this.missionState.elevatorThreatTimer = (this.missionState.elevatorThreatTimer ?? 0) + delta;
            if (this.missionState.elevatorThreatTimer >= 15) {
                this.missionState.elevatorThreatTimer = 0;
                this.spawnPatrolNearPlayer();
            }
            if (this.missionState.elevatorTimer >= 90) {
                this.missionState.status = 'elevator_ready';
                window.dispatchEvent(new CustomEvent('elevator-choice-ready'));
            } else {
                window.dispatchEvent(new CustomEvent('elevator-progress', {
                    detail: { progress: Math.min(1, this.missionState.elevatorTimer / 90), secondsRemaining: Math.ceil(90 - this.missionState.elevatorTimer) }
                }));
            }
        }
    }

    startElevatorDownSequence() {
        if (!this.missionState || this.missionState.status === 'elevator_down' || this.missionState.status === 'elevator_ready') return;
        this.missionState.status = 'elevator_down';
        this.missionState.elevatorTimer = 0;
        this.missionState.elevatorThreatTimer = 12;
        this.triggerLightsOut(14);
        this.showBunkerLine('ELEVATOR DOWN SEQUENCE ACCEPTED. ARRIVAL IN NINETY SECONDS. HOLD THE WRECK.');
        window.dispatchEvent(new CustomEvent('elevator-sequence-started'));
    }

    resolveElevatorChoice(choice = 'extract') {
        if (this.missionState?.status !== 'elevator_ready') return;
        if (choice === 'descend') {
            this.missionState.status = 'active';
            this.missionState.extractionTimer = 0;
            this.missionState.targetDepth = Math.max(this.missionState.targetDepth ?? 0, this.getActiveO2GeneratorDistance() + 90);
            this.globalSeedOffset = (this.globalSeedOffset + 7919) | 0;
            this.syncVisibleChunks(true);
            this.showBunkerLine('DESCENT CONFIRMED. DEEPER SECTOR INDEX LOADED. THIS WAS A CHOICE.');
            window.dispatchEvent(new CustomEvent('elevator-descended'));
            return;
        }
        this.handleExtraction({ skipElevator: true });
    }

    onNewChunkDiscovered(chunkX, chunkY) {
        const centerX = chunkX * this.chunkSize + this.chunkSize * 0.5;
        const centerZ = chunkY * this.chunkSize + this.chunkSize * 0.5;
        const biomeKey = this.getBiomeKeyForWorldPosition(centerX, centerZ);
        const depthTier = getDepthTier(chunkX, chunkY);
        if (depthTier >= 1) {
            const drips = ['amb_drip1', 'amb_drip2', 'amb_drip3', 'amb_drip4'];
            const pick = drips[Math.floor(Math.random() * drips.length)];
            const vol = 0.08 + depthTier * 0.04 + (biomeKey === 'cryo' ? 0.05 : 0);
            setTimeout(() => {
                window.AudioManager?.play(pick, { volume: vol, playbackRate: 0.82 + Math.random() * 0.36, bus: 'world' });
            }, 200 + Math.random() * 400);
        }
        // Fire special room discovery event
        const template = this.getChunkTemplate(chunkX, chunkY);
        if (template) {
            const cfg = ROOM_TEMPLATE_CONFIGS[template];
            window.dispatchEvent(new CustomEvent('special-room-discovered', {
                detail: {
                    template,
                    label: cfg?.label ?? template.toUpperCase(),
                    x: centerX,
                    z: centerZ,
                    biome: biomeKey
                }
            }));
        }
    }

    getDepthTier(chunkX, chunkY) {
        return getDepthTier(chunkX, chunkY);
    }

    getDepthTierName(depthTier) {
        const index = Math.max(0, Math.min(DEPTH_TIER_NAMES.length - 1, Math.floor(depthTier)));
        return DEPTH_TIER_NAMES[index];
    }

    getDepthLootConfigForWorldPosition(worldX, worldZ) {
        const chunkX = Math.floor(worldX / this.chunkSize);
        const chunkY = Math.floor(worldZ / this.chunkSize);
        return getDepthLootConfig(this.getDepthTier(chunkX, chunkY));
    }

    getBiomeAnchorPosition() {
        const ship = this.getActiveShip();
        if (ship) {
            return { x: ship.tileX, z: ship.tileZ };
        }

        const spawn = this.getSpawnTile();
        return { x: spawn.x, z: spawn.y };
    }

    getBiomeMixValues(distanceFromAnchor) {
        const distance = Number.isFinite(distanceFromAnchor) ? Math.max(0, distanceFromAnchor) : 0;
        const cryoMix = THREE.MathUtils.clamp(
            THREE.MathUtils.smoothstep(
                distance,
                BIOME_THRESHOLD_CRYO - BIOME_BLEND_HALF_WIDTH,
                BIOME_THRESHOLD_CRYO + BIOME_BLEND_HALF_WIDTH
            ),
            0,
            1
        );
        const bioMix = THREE.MathUtils.clamp(
            THREE.MathUtils.smoothstep(
                distance,
                BIOME_THRESHOLD_BIO - BIOME_BLEND_HALF_WIDTH,
                BIOME_THRESHOLD_BIO + BIOME_BLEND_HALF_WIDTH
            ),
            0,
            1
        );
        return { cryoMix, bioMix };
    }

    getBiomeKeyFromDistance(distanceFromAnchor) {
        if (distanceFromAnchor >= BIOME_THRESHOLD_BIO) {
            return BIOME_KEYS.BIO;
        }

        if (distanceFromAnchor >= BIOME_THRESHOLD_CRYO) {
            return BIOME_KEYS.CRYO;
        }

        return BIOME_KEYS.ACTIVE;
    }

    getBiomeKeyForWorldPosition(worldX, worldZ) {
        const anchor = this.getBiomeAnchorPosition();
        const distance = Math.hypot(worldX - anchor.x, worldZ - anchor.z);
        return this.getBiomeKeyFromDistance(distance);
    }

    getBiomeLabel(biomeKey = this.currentBiomeKey) {
        return BIOME_LABELS[biomeKey] ?? BIOME_LABELS[BIOME_KEYS.ACTIVE];
    }

    emitBiomeChanged(biomeKey, distanceFromAnchor = 0) {
        const key = BIOME_ORDER.includes(biomeKey) ? biomeKey : BIOME_KEYS.ACTIVE;
        window.dispatchEvent(new CustomEvent('biome-changed', {
            detail: {
                key,
                label: this.getBiomeLabel(key),
                distance: Math.round(distanceFromAnchor),
                o2DrainMultiplier: BIOME_O2_DRAIN_MULTIPLIERS[key] ?? 1,
                message: BIOME_NOTIFICATION_MESSAGES[key] ?? ''
            }
        }));
    }

    blendBiomeColor(activeHex, cryoHex, bioHex, cryoMix, bioMix, lowColor, highColor) {
        lowColor.setHex(activeHex).lerp(highColor.setHex(cryoHex), cryoMix);
        return lowColor.lerp(highColor.setHex(bioHex), bioMix);
    }

    updateBiomeLighting(cryoMix, bioMix, delta = 0.016, immediate = false) {
        if (!this.scene?.fog || !this.ambientLight || !this.directionalLight || !this.fillLight) {
            return;
        }

        const lerpAlpha = immediate
            ? 1
            : THREE.MathUtils.clamp(delta * 3.6, 0.04, 0.2);
        const blendedFog = this.blendBiomeColor(
            BIOME_LIGHTING[BIOME_KEYS.ACTIVE].fog,
            BIOME_LIGHTING[BIOME_KEYS.CRYO].fog,
            BIOME_LIGHTING[BIOME_KEYS.BIO].fog,
            cryoMix,
            bioMix,
            this.biomeLightingColors.fogA,
            this.biomeLightingColors.fogB
        );
        this.scene.fog.color.lerp(blendedFog, lerpAlpha);
        if (this.scene.background?.isColor) {
            this.scene.background.lerp(blendedFog, lerpAlpha * 0.85);
        }

        const blendedAmbient = this.blendBiomeColor(
            BIOME_LIGHTING[BIOME_KEYS.ACTIVE].ambient,
            BIOME_LIGHTING[BIOME_KEYS.CRYO].ambient,
            BIOME_LIGHTING[BIOME_KEYS.BIO].ambient,
            cryoMix,
            bioMix,
            this.biomeLightingColors.ambientA,
            this.biomeLightingColors.ambientB
        );
        this.ambientLight.color.lerp(blendedAmbient, lerpAlpha);

        const blendedDirectional = this.blendBiomeColor(
            BIOME_LIGHTING[BIOME_KEYS.ACTIVE].directional,
            BIOME_LIGHTING[BIOME_KEYS.CRYO].directional,
            BIOME_LIGHTING[BIOME_KEYS.BIO].directional,
            cryoMix,
            bioMix,
            this.biomeLightingColors.directionalA,
            this.biomeLightingColors.directionalB
        );
        this.directionalLight.color.lerp(blendedDirectional, lerpAlpha);

        const blendedHemiSky = this.blendBiomeColor(
            BIOME_LIGHTING[BIOME_KEYS.ACTIVE].hemisphereSky,
            BIOME_LIGHTING[BIOME_KEYS.CRYO].hemisphereSky,
            BIOME_LIGHTING[BIOME_KEYS.BIO].hemisphereSky,
            cryoMix,
            bioMix,
            this.biomeLightingColors.hemiSkyA,
            this.biomeLightingColors.hemiSkyB
        );
        this.fillLight.color.lerp(blendedHemiSky, lerpAlpha);

        const blendedHemiGround = this.blendBiomeColor(
            BIOME_LIGHTING[BIOME_KEYS.ACTIVE].hemisphereGround,
            BIOME_LIGHTING[BIOME_KEYS.CRYO].hemisphereGround,
            BIOME_LIGHTING[BIOME_KEYS.BIO].hemisphereGround,
            cryoMix,
            bioMix,
            this.biomeLightingColors.hemiGroundA,
            this.biomeLightingColors.hemiGroundB
        );
        this.fillLight.groundColor.lerp(blendedHemiGround, lerpAlpha);
    }

    updateBiomeEnvironment({ delta = 0.016, immediate = false, forceEvent = false } = {}) {
        if (!this.player) return;

        const anchor = this.getBiomeAnchorPosition();
        this.biomeShipAnchor.set(anchor.x, anchor.z);
        const distanceFromAnchor = Math.hypot(
            this.player.position.x - anchor.x,
            this.player.position.z - anchor.z
        );
        const { cryoMix, bioMix } = this.getBiomeMixValues(distanceFromAnchor);
        this.biomeMixState = { cryoMix, bioMix };

        if (this.floorShaderUniforms?.uShipWorldPos) {
            this.floorShaderUniforms.uShipWorldPos.value = this.biomeShipAnchor;
        }
        if (this.wallShaderUniforms?.uShipWorldPos) {
            this.wallShaderUniforms.uShipWorldPos.value = this.biomeShipAnchor;
        }

        this.updateBiomeLighting(cryoMix, bioMix, delta, immediate);

        const nextBiomeKey = this.getBiomeKeyFromDistance(distanceFromAnchor);
        this.currentBiomeO2DrainMult = BIOME_O2_DRAIN_MULTIPLIERS[nextBiomeKey] ?? 1;
        if (nextBiomeKey !== this.currentBiomeKey || forceEvent) {
            this.currentBiomeKey = nextBiomeKey;
            this.emitBiomeChanged(nextBiomeKey, distanceFromAnchor);
        }
    }

    // Day/night cycle (Note 8). Orthographic framing => no skybox; mood reads
    // through light intensity and fog. Modulates intensities multiplicatively and
    // tightens fog at night, layered on top of the biome color work so biome
    // identity is preserved. Advances only while gameplay input is enabled, so
    // menus/cutscenes/terminals effectively pause the clock (ask A6).
    getDayFactor() {
        // 0 at midnight, 1 at noon, smooth cosine.
        return 0.5 - 0.5 * Math.cos(this.timeOfDay * Math.PI * 2);
    }

    // "HH:MM · DAY|NIGHT" string for the terminal clock readout (Note 8 display).
    getTimeOfDayLabel() {
        const totalMinutes = Math.floor((this.timeOfDay % 1) * 24 * 60);
        const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
        const mm = String(totalMinutes % 60).padStart(2, '0');
        const phase = this.getDayFactor() >= 0.5 ? 'DAY' : 'NIGHT';
        return `${hh}:${mm} · ${phase}`;
    }

    // Seconds survived this run (since the last run reset).
    getRunElapsedSeconds() {
        return Math.max(0, Math.floor((Date.now() - (this.runStartTime ?? Date.now())) / 1000));
    }

    // Live-tick the terminal clock (~1/sec) while the terminal modal is open.
    updateTerminalClockTick(now = performance.now()) {
        const modal = document.getElementById('console-terminal-modal');
        if (!modal || modal.classList.contains('hidden')) return;
        if (now - (this._lastTerminalClockTick ?? 0) < 500) return;
        this._lastTerminalClockTick = now;
        this.updateTerminalClock();
    }

    // Refresh the terminal's TIME OF DAY / SURVIVED readouts. Called on terminal
    // render and, while the terminal is open, ticked live from the render loop.
    updateTerminalClock() {
        const todEl = document.getElementById('terminal-time-of-day');
        if (todEl) todEl.textContent = this.getTimeOfDayLabel();
        const survEl = document.getElementById('terminal-time-survived');
        if (survEl) {
            const secs = this.getRunElapsedSeconds();
            const mm = String(Math.floor(secs / 60)).padStart(2, '0');
            const ss = String(secs % 60).padStart(2, '0');
            survEl.textContent = `${mm}:${ss}`;
        }
    }

    updateDayNightCycle(delta) {
        if (!this.baseLightIntensity || !this.scene?.fog) return;
        if (this.isGameplayInputActive()) {
            this.timeOfDay = (this.timeOfDay + delta / this.dayCycleSeconds) % 1;
        }

        const day = this.getDayFactor();
        const lerp = THREE.MathUtils.lerp;
        // Extra smoothing plus tighter ranges keeps dusk/dawn transitions subtle.
        let dayBlend = this.nightVision ? 1.0 : THREE.MathUtils.smoothstep(day, 0.1, 0.9);
        // Terminal "lights-out" downside (triggerLightsOut): hold full darkness for
        // the event's duration via the normal lighting pipeline, then release.
        if (!this.nightVision && performance.now() < (this._lightsOutUntil ?? 0)) {
            dayBlend = 0;
        }
        this.ambientLight.intensity = this.baseLightIntensity.ambient * lerp(0.72, 1.0, dayBlend);
        this.directionalLight.intensity = this.baseLightIntensity.directional * lerp(0.55, 1.0, dayBlend);
        this.fillLight.intensity = this.baseLightIntensity.fill * lerp(0.72, 1.05, dayBlend);
        const weatherLightMult = this.nightVision ? 1.0 : (this.weather?.lightMult ?? 1);
        if (weatherLightMult !== 1) {
            this.ambientLight.intensity *= weatherLightMult;
            this.directionalLight.intensity *= Math.max(0.6, weatherLightMult - 0.05);
            this.fillLight.intensity *= Math.min(1, weatherLightMult + 0.06);
        }

        const minAmbientFloor = 0.65;
        if (this.ambientLight.intensity < minAmbientFloor) {
            this.ambientLight.intensity = minAmbientFloor;
        }
        // Player's own glow matters a little more in the dark.
        if (this.playerGlow) {
            this.playerGlow.intensity = this.baseLightIntensity.playerGlow * lerp(2.6, 1.12, dayBlend);
            this.playerGlow.distance = lerp(16.5, 10.8, dayBlend);
            this.playerGlow.decay = lerp(1.35, 1.7, dayBlend);
        }
        if (this.suitFillLight) {
            const movePulse = this.isMoving ? 0.14 * (0.5 + 0.5 * Math.sin(performance.now() * 0.011)) : 0;
            this.suitFillLight.intensity = SUIT_LIGHT_BASE_INTENSITY * lerp(1.28, 0.74, dayBlend) * (1 + movePulse);
            this.suitFillLight.distance = SUIT_LIGHT_BASE_DISTANCE * lerp(1.18, 0.92, dayBlend);
            this.suitFillLight.decay = lerp(1.08, 1.32, dayBlend);
        }
        if (this.playerForwardSpotLight) {
            const pulse = this.isMoving ? 0.08 * (0.5 + 0.5 * Math.sin(performance.now() * 0.013)) : 0;
            this.playerForwardSpotLight.intensity = 5.8 * lerp(2.25, 0.82, dayBlend) * (1 + pulse);
            this.playerForwardSpotLight.distance = SUIT_CONE_LIGHT_DISTANCE * lerp(1.32, 0.88, dayBlend);
            this.playerForwardSpotLight.angle = SUIT_CONE_LIGHT_ANGLE * lerp(1.08, 0.92, dayBlend);
        }
        if (this.playerForwardCone?.material) {
            this.playerForwardCone.material.opacity = SUIT_CONE_VISUAL_OPACITY * lerp(0.72, 0.28, dayBlend);
        }
        if (this.playerLightPool?.material) {
            this.playerLightPool.material.opacity = SUIT_LOCAL_LIGHT_POOL_OPACITY * lerp(1.85, 0.48, dayBlend);
        }
        if (this.playerEmitterGlow?.material) {
            this.playerEmitterGlow.material.opacity = 0.58 * lerp(1.16, 0.46, dayBlend);
        }

        // Keep night visibility screen-radial. Three.js fog is camera-depth
        // based in this isometric view, which makes the top of the canvas darker
        // than the bottom and makes "up-screen" flashlight aim feel weaker.
        // The darkness canvas owns night falloff; fog stays mostly atmospheric.
        this.scene.fog.near = this.nightVision ? 1000 : lerp(this.baseFogRange.near * 4.0, this.baseFogRange.near * 1.05, dayBlend);
        this.scene.fog.far = this.nightVision ? 10000 : lerp(this.baseFogRange.far * 12.0, this.baseFogRange.far * 1.25, dayBlend);

        // Weather can further reduce visibility (applied multiplicatively; day/night
        // resets fog each frame so this never accumulates).
        const wMult = this.nightVision ? 1 : (this.weather?.fogFarMult ?? 1);
        if (wMult !== 1) {
            this.scene.fog.far *= Math.max(0.72, wMult);
            this.scene.fog.near *= Math.max(0.9, wMult);
        }

        // Radial darkness around the player. Darkest at night and in heavy weather.
        const weatherDark = this.nightVision ? 0 : ((1 - wMult) * 0.6);
        let darkAlpha = this.nightVision ? 0 : THREE.MathUtils.clamp(lerp(0.30, 0.02, dayBlend) + weatherDark, 0, 0.55);
        const generatorState = this.getO2GeneratorState?.();
        if (generatorState?.isOnline && this.getActiveO2GeneratorDistance() <= generatorState.radius) {
            darkAlpha *= 0.18;
        }
        this.updatePlayerDarkness(darkAlpha);
    }

    updatePlayerForwardLight(delta = 0.016, { immediate = false, directionX = null, directionZ = null } = {}) {
        if (!this.player || !this.playerForwardCone || !this.playerForwardSpotLight || !this.playerForwardLightTarget) return;

        const fallbackDirection = this.getWorldDirectionForFacingRow?.(this.currentFacingRow) ?? { x: this.playerForwardDir.x, z: this.playerForwardDir.y };
        let targetX = Number.isFinite(directionX) ? directionX : fallbackDirection.x;
        let targetZ = Number.isFinite(directionZ) ? directionZ : fallbackDirection.z;
        const targetLength = Math.hypot(targetX, targetZ);
        if (targetLength > 0.0001) {
            targetX /= targetLength;
            targetZ /= targetLength;
            this._playerForwardDirTarget.set(targetX, targetZ);
        }

        const blend = immediate ? 1 : THREE.MathUtils.clamp(delta * 16, 0.1, 0.6);
        this.playerForwardDir.lerp(this._playerForwardDirTarget, blend);
        const length = this.playerForwardDir.length();
        if (length <= 0.0001) {
            this.playerForwardDir.set(0, 1);
        } else {
            this.playerForwardDir.multiplyScalar(1 / length);
        }

        const dirX = this.playerForwardDir.x;
        const dirZ = this.playerForwardDir.y;
        const originX = this.player.position.x;
        const originZ = this.player.position.z;
        if (this.playerLightPool) {
            this.playerLightPool.position.set(originX, 0.071, originZ);
        }
        if (this.playerEmitterGlow) {
            this.playerEmitterGlow.position.set(originX, SUIT_LIGHT_EMITTER_HEIGHT, originZ);
        }
        const facingAngle = Math.atan2(dirX, dirZ);
        this.playerForwardCone.position.set(
            originX,
            0.074,
            originZ
        );
        this.playerForwardCone.rotation.y = facingAngle;
        this.updatePlayerConeOcclusion(originX, originZ, facingAngle);

        this.playerForwardSpotLight.position.set(
            originX,
            SUIT_LIGHT_EMITTER_HEIGHT,
            originZ
        );
        this.playerForwardLightTarget.position.set(
            originX + dirX * SUIT_CONE_LIGHT_DISTANCE,
            0.28,
            originZ + dirZ * SUIT_CONE_LIGHT_DISTANCE
        );
    }

    // Pushes each rim vertex of the beam fan out to the wall it hits, so the
    // visible cone is carved per-direction by the geometry around it. Light is
    // blocked behind walls and pours through gaps, rather than the whole beam
    // collapsing to the nearest center-ray obstacle.
    updatePlayerConeOcclusion(originX, originZ, facingAngle) {
        const attr = this._conePositionAttr;
        const rimAngles = this._coneRimAngles;
        if (!attr || !rimAngles) return;

        const array = attr.array;
        const haveWalls = this.performanceProfile === 'gameplay' && this.wallMeshes?.length > 0;

        if (!haveWalls) {
            // Menu / no geometry: restore the full unobstructed fan.
            for (let i = 0; i < rimAngles.length; i++) {
                const angle = rimAngles[i];
                const vi = (i + 1) * 3;
                array[vi] = Math.sin(angle) * SUIT_CONE_VISUAL_DISTANCE;
                array[vi + 1] = 0;
                array[vi + 2] = Math.cos(angle) * SUIT_CONE_VISUAL_DISTANCE;
            }
            attr.needsUpdate = true;
            return;
        }

        const raycaster = this._lightOcclusionRaycaster;
        raycaster.near = 0.05;
        raycaster.far = SUIT_CONE_VISUAL_DISTANCE;
        this._coneRayOrigin = this._coneRayOrigin ?? new THREE.Vector3();
        this._coneRayDir = this._coneRayDir ?? new THREE.Vector3();
        this._coneRayOrigin.set(originX, SUIT_LIGHT_EMITTER_HEIGHT, originZ);

        for (let i = 0; i < rimAngles.length; i++) {
            const angle = rimAngles[i];
            const worldAngle = facingAngle + angle;
            this._coneRayDir.set(Math.sin(worldAngle), 0, Math.cos(worldAngle));
            raycaster.set(this._coneRayOrigin, this._coneRayDir);
            const hit = raycaster.intersectObjects(this.wallMeshes, false)[0];
            const dist = hit
                ? Math.max(0.4, hit.distance - SUIT_LIGHT_WALL_PADDING)
                : SUIT_CONE_VISUAL_DISTANCE;
            const vi = (i + 1) * 3;
            // Rim stays in the cone's local frame (apex forward = +Z); the mesh
            // rotation already orients it, so only the local angle is used here.
            array[vi] = Math.sin(angle) * dist;
            array[vi + 1] = hit ? (this.wallHeight - 0.2) : 0;
            array[vi + 2] = Math.cos(angle) * dist;
        }
        attr.needsUpdate = true;
    }

    // Positions and tints the radial "fog of war" overlay so the murk forms a
    // circle around the player sprite instead of a camera-depth band.
    updatePlayerDarkness(alpha) {
        const overlay = this.darknessOverlay;
        const ctx = this.darknessOverlayContext;
        if (!overlay || !ctx || !this.player || !this.camera) return;
        const w = this.container.clientWidth || 1;
        const h = this.container.clientHeight || 1;
        const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
        const targetW = Math.max(1, Math.round(w * dpr));
        const targetH = Math.max(1, Math.round(h * dpr));
        if (overlay.width !== targetW || overlay.height !== targetH) {
            overlay.width = targetW;
            overlay.height = targetH;
            overlay.style.width = `${w}px`;
            overlay.style.height = `${h}px`;
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        if (alpha <= 0.02) {
            overlay.style.opacity = '0';
            return;
        }

        // Project the player's torso to screen pixels. The camera looks at this
        // anchor, so the bubble lands on the player and tracks them as they move.
        this._darknessCenter.set(
            this.player.position.x,
            this.player.position.y + 0.7,
            this.player.position.z
        ).project(this.camera);
        const cx = (this._darknessCenter.x * 0.5 + 0.5) * w;
        const cy = (-this._darknessCenter.y * 0.5 + 0.5) * h;

        const fog = this.scene.fog?.color;
        const r = fog ? Math.round(fog.r * 255) : 8;
        const g = fog ? Math.round(fog.g * 255) : 10;
        const b = fog ? Math.round(fog.b * 255) : 14;

        // A tight circle of clarity around the player that ramps to fully dark
        // well within the viewport, so every edge — including the bottom — goes
        // dark instead of leaving a permanently-lit band. The final stop colour
        // continues past darkRadius, so the screen corners stay solid.
        const minDim = Math.min(w, h);
        const clearRadius = Math.max(308, minDim * 0.48);
        const darkRadius = clearRadius + minDim * 0.68;
        const midRadius = clearRadius + (darkRadius - clearRadius) * 0.5;

        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
        ctx.fillRect(0, 0, w, h);

        ctx.globalCompositeOperation = 'destination-out';
        const playerClear = ctx.createRadialGradient(cx, cy, 0, cx, cy, darkRadius);
        const clearStop = THREE.MathUtils.clamp(clearRadius / darkRadius, 0, 0.96);
        const midStop = THREE.MathUtils.clamp(midRadius / darkRadius, clearStop + 0.01, 0.98);
        playerClear.addColorStop(0, 'rgba(0, 0, 0, 1)');
        playerClear.addColorStop(clearStop, 'rgba(0, 0, 0, 1)');
        playerClear.addColorStop(midStop, 'rgba(0, 0, 0, 0.5)');
        playerClear.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = playerClear;
        ctx.beginPath();
        ctx.arc(cx, cy, darkRadius, 0, Math.PI * 2);
        ctx.fill();

        this.carveFlashlightDarkness(ctx, w, h);
        ctx.globalCompositeOperation = 'source-over';
        overlay.style.opacity = '1';
    }

    buildFlashlightScreenPath(ctx, points) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();
    }

    carveFlashlightDarkness(ctx, w, h) {
        const cone = this.playerForwardCone;
        const attr = this._conePositionAttr;
        if (
            this.nightVision ||
            !cone ||
            !attr ||
            !this.camera ||
            !this.playerForwardSpotLight ||
            this.playerForwardSpotLight.intensity <= 0.01
        ) {
            return;
        }

        cone.updateMatrixWorld(true);
        const points = this._darknessConeScreenPoints;
        points.length = 0;
        for (let i = 0; i < attr.count; i++) {
            this._darknessConePoint.fromBufferAttribute(attr, i);
            cone.localToWorld(this._darknessConePoint);
            this._darknessConePoint.project(this.camera);
            points.push({
                x: (this._darknessConePoint.x * 0.5 + 0.5) * w,
                y: (-this._darknessConePoint.y * 0.5 + 0.5) * h
            });
        }
        if (points.length < 3) return;

        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.filter = `blur(${THREE.MathUtils.clamp(Math.min(w, h) * 0.014, 7, 13).toFixed(1)}px)`;
        this.buildFlashlightScreenPath(ctx, points);
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.fill();
        ctx.restore();
    }

    hasWallBetween(x1, z1, x2, z2) {
        if (this.wallMeshes.length === 0) return false;

        const origin = new THREE.Vector3(x1, SUIT_LIGHT_EMITTER_HEIGHT, z1);
        const target = new THREE.Vector3(x2, SUIT_LIGHT_EMITTER_HEIGHT, z2);
        const direction = target.clone().sub(origin);
        const distance = direction.length();
        if (distance <= 0.1) return false;

        direction.normalize();
        this._lightOcclusionRaycaster.set(origin, direction);
        this._lightOcclusionRaycaster.far = distance;

        const hits = this._lightOcclusionRaycaster.intersectObjects(this.wallMeshes, false);
        return hits.length > 0;
    }

    getFogOfWarVisibility(x, z) {
        if (!this.player || this.nightVision) return 1;

        if (this.activeRadarScans) {
            for (const scan of this.activeRadarScans) {
                const dist = Math.hypot(x - scan.x, z - scan.z);
                if (dist <= scan.currentRadius) {
                    return 1.0;
                }
            }
        }

        const generatorState = this.getO2GeneratorState?.();
        const generatorPos = this.getActiveO2GeneratorPosition?.();
        if (generatorState?.isOnline && generatorPos) {
            const o2Dist = Math.hypot(x - generatorPos.x, z - generatorPos.z);
            if (o2Dist <= generatorState.radius) return 1;
        }
        const distance = Math.hypot(x - this.player.position.x, z - this.player.position.z);
        if (distance <= 0.001) return 1;

        // 1. Ambient radial visibility around player
        const fadeStart = FOG_OF_WAR_CLEAR_RADIUS;
        const fadeEnd = FOG_OF_WAR_CLEAR_RADIUS + FOG_OF_WAR_FADE_RADIUS;
        let ambientVis = FOG_OF_WAR_MIN_VISIBILITY;
        if (distance <= fadeStart) {
            ambientVis = 1;
        } else if (distance < fadeEnd) {
            const t = (distance - fadeStart) / Math.max(0.001, fadeEnd - fadeStart);
            ambientVis = THREE.MathUtils.lerp(1, FOG_OF_WAR_MIN_VISIBILITY, t * t * (3 - 2 * t));
        }

        // 2. Flashlight cone visibility
        let flashlightVis = 0;
        if (distance <= SUIT_CONE_LIGHT_DISTANCE) {
            const dx = x - this.player.position.x;
            const dz = z - this.player.position.z;
            const dot = (dx * this.playerForwardDir.x + dz * this.playerForwardDir.y) / distance;
            const cosLimit = Math.cos(SUIT_CONE_LIGHT_ANGLE);
            if (dot >= cosLimit) {
                // Check if blocked by walls
                if (!this.hasWallBetween(this.player.position.x, this.player.position.z, x, z)) {
                    const edgeFade = THREE.MathUtils.smoothstep(dot, cosLimit, cosLimit + 0.12);
                    const distanceFade = 1.0 - THREE.MathUtils.smoothstep(distance, SUIT_CONE_LIGHT_DISTANCE * 0.72, SUIT_CONE_LIGHT_DISTANCE);
                    flashlightVis = edgeFade * distanceFade;
                }
            }
        }

        return Math.min(1, Math.max(ambientVis, flashlightVis));
    }

    applyFogOfWarOpacity(object, visibility, { captureCurrent = false } = {}) {
        object?.traverse?.((child) => {
            const material = child.material;
            if (!material) return;
            const materials = Array.isArray(material) ? material : [material];
            for (const mat of materials) {
                if (!mat) continue;
                const previousVisibility = mat.userData.fogVisibility ?? 1;
                const baseOpacity = captureCurrent
                    ? (mat.opacity ?? 1)
                    : (mat.opacity ?? 1) / Math.max(0.001, previousVisibility);
                mat.transparent = true;
                mat.opacity = baseOpacity * visibility;
                mat.userData.fogVisibility = visibility;
            }
        });
    }

    // ── Weather (Note 9) ──────────────────────────────────────────
    ensureWeatherField() {
        if (this.weather.points) return;
        const positions = new Float32Array(WEATHER_PARTICLE_CAP * 3);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setDrawRange(0, 0);
        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.16,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.8,
            depthWrite: false,
            fog: false
        });
        const points = new THREE.Points(geometry, material);
        points.frustumCulled = false;
        points.renderOrder = 1;
        this.scene.add(points);
        this.weather.points = points;
        this.weather.geometry = geometry;
        this.weather.positions = positions;
        this.weather.velocities = new Float32Array(WEATHER_PARTICLE_CAP * 3);
    }

    weatherSpawnXZ() {
        const px = this.player?.position.x ?? 0;
        const pz = this.player?.position.z ?? 0;
        return {
            x: px + (Math.random() - 0.5) * 2 * WEATHER_FIELD_RADIUS,
            z: pz + (Math.random() - 0.5) * 2 * WEATHER_FIELD_RADIUS
        };
    }

    setWeatherState(state) {
        const profile = WEATHER_PROFILES[state] ?? WEATHER_PROFILES.clear;
        this.weather.state = state;
        this.weather.count = Math.min(WEATHER_PARTICLE_CAP, profile.count);
        this.weather.fogFarMult = profile.fogFarMult;
        this.weather.lightMult = profile.lightMult ?? 1;

        this.ensureWeatherField();
        const { points, geometry, positions, velocities, count } = this.weather;
        points.material.color.setHex(profile.color);
        points.material.size = profile.size;
        points.material.opacity = profile.opacity;
        points.visible = count > 0;
        geometry.setDrawRange(0, count);

        // Seed particle positions across the full field height so weather doesn't
        // visibly "pour in" from the top on a state change.
        for (let i = 0; i < count; i++) {
            const o = i * 3;
            const { x, z } = this.weatherSpawnXZ();
            positions[o] = x;
            positions[o + 1] = Math.random() * WEATHER_FIELD_HEIGHT;
            positions[o + 2] = z;
            const fall = profile.fall[0] + Math.random() * (profile.fall[1] - profile.fall[0]);
            velocities[o] = (Math.random() - 0.5) * profile.drift;
            velocities[o + 1] = -fall;
            velocities[o + 2] = (Math.random() - 0.5) * profile.drift;
        }
        geometry.attributes.position.needsUpdate = true;
    }

    pickWeatherState() {
        return WEATHER_FORCED_STATE;
    }

    updateWeather(delta) {
        if (!FEATURE_WEATHER) return;
        const forcedState = this.pickWeatherState();
        if (this.weather.state !== forcedState || !this.weather.points) {
            this.setWeatherState(forcedState);
        }
        this.weather.splashCooldown = Math.max(0, (this.weather.splashCooldown ?? 0) - delta);
        if (this.performanceProfile !== 'menu') {
            this.weather.puddleTimer -= delta;
            if (this.weather.puddleTimer <= 0) {
                this.spawnRainPuddleNearPlayer();
                this.weather.puddleTimer = RAIN_PUDDLE_SPAWN_MIN + Math.random() * (RAIN_PUDDLE_SPAWN_MAX - RAIN_PUDDLE_SPAWN_MIN);
            }
        }

        const { count } = this.weather;
        if (!count || !this.weather.points) return;

        const { positions, velocities, geometry } = this.weather;
        const px = this.player?.position.x ?? 0;
        const pz = this.player?.position.z ?? 0;
        for (let i = 0; i < count; i++) {
            const o = i * 3;
            positions[o] += velocities[o] * delta;
            positions[o + 1] += velocities[o + 1] * delta;
            positions[o + 2] += velocities[o + 2] * delta;

            // Recycle particles that hit the ground or drift out of the field
            // box (which is recentered on the player every frame).
            const outOfRange = Math.abs(positions[o] - px) > WEATHER_FIELD_RADIUS
                || Math.abs(positions[o + 2] - pz) > WEATHER_FIELD_RADIUS;
            if (positions[o + 1] <= 0.05 || outOfRange) {
                if (
                    positions[o + 1] <= 0.05
                    && this.weather.splashCooldown <= 0
                    && this.weather.state === WEATHER_FORCED_STATE
                    && Math.abs(positions[o] - px) <= 8
                    && Math.abs(positions[o + 2] - pz) <= 8
                    && Math.random() < RAIN_SPLASH_IMPACT_CHANCE
                ) {
                    this.spawnRainSplash(positions[o], positions[o + 2], 0.68 + Math.random() * 0.38);
                    this.weather.splashCooldown = RAIN_SPLASH_COOLDOWN;
                }
                const { x, z } = this.weatherSpawnXZ();
                positions[o] = x;
                positions[o + 1] = WEATHER_FIELD_HEIGHT - Math.random() * 1.5;
                positions[o + 2] = z;
            }
        }
        geometry.attributes.position.needsUpdate = true;
    }

    isRainWeatherActive() {
        return FEATURE_WEATHER && this.weather?.state === WEATHER_FORCED_STATE;
    }

    spawnRainSplash(x, z, scaleBoost = 1) {
        if (!this.scene) return;
        const splash = new THREE.Group();
        splash.position.set(x, 0, z);
        splash.renderOrder = 1;

        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.06, 0.13, 16),
            new THREE.MeshBasicMaterial({
                color: 0xb7d4eb,
                transparent: true,
                opacity: 0.52,
                depthWrite: false,
                side: THREE.DoubleSide
            })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.042;
        ring.renderOrder = 1;
        splash.add(ring);

        const dropletGeo = new THREE.CircleGeometry(0.024, 10);
        const droplets = [];
        const dropletCount = 3 + Math.floor(Math.random() * 2);
        for (let i = 0; i < dropletCount; i++) {
            const droplet = new THREE.Mesh(
                dropletGeo,
                new THREE.MeshBasicMaterial({
                    color: 0xcde6f8,
                    transparent: true,
                    opacity: 0.6,
                    depthWrite: false,
                    side: THREE.DoubleSide
                })
            );
            droplet.rotation.x = -Math.PI / 2;
            droplet.position.set((Math.random() - 0.5) * 0.04, 0.046 + Math.random() * 0.012, (Math.random() - 0.5) * 0.04);
            droplet.renderOrder = 1;
            splash.add(droplet);
            const ang = Math.random() * Math.PI * 2;
            const speed = (0.2 + Math.random() * 0.3) * scaleBoost;
            droplets.push({
                mesh: droplet,
                vx: Math.cos(ang) * speed,
                vz: Math.sin(ang) * speed,
                vy: 0.28 + Math.random() * 0.2
            });
        }
        this.scene.add(splash);

        const duration = 0.3 + Math.random() * 0.16;
        const peakScale = 1 + (2.05 * scaleBoost);
        const baseOpacity = 0.5 + Math.random() * 0.12;
        this.transientEffects.push({
            mesh: splash,
            age: 0,
            duration,
            update: (dt, age) => {
                const t = Math.min(age / duration, 1);
                const eased = 1 - Math.pow(1 - t, 2);
                const scale = 0.72 + peakScale * eased;
                ring.scale.set(scale, scale, 1);
                ring.material.opacity = baseOpacity * (1 - t);

                for (const droplet of droplets) {
                    droplet.vy = Math.max(-0.32, droplet.vy - 4.2 * dt);
                    droplet.mesh.position.x += droplet.vx * dt;
                    droplet.mesh.position.z += droplet.vz * dt;
                    droplet.mesh.position.y = Math.max(0.04, droplet.mesh.position.y + droplet.vy * dt);
                    droplet.mesh.material.opacity = 0.6 * (1 - t);
                }
            },
            dispose: () => {
                ring.geometry.dispose();
                ring.material.dispose();
                dropletGeo.dispose();
                for (const droplet of droplets) {
                    droplet.mesh.material.dispose();
                }
            }
        });
    }

    spawnRainPuddleNearPlayer() {
        if (!this.player || !this.scene || !this.isRainWeatherActive()) return;
        if ((this.weather.activeRainPuddles ?? 0) >= RAIN_PUDDLE_MAX_COUNT) return;

        const baseMaterial = this.currentBiomeKey === BIOME_KEYS.BIO
            ? this.scatterMaterials?.scatter_slime_puddle
            : this.scatterMaterials?.scatter_coolant_puddle;
        if (!baseMaterial) return;

        for (let attempt = 0; attempt < 8; attempt++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 1.25 + Math.random() * 7.6;
            const x = this.player.position.x + Math.cos(angle) * radius;
            const z = this.player.position.z + Math.sin(angle) * radius;
            if (!this.canOccupyPosition(x, z)) continue;

            const puddleRadius = 0.36 + Math.random() * 0.46;
            const footprintZone = { x, z, radius: puddleRadius * 0.42, active: true };
            this.dynamicPuddles.push(footprintZone);

            const mat = new THREE.MeshBasicMaterial({
                map: baseMaterial.map,
                color: 0x777a76,
                transparent: true,
                alphaTest: 0.001,
                opacity: 0.2 + Math.random() * 0.13,
                depthWrite: false,
                depthTest: true,
                side: THREE.DoubleSide,
                fog: true
            });
            if (this.currentBiomeKey === BIOME_KEYS.BIO) {
                mat.color.setHex(0x707a70);
            } else if (this.currentBiomeKey === BIOME_KEYS.CRYO) {
                mat.color.setHex(0x7b7f80);
            } else {
                mat.color.setHex(0x737674);
            }

            const sprite = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
            sprite.rotation.x = -Math.PI / 2;
            sprite.rotation.z = Math.random() * Math.PI * 2;
            sprite.position.set(x, 0.046, z);
            const size = puddleRadius * (2.6 + Math.random() * 1.1);
            const targetScaleX = size * (1.08 + Math.random() * 0.18);
            const targetScaleY = size * (0.82 + Math.random() * 0.16);
            sprite.scale.set(targetScaleX * 0.34, targetScaleY * 0.34, 1);
            sprite.renderOrder = 3;
            this.scene.add(sprite);

            const duration = 13 + Math.random() * 11;
            const baseOpacity = mat.opacity;
            this.weather.activeRainPuddles = (this.weather.activeRainPuddles ?? 0) + 1;
            this.transientEffects.push({
                mesh: sprite,
                age: 0,
                duration,
                update: (_dt, age) => {
                    const t = Math.min(age / duration, 1);
                    const grow = 0.34 + 0.66 * (1 - Math.pow(1 - Math.min(t * 2.2, 1), 3));
                    sprite.scale.set(targetScaleX * grow, targetScaleY * grow, 1);
                    footprintZone.radius = puddleRadius * (0.42 + 0.58 * grow);
                    sprite.material.opacity = baseOpacity * (1 - t * 0.85);
                },
                dispose: () => {
                    footprintZone.active = false;
                    const idx = this.dynamicPuddles.indexOf(footprintZone);
                    if (idx !== -1) this.dynamicPuddles.splice(idx, 1);
                    this.weather.activeRainPuddles = Math.max(0, (this.weather.activeRainPuddles ?? 1) - 1);
                    sprite.geometry.dispose();
                    mat.dispose();
                }
            });
            return;
        }
    }

    isPositionInPuddle(x, z) {
        for (const sprite of this.scatterSprites) {
            const type = sprite?.userData?.type;
            if (typeof type !== 'string' || !type.includes('puddle')) continue;
            const radius = Math.max(
                0.42,
                Math.max(sprite.userData.baseScaleX ?? sprite.scale.x ?? 0.5, sprite.userData.baseScaleY ?? sprite.scale.y ?? 0.5) * 0.42
            );
            if (Math.hypot(x - sprite.position.x, z - sprite.position.z) <= radius) {
                return true;
            }
        }
        for (const puddle of this.dynamicPuddles) {
            if (!puddle?.active) continue;
            if (Math.hypot(x - puddle.x, z - puddle.z) <= puddle.radius) {
                return true;
            }
        }
        return false;
    }

    spawnWetFootprint(x, z, dirX, dirZ) {
        if (!this.scene) return;
        const len = Math.hypot(dirX, dirZ) || 1;
        const fx = dirX / len;
        const fz = dirZ / len;
        const side = this.wetFootstepSide || 1;
        this.wetFootstepSide = -side;
        const px = -fz;
        const pz = fx;

        const footprint = new THREE.Mesh(
            new THREE.PlaneGeometry(0.11, 0.2),
            new THREE.MeshBasicMaterial({
                color: 0x5f6764,
                transparent: true,
                opacity: 0.38,
                depthWrite: false,
                side: THREE.DoubleSide
            })
        );
        footprint.rotation.x = -Math.PI / 2;
        footprint.rotation.z = Math.atan2(fx, fz);
        footprint.position.set(
            x - fx * 0.2 + px * side * 0.11,
            0.041,
            z - fz * 0.2 + pz * side * 0.11
        );
        footprint.renderOrder = 19;
        this.scene.add(footprint);

        const duration = 2.7 + Math.random() * 1.7;
        this.transientEffects.push({
            mesh: footprint,
            age: 0,
            duration,
            update: (_dt, age) => {
                const t = Math.min(age / duration, 1);
                footprint.material.opacity = 0.38 * (1 - t * t);
            }
        });
    }

    emitDepthTierChanged(depthTier = this.maxDepthTierReached) {
        const tier = Math.max(0, Math.min(DEPTH_TIER_NAMES.length - 1, Math.floor(depthTier)));
        window.dispatchEvent(new CustomEvent('depth-tier-changed', {
            detail: {
                tier,
                label: this.getDepthTierName(tier)
            }
        }));
    }

    updateDepthTierProgress(chunkX, chunkY, { forceEmit = false } = {}) {
        const depthTier = this.getDepthTier(chunkX, chunkY);
        this.currentDepthTier = depthTier;

        if (depthTier > this.maxDepthTierReached) {
            this.maxDepthTierReached = depthTier;
            this.arcManager?.recordSignal?.({ deepestDepthTier: depthTier });
            this.arcManager?.evaluate?.();
            this.emitDepthTierChanged(depthTier);
            return;
        }

        if (forceEmit) {
            this.emitDepthTierChanged(this.maxDepthTierReached);
        }
    }

    getRunStats() {
        const bankState = this.bank.getState();
        const totalBanked = (bankState.med ?? 0) + (bankState.tech ?? 0) + (bankState.coin ?? 0);
        return {
            distanceTravelled: Math.round(this.totalDistanceTravelled),
            totalPickups: totalBanked,
            generatorLevel: this.bank.getO2GeneratorLevel(),
            depthTier: this.maxDepthTierReached,
            depthTierName: this.getDepthTierName(this.maxDepthTierReached),
            biomeKey: this.currentBiomeKey,
            biomeLabel: this.getBiomeLabel(this.currentBiomeKey),
            snailsKilled: this.snailsKilledThisRun ?? 0,
            missionType: this.missionState?.type ?? null,
            missionStatus: this.missionState?.status ?? 'inactive',
            missionLabel: this.missionState?.label ?? '',
            hadNearDeath: this.hadNearDeath
        };
    }

    getBiomeState() {
        if (!this.player) {
            return {
                key: this.currentBiomeKey,
                label: this.getBiomeLabel(this.currentBiomeKey),
                distance: 0,
                o2DrainMultiplier: this.currentBiomeO2DrainMult
            };
        }

        const anchor = this.getBiomeAnchorPosition();
        const distance = Math.hypot(
            this.player.position.x - anchor.x,
            this.player.position.z - anchor.z
        );
        return {
            key: this.currentBiomeKey,
            label: this.getBiomeLabel(this.currentBiomeKey),
            distance,
            o2DrainMultiplier: this.currentBiomeO2DrainMult
        };
    }

    updatePlayerSpriteAnimation(axisX, axisZ, delta, isMoving, moveDirX = 0, moveDirZ = 0) {
        const aiming = this.hasActiveAim;
        // Upper body tracks the aim whenever the player is aiming.
        if (aiming) {
            this.torsoFacingRow = this.aimFacingRow;
        }

        if (isMoving) {
            // Back-pedalling = moving roughly opposite to where the shot points,
            // in any direction (down vs up, left vs right). In that case the legs
            // face the aim and the walk cycle runs in reverse, so it reads as
            // running backwards. Otherwise the legs face the travel heading and
            // step forward normally.
            let backpedal = false;
            if (aiming) {
                const aimLen = Math.hypot(this.aimDirX, this.aimDirZ) || 1;
                const dot = (moveDirX * this.aimDirX + moveDirZ * this.aimDirZ) / aimLen;
                backpedal = dot < -0.3;
            }
            this.currentFacingRow = backpedal
                ? this.aimFacingRow
                : this.getFacingRow(axisX, axisZ);
            if (!aiming) {
                this.torsoFacingRow = this.currentFacingRow;
            }

            const dir = backpedal ? -1 : 1;
            this.animationTimer += delta * SPRITE_ANIMATION_SPEED * dir;
            const frames = PLAYER_WALK_FRAME_COUNT;
            const column = ((Math.floor(this.animationTimer) % frames) + frames) % frames;
            this.updatePlayerSpriteFrame(column, this.currentFacingRow, this.torsoFacingRow);

            if (this.lastAnimationColumn === undefined) {
                this.lastAnimationColumn = -1;
            }
            if (column !== this.lastAnimationColumn) {
                this.lastAnimationColumn = column;
                if (column === 1) {
                    if (this.performanceProfile !== 'menu') {
                        window.AudioManager?.playProceduralFootstep(this.playerType);
                    }
                }
            }
            return;
        }

        this.animationTimer = 0;
        this.lastAnimationColumn = -1;
        if (aiming) {
            // Standing still and aiming: the whole body turns to face the shot.
            this.currentFacingRow = this.aimFacingRow;
            this.torsoFacingRow = this.aimFacingRow;
        } else {
            // Idle without aim: the torso settles back in line with the body.
            this.torsoFacingRow = this.currentFacingRow;
        }
        this.updatePlayerSpriteFrame(0, this.currentFacingRow, this.torsoFacingRow);
    }

    getFacingRow(axisX, axisZ) {
        const angle = Math.atan2(axisZ, axisX);
        const octant = Math.round(angle / (Math.PI / 4));
        return (octant + PLAYER_SPRITE_DIRECTION_CELLS.length) % PLAYER_SPRITE_DIRECTION_CELLS.length;
    }

    // Keeps the legs and torso billboards visually identical under status tints.
    tintPlayerSprites(hex) {
        if (this.playerSprite?.material?.color) {
            this.playerSprite.material.color.setHex(hex);
        }
        if (this.playerTorsoSprite?.material?.color) {
            this.playerTorsoSprite.material.color.setHex(hex);
        }
    }

    updatePlayerSpriteFrame(column, legsRow, torsoRow = legsRow) {
        const legsTexture = this.playerTextures[this.playerType] ?? this.playerTextures.SCOUT;
        this.setSpriteHalfFrame(legsTexture, column, legsRow, 'bottom');
        const torsoTexture = this.playerTorsoTextures?.[this.playerType] ?? this.playerTorsoTextures?.SCOUT;
        if (torsoTexture) {
            this.setSpriteHalfFrame(torsoTexture, column, torsoRow, 'top');
        }
    }

    // Points a texture at one vertical half of a single direction/walk frame.
    // `half` is 'bottom' (legs) or 'top' (torso) of the waist split.
    setSpriteHalfFrame(texture, column, row, half) {
        const directionCell = PLAYER_SPRITE_DIRECTION_CELLS[row] ?? PLAYER_SPRITE_DIRECTION_CELLS[PLAYER_DEFAULT_DIRECTION_INDEX];
        const frameColumn = directionCell.baseColumn + (column % PLAYER_WALK_FRAME_COUNT);
        const shouldFlipX = this.playerType === 'TANK' && TANK_FLIPPED_DIRECTION_INDICES.has(row);
        const frameBaseY = (PLAYER_SPRITE_ROWS - 1 - directionCell.row) * PLAYER_SPRITE_FRAME_REPEAT_Y;
        const isTop = half === 'top';
        // Texture V increases upward, so the torso band sits above the leg band.
        const bandFraction = isTop ? (1 - PLAYER_SPRITE_WAIST_SPLIT) : PLAYER_SPRITE_WAIST_SPLIT;
        const bandHeight = PLAYER_SPRITE_FRAME_REPEAT_Y * bandFraction;
        const bandOffsetY = frameBaseY + (isTop ? PLAYER_SPRITE_FRAME_REPEAT_Y * PLAYER_SPRITE_WAIST_SPLIT : 0);
        texture.repeat.set(
            PLAYER_SPRITE_FRAME_REPEAT_X * (shouldFlipX ? -1 : 1),
            bandHeight
        );
        texture.offset.set(
            (frameColumn + (shouldFlipX ? 1 : 0)) * PLAYER_SPRITE_FRAME_REPEAT_X,
            bandOffsetY
        );
    }

    getWorldDirectionForFacingRow(row = this.currentFacingRow) {
        const facingRow = Number.isInteger(row) ? row : PLAYER_DEFAULT_DIRECTION_INDEX;
        const angle = facingRow * (Math.PI / 4);
        const screenAxisX = Math.cos(angle);
        const screenAxisZ = Math.sin(angle);
        const worldX = (this.cameraPlanarRight.x * screenAxisX) + (this.cameraPlanarForward.x * -screenAxisZ);
        const worldZ = (this.cameraPlanarRight.y * screenAxisX) + (this.cameraPlanarForward.y * -screenAxisZ);
        const length = Math.hypot(worldX, worldZ) || 1;
        return { x: worldX / length, z: worldZ / length };
    }

    getAmmoRefillInterval() {
        const level = this.bank?.getWeaponUpgradeLevel?.('ammoRefill') ?? 0;
        if (Math.floor(level) <= 0) return Number.POSITIVE_INFINITY;
        return Math.max(
            WEAPON_AMMO_REFILL_MIN_INTERVAL,
            WEAPON_AMMO_REFILL_INTERVAL - Math.max(0, Math.floor(level)) * WEAPON_AMMO_REFILL_INTERVAL_REDUCTION
        );
    }

    updateWeaponAmmoRefill(delta) {
        if (!Number.isFinite(delta) || delta <= 0) return;
        if (this.weaponReloading || this.weaponClipAmmo >= this.weaponClipSize) {
            this.weaponAmmoRefillTimer = 0;
            return;
        }

        const interval = this.getAmmoRefillInterval();
        if (!Number.isFinite(interval)) {
            this.weaponAmmoRefillTimer = 0;
            this.emitWeaponClipState();
            return;
        }
        this.weaponAmmoRefillTimer = (this.weaponAmmoRefillTimer ?? 0) + delta;
        if (this.weaponAmmoRefillTimer < interval) {
            this.emitWeaponClipState();
            return;
        }

        let roundsAdded = 0;
        while (this.weaponAmmoRefillTimer >= interval && this.weaponClipAmmo < this.weaponClipSize) {
            this.weaponAmmoRefillTimer -= interval;
            this.weaponClipAmmo += 1;
            roundsAdded += 1;
        }
        if (this.weaponClipAmmo >= this.weaponClipSize) this.weaponAmmoRefillTimer = 0;
        if (roundsAdded > 0) {
            window.AudioManager?.play?.('ui_scan_ping', { volume: 0.08, playbackRate: 1.7 });
        }
        this.emitWeaponClipState();
    }

    updateWeaponState(delta) {
        if (this.weaponFireCooldown > 0) {
            this.weaponFireCooldown = Math.max(0, this.weaponFireCooldown - delta);
        }

        if (this.mouseAimActive && Number.isFinite(this.lastMouseClientX) && Number.isFinite(this.lastMouseClientY)) {
            this.updateAimFromClient(this.lastMouseClientX, this.lastMouseClientY, {
                keepMouseActive: true,
                persistDuration: 0
            });
        }

        if (!this.mouseAimActive && this._aimResetTimer > 0) {
            this._aimResetTimer = Math.max(0, this._aimResetTimer - delta);
            if (this._aimResetTimer === 0) {
                this.hasActiveAim = false;
            }
        }

        this.updateWeaponAmmoRefill(delta);

        if (!this.weaponReloading) return;
        const previousTimer = this.weaponReloadTimer;
        this.weaponReloadTimer = Math.max(0, this.weaponReloadTimer - delta);
        if (this.weaponReloadTimer !== previousTimer) {
            this.emitWeaponClipState();
        }
        if (this.weaponReloadTimer > 0) return;

        this.weaponReloading = false;
        const availableAmmo = this.getAvailableAmmo();
        const missingAmmo = Math.max(0, this.weaponClipSize - this.weaponClipAmmo);
        const ammoLoaded = Math.min(missingAmmo, availableAmmo);
        if (ammoLoaded > 0) {
            this.weaponClipAmmo += ammoLoaded;
            window.dispatchEvent(new CustomEvent('player-consume-ammo-cache', { detail: { amount: ammoLoaded } }));
        }
        this.emitWeaponClipState();
        window.AudioManager?.play('ui_click', { volume: 0.28, playbackRate: 1.18 });
    }

    getAvailableAmmo() {
        return Number.isFinite(window.pickupCounterState?.ammo)
            ? Math.max(0, Math.floor(window.pickupCounterState.ammo))
            : 0;
    }

    startReload() {
        if (this.weaponReloading) return false;
        const availableAmmo = this.getAvailableAmmo();
        const missingAmmo = Math.max(0, this.weaponClipSize - this.weaponClipAmmo);
        const refillAmount = Math.min(missingAmmo, availableAmmo);
        if (refillAmount <= 0) return false;
        this.weaponReloading = true;
        this.weaponReloadTimer = WEAPON_RELOAD_DURATION;
        this.emitWeaponClipState();
        window.AudioManager?.play('weapon_reload', { volume: 0.52 });
        return true;
    }

    requestReload({ manual = false } = {}) {
        if (!this.isGameplayInputActive()) return false;
        if (this.weaponReloading) return false;

        const availableAmmo = this.getAvailableAmmo();
        if (availableAmmo < 1) {
            if (manual) {
                window.AudioManager?.play('ui_error', { volume: 0.45 });
                window.dispatchEvent(new CustomEvent('combat-no-ammo'));
            }
            return false;
        }

        const missingAmmo = Math.max(0, this.weaponClipSize - this.weaponClipAmmo);
        const refillAmount = Math.min(missingAmmo, availableAmmo);
        if (refillAmount <= 0) {
            if (manual) {
                window.AudioManager?.play('ui_error', { volume: 0.3, playbackRate: 1.05 });
            }
            return false;
        }

        return this.startReload();
    }

    tryFireWeapon(clientX, clientY) {
        if (!this.isGameplayInputActive()) return;

        if (this.isInsideNoFireZone()) {
            window.AudioManager?.play('ui_error', { volume: 0.42 });
            window.dispatchEvent(new CustomEvent('combat-no-fire-zone'));
            return;
        }

        if (this.weaponReloading) {
            window.AudioManager?.play('ui_error', { volume: 0.34, playbackRate: 1.05 });
            return;
        }
        if (this.weaponFireCooldown > 0) {
            return;
        }
        if (this.weaponClipAmmo <= 0) {
            const availableAmmo = this.getAvailableAmmo();
            if (availableAmmo < 1) {
                window.AudioManager?.play('ui_error', { volume: 0.45 });
                window.dispatchEvent(new CustomEvent('combat-no-ammo'));
                return;
            }
            this.requestReload();
            return;
        }

        const worldPoint = this.updateAimFromClient(clientX, clientY, {
            keepMouseActive: this._canvasPointerType === 'mouse',
            persistDuration: this._canvasPointerType === 'mouse' ? 0 : 2.0
        });

        if (!worldPoint && !this.hasActiveAim) return;

        const normX = this.aimDirX;
        const normZ = this.aimDirZ;
        if (!Number.isFinite(normX) || !Number.isFinite(normZ)) return;

        this.weaponClipAmmo = Math.max(0, this.weaponClipAmmo - 1);
        let fireCd = WEAPON_FIRE_COOLDOWN;
        if (this.playerType === 'ENGINEER' && this.bank && this.bank.isSkillUnlocked('engineer_special_upgrade_1') && this.classAbility.active) {
            fireCd /= 1.20;
        }
        this.weaponFireCooldown = fireCd;
        this.emitWeaponClipState();

        this.spawnPlayerShot(normX, normZ);

        window.AudioManager?.play('weapon_fire_sidearm', { volume: 0.34 });

        if (this.weaponClipAmmo <= 0) {
            this.requestReload();
        }
    }

    spawnPlayerShot(normX, normZ) {
        const classDamage = CLASS_STATS[this.playerType]?.projectileDamage ?? PROJECTILE_DAMAGE;
        const bonuses = this.weaponUpgradeBonuses ?? null;
        const damage = classDamage + (bonuses?.shotDamage ?? 0);
        let speed = PROJECTILE_SPEED + (bonuses?.speedAdd ?? 0);
        if (this.playerType === 'ENGINEER' && this.bank && this.bank.isSkillUnlocked('engineer_special_upgrade_1') && this.classAbility.active) {
            speed *= 1.20;
        }
        const shotAmount = FEATURE_MULTISHOT ? (bonuses?.shotAmount ?? 0) : 0;
        const spreads = MULTISHOT_SPREADS[Math.min(shotAmount, MULTISHOT_SPREADS.length - 1)];

        const fireOne = (dx, dz) => {
            this.spawnProjectile({
                x: this.player.position.x + dx * 0.62,
                z: this.player.position.z + dz * 0.62,
                vx: dx * speed,
                vz: dz * speed,
                ttl: PROJECTILE_TTL,
                damage,
                radius: PROJECTILE_RADIUS
            });
        };

        if (!spreads || spreads.length === 0) {
            fireOne(normX, normZ);
            return;
        }
        for (const angle of spreads) {
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            fireOne((normX * cos) - (normZ * sin), (normX * sin) + (normZ * cos));
        }
    }

    spawnProjectile({
        x,
        z,
        vx,
        vz,
        ttl = PROJECTILE_TTL,
        damage = PROJECTILE_DAMAGE,
        radius = PROJECTILE_RADIUS,
        isEnemy = false,
        options = {}
    }) {
        const group = new THREE.Group();
        const classColor = PLAYER_COLORS[this.playerType] ?? 0xffe08f;
        const coreColor = options.color ?? (isEnemy ? 0xff4a4a : classColor);
        const glowColor = options.glowColor ?? (isEnemy ? 0xff0000 : classColor);

        const core = new THREE.Mesh(
            new THREE.SphereGeometry(radius, 8, 8),
            new THREE.MeshBasicMaterial({
                color: coreColor,
                transparent: true,
                opacity: 0.95
            })
        );
        const glow = new THREE.Mesh(
            new THREE.SphereGeometry(radius * 2.8, 6, 6),
            new THREE.MeshBasicMaterial({
                color: glowColor,
                transparent: true,
                opacity: 0.28,
                depthWrite: false
            })
        );
        core.renderOrder = 25;
        glow.renderOrder = 24;
        group.add(core, glow);
        group.position.set(x, 0.42, z);
        this.scene.add(group);

        this.activeProjectiles.push({
            mesh: group,
            vx,
            vz,
            ttl,
            damage,
            radius,
            isEnemy
        });
    }

    checkProjectileWallHit(projectile) {
        const speed = Math.hypot(projectile.vx, projectile.vz);
        if (speed <= 0.0001) return null;
        this._projRaycaster.set(
            new THREE.Vector3(projectile.mesh.position.x, 0.45, projectile.mesh.position.z),
            new THREE.Vector3(projectile.vx / speed, 0, projectile.vz / speed)
        );
        this._projRaycaster.far = Math.max(0.08, speed * 0.045);
        const hits = this._projRaycaster.intersectObjects(this.wallMeshes, false);
        if (!hits.length) return null;
        const hit = hits[0];
        // World-space face normal (geometry normals are in local space).
        let nx = -projectile.vx / speed;
        let nz = -projectile.vz / speed;
        if (hit.face && hit.object) {
            const worldNormal = hit.face.normal.clone()
                .transformDirection(hit.object.matrixWorld);
            if (Number.isFinite(worldNormal.x) && Number.isFinite(worldNormal.z)) {
                nx = worldNormal.x;
                nz = worldNormal.z;
            }
        }
        return { point: hit.point, normalX: nx, normalZ: nz };
    }

    checkProjectilePlayerHit(projectile) {
        if (!this.player || this.isPlayerDead) return false;
        const dist = Math.hypot(
            projectile.mesh.position.x - this.player.position.x,
            projectile.mesh.position.z - this.player.position.z
        );
        return dist <= this.playerRadius + (projectile.radius ?? PROJECTILE_RADIUS);
    }

    checkProjectileShipHit(projectile) {
        if (!this.crashedShips) return null;
        for (const ship of this.crashedShips) {
            if (!ship.isVisible || ship.hp <= 0) continue;
            const dist = Math.hypot(
                projectile.mesh.position.x - ship.tileX,
                projectile.mesh.position.z - ship.tileZ
            );
            if (dist <= (ship.width * SHIP_HIT_RADIUS_MULT) + (projectile.radius ?? PROJECTILE_RADIUS)) {
                return ship;
            }
        }
        return null;
    }

    checkProjectileSnailHit(projectile) {
        for (const sprite of this.scatterSprites) {
            if (!sprite?.parent) continue;
            if (!this.isEnemyType(sprite.userData?.type)) continue;
            if (sprite.userData?.burstTriggered) continue;
            const dist = Math.hypot(
                projectile.mesh.position.x - sprite.position.x,
                projectile.mesh.position.z - sprite.position.z
            );
            const hitRadius = sprite.userData.isBoss ? (SNAIL_HIT_RADIUS * 2.8) : SNAIL_HIT_RADIUS;
            // Forgiving hitbox: pad player shots so grazing the visual edge still registers.
            const hitboxPadding = projectile.isEnemy ? 0 : PLAYER_HITBOX_PADDING;
            if (dist <= hitRadius + (projectile.radius ?? PROJECTILE_RADIUS) + hitboxPadding) {
                return sprite;
            }
        }
        return null;
    }

    destroyProjectile(projectile) {
        if (!projectile?.mesh) return;
        projectile.mesh.parent?.remove(projectile.mesh);
        projectile.mesh.traverse?.((child) => {
            child.material?.dispose?.();
            child.geometry?.dispose?.();
        });
    }

    spawnProjectileImpactEffect(x, z) {
        const effect = new THREE.Group();
        for (let i = 0; i < 4; i++) {
            const spark = new THREE.Mesh(
                new THREE.CircleGeometry(0.04 + Math.random() * 0.04, 5),
                new THREE.MeshBasicMaterial({
                    color: 0xffe08f,
                    transparent: true,
                    opacity: 0.9,
                    depthWrite: false
                })
            );
            spark.rotation.x = -Math.PI / 2;
            spark.position.set((Math.random() - 0.5) * 0.1, 0.05 + Math.random() * 0.06, (Math.random() - 0.5) * 0.1);
            spark.renderOrder = 30;
            spark.userData = {
                vx: (Math.random() - 0.5) * 0.6,
                vz: (Math.random() - 0.5) * 0.6,
                vy: 0.18 + Math.random() * 0.14,
                growth: 0,
                isSpark: true
            };
            effect.add(spark);
        }
        effect.position.set(x, 0, z);
        effect.userData = { age: 0, duration: 0.18 };
        this.scene.add(effect);
        this.transientEffects.push(effect);
    }

    spawnTextureBurstEffect(x, z, {
        textureKey = 'fx_steam_puff',
        color = 0xffffff,
        count = 3,
        baseScale = 0.56,
        duration = 0.48,
        speed = 0.28,
        rise = 0.18,
        opacity = 0.9,
        renderOrder = 29
    } = {}) {
        const template = this.scatterMaterials?.[textureKey];
        if (!template || !this.scene) return null;

        const effect = new THREE.Group();
        effect.position.set(x, 0.02, z);
        effect.userData = { age: 0, duration };

        for (let i = 0; i < count; i += 1) {
            const sprite = new THREE.Sprite(template.clone());
            sprite.material.color.setHex(color);
            sprite.material.opacity = opacity * (0.78 + Math.random() * 0.22);
            sprite.center.set(0.5, 0.5);
            sprite.position.set((Math.random() - 0.5) * 0.16, 0.06 + Math.random() * 0.08, (Math.random() - 0.5) * 0.16);
            sprite.scale.setScalar(baseScale * (0.72 + Math.random() * 0.55));
            sprite.renderOrder = renderOrder;
            sprite.userData = {
                isSmoke: textureKey === 'fx_steam_puff',
                isSpore: textureKey === 'fx_spark_burst',
                vx: (Math.random() - 0.5) * speed,
                vz: (Math.random() - 0.5) * speed,
                vy: rise + Math.random() * (rise * 0.9),
                growth: 0.22 + Math.random() * 0.35
            };
            effect.add(sprite);
        }

        this.scene.add(effect);
        this.transientEffects.push(effect);
        return effect;
    }

    // Ballistic debris: small boxes flung outward with gravity, drag, and a floor bounce.
    // Registered as a plain-object transient effect so it reuses updateTransientEffects().
    spawnPhysicalBurst(x, z, { color = 0xffe08f, count = 6, upward = 0.18, spread = 1.4 } = {}) {
        if (!this.scene) return;
        // Respect the adaptive-quality degrade signal.
        let n = this.visibleChunkRadius === 0 ? Math.max(2, Math.floor(count * 0.5)) : count;
        const group = new THREE.Group();
        const geo = new THREE.BoxGeometry(0.045, 0.045, 0.045);
        const particles = [];
        for (let i = 0; i < n; i++) {
            const mat = new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: 0.95,
                depthWrite: false
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set((Math.random() - 0.5) * 0.06, 0.3 + Math.random() * 0.12, (Math.random() - 0.5) * 0.06);
            mesh.renderOrder = 28;
            group.add(mesh);
            const angle = Math.random() * Math.PI * 2;
            const sp = (0.6 + Math.random() * 1.4) * spread;
            particles.push({
                mesh,
                vx: Math.cos(angle) * sp,
                vy: upward * 5 + Math.random() * 1.2,
                vz: Math.sin(angle) * sp
            });
        }
        group.position.set(x, 0, z);
        this.scene.add(group);

        this.spawnTextureBurstEffect(x, z, {
            textureKey: 'fx_spark_burst',
            color,
            count: Math.max(1, Math.min(3, Math.ceil(count / 2))),
            baseScale: 0.36 + Math.min(0.18, count * 0.02),
            duration: 0.34,
            speed: 0.18,
            rise: 0.24,
            opacity: 0.86,
            renderOrder: 30
        });

        const duration = 0.7;
        this.transientEffects.push({
            mesh: group,
            age: 0,
            duration,
            update(delta) {
                this.age += delta;
                const t = Math.min(this.age / duration, 1);
                const dragMul = Math.exp(-PHYS_PARTICLE_DRAG * delta);
                for (const p of particles) {
                    p.vy -= PHYS_PARTICLE_GRAVITY * delta;
                    p.vx *= dragMul;
                    p.vz *= dragMul;
                    p.mesh.position.x += p.vx * delta;
                    p.mesh.position.y += p.vy * delta;
                    p.mesh.position.z += p.vz * delta;
                    if (p.mesh.position.y <= 0.02) {
                        p.mesh.position.y = 0.02;
                        p.vy *= PHYS_PARTICLE_BOUNCE;
                        p.vx *= 0.8;
                        p.vz *= 0.8;
                    }
                    p.mesh.material.opacity = Math.max(0, 0.95 * (1 - t));
                }
            },
            dispose() {
                geo.dispose();
                for (const p of particles) p.mesh.material.dispose();
            }
        });
    }

    // Fading scorch decal flush against a wall face. Capped + recycled to protect frame time.
    spawnWallDecal(x, z, normalX, normalZ) {
        if (!this.scene) return;
        const len = Math.hypot(normalX, normalZ) || 1;
        const nx = normalX / len;
        const nz = normalZ / len;

        const geo = new THREE.PlaneGeometry(0.3, 0.3);

        const vertexShader = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            uniform sampler2D map;
            uniform float uCooling;
            uniform float uOpacity;
            varying vec2 vUv;
            void main() {
                vec4 texColor = texture2D(map, vUv);
                if (texColor.a < 0.05) {
                    discard;
                }
                float gray = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
                // 0.45 factor mimics a charred dark soot color
                vec3 cooledColor = vec3(gray * 0.45);
                vec3 finalColor = mix(texColor.rgb, cooledColor, uCooling);
                gl_FragColor = vec4(finalColor, texColor.a * uOpacity);
            }
        `;

        const mat = new THREE.ShaderMaterial({
            uniforms: {
                map: { value: this.scatterTextures.decal_scars },
                uCooling: { value: 0.0 },
                uOpacity: { value: 0.95 }
            },
            vertexShader,
            fragmentShader,
            transparent: true,
            depthWrite: false,
            depthTest: true
        });

        const mesh = new THREE.Mesh(geo, mat);
        // Offset slightly off the face to avoid z-fighting; sit at mid-wall height.
        mesh.position.set(x + nx * 0.02, 0.45, z + nz * 0.02);
        mesh.rotation.y = Math.atan2(nx, nz);
        mesh.renderOrder = 5;
        this.scene.add(mesh);

        const duration = 5.0;
        const effect = {
            mesh,
            age: 0,
            maxAge: duration,
            update(delta) {
                this.age += delta;
                const t = Math.min(this.age / duration, 1);
                // Cool down over the first 1.5 seconds of the decal's life
                const coolProgress = Math.min(this.age / 1.5, 1.0);
                mat.uniforms.uCooling.value = coolProgress;
                mat.uniforms.uOpacity.value = 0.78 * (1 - t * t);
            },
            dispose() {
                geo.dispose();
                mat.dispose();
            }
        };

        this._wallDecals = this._wallDecals ?? [];
        this._wallDecals.push(effect);
        this.transientEffects.push(effect);

        // Recycle the oldest decal if we exceed the cap.
        while (this._wallDecals.length > WALL_DECAL_CAP) {
            const oldest = this._wallDecals.shift();
            if (!oldest) break;
            oldest.age = oldest.maxAge; // flag for removal next frame
        }
    }

    updateProjectiles(delta) {
        if (!this.activeProjectiles.length) return;
        const toRemove = new Set();

        for (const projectile of this.activeProjectiles) {
            projectile.ttl -= delta;
            if (projectile.ttl <= 0) {
                toRemove.add(projectile);
                continue;
            }

            projectile.mesh.position.x += projectile.vx * delta;
            projectile.mesh.position.z += projectile.vz * delta;

            const wallHit = this.checkProjectileWallHit(projectile);
            if (wallHit) {
                const hx = wallHit.point?.x ?? projectile.mesh.position.x;
                const hz = wallHit.point?.z ?? projectile.mesh.position.z;
                this.spawnProjectileImpactEffect(hx, hz);
                const sparkColor = projectile.isEnemy ? 0xff6a4a : 0xffd27a;
                this.spawnPhysicalBurst(hx, hz, { color: sparkColor, count: 5, upward: 0.16 });
                if (FEATURE_WALL_DECALS) {
                    this.spawnWallDecal(hx, hz, wallHit.normalX, wallHit.normalZ);
                }
                toRemove.add(projectile);
                continue;
            }

            if (projectile.isEnemy) {
                if (this.checkProjectilePlayerHit(projectile)) {
                    this.takeDamage(projectile.damage, 'enemy-projectile', projectile.mesh.position.x, projectile.mesh.position.z);
                    this.spawnProjectileImpactEffect(projectile.mesh.position.x, projectile.mesh.position.z);
                    toRemove.add(projectile);
                    continue;
                }
                const ship = this.checkProjectileShipHit(projectile);
                if (ship) {
                    this.damageShip(ship, projectile.damage, 'boss-projectile');
                    toRemove.add(projectile);
                    continue;
                }
            } else {
                const snail = this.checkProjectileSnailHit(projectile);
                if (snail) {
                    this.damageSnail(snail, projectile.damage);
                    toRemove.add(projectile);
                    continue;
                }

                const ship = this.checkProjectileShipHit(projectile);
                if (ship) {
                    this.damageShip(ship, projectile.damage, 'friendly-fire');
                    toRemove.add(projectile);
                    continue;
                }
            }
        }

        if (toRemove.size === 0) return;
        const survivors = [];
        for (const projectile of this.activeProjectiles) {
            if (toRemove.has(projectile)) {
                this.destroyProjectile(projectile);
                continue;
            }
            survivors.push(projectile);
        }
        this.activeProjectiles = survivors;
    }

    updateCamera(delta) {
        const target = new THREE.Vector3(
            this.player.position.x + this.cameraOffset.x,
            this.player.position.y + this.cameraOffset.y,
            this.player.position.z + this.cameraOffset.z
        );
        this.camera.position.lerp(target, 1 - Math.exp(-delta * 7));

        if (this._cameraShakeTimer > 0) {
            this._cameraShakeTimer -= delta;
            const intensity = this._cameraShakeIntensity * Math.max(0, this._cameraShakeTimer / 0.35);
            this.camera.position.x += (Math.random() - 0.5) * intensity;
            this.camera.position.z += (Math.random() - 0.5) * intensity;
        }

        this.camera.lookAt(this.player.position.x, this.player.position.y + 0.4, this.player.position.z);
    }

    snapCameraToPlayer() {
        if (!this.player || !this.camera) return;
        this.camera.position.set(
            this.player.position.x + this.cameraOffset.x,
            this.player.position.y + this.cameraOffset.y,
            this.player.position.z + this.cameraOffset.z
        );
        this.camera.lookAt(this.player.position.x, this.player.position.y + 0.4, this.player.position.z);
    }

    triggerCameraShake(intensity = 0.18, duration = 0.35) {
        this._cameraShakeIntensity = Math.max(this._cameraShakeIntensity, intensity);
        this._cameraShakeTimer = Math.max(this._cameraShakeTimer, duration);
    }

    syncVisibleChunks(force = false) {
        if (this.performanceProfile === 'menu') {
            this.clearLoadedChunksForRunReset();
            if (this.chunkGroups) this.chunkGroups.visible = false;
            return;
        }

        const centerChunkX = Math.floor(this.player.position.x / this.chunkSize);
        const centerChunkY = Math.floor(this.player.position.z / this.chunkSize);
        this.updateDepthTierProgress(centerChunkX, centerChunkY);
        const needed = new Set();
        this.wallMeshes = [];
        this.pickupMeshes = [];
        this.scatterSprites = [];

        for (let chunkY = centerChunkY - this.visibleChunkRadius; chunkY <= centerChunkY + this.visibleChunkRadius; chunkY++) {
            for (let chunkX = centerChunkX - this.visibleChunkRadius; chunkX <= centerChunkX + this.visibleChunkRadius; chunkX++) {
                const key = `${chunkX},${chunkY}`;
                needed.add(key);
                const isNewChunk = !this.chunkMeshes.has(key) && !this.visitedChunks.has(key);
                if (force || !this.chunkMeshes.has(key)) {
                    this.queueChunkMount(chunkX, chunkY, centerChunkX, centerChunkY);
                }
                if (isNewChunk && !force) {
                    this.visitedChunks.add(key);
                    this.onNewChunkDiscovered(chunkX, chunkY);
                }
            }
        }

        this.pendingChunkMounts = this.pendingChunkMounts.filter((entry) => needed.has(entry.key));
        this.pendingChunkMountKeys = new Set(this.pendingChunkMounts.map((entry) => entry.key));

        const frameAlreadySlow = (this._lastFrameDeltaForChunkMounts ?? 0) > 0.024;
        const chunkMountLimit = force
            ? 1
            : frameAlreadySlow
                ? 0
                : this.maxChunkMountsPerFrame;
        this.processPendingChunkMounts(chunkMountLimit);

        for (const [key, group] of this.chunkMeshes.entries()) {
            if (needed.has(key)) continue;
            group.traverse((child) => {
                if (child.userData?.isScatter) {
                    child.material?.dispose?.();
                    child.geometry?.dispose?.();
                }
                if (child.userData?.isPickup) {
                    child.userData.shadow?.material?.dispose?.();
                    child.userData.shadow?.geometry?.dispose?.();
                    child.userData.glow?.material?.dispose?.();
                    child.userData.glow?.geometry?.dispose?.();
                    child.userData.burst?.material?.dispose?.();
                    child.userData.burst?.geometry?.dispose?.();
                }
            });
            this.chunkGroups.remove(group);
            this.chunkMeshes.delete(key);
            this.pendingChunkMountKeys.delete(key);
        }

        for (const group of this.chunkMeshes.values()) {
            for (const child of group.children) {
                if (child.userData.isWall) {
                    this.wallMeshes.push(child);
                }
                if (child.userData.isPickup) {
                    this.pickupMeshes.push(child);
                }
                if (child.userData.isScatter) {
                    this.scatterSprites.push(child);
                }
            }
        }
    }

    queueChunkMount(chunkX, chunkY, centerChunkX, centerChunkY) {
        const key = `${chunkX},${chunkY}`;
        if (this.chunkMeshes.has(key) || this.pendingChunkMountKeys.has(key)) {
            return;
        }

        this.pendingChunkMountKeys.add(key);
        this.pendingChunkMounts.push({
            key,
            chunkX,
            chunkY,
            priority: Math.abs(chunkX - centerChunkX) + Math.abs(chunkY - centerChunkY)
        });
        this.pendingChunkMounts.sort((a, b) => a.priority - b.priority);
    }

    processPendingChunkMounts(limit = 1) {
        let mounted = 0;
        while (mounted < limit && this.pendingChunkMounts.length > 0) {
            const next = this.pendingChunkMounts.shift();
            this.pendingChunkMountKeys.delete(next.key);
            if (this.chunkMeshes.has(next.key)) {
                continue;
            }

            this.mountChunk(next.chunkX, next.chunkY);
            mounted += 1;
        }
    }

    async prepareVisibleChunksForGameplay({ batchSize = 3, onProgress = null } = {}) {
        if (this.performanceProfile !== 'gameplay' || !this.player) return;

        this.syncVisibleChunks(true);
        const initialPending = this.pendingChunkMounts.length;
        let mounted = 0;
        onProgress?.(initialPending === 0 ? 1 : 0);

        while (this.pendingChunkMounts.length > 0) {
            const before = this.pendingChunkMounts.length;
            this.processPendingChunkMounts(batchSize);
            mounted += Math.max(0, before - this.pendingChunkMounts.length);
            const total = Math.max(1, initialPending);
            onProgress?.(Math.min(1, mounted / total));
            await new Promise((resolve) => requestAnimationFrame(resolve));
        }

        this.syncVisibleChunks(true);

        // Warm up the GPU before the cutscene: compile every material's shader
        // program and prime the shadow map now, while the loader still covers
        // the screen. Otherwise these one-time costs land on the first rendered
        // frames and stutter the cutscene.
        if (this.renderer && this.camera) {
            try {
                this.renderer.compile(this.scene, this.camera);
            } catch {
                // compile() is best-effort; never block the drop on it.
            }
            this.renderer.shadowMap.needsUpdate = true;
            this.renderer.render(this.scene, this.camera);
        }

        onProgress?.(1);
    }

    mountChunk(chunkX, chunkY) {
        const grid = this.getOrCreateChunk(chunkX, chunkY);
        const group = new THREE.Group();

        // Landform-specific wall dressing: ruins are mostly toppled short
        // walls, field outcrops read as tilted rock, canyon ridges stand
        // tall and unbroken. Same shared geometries, different mix.
        const landform = this.getChunkLandform(chunkX, chunkY);
        this.maybeSpawnChunkLoreDrop(chunkX, chunkY, grid, landform);
        let holeCut = 0.06;
        let hazardCut = 0.22;
        let damagedCut = 0.35;
        if (landform === LANDFORMS.RUINS) {
            holeCut = 0.08; hazardCut = 0.12; damagedCut = 0.85;
        } else if (landform === LANDFORMS.FIELD) {
            holeCut = 0.03; hazardCut = 0.05; damagedCut = 0.60;
        } else if (landform === LANDFORMS.CANYON) {
            holeCut = 0.0; hazardCut = 0.06; damagedCut = 0.12;
        }

        // Single merged floor for the whole chunk (see chunkFloorGeometry note).
        const chunkCenter = (this.chunkSize - 1) / 2;
        const chunkFloor = new THREE.Mesh(this.chunkFloorGeometry, this.floorMaterial);
        chunkFloor.rotation.x = -Math.PI / 2;
        chunkFloor.position.set(
            chunkX * this.chunkSize + chunkCenter,
            0,
            chunkY * this.chunkSize + chunkCenter
        );
        chunkFloor.receiveShadow = true;
        group.add(chunkFloor);

        for (let localY = 0; localY < this.chunkSize; localY++) {
            for (let localX = 0; localX < this.chunkSize; localX++) {
                const worldX = chunkX * this.chunkSize + localX;
                const worldZ = chunkY * this.chunkSize + localY;

                if (grid[localY][localX] !== '#') continue;

                const wallTypeRng = this.createSeededRandom(this.hashTile(worldX, worldZ) + 999);
                const wallTypeRoll = wallTypeRng();

                if (wallTypeRoll < holeCut) {
                    // Hole / Pit (flat on the ground)
                    const holeMesh = new THREE.Mesh(this.floorGeometry, this.holeMaterial);
                    holeMesh.rotation.x = -Math.PI / 2;
                    // Various sizes scaled up based on seeded random (from 1.5 up to 4.0)
                    const sizeFactor = wallTypeRoll / holeCut;
                    const scale = 1.5 + sizeFactor * 2.5;
                    holeMesh.scale.set(scale, scale, 1);
                    // Random organic rotation around the Z axis (the tile normal)
                    holeMesh.rotation.z = wallTypeRng() * Math.PI * 2;
                    holeMesh.position.set(worldX, 0.005, worldZ);
                    holeMesh.receiveShadow = true;
                    group.add(holeMesh);
                } else if (wallTypeRoll < hazardCut) {
                    // Hazard Wall (pulsing warning siren)
                    const wall = new THREE.Mesh(this.wallGeometry, this.wallMaterial);
                    wall.position.set(worldX, this.wallHeight / 2, worldZ);
                    wall.castShadow = true;
                    wall.receiveShadow = true;
                    wall.userData.isWall = true;
                    group.add(wall);

                    const sirenBase = new THREE.Mesh(this.sirenBaseGeometry, this.sirenBaseMaterial);
                    sirenBase.position.y = this.wallHeight / 2 + 0.05;
                    wall.add(sirenBase);

                    // Emissive dome only — NO per-wall PointLight. Dozens of dynamic
                    // lights per chunk forced a full shader recompile on every mount
                    // (the chunk-load stall) and crushed forward rendering. The shared
                    // dome material pulses instead (see the siren animation loop).
                    const sirenDome = new THREE.Mesh(this.sirenDomeGeometry, this.sirenDomeMaterial);
                    sirenDome.position.y = this.wallHeight / 2 + 0.14;
                    wall.add(sirenDome);
                } else if (wallTypeRoll < damagedCut) {
                    // Damaged Wall (ruins with rubble debris)
                    const shortHeightMult = 0.45 + wallTypeRng() * 0.25;
                    const damagedHeight = this.wallHeight * shortHeightMult;
                    
                    const wall = new THREE.Mesh(this.wallGeometry, this.wallMaterial);
                    wall.position.set(worldX, damagedHeight / 2, worldZ);
                    // Scale the Y height dynamically on the reused geometry
                    wall.scale.set(1, shortHeightMult, 1);
                    
                    wall.rotation.x = (wallTypeRng() - 0.5) * 0.15;
                    wall.rotation.z = (wallTypeRng() - 0.5) * 0.15;
                    
                    wall.castShadow = true;
                    wall.receiveShadow = true;
                    wall.userData.isWall = true;
                    group.add(wall);

                    const rubbleCount = 2 + Math.floor(wallTypeRng() * 3);
                    for (let i = 0; i < rubbleCount; i++) {
                        const size = 0.05 + wallTypeRng() * 0.07;
                        const rubble = new THREE.Mesh(this.rubbleGeometry, this.wallMaterial);
                        // Scale the reused unit dodecahedron geometry
                        rubble.scale.set(size, size, size);
                        
                        const rx = (wallTypeRng() - 0.5) * 0.72;
                        const rz = (wallTypeRng() - 0.5) * 0.72;
                        rubble.position.set(worldX + rx, size, worldZ + rz);
                        rubble.rotation.set(wallTypeRng() * Math.PI, wallTypeRng() * Math.PI, 0);
                        
                        rubble.castShadow = true;
                        rubble.receiveShadow = true;
                        group.add(rubble);
                    }
                } else {
                    // Standard Wall
                    const wall = new THREE.Mesh(this.wallGeometry, this.wallMaterial);
                    wall.position.set(worldX, this.wallHeight / 2, worldZ);
                    // Canyon ridges tower over the standard maze so the halls
                    // read as carved terrain, not corridors.
                    if (landform === LANDFORMS.CANYON) {
                        const ridge = 1.2 + wallTypeRng() * 0.35;
                        wall.scale.y = ridge;
                        wall.position.y = (this.wallHeight * ridge) / 2;
                    }
                    wall.castShadow = true;
                    wall.receiveShadow = true;
                    wall.userData.isWall = true;
                    group.add(wall);

                    const rng = this.createSeededRandom(this.hashTile(worldX, worldZ));
                    const roll = rng();
                    if (roll < 0.12) {
                        const pillar = new THREE.Mesh(this.pillarGeometry, this.wallMaterial);
                        const cx = (rng() < 0.5 ? -0.5 : 0.5);
                        const cz = (rng() < 0.5 ? -0.5 : 0.5);
                        pillar.position.set(cx, 0, cz);
                        pillar.castShadow = true;
                        pillar.receiveShadow = true;
                        wall.add(pillar);
                    } else if (roll < 0.24) {
                        const bracket = new THREE.Mesh(this.bracketGeometry, this.wallMaterial);
                        const faceRoll = Math.floor(rng() * 4);
                        if (faceRoll === 0) {
                            bracket.position.set(0.5, (rng() - 0.5) * 1.5, 0);
                            bracket.rotation.y = Math.PI / 2;
                        } else if (faceRoll === 1) {
                            bracket.position.set(-0.5, (rng() - 0.5) * 1.5, 0);
                            bracket.rotation.y = Math.PI / 2;
                        } else if (faceRoll === 2) {
                            bracket.position.set(0, (rng() - 0.5) * 1.5, 0.5);
                        } else {
                            bracket.position.set(0, (rng() - 0.5) * 1.5, -0.5);
                        }
                        bracket.castShadow = true;
                        bracket.receiveShadow = true;
                        wall.add(bracket);
                    } else if (roll < 0.32) {
                        const vent = new THREE.Mesh(this.ventGeometry, this.ventMaterial);
                        const faceRoll = Math.floor(rng() * 4);
                        const vy = 0.4 + rng() * 0.6;
                        if (faceRoll === 0) {
                            vent.position.set(0.501, vy, 0);
                            vent.rotation.y = Math.PI / 2;
                        } else if (faceRoll === 1) {
                            vent.position.set(-0.501, vy, 0);
                            vent.rotation.y = Math.PI / 2;
                        } else if (faceRoll === 2) {
                            vent.position.set(0, vy, 0.501);
                        } else {
                            vent.position.set(0, vy, -0.501);
                        }
                        wall.add(vent);
                    } else if (roll < 0.38) {
                        const pipe = new THREE.Mesh(this.pipeGeometry, this.pipeMaterial);
                        const faceRoll = Math.floor(rng() * 4);
                        if (faceRoll === 0) {
                            pipe.position.set(0.42, 0, (rng() - 0.5) * 0.6);
                        } else if (faceRoll === 1) {
                            pipe.position.set(-0.42, 0, (rng() - 0.5) * 0.6);
                        } else if (faceRoll === 2) {
                            pipe.position.set((rng() - 0.5) * 0.6, 0, 0.42);
                        } else {
                            pipe.position.set((rng() - 0.5) * 0.6, 0, -0.42);
                        }
                        pipe.castShadow = true;
                        pipe.receiveShadow = true;
                        wall.add(pipe);
                    }
                }
            }
        }

        // Spawn visual scatter sprites using the Snail Swarm Scatter algorithm
        const scatterPlacements = this.createChunkScatterPlacements(chunkX, chunkY, grid);
        for (const placement of scatterPlacements) {
            if (placement.type.startsWith('bunker_junk') && this.depletedGearPileKeys.has(placement.scatterKey)) {
                continue;
            }
            const scatter = this.createScatterInstance(placement);
            if (scatter) {
                group.add(scatter);
            }
        }

        const pickupPlacements = this.createChunkPickupPlacements(chunkX, chunkY, grid);
        for (const placement of pickupPlacements) {
            const pickup = this.createPickupInstance(placement);
            if (pickup) {
                group.add(pickup);
            }
        }

        // Add subtle reward-cache glow lights in dead-end rooms
        const roomTypes = this.getRoomTypeGrid(chunkX, chunkY);
        const chunkTemplate = this.getChunkTemplate(chunkX, chunkY);
        const templateCfg = chunkTemplate ? ROOM_TEMPLATE_CONFIGS[chunkTemplate] : null;
        if (roomTypes) {
            const biomeKey = this.getBiomeKeyForWorldPosition(
                chunkX * this.chunkSize + this.chunkSize * 0.5,
                chunkY * this.chunkSize + this.chunkSize * 0.5
            );
            const defaultLightColor = biomeKey === 'cryo' ? 0x88aaff : biomeKey === 'bio' ? 0x66cc88 : 0xffcc66;
            const deadEndLights = [];
            let chamberCenter = null;
            for (let localY = 1; localY < this.chunkSize - 1; localY++) {
                for (let localX = 1; localX < this.chunkSize - 1; localX++) {
                    const rt = roomTypes[localY][localX];
                    if (rt === ROOM_TYPES.DEAD_END) {
                        const wx = chunkX * this.chunkSize + localX;
                        const wz = chunkY * this.chunkSize + localY;
                        deadEndLights.push({ wx, wz });
                    } else if (rt === ROOM_TYPES.CHAMBER && !chamberCenter) {
                        chamberCenter = {
                            wx: chunkX * this.chunkSize + localX,
                            wz: chunkY * this.chunkSize + localY
                        };
                    }
                }
            }
            for (const { wx, wz } of deadEndLights.slice(0, 2)) {
                const deLight = new THREE.PointLight(defaultLightColor, 1.1, 5, 2);
                deLight.position.set(wx, 1.4, wz);
                group.add(deLight);
            }
            // Template-specific chamber light
            if (templateCfg && chamberCenter) {
                const tLight = new THREE.PointLight(templateCfg.lightColor, templateCfg.lightIntensity, 8, 2);
                tLight.position.set(chamberCenter.wx, 1.8, chamberCenter.wz);
                group.add(tLight);
            }
        }

        this.chunkGroups.add(group);
        this.chunkMeshes.set(`${chunkX},${chunkY}`, group);
    }

    createPickupAssets() {
        const healthMaterial = new THREE.MeshStandardMaterial({
            color: 0xff6f7d,
            emissive: 0x8f1c28,
            emissiveIntensity: 0.85,
            roughness: 0.28,
            metalness: 0.1
        });
        const ammoMaterial = new THREE.MeshStandardMaterial({
            color: 0x63d4ff,
            emissive: 0x0d4c72,
            emissiveIntensity: 0.75,
            roughness: 0.32,
            metalness: 0.5
        });
        const weaponMaterial = new THREE.MeshStandardMaterial({
            color: 0xffcc58,
            emissive: 0x72560a,
            emissiveIntensity: 0.72,
            roughness: 0.3,
            metalness: 0.58
        });
        const coinMaterial = new THREE.MeshStandardMaterial({
            color: 0xffd86a,
            emissive: 0x7c5600,
            emissiveIntensity: 0.82,
            roughness: 0.22,
            metalness: 0.68
        });
        const shadowMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.16,
            depthWrite: false
        });

        return {
            health: {
                material: healthMaterial,
                accent: new THREE.MeshStandardMaterial({
                    color: 0xffd6db,
                    emissive: 0x4f0d16,
                    emissiveIntensity: 0.45,
                    roughness: 0.24,
                    metalness: 0.08
                })
            },
            ammo: {
                material: ammoMaterial,
                accent: new THREE.MeshStandardMaterial({
                    color: 0xc9f2ff,
                    emissive: 0x12435f,
                    emissiveIntensity: 0.36,
                    roughness: 0.18,
                    metalness: 0.2
                })
            },
            weapon: {
                material: weaponMaterial,
                accent: new THREE.MeshStandardMaterial({
                    color: 0xfff0b3,
                    emissive: 0x4f3908,
                    emissiveIntensity: 0.42,
                    roughness: 0.18,
                    metalness: 0.24
                })
            },
            coin: {
                material: coinMaterial,
                accent: new THREE.MeshStandardMaterial({
                    color: 0xfff2b0,
                    emissive: 0x5b4308,
                    emissiveIntensity: 0.42,
                    roughness: 0.16,
                    metalness: 0.32
                })
            },
            shadowMaterial
        };
    }

    createChunkPickupPlacements(chunkX, chunkY, grid) {
        const random = this.createSeededRandom(this.hashTile(chunkX * 401 + 17, chunkY * 733 + 29));
        const depthTier = this.getDepthTier(chunkX, chunkY);
        const depthLootConfig = getDepthLootConfig(depthTier);
        const spawn = this.getSpawnTile();
        const roomTypes = this.getRoomTypeGrid(chunkX, chunkY);
        const candidates = [];

        for (let localY = 0; localY < this.chunkSize; localY++) {
            for (let localX = 0; localX < this.chunkSize; localX++) {
                if (grid[localY][localX] === '#') continue;

                const worldX = chunkX * this.chunkSize + localX;
                const worldZ = chunkY * this.chunkSize + localY;
                const dx = worldX - spawn.x;
                const dz = worldZ - spawn.y;
                const distToSpawn = Math.sqrt(dx * dx + dz * dz);

                if (distToSpawn <= 6.0) continue;

                const roomType = roomTypes?.[localY]?.[localX] ?? ROOM_TYPES.CORRIDOR;
                candidates.push({
                    localX,
                    localY,
                    worldX,
                    worldZ,
                    roomType,
                    edgeDistance: Math.min(localX, localY, this.chunkSize - 1 - localX, this.chunkSize - 1 - localY)
                });
            }
        }

        if (candidates.length < 10) {
            return [];
        }

        const occupied = new Set();
        const placements = [];
        const basePlacements = Math.min(
            Math.max(5, Math.round(candidates.length * 0.08)),
            12
        );
        const totalPlacements = Math.min(
            candidates.length,
            Math.max(3, Math.round(basePlacements * depthLootConfig.pickupMultiplier))
        );
        const clusterCount = Math.min(4, Math.max(2, Math.round(totalPlacements / 3.2)));
        const clusterTargets = [];

        for (let clusterIndex = 0; clusterIndex < clusterCount; clusterIndex++) {
            const center = this.selectClusterCenter(candidates, clusterTargets, random);
            if (!center) break;

            const clusterRadius = 1.3 + random() * 2.1;
            const clusterSize = Math.max(2, Math.round((totalPlacements / clusterCount) * (0.75 + random() * 0.6)));
            const subgroupCount = 1 + Math.floor(random() * 3);
            const subgroupAnchors = Array.from({ length: subgroupCount }, () => ({
                x: center.worldX + (random() - 0.5) * clusterRadius * 1.3,
                z: center.worldZ + (random() - 0.5) * clusterRadius * 1.3
            }));

            clusterTargets.push({ center, clusterRadius, clusterSize, subgroupAnchors });
        }

        const clusteredTarget = Math.round(totalPlacements * PICKUP_DISTRIBUTION.clustered);
        const transitionalTarget = Math.round(totalPlacements * PICKUP_DISTRIBUTION.transitional);
        const strayTarget = Math.max(1, totalPlacements - clusteredTarget - transitionalTarget);

        for (const cluster of clusterTargets) {
            while (placements.length < clusteredTarget && cluster.clusterSize > 0) {
                const subgroup = cluster.subgroupAnchors[Math.floor(random() * cluster.subgroupAnchors.length)];
                const point = this.selectPickupCandidateNear(candidates, occupied, subgroup, cluster.clusterRadius, random);
                if (!point) break;
                placements.push(this.buildPickupPlacement(point, random, depthLootConfig.legendaryBoost));
                cluster.clusterSize -= 1;
            }
        }

        let transitionsPlaced = 0;
        while (transitionsPlaced < transitionalTarget) {
            const sourceCluster = clusterTargets[Math.floor(random() * clusterTargets.length)];
            const point = this.selectTransitionCandidate(candidates, occupied, sourceCluster, random);
            if (!point) break;
            placements.push(this.buildPickupPlacement(point, random, depthLootConfig.legendaryBoost));
            transitionsPlaced += 1;
        }

        let straysPlaced = 0;
        while (straysPlaced < strayTarget) {
            const point = this.selectStrayCandidate(candidates, occupied, clusterTargets, random);
            if (!point) break;
            placements.push(this.buildPickupPlacement(point, random, depthLootConfig.legendaryBoost));
            straysPlaced += 1;
        }

        // Template-based extra pickups for authored rooms
        const chunkTemplate2 = this.getChunkTemplate(chunkX, chunkY);
        const templateCfg2 = chunkTemplate2 ? ROOM_TEMPLATE_CONFIGS[chunkTemplate2] : null;
        if (templateCfg2?.pickupBias) {
            const chamberCandidates = candidates.filter((c) => c.roomType === ROOM_TYPES.CHAMBER);
            const legendaryBoostOverride = depthLootConfig.legendaryBoost + (templateCfg2.legendaryBoost ?? 0);
            for (const [pType, count] of Object.entries(templateCfg2.pickupBias)) {
                for (let i = 0; i < count; i++) {
                    const src = chamberCandidates[Math.floor(random() * Math.max(1, chamberCandidates.length))];
                    if (!src) continue;
                    const nearKey = `${src.localX},${src.localY}:tmpl_${i}`;
                    if (occupied.has(nearKey)) continue;
                    occupied.add(nearKey);
                    const base = this.buildPickupPlacement(src, random, legendaryBoostOverride);
                    placements.push({ ...base, type: pType });
                }
            }
        }

        // Dead-end reward rooms: guaranteed extra pickups at any dead-end tiles in this chunk.
        // Dead ends are branching paths worth exploring — payoff the player for detouring.
        const deadEndCandidates = candidates.filter((c) => c.roomType === ROOM_TYPES.DEAD_END);
        for (const de of deadEndCandidates) {
            const key = `${de.localX},${de.localY}`;
            if (occupied.has(key)) continue;
            const extraCount = 2 + Math.floor(random() * 2);
            for (let i = 0; i < extraCount; i++) {
                const nearKey = `${de.localX + Math.round((random() - 0.5))},${de.localY + Math.round((random() - 0.5))}`;
                if (occupied.has(nearKey)) continue;
                occupied.add(nearKey);
                placements.push(this.buildPickupPlacement(de, random, depthLootConfig.legendaryBoost + 0.08));
            }
        }

        return placements;
    }

    selectClusterCenter(candidates, clusters, random) {
        let bestCandidate = null;
        let bestScore = -Infinity;

        for (const candidate of candidates) {
            if (candidate.edgeDistance < 1) continue;

            const nearestClusterDistance = clusters.length === 0
                ? this.chunkSize
                : Math.min(...clusters.map((cluster) => (
                    Math.hypot(
                        candidate.worldX - cluster.center.worldX,
                        candidate.worldZ - cluster.center.worldZ
                    )
                )));

            if (nearestClusterDistance < 3.1) continue;

            const score = candidate.edgeDistance * 1.5 + nearestClusterDistance * 0.65 + random() * 1.2;
            if (score > bestScore) {
                bestScore = score;
                bestCandidate = candidate;
            }
        }

        return bestCandidate;
    }

    selectPickupCandidateNear(candidates, occupied, anchor, radius, random) {
        const nearby = candidates
            .filter((candidate) => {
                const key = `${candidate.localX},${candidate.localY}`;
                if (occupied.has(key)) return false;
                const distance = Math.hypot(candidate.worldX - anchor.x, candidate.worldZ - anchor.z);
                return distance <= radius + random() * 0.7;
            })
            .sort((a, b) => {
                const distA = Math.hypot(a.worldX - anchor.x, a.worldZ - anchor.z);
                const distB = Math.hypot(b.worldX - anchor.x, b.worldZ - anchor.z);
                return (distA + random() * 0.45) - (distB + random() * 0.45);
            });

        const choice = nearby.find((candidate) => this.claimPickupTile(candidate, occupied));
        return choice ?? null;
    }

    selectTransitionCandidate(candidates, occupied, cluster, random) {
        if (!cluster) return null;

        const angle = random() * Math.PI * 2;
        const stretch = cluster.clusterRadius * (1.4 + random() * 1.7);
        const anchor = {
            x: cluster.center.worldX + Math.cos(angle) * stretch,
            z: cluster.center.worldZ + Math.sin(angle) * stretch
        };

        return this.selectPickupCandidateNear(candidates, occupied, anchor, 1.8 + random() * 1.3, random);
    }

    selectStrayCandidate(candidates, occupied, clusters, random) {
        const isolated = candidates
            .filter((candidate) => {
                const key = `${candidate.localX},${candidate.localY}`;
                if (occupied.has(key)) return false;
                return clusters.every((cluster) => {
                    const distance = Math.hypot(candidate.worldX - cluster.center.worldX, candidate.worldZ - cluster.center.worldZ);
                    return distance >= cluster.clusterRadius * 1.2;
                });
            })
            .sort((a, b) => (b.edgeDistance + random()) - (a.edgeDistance + random()));

        const choice = isolated.find((candidate) => this.claimPickupTile(candidate, occupied));
        return choice ?? null;
    }

    claimPickupTile(candidate, occupied) {
        const neighbors = [
            [0, 0],
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1]
        ];

        for (const [offsetX, offsetY] of neighbors) {
            if (occupied.has(`${candidate.localX + offsetX},${candidate.localY + offsetY}`)) {
                return false;
            }
        }

        occupied.add(`${candidate.localX},${candidate.localY}`);
        return true;
    }

    buildPickupPlacement(candidate, random, legendaryBoost = 0) {
        const type = this.choosePickupTypeForRoom(random, candidate.roomType);
        const rarity = this.chooseLootRarity(random, legendaryBoost);
        const scale = type === 'weapon'
            ? 0.9 + random() * 0.3
            : 0.82 + random() * 0.24;

        return {
            ...candidate,
            type,
            rarity,
            scale,
            rotation: random() * Math.PI * 2,
            tiltX: (random() - 0.5) * 0.16,
            tiltZ: (random() - 0.5) * 0.16,
            elevation: 0.2 + random() * 0.18,
            offsetX: (random() - 0.5) * 0.28,
            offsetZ: (random() - 0.5) * 0.28,
            bobOffset: random() * Math.PI * 2,
            shadowRadius: (type === 'weapon' ? 0.34 : 0.28) + random() * 0.06
        };
    }

    createChunkScatterPlacements(chunkX, chunkY, grid) {
        if (this.performanceProfile === 'menu') {
            return [];
        }
        const random = this.createSeededRandom(this.hashTile(chunkX * 523 + 43, chunkY * 859 + 71));
        const spawn = this.getSpawnTile();
        const roomTypes = this.getRoomTypeGrid(chunkX, chunkY);
        const candidates = [];

        // Find walkable candidates in this chunk
        for (let localY = 0; localY < this.chunkSize; localY++) {
            for (let localX = 0; localX < this.chunkSize; localX++) {
                if (grid[localY][localX] === '#') continue;

                const worldX = chunkX * this.chunkSize + localX;
                const worldZ = chunkY * this.chunkSize + localY;
                const dx = worldX - spawn.x;
                const dz = worldZ - spawn.y;
                const distToSpawn = Math.sqrt(dx * dx + dz * dz);

                // Keep away from player's starting spawn tile
                if (distToSpawn <= 6.0) continue;

                candidates.push({
                    localX,
                    localY,
                    worldX,
                    worldZ
                });
            }
        }

        if (candidates.length < 10) return [];
        const chunkCenterX = chunkX * this.chunkSize + (this.chunkSize * 0.5);
        const chunkCenterZ = chunkY * this.chunkSize + (this.chunkSize * 0.5);
        const biomeKey = this.getBiomeKeyForWorldPosition(chunkCenterX, chunkCenterZ);
        const biomeVariants = BIOME_SCATTER_VARIANTS[biomeKey] ?? BIOME_SCATTER_VARIANTS[BIOME_KEYS.ACTIVE];
        const allowJunkPiles = biomeKey === BIOME_KEYS.ACTIVE;

        const totalItems = Math.floor(6 + random() * 5);
        const targetClustered = Math.round(totalItems * SCATTER_CLUSTER_RATIO);
        const targetTransitional = Math.round(totalItems * SCATTER_TRANSITION_RATIO);
        const targetStrays = Math.max(
            1,
            Math.round(totalItems * SCATTER_STRAY_RATIO),
            totalItems - targetClustered - targetTransitional
        );

        const placements = [];

        // 1. Setup Macro Cluster Centers
        const numClusters = Math.min(3, Math.max(2, Math.round(totalItems / 6)));
        const clusters = [];
        for (let i = 0; i < numClusters; i++) {
            const center = this.selectScatterClusterCenter(candidates, clusters, random);
            if (!center) break;
            clusters.push({
                center,
                radius: 1.8 + random() * 1.6,
                weight: 0.5 + random() * 0.5
            });
        }

        // Helper to check if a continuous coordinate is walkable
        const isWalkable = (x, z) => {
            const localX = Math.round(x - chunkX * this.chunkSize);
            const localY = Math.round(z - chunkY * this.chunkSize);
            if (localX < 0 || localX >= this.chunkSize || localY < 0 || localY >= this.chunkSize) return false;
            return grid[localY][localX] !== '#';
        };

        // 2. Generate Clustered elements (70%)
        let clusteredPlaced = 0;
        let attempts = 0;
        while (clusteredPlaced < targetClustered && attempts < 120 && clusters.length > 0) {
            attempts++;
            const cluster = clusters[Math.floor(random() * clusters.length)];
            const angle = random() * Math.PI * 2;
            const dist = Math.pow(random(), 0.8) * cluster.radius;
            const x = cluster.center.worldX + Math.cos(angle) * dist;
            const z = cluster.center.worldZ + Math.sin(angle) * dist;

            if (isWalkable(x, z)) {
                placements.push({ x, z, groupType: 'clustered' });
                clusteredPlaced++;
            }
        }

        // 3. Generate Transitional elements (20%) - bridge between clusters
        let transitionalPlaced = 0;
        attempts = 0;
        while (transitionalPlaced < targetTransitional && attempts < 80 && clusters.length >= 2) {
            attempts++;
            const idxA = Math.floor(random() * clusters.length);
            let idxB = Math.floor(random() * clusters.length);
            if (idxA === idxB) idxB = (idxA + 1) % clusters.length;

            const cA = clusters[idxA].center;
            const cB = clusters[idxB].center;

            // Choose an interpolation point with some perpendicular jitter
            const t = 0.2 + random() * 0.6;
            const perpAngle = Math.atan2(cB.worldZ - cA.worldZ, cB.worldX - cA.worldX) + Math.PI / 2;
            const jitter = (random() - 0.5) * 1.9;

            const x = cA.worldX + (cB.worldX - cA.worldX) * t + Math.cos(perpAngle) * jitter;
            const z = cA.worldZ + (cB.worldZ - cA.worldZ) * t + Math.sin(perpAngle) * jitter;

            if (isWalkable(x, z)) {
                placements.push({ x, z, groupType: 'transitional' });
                transitionalPlaced++;
            }
        }

        // Fallback for transitional if there's only 1 cluster
        if (transitionalPlaced < targetTransitional && clusters.length === 1) {
            attempts = 0;
            while (transitionalPlaced < targetTransitional && attempts < 80) {
                attempts++;
                const cluster = clusters[0];
                const angle = random() * Math.PI * 2;
                // Place further out
                const dist = cluster.radius + 0.8 + random() * 2.4;
                const x = cluster.center.worldX + Math.cos(angle) * dist;
                const z = cluster.center.worldZ + Math.sin(angle) * dist;

                if (isWalkable(x, z)) {
                    placements.push({ x, z, groupType: 'transitional' });
                    transitionalPlaced++;
                }
            }
        }

        // 4. Generate Isolated Strays (10%) - far from clusters
        let straysPlaced = 0;
        attempts = 0;
        while (straysPlaced < targetStrays && attempts < 120) {
            attempts++;
            const candidate = candidates[Math.floor(random() * candidates.length)];
            const offsetAngle = random() * Math.PI * 2;
            const offsetDist = random() * 0.65;
            const x = candidate.worldX + Math.cos(offsetAngle) * offsetDist;
            const z = candidate.worldZ + Math.sin(offsetAngle) * offsetDist;

            // Check if far from all cluster centers
            const farFromClusters = clusters.every(c => {
                const dist = Math.hypot(x - c.center.worldX, z - c.center.worldZ);
                    return dist > c.radius * 1.8 + 1.8;
                });

            if (farFromClusters && isWalkable(x, z)) {
                placements.push({ x, z, groupType: 'stray' });
                straysPlaced++;
            }
        }

        // 5. Relaxation pass to push overlaps away (5 passes)
        const minDistance = SCATTER_MIN_SEPARATION;
        for (let pass = 0; pass < 5; pass++) {
            for (let i = 0; i < placements.length; i++) {
                for (let j = i + 1; j < placements.length; j++) {
                    const p1 = placements[i];
                    const p2 = placements[j];
                    const dx = p2.x - p1.x;
                    const dz = p2.z - p1.z;
                    const dist = Math.hypot(dx, dz);
                    if (dist < minDistance) {
                        const overlap = minDistance - dist;
                        const angle = dist > 0.001 ? Math.atan2(dz, dx) : random() * Math.PI * 2;
                        const pushX = Math.cos(angle) * overlap * 0.5;
                        const pushZ = Math.sin(angle) * overlap * 0.5;

                        // Push away if still walkable
                        if (isWalkable(p1.x - pushX, p1.z - pushZ)) {
                            p1.x -= pushX;
                            p1.z -= pushZ;
                        }
                        if (isWalkable(p2.x + pushX, p2.z + pushZ)) {
                            p2.x += pushX;
                            p2.z += pushZ;
                        }
                    }
                }
            }
        }

        // 6. Build the final micro-varied placement properties
        const finalPlacements = [];
        const junkPlacementAnchors = [];
        const chunkBiomeKey = this.getBiomeKeyForWorldPosition(chunkCenterX, chunkCenterZ);
        const chunkTemplate = this.getChunkTemplate(chunkX, chunkY);
        const templateCfg = chunkTemplate ? ROOM_TEMPLATE_CONFIGS[chunkTemplate] : null;
        const templateNoEnemies = Boolean(templateCfg?.noEnemies);
        
        // Spawn boss if conditions match!
        const distance = Math.hypot(chunkCenterX, chunkCenterZ);
        let spawnBossType = null;
        const generatorLevel = this.bank ? this.bank.getO2GeneratorLevel() : 0;

        if (chunkBiomeKey === BIOME_KEYS.ACTIVE && distance >= 50 && distance <= 60 && generatorLevel >= 1) {
            if (!this.killedBosses.has('active') && !this.scatterSprites.some(s => s.userData.isBoss && s.userData.biome === 'active')) {
                spawnBossType = 'boss_cybersnail';
            }
        } else if (chunkBiomeKey === BIOME_KEYS.CRYO && distance >= 120 && distance <= 140 && generatorLevel >= 2) {
            if (!this.killedBosses.has('cryo') && !this.scatterSprites.some(s => s.userData.isBoss && s.userData.biome === 'cryo')) {
                spawnBossType = 'boss_cryosnail';
            }
        } else if (chunkBiomeKey === BIOME_KEYS.BIO && distance >= 220 && distance <= 250 && generatorLevel >= 3) {
            if (!this.killedBosses.has('bio') && !this.scatterSprites.some(s => s.userData.isBoss && s.userData.biome === 'bio')) {
                spawnBossType = 'boss_sporesnail';
            }
        }

        if (spawnBossType && candidates.length > 0) {
            let bestIndex = 0;
            let minCenterDist = Infinity;
            for (let i = 0; i < candidates.length; i++) {
                const c = candidates[i];
                const d = Math.hypot(c.localX - this.chunkSize/2, c.localY - this.chunkSize/2);
                if (d < minCenterDist) {
                    minCenterDist = d;
                    bestIndex = i;
                }
            }
            const bossCand = candidates.splice(bestIndex, 1)[0];
            finalPlacements.push({
                x: bossCand.worldX,
                z: bossCand.worldZ,
                type: spawnBossType,
                scatterKey: `${chunkX},${chunkY}:boss:${spawnBossType}`,
                scale: spawnBossType === 'boss_cybersnail' ? 3.2 : spawnBossType === 'boss_cryosnail' ? 3.8 : 4.4,
                rotation: 0,
                tiltX: 0,
                tiltZ: 0,
                elevation: 0.1,
                groupType: 'boss',
                phase: 0,
                opacity: 1,
                biomeTint: spawnBossType === 'boss_cryosnail' ? 0x88ccff : spawnBossType === 'boss_sporesnail' ? 0x88ff88 : 0xffffff,
                isBoss: true
            });
        }

        let snailCount = 0;
        let crawlerCount = 0;
        let protoCount = 0;
        let hasSentinelThisChunk = false;
        let hasLoreTerminalThisChunk = false;
        const depthTierForScatter = this.getDepthTier(chunkX, chunkY);
        const snailSpawnConfig = SNAIL_DEPTH_SPAWN[Math.min(depthTierForScatter, SNAIL_DEPTH_SPAWN.length - 1)];
        // Proto enemies are landform-native: crawlers nest in ruins, spitters
        // guard crater rims. Run-director cards can bias the rate (contract:
        // director.cardEffects.spawnBias, number or { proto } — defensive
        // read, the director may not expose cards yet).
        const chunkLandform = this.getChunkLandform(chunkX, chunkY);
        const rawSpawnBias = this.bunkerDirector?.cardEffects?.spawnBias;
        const protoSpawnBias = typeof rawSpawnBias === 'number'
            ? rawSpawnBias
            : Number.isFinite(rawSpawnBias?.proto) ? rawSpawnBias.proto : 1;
        for (const p of placements) {
            // Re-verify after relaxation that it's still walkable
            if (!isWalkable(p.x, p.z)) continue;

            // Determine asset type based on weighted roll.
            const roll = random();
            const distFromSpawn = Math.hypot(p.x - spawn.x, p.z - spawn.y);
            const localPX = Math.round(p.x - chunkX * this.chunkSize);
            const localPZ = Math.round(p.z - chunkY * this.chunkSize);
            const pRoomType = roomTypes?.[localPZ]?.[localPX] ?? null;
            const isDeadEnd = pRoomType === ROOM_TYPES.DEAD_END;
            const isChamber = pRoomType === ROOM_TYPES.CHAMBER;
            const canSpawnSnail = !templateNoEnemies && distFromSpawn > 14 && snailCount < snailSpawnConfig.maxCount && !isDeadEnd;
            const sentinelForced = templateCfg?.forceSentinel && isChamber && !hasSentinelThisChunk && distFromSpawn > 20;
            const canSpawnSentinel = !templateNoEnemies && (sentinelForced || (depthTierForScatter >= 2 && isChamber && !hasSentinelThisChunk && distFromSpawn > 20));
            const canSpawnCrawler = !templateNoEnemies && depthTierForScatter >= 3 && chunkBiomeKey === BIOME_KEYS.BIO && crawlerCount < 2 && distFromSpawn > 20 && !isDeadEnd;
            const canSpawnProto = !templateNoEnemies && depthTierForScatter >= 1
                && protoCount < PROTO_SPAWN_MAX_PER_CHUNK && distFromSpawn > 16 && !isDeadEnd
                && (chunkLandform === LANDFORMS.RUINS || chunkLandform === LANDFORMS.CRATER);
            const loreChance = (templateCfg?.forceLore && !hasLoreTerminalThisChunk && isDeadEnd) ? 1.0 : (depthTierForScatter >= 2 ? 0.12 : 0.07);
            const canSpawnLore = isDeadEnd && !hasLoreTerminalThisChunk && distFromSpawn > 10;
            let type;
            let scaleMultiplier;
            let elevation;
            let opacity;
            if (canSpawnSentinel && (sentinelForced || roll < 0.18)) {
                type = 'sentinel';
                scaleMultiplier = 1.0;
                elevation = 0.09;
                opacity = 1;
                hasSentinelThisChunk = true;
            } else if (canSpawnCrawler && roll < 0.22) {
                type = 'crawler';
                scaleMultiplier = 0.72 + random() * 0.18;
                elevation = 0.09;
                opacity = 1;
                crawlerCount += 1;
            } else if (canSpawnProto && roll < PROTO_SPAWN_CHANCE * protoSpawnBias) {
                type = chunkLandform === LANDFORMS.RUINS ? 'alien_proto_crawler' : 'alien_proto_spitter';
                scaleMultiplier = 0.9 + random() * 0.2;
                elevation = 0.09;
                opacity = 1;
                protoCount += 1;
            } else if (canSpawnLore && roll > (1 - loreChance)) {
                type = 'lore_terminal';
                scaleMultiplier = 0.7;
                elevation = 0.09;
                opacity = 1;
                hasLoreTerminalThisChunk = true;
            } else if (canSpawnSnail && roll < snailSpawnConfig.chance) {
                if (chunkBiomeKey === BIOME_KEYS.BIO) {
                    type = 'sporesnail';
                } else if (chunkBiomeKey === BIOME_KEYS.CRYO) {
                    type = 'cryosnail';
                } else {
                    type = 'cybersnail';
                }
                scaleMultiplier = 1.05 + random() * 0.26;
                elevation = 0.09 + random() * 0.05;
                opacity = 1;
                snailCount += 1;
            } else if (allowJunkPiles && roll < 0.52) {
                type = this.chooseWeightedType(JUNK_SCATTER_VARIANTS, random);
                scaleMultiplier = 1.72 + random() * 0.34;
                // Keep junk piles visually grounded but high enough to avoid floor clipping artifacts.
                elevation = 0.13 + random() * 0.08;
                opacity = 1;
            } else {
                type = this.chooseWeightedType(biomeVariants, random);
                const isGroundCover = type.includes('puddle') || type === 'scatter_gravel'
                    || type === 'scatter_cable_coil' || type === 'scatter_bolts'
                    || type === 'scatter_cryo_shards' || type === 'scatter_bio_moss'
                    || type === 'body_human_frozen_suit' || type === 'body_empty_exosuit';
                const isTallScatter = type === 'scatter_ice_stalagmite'
                    || type === 'scatter_bio_pod'
                    || type === 'prop_hive_resin_sac';
                const isWreckage = type === 'ship_wreckage';
                if (isWreckage) {
                    scaleMultiplier = 1.05 + random() * 0.3;
                    elevation = 0.12 + random() * 0.08;
                    opacity = 0.92;
                } else if (isGroundCover) {
                    if (type.startsWith('body_')) {
                        scaleMultiplier = 0.82 + random() * 0.16;
                        elevation = 0.06 + random() * 0.03;
                        opacity = 0.9 + random() * 0.08;
                    } else {
                        scaleMultiplier = 0.85 + random() * 0.28;
                        elevation = 0.05 + random() * 0.04;
                        opacity = 0.72 + random() * 0.14;
                    }
                } else if (isTallScatter) {
                    scaleMultiplier = 0.62 + random() * 0.24;
                    elevation = 0.8 + random() * 0.55;
                    opacity = 0.68 + random() * 0.22;
                } else {
                    scaleMultiplier = 0.42 + random() * 0.1;
                    elevation = 1.45 + random() * 0.95;
                    opacity = 0.58 + random() * 0.16;
                }
            }

            // Prevent junk piles from spawning too close to each other.
            if (type.startsWith('bunker_junk')) {
                const tooCloseToOtherJunk = junkPlacementAnchors.some((anchor) => (
                    Math.hypot(p.x - anchor.x, p.z - anchor.z) < BUNKER_JUNK_MIN_SEPARATION
                ));

                if (tooCloseToOtherJunk) {
                    type = this.chooseWeightedType(biomeVariants, random);
                    scaleMultiplier = 0.58 + random() * 0.18;
                    elevation = 0.9 + random() * 0.7;
                    opacity = 0.62 + random() * 0.16;
                } else {
                    junkPlacementAnchors.push({ x: p.x, z: p.z });
                }
            }

            // Micro-variations
            // Scale variation (+- 25%)
            const scale = scaleMultiplier * (0.75 + random() * 0.5);
            // Tilt distortion
            const tiltX = type === 'cybersnail' ? 0 : (random() - 0.5) * 0.16;
            const tiltZ = type === 'cybersnail' ? 0 : (random() - 0.5) * 0.16;
            // Subtle rotation (0 to 2pi)
            const rotation = type === 'cybersnail' || type.startsWith('body_') || type === 'prop_hive_resin_sac'
                ? 0
                : random() * Math.PI * 2;

            // Template overrides: THE_NEST forces enrage; AGENT_WRECKAGE adds wreckage scatter
            let finalType = type;
            if (templateCfg?.forceEnragedSnails && (type === 'sporesnail' || type === 'cybersnail') && snailCount <= (templateCfg.forceEnragedSnails ?? 0)) {
                finalType = chunkBiomeKey === BIOME_KEYS.BIO ? 'sporesnail' : type;
            }
            if (templateCfg?.forceWreckage && type !== 'sentinel' && type !== 'lore_terminal' && !this.isEnemyType(type) && random() < 0.3) {
                finalType = 'ship_wreckage';
            }

            finalPlacements.push({
                x: p.x,
                z: p.z,
                type: finalType,
                scatterKey: `${chunkX},${chunkY}:${finalPlacements.length}:${finalType}`,
                scale,
                rotation,
                tiltX,
                tiltZ,
                elevation,
                groupType: p.groupType,
                phase: random() * Math.PI * 2,
                opacity,
                biomeTint: (finalType === 'cybersnail' || finalType === 'sporesnail' || finalType === 'cryosnail') ? (SNAIL_BIOME_TINTS[chunkBiomeKey] ?? 0xffffff) : undefined,
                spawnedEnraged: (finalType === 'cybersnail' || finalType === 'sporesnail') && (depthTierForScatter >= 3 || Boolean(templateCfg?.forceEnragedSnails))
            });
        }

        return finalPlacements;
    }

    createJunkBurstPickupPlacement(originX, originZ, targetX, targetZ, random, junkType = 'bunker_junk') {
        const depthLootConfig = this.getDepthLootConfigForWorldPosition(originX, originZ);
        const rarity = this.chooseLootRarityForJunkType(junkType, random, depthLootConfig.legendaryBoost);
        const type = this.chooseJunkBurstPickupType(rarity, random);
        const scale = type === 'coin'
            ? 0.66 + random() * 0.14
            : 0.78 + random() * 0.18;

        return {
            worldX: targetX,
            worldZ: targetZ,
            type,
            rarity,
            scale,
            rotation: random() * Math.PI * 2,
            tiltX: (random() - 0.5) * 0.12,
            tiltZ: (random() - 0.5) * 0.12,
            elevation: 0.18 + random() * 0.08,
            offsetX: 0,
            offsetZ: 0,
            bobOffset: random() * Math.PI * 2,
            shadowRadius: (
                type === 'coin'
                    ? 0.18
                    : type === 'weapon'
                        ? 0.32
                        : 0.26
            ) + random() * 0.05,
            collectLock: 0.58,
            ejectStartX: originX,
            ejectStartZ: originZ,
            ejectTargetX: targetX,
            ejectTargetZ: targetZ
        };
    }

    createScatterInstance(placement) {
        const scaleX = placement.scale;
        const scaleY = placement.scale * (1.0 + placement.tiltX);
        const anchoredY = placement.elevation;

        if (placement.type.startsWith('bunker_junk')) {
            const spriteMaterial = this.scatterMaterials[placement.type];
            if (!spriteMaterial) return null;

            const clonedMat = spriteMaterial.clone();
            clonedMat.rotation = placement.rotation;
            clonedMat.alphaTest = 0.001;

            const sprite = new THREE.Sprite(clonedMat);
            sprite.center.set(0.5, 0);
            sprite.position.set(placement.x, anchoredY, placement.z);
            sprite.scale.set(scaleX, scaleY, 1);
            sprite.frustumCulled = false;
            sprite.renderOrder = 4;
            sprite.userData = {
                isScatter: true,
                type: placement.type,
                scatterKey: placement.scatterKey,
                groupType: placement.groupType,
                baseY: anchoredY,
                elevationOffset: placement.elevation,
                baseScaleX: scaleX,
                baseScaleY: scaleY,
                burstTriggered: false,
                burstTimer: 0,
                phase: placement.phase ?? 0,
                baseOpacity: placement.opacity ?? 1
            };
            return sprite;
        }

        if (placement.type === 'lore_terminal') {
            const mat = this.scatterMaterials.lore_terminal;
            if (!mat) return null;
            const clonedMat = mat.clone();
            clonedMat.alphaTest = 0.04;
            const sprite = new THREE.Sprite(clonedMat);
            sprite.center.set(0.5, 0);
            sprite.position.set(placement.x, anchoredY, placement.z);
            sprite.frustumCulled = false;
            sprite.renderOrder = 4;
            sprite.scale.set(scaleX * 0.8, scaleY * 0.8, 1);

            // Assign a log entry from the biome pool
            const biomeKey = this.getBiomeKeyForWorldPosition(placement.x, placement.z);
            const pool = LORE_LOGS[biomeKey] ?? LORE_LOGS.active;
            const logIndex = Math.floor(placement.phase * pool.length) % pool.length;
            const logEntry = pool[logIndex];

            sprite.userData = {
                isScatter: true,
                type: 'lore_terminal',
                scatterKey: placement.scatterKey,
                baseY: anchoredY,
                loreKey: logEntry.key,
                loreText: logEntry.text,
                baseOpacity: 1,
                phase: placement.phase ?? 0
            };
            return sprite;
        }

        if (this.isCrawler(placement.type)) {
            const mat = this.scatterMaterials.crawler;
            if (!mat) return null;
            const clonedMat = mat.clone();
            clonedMat.alphaTest = 0.06;
            const sx = scaleX * 0.72;
            const sy = scaleY * 0.72;
            const sprite = new THREE.Sprite(clonedMat);
            sprite.center.set(0.5, 0);
            sprite.position.set(placement.x, anchoredY, placement.z);
            sprite.frustumCulled = false;
            sprite.renderOrder = 6;
            sprite.scale.set(sx, sy, 1);
            sprite.userData = {
                isScatter: true,
                isEnemy: true,
                isBoss: false,
                type: 'crawler',
                scatterKey: placement.scatterKey,
                baseY: anchoredY,
                burstTriggered: false,
                burstTimer: 0,
                hp: CRAWLER_MAX_HP,
                maxHp: CRAWLER_MAX_HP,
                baseScaleX: sx,
                baseScaleY: sy,
                baseOpacity: 1,
                facingSign: 1,
                phase: Math.random() * Math.PI * 2,
                biomeTint: CRAWLER_TINT,
                crawlerState: 'idle',
                windupTimer: 0,
                chargeTimer: 0,
                chargeDirX: 0,
                chargeDirZ: 0,
                attackCooldown: 0
            };
            return sprite;
        }

        if (this.isSentinel(placement.type)) {
            const mat = this.scatterMaterials.sentinel;
            if (!mat) return null;
            const clonedMat = mat.clone();
            clonedMat.alphaTest = 0.06;
            const sprite = new THREE.Sprite(clonedMat);
            sprite.center.set(0.5, 0);
            sprite.position.set(placement.x, anchoredY, placement.z);
            sprite.frustumCulled = false;
            sprite.renderOrder = 6;
            sprite.scale.set(scaleX * 1.1, scaleY * 1.1, 1);
            sprite.userData = {
                isScatter: true,
                isEnemy: true,
                isBoss: false,
                type: 'sentinel',
                scatterKey: placement.scatterKey,
                baseY: anchoredY,
                burstTriggered: false,
                burstTimer: 0,
                hp: SENTINEL_MAX_HP,
                maxHp: SENTINEL_MAX_HP,
                fireCooldown: SENTINEL_FIRE_COOLDOWN * (0.5 + Math.random() * 0.8),
                detectRadius: SENTINEL_DETECT_RADIUS,
                active: false,
                biomeTint: 0xffdd44
            };
            return sprite;
        }

        if (this.isEnemyType(placement.type)) {
            if (!this.snailsEnabled) return null;
            const mat = this.scatterMaterials[placement.type];
            if (!mat) return null;
            const clonedMat = mat.clone();
            clonedMat.rotation = 0;
            clonedMat.alphaTest = 0.06;
            const tintColor = placement.biomeTint ?? 0xffffff;
            clonedMat.color.setHex(tintColor);

            // 4x4 walk-sheet enemies get their own keyed texture so each
            // sprite can hold an independent UV frame/facing. Cloning the
            // shared texture is unsafe here: the chroma-key canvas lands
            // async, and clones taken before it arrives stay blank.
            const sheetPath = SHEET_ENEMY_TYPES[placement.type];
            if (sheetPath) {
                const sheetTex = this.loadKeyedSpriteTexture(sheetPath, 16);
                sheetTex.wrapS = THREE.RepeatWrapping;
                sheetTex.wrapT = THREE.RepeatWrapping;
                sheetTex.repeat.set(0.25, 0.25);
                sheetTex.offset.set(0, 0.75); // frame 0, south-facing row
                clonedMat.map = sheetTex;
            }

            const isBoss = placement.isBoss || placement.type.startsWith('boss_');
            const isPreEnraged = Boolean(placement.spawnedEnraged) || isBoss;
            const sprite = new THREE.Sprite(clonedMat);
            sprite.center.set(0.5, 0);
            sprite.position.set(placement.x, anchoredY, placement.z);
            sprite.frustumCulled = false;
            sprite.renderOrder = isBoss ? 8 : 6;
            sprite.scale.set(scaleX, scaleY, 1);

            // Per-type HP/speed now live in src/data/enemies.js (behaviour-preserving).
            const _enemyStats = getEnemyStats(placement.type, { maxHp: SNAIL_MAX_HP, speed: SNAIL_MOVE_SPEED });
            let maxHp = _enemyStats.maxHp;
            let speed = _enemyStats.speed;
            if (Number.isFinite(placement.maxHp)) {
                maxHp = Math.max(1, Math.floor(placement.maxHp));
            }

            sprite.userData = {
                isScatter: true,
                isEnemy: true,
                isBoss: isBoss,
                biome: placement.type.includes('cryo') ? 'cryo' : placement.type.includes('spore') ? 'bio' : 'active',
                type: placement.type,
                scatterKey: placement.scatterKey,
                groupType: placement.groupType,
                sheetSprite: Boolean(sheetPath),
                sheetTime: 0,
                sheetRow: 0,
                baseY: anchoredY,
                elevationOffset: placement.elevation,
                baseScaleX: scaleX,
                baseScaleY: scaleY,
                burstTriggered: false,
                burstTimer: 0,
                phase: placement.phase ?? 0,
                baseOpacity: placement.opacity ?? 1,
                hp: maxHp,
                maxHp: maxHp,
                speed: speed,
                enraged: isPreEnraged,
                facingSign: 1,
                pathNodes: null,
                pathIndex: 0,
                pathGoalTileX: null,
                pathGoalTileZ: null,
                pathRetargetTimer: 0,
                aiMode: 'hunt',
                targetType: 'ship',
                attackCooldown: 0,
                bossAttackTimer: 0,
                sporeEmitTimer: 0,
                biomeTint: tintColor
            };
            if (isPreEnraged && !isBoss) {
                clonedMat.color.setHex(SNAIL_ENRAGED_TINT);
            }
            return sprite;
        }

        const spriteMaterial = this.scatterMaterials[placement.type];
        if (!spriteMaterial) return null;

        const clonedMat = spriteMaterial.clone();
        clonedMat.rotation = placement.rotation;
        clonedMat.alphaTest = 0.001;

        const sprite = new THREE.Sprite(clonedMat);
        sprite.center.set(0.5, 0);
        sprite.position.set(placement.x, anchoredY, placement.z);
        sprite.frustumCulled = false;
        sprite.renderOrder = 3;
        sprite.scale.set(scaleX, scaleY, 1);
        sprite.userData = {
            isScatter: true,
            type: placement.type,
            scatterKey: placement.scatterKey,
            groupType: placement.groupType,
            baseY: anchoredY,
            elevationOffset: placement.elevation,
            baseScaleX: scaleX,
            baseScaleY: scaleY,
            burstTriggered: false,
            burstTimer: 0,
            phase: placement.phase ?? 0,
            baseOpacity: placement.opacity ?? 1
        };
        return sprite;
    }

    chooseWeightedType(variants, random) {
        const totalWeight = variants.reduce((sum, entry) => sum + entry.weight, 0);
        let roll = random() * totalWeight;

        for (const variant of variants) {
            roll -= variant.weight;
            if (roll <= 0) {
                return variant.type;
            }
        }

        return variants[variants.length - 1].type;
    }

    sampleLootRarity(weightedEntries, random, legendaryBoost = 0) {
        const boost = Number.isFinite(legendaryBoost) ? Math.max(0, legendaryBoost) : 0;
        const sourceEntries = Array.isArray(weightedEntries) ? weightedEntries : [];
        const normalized = sourceEntries
            .map((entry) => ({
                key: entry?.key,
                weight: Number.isFinite(entry?.weight) ? Math.max(0, entry.weight) : 0
            }))
            .filter((entry) => typeof entry.key === 'string' && entry.weight > 0);

        if (normalized.length === 0) {
            return LOOT_RARITIES[0];
        }

        const totalWeight = normalized.reduce((sum, entry) => sum + entry.weight, 0);
        if (totalWeight <= 0) {
            return LOOT_RARITIES[0];
        }

        const normalizedWithLegend = [...normalized];
        if (!normalizedWithLegend.some((entry) => entry.key === 'legendary')) {
            normalizedWithLegend.push({ key: 'legendary', weight: 0 });
        }

        const normalizedByTotal = normalizedWithLegend.map((entry) => ({
            key: entry.key,
            weight: entry.weight / totalWeight
        }));
        const legendaryEntry = normalizedByTotal.find((entry) => entry.key === 'legendary');
        const currentLegendary = legendaryEntry?.weight ?? 0;
        const targetLegendary = Math.min(0.95, currentLegendary + boost);
        const remainingCurrent = Math.max(0, 1 - currentLegendary);
        const remainingTarget = Math.max(0, 1 - targetLegendary);
        const scale = remainingCurrent > 0 ? (remainingTarget / remainingCurrent) : 0;

        const adjusted = normalizedByTotal.map((entry) => {
            if (entry.key === 'legendary') {
                return { key: entry.key, weight: targetLegendary };
            }
            return { key: entry.key, weight: entry.weight * scale };
        }).filter((entry) => entry.weight > 0);

        const adjustedTotal = adjusted.reduce((sum, entry) => sum + entry.weight, 0);
        let roll = random() * adjustedTotal;

        for (const entry of adjusted) {
            roll -= entry.weight;
            if (roll <= 0) {
                return LOOT_RARITIES.find((rarity) => rarity.key === entry.key) ?? LOOT_RARITIES[0];
            }
        }

        return LOOT_RARITIES[0];
    }

    chooseLootRarity(random, legendaryBoost = 0) {
        const weighted = LOOT_RARITIES.map((entry) => ({ key: entry.key, weight: entry.weight }));
        return this.sampleLootRarity(weighted, random, legendaryBoost);
    }

    chooseLootRarityForJunkType(junkType, random, legendaryBoost = 0) {
        const weightedBias = JUNK_LOOT_BIAS[junkType];
        if (!weightedBias) {
            return this.chooseLootRarity(random, legendaryBoost);
        }

        return this.sampleLootRarity(weightedBias, random, legendaryBoost);
    }

    chooseJunkBurstPickupType(rarity, random) {
        const rarityKey = rarity?.key ?? 'basic';
        const roll = random();

        if (rarityKey === 'legendary') {
            if (roll < 0.28) return 'coin';
            if (roll < 0.56) return 'weapon';
            if (roll < 0.79) return 'ammo';
            return 'health';
        }

        if (rarityKey === 'rare') {
            if (roll < 0.2) return 'coin';
            if (roll < 0.38) return 'weapon';
            if (roll < 0.72) return 'ammo';
            return 'health';
        }

        if (rarityKey === 'uncommon') {
            if (roll < 0.16) return 'coin';
            if (roll < 0.24) return 'weapon';
            if (roll < 0.58) return 'ammo';
            return 'health';
        }

        if (roll < 0.1) return 'coin';
        if (roll < 0.13) return 'weapon';
        if (roll < 0.52) return 'ammo';
        return 'health';
    }

    getJunkVariantEffectColors(junkType) {
        const variant = JUNK_SCATTER_VARIANTS.find((entry) => entry.type === junkType);
        return variant ?? JUNK_SCATTER_VARIANTS[0];
    }

    createJunkBurstTargets(originX, originZ, random) {
        const depthLootConfig = this.getDepthLootConfigForWorldPosition(originX, originZ);
        const baseItems = BUNKER_JUNK_DROP_COUNT_MIN + Math.floor(random() * (BUNKER_JUNK_DROP_COUNT_MAX - BUNKER_JUNK_DROP_COUNT_MIN + 1));
        const totalItems = Math.max(1, Math.round(baseItems * depthLootConfig.pickupMultiplier));
        const clusteredTarget = Math.max(1, Math.round(totalItems * 0.7));
        const transitionalTarget = Math.max(0, Math.round(totalItems * 0.2));
        const strayTarget = Math.max(0, totalItems - clusteredTarget - transitionalTarget);
        const targets = [];
        const centerAngle = random() * Math.PI * 2;
        const centerRadius = 0.9 + random() * 0.35;
        const clusterCenter = {
            x: originX + Math.cos(centerAngle) * centerRadius,
            z: originZ + Math.sin(centerAngle) * centerRadius
        };

        for (let i = 0; i < clusteredTarget; i++) {
            const angle = random() * Math.PI * 2;
            const radius = 0.35 + random() * 0.65;
            targets.push({
                x: clusterCenter.x + Math.cos(angle) * radius,
                z: clusterCenter.z + Math.sin(angle) * radius
            });
        }

        for (let i = 0; i < transitionalTarget; i++) {
            const t = 0.35 + random() * 0.45;
            const jitterAngle = centerAngle + (random() - 0.5) * 1.3;
            const jitterRadius = (random() - 0.5) * 0.55;
            targets.push({
                x: originX + (clusterCenter.x - originX) * t + Math.cos(jitterAngle) * jitterRadius,
                z: originZ + (clusterCenter.z - originZ) * t + Math.sin(jitterAngle) * jitterRadius
            });
        }

        for (let i = 0; i < strayTarget; i++) {
            const angle = centerAngle + Math.PI + (random() - 0.5) * 1.8;
            const radius = 1.35 + random() * 0.75;
            targets.push({
                x: originX + Math.cos(angle) * radius,
                z: originZ + Math.sin(angle) * radius
            });
        }

        return targets;
    }

    selectScatterClusterCenter(candidates, clusters, random) {
        let bestCandidate = null;
        let bestScore = -Infinity;

        for (const candidate of candidates) {
            const nearestClusterDistance = clusters.length === 0
                ? this.chunkSize
                : Math.min(...clusters.map((cluster) => (
                    Math.hypot(
                        candidate.worldX - cluster.center.worldX,
                        candidate.worldZ - cluster.center.worldZ
                    )
                )));

            if (nearestClusterDistance < SCATTER_CLUSTER_CENTER_MIN_DISTANCE) {
                continue;
            }

            const edgeDistance = Math.min(
                candidate.localX,
                candidate.localY,
                this.chunkSize - 1 - candidate.localX,
                this.chunkSize - 1 - candidate.localY
            );
            const score = nearestClusterDistance * 0.8 + edgeDistance * 0.45 + random() * 0.8;

            if (score > bestScore) {
                bestScore = score;
                bestCandidate = candidate;
            }
        }

        return bestCandidate ?? candidates[Math.floor(random() * candidates.length)] ?? null;
    }

    choosePickupType(random) {
        const totalWeight = PICKUP_TYPES.reduce((sum, entry) => sum + entry.weight, 0);
        let roll = random() * totalWeight;

        for (const entry of PICKUP_TYPES) {
            roll -= entry.weight;
            if (roll <= 0) return entry.type;
        }

        return PICKUP_TYPES[PICKUP_TYPES.length - 1].type;
    }

    choosePickupTypeForRoom(random, roomType) {
        const ROOM_PICKUP_BIAS = {
            [ROOM_TYPES.DEAD_END]: [
                { type: 'health', weight: 0.20 },
                { type: 'ammo',   weight: 0.20 },
                { type: 'weapon', weight: 0.34 },
                { type: 'coin',   weight: 0.26 }
            ],
            [ROOM_TYPES.CORRIDOR]: [
                { type: 'health', weight: 0.28 },
                { type: 'ammo',   weight: 0.52 },
                { type: 'weapon', weight: 0.12 },
                { type: 'coin',   weight: 0.08 }
            ],
            [ROOM_TYPES.CHAMBER]: [
                { type: 'health', weight: 0.32 },
                { type: 'ammo',   weight: 0.30 },
                { type: 'weapon', weight: 0.24 },
                { type: 'coin',   weight: 0.14 }
            ]
        };
        const weights = ROOM_PICKUP_BIAS[roomType] ?? PICKUP_TYPES;
        const totalWeight = weights.reduce((s, e) => s + e.weight, 0);
        let roll = random() * totalWeight;
        for (const entry of weights) {
            roll -= entry.weight;
            if (roll <= 0) return entry.type;
        }
        return weights[weights.length - 1].type;
    }

    createPickupInstance(placement) {
        const root = new THREE.Group();
        const body = new THREE.Group();
        const startX = (placement.ejectStartX ?? placement.worldX) + placement.offsetX;
        const startZ = (placement.ejectStartZ ?? placement.worldZ) + placement.offsetZ;
        const targetX = placement.ejectTargetX ?? placement.worldX + placement.offsetX;
        const targetZ = placement.ejectTargetZ ?? placement.worldZ + placement.offsetZ;
        const startY = placement.elevation;
        const baseY = placement.elevation;
        const burst = new THREE.Mesh(
            new THREE.RingGeometry(0.12, 0.24, 20),
            new THREE.MeshBasicMaterial({
                color: placement.type === 'health'
                    ? 0xffa4af
                    : placement.type === 'coin'
                        ? 0xffde8f
                    : placement.type === 'weapon'
                        ? 0xffdb78
                        : 0x8fe4ff,
                transparent: true,
                opacity: 0,
                side: THREE.DoubleSide,
                depthWrite: false
            })
        );
        root.userData = {
            isPickup: true,
            type: placement.type,
            state: placement.ejectStartX !== undefined ? 'ejecting' : 'idle',
            bobOffset: placement.bobOffset,
            baseY,
            scale: placement.scale,
            rarity: placement.rarity ?? LOOT_RARITIES[0],
            burst,
            collectTimer: 0,
            collectLock: placement.collectLock ?? 0,
            ejectTimer: 0,
            ejectDuration: 0.24 + Math.random() * 0.1,
            ejectTargetX: targetX,
            ejectTargetZ: targetZ
        };

        if (placement.type === 'health') {
            body.add(this.createHealthPickupMesh());
        } else if (placement.type === 'coin') {
            body.add(this.createCoinPickupMesh());
        } else if (placement.type === 'weapon') {
            body.add(this.createWeaponPickupMesh());
        } else {
            body.add(this.createAmmoPickupMesh());
        }

        const shadow = new THREE.Mesh(
            new THREE.CircleGeometry(placement.shadowRadius, 18),
            this.pickupAssets.shadowMaterial.clone()
        );
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = -placement.elevation + 0.02;
        shadow.scale.setScalar(placement.scale * 1.1);
        body.add(shadow);

        body.rotation.y = placement.rotation;
        body.rotation.x = placement.tiltX;
        body.rotation.z = placement.tiltZ;
        body.scale.setScalar(placement.scale);
        const glow = new THREE.Mesh(
            new THREE.RingGeometry(0.16, 0.34, 20),
            new THREE.MeshBasicMaterial({
                color: root.userData.rarity.color,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide,
                depthWrite: false
            })
        );
        glow.rotation.x = -Math.PI / 2;
        glow.position.y = 0.03;
        body.add(glow);
        root.userData.body = body;
        root.userData.shadow = shadow;
        root.userData.glow = glow;

        burst.rotation.x = -Math.PI / 2;
        burst.position.y = 0.04;
        burst.scale.setScalar(0.2);
        body.add(burst);

        root.position.set(
            startX,
            startY,
            startZ
        );
        root.add(body);
        root.userData.fogMaterials = this.cloneMaterialsForFogOfWar(root);
        return root;
    }

    cloneMaterialsForFogOfWar(root) {
        const materials = new Set();
        root.traverse((child) => {
            if (!child.material) return;
            if (Array.isArray(child.material)) {
                child.material = child.material.map((mat) => {
                    const clone = mat.clone();
                    clone.transparent = true;
                    clone.userData.fogBaseOpacity = clone.opacity ?? 1;
                    materials.add(clone);
                    return clone;
                });
                return;
            }
            child.material = child.material.clone();
            child.material.transparent = true;
            child.material.userData.fogBaseOpacity = child.material.opacity ?? 1;
            materials.add(child.material);
        });
        return materials;
    }

    resetPickupCoreOpacityForFog(pickup) {
        const dynamicObjects = new Set([
            pickup.userData.shadow,
            pickup.userData.glow,
            pickup.userData.burst
        ]);
        pickup.userData.body?.traverse?.((child) => {
            if (dynamicObjects.has(child) || !child.material) return;
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            for (const mat of materials) {
                if (mat?.userData.fogBaseOpacity !== undefined) {
                    mat.opacity = mat.userData.fogBaseOpacity;
                }
            }
        });
    }

    createHealthPickupMesh() {
        const group = new THREE.Group();
        const core = new THREE.Mesh(
            new THREE.BoxGeometry(0.54, 0.14, 0.18),
            this.pickupAssets.health.material
        );
        const cross = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.14, 0.54),
            this.pickupAssets.health.material
        );
        const halo = new THREE.Mesh(
            new THREE.TorusGeometry(0.28, 0.045, 10, 20),
            this.pickupAssets.health.accent
        );
        halo.rotation.x = Math.PI / 2;
        halo.position.y = 0.03;
        core.castShadow = true;
        cross.castShadow = true;
        group.add(core, cross, halo);
        return group;
    }

    createAmmoPickupMesh() {
        const group = new THREE.Group();
        const crate = new THREE.Mesh(
            new THREE.BoxGeometry(0.42, 0.22, 0.3),
            this.pickupAssets.ammo.material
        );
        const band = new THREE.Mesh(
            new THREE.BoxGeometry(0.48, 0.07, 0.08),
            this.pickupAssets.ammo.accent
        );
        band.position.y = 0.08;
        const shellLeft = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, 0.24, 10),
            this.pickupAssets.weapon.accent
        );
        const shellRight = shellLeft.clone();
        shellLeft.rotation.z = Math.PI / 2;
        shellRight.rotation.z = Math.PI / 2;
        shellLeft.position.set(-0.12, 0.18, 0);
        shellRight.position.set(0.12, 0.18, 0);
        crate.castShadow = true;
        band.castShadow = true;
        shellLeft.castShadow = true;
        shellRight.castShadow = true;
        group.add(crate, band, shellLeft, shellRight);
        return group;
    }

    createCoinPickupMesh() {
        const group = new THREE.Group();
        const coin = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.18, 0.08, 20),
            this.pickupAssets.coin.material
        );
        coin.rotation.x = Math.PI / 2;

        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.145, 0.022, 10, 20),
            this.pickupAssets.coin.accent
        );
        ring.position.z = 0.01;

        const ringBack = ring.clone();
        ringBack.position.z = -0.01;

        coin.castShadow = true;
        ring.castShadow = true;
        ringBack.castShadow = true;
        group.add(coin, ring, ringBack);
        return group;
    }

    createWeaponPickupMesh() {
        const group = new THREE.Group();
        const base = new THREE.Mesh(
            new THREE.BoxGeometry(0.56, 0.12, 0.18),
            this.pickupAssets.weapon.material
        );
        const barrel = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.08, 0.08),
            this.pickupAssets.weapon.accent
        );
        const stock = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, 0.14, 0.18),
            this.pickupAssets.weapon.material
        );
        barrel.position.set(0.28, 0.04, 0);
        stock.position.set(-0.18, -0.02, 0);
        base.castShadow = true;
        barrel.castShadow = true;
        stock.castShadow = true;
        group.add(base, barrel, stock);
        return group;
    }

    updatePickups(delta, now) {
        const time = now * 0.0012;
        const removals = [];

        for (const pickup of this.pickupMeshes) {
            const body = pickup.userData.body;
            if (!body) continue;

            const shadow = pickup.userData.shadow;
            const burst = pickup.userData.burst;
            const toPlayerX = this.player.position.x - pickup.position.x;
            const toPlayerZ = this.player.position.z - pickup.position.z;
            const planarDistance = Math.hypot(toPlayerX, toPlayerZ);
            const isCollecting = pickup.userData.state === 'collecting';
            pickup.userData.collectLock = Math.max(0, (pickup.userData.collectLock ?? 0) - delta);

            if (pickup.userData.state === 'ejecting') {
                pickup.userData.ejectTimer += delta;
                const t = Math.min(pickup.userData.ejectTimer / pickup.userData.ejectDuration, 1);
                const lift = Math.sin(t * Math.PI) * 0.58;
                const targetX = Number.isFinite(pickup.userData.ejectTargetX)
                    ? pickup.userData.ejectTargetX
                    : pickup.position.x;
                const targetZ = Number.isFinite(pickup.userData.ejectTargetZ)
                    ? pickup.userData.ejectTargetZ
                    : pickup.position.z;
                pickup.position.x = THREE.MathUtils.lerp(pickup.position.x, targetX, Math.min(delta * 18, 1));
                pickup.position.z = THREE.MathUtils.lerp(pickup.position.z, targetZ, Math.min(delta * 18, 1));
                pickup.position.y = pickup.userData.baseY + lift;
                body.rotation.y += 0.16;
                body.scale.setScalar(pickup.userData.scale * (0.9 + Math.sin(t * Math.PI) * 0.18));

                if (shadow) {
                    shadow.material.opacity = 0.12 + t * 0.05;
                }
                if (pickup.userData.glow) {
                    pickup.userData.glow.material.opacity = 0.85;
                    pickup.userData.glow.scale.setScalar(1 + Math.sin(t * Math.PI) * 0.55);
                }

                if (t >= 1) {
                    pickup.userData.state = 'idle';
                    pickup.position.x = targetX;
                    pickup.position.z = targetZ;
                    pickup.position.y = pickup.userData.baseY;
                }

                this.resetPickupCoreOpacityForFog(pickup);
                this.applyFogOfWarOpacity(
                    pickup,
                    this.getFogOfWarVisibility(pickup.position.x, pickup.position.z),
                    { captureCurrent: true }
                );
                continue;
            }

            if (pickup.userData.collectLock > 0) {
                pickup.userData.state = pickup.userData.state === 'magnetized' ? 'idle' : pickup.userData.state;
            } else if (!isCollecting && planarDistance <= PICKUP_COLLECT_RADIUS) {
                pickup.userData.state = 'collecting';
                pickup.userData.collectTimer = 0;
            } else if (pickup.userData.state === 'idle' && planarDistance <= this.pickupMagnetRadius) {
                pickup.userData.state = 'magnetized';
            } else if (pickup.userData.state === 'magnetized' && planarDistance > this.pickupMagnetRadius * 1.35) {
                pickup.userData.state = 'idle';
            }

            if (pickup.userData.state === 'collecting') {
                pickup.userData.collectTimer += delta;
                const t = Math.min(pickup.userData.collectTimer / PICKUP_COLLECT_DURATION, 1);
                const burstT = Math.min(t / 0.45, 1);
                const targetY = this.playerRadius + 0.45;

                pickup.position.x += toPlayerX * Math.min(delta * 18, 1);
                pickup.position.z += toPlayerZ * Math.min(delta * 18, 1);
                pickup.position.y = THREE.MathUtils.lerp(pickup.position.y, targetY, Math.min(delta * 18, 1));

                const popScale = pickup.userData.scale * (1 + Math.sin(burstT * Math.PI) * 0.42) * (1 - t * 0.65);
                body.scale.setScalar(Math.max(popScale, 0.001));
                body.rotation.y += 0.14;

                if (shadow) {
                    shadow.scale.setScalar((1.1 + t * 0.5) * pickup.userData.scale);
                    shadow.material.opacity = 0.16 * (1 - t);
                }
                if (pickup.userData.glow) {
                    pickup.userData.glow.material.opacity = (1 - t) * 0.95;
                    pickup.userData.glow.scale.setScalar(1.15 + burstT * 0.85);
                }

                if (burst) {
                    burst.material.opacity = (1 - t) * 0.85;
                    burst.scale.setScalar(0.2 + burstT * 1.25);
                }

                if (t >= 1) {
                    if (!pickup.userData.collectedReported) {
                        pickup.userData.collectedReported = true;
                        const pickupType = pickup.userData.type ?? 'unknown';
                        const rarity = pickup.userData.rarity?.key ?? null;

                        // Retrieval mission: first legendary weapon collected completes objective
                        if (this.missionState?.type === 'retrieval' && this.missionState.status === 'active') {
                            if (pickupType === 'weapon' && rarity === 'legendary') {
                                this.missionState.status = 'objective_complete';
                                const uplink = this.getMothershipUplinkReadiness();
                                window.dispatchEvent(new CustomEvent('mission-objective-complete', {
                                    detail: { type: 'retrieval', uplinkReady: uplink.ready, uplink }
                                }));
                            }
                        }

                        if (pickupType === 'health' && this.playerVitals.hp < this.playerVitals.maxHp) {
                            this.healPlayer(1);
                            window.AudioManager?.playProceduralLoot('health', rarity);
                        } else {
                            window.dispatchEvent(new CustomEvent('pickup-collected', {
                                detail: {
                                    type: pickupType,
                                    rarity
                                }
                            }));
                        }
                    }
                    removals.push(pickup);
                }

                this.resetPickupCoreOpacityForFog(pickup);
                this.applyFogOfWarOpacity(
                    pickup,
                    this.getFogOfWarVisibility(pickup.position.x, pickup.position.z),
                    { captureCurrent: true }
                );
                continue;
            }

            if (pickup.userData.state === 'magnetized' && planarDistance > 0.001) {
                const magnetStrength = 2.8 + (1 - Math.min(planarDistance / this.pickupMagnetRadius, 1)) * 6.2;
                const moveStep = Math.min(delta * magnetStrength, planarDistance);
                pickup.position.x += (toPlayerX / planarDistance) * moveStep;
                pickup.position.z += (toPlayerZ / planarDistance) * moveStep;
                pickup.position.y = THREE.MathUtils.lerp(
                    pickup.position.y,
                    pickup.userData.baseY + 0.18,
                    Math.min(delta * 8, 1)
                );
            } else {
                const bob = Math.sin(time * 2.6 + pickup.userData.bobOffset) * 0.06;
                pickup.position.y = pickup.userData.baseY + bob;
            }

            body.scale.setScalar(pickup.userData.scale);
            const baseSpin = pickup.userData.rarity?.key === 'legendary' || pickup.userData.type === 'coin'
                ? 0.02
                : 0.006;
            body.rotation.y += pickup.userData.state === 'magnetized' ? Math.max(baseSpin, 0.03) : baseSpin;

            if (shadow) {
                shadow.material.opacity = 0.16;
                shadow.scale.setScalar(pickup.userData.scale * 1.1);
            }
            if (pickup.userData.glow) {
                const rarityPulse = 0.78 + Math.sin(time * 3.1 + pickup.userData.bobOffset) * 0.12;
                pickup.userData.glow.material.opacity = rarityPulse;
                pickup.userData.glow.scale.setScalar(1 + Math.sin(time * 2.3 + pickup.userData.bobOffset) * 0.08);
            }

            if (burst) {
                burst.material.opacity = 0;
                burst.scale.setScalar(0.2);
            }

            const fogVisibility = this.getFogOfWarVisibility(pickup.position.x, pickup.position.z);
            this.resetPickupCoreOpacityForFog(pickup);
            this.applyFogOfWarOpacity(pickup, fogVisibility, { captureCurrent: true });
        }

        for (const pickup of removals) {
            pickup.userData.shadow?.material?.dispose?.();
            pickup.userData.shadow?.geometry?.dispose?.();
            pickup.userData.glow?.material?.dispose?.();
            pickup.userData.glow?.geometry?.dispose?.();
            pickup.userData.burst?.material?.dispose?.();
            pickup.userData.burst?.geometry?.dispose?.();
            pickup.userData.fogMaterials?.forEach((material) => material.dispose?.());
            pickup.parent?.remove(pickup);
        }
    }

    createSnailDropPlacement(originX, originZ, targetX, targetZ, type = 'weapon') {
        const depthLootConfig = this.getDepthLootConfigForWorldPosition(originX, originZ);
        const rarity = this.chooseLootRarity(() => Math.random(), depthLootConfig.legendaryBoost + 0.08)
            ?? LOOT_RARITIES.find((entry) => entry.key === 'uncommon')
            ?? LOOT_RARITIES[0];
        return {
            worldX: targetX,
            worldZ: targetZ,
            type,
            rarity,
            scale: type === 'coin' ? 0.7 : 0.82,
            rotation: Math.random() * Math.PI * 2,
            tiltX: (Math.random() - 0.5) * 0.12,
            tiltZ: (Math.random() - 0.5) * 0.12,
            elevation: 0.18 + Math.random() * 0.08,
            offsetX: 0,
            offsetZ: 0,
            bobOffset: Math.random() * Math.PI * 2,
            shadowRadius: type === 'weapon' ? 0.3 : 0.24,
            collectLock: 0.34,
            ejectStartX: originX,
            ejectStartZ: originZ,
            ejectTargetX: targetX,
            ejectTargetZ: targetZ
        };
    }

    spawnSnailDrops(sprite) {
        const parent = sprite?.parent;
        if (!parent) return;
        const x = sprite.position.x;
        const z = sprite.position.z;
        const isBoss = Boolean(sprite.userData.isBoss);

        let dropTypes;
        if (isBoss) {
            // Boss drops: lots of coins, health, ammo, and weapons!
            dropTypes = ['weapon', 'weapon', 'weapon', 'ammo', 'ammo', 'health', 'health', 'coin', 'coin', 'coin', 'coin'];
        } else {
            const depthLootConfig = this.getDepthLootConfigForWorldPosition(x, z);
            const depthTier = Math.floor(depthLootConfig.pickupMultiplier);
            const wasEnraged = Boolean(sprite.userData.enraged);
            const baseDrops = wasEnraged ? ['weapon', 'weapon', 'ammo', 'coin'] : ['weapon', 'weapon', 'ammo'];
            dropTypes = depthTier >= 2 ? [...baseDrops, 'ammo'] : baseDrops;
        }

        let placed = 0;
        for (const type of dropTypes) {
            const angle = Math.random() * Math.PI * 2;
            const radius = isBoss ? 0.8 + Math.random() * 0.9 : 0.45 + Math.random() * 0.32;
            const targetX = x + Math.cos(angle) * radius;
            const targetZ = z + Math.sin(angle) * radius;
            if (this.getTileType(Math.round(targetX), Math.round(targetZ)) === '#') {
                continue;
            }
            const placement = this.createSnailDropPlacement(x, z, targetX, targetZ, type);
            const pickup = this.createPickupInstance(placement);
            parent.add(pickup);
            this.pickupMeshes.push(pickup);
            placed += 1;
        }

        if (placed === 0) {
            const placement = this.createSnailDropPlacement(x, z, x, z, 'weapon');
            const pickup = this.createPickupInstance(placement);
            parent.add(pickup);
            this.pickupMeshes.push(pickup);
        }
    }

    damageSnail(sprite, amount = 1) {
        if (!sprite?.userData || !this.isEnemyType(sprite.userData.type) || sprite.userData.burstTriggered) return;
        const previousHp = Number.isFinite(sprite.userData.hp) ? sprite.userData.hp : (sprite.userData.maxHp ?? SNAIL_MAX_HP);
        const damage = Math.max(0, amount);
        if (damage <= 0) return;
        sprite.userData.hp = Math.max(0, previousHp - damage);
        if (sprite.userData.hp === previousHp) return;

        this.hitstopTimer = 60;
        this.spawnDamagePip(sprite.position.x, sprite.position.z, damage);

        sprite.userData.shotByPlayer = true;
        sprite.userData.prioritizeShip = false;

        const isBoss = Boolean(sprite.userData.isBoss);
        const isCrawler = this.isCrawler(sprite.userData.type);
        if (!isBoss && !isCrawler && sprite.userData.hp === 1 && !sprite.userData.enraged) {
            sprite.userData.enraged = true;
            sprite.userData.speed = SNAIL_ENRAGED_MOVE_SPEED;
            sprite.userData.attackCooldown = Math.min(sprite.userData.attackCooldown ?? 0, 0.2);
            sprite.material?.color?.setHex(SNAIL_ENRAGED_TINT);
            window.AudioManager?.play('amb_metal_stress', { volume: 0.38, playbackRate: 1.55 });
        }

        if (sprite.userData.hp > 0) {
            window.AudioManager?.play('enemy_hit_soft', { volume: 0.38 });
            this._flashSnailHit(sprite);
            window.dispatchEvent(new CustomEvent('enemy-hit', {
                detail: {
                    type: sprite.userData.type,
                    hp: sprite.userData.hp,
                    maxHp: sprite.userData.maxHp ?? SNAIL_MAX_HP,
                    enraged: Boolean(sprite.userData.enraged)
                }
            }));
            return;
        }

        sprite.userData.burstTriggered = true;
        sprite.userData.burstTimer = 0;
        this.snailsKilledThisRun = (this.snailsKilledThisRun ?? 0) + 1;
        this.arcManager?.recordSignal?.({ snailsKilled: 1 });
        this.arcManager?.evaluate?.();
        // Post-turn, wild snails are family. Killing them upsets the queen —
        // the first kill each run stings, then every fifth.
        if (this.isAct2Active() && !sprite.userData.campDefenderId && !sprite.userData.isHiveHarvestBoss) {
            this._hiveKinKills = (this._hiveKinKills ?? 0) + 1;
            if (this._hiveKinKills === 1 || this._hiveKinKills % 5 === 0) {
                this.act2?.recordQueenObedience?.(-1);
                window.dispatchEvent(new CustomEvent('queen-displeased', {
                    detail: { kills: this._hiveKinKills, obedience: this.act2?.getState?.().queenObedience }
                }));
            }
        }
        // Shells are no longer granted on the kill itself — the player has to
        // walk over the corpse to claim them (collectSnailShell).

        if (this.missionState?.type === 'elimination' && this.missionState.status === 'active') {
            this.missionState.killCount = (this.missionState.killCount ?? 0) + 1;
            window.dispatchEvent(new CustomEvent('mission-kill-progress', {
                detail: { count: this.missionState.killCount, target: this.missionState.targetKills }
            }));
            if (this.missionState.killCount >= this.missionState.targetKills) {
                this.missionState.status = 'objective_complete';
                const uplink = this.getMothershipUplinkReadiness();
                window.dispatchEvent(new CustomEvent('mission-objective-complete', {
                    detail: { type: 'elimination', uplinkReady: uplink.ready, uplink }
                }));
            }
        }

        if (isBoss) {
            this.killedBosses.add(sprite.userData.biome);
            if (sprite.userData.isMilestone && sprite.userData.sourceGoalKey === 'o2Bubble') {
                this.revealFoundry({ randomEdge: true });
            }
        }

        if (this.isSentinel(sprite.userData.type)) {
            this.spawnSentinelDrops(sprite);
        } else if (this.isCrawler(sprite.userData.type)) {
            this.spawnCrawlerDrops(sprite);
        } else {
            this.spawnSnailDrops(sprite);
        }
        this.spawnGearPoofEffect(sprite.position.x, sprite.position.z, 'bunker_junk_uncommon');
        const burstColor = sprite.userData.isBoss ? 0xff6688 : 0x86d36a;
        this.spawnPhysicalBurst(sprite.position.x, sprite.position.z, {
            color: burstColor,
            count: sprite.userData.isBoss ? 14 : 8,
            upward: 0.22,
            spread: sprite.userData.isBoss ? 2.0 : 1.5
        });
        if (isCrawler) {
            window.AudioManager?.play('enemy_death_crawler', { volume: isBoss ? 0.6 : 0.4, playbackRate: isBoss ? 0.75 : 1.0 });
        } else {
            window.AudioManager?.play('enemy_death_snail', { volume: isBoss ? 0.6 : 0.45, playbackRate: isBoss ? 0.75 : 1.0 });
            this.spawnEnemyCorpse(sprite);
        }
        window.dispatchEvent(new CustomEvent('enemy-killed', {
            detail: {
                type: sprite.userData.type,
                totalKills: this.snailsKilledThisRun,
                isBoss,
                isMilestone: Boolean(sprite.userData.isMilestone),
                sourceGoalKey: sprite.userData.sourceGoalKey ?? null
            }
        }));
    }

    spawnEnemyCorpse(enemySprite) {
        if (!enemySprite) return;
        const type = enemySprite.userData.type;
        const deadType = `${type}_dead`;
        const deadMaterial = this.scatterMaterials[deadType];
        if (!deadMaterial) return;

        // Clone so per-corpse opacity fades don't bleed into every other
        // corpse sharing the material (the map itself stays shared).
        const corpse = new THREE.Sprite(deadMaterial.clone());
        corpse.position.copy(enemySprite.position);
        corpse.position.y = 0.05; // Slightly above floor

        const baseScaleX = Math.abs(enemySprite.scale.x);
        const baseScaleY = Math.abs(enemySprite.scale.y);
        const facingSign = enemySprite.scale.x < 0 ? -1 : 1;
        corpse.scale.set(baseScaleX * facingSign, baseScaleY, 1);
        corpse.center.set(0.5, 0.1); // Same pivot alignment as snails

        corpse.userData = {
            type: deadType,
            baseScaleX,
            baseScaleY,
            baseOpacity: 0.85,
            isCorpse: true,
            decayTimer: 0,
            isBoss: Boolean(enemySprite.userData.isBoss),
            shellValue: enemySprite.userData.isBoss ? SNAIL_SHELL_BOSS_VALUE : 1,
            collected: false
        };

        corpse.renderOrder = 3; // Render below active enemies
        this.scene.add(corpse);
        this.corpses.push(corpse);
    }

    // Per-frame corpse upkeep: touch-to-collect, then fade out (fast pop when
    // collected, slow decay otherwise).
    updateCorpses(delta) {
        if (!this.corpses?.length) return;
        const decayStart = 14.0;
        const decayDuration = 6.0;
        const survivors = [];
        for (const corpse of this.corpses) {
            corpse.userData.decayTimer += delta;

            if (!corpse.userData.collected && this.player && !this.isPlayerDead
                && Math.hypot(
                    this.player.position.x - corpse.position.x,
                    this.player.position.z - corpse.position.z
                ) <= SNAIL_SHELL_COLLECT_RADIUS) {
                this.collectSnailShell(corpse);
            }

            let done = false;
            if (corpse.userData.collected) {
                corpse.userData.collectTimer += delta;
                const fadeT = Math.min(corpse.userData.collectTimer / 0.38, 1);
                const pop = 1 + Math.sin(Math.min(fadeT * Math.PI, Math.PI)) * 0.16;
                const facingSign = corpse.scale.x < 0 ? -1 : 1;
                corpse.scale.set(
                    corpse.userData.baseScaleX * facingSign * pop,
                    corpse.userData.baseScaleY * pop,
                    1
                );
                corpse.material.opacity = corpse.userData.baseOpacity * (1 - fadeT);
                done = fadeT >= 1;
            } else if (corpse.userData.decayTimer >= decayStart) {
                const fadeT = Math.min((corpse.userData.decayTimer - decayStart) / decayDuration, 1);
                corpse.material.opacity = corpse.userData.baseOpacity * (1 - fadeT);
                done = fadeT >= 1;
            }

            if (done) {
                corpse.parent?.remove(corpse);
                corpse.material?.dispose?.();
                continue;
            }
            const fogVisibility = this.getFogOfWarVisibility(corpse.position.x, corpse.position.z);
            this.applyFogOfWarOpacity(corpse, fogVisibility, { captureCurrent: true });
            survivors.push(corpse);
        }
        this.corpses = survivors;
    }

    clearCorpses() {
        for (const corpse of this.corpses ?? []) {
            corpse.parent?.remove(corpse);
            corpse.material?.dispose?.();
        }
        this.corpses = [];
    }

    // Shells bank instantly (no extraction risk) — they are the body-count
    // currency, so losing them on death would double-punish melee classes.
    collectSnailShell(corpse) {
        if (!corpse || corpse.userData.collected) return;
        corpse.userData.collected = true;
        corpse.userData.collectTimer = 0;
        const gained = corpse.userData.shellValue ?? 1;
        this.bank?.addShells?.(gained);
        window.AudioManager?.play?.('ui_click_confirm', {
            volume: 0.5,
            playbackRate: corpse.userData.isBoss ? 0.85 : 1.25
        });
        this.spawnGearPoofEffect(corpse.position.x, corpse.position.z, 'bunker_junk_rare');
        window.dispatchEvent(new CustomEvent('shell-collected', {
            detail: {
                gained,
                total: this.bank?.getShells?.() ?? 0,
                isBoss: corpse.userData.isBoss === true
            }
        }));
    }

    _flashSnailHit(sprite) {
        if (!sprite?.material?.color) return;
        const originalColor = sprite.userData.enraged ? SNAIL_ENRAGED_TINT : (sprite.userData.biomeTint ?? 0xffffff);
        sprite.material.color.setHex(0xffffff);

        const originalScaleX = sprite.scale.x;
        const originalScaleY = sprite.scale.y;
        const originalScaleZ = sprite.scale.z;

        sprite.scale.set(originalScaleX * 1.35, originalScaleY * 1.35, originalScaleZ * 1.35);

        setTimeout(() => {
            if (sprite?.material?.color && !sprite.userData.burstTriggered) {
                sprite.material.color.setHex(originalColor);
            }
            if (sprite?.scale && !sprite.userData.burstTriggered) {
                sprite.scale.set(originalScaleX, originalScaleY, originalScaleZ);
            }
        }, 80);
    }

    spawnDamagePip(x, z, amount) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ff9f1c'; // amber color!
        ctx.font = 'bold 36px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`-${amount}`, 32, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material);
        sprite.position.set(x + (Math.random() - 0.5) * 0.4, 0.8, z + (Math.random() - 0.5) * 0.4);
        sprite.scale.set(0.7, 0.7, 1);

        const effect = {
            mesh: sprite,
            age: 0,
            duration: 0.8,
            update: (dt) => {
                effect.age += dt;
                sprite.position.y += dt * 1.5;
                const t = Math.min(effect.age / effect.duration, 1);
                material.opacity = 1 - t;
            }
        };

        this.scene.add(sprite);
        this.transientEffects.push(effect);

        setTimeout(() => {
            this.scene.remove(sprite);
            texture.dispose();
            material.dispose();
        }, effect.duration * 1000);
    }

    isSnailTileWalkable(tileX, tileZ) {
        return this.getTileType(tileX, tileZ) !== '#';
    }

    pickSnailWanderTile(sprite, target = null) {
        const originX = sprite.position.x;
        const originZ = sprite.position.z;
        const baseAngle = target
            ? Math.atan2(target.z - originZ, target.x - originX)
            : Math.random() * Math.PI * 2;

        for (let attempt = 0; attempt < 12; attempt += 1) {
            const angle = baseAngle + (Math.random() - 0.5) * Math.PI * (1.2 + attempt * 0.18);
            const distance = SNAIL_WANDER_DISTANCE_MIN + Math.random() * (SNAIL_WANDER_DISTANCE_MAX - SNAIL_WANDER_DISTANCE_MIN);
            const tileX = Math.round(originX + Math.cos(angle) * distance);
            const tileZ = Math.round(originZ + Math.sin(angle) * distance);
            if (this.isSnailTileWalkable(tileX, tileZ)) {
                return { x: tileX, z: tileZ };
            }
        }

        return null;
    }

    // Spawn a single milestone "retaliation" boss near the player that beelines
    // for the ship. Driven by the bank's `goal-unlocked` event (see init wiring).
    spawnMilestoneBoss(bossType, { sourceGoalKey = null } = {}) {
        if (!this.player || !this.snailsEnabled) return null;
        if (!this.scatterMaterials[bossType]) return null;
        // Never stack the same milestone boss.
        if (this.scatterSprites.some((s) => s.userData?.isMilestone && s.userData?.type === bossType && !s.userData?.burstTriggered)) {
            return null;
        }

        const baseX = this.player.position.x;
        const baseZ = this.player.position.z;
        let spawnX = null;
        let spawnZ = null;
        for (const dist of [24, 22, 26, 20, 28]) {
            const startA = Math.random() * Math.PI * 2;
            for (let a = 0; a < 12; a++) {
                const ang = startA + (a / 12) * Math.PI * 2;
                const tx = baseX + Math.cos(ang) * dist;
                const tz = baseZ + Math.sin(ang) * dist;
                if (this.isSnailTileWalkable(Math.round(tx), Math.round(tz))) {
                    spawnX = tx;
                    spawnZ = tz;
                    break;
                }
            }
            if (spawnX !== null) break;
        }
        if (spawnX === null) return null;

        const tint = bossType === 'boss_cryosnail' ? 0x88ccff
            : bossType === 'boss_sporesnail' ? 0x88ff88 : 0xffffff;
        const placement = {
            x: spawnX,
            z: spawnZ,
            type: bossType,
            scatterKey: `milestone:${bossType}:${Date.now()}`,
            scale: bossType === 'boss_cybersnail' ? 3.2 : bossType === 'boss_cryosnail' ? 3.8 : 4.4,
            rotation: 0,
            tiltX: 0,
            tiltZ: 0,
            elevation: 0.1,
            groupType: 'boss',
            phase: 0,
            opacity: 1,
            biomeTint: tint,
            isBoss: true
        };
        const boss = this.createScatterInstance(placement);
        if (!boss) return null;
        boss.userData.isMilestone = true;
        boss.userData.sourceGoalKey = sourceGoalKey;
        boss.userData.prioritizeShip = true;
        boss.userData.targetType = 'ship';

        // The O2-generator retaliation is the arc's FIRST boss — an introductory
        // fight. Quarter the normal cybersnail HP (20 -> 5) and flag it so the
        // attack logic fires a single slow shot instead of the 3-round spread.
        if (sourceGoalKey === 'o2Bubble') {
            boss.userData.easyTier = true;
            boss.userData.maxHp = 5;
            boss.userData.hp = 5;
        }

        // Parent to the player's (loaded) chunk group so the boss persists in
        // scatterSprites across chunk syncs. Chunk groups use world coords.
        const chunkX = Math.floor(baseX / this.chunkSize);
        const chunkY = Math.floor(baseZ / this.chunkSize);
        const group = this.chunkMeshes.get(`${chunkX},${chunkY}`);
        if (!group) return null;
        group.add(boss);
        this.scatterSprites.push(boss);

        window.AudioManager?.play('amb_metal_stress', { volume: 0.6, playbackRate: 0.42, bus: 'sfx' });
        window.dispatchEvent(new CustomEvent('milestone-boss-spawned', { detail: { type: bossType } }));
        return boss;
    }

    spawnHiveHarvestBoss(hive, extractionLevel = 1) {
        if (!hive || !this.player) return null;
        const bossType = HIVE_HARVEST_BOSS_FOR_HIVE[hive.id] ?? 'boss_sporesnail';
        if (!this.scatterMaterials[bossType]) return null;
        if (this.scatterSprites.some((s) => s.userData?.isHiveHarvestBoss && s.userData?.hiveId === hive.id && !s.userData?.burstTriggered)) {
            return null;
        }

        this.snailsEnabled = true;
        let spawnX = null;
        let spawnZ = null;
        const baseX = hive.pos?.x ?? this.player.position.x;
        const baseZ = hive.pos?.z ?? this.player.position.z;
        for (const dist of [6, 7.5, 5, 9]) {
            const startA = Math.random() * Math.PI * 2;
            for (let a = 0; a < 16; a += 1) {
                const ang = startA + (a / 16) * Math.PI * 2;
                const tx = baseX + Math.cos(ang) * dist;
                const tz = baseZ + Math.sin(ang) * dist;
                if (this.isSnailTileWalkable(Math.round(tx), Math.round(tz))) {
                    spawnX = tx;
                    spawnZ = tz;
                    break;
                }
            }
            if (spawnX !== null) break;
        }
        if (spawnX === null) return null;

        const tint = bossType === 'boss_cryosnail' ? 0x88ccff
            : bossType === 'boss_sporesnail' ? 0x88ff88 : 0xffffff;
        const level = Math.max(1, Math.min(3, Math.floor(Number(extractionLevel) || 1)));
        const placement = {
            x: spawnX,
            z: spawnZ,
            type: bossType,
            scatterKey: `hive-harvest:${hive.id}:${Date.now()}`,
            scale: bossType === 'boss_cybersnail' ? 2.9 : bossType === 'boss_cryosnail' ? 3.35 : 3.8,
            rotation: 0,
            tiltX: 0,
            tiltZ: 0,
            elevation: 0.1,
            groupType: 'boss',
            phase: 0,
            opacity: 1,
            biomeTint: tint,
            isBoss: true,
            maxHp: 7 + level * 4
        };
        const boss = this.createScatterInstance(placement);
        if (!boss) return null;
        boss.userData.isMilestone = true;
        boss.userData.isHiveHarvestBoss = true;
        boss.userData.hiveId = hive.id;
        boss.userData.sourceGoalKey = 'hiveHarvest';
        boss.userData.prioritizeShip = false;
        boss.userData.targetType = 'player';

        const chunkX = Math.floor(spawnX / this.chunkSize);
        const chunkY = Math.floor(spawnZ / this.chunkSize);
        const group = this.chunkMeshes.get(`${chunkX},${chunkY}`) ?? this.scene;
        group.add(boss);
        this.scatterSprites.push(boss);

        window.AudioManager?.play?.('amb_metal_stress', { volume: 0.6, playbackRate: 0.5, bus: 'sfx' });
        window.dispatchEvent(new CustomEvent('milestone-boss-spawned', {
            detail: { type: bossType, sourceGoalKey: 'hiveHarvest', hiveId: hive.id }
        }));
        window.dispatchEvent(new CustomEvent('hive-harvest-boss-spawned', {
            detail: { type: bossType, hiveId: hive.id, hiveLabel: hive.label, extractionLevel: level }
        }));
        return boss;
    }

    triggerApexThreats(snapshot = {}) {
        if (!this.isAct2Active()) return [];
        const events = this.bunkerDirector?.evaluateApexThreats?.(snapshot) ?? [];
        for (const event of events) this.spawnAct2ApexThreat(event, snapshot);
        return events;
    }

    getApexThreatOrigin(snapshot = {}) {
        const camp = this.camps.find((candidate) => candidate.id === snapshot.campId);
        if (camp?.pos) return { x: camp.pos.x, z: camp.pos.z, camp };
        if (this.player) return { x: this.player.position.x, z: this.player.position.z, camp: null };
        return { x: 0, z: 0, camp: null };
    }

    findApexSpawnPoint(origin = { x: 0, z: 0 }, index = 0) {
        const baseX = Number.isFinite(origin.x) ? origin.x : 0;
        const baseZ = Number.isFinite(origin.z) ? origin.z : 0;
        for (const dist of [8, 10, 12, 6, 14]) {
            const startA = Math.random() * Math.PI * 2 + index * 0.9;
            for (let a = 0; a < 18; a += 1) {
                const ang = startA + (a / 18) * Math.PI * 2;
                const tx = baseX + Math.cos(ang) * dist;
                const tz = baseZ + Math.sin(ang) * dist;
                if (this.isSnailTileWalkable(Math.round(tx), Math.round(tz))
                    && (!this.canOccupyPosition || this.canOccupyPosition(Math.round(tx), Math.round(tz)))) {
                    return { x: tx, z: tz };
                }
            }
        }
        return { x: baseX + 6 + index, z: baseZ + 6 - index };
    }

    addApexEnemy(type, origin, {
        key = 'apex',
        index = 0,
        scale = 2.4,
        hp = 12,
        tint = 0xff4455,
        label = ''
    } = {}) {
        this.snailsEnabled = true;
        const spawn = this.findApexSpawnPoint(origin, index);
        const placement = {
            x: spawn.x,
            z: spawn.z,
            type,
            scatterKey: `${key}:${type}:${Date.now()}:${index}`,
            scale,
            rotation: 0,
            tiltX: 0,
            tiltZ: 0,
            elevation: 0.1,
            groupType: 'boss',
            phase: Math.random() * Math.PI * 2,
            opacity: 1,
            biomeTint: tint,
            isBoss: type.startsWith('boss_'),
            maxHp: hp
        };
        const enemy = this.createScatterInstance(placement);
        if (!enemy) return null;
        enemy.userData.apexThreat = true;
        enemy.userData.apexLabel = label;
        enemy.userData.prioritizeShip = false;
        enemy.userData.targetType = 'player';
        if (type === 'sentinel') {
            enemy.userData.groupType = 'apex-support';
            enemy.userData.detectRadius = Math.max(enemy.userData.detectRadius ?? 0, 12);
        }

        const chunkX = Math.floor(spawn.x / this.chunkSize);
        const chunkY = Math.floor(spawn.z / this.chunkSize);
        const group = this.chunkMeshes.get(`${chunkX},${chunkY}`);
        (group ?? this.scene).add(enemy);
        this.scatterSprites.push(enemy);
        this.spawnGearPoofEffect(spawn.x, spawn.z, type === 'sentinel' ? 'bunker_junk_uncommon' : 'bio_spores_amber');
        return enemy;
    }

    spawnAct2ApexThreat(event = {}, snapshot = {}) {
        const origin = this.getApexThreatOrigin(snapshot);
        let spawned = [];
        if (event.type === 'hunter_pair') {
            spawned = [
                this.addApexEnemy('boss_corrupted_tank', origin, {
                    key: event.key,
                    index: 0,
                    scale: 2.8,
                    hp: 18,
                    tint: 0xffd166,
                    label: event.hunters?.[0] ?? 'HENDERSON-REDLINE'
                }),
                this.addApexEnemy('boss_corrupted_scout', origin, {
                    key: event.key,
                    index: 1,
                    scale: 2.45,
                    hp: 14,
                    tint: 0xff6b6b,
                    label: event.hunters?.[1] ?? 'PARK-ASH'
                })
            ].filter(Boolean);
            window.dispatchEvent(new CustomEvent('hunter-pair-spawned', {
                detail: { ...event, campLabel: snapshot.campLabel, spawned: spawned.length }
            }));
        } else if (event.type === 'exterminator_lander') {
            spawned = [
                this.addApexEnemy('boss_cybersnail', origin, {
                    key: event.key,
                    index: 0,
                    scale: 3.4,
                    hp: 28,
                    tint: 0xff3344,
                    label: event.label
                }),
                this.addApexEnemy('sentinel', origin, {
                    key: event.key,
                    index: 1,
                    scale: 1.35,
                    hp: 4,
                    tint: 0xffdd44,
                    label: 'LANDER ESCORT'
                }),
                this.addApexEnemy('sentinel', origin, {
                    key: event.key,
                    index: 2,
                    scale: 1.35,
                    hp: 4,
                    tint: 0xffdd44,
                    label: 'LANDER ESCORT'
                })
            ].filter(Boolean);
            window.dispatchEvent(new CustomEvent('lander-deployed', {
                detail: { ...event, campLabel: snapshot.campLabel, spawned: spawned.length }
            }));
        }

        if (spawned.length) {
            window.AudioManager?.play?.('amb_metal_stress', { volume: 0.7, playbackRate: 0.55, bus: 'sfx' });
            window.dispatchEvent(new CustomEvent('act2-apex-threat-spawned', {
                detail: {
                    ...event,
                    campLabel: snapshot.campLabel,
                    x: origin.x,
                    z: origin.z,
                    spawned: spawned.length,
                    spawnedTypes: spawned.map((enemy) => enemy.userData?.type).filter(Boolean)
                }
            }));
        }
        return spawned;
    }

    // Post-turn the hive recognizes its carrier: wild snails ignore the
    // player. Camp defenders and anything the player shoots stay hostile.
    isHiveKinPassive(sprite) {
        return this.isAct2Active()
            && !sprite?.userData?.campDefenderId
            && !sprite?.userData?.isHiveHarvestBoss
            && !sprite?.userData?.shotByPlayer;
    }

    selectSnailTarget(sprite, activeShip) {
        const targets = [];
        if (this.player && !this.isPlayerDead && !this.isHiveKinPassive(sprite)) {
            targets.push({
                type: 'player',
                x: this.player.position.x,
                z: this.player.position.z
            });
        }
        if (activeShip && activeShip.hp > 0) {
            targets.push({
                type: 'ship',
                x: activeShip.tileX,
                z: activeShip.tileZ
            });
        }
        if (!targets.length) return null;

        for (const target of targets) {
            target.distance = Math.hypot(target.x - sprite.position.x, target.z - sprite.position.z);
        }

        if (sprite.userData.shotByPlayer) {
            const playerTarget = targets.find(t => t.type === 'player');
            if (playerTarget && playerTarget.distance <= 12.0) {
                return { ...playerTarget, mode: 'hunt', goalX: playerTarget.x, goalZ: playerTarget.z };
            } else {
                sprite.userData.shotByPlayer = false;
                sprite.userData.prioritizeShip = true;
            }
        }

        // Milestone retaliation bosses bee-line for the ship until the player
        // physically gets in their face, then they defend themselves.
        if (sprite.userData.prioritizeShip) {
            const shipTarget = targets.find((t) => t.type === 'ship');
            const playerTarget = targets.find((t) => t.type === 'player');
            if (shipTarget && (!playerTarget || playerTarget.distance > 3.5)) {
                return { ...shipTarget, mode: 'hunt', goalX: shipTarget.x, goalZ: shipTarget.z };
            }
        }

        targets.sort((a, b) => a.distance - b.distance);
        const nearest = targets[0];

        if (!sprite.userData.enraged && nearest.distance > SNAIL_WANDER_TARGET_DISTANCE) {
            const wanderTile = this.pickSnailWanderTile(sprite, nearest);
            if (wanderTile) {
                return {
                    ...nearest,
                    mode: 'wander',
                    goalX: wanderTile.x,
                    goalZ: wanderTile.z
                };
            }
        }

        return {
            ...nearest,
            mode: 'hunt',
            goalX: nearest.x,
            goalZ: nearest.z
        };
    }

    findSnailPath(startTileX, startTileZ, goalTileX, goalTileZ, nodeBudget = SNAIL_PATH_NODE_BUDGET) {
        const keyOf = (x, z) => `${x},${z}`;
        const parseKey = (key) => {
            const [x, z] = key.split(',');
            return { x: Number(x), z: Number(z) };
        };
        const heuristic = (ax, az, bx, bz) => Math.hypot(bx - ax, bz - az);
        const directions = [
            { dx: 1, dz: 0, cost: 1 },
            { dx: -1, dz: 0, cost: 1 },
            { dx: 0, dz: 1, cost: 1 },
            { dx: 0, dz: -1, cost: 1 },
            { dx: 1, dz: 1, cost: Math.SQRT2, diagonal: true },
            { dx: 1, dz: -1, cost: Math.SQRT2, diagonal: true },
            { dx: -1, dz: 1, cost: Math.SQRT2, diagonal: true },
            { dx: -1, dz: -1, cost: Math.SQRT2, diagonal: true }
        ];

        if (!this.isSnailTileWalkable(startTileX, startTileZ)) {
            return [{ x: startTileX, z: startTileZ }];
        }

        let resolvedGoalX = goalTileX;
        let resolvedGoalZ = goalTileZ;
        if (!this.isSnailTileWalkable(resolvedGoalX, resolvedGoalZ)) {
            const fallbackOffsets = [
                [1, 0], [-1, 0], [0, 1], [0, -1],
                [1, 1], [-1, 1], [1, -1], [-1, -1],
                [2, 0], [-2, 0], [0, 2], [0, -2]
            ];
            let fallback = null;
            let fallbackDist = Infinity;
            for (const [dx, dz] of fallbackOffsets) {
                const nx = resolvedGoalX + dx;
                const nz = resolvedGoalZ + dz;
                if (!this.isSnailTileWalkable(nx, nz)) continue;
                const dist = heuristic(startTileX, startTileZ, nx, nz);
                if (dist < fallbackDist) {
                    fallback = { x: nx, z: nz };
                    fallbackDist = dist;
                }
            }
            if (fallback) {
                resolvedGoalX = fallback.x;
                resolvedGoalZ = fallback.z;
            }
        }

        const startKey = keyOf(startTileX, startTileZ);
        const goalKey = keyOf(resolvedGoalX, resolvedGoalZ);
        if (startKey === goalKey) {
            return [{ x: startTileX, z: startTileZ }];
        }

        const openSet = [startKey];
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map([[startKey, 0]]);
        const fScore = new Map([[startKey, heuristic(startTileX, startTileZ, resolvedGoalX, resolvedGoalZ)]]);

        let explored = 0;
        let bestKey = startKey;
        let bestDistance = heuristic(startTileX, startTileZ, resolvedGoalX, resolvedGoalZ);

        while (openSet.length > 0 && explored < nodeBudget) {
            openSet.sort((a, b) => (fScore.get(a) ?? Infinity) - (fScore.get(b) ?? Infinity));
            const currentKey = openSet.shift();
            if (!currentKey) break;
            if (closedSet.has(currentKey)) continue;

            const current = parseKey(currentKey);
            const distanceToGoal = heuristic(current.x, current.z, resolvedGoalX, resolvedGoalZ);
            if (distanceToGoal < bestDistance) {
                bestDistance = distanceToGoal;
                bestKey = currentKey;
            }

            if (currentKey === goalKey) {
                bestKey = currentKey;
                break;
            }

            closedSet.add(currentKey);
            explored += 1;
            const currentG = gScore.get(currentKey) ?? Infinity;

            for (const dir of directions) {
                const nx = current.x + dir.dx;
                const nz = current.z + dir.dz;
                if (!this.isSnailTileWalkable(nx, nz)) continue;
                if (dir.diagonal) {
                    if (!this.isSnailTileWalkable(current.x + dir.dx, current.z) || !this.isSnailTileWalkable(current.x, current.z + dir.dz)) {
                        continue;
                    }
                }

                const neighborKey = keyOf(nx, nz);
                if (closedSet.has(neighborKey)) continue;
                const tentativeG = currentG + dir.cost;
                if (tentativeG >= (gScore.get(neighborKey) ?? Infinity)) continue;

                cameFrom.set(neighborKey, currentKey);
                gScore.set(neighborKey, tentativeG);
                const nextF = tentativeG + heuristic(nx, nz, resolvedGoalX, resolvedGoalZ);
                fScore.set(neighborKey, nextF);
                if (!openSet.includes(neighborKey)) {
                    openSet.push(neighborKey);
                }
            }
        }

        const pathKeys = [bestKey];
        let walkKey = bestKey;
        while (cameFrom.has(walkKey)) {
            walkKey = cameFrom.get(walkKey);
            pathKeys.push(walkKey);
        }
        pathKeys.reverse();

        return pathKeys.map((key) => {
            const point = parseKey(key);
            return { x: point.x, z: point.z };
        });
    }

    updateSentinelBehavior(sprite, delta) {
        const data = sprite.userData;
        if (!this.player) return;

        const dx = this.player.position.x - sprite.position.x;
        const dz = this.player.position.z - sprite.position.z;
        const distToPlayer = Math.hypot(dx, dz);

        if (distToPlayer > data.detectRadius) {
            data.active = false;
            sprite.material.color.setHex(0xffdd44);
            return;
        }

        if (!data.active) {
            data.active = true;
            sprite.material.color.setHex(0xffffff);
            window.AudioManager?.play('ui_scan_ping', { volume: 0.28, playbackRate: 0.4, bus: 'sfx' });
        }

        data.fireCooldown = Math.max(0, (data.fireCooldown ?? SENTINEL_FIRE_COOLDOWN) - delta);

        if (data.fireCooldown <= 0) {
            data.fireCooldown = SENTINEL_FIRE_COOLDOWN;
            this.fireSentinelProjectile(sprite);
        }

        // Warning flash when about to fire
        if (data.fireCooldown < 0.4) {
            const flash = Math.sin(Date.now() * 0.025) > 0;
            sprite.material.color.setHex(flash ? 0xffffff : 0xff8800);
        } else {
            sprite.material.color.setHex(0xffcc00);
        }
    }

    fireSentinelProjectile(sprite) {
        if (!this.player) return;
        const dx = this.player.position.x - sprite.position.x;
        const dz = this.player.position.z - sprite.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.001) return;

        const speed = SENTINEL_PROJECTILE_SPEED;
        this.spawnProjectile({
            x: sprite.position.x,
            z: sprite.position.z,
            vx: (dx / dist) * speed,
            vz: (dz / dist) * speed,
            ttl: 2.5,
            damage: 1,
            radius: 0.22,
            isEnemy: true,
            options: { color: 0xffcc00, glowColor: 0xff8800 }
        });
        window.AudioManager?.play('ui_error', { volume: 0.18, playbackRate: 0.52, bus: 'sfx' });

        // Yellow flash on HUD when sentinel fires
        window.dispatchEvent(new CustomEvent('sentinel-fired', { detail: { x: sprite.position.x, z: sprite.position.z } }));
    }

    updateCrawlerBehavior(sprite, delta) {
        const data = sprite.userData;
        if (!this.player) return;

        if (data.attackCooldown > 0) {
            data.attackCooldown = Math.max(0, data.attackCooldown - delta);
        }

        const dx = this.player.position.x - sprite.position.x;
        const dz = this.player.position.z - sprite.position.z;
        const distToPlayer = Math.hypot(dx, dz);

        if (data.crawlerState === 'idle') {
            if (!this.isPlayerDead && distToPlayer <= CRAWLER_DETECT_RADIUS) {
                data.crawlerState = 'alert';
                data.windupTimer = 0;
                sprite.material.color.setHex(0xffffff);
                window.AudioManager?.play('ui_scan_ping', { volume: 0.38, playbackRate: 2.2, bus: 'sfx' });
                window.dispatchEvent(new CustomEvent('crawler-detected', {}));
            }
        } else if (data.crawlerState === 'alert') {
            data.windupTimer += delta;
            // Rapid shake during windup
            sprite.position.x += (Math.random() - 0.5) * 0.05;
            sprite.position.z += (Math.random() - 0.5) * 0.05;

            if (distToPlayer > CRAWLER_DETECT_RADIUS * 1.6 || this.isPlayerDead) {
                data.crawlerState = 'idle';
                sprite.material.color.setHex(CRAWLER_TINT);
            } else if (data.windupTimer >= CRAWLER_WINDUP_DURATION) {
                const dist = distToPlayer;
                if (dist < 0.001) { data.crawlerState = 'idle'; return; }
                data.chargeDirX = dx / dist;
                data.chargeDirZ = dz / dist;
                data.chargeTimer = 0;
                data.crawlerState = 'charging';
                sprite.material.color.setHex(CRAWLER_TINT);
                window.AudioManager?.play('amb_metal_stress', { volume: 0.45, playbackRate: 2.6, bus: 'sfx' });
            }
        } else if (data.crawlerState === 'charging') {
            data.chargeTimer += delta;

            const moveX = data.chargeDirX * CRAWLER_CHARGE_SPEED * delta;
            const moveZ = data.chargeDirZ * CRAWLER_CHARGE_SPEED * delta;
            const nextX = sprite.position.x + moveX;
            const nextZ = sprite.position.z + moveZ;
            const wallHit = this.getTileType(Math.round(nextX), Math.round(nextZ)) === '#';

            if (wallHit || data.chargeTimer >= CRAWLER_CHARGE_MAX_DURATION) {
                data.crawlerState = 'idle';
                data.attackCooldown = CRAWLER_ATTACK_COOLDOWN;
                sprite.material.color.setHex(CRAWLER_TINT);
                return;
            }

            sprite.position.x = nextX;
            sprite.position.z = nextZ;

            // Update facing from charge direction via shared helper
            this.faceSpriteFromDir(sprite, data.chargeDirX);

            // Player hit check
            const newDist = Math.hypot(this.player.position.x - sprite.position.x, this.player.position.z - sprite.position.z);
            if (!this.isPlayerDead && newDist <= CRAWLER_ATTACK_RADIUS && data.attackCooldown <= 0 && !this.isHiveKinPassive(sprite)) {
                data.attackCooldown = CRAWLER_ATTACK_COOLDOWN;
                data.crawlerState = 'idle';
                window.dispatchEvent(new CustomEvent('player-hit', { detail: { reason: 'crawler' } }));
                window.AudioManager?.play('ui_error', { volume: 0.5, playbackRate: 1.3, bus: 'sfx' });
            }
        }
    }

    spawnCrawlerDrops(sprite) {
        const parent = sprite?.parent;
        if (!parent) return;
        const x = sprite.position.x;
        const z = sprite.position.z;
        const dropTypes = ['ammo'];
        if (Math.random() < 0.25) dropTypes.push('health');

        for (const type of dropTypes) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 0.35 + Math.random() * 0.28;
            const targetX = x + Math.cos(angle) * radius;
            const targetZ = z + Math.sin(angle) * radius;
            if (this.getTileType(Math.round(targetX), Math.round(targetZ)) === '#') continue;
            const placement = this.createSnailDropPlacement(x, z, targetX, targetZ, type);
            const pickup = this.createPickupInstance(placement);
            if (pickup) {
                parent.add(pickup);
                this.pickupMeshes.push(pickup);
            }
        }
    }

    spawnSentinelDrops(sprite) {
        const x = sprite.position.x;
        const z = sprite.position.z;
        for (let i = 0; i < SENTINEL_TECH_DROP; i++) {
            const angle = (i / SENTINEL_TECH_DROP) * Math.PI * 2;
            const r = 0.4 + Math.random() * 0.4;
            const placement = this.createSnailDropPlacement(x, z, x + Math.cos(angle) * r, z + Math.sin(angle) * r, 'weapon');
            if (placement) {
                const pickup = this.createPickupInstance(placement);
                if (pickup) {
                    this.scene.add(pickup);
                    this.pickupMeshes.push(pickup);
                }
            }
        }
        // Coin drop(s)
        for (let i = 0; i < SENTINEL_COIN_DROP; i++) {
            const coinPlacement = this.createSnailDropPlacement(
                x,
                z,
                x + (Math.random() - 0.5),
                z + (Math.random() - 0.5),
                'coin'
            );
            if (coinPlacement) {
                const coinPickup = this.createPickupInstance(coinPlacement);
                if (coinPickup) {
                    this.scene.add(coinPickup);
                    this.pickupMeshes.push(coinPickup);
                }
            }
        }
    }

    // Shared billboard facing helper: flip sprite scale.x toward the travel
    // direction. Uses the live move vector (dirX) every frame; when X motion is
    // negligible (Z-dominant travel) it falls back to the bearing toward the
    // target so sprites never keep stale "backward" facing. Preserves last sign
    // when both inputs are inside the deadzone to avoid jitter.
    faceSpriteFromDir(sprite, dirX, fallbackX = 0) {
        const data = sprite.userData;
        // Walk-sheet sprites carry directional rows in the texture; a scale
        // flip would mirror them wrongly. Their facing lives in the UV row
        // (updateSheetSpriteFrame), so hold the scale positive here.
        if (data.sheetSprite) {
            sprite.scale.set(Math.abs(data.baseScaleX), data.baseScaleY, 1);
            return;
        }
        const DEADZONE = 0.02;
        if (dirX <= -DEADZONE) {
            data.facingSign = -1;
        } else if (dirX >= DEADZONE) {
            data.facingSign = 1;
        } else if (fallbackX <= -DEADZONE) {
            data.facingSign = -1;
        } else if (fallbackX >= DEADZONE) {
            data.facingSign = 1;
        }
        const facingSign = data.facingSign === -1 ? -1 : 1;
        sprite.scale.set(Math.abs(data.baseScaleX) * facingSign, data.baseScaleY, 1);
    }

    // 4x4 walk-sheet UV animation (camp-leader layout: 4 frames per row,
    // rows = S/N/E/W facings, texture rows counted from the top). Facing
    // picks the dominant travel axis; frames step at 6 fps while moving.
    updateSheetSpriteFrame(sprite, dirX, dirZ, delta, moving = true) {
        const data = sprite.userData;
        const map = sprite.material?.map;
        if (!data?.sheetSprite || !map) return;
        if (moving) {
            data.sheetTime = (data.sheetTime ?? 0) + delta;
            if (Math.abs(dirX) > Math.abs(dirZ)) {
                data.sheetRow = dirX > 0 ? 2 : 3; // East / West
            } else if (Math.abs(dirZ) > 0.001) {
                data.sheetRow = dirZ > 0 ? 0 : 1; // South / North
            }
        }
        const frame = moving ? Math.floor((data.sheetTime ?? 0) * 6) % 4 : 0;
        map.offset.set(frame * 0.25, (3 - (data.sheetRow ?? 0)) * 0.25);
    }

    // Shoves the player and the snail apart on a contact hit and gives the
    // snail a short recoil, so enemies bump the player back instead of camping
    // on top of them. Movement is collision-checked per axis.
    applySnailContactKnockback(sprite, data) {
        if (!this.player) return;
        let dx = this.player.position.x - sprite.position.x;
        let dz = this.player.position.z - sprite.position.z;
        let len = Math.hypot(dx, dz);
        if (len < 1e-4) {
            // Perfectly overlapping — pick a random direction so they still split.
            const angle = Math.random() * Math.PI * 2;
            dx = Math.cos(angle);
            dz = Math.sin(angle);
            len = 1;
        }
        dx /= len;
        dz /= len;

        // Push the player away from the snail, sliding per axis so walls block it.
        const pKx = dx * SNAIL_HIT_PLAYER_KNOCKBACK;
        const pKz = dz * SNAIL_HIT_PLAYER_KNOCKBACK;
        if (this.canOccupyPosition(this.player.position.x + pKx, this.player.position.z)) {
            this.player.position.x += pKx;
        }
        if (this.canOccupyPosition(this.player.position.x, this.player.position.z + pKz)) {
            this.player.position.z += pKz;
        }

        // Push the snail back the opposite way using slide velocity
        const selfKnock = SNAIL_HIT_SELF_KNOCKBACK * (data.isBoss ? 0.45 : 1);
        data.knockbackTimer = SNAIL_HIT_RECOIL_TIME;
        const knockSpeed = selfKnock / SNAIL_HIT_RECOIL_TIME;
        data.knockbackVx = -dx * knockSpeed;
        data.knockbackVz = -dz * knockSpeed;

        data.pathNodes = null;
        data.pathRetargetTimer = 0;
    }

    // Bounces the snail back away from the ship on a contact hit using a smooth slide animation.
    applySnailShipKnockback(sprite, data, activeShip) {
        if (!activeShip) return;
        let dx = sprite.position.x - activeShip.tileX;
        let dz = sprite.position.z - activeShip.tileZ;
        let len = Math.hypot(dx, dz);
        if (len < 1e-4) {
            // Perfectly overlapping — pick a random direction to split.
            const angle = Math.random() * Math.PI * 2;
            dx = Math.cos(angle);
            dz = Math.sin(angle);
            len = 1;
        }
        dx /= len;
        dz /= len;

        // Bounce back by 1.8 units (1.08 units for bosses) away from the ship center
        const bounceDist = 1.8 * (data.isBoss ? 0.6 : 1);
        data.knockbackTimer = 0.5; // Slide duration
        const knockSpeed = bounceDist / data.knockbackTimer;
        data.knockbackVx = dx * knockSpeed;
        data.knockbackVz = dz * knockSpeed;

        data.pathNodes = null;
        data.pathRetargetTimer = 0;
    }

    updateSnailBehavior(sprite, delta, activeShip) {
        const data = sprite.userData;
        data.attackCooldown = Math.max(0, (data.attackCooldown ?? 0) - delta);
        data.pathRetargetTimer = Math.max(0, (data.pathRetargetTimer ?? 0) - delta);

        if (data.knockbackTimer > 0) {
            const kx = (data.knockbackVx ?? 0) * delta;
            const kz = (data.knockbackVz ?? 0) * delta;
            const nextX = sprite.position.x + kx;
            const nextZ = sprite.position.z + kz;
            if (this.isSnailTileWalkable(Math.round(nextX), Math.round(nextZ))) {
                sprite.position.x = nextX;
                sprite.position.z = nextZ;
            }
        }
        data.knockbackTimer = Math.max(0, (data.knockbackTimer ?? 0) - delta);

        const target = this.selectSnailTarget(sprite, activeShip);
        if (!target) return;

        const startTileX = Math.round(sprite.position.x);
        const startTileZ = Math.round(sprite.position.z);
        const goalTileX = Math.round(target.goalX);
        const goalTileZ = Math.round(target.goalZ);
        const targetChanged = data.pathGoalTileX !== goalTileX
            || data.pathGoalTileZ !== goalTileZ
            || data.aiMode !== target.mode
            || data.targetType !== target.type;
        const noPath = !Array.isArray(data.pathNodes) || data.pathNodes.length === 0 || data.pathIndex >= data.pathNodes.length;
        const shouldRepath = targetChanged || noPath || data.pathRetargetTimer <= 0;

        if (shouldRepath) {
            const previousMode = data.aiMode;
            const pathNodes = this.findSnailPath(startTileX, startTileZ, goalTileX, goalTileZ, SNAIL_PATH_NODE_BUDGET);
            data.pathNodes = pathNodes;
            data.pathIndex = pathNodes.length > 1 ? 1 : 0;
            data.pathGoalTileX = goalTileX;
            data.pathGoalTileZ = goalTileZ;
            data.aiMode = target.mode;
            data.targetType = target.type;
            if (previousMode !== 'hunt' && target.mode === 'hunt' && target.type === 'player') {
                window.AudioManager?.play('ui_scan_ping', { volume: 0.2, playbackRate: 0.55, bus: 'sfx' });
            }
            data.pathRetargetTimer = target.mode === 'hunt'
                ? SNAIL_PATH_RECALC_MIN + Math.random() * (SNAIL_PATH_RECALC_MAX - SNAIL_PATH_RECALC_MIN)
                : SNAIL_WANDER_RECALC_MIN + Math.random() * (SNAIL_WANDER_RECALC_MAX - SNAIL_WANDER_RECALC_MIN);
        }

        let moveTargetX = target.goalX;
        let moveTargetZ = target.goalZ;
        if (Array.isArray(data.pathNodes) && data.pathNodes.length > 0) {
            const index = Math.max(0, Math.min(data.pathIndex ?? 0, data.pathNodes.length - 1));
            const waypoint = data.pathNodes[index];
            moveTargetX = waypoint.x;
            moveTargetZ = waypoint.z;
            const waypointDistance = Math.hypot(moveTargetX - sprite.position.x, moveTargetZ - sprite.position.z);
            if (waypointDistance <= 0.22 && index < data.pathNodes.length - 1) {
                data.pathIndex = index + 1;
                const nextWaypoint = data.pathNodes[data.pathIndex];
                moveTargetX = nextWaypoint.x;
                moveTargetZ = nextWaypoint.z;
            } else {
                data.pathIndex = index;
            }
        }

        const toGoalX = moveTargetX - sprite.position.x;
        const toGoalZ = moveTargetZ - sprite.position.z;
        const moveDistance = Math.hypot(toGoalX, toGoalZ);
        // Skip advancing while recoiling from a contact hit so the shove reads
        // before the snail closes back in.
        if (moveDistance > 0.001 && data.knockbackTimer <= 0) {
            const dirX = toGoalX / moveDistance;
            const dirZ = toGoalZ / moveDistance;
            const step = Math.min(moveDistance, (data.speed ?? SNAIL_MOVE_SPEED) * delta);
            const nextX = sprite.position.x + dirX * step;
            const nextZ = sprite.position.z + dirZ * step;

            if (this.isSnailTileWalkable(Math.round(nextX), Math.round(nextZ))) {
                sprite.position.x = nextX;
                sprite.position.z = nextZ;
            } else {
                data.pathRetargetTimer = 0;
                data.pathNodes = null;
            }

            // Face the travel direction every frame; fall back to bearing toward
            // the target when movement is Z-dominant so snails never slide backward.
            this.faceSpriteFromDir(sprite, dirX, toGoalX);
            this.updateSheetSpriteFrame(sprite, dirX, dirZ, delta);
        } else if (data.sheetSprite) {
            this.updateSheetSpriteFrame(sprite, 0, 0, delta, false);
        }

        const distanceToTarget = Math.hypot(target.x - sprite.position.x, target.z - sprite.position.z);

        // Boss special attacks logic
        if (data.isBoss && data.aiMode === 'hunt') {
            data.bossAttackTimer = (data.bossAttackTimer ?? 0) - delta;
            if (data.bossAttackTimer <= 0) {
                // Determine attack based on type
                if (data.type === 'boss_cybersnail' && target.type === 'player' && distanceToTarget <= 12) {
                    // Easy-tier (first O2 boss): one slow shot. Full bosses fire a
                    // tighter-timed 3-round spread.
                    const easy = data.easyTier;
                    data.bossAttackTimer = easy ? 7.0 : 4.5;
                    const angleToPlayer = Math.atan2(target.z - sprite.position.z, target.x - sprite.position.x);
                    const spreadSteps = easy ? [0] : [-1, 0, 1];
                    for (const i of spreadSteps) {
                        const spreadAngle = angleToPlayer + i * 0.22;
                        const vx = Math.cos(spreadAngle) * 7.5;
                        const vz = Math.sin(spreadAngle) * 7.5;
                        this.spawnProjectile({
                            x: sprite.position.x,
                            z: sprite.position.z,
                            vx,
                            vz,
                            ttl: 2.0,
                            damage: 1,
                            radius: 0.22,
                            isEnemy: true
                        });
                    }
                    window.AudioManager?.play('ui_scan_ping', { volume: 0.35, playbackRate: 1.45 });
                } else if (data.type === 'boss_cryosnail' && distanceToTarget <= 12) {
                    data.bossAttackTimer = 5.5;
                    this.spawnFrostShockwaveEffect(sprite.position.x, sprite.position.z, 4.5);
                    if (this.player && !this.isPlayerDead) {
                        const d = Math.hypot(this.player.position.x - sprite.position.x, this.player.position.z - sprite.position.z);
                        if (d <= 4.5) {
                            this.takeDamage(1, 'frost-shockwave', sprite.position.x, sprite.position.z);
                            this.playerSlowTimer = 3.0; // slowed for 3 seconds
                        }
                    }
                    window.AudioManager?.play('ui_scan_ping', { volume: 0.45, playbackRate: 0.38 });
                } else if (data.type === 'boss_sporesnail' && distanceToTarget <= 12) {
                    data.bossAttackTimer = 6.5;
                    const parent = sprite.parent;
                    if (parent) {
                        const spawnOffset = [
                            [1.2, 1.2], [-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2]
                        ];
                        let spawnedCount = 0;
                        for (const [dx, dz] of spawnOffset) {
                            const tx = sprite.position.x + dx;
                            const tz = sprite.position.z + dz;
                            if (this.isSnailTileWalkable(Math.round(tx), Math.round(tz))) {
                                const placement = {
                                    x: tx,
                                    z: tz,
                                    type: 'sporesnail',
                                    scatterKey: `${sprite.userData.scatterKey}:minion:${Date.now()}:${spawnedCount}`,
                                    scale: 0.9 + Math.random() * 0.2,
                                    rotation: 0,
                                    tiltX: 0,
                                    tiltZ: 0,
                                    elevation: 0.09,
                                    groupType: 'minion',
                                    phase: Math.random() * Math.PI,
                                    opacity: 1,
                                    biomeTint: 0x88ff88
                                };
                                const minion = this.createScatterInstance(placement);
                                if (minion) {
                                    parent.add(minion);
                                    this.scatterSprites.push(minion);
                                    this.spawnGearPoofEffect(tx, tz, 'bio_spores');
                                    spawnedCount++;
                                    if (spawnedCount >= 2) break;
                                }
                            }
                        }
                        window.AudioManager?.play('amb_metal_stress', { volume: 0.5, playbackRate: 0.5 });
                    }
                } else if (data.type === 'boss_corrupted_scout' && target.type === 'player' && distanceToTarget <= 12) {
                    data.bossAttackTimer = 4.0;
                    const angleToPlayer = Math.atan2(target.z - sprite.position.z, target.x - sprite.position.x);
                    for (let i = -1; i <= 1; i++) {
                        const spreadAngle = angleToPlayer + i * 0.16;
                        this.spawnProjectile({
                            x: sprite.position.x,
                            z: sprite.position.z,
                            vx: Math.cos(spreadAngle) * 9.0,
                            vz: Math.sin(spreadAngle) * 9.0,
                            ttl: 1.8,
                            damage: 1,
                            radius: 0.18,
                            isEnemy: true
                        });
                    }
                    if (Math.random() < 0.35 && sprite.parent) {
                        this.spawnGearPoofEffect(sprite.position.x + (Math.random() - 0.5) * 1.5, sprite.position.z + (Math.random() - 0.5) * 1.5, 'bio_spores_blue');
                    }
                    window.AudioManager?.play('ui_scan_ping', { volume: 0.4, playbackRate: 1.65 });
                } else if (data.type === 'boss_corrupted_tank' && distanceToTarget <= 12) {
                    data.bossAttackTimer = 5.0;
                    this.spawnFrostShockwaveEffect(sprite.position.x, sprite.position.z, 5.0);
                    if (this.player && !this.isPlayerDead) {
                        const d = Math.hypot(this.player.position.x - sprite.position.x, this.player.position.z - sprite.position.z);
                        if (d <= 5.0) {
                            this.takeDamage(2, 'ground-slam', sprite.position.x, sprite.position.z);
                            this.triggerCameraShake?.(0.35, 0.45);
                        }
                    }
                    window.AudioManager?.play('amb_metal_stress', { volume: 0.52, playbackRate: 0.8 });
                } else if (data.type === 'boss_corrupted_engineer' && distanceToTarget <= 12) {
                    data.bossAttackTimer = 6.0;
                    this.playerSlowTimer = 2.5; // Jam and slow
                    const parent = sprite.parent;
                    if (parent) {
                        const tx = sprite.position.x + (Math.random() - 0.5) * 2;
                        const tz = sprite.position.z + (Math.random() - 0.5) * 2;
                        if (this.isSnailTileWalkable(Math.round(tx), Math.round(tz))) {
                            const placement = {
                                x: tx,
                                z: tz,
                                type: 'cybersnail',
                                scatterKey: `${sprite.userData.scatterKey}:minion:${Date.now()}`,
                                scale: 0.85,
                                rotation: 0,
                                tiltX: 0,
                                tiltZ: 0,
                                elevation: 0.08,
                                groupType: 'minion',
                                phase: Math.random() * Math.PI,
                                opacity: 1,
                                biomeTint: 0xffffff
                            };
                            const minion = this.createScatterInstance(placement);
                            if (minion) {
                                parent.add(minion);
                                this.scatterSprites.push(minion);
                                this.spawnGearPoofEffect(tx, tz, 'bunker_junk');
                            }
                        }
                    }
                    window.AudioManager?.play('ui_scan_ping', { volume: 0.48, playbackRate: 0.42 });
                }
            }
        }

        const attackRadius = SNAIL_ATTACK_RADIUS * (data.isBoss ? 2.4 : 1.0);
        if (distanceToTarget <= attackRadius && data.attackCooldown <= 0) {
            data.attackCooldown = SNAIL_ATTACK_COOLDOWN;
            const damage = data.isBoss ? 2 : 1;
            if (target.type === 'player') {
                this.takeDamage(damage, data.type, sprite.position.x, sprite.position.z);
                this.applySnailContactKnockback(sprite, data);
                if (data.type === 'cryosnail') {
                    this.playerSlowTimer = 2.5; // Cryosnail slows player on hit
                }
            } else if (activeShip) {
                this.damageShip(activeShip, damage, data.type);
                this.damageSnail(sprite, 1);
                if (!sprite.userData.burstTriggered) {
                    this.applySnailShipKnockback(sprite, data, activeShip);
                }
            }
            window.AudioManager?.play('amb_metal_stress', { volume: 0.24, playbackRate: 1.1 });
        }
    }

    isEnemyType(type) {
        return ['cybersnail', 'cryosnail', 'sporesnail', 'boss_cybersnail', 'boss_cryosnail', 'boss_sporesnail', 'sentinel', 'crawler', 'boss_corrupted_scout', 'boss_corrupted_tank', 'boss_corrupted_engineer', 'alien_proto_crawler', 'alien_proto_spitter'].includes(type);
    }

    isSentinel(type) {
        return type === 'sentinel';
    }

    isCrawler(type) {
        return type === 'crawler';
    }

    spawnFrostShockwaveEffect(x, z, maxRadius = 4.5) {
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.1, 0.25, 32),
            new THREE.MeshBasicMaterial({
                color: 0x88ccff,
                transparent: true,
                opacity: 0.8,
                depthWrite: false,
                side: THREE.DoubleSide
            })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(x, 0.08, z);
        this.scene.add(ring);
        
        const duration = 0.6;
        this.transientEffects.push({
            mesh: ring,
            age: 0,
            duration,
            update: (dt, age) => {
                const t = age / duration;
                const r = t * maxRadius;
                ring.geometry.dispose();
                ring.geometry = new THREE.RingGeometry(Math.max(0.1, r - 0.25), r + 0.05, 32);
                ring.material.opacity = 0.8 * (1 - t);
            }
        });
    }

    spawnToxicSporePuddle(x, z, isLarge = false) {
        const mat = this.scatterMaterials.scatter_slime_puddle.clone();
        mat.color.setHex(0x55ff55); // neon toxic green
        mat.opacity = 0.85;
        const damageRadius = isLarge ? 1.1 : 0.45;
        const footprintZone = { x, z, radius: damageRadius, active: true };
        this.dynamicPuddles.push(footprintZone);
        
        const sprite = new THREE.Sprite(mat);
        sprite.center.set(0.5, 0.5);
        sprite.position.set(x, 0.06, z);
        const size = isLarge ? 2.2 : 0.85;
        sprite.scale.set(size, size, 1);
        this.scene.add(sprite);
        
        const duration = isLarge ? 6.5 : 4.0;
        this.transientEffects.push({
            mesh: sprite,
            age: 0,
            duration,
            update: (dt, age) => {
                const t = age / duration;
                sprite.material.opacity = 0.85 * (1 - t);
                
                // Deal damage if player walks in it
                if (this.player && !this.isPlayerDead && age % 0.4 < dt) {
                    const d = Math.hypot(this.player.position.x - x, this.player.position.z - z);
                    if (d <= damageRadius) {
                        this.playerPoisonTimer = 3.0; // poisoned for 3 seconds
                    }
                }
            },
            dispose: () => {
                footprintZone.active = false;
                const idx = this.dynamicPuddles.indexOf(footprintZone);
                if (idx !== -1) this.dynamicPuddles.splice(idx, 1);
                mat.dispose();
            }
        });
    }

    spawnVisualSnailTrail(x, z, type, isBoss) {
        if (!this.scene) return;
        
        let color = 0x00d2ff;
        let useSlimeTexture = true;
        if (type.includes('cryo')) {
            color = 0xa3e2ff;
            useSlimeTexture = false;
        } else if (type.includes('spore')) {
            color = 0x55ff55;
            useSlimeTexture = true;
        }

        const baseMat = useSlimeTexture 
            ? this.scatterMaterials.scatter_slime_puddle 
            : this.scatterMaterials.scatter_coolant_puddle;
            
        if (!baseMat) return;
        const mat = baseMat.clone();
        mat.color.setHex(color);
        mat.opacity = 0.45;
        
        const sprite = new THREE.Sprite(mat);
        sprite.center.set(0.5, 0.5);
        sprite.position.set(x, 0.058, z);
        const size = isBoss ? 1.15 : 0.45;
        sprite.scale.set(size, size, 1);
        sprite.renderOrder = 4;
        
        this.scene.add(sprite);
        
        const duration = isBoss ? 4.2 : 2.5;
        this.transientEffects.push({
            mesh: sprite,
            age: 0,
            duration,
            update: (dt, age) => {
                const t = age / duration;
                sprite.material.opacity = 0.45 * (1 - t);
            },
            dispose: () => {
                mat.dispose();
            }
        });
    }

    updateScatter(delta, now) {
        const time = now * 0.001;
        const activeShip = this.getActiveShip();

        // Update Boss HUD status bar
        let nearestBoss = null;
        let minBossDist = Infinity;
        if (this.player && !this.isPlayerDead) {
            for (const child of this.scatterSprites) {
                if (child.userData?.isBoss && !child.userData?.burstTriggered) {
                    const dist = Math.hypot(this.player.position.x - child.position.x, this.player.position.z - child.position.z);
                    if (dist < minBossDist) {
                        minBossDist = dist;
                        nearestBoss = child;
                    }
                }
            }
        }
        
        const bossPanel = document.getElementById('boss-status-panel');
        if (nearestBoss && minBossDist < 16.0) {
            this.activeBoss = nearestBoss;
            if (bossPanel) {
                bossPanel.classList.remove('hidden');
                const nameEl = document.getElementById('boss-name');
                const hpBar = document.getElementById('boss-hp-bar');
                const hpText = document.getElementById('boss-hp-text');
                
                if (nameEl) {
                    if (nearestBoss.userData.type === 'boss_cybersnail') {
                        nameEl.textContent = 'CYBER-SHELL TITAN';
                    } else if (nearestBoss.userData.type === 'boss_cryosnail') {
                        nameEl.textContent = 'CRYO-GOLIATH SNAIL';
                    } else if (nearestBoss.userData.type === 'boss_sporesnail') {
                        nameEl.textContent = 'PLAGUE-SHELL BEHEMOTH';
                    } else if (nearestBoss.userData.type === 'boss_corrupted_scout') {
                        nameEl.textContent = 'CORRUPTED SCOUT: MARTHA';
                    } else if (nearestBoss.userData.type === 'boss_corrupted_tank') {
                        nameEl.textContent = 'CORRUPTED TANK: BRIGGS';
                    } else if (nearestBoss.userData.type === 'boss_corrupted_engineer') {
                        nameEl.textContent = 'CORRUPTED ENGINEER: KAELEN';
                    } else {
                        nameEl.textContent = 'ELITE THREAT';
                    }
                }
                
                const hp = nearestBoss.userData.hp ?? 0;
                const maxHp = nearestBoss.userData.maxHp ?? 10;
                const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
                
                if (hpBar) hpBar.style.width = `${pct}%`;
                if (hpText) hpText.textContent = `${hp} / ${maxHp}`;
            }
        } else {
            this.activeBoss = null;
            if (bossPanel) {
                bossPanel.classList.add('hidden');
            }
        }

        this._threatAudioTimer = (this._threatAudioTimer ?? 0) - delta;
        if (this._threatAudioTimer <= 0 && this.player && !this.isPlayerDead) {
            let nearestHuntingSnail = Infinity;
            let nearestSnailX = 0;
            for (const child of this.scatterSprites) {
                if (!this.isEnemyType(child.userData?.type)) continue;
                if (child.userData?.burstTriggered) continue;
                if (child.userData?.aiMode !== 'hunt' && child.userData?.crawlerState !== 'charging') continue;
                const dist = Math.hypot(this.player.position.x - child.position.x, this.player.position.z - child.position.z);
                if (dist < nearestHuntingSnail) {
                    nearestHuntingSnail = dist;
                    nearestSnailX = child.position.x;
                }
            }
            if (nearestHuntingSnail < 5.5) {
                const pan = Math.max(-1, Math.min(1, (nearestSnailX - this.player.position.x) / 6));
                window.AudioManager?.play('amb_metal_stress', {
                    volume: 0.08 + (1 - nearestHuntingSnail / 5.5) * 0.06,
                    playbackRate: 1.25,
                    bus: 'sfx',
                    pan
                });
                this._threatAudioTimer = 1.8;
            } else {
                this._threatAudioTimer = 0.5;
            }
        }

        for (const child of this.scatterSprites) {
            const baseY = child.userData.elevationOffset ?? 0;
            child.userData.baseY = baseY;
            if (!child.userData.burstTriggered && child.material) {
                child.material.opacity = child.userData.baseOpacity ?? 1;
            }
            if (child.userData.type.startsWith('bio_spores')) {
                const phase = child.userData.phase;
                const drift = Math.sin(time * 0.75 + phase) * 0.16;
                const pulse = 0.92 + Math.sin(time * 1.15 + phase * 1.3) * 0.16;
                const shimmer = 0.72 + Math.sin(time * 1.6 + phase) * 0.28;
                child.position.y = baseY + drift;
                child.scale.set(
                    child.userData.baseScaleX * pulse,
                    child.userData.baseScaleY * pulse,
                    1
                );
                child.material.opacity = child.userData.baseOpacity * shimmer;
            } else if (child.userData.type.startsWith('bunker_junk')) {
                child.position.y = baseY;
                child.scale.set(
                    child.userData.baseScaleX,
                    child.userData.baseScaleY,
                    1
                );
                child.material.opacity = child.userData.baseOpacity;
            } else if (child.userData.type === 'lore_terminal') {
                const phase = child.userData.phase ?? 0;
                child.position.y = baseY + Math.sin(time * 1.4 + phase) * 0.05;
                child.material.opacity = 0.7 + Math.sin(time * 2.1 + phase) * 0.3;
            } else if (child.userData.type === 'prop_hive_resin_sac') {
                const phase = child.userData.phase ?? 0;
                const pulse = 0.92 + Math.sin(time * 1.9 + phase) * 0.08;
                child.position.y = baseY + Math.sin(time * 1.4 + phase) * 0.05;
                child.scale.set(
                    child.userData.baseScaleX * pulse,
                    child.userData.baseScaleY * pulse,
                    1
                );
                child.material.opacity = child.userData.baseOpacity * (0.88 + Math.sin(time * 2.4 + phase) * 0.12);
            } else if (this.isCrawler(child.userData.type)) {
                child.position.y = baseY + Math.sin(time * 6 + child.userData.phase) * 0.03;
                child.material.opacity = child.userData.baseOpacity;
                if (!child.userData.burstTriggered) {
                    this.updateCrawlerBehavior(child, delta);
                }
            } else if (this.isSentinel(child.userData.type)) {
                child.position.y = baseY;
                if (!child.userData.burstTriggered) {
                    this.updateSentinelBehavior(child, delta);
                }
            } else if (this.isEnemyType(child.userData.type)) {
                child.position.y = baseY + Math.sin(time * 4 + child.userData.phase) * 0.04;
                child.material.opacity = child.userData.baseOpacity;
                this.updateSnailBehavior(child, delta, activeShip);

                // Distance-based trail spawning
                if (!child.userData.burstTriggered) {
                    const lastX = child.userData.lastTrailX ?? child.position.x;
                    const lastZ = child.userData.lastTrailZ ?? child.position.z;
                    const distMoved = Math.hypot(child.position.x - lastX, child.position.z - lastZ);
                    if (distMoved >= 0.42 || child.userData.lastTrailX === undefined) {
                        child.userData.lastTrailX = child.position.x;
                        child.userData.lastTrailZ = child.position.z;
                        this.spawnVisualSnailTrail(child.position.x, child.position.z, child.userData.type, child.userData.isBoss);
                    }
                }

                // Sporesnail leaves slime puddles
                if (child.userData.type === 'sporesnail' || child.userData.type === 'boss_sporesnail') {
                    child.userData.sporeEmitTimer = (child.userData.sporeEmitTimer ?? 0) + delta;
                    const interval = child.userData.isBoss ? 1.2 : 2.4;
                    if (child.userData.sporeEmitTimer >= interval && !child.userData.burstTriggered) {
                        child.userData.sporeEmitTimer = 0;
                        this.spawnToxicSporePuddle(child.position.x, child.position.z, child.userData.isBoss);
                    }
                }
            }

            if (child.userData.burstTriggered) {
                child.userData.burstTimer += delta;
                if (child.userData.type.startsWith('bunker_junk')) {
                    const fadeDuration = 0.28;
                    const fadeT = Math.min(child.userData.burstTimer / fadeDuration, 1);
                    const burstScale = 1 + Math.sin(Math.min(child.userData.burstTimer * 8, Math.PI)) * 0.18;
                    child.scale.set(
                        child.userData.baseScaleX * burstScale,
                        child.userData.baseScaleY * burstScale,
                        1
                    );
                    child.material.opacity = child.userData.baseOpacity * (1 - fadeT);

                    if (fadeT >= 1) {
                        child.parent?.remove(child);
                        child.material?.dispose?.();
                        child.geometry?.dispose?.();
                        this.scatterSprites = this.scatterSprites.filter((sprite) => sprite !== child);
                        continue;
                    }
                } else if (this.isEnemyType(child.userData.type)) {
                    const fadeDuration = 0.22;
                    const fadeT = Math.min(child.userData.burstTimer / fadeDuration, 1);
                    const burstScale = 1 + Math.sin(Math.min(child.userData.burstTimer * 11, Math.PI)) * 0.24;
                    const facingSign = child.scale.x < 0 ? -1 : 1;
                    child.scale.set(
                        child.userData.baseScaleX * facingSign * burstScale,
                        child.userData.baseScaleY * burstScale,
                        1
                    );
                    child.material.opacity = child.userData.baseOpacity * (1 - fadeT);

                    if (fadeT >= 1) {
                        child.parent?.remove(child);
                        child.material?.dispose?.();
                        child.geometry?.dispose?.();
                        this.scatterSprites = this.scatterSprites.filter((sprite) => sprite !== child);
                        continue;
                    }
                }
            }

            const fogVisibility = this.getFogOfWarVisibility(child.position.x, child.position.z);
            this.applyFogOfWarOpacity(child, fogVisibility, { captureCurrent: true });

            if (
                child.userData.type.startsWith('bunker_junk') &&
                !child.userData.burstTriggered &&
                Math.hypot(this.player.position.x - child.position.x, this.player.position.z - child.position.z)
                    <= Math.max(
                        BUNKER_JUNK_TRIGGER_RADIUS,
                        Math.max(child.userData.baseScaleX ?? 1, child.userData.baseScaleY ?? 1) * 0.62
                            + this.playerRadius * 0.95
                    )
            ) {
                this.triggerBunkerJunkBurst(child);
            }
        }

        // Pulse the shared hazard-siren dome material (one update for every siren,
        // instead of dozens of per-wall dynamic PointLights).
        if (this.sirenDomeMaterial) {
            const pulse = 0.5 + 0.5 * Math.sin(time * 6.0);
            const r = 0.55 + 0.45 * pulse;
            this.sirenDomeMaterial.color.setRGB(r, 0.12 * pulse, 0.12 * pulse);
        }
    }

    triggerBunkerJunkBurst(sprite) {
        sprite.userData.burstTriggered = true;
        sprite.userData.burstTimer = 0;
        if (sprite.userData.scatterKey) {
            this.depletedGearPileKeys.add(sprite.userData.scatterKey);
        }

        const seed = this.hashTile(Math.round(sprite.position.x * 100), Math.round(sprite.position.z * 100));
        const random = this.createSeededRandom(seed);
        const chunkGroup = sprite.parent;

        if (!chunkGroup) {
            return;
        }

        this.spawnGearPoofEffect(sprite.position.x, sprite.position.z, sprite.userData.type);
        const junkColors = this.getJunkVariantEffectColors(sprite.userData.type);
        this.spawnPhysicalBurst(sprite.position.x, sprite.position.z, {
            color: junkColors.glowColor,
            count: 7,
            upward: 0.2,
            spread: 1.6
        });
        window.AudioManager?.playProceduralJunkBurst(sprite.userData.type);

        for (const target of this.createJunkBurstTargets(sprite.position.x, sprite.position.z, random)) {
            let placement = null;

            for (let attempt = 0; attempt < 10; attempt++) {
                const targetX = target.x + (random() - 0.5) * 0.14;
                const targetZ = target.z + (random() - 0.5) * 0.14;

                if (this.getTileType(Math.round(targetX), Math.round(targetZ)) === '#') {
                    continue;
                }

                placement = this.createJunkBurstPickupPlacement(
                    sprite.position.x,
                    sprite.position.z,
                    targetX,
                    targetZ,
                    random,
                    sprite.userData.type
                );
                break;
            }

            if (!placement) {
                // Fallback to guaranteed nearby placement so every burst spawns visible loot.
                const fallbackAngle = random() * Math.PI * 2;
                let fallbackRadius = 0.9 + (random() - 0.5) * 0.22;
                let fallbackX = sprite.position.x + Math.cos(fallbackAngle) * fallbackRadius;
                let fallbackZ = sprite.position.z + Math.sin(fallbackAngle) * fallbackRadius;

                if (this.getTileType(Math.round(fallbackX), Math.round(fallbackZ)) === '#') {
                    fallbackRadius = 0.48;
                    fallbackX = sprite.position.x + Math.cos(fallbackAngle) * fallbackRadius;
                    fallbackZ = sprite.position.z + Math.sin(fallbackAngle) * fallbackRadius;
                }

                if (this.getTileType(Math.round(fallbackX), Math.round(fallbackZ)) === '#') {
                    fallbackX = sprite.position.x;
                    fallbackZ = sprite.position.z;
                }

                placement = this.createJunkBurstPickupPlacement(
                    sprite.position.x,
                    sprite.position.z,
                    fallbackX,
                    fallbackZ,
                    random,
                    sprite.userData.type
                );
            }

            const pickup = this.createPickupInstance(placement);
            chunkGroup.add(pickup);
            this.pickupMeshes.push(pickup);
        }
    }

    spawnGearPoofEffect(x, z, junkType = 'bunker_junk') {
        const colors = this.getJunkVariantEffectColors(junkType);
        const smokeColor = new THREE.Color(colors.smokeColor).lerp(new THREE.Color(0x6b7177), 0.45);
        const glowColor = new THREE.Color(colors.glowColor).lerp(new THREE.Color(0x7a7a7a), 0.62);
        const sporeColor = new THREE.Color(colors.glowColor).lerp(new THREE.Color(0xcce7b6), 0.38);
        const effect = new THREE.Group();
        const smokeMaterial = new THREE.MeshBasicMaterial({
            color: smokeColor,
            transparent: true,
            opacity: 0.34,
            depthWrite: false,
            depthTest: false
        });
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: glowColor,
            transparent: true,
            opacity: 0.44,
            side: THREE.DoubleSide,
            depthWrite: false,
            depthTest: false
        });
        const sporeMaterial = new THREE.MeshBasicMaterial({
            color: sporeColor,
            transparent: true,
            opacity: 0.82,
            depthWrite: false,
            depthTest: false
        });

        for (let i = 0; i < 6; i++) {
            const puff = new THREE.Mesh(new THREE.CircleGeometry(0.08 + i * 0.016, 14), smokeMaterial.clone());
            puff.rotation.x = -Math.PI / 2;
            puff.position.set((Math.random() - 0.5) * 0.14, 0.025 + i * 0.008, (Math.random() - 0.5) * 0.14);
            puff.renderOrder = 26;
            puff.userData = {
                isSmoke: true,
                vx: (Math.random() - 0.5) * 0.42,
                vz: (Math.random() - 0.5) * 0.42,
                vy: 0.2 + Math.random() * 0.12,
                growth: 0.45 + Math.random() * 0.22
            };
            effect.add(puff);
        }

        for (let i = 0; i < 9; i++) {
            const mote = new THREE.Mesh(new THREE.CircleGeometry(0.02 + Math.random() * 0.025, 12), sporeMaterial.clone());
            mote.rotation.x = -Math.PI / 2;
            mote.position.set((Math.random() - 0.5) * 0.12, 0.04 + Math.random() * 0.08, (Math.random() - 0.5) * 0.12);
            mote.renderOrder = 27;
            mote.userData = {
                isSpore: true,
                vx: (Math.random() - 0.5) * 0.32,
                vz: (Math.random() - 0.5) * 0.32,
                vy: 0.28 + Math.random() * 0.24,
                growth: 0.2 + Math.random() * 0.2
            };
            effect.add(mote);
        }

        const glow = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.3, 24), glowMaterial);
        glow.rotation.x = -Math.PI / 2;
        glow.position.y = 0.045;
        glow.renderOrder = 28;
        glow.userData = { isGlow: true };
        effect.add(glow);

        this.spawnTextureBurstEffect(x, z, {
            textureKey: junkType.includes('bio') ? 'fx_steam_puff' : 'fx_spark_burst',
            color: colors.glowColor,
            count: junkType.includes('bio') ? 3 : 2,
            baseScale: junkType.includes('bio') ? 0.62 : 0.5,
            duration: junkType.includes('bio') ? 0.6 : 0.42,
            speed: junkType.includes('bio') ? 0.24 : 0.18,
            rise: junkType.includes('bio') ? 0.22 : 0.28,
            opacity: junkType.includes('bio') ? 0.78 : 0.86,
            renderOrder: 29
        });

        effect.position.set(x, 0.02, z);
        effect.userData = { age: 0, duration: 0.56 };
        this.scene.add(effect);
        this.transientEffects.push(effect);
    }

    updateTransientEffects(delta) {
        const removals = [];

        for (const effect of this.transientEffects) {
            if (typeof effect.update === 'function') {
                // plain-object effects (footstep dots, ring waves, spore puddles)
                if (effect.update.length >= 2) {
                    effect.age += delta;
                    effect.update(delta, effect.age);
                } else {
                    effect.update(delta);
                }
                if (effect.mesh) {
                    this.applyFogOfWarOpacity(
                        effect.mesh,
                        this.getFogOfWarVisibility(effect.mesh.position.x, effect.mesh.position.z),
                        { captureCurrent: true }
                    );
                }
                const maxAge = effect.duration ?? effect.maxAge ?? Infinity;
                if (effect.age >= maxAge) removals.push(effect);
                continue;
            }

            effect.userData.age += delta;
            const t = Math.min(effect.userData.age / effect.userData.duration, 1);

            for (const child of effect.children) {
                if (child.userData?.isGlow) {
                    child.material.opacity = (1 - t) * 0.9;
                    child.scale.setScalar(1 + t * 1.45);
                    continue;
                }

                child.position.x += child.userData.vx * delta;
                child.position.z += child.userData.vz * delta;
                child.position.y += child.userData.vy * delta;
                child.scale.setScalar(1 + t * child.userData.growth);
                if (child.userData?.isSpore) {
                    child.material.opacity = (1 - t) * 0.9;
                } else {
                    child.material.opacity = (1 - t) * 0.45;
                }
            }

            this.applyFogOfWarOpacity(
                effect,
                this.getFogOfWarVisibility(effect.position.x, effect.position.z),
                { captureCurrent: true }
            );

            if (t >= 1) {
                removals.push(effect);
            }
        }

        for (const effect of removals) {
            if (typeof effect.update === 'function') {
                if (typeof effect.dispose === 'function') {
                    effect.dispose();
                } else {
                    effect.mesh?.material?.dispose?.();
                    effect.mesh?.geometry?.dispose?.();
                }
                this.scene.remove(effect.mesh);
            } else {
                effect.traverse((child) => {
                    child.material?.dispose?.();
                    child.geometry?.dispose?.();
                });
                this.scene.remove(effect);
            }
        }

        this.transientEffects = this.transientEffects.filter((effect) => !removals.includes(effect));
    }

    canOccupyPosition(x, z) {
        if (this.crashedShips) {
            for (const ship of this.crashedShips) {
                if (!ship.isVisible) continue;
                // 1. Ship collision
                const dxShip = x - ship.tileX;
                const dzShip = z - ship.tileZ;
                const distShip = Math.hypot(dxShip, dzShip);
                if (distShip < (ship.width + this.playerRadius * 0.7)) {
                    return false;
                }

                // 2. Console collision
                const consoleX = ship.tileX + ship.consoleOffset.x;
                const consoleZ = ship.tileZ + ship.consoleOffset.z;
                const dxConsole = x - consoleX;
                const dzConsole = z - consoleZ;
                const distConsole = Math.hypot(dxConsole, dzConsole);
                if (distConsole < (0.42 + this.playerRadius * 0.7)) {
                    return false;
                }

                const modulePositions = [
                    {
                        enabled: Boolean(ship.o2ModuleSprite?.visible),
                        x: Number.isFinite(ship.o2ModuleX)
                            ? ship.o2ModuleX
                            : ship.tileX + (ship.o2ModuleOffset?.x ?? O2_MODULE_OFFSET.x),
                        z: Number.isFinite(ship.o2ModuleZ)
                            ? ship.o2ModuleZ
                            : ship.tileZ + (ship.o2ModuleOffset?.z ?? O2_MODULE_OFFSET.z)
                    },
                    {
                        enabled: Boolean(ship.hullModuleSprite?.visible),
                        x: Number.isFinite(ship.hullModuleX)
                            ? ship.hullModuleX
                            : ship.tileX + (ship.hullModuleOffset?.x ?? MODULE_OFFSETS.hullMatrix.x),
                        z: Number.isFinite(ship.hullModuleZ)
                            ? ship.hullModuleZ
                            : ship.tileZ + (ship.hullModuleOffset?.z ?? MODULE_OFFSETS.hullMatrix.z)
                    },
                    {
                        enabled: Boolean(ship.radarModuleSprite?.visible),
                        x: Number.isFinite(ship.radarModuleX)
                            ? ship.radarModuleX
                            : ship.tileX + (ship.radarModuleOffset?.x ?? MODULE_OFFSETS.radarDish.x),
                        z: Number.isFinite(ship.radarModuleZ)
                            ? ship.radarModuleZ
                            : ship.tileZ + (ship.radarModuleOffset?.z ?? MODULE_OFFSETS.radarDish.z)
                    },
                    {
                        enabled: Boolean(ship.reactorModuleSprite?.visible),
                        x: Number.isFinite(ship.reactorModuleX)
                            ? ship.reactorModuleX
                            : ship.tileX + (ship.reactorModuleOffset?.x ?? MODULE_OFFSETS.reactorCompressor.x),
                        z: Number.isFinite(ship.reactorModuleZ)
                            ? ship.reactorModuleZ
                            : ship.tileZ + (ship.reactorModuleOffset?.z ?? MODULE_OFFSETS.reactorCompressor.z)
                    }
                ];

                for (const modulePos of modulePositions) {
                    if (!modulePos.enabled) continue;
                    const distModule = Math.hypot(x - modulePos.x, z - modulePos.z);
                    if (distModule < (O2_MODULE_COLLISION_RADIUS + this.playerRadius * 0.7)) {
                        return false;
                    }
                }
            }
        }

        const tileX = Math.round(x);
        const tileY = Math.round(z);

        for (let offsetY = -2; offsetY <= 2; offsetY++) {
            for (let offsetX = -2; offsetX <= 2; offsetX++) {
                const checkX = tileX + offsetX;
                const checkY = tileY + offsetY;

                if (this.getTileType(checkX, checkY) !== '#') continue;
                if (this.isHoleTile(checkX, checkY)) continue;
                if (this.overlapsWall(x, z, checkX, checkY)) return false;
            }
        }

        return true;
    }

    overlapsWall(x, z, wallX, wallZ) {
        const minX = wallX - 0.5 - this.playerRadius;
        const maxX = wallX + 0.5 + this.playerRadius;
        const minZ = wallZ - 0.5 - this.playerRadius;
        const maxZ = wallZ + 0.5 + this.playerRadius;
        return x >= minX && x <= maxX && z >= minZ && z <= maxZ;
    }

    updateHiddenPlayerMarker(now) {
        const origin = this.camera.position.clone();
        const target = this.player.position.clone();
        const direction = target.clone().sub(origin);
        const distance = direction.length();

        if (distance <= 0.001 || this.wallMeshes.length === 0) {
            this.playerMarker.visible = false;
            return;
        }

        direction.normalize();
        this.raycaster.set(origin, direction);
        this.raycaster.far = distance - this.playerRadius * 0.25;
        const hits = this.raycaster.intersectObjects(this.wallMeshes, false);
        const hidden = hits.length > 0;

        this.playerMarker.visible = hidden;
        if (!hidden) return;

        const pulse = 0.7 + Math.sin(now * 0.012) * 0.2;
        this.playerMarker.children[0].material.opacity = pulse;
        this.playerMarker.children[1].material.opacity = 0.7 + Math.sin(now * 0.012 + 0.7) * 0.2;
        this.playerMarker.lookAt(this.camera.position.x, this.playerMarker.position.y, this.camera.position.z);
    }

    getTileType(worldX, worldY) {
        const chunkX = Math.floor(worldX / this.chunkSize);
        const chunkY = Math.floor(worldY / this.chunkSize);
        const localX = worldX - chunkX * this.chunkSize;
        const localY = worldY - chunkY * this.chunkSize;
        return this.getOrCreateChunk(chunkX, chunkY)[localY][localX];
    }

    isHoleTile(worldX, worldY) {
        if (this.getTileType(worldX, worldY) !== '#') return false;
        const wallTypeRng = this.createSeededRandom(this.hashTile(worldX, worldY) + 999);
        return wallTypeRng() < 0.06;
    }

    isPlayerOverAnyHole(px, pz) {
        const cx = Math.round(px);
        const cz = Math.round(pz);
        const radiusToCheck = 2;
        for (let dx = -radiusToCheck; dx <= radiusToCheck; dx++) {
            for (let dz = -radiusToCheck; dz <= radiusToCheck; dz++) {
                const hx = cx + dx;
                const hz = cz + dz;
                if (this.isHoleTile(hx, hz)) {
                    const wallTypeRng = this.createSeededRandom(this.hashTile(hx, hz) + 999);
                    const roll = wallTypeRng();
                    const sizeFactor = roll / 0.06;
                    const scale = 1.5 + sizeFactor * 2.5;
                    const fallRadius = scale * 0.42;
                    const dist = Math.hypot(px - hx, pz - hz);
                    if (dist < fallRadius) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    getRoomTypeGrid(chunkX, chunkY) {
        const key = `${chunkX},${chunkY}`;
        if (!this.chunkCache.has(key)) {
            this.getOrCreateChunk(chunkX, chunkY);
        }
        return this._chunkRoomTypeCache?.get(key) ?? null;
    }

    getChunkTemplate(chunkX, chunkY) {
        const key = `${chunkX},${chunkY}`;
        if (this._chunkTemplateCache.has(key)) return this._chunkTemplateCache.get(key);

        const depthTier = this.getDepthTier(chunkX, chunkY);
        if (depthTier < 1) {
            this._chunkTemplateCache.set(key, null);
            return null;
        }

        // Check if chunk has at least one chamber cell
        const roomTypes = this.getRoomTypeGrid(chunkX, chunkY);
        if (!roomTypes) { this._chunkTemplateCache.set(key, null); return null; }
        let hasChamber = false;
        for (let y = 0; y < this.chunkSize && !hasChamber; y++) {
            for (let x = 0; x < this.chunkSize && !hasChamber; x++) {
                if (roomTypes[y][x] === ROOM_TYPES.CHAMBER) hasChamber = true;
            }
        }
        if (!hasChamber) { this._chunkTemplateCache.set(key, null); return null; }

        // 7% chance per eligible chunk — seeded
        const rng = this.createSeededRandom(this.hashTile(chunkX * 997 + 13, chunkY * 1009 + 7));
        if (rng() > 0.07) { this._chunkTemplateCache.set(key, null); return null; }

        const biomeKey = this.getBiomeKeyForWorldPosition(
            chunkX * this.chunkSize + this.chunkSize * 0.5,
            chunkY * this.chunkSize + this.chunkSize * 0.5
        );

        // Filter candidate templates by biome requirement and depth
        const candidates = Object.entries(ROOM_TEMPLATE_CONFIGS).filter(([, cfg]) => {
            if (cfg.biomeRequired && cfg.biomeRequired !== biomeKey) return false;
            if (cfg === ROOM_TEMPLATE_CONFIGS.the_nest && depthTier < 2) return false;
            if (cfg.biomeRequired === 'cryo' && biomeKey !== 'cryo') return false;
            if (cfg.biomeRequired === 'bio' && biomeKey !== 'bio') return false;
            return true;
        });
        if (candidates.length === 0) { this._chunkTemplateCache.set(key, null); return null; }

        const pick = candidates[Math.floor(rng() * candidates.length)];
        this._chunkTemplateCache.set(key, pick[0]);
        return pick[0];
    }

    getOrCreateChunk(chunkX, chunkY) {
        const key = `${chunkX},${chunkY}`;
        if (!this.chunkCache.has(key)) {
            // Evict oldest cache entries if over limit (prevents memory growth in long sessions)
            const MAX_CHUNK_CACHE = 50;
            if (this.chunkCache.size >= MAX_CHUNK_CACHE) {
                const toEvict = Math.ceil(this.chunkCache.size - MAX_CHUNK_CACHE + 5);
                let evicted = 0;
                for (const oldKey of this.chunkCache.keys()) {
                    if (this.chunkMeshes.has(oldKey)) continue; // don't evict visible chunks
                    this.chunkCache.delete(oldKey);
                    this._chunkRoomTypeCache?.delete(oldKey);
                    this._chunkTemplateCache?.delete(oldKey);
                    evicted++;
                    if (evicted >= toEvict) break;
                }
            }
            const grid = this.buildChunk(chunkX, chunkY);
            this.chunkCache.set(key, grid);
            if (!this._chunkRoomTypeCache) this._chunkRoomTypeCache = new Map();
            this._chunkRoomTypeCache.set(key, classifyChunkCells(grid, this.chunkSize));
        }
        return this.chunkCache.get(key);
    }

    buildChunk(chunkX, chunkY) {
        if (this.performanceProfile === 'menu') {
            return Array(this.chunkSize).fill(null).map(() => Array(this.chunkSize).fill('.'));
        }
        const grid = Array(this.chunkSize).fill(null).map(() => Array(this.chunkSize).fill('#'));
        const random = this.createSeededRandom(this.hashTile(chunkX + 1000, chunkY - 1000) + 101);
        const centerCell = Math.floor(this.chunkCellCount / 2);
        const stack = [[centerCell, centerCell]];
        const visited = new Set([`${centerCell},${centerCell}`]);

        this.carveCell(grid, centerCell, centerCell);

        while (stack.length > 0) {
            const [cellX, cellY] = stack[stack.length - 1];
            const neighbors = this.shuffleDirections([
                { dx: 1, dy: 0 },
                { dx: -1, dy: 0 },
                { dx: 0, dy: 1 },
                { dx: 0, dy: -1 }
            ], random);
            let carved = false;

            for (const { dx, dy } of neighbors) {
                const nextX = cellX + dx;
                const nextY = cellY + dy;
                const key = `${nextX},${nextY}`;

                if (
                    nextX < 0 ||
                    nextX >= this.chunkCellCount ||
                    nextY < 0 ||
                    nextY >= this.chunkCellCount ||
                    visited.has(key)
                ) {
                    continue;
                }

                this.carvePassage(grid, cellX, cellY, nextX, nextY);
                visited.add(key);
                stack.push([nextX, nextY]);
                carved = true;
                break;
            }

            if (!carved) {
                stack.pop();
            }
        }

        // Landforms reshape the carved maze before portals are punched, so
        // every chunk still connects to its neighbors at the same offsets.
        const landform = this.getChunkLandform(chunkX, chunkY);
        if (landform !== LANDFORMS.MAZE) {
            applyLandform(grid, landform, random);
            const routeBlocks = this.getRunCardEffects().routeBlocks ?? {};
            if (landform === LANDFORMS.CANYON && routeBlocks.landform === LANDFORMS.CANYON) {
                applyCanyonCollapse(grid, random, routeBlocks.sealedGapCount ?? 0);
            }
        }
        this.ensureChunkPortals(grid, chunkX, chunkY);
        if (landform === LANDFORMS.MAZE) {
            this.runMarkovPass(grid, random);
        } else {
            // A ridge or crater rim can sit flush behind a portal opening —
            // tunnel inward so entrances never dead-end.
            connectPortalsInward(grid);
        }
        // Widening erodes the deliberate structures (field outcrops, canyon
        // ridges, and especially the crater rim — the open bowl beside the
        // ring lets widen chew straight through it), so it only runs where
        // the corridors come from the maze carve. Maze chunks get a second
        // pass so the lanes breathe a little more for the player radius.
        if (landform === LANDFORMS.MAZE || landform === LANDFORMS.RUINS) {
            const widenPasses = landform === LANDFORMS.MAZE ? 2 : 1;
            for (let pass = 0; pass < widenPasses; pass++) {
                this.widenChunkCorridors(grid);
            }
        }

        // Trim interior walls that already border floor so corridor mouths
        // open up without spraying isolated holes into sealed rooms.
        for (let y = 2; y < this.chunkSize - 2; y++) {
            for (let x = 2; x < this.chunkSize - 2; x++) {
                if (grid[y][x] !== '#') continue;
                const openNeighbors =
                    (grid[y - 1][x] === '.') +
                    (grid[y + 1][x] === '.') +
                    (grid[y][x - 1] === '.') +
                    (grid[y][x + 1] === '.');
                if (openNeighbors < 2) continue;

                const carveChance = 0.18 + openNeighbors * 0.08;
                if (random() < carveChance) grid[y][x] = '.';
            }
        }

        this.clearSpawnArea(grid, chunkX, chunkY);
        return grid;
    }

    // Seeded landform per chunk. The two-chunk ring around the crash site
    // stays classic maze so the tutorial reads the way it always has.
    getChunkLandform(chunkX, chunkY) {
        if (this.performanceProfile === 'menu') return LANDFORMS.MAZE;
        if (Math.hypot(chunkX, chunkY) < 2) return LANDFORMS.MAZE;
        if (!this._chunkLandformCache) this._chunkLandformCache = new Map();
        const key = `${chunkX},${chunkY}`;
        if (!this._chunkLandformCache.has(key)) {
            const biome = this.getBiomeKeyForWorldPosition(
                chunkX * this.chunkSize + this.chunkSize * 0.5,
                chunkY * this.chunkSize + this.chunkSize * 0.5
            );
            const random = this.createSeededRandom(this.hashTile(chunkX * 977 + 61, chunkY * 613 + 37));
            this._chunkLandformCache.set(key, pickLandform(random, biome));
        }
        return this._chunkLandformCache.get(key);
    }

    carveCell(grid, cellX, cellY) {
        grid[cellY * 2 + 1][cellX * 2 + 1] = '.';
    }

    carvePassage(grid, fromCellX, fromCellY, toCellX, toCellY) {
        const fromX = fromCellX * 2 + 1;
        const fromY = fromCellY * 2 + 1;
        const toX = toCellX * 2 + 1;
        const toY = toCellY * 2 + 1;

        grid[fromY][fromX] = '.';
        grid[toY][toX] = '.';
        grid[(fromY + toY) / 2][(fromX + toX) / 2] = '.';
    }

    ensureChunkPortals(grid, chunkX, chunkY) {
        const openings = {
            north: this.getEdgeOpening('horizontal', chunkX, chunkY),
            south: this.getEdgeOpening('horizontal', chunkX, chunkY + 1),
            west: this.getEdgeOpening('vertical', chunkX, chunkY),
            east: this.getEdgeOpening('vertical', chunkX + 1, chunkY)
        };

        if (!openings.north.open && !openings.south.open && !openings.west.open && !openings.east.open) {
            openings.east.open = true;
        }

        if (openings.north.open) {
            const localX = openings.north.offset * 2 + 1;
            grid[0][localX] = '.';
            grid[1][localX] = '.';
        }

        if (openings.south.open) {
            const localX = openings.south.offset * 2 + 1;
            grid[this.chunkSize - 1][localX] = '.';
            grid[this.chunkSize - 2][localX] = '.';
        }

        if (openings.west.open) {
            const localY = openings.west.offset * 2 + 1;
            grid[localY][0] = '.';
            grid[localY][1] = '.';
        }

        if (openings.east.open) {
            const localY = openings.east.offset * 2 + 1;
            grid[localY][this.chunkSize - 1] = '.';
            grid[localY][this.chunkSize - 2] = '.';
        }
    }

    getEdgeOpening(axis, edgeX, edgeY) {
        const seed = this.hashTile(edgeX * 97 + (axis === 'vertical' ? 11 : 23), edgeY * 193 + (axis === 'vertical' ? 41 : 59));
        return {
            open: seed % 100 < 68,
            offset: seed % this.chunkCellCount
        };
    }

    runMarkovPass(grid, random) {
        const generator = new MarkovGenerator(this.chunkSize, this.chunkSize, random);
        generator.grid = grid.map((row) => [...row]);
        generator.addRule(['.#'], ['..'], 0.15);
        generator.addRule(['#.'], ['..'], 0.15);
        generator.addRule(['.', '#'], ['.', '.'], 0.15);
        generator.addRule(['#', '.'], ['.', '.'], 0.15);
        generator.run(24);

        for (let y = 0; y < this.chunkSize; y++) {
            for (let x = 0; x < this.chunkSize; x++) {
                grid[y][x] = generator.grid[y][x];
            }
        }
    }

    widenChunkCorridors(grid) {
        const widened = grid.map((row) => [...row]);

        for (let y = 1; y < this.chunkSize - 1; y++) {
            for (let x = 1; x < this.chunkSize - 1; x++) {
                if (grid[y][x] !== '.') continue;

                const leftOpen = grid[y][x - 1] === '.';
                const rightOpen = grid[y][x + 1] === '.';
                const upOpen = grid[y - 1][x] === '.';
                const downOpen = grid[y + 1][x] === '.';

                if (leftOpen && rightOpen) {
                    widened[y - 1][x] = '.';
                    widened[y + 1][x] = '.';
                }

                if (upOpen && downOpen) {
                    widened[y][x - 1] = '.';
                    widened[y][x + 1] = '.';
                }

                if ((leftOpen || rightOpen) && (upOpen || downOpen)) {
                    widened[y - 1][x] = '.';
                    widened[y + 1][x] = '.';
                    widened[y][x - 1] = '.';
                    widened[y][x + 1] = '.';
                }
            }
        }

        for (let y = 0; y < this.chunkSize; y++) {
            for (let x = 0; x < this.chunkSize; x++) {
                grid[y][x] = widened[y][x];
            }
        }
    }

    clearSpawnArea(grid, chunkX, chunkY) {
        const spawn = this.getSpawnTile();

        for (let localY = 0; localY < this.chunkSize; localY++) {
            for (let localX = 0; localX < this.chunkSize; localX++) {
                const worldX = chunkX * this.chunkSize + localX;
                const worldY = chunkY * this.chunkSize + localY;
                const dx = worldX - spawn.x;
                const dy = worldY - spawn.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance <= 6.0) {
                    grid[localY][localX] = '.';
                }
            }
        }
    }

    getSpawnTile() {
        const centerCell = Math.floor(this.chunkCellCount / 2);
        if (this.performanceProfile === 'menu') {
            // Spawn in chunk (100, 100) to keep the showcase completely blank
            return {
                x: 100 * this.chunkSize + centerCell * 2 + 1,
                y: 100 * this.chunkSize + centerCell * 2 + 1
            };
        }
        return {
            x: centerCell * 2 + 1,
            y: centerCell * 2 + 1
        };
    }

    shuffleDirections(items, random) {
        const copy = [...items];
        for (let i = copy.length - 1; i > 0; i--) {
            const swapIndex = Math.floor(random() * (i + 1));
            [copy[i], copy[swapIndex]] = [copy[swapIndex], copy[i]];
        }
        return copy;
    }

    createSeededRandom(seed) {
        let state = (seed >>> 0) || 1;
        return () => {
            state ^= state << 13;
            state ^= state >>> 17;
            state ^= state << 5;
            return (state >>> 0) / 4294967296;
        };
    }

    hashTile(x, y) {
        const seed = Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ (this.globalSeedOffset | 0);
        return Math.abs(seed);
    }

    destroy() {
        this.renderer.setAnimationLoop(null);
        this.resetWeaponState({ emit: false });
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        this.consolePromptEl?.removeEventListener('pointerup', this.handlePromptTap);
        this.o2PromptEl?.removeEventListener('pointerup', this.handlePromptTap);
        this.foundryPromptEl?.removeEventListener('pointerup', this.handlePromptTap);
        this.blackBoxPromptEl?.removeEventListener('pointerup', this.handlePromptTap);
        this.renderer.domElement.removeEventListener('pointerdown', this.handleCanvasPointerDown);
        this.renderer.domElement.removeEventListener('pointermove', this.handleCanvasPointerMove);
        this.renderer.domElement.removeEventListener('pointerup', this.handleCanvasTap);
        this.darknessOverlay?.remove?.();
        Object.values(this.playerMaterials ?? {}).forEach((material) => material.dispose());
        Object.values(this.playerTextures ?? {}).forEach((texture) => texture.dispose());
        Object.values(this.playerTorsoMaterials ?? {}).forEach((material) => material.dispose());
        Object.values(this.playerTorsoTextures ?? {}).forEach((texture) => texture.dispose());
        Object.values(this.biomeTerrainTextures ?? {}).forEach((textureSet) => {
            Object.values(textureSet ?? {}).forEach((texture) => texture?.dispose?.());
        });
        this.floorMaterial?.dispose?.();
        this.wallMaterial?.dispose?.();
        this.wallGeometry?.dispose();
        this.floorGeometry?.dispose();
        this.chunkFloorGeometry?.dispose();
        this.pillarGeometry?.dispose();
        this.bracketGeometry?.dispose();
        this.ventGeometry?.dispose();
        this.pipeGeometry?.dispose();
        this.ventMaterial?.dispose();
        this.pipeMaterial?.dispose();
        this.sirenBaseGeometry?.dispose();
        this.sirenDomeGeometry?.dispose();
        this.sirenBaseMaterial?.dispose();
        this.sirenDomeMaterial?.dispose();
        this.rubbleGeometry?.dispose();
        this.menuShowroomFloor?.geometry?.dispose?.();
        this.menuShowroomFloor?.material?.dispose?.();
        this.menuGridTexture?.dispose?.();
        Object.values(this.scatterMaterials ?? {}).forEach((material) => material.dispose?.());
        Object.values(this.scatterPlaneMaterials ?? {}).forEach((material) => material.dispose?.());
        Object.values(this.scatterTextures ?? {}).forEach((texture) => texture.dispose?.());
        this.playerShadow?.material?.dispose?.();
        this.playerShadow?.geometry?.dispose?.();
        this.playerForwardCone?.geometry?.dispose?.();
        this.playerForwardCone?.material?.dispose?.();
        this.playerConeTexture?.dispose?.();
        this.playerLightPool?.geometry?.dispose?.();
        this.playerLightPool?.material?.dispose?.();
        this.playerLightPoolTexture?.dispose?.();
        this.playerEmitterGlow?.material?.dispose?.();
        this.playerEmitterGlowTexture?.dispose?.();
        if (this.playerForwardCone) {
            this.scene.remove(this.playerForwardCone);
        }
        if (this.playerLightPool) {
            this.scene.remove(this.playerLightPool);
        }
        if (this.playerEmitterGlow) {
            this.scene.remove(this.playerEmitterGlow);
        }
        this.clearBlackBoxMarker();
        if (this.playerForwardSpotLight) {
            this.scene.remove(this.playerForwardSpotLight);
        }
        if (this.playerForwardLightTarget) {
            this.scene.remove(this.playerForwardLightTarget);
        }
        Object.values(this.pickupAssets ?? {}).forEach((asset) => {
            if (asset?.material?.dispose) asset.material.dispose();
            if (asset?.accent?.dispose) asset.accent.dispose();
        });
        this.pickupAssets?.shadowMaterial?.dispose?.();
        for (const effect of this.transientEffects) {
            effect.traverse((child) => {
                child.material?.dispose?.();
                child.geometry?.dispose?.();
            });
            this.scene.remove(effect);
        }
        if (this.o2BubbleObjects) {
            this.o2BubbleObjects.ring?.material?.dispose?.();
            this.o2BubbleObjects.ring?.geometry?.dispose?.();
            this.o2BubbleObjects.fill?.material?.dispose?.();
            this.o2BubbleObjects.fill?.geometry?.dispose?.();
            this.scene.remove(this.o2BubbleObjects.ring);
            this.scene.remove(this.o2BubbleObjects.fill);
            this.scene.remove(this.o2BubbleObjects.light);
            this.o2BubbleObjects = null;
        }
        this.renderer.dispose();
        this.container.replaceChildren();
    }
}
