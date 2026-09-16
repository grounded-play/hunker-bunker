// The two alt-radio voice banks (Steam itemdefs 4148/4149) and the cue slot
// each bank must fill.
//
// This is the labelling key for the raw VO session takes: the artist recorded
// 6 freestyle takes of 6 lines per bank, and these are those 6 lines. Both
// src/audio.js's callout cueMap and scripts/segment-vo-takes.mjs read from
// here, so a cue can never exist in one and not the other.
export const VOICE_BANKS = Object.freeze({
    4148: Object.freeze({
        itemdefid: 4148,
        prefix: 'voice_commander',
        name: 'Soviet Sub-Commander Radio',
        blurb: 'Heavy radio static. Authoritative Russian-accented military jargon.',
        previewCue: 'boss_spotted',
        slots: Object.freeze([
            Object.freeze({ key: 'voice_commander_reloading', cue: 'reload', subtitle: 'RELOADING.', intent: 'Weapon reload', trigger: 'A non-full weapon begins reload', exclusions: ['menu', 'full magazine'], priority: 4 }),
            Object.freeze({ key: 'voice_commander_low_health', cue: 'low_health', subtitle: 'VITALS CRITICAL.', intent: 'HP crosses downward to 25% or less', trigger: 'Downward HP threshold crossing', exclusions: ['shield loss', 'maximum HP increase', 'healing'], priority: 3 }),
            Object.freeze({ key: 'voice_commander_shield_critical', cue: 'shield_critical', subtitle: 'SHIELD FAILING. TAKE COVER.', intent: 'Shield crosses downward to 25% or less', trigger: 'Downward shield threshold crossing', exclusions: ['HP loss', 'shield unavailable'], priority: 3 }),
            Object.freeze({ key: 'voice_commander_boss_spotted', cue: 'boss_spotted', aliases: ['threat_high'], subtitle: 'HEAVY INCOMING.', intent: 'Boss enters the field', trigger: 'New boss encounter ID', exclusions: ['ordinary enemy', 'repeated event alias'], priority: 3 }),
            Object.freeze({ key: 'voice_commander_killstreak', cue: 'killstreak', subtitle: 'KEEP FIRING.', intent: 'Kill streak reached', trigger: 'New kill-streak tier', exclusions: ['single target down', 'overdrive ready'], priority: 4 }),
            Object.freeze({ key: 'voice_commander_target_down', cue: 'target_down', subtitle: 'HEAVY TARGET DESTROYED.', intent: 'Boss target eliminated', trigger: 'Boss death', exclusions: ['ordinary enemy', 'kill streak'], priority: 4 }),
            Object.freeze({ key: 'voice_commander_overdrive_ready', cue: 'overdrive_ready', subtitle: 'OVERDRIVE CHARGED. MOVE.', intent: 'Dash overdrive charged', trigger: 'Overdrive becomes ready', exclusions: ['kill streak'], priority: 4 }),
            Object.freeze({ key: 'voice_commander_breached', cue: 'breached', subtitle: 'WALL BREACHED.', intent: 'A wall is breached', trigger: 'New wall breach', exclusions: ['door opening'], priority: 4 }),
            Object.freeze({ key: 'voice_commander_sector_cleared', cue: 'sector_cleared', subtitle: 'SECTOR SECURE. RETURN TO SHIP.', intent: 'Objective complete / sector cleared', trigger: 'Objective completion', exclusions: ['extraction victory'], priority: 3 }),
            Object.freeze({ key: 'voice_commander_victory', cue: 'victory', subtitle: 'EXTRACTION SECURED.', intent: 'Extraction / run won', trigger: 'Successful extraction', exclusions: ['objective complete'], priority: 2 }),
            // Wave 2 additions
            Object.freeze({ key: 'voice_commander_comms_online', cue: 'comms_online', subtitle: 'COMMAND CHANNEL OPEN. STAY SHARP.', intent: 'Comms link online', trigger: 'Gameplay begins with this bank equipped', exclusions: ['menu'], priority: 2 }),
            Object.freeze({ key: 'voice_commander_mission_active', cue: 'mission_active', subtitle: 'ORDERS RECEIVED. MOVE OUT.', intent: 'Mission objective assigned', trigger: 'Mission objective is assigned', exclusions: ['extraction'], priority: 3 }),
            Object.freeze({ key: 'voice_commander_ammo_empty', cue: 'ammo_empty', subtitle: 'WEAPON EMPTY. FIND AMMUNITION.', intent: 'Empty weapon dry fire', trigger: 'Trigger pulled on an empty weapon', exclusions: ['reload in progress'], priority: 4 }),
            Object.freeze({ key: 'voice_commander_reload_complete', cue: 'reload_complete', subtitle: 'WEAPON READY.', intent: 'Reload finishes', trigger: 'Magazine refill finishes', exclusions: ['empty weapon'], priority: 4 }),
            Object.freeze({ key: 'voice_commander_radar_ready', cue: 'radar_ready', subtitle: 'SCANNER READY. USE IT.', intent: 'Radar off cooldown', trigger: 'Radar cooldown finishes', exclusions: ['radar active'], priority: 4 }),
            Object.freeze({ key: 'voice_commander_radar_contact', cue: 'radar_contact', subtitle: 'CONTACT MARKED. ADVANCE.', intent: 'High-value contact scanned', trigger: 'Scan reveals a high-value contact', exclusions: ['ordinary contact'], priority: 3 }),
            Object.freeze({ key: 'voice_commander_turret_ready', cue: 'turret_ready', subtitle: 'TURRET PACKAGE READY.', intent: 'Turret buildable', trigger: 'Engineer turret becomes buildable', exclusions: ['turret placed'], priority: 4 }),
            Object.freeze({ key: 'voice_commander_turret_deployed', cue: 'turret_deployed', subtitle: 'GUN IS LIVE. HOLD THE LINE.', intent: 'Turret placed', trigger: 'Player deploys a turret', exclusions: ['turret ready'], priority: 4 }),
            Object.freeze({ key: 'voice_commander_oxygen_low', cue: 'oxygen_low', subtitle: 'OXYGEN LOW. RETURN TO PRESSURE.', intent: 'O2 below 35%', trigger: 'Oxygen crosses below 35%', exclusions: ['oxygen critical', 'in safe zone'], priority: 3 }),
            Object.freeze({ key: 'voice_commander_oxygen_critical', cue: 'oxygen_critical', subtitle: 'YOU ARE SUFFOCATING. MOVE NOW.', intent: 'O2 below 15%', trigger: 'Oxygen crosses below 15%', exclusions: ['oxygen low', 'in safe zone'], priority: 2 }),
            Object.freeze({ key: 'voice_commander_oxygen_restored', cue: 'oxygen_restored', subtitle: 'AIR RESTORED. KEEP MOVING.', intent: 'O2 safe zone entered', trigger: 'Player re-enters a safe oxygen field', exclusions: ['hazard zone'], priority: 3 }),
            Object.freeze({ key: 'voice_commander_freeze_warning', cue: 'freeze_warning', subtitle: 'COLD IS KILLING YOU. FIND HEAT.', intent: 'Cold damage begun', trigger: 'Cold exposure begins damaging player', exclusions: ['safe temperature'], priority: 3 }),
            Object.freeze({ key: 'voice_commander_toxin_warning', cue: 'toxin_warning', subtitle: 'CONTAMINATION. CLEAR THE ZONE.', intent: 'Toxin exposure begun', trigger: 'Toxin/infection exposure begins', exclusions: ['clean atmosphere'], priority: 3 }),
            Object.freeze({ key: 'voice_commander_hull_damaged', cue: 'hull_damaged', subtitle: 'THE SHIP IS TAKING DAMAGE. DEFEND IT.', intent: 'Hull below 55%', trigger: 'Ship hull crosses below 55%', exclusions: ['hull critical'], priority: 3 }),
            Object.freeze({ key: 'voice_commander_hull_critical', cue: 'hull_critical', subtitle: 'HULL CRITICAL. GET BACK TO THE SHIP.', intent: 'Hull below 25%', trigger: 'Ship hull crosses below 25%', exclusions: ['hull destroyed'], priority: 2 }),
            Object.freeze({ key: 'voice_commander_cover_degrading', cue: 'cover_degrading', subtitle: 'THEY ARE WATCHING YOU. CONTROL YOURSELF.', intent: 'Humanity threshold warning', trigger: 'Humanity/cover reaches warning threshold', exclusions: ['ordinary dialogue'], priority: 3 }),
            Object.freeze({ key: 'voice_commander_first_kill', cue: 'first_kill', subtitle: 'FIRST CONTACT DOWN. CONTINUE.', intent: 'First kill of run', trigger: 'First ordinary kill of the run', exclusions: ['boss death'], priority: 4 }),
            Object.freeze({ key: 'voice_commander_crawler_detected', cue: 'crawler_detected', subtitle: 'FAST CONTACT. KEEP YOUR DISTANCE.', intent: 'Crawler encountered', trigger: 'First crawler encounter', exclusions: ['ordinary enemy'], priority: 3 }),
            Object.freeze({ key: 'voice_commander_sentinel_detected', cue: 'sentinel_detected', subtitle: 'AUTOMATED GUN AHEAD. FIND COVER.', intent: 'Sentinel encountered', trigger: 'First sentinel encounter', exclusions: ['ordinary enemy'], priority: 3 }),
            Object.freeze({ key: 'voice_commander_objective_found', cue: 'objective_found', subtitle: 'OBJECTIVE LOCATED. MARKING ROUTE.', intent: 'Primary target revealed', trigger: 'Primary mission target is revealed', exclusions: ['secondary cache'], priority: 3 }),
            Object.freeze({ key: 'voice_commander_black_box_found', cue: 'black_box_found', subtitle: 'BLACK BOX LOCATED. RECOVER IT.', intent: 'Black box revealed', trigger: 'Black box is revealed', exclusions: ['ordinary cache'], priority: 3 }),
            Object.freeze({ key: 'voice_commander_foundry_found', cue: 'foundry_found', subtitle: 'FOUNDRY LOCATED. PUT IT TO WORK.', intent: 'Foundry revealed', trigger: 'Foundry is revealed', exclusions: ['ordinary cache'], priority: 3 }),
            Object.freeze({ key: 'voice_commander_armory_found', cue: 'armory_found', subtitle: 'WEAPONS CACHE LOCATED. EXPECT RESISTANCE.', intent: 'Armory cache revealed', trigger: 'Armory cache is revealed', exclusions: ['ordinary cache'], priority: 3 }),
            Object.freeze({ key: 'voice_commander_camp_found', cue: 'camp_found', subtitle: 'HUMAN POSITION AHEAD. HOLD YOUR FIRE.', intent: 'Survivor camp revealed', trigger: 'A survivor camp is revealed', exclusions: ['hostile camp'], priority: 3 }),
            Object.freeze({ key: 'voice_commander_hive_found', cue: 'hive_found', subtitle: 'HIVE AHEAD. WEAPONS FREE.', intent: 'Hive/nest revealed', trigger: 'A hive/nest is revealed', exclusions: ['cleared hive'], priority: 3 }),
            Object.freeze({ key: 'voice_commander_data_recovered', cue: 'data_recovered', subtitle: 'DATA SECURED. ARCHIVE IT LATER.', intent: 'Lore fragment collected', trigger: 'Lore or archive fragment collected', exclusions: ['salvage drop'], priority: 4 }),
            Object.freeze({ key: 'voice_commander_salvage_banked', cue: 'salvage_banked', subtitle: 'SALVAGE SECURE. GET BACK OUT THERE.', intent: 'Salvage banked', trigger: 'First successful ship deposit', exclusions: ['deposit cancelled'], priority: 4 }),
            Object.freeze({ key: 'voice_commander_build_started', cue: 'build_started', subtitle: 'CONSTRUCTION STARTED. COVER THE SITE.', intent: 'Base build started', trigger: 'Base-module construction begins', exclusions: ['build completed'], priority: 4 }),
            Object.freeze({ key: 'voice_commander_build_complete', cue: 'build_complete', subtitle: 'SYSTEM BUILT AND OPERATIONAL.', intent: 'Base build complete', trigger: 'Module finishes rising/activating', exclusions: ['build started'], priority: 4 }),
            Object.freeze({ key: 'voice_commander_upgrade_installed', cue: 'upgrade_installed', subtitle: 'UPGRADE FITTED. TEST IT IN COMBAT.', intent: 'Upgrade fitted', trigger: 'Weapon or base upgrade applies', exclusions: ['repair'], priority: 4 }),
            Object.freeze({ key: 'voice_commander_terminal_accepted', cue: 'terminal_accepted', subtitle: 'OVERRIDE ACCEPTED. WATCH FOR CONSEQUENCES.', intent: 'Terminal accepted', trigger: 'Terminal choice succeeds', exclusions: ['terminal denied'], priority: 4 }),
            Object.freeze({ key: 'voice_commander_terminal_denied', cue: 'terminal_denied', subtitle: 'ACCESS DENIED. FIND ANOTHER WAY.', intent: 'Terminal denied', trigger: 'Terminal action is unavailable', exclusions: ['terminal accepted'], priority: 4 }),
            Object.freeze({ key: 'voice_commander_lights_failed', cue: 'lights_failed', subtitle: 'LIGHTS OUT. SWITCH TO TACTICAL LAMP.', intent: 'Lighting disabled', trigger: 'Director disables local lighting', exclusions: ['night vision'], priority: 3 }),
            Object.freeze({ key: 'voice_commander_navigation_corrupt', cue: 'navigation_corrupt', subtitle: 'NAVIGATION IS COMPROMISED. TRUST YOUR EYES.', intent: 'Compass interference', trigger: 'Compass/map interference begins', exclusions: ['normal compass'], priority: 3 }),
            Object.freeze({ key: 'voice_commander_uplink_lost', cue: 'uplink_lost', subtitle: 'UPLINK LOST. YOU ARE ON YOUR OWN.', intent: 'Mothership link lost', trigger: 'Mothership link is severed', exclusions: ['uplink restored'], priority: 2 }),
            Object.freeze({ key: 'voice_commander_uplink_restored', cue: 'uplink_restored', subtitle: 'COMMAND LINK RESTORED. REPORT IN.', intent: 'Mothership link restored', trigger: 'Mothership link returns', exclusions: ['uplink lost'], priority: 3 }),
            Object.freeze({ key: 'voice_commander_return_to_ship', cue: 'return_to_ship', subtitle: 'OBJECTIVE COMPLETE. RETURN TO THE SHIP.', intent: 'Return to ship', trigger: 'Objective complete; extraction not yet active', exclusions: ['extraction ready'], priority: 3 }),
            Object.freeze({ key: 'voice_commander_extraction_ready', cue: 'extraction_ready', subtitle: 'EXTRACTION WINDOW OPEN. MOVE.', intent: 'Extraction ready', trigger: 'Extraction becomes available', exclusions: ['victory'], priority: 2 }),
            Object.freeze({ key: 'voice_commander_elevator_inbound', cue: 'elevator_inbound', subtitle: 'ELEVATOR INBOUND. DEFEND THE WRECK.', intent: 'Elevator defense starts', trigger: 'Elevator defense countdown starts', exclusions: ['victory'], priority: 2 }),
            Object.freeze({ key: 'voice_commander_launch_blocked', cue: 'launch_blocked', subtitle: 'LAUNCH BLOCKED. FINISH THE MISSION.', intent: 'Premature launch blocked', trigger: 'Player attempts launch with unmet conditions', exclusions: ['extraction ready'], priority: 3 }),
            Object.freeze({ key: 'voice_commander_operator_down', cue: 'operator_down', subtitle: 'OPERATOR DOWN. SIGNAL LOST.', intent: 'Player downed/dead', trigger: 'Player reaches death/downed state', exclusions: ['revive'], priority: 1 }),
            Object.freeze({ key: 'voice_commander_black_box_recovered', cue: 'black_box_recovered', subtitle: 'PREVIOUS SALVAGE RECOVERED.', intent: 'Prior run black box picked up', trigger: 'Prior-run black box is collected', exclusions: ['ordinary salvage'], priority: 3 })
        ])
    }),
    4149: Object.freeze({
        itemdefid: 4149,
        prefix: 'voice_aura',
        name: "Synthesized AI Unit 'AURA'",
        blurb: 'Smooth synthesized female tactical assistant with sub-harmonic chimes.',
        previewCue: 'overdrive_ready',
        slots: Object.freeze([
            Object.freeze({ key: 'voice_aura_reloading', cue: 'reload', subtitle: 'RELOADING.', intent: 'Weapon reload', trigger: 'A non-full weapon begins reload', exclusions: ['menu', 'full magazine'], priority: 4 }),
            Object.freeze({ key: 'voice_aura_low_health', cue: 'low_health', subtitle: 'OPERATOR VITALS CRITICAL.', intent: 'HP crosses downward to 25% or less', trigger: 'Downward HP threshold crossing', exclusions: ['shield loss', 'maximum HP increase', 'healing'], priority: 3 }),
            Object.freeze({ key: 'voice_aura_shield_critical', cue: 'shield_critical', subtitle: 'SHIELD CRITICAL.', intent: 'Shield crosses downward to 25% or less', trigger: 'Downward shield threshold crossing', exclusions: ['HP loss', 'shield unavailable'], priority: 3 }),
            Object.freeze({ key: 'voice_aura_threat_high', cue: 'threat_high', aliases: ['boss_spotted'], subtitle: 'THREAT LEVEL HIGH.', intent: 'Boss enters the field', trigger: 'New boss encounter ID', exclusions: ['ordinary enemy', 'repeated event alias'], priority: 3 }),
            Object.freeze({ key: 'voice_aura_target_down', cue: 'target_down', subtitle: 'TARGET DOWN.', intent: 'Boss target eliminated', trigger: 'Boss death', exclusions: ['ordinary enemy', 'kill streak'], priority: 4 }),
            Object.freeze({ key: 'voice_aura_killstreak', cue: 'killstreak', subtitle: 'COMBAT EFFICIENCY RISING.', intent: 'Kill streak reached', trigger: 'New kill-streak tier', exclusions: ['single target down', 'overdrive ready'], priority: 4 }),
            Object.freeze({ key: 'voice_aura_overdrive_ready', cue: 'overdrive_ready', subtitle: 'OVERDRIVE READY.', intent: 'Dash overdrive charged', trigger: 'Overdrive becomes ready', exclusions: ['kill streak'], priority: 4 }),
            Object.freeze({ key: 'voice_aura_breached', cue: 'breached', subtitle: 'STRUCTURAL BREACH CONFIRMED.', intent: 'A wall is breached', trigger: 'New wall breach', exclusions: ['door opening'], priority: 4 }),
            Object.freeze({ key: 'voice_aura_sector_cleared', cue: 'sector_cleared', subtitle: 'SECTOR CLEARED.', intent: 'Objective complete / sector cleared', trigger: 'Objective completion', exclusions: ['extraction victory'], priority: 3 }),
            Object.freeze({ key: 'voice_aura_victory', cue: 'victory', subtitle: 'EXTRACTION CONFIRMED. MISSION COMPLETE.', intent: 'Extraction / run won', trigger: 'Successful extraction', exclusions: ['objective complete'], priority: 2 }),
            // Wave 2 additions
            Object.freeze({ key: 'voice_aura_comms_online', cue: 'comms_online', subtitle: 'AURA ONLINE. TACTICAL LINK ESTABLISHED.', intent: 'Comms link online', trigger: 'Gameplay begins with this bank equipped', exclusions: ['menu'], priority: 2 }),
            Object.freeze({ key: 'voice_aura_mission_active', cue: 'mission_active', subtitle: 'MISSION PARAMETERS ACQUIRED.', intent: 'Mission objective assigned', trigger: 'Mission objective is assigned', exclusions: ['extraction'], priority: 3 }),
            Object.freeze({ key: 'voice_aura_ammo_empty', cue: 'ammo_empty', subtitle: 'AMMUNITION DEPLETED.', intent: 'Empty weapon dry fire', trigger: 'Trigger pulled on an empty weapon', exclusions: ['reload in progress'], priority: 4 }),
            Object.freeze({ key: 'voice_aura_reload_complete', cue: 'reload_complete', subtitle: 'RELOAD COMPLETE.', intent: 'Reload finishes', trigger: 'Magazine refill finishes', exclusions: ['empty weapon'], priority: 4 }),
            Object.freeze({ key: 'voice_aura_radar_ready', cue: 'radar_ready', subtitle: 'RADAR SCAN AVAILABLE.', intent: 'Radar off cooldown', trigger: 'Radar cooldown finishes', exclusions: ['radar active'], priority: 4 }),
            Object.freeze({ key: 'voice_aura_radar_contact', cue: 'radar_contact', subtitle: 'PRIORITY CONTACT IDENTIFIED.', intent: 'High-value contact scanned', trigger: 'Scan reveals a high-value contact', exclusions: ['ordinary contact'], priority: 3 }),
            Object.freeze({ key: 'voice_aura_turret_ready', cue: 'turret_ready', subtitle: 'SENTRY DEPLOYMENT AVAILABLE.', intent: 'Turret buildable', trigger: 'Engineer turret becomes buildable', exclusions: ['turret placed'], priority: 4 }),
            Object.freeze({ key: 'voice_aura_turret_deployed', cue: 'turret_deployed', subtitle: 'SENTRY ONLINE. FIRING SOLUTION ACTIVE.', intent: 'Turret placed', trigger: 'Player deploys a turret', exclusions: ['turret ready'], priority: 4 }),
            Object.freeze({ key: 'voice_aura_oxygen_low', cue: 'oxygen_low', subtitle: 'OXYGEN RESERVE LOW. SEEK LIFE SUPPORT.', intent: 'O2 below 35%', trigger: 'Oxygen crosses below 35%', exclusions: ['oxygen critical', 'in safe zone'], priority: 3 }),
            Object.freeze({ key: 'voice_aura_oxygen_critical', cue: 'oxygen_critical', subtitle: 'CRITICAL OXYGEN LOSS. RESPIRATION FAILING.', intent: 'O2 below 15%', trigger: 'Oxygen crosses below 15%', exclusions: ['oxygen low', 'in safe zone'], priority: 2 }),
            Object.freeze({ key: 'voice_aura_oxygen_restored', cue: 'oxygen_restored', subtitle: 'OXYGEN SUPPLY STABILIZED.', intent: 'O2 safe zone entered', trigger: 'Player re-enters a safe oxygen field', exclusions: ['hazard zone'], priority: 3 }),
            Object.freeze({ key: 'voice_aura_freeze_warning', cue: 'freeze_warning', subtitle: 'LETHAL THERMAL EXPOSURE DETECTED.', intent: 'Cold damage begun', trigger: 'Cold exposure begins damaging player', exclusions: ['safe temperature'], priority: 3 }),
            Object.freeze({ key: 'voice_aura_toxin_warning', cue: 'toxin_warning', subtitle: 'BIO-TOXIN EXPOSURE DETECTED.', intent: 'Toxin exposure begun', trigger: 'Toxin/infection exposure begins', exclusions: ['clean atmosphere'], priority: 3 }),
            Object.freeze({ key: 'voice_aura_hull_damaged', cue: 'hull_damaged', subtitle: 'SHIP INTEGRITY COMPROMISED.', intent: 'Hull below 55%', trigger: 'Ship hull crosses below 55%', exclusions: ['hull critical'], priority: 3 }),
            Object.freeze({ key: 'voice_aura_hull_critical', cue: 'hull_critical', subtitle: 'CRITICAL HULL FAILURE IMMINENT.', intent: 'Hull below 25%', trigger: 'Ship hull crosses below 25%', exclusions: ['hull destroyed'], priority: 2 }),
            Object.freeze({ key: 'voice_aura_cover_degrading', cue: 'cover_degrading', subtitle: 'BEHAVIORAL COVER DEGRADATION DETECTED.', intent: 'Humanity threshold warning', trigger: 'Humanity/cover reaches warning threshold', exclusions: ['ordinary dialogue'], priority: 3 }),
            Object.freeze({ key: 'voice_aura_first_kill', cue: 'first_kill', subtitle: 'FIRST THREAT NEUTRALIZED.', intent: 'First kill of run', trigger: 'First ordinary kill of the run', exclusions: ['boss death'], priority: 4 }),
            Object.freeze({ key: 'voice_aura_crawler_detected', cue: 'crawler_detected', subtitle: 'RAPID BIO-ENTITY DETECTED.', intent: 'Crawler encountered', trigger: 'First crawler encounter', exclusions: ['ordinary enemy'], priority: 3 }),
            Object.freeze({ key: 'voice_aura_sentinel_detected', cue: 'sentinel_detected', subtitle: 'HOSTILE DEFENSE SYSTEM ACTIVE.', intent: 'Sentinel encountered', trigger: 'First sentinel encounter', exclusions: ['ordinary enemy'], priority: 3 }),
            Object.freeze({ key: 'voice_aura_objective_found', cue: 'objective_found', subtitle: 'PRIMARY OBJECTIVE CONFIRMED.', intent: 'Primary target revealed', trigger: 'Primary mission target is revealed', exclusions: ['secondary cache'], priority: 3 }),
            Object.freeze({ key: 'voice_aura_black_box_found', cue: 'black_box_found', subtitle: 'OPERATOR BLACK BOX SIGNAL ACQUIRED.', intent: 'Black box revealed', trigger: 'Black box is revealed', exclusions: ['ordinary cache'], priority: 3 }),
            Object.freeze({ key: 'voice_aura_foundry_found', cue: 'foundry_found', subtitle: 'FABRICATION FACILITY IDENTIFIED.', intent: 'Foundry revealed', trigger: 'Foundry is revealed', exclusions: ['ordinary cache'], priority: 3 }),
            Object.freeze({ key: 'voice_aura_armory_found', cue: 'armory_found', subtitle: 'HIGH-VALUE ARMORY CACHE DETECTED.', intent: 'Armory cache revealed', trigger: 'Armory cache is revealed', exclusions: ['ordinary cache'], priority: 3 }),
            Object.freeze({ key: 'voice_aura_camp_found', cue: 'camp_found', subtitle: 'SURVIVOR ENCLAVE LOCATED.', intent: 'Survivor camp revealed', trigger: 'A survivor camp is revealed', exclusions: ['hostile camp'], priority: 3 }),
            Object.freeze({ key: 'voice_aura_hive_found', cue: 'hive_found', subtitle: 'DENSE BIOLOGICAL STRUCTURE DETECTED.', intent: 'Hive/nest revealed', trigger: 'A hive/nest is revealed', exclusions: ['cleared hive'], priority: 3 }),
            Object.freeze({ key: 'voice_aura_data_recovered', cue: 'data_recovered', subtitle: 'BUNKER RECORD RECOVERED.', intent: 'Lore fragment collected', trigger: 'Lore or archive fragment collected', exclusions: ['salvage drop'], priority: 4 }),
            Object.freeze({ key: 'voice_aura_salvage_banked', cue: 'salvage_banked', subtitle: 'SALVAGE TRANSFER CONFIRMED.', intent: 'Salvage banked', trigger: 'First successful ship deposit', exclusions: ['deposit cancelled'], priority: 4 }),
            Object.freeze({ key: 'voice_aura_build_started', cue: 'build_started', subtitle: 'CONSTRUCTION SEQUENCE INITIATED.', intent: 'Base build started', trigger: 'Base-module construction begins', exclusions: ['build completed'], priority: 4 }),
            Object.freeze({ key: 'voice_aura_build_complete', cue: 'build_complete', subtitle: 'MODULE DEPLOYMENT COMPLETE.', intent: 'Base build complete', trigger: 'Module finishes rising/activating', exclusions: ['build started'], priority: 4 }),
            Object.freeze({ key: 'voice_aura_upgrade_installed', cue: 'upgrade_installed', subtitle: 'UPGRADE INSTALLED AND CALIBRATED.', intent: 'Upgrade fitted', trigger: 'Weapon or base upgrade applies', exclusions: ['repair'], priority: 4 }),
            Object.freeze({ key: 'voice_aura_terminal_accepted', cue: 'terminal_accepted', subtitle: 'TERMINAL TRANSACTION CONFIRMED.', intent: 'Terminal accepted', trigger: 'Terminal choice succeeds', exclusions: ['terminal denied'], priority: 4 }),
            Object.freeze({ key: 'voice_aura_terminal_denied', cue: 'terminal_denied', subtitle: 'TERMINAL REQUEST DENIED.', intent: 'Terminal denied', trigger: 'Terminal action is unavailable', exclusions: ['terminal accepted'], priority: 4 }),
            Object.freeze({ key: 'voice_aura_lights_failed', cue: 'lights_failed', subtitle: 'LOCAL ILLUMINATION OFFLINE.', intent: 'Lighting disabled', trigger: 'Director disables local lighting', exclusions: ['night vision'], priority: 3 }),
            Object.freeze({ key: 'voice_aura_navigation_corrupt', cue: 'navigation_corrupt', subtitle: 'NAVIGATION TELEMETRY CORRUPTED.', intent: 'Compass interference', trigger: 'Compass/map interference begins', exclusions: ['normal compass'], priority: 3 }),
            Object.freeze({ key: 'voice_aura_uplink_lost', cue: 'uplink_lost', subtitle: 'MOTHERSHIP TELEMETRY DISCONNECTED.', intent: 'Mothership link lost', trigger: 'Mothership link is severed', exclusions: ['uplink restored'], priority: 2 }),
            Object.freeze({ key: 'voice_aura_uplink_restored', cue: 'uplink_restored', subtitle: 'ORBITAL UPLINK RE-ESTABLISHED.', intent: 'Mothership link restored', trigger: 'Mothership link returns', exclusions: ['uplink lost'], priority: 3 }),
            Object.freeze({ key: 'voice_aura_return_to_ship', cue: 'return_to_ship', subtitle: 'OBJECTIVE COMPLETE. RETURN ROUTE MARKED.', intent: 'Return to ship', trigger: 'Objective complete; extraction not yet active', exclusions: ['extraction ready'], priority: 3 }),
            Object.freeze({ key: 'voice_aura_extraction_ready', cue: 'extraction_ready', subtitle: 'EXTRACTION AUTHORIZATION RECEIVED.', intent: 'Extraction ready', trigger: 'Extraction becomes available', exclusions: ['victory'], priority: 2 }),
            Object.freeze({ key: 'voice_aura_elevator_inbound', cue: 'elevator_inbound', subtitle: 'ELEVATOR INBOUND. DEFENSIVE INTERVAL ACTIVE.', intent: 'Elevator defense starts', trigger: 'Elevator defense countdown starts', exclusions: ['victory'], priority: 2 }),
            Object.freeze({ key: 'voice_aura_launch_blocked', cue: 'launch_blocked', subtitle: 'LAUNCH AUTHORIZATION DENIED.', intent: 'Premature launch blocked', trigger: 'Player attempts launch with unmet conditions', exclusions: ['extraction ready'], priority: 3 }),
            Object.freeze({ key: 'voice_aura_operator_down', cue: 'operator_down', subtitle: 'OPERATOR SIGNAL TERMINATED.', intent: 'Player downed/dead', trigger: 'Player reaches death/downed state', exclusions: ['revive'], priority: 1 }),
            Object.freeze({ key: 'voice_aura_black_box_recovered', cue: 'black_box_recovered', subtitle: 'BLACK BOX RECOVERY COMPLETE.', intent: 'Prior run black box picked up', trigger: 'Prior-run black box is collected', exclusions: ['ordinary salvage'], priority: 3 })
        ])
    })

});

export const VOICE_BANK_IDS = Object.freeze(Object.keys(VOICE_BANKS).map(Number));
export const VOICE_TAKES_PER_LINE = 2;

export function getVoiceTakeKeys(slotKey, count = VOICE_TAKES_PER_LINE) {
    return Array.from({ length: count }, (_, index) => index === 0 ? slotKey : `${slotKey}${index + 1}`);
}

export function getVoiceAudioManifest() {
    return Object.values(VOICE_BANKS).flatMap((bank) => bank.slots.flatMap((slot) => (
        getVoiceTakeKeys(slot.key, slot.takeCount).map((key) => ({ key, url: `/audio/generated/${key}.wav` }))
    )));
}

export function resolveVoiceBankSlot(itemdefid, cue) {
    const bank = getVoiceBank(itemdefid);
    if (!bank) return null;
    const normalized = String(cue ?? '').toLowerCase();
    return bank.slots.find((slot) => slot.cue === normalized || slot.aliases?.includes(normalized)) ?? null;
}

export function getVoiceScriptRows() {
    return Object.values(VOICE_BANKS).flatMap((bank) => bank.slots.map((slot) => ({
        bankId: bank.itemdefid,
        bankName: bank.name,
        semanticId: `${bank.itemdefid}:${slot.cue}`,
        repeatScope: 'expedition',
        lifetime: 'trigger-time only',
        direction: bank.itemdefid === 4148 ? 'Authoritative, clipped military radio' : 'Calm synthesized tactical warning',
        takes: getVoiceTakeKeys(slot.key, slot.takeCount),
        ...slot
    })));
}

/** Which bank a raw session filename belongs to ("voice_aura_V_take_1.wav" -> 4149). */
export function bankForSourceFile(filename = '') {
    const name = String(filename).toLowerCase();
    for (const bank of Object.values(VOICE_BANKS)) {
        // "voice_aura" / "voice_commander" -- the same prefix the game uses.
        if (name.includes(bank.prefix.replace('voice_', ''))) return bank;
    }
    return null;
}

export function getVoiceBank(itemdefid) {
    return VOICE_BANKS[Number(itemdefid)] ?? null;
}
