// Sprint 23 Phase 3 / Lane B — authored-room build catalog.
//
// Versioned data only. No Three.js/DOM/render objects, no random calls,
// no topology decisions — see docs/sprint-23-authored-world-tiles-lane-split.md
// ("Landing home" table: this file is data; src/roomBuilds.js is the pure
// validate/rotate/select/stamp API that consumes it).
//
// Most support builds use `rectRoomPattern`; doctrine proof rooms may use an
// explicit `authoredRoomPattern` when a readable pivot, loop, or silhouette
// cannot be expressed as a few rectangles. `roomBuilds.js` validates full
// floor connectivity and every rotated form either way.

import { CATHEDRAL_ROOM_BLUEPRINTS } from './cathedralBlueprints.js';
import { N64_ROOM_BLUEPRINTS } from './n64RoomBlueprints.js';

export const ROOM_BUILD_VERSION = 1;
export { CATHEDRAL_ROOM_BLUEPRINTS, N64_ROOM_BLUEPRINTS };

function authoredRoomPattern(rows) {
    const width = rows[0]?.length ?? 0;
    if (!width || rows.some((row) => row.length !== width || /[^.#]/.test(row))) {
        throw new Error('Authored room patterns must be equal-width rows containing only "." and "#"');
    }
    return rows;
}

function rectRoomPattern(width, height, obstructions = []) {
    const pattern = Array.from({ length: height }, () => Array(width).fill('.'));
    for (const { x, y, w, h } of obstructions) {
        for (let row = y; row < y + h; row += 1) {
            for (let col = x; col < x + w; col += 1) {
                pattern[row][col] = '#';
            }
        }
    }
    return pattern.map((row) => row.join(''));
}

export const ROOM_BUILD_CATALOG = Object.freeze([
    Object.freeze({
        id: 'medical_triage',
        family: 'medical',
        themeStyle: 'cleanroom',
        partitionThickness: 0.5,
        // Lane A / P0A spatial proof. The offset clean-room partition forces
        // the south approach to pivot east around the intake screen before
        // the treatment bay is exposed. The east service channel provides a
        // longer supply-side return without changing the flat room contract.
        pattern: authoredRoomPattern([
            '...............',
            '...........#...',
            '...#######.#...',
            '...#.......#...',
            '...#.......#...',
            '...#####...#...',
            '...............',
            '...............',
            '...............'
        ]),
        sockets: [{ id: 'entry', side: 's', width: 3, required: true }],
        rotationPolicy: 'cardinal',
        tierEligibility: [1, 2],
        biomeEligibility: ['active', 'cryo', 'bio'],
        roles: ['support', 'questDestination'],
        // prop_vital_monitor: dedicated 2D signature sprite added this
        // sprint (docs/sprint-23-room-juice-and-dressing-assets.md) —
        // registered in GENERATED_ROOM_PROP_PATHS/scatterTextures already.
        // Replaces the generic prop_conduit_hub placeholder, which reads as
        // an engineering fixture, not a medical partition.
        structuralAnchors: [{ id: 'triage_partition', type: 'prop_vital_monitor', x: 7, y: 5 }],
        // 'triage_console' is this room's own generic default interaction.
        // 'hydro_bed_controls' additionally matches
        // src/ringManifest.js's CAMP_QUEST_DESTINATIONS objectiveAnchorId
        // for the spore_cleansing quest exactly, so a placement resolving
        // that specific quest's anchor id finds a real point here too,
        // without narrowing the whole family to one quest's naming.
        interactionAnchors: [
            { id: 'triage_console', type: 'prop_diagnostic_console', x: 8, y: 3 },
            { id: 'hydro_bed_controls', type: 'prop_medical_bed', x: 6, y: 4 }
        ],
        signatureAnchorId: 'hydro_bed_controls',
        compassAnchors: { approach: 'entry', objective: 'triage_console' },
        coverZones: [
            { x: 3, y: 2, w: 7, h: 1 },
            { x: 3, y: 2, w: 1, h: 4 },
            { x: 3, y: 5, w: 5, h: 1 },
            { x: 11, y: 1, w: 1, h: 5 }
        ],
        encounterZones: [],
        rewardAnchors: [{ id: 'med_supply_case', type: 'prop_bunker_supplies', x: 13, y: 2 }],
        loreAnchors: [],
        hazardZones: [],
        // Arrival apron stays enemy-free and visually quiet; the treatment
        // pocket itself is a functional cluster, not a quiet zone.
        quietZones: [{ x: 5, y: 6, w: 5, h: 2 }],
        safeZone: true,
        containmentBounds: { minX: 0, minY: 0, maxX: 14, maxY: 8 },
        presentationVariants: ['intact', 'abandoned', 'infested', 'looted'],
        stateVariants: ['dormant', 'questActive', 'resolved'],
        adjacency: { prefers: ['service_passage'], forbids: ['camp', 'reward_vault'] },
        contentBudget: { structuralLarge: 1, activityZones: 1, pickupsMin: 1, enemiesMax: 2 }
    }),
    Object.freeze({
        id: 'armory_cage',
        family: 'armory',
        themeStyle: 'substation',
        partitionThickness: 0.5,
        // P1 reward-choice proof: a single T cage interrupts the west/east
        // lane. The north flank is short and defended; the south inspection
        // lane is longer and uses the crossbar as continuous cover.
        pattern: authoredRoomPattern([
            '...............',
            '...............',
            '.....#.........',
            '.....#.........',
            '.....######....',
            '.....#.........',
            '.....#.........',
            '...............',
            '...............'
        ]),
        sockets: [
            { id: 'entry', side: 'w', width: 3, required: true },
            { id: 'serviceExit', side: 'e', width: 3, required: false }
        ],
        rotationPolicy: 'cardinal',
        tierEligibility: [2, 3],
        biomeEligibility: ['active', 'cryo', 'bio'],
        roles: ['reward', 'questDestination'],
        structuralAnchors: [
            { id: 'weapon_rack_a', type: 'prop_security_locker', x: 5, y: 2 },
            { id: 'weapon_rack_b', type: 'prop_security_locker', x: 5, y: 6 }
        ],
        interactionAnchors: [{ id: 'armory_lock', type: 'base_console', x: 3, y: 3 }],
        signatureAnchorId: 'ammo_crate',
        compassAnchors: { approach: 'entry', objective: 'armory_lock' },
        coverZones: [{ x: 5, y: 2, w: 1, h: 5 }, { x: 5, y: 4, w: 6, h: 1 }],
        encounterZones: [{ id: 'armory_defenders', x: 6, y: 1, w: 5, h: 3 }],
        rewardAnchors: [{ id: 'ammo_crate', type: 'prop_ammo_crate_stack', x: 8, y: 3 }],
        loreAnchors: [],
        hazardZones: [],
        quietZones: [{ x: 1, y: 2, w: 4, h: 5 }],
        safeZone: false,
        containmentBounds: { minX: 0, minY: 0, maxX: 14, maxY: 8 },
        presentationVariants: ['sealed', 'breached', 'looted'],
        stateVariants: ['dormant', 'questActive', 'resolved'],
        adjacency: { prefers: ['pressure_corridor'], forbids: ['reward_vault'] },
        contentBudget: { structuralLarge: 2, activityZones: 1, pickupsMin: 1, enemiesMax: 4 }
    }),
    Object.freeze({
        id: 'o2_scrubber',
        family: 'o2',
        themeStyle: 'permafrost',
        partitionThickness: 0.5,
        // P1 broken-ring proof. The crown and two legs form an open-bottomed
        // scrubber housing: entry from the north splits around it, both paths
        // rejoin at the south, and only then can the player turn back into the
        // protected control cavity. Geometry stays fixed across repair states.
        pattern: authoredRoomPattern([
            '.............',
            '.............',
            '.............',
            '.....###.....',
            '....##.##....',
            '....#...#....',
            '....#...#....',
            '.............',
            '.............',
            '.............',
            '.............'
        ]),
        sockets: [{ id: 'entry', side: 'n', width: 3, required: true }],
        rotationPolicy: 'cardinal',
        tierEligibility: [1, 2, 3],
        biomeEligibility: ['active', 'cryo', 'bio'],
        roles: ['objective', 'shipGoalObjective'],
        structuralAnchors: [{ id: 'scrubber_column', type: 'prop_conduit_hub', x: 6, y: 3 }],
        // 'o2_control' matches src/ringManifest.js's MANDATORY_SHIP_GOALS
        // objectiveAnchorId for the o2Bubble goal exactly — this is the
        // ship-critical objective the manifest layer resolves by that id.
        // prop_o2_filter_vat: dedicated signature sprite for the ship-goal
        // objective anchor, replacing the placeholder 'console' type that
        // resolved to no texture.
        interactionAnchors: [{ id: 'o2_control', type: 'prop_o2_filter_vat', x: 6, y: 5 }],
        signatureAnchorId: 'o2_control',
        compassAnchors: { approach: 'entry', objective: 'o2_control' },
        coverZones: [{ x: 4, y: 3, w: 2, h: 4 }, { x: 7, y: 3, w: 2, h: 4 }],
        encounterZones: [{ id: 'scrubber_guard', x: 1, y: 7, w: 11, h: 3 }],
        rewardAnchors: [],
        loreAnchors: [{ id: 'engineering_log', type: 'lore_terminal', x: 2, y: 8 }],
        // The east exhaust is hazardous while the west intake remains the
        // clean service route. Repair changes presentation/state, never the
        // collision layout, so deterministic saves see one stable room.
        hazardZones: [{ id: 'exhaust_leak', x: 9, y: 4, w: 3, h: 3 }],
        quietZones: [{ x: 5, y: 4, w: 3, h: 3 }],
        safeZone: false,
        containmentBounds: { minX: 0, minY: 0, maxX: 12, maxY: 10 },
        presentationVariants: ['idle', 'leaking', 'repaired'],
        stateVariants: ['dormant', 'questActive', 'resolved'],
        adjacency: { prefers: ['pressure_corridor'], forbids: ['camp'] },
        contentBudget: { structuralLarge: 1, activityZones: 1, pickupsMin: 0, enemiesMax: 3 }
    }),
    Object.freeze({
        id: 'field_fabricator',
        family: 'fabricator',
        themeStyle: 'bunker',
        partitionThickness: 0.5,
        // P1 workshop proof: offset loading shoulders compress the south
        // approach before it releases into an asymmetric work cell. The
        // L-shaped island supports a small fixed loop between the terminal
        // and output cache; fabrication states never change this topology.
        pattern: authoredRoomPattern([
            '...............',
            '...............',
            '...............',
            '...............',
            '.....####......',
            '.....#.........',
            '.....#.........',
            '...............',
            '....##...###...',
            '....##...###...',
            '...............'
        ]),
        sockets: [{ id: 'entry', side: 's', width: 3, required: true }],
        rotationPolicy: 'cardinal',
        // Ring 1 included: src/ringManifest.js's makeProgressionContract
        // reserves a fabricator-family fallbackResourceRoute for every
        // ring's mandatory goal, including the ring-1 o2Bubble goal —
        // found by src/chunkStructure.reservationBridge.test.js actually
        // running this catalog against Lane A's real WorldPlan output.
        tierEligibility: [1, 2, 3, 4],
        biomeEligibility: ['active', 'cryo', 'bio'],
        roles: ['support', 'questDestination'],
        structuralAnchors: [{ id: 'fabricator_bench', type: 'prop_engineering_bench', x: 7, y: 4 }],
        // prop_fabricator_workstation: dedicated signature sprite,
        // replacing the placeholder 'console' type that resolved to no
        // texture.
        interactionAnchors: [{ id: 'fabricator_terminal', type: 'prop_fabricator_workstation', x: 9, y: 5 }],
        signatureAnchorId: 'fabricator_terminal',
        compassAnchors: { approach: 'entry', objective: 'fabricator_terminal' },
        coverZones: [
            { x: 5, y: 4, w: 4, h: 1 },
            { x: 5, y: 4, w: 1, h: 3 },
            { x: 4, y: 8, w: 2, h: 2 },
            { x: 9, y: 8, w: 3, h: 2 }
        ],
        encounterZones: [],
        rewardAnchors: [{ id: 'schematic_cache', type: 'prop_bunker_supplies', x: 3, y: 5 }],
        loreAnchors: [],
        hazardZones: [],
        quietZones: [
            { x: 6, y: 7, w: 3, h: 4 },
            { x: 7, y: 3, w: 6, h: 4 },
            { x: 1, y: 3, w: 4, h: 4 }
        ],
        safeZone: true,
        containmentBounds: { minX: 0, minY: 0, maxX: 14, maxY: 10 },
        presentationVariants: ['intact', 'depleted', 'broken'],
        stateVariants: ['dormant', 'questActive', 'resolved'],
        adjacency: { prefers: ['service_passage'], forbids: ['camp'] },
        contentBudget: { structuralLarge: 1, activityZones: 1, pickupsMin: 1, enemiesMax: 1 }
    }),
    Object.freeze({
        id: 'power_puzzle',
        family: 'puzzle',
        themeStyle: 'substation',
        partitionThickness: 0.5,
        // P2 spatial-puzzle proof: node A teaches in the west lobe, then a
        // broken relay enclosure splits into upper/lower feeds and rejoins
        // at node B in the east. Relays are floor-standing props; solved
        // state may gate reward use, never the permanently open routes.
        pattern: authoredRoomPattern([
            '.................',
            '.................',
            '.................',
            '......####.......',
            '......#....#.....',
            '......#....#.....',
            '......#....#.....',
            '......####.......',
            '.................',
            '.................',
            '.................'
        ]),
        sockets: [{ id: 'entry', side: 'w', width: 3, required: true }],
        rotationPolicy: 'cardinal',
        tierEligibility: [2, 3, 4],
        biomeEligibility: ['active', 'cryo', 'bio'],
        roles: ['challenge', 'questDestination'],
        structuralAnchors: [],
        interactionAnchors: [
            { id: 'routing_node_a', type: 'prop_cyber_junction', x: 4, y: 5 },
            { id: 'routing_node_b', type: 'prop_cyber_junction', x: 13, y: 5 },
            { id: 'routing_node_c', type: 'prop_cyber_junction', x: 8, y: 2 },
            { id: 'routing_node_d', type: 'prop_cyber_junction', x: 8, y: 8 }
        ],
        signatureAnchorId: 'routing_node_a',
        compassAnchors: { approach: 'entry', objective: 'routing_node_a' },
        coverZones: [
            { x: 6, y: 3, w: 4, h: 1 },
            { x: 6, y: 3, w: 1, h: 5 },
            { x: 11, y: 4, w: 1, h: 3 },
            { x: 6, y: 7, w: 4, h: 1 }
        ],
        encounterZones: [],
        rewardAnchors: [{ id: 'puzzle_reward', type: 'prop_bunker_supplies', x: 15, y: 3 }],
        loreAnchors: [],
        hazardZones: [],
        quietZones: [
            { x: 1, y: 3, w: 5, h: 5 },
            { x: 6, y: 0, w: 5, h: 3 },
            { x: 6, y: 8, w: 5, h: 3 },
            { x: 12, y: 3, w: 5, h: 5 }
        ],
        safeZone: true,
        containmentBounds: { minX: 0, minY: 0, maxX: 16, maxY: 10 },
        presentationVariants: ['off', 'powered', 'incorrect', 'solved'],
        stateVariants: ['dormant', 'questActive', 'resolved'],
        adjacency: { prefers: [], forbids: ['camp', 'reward_vault'] },
        contentBudget: { structuralLarge: 0, activityZones: 4, pickupsMin: 1, enemiesMax: 0 }
    }),
    Object.freeze({
        id: 'trap_vault',
        // Matches src/roomContent.js's ROOM_FAMILY_DEFAULT_REWARDS key
        // exactly ('trap_reward', not 'trap') — that table is already
        // shipped and keyed by this family string.
        family: 'trap_reward',
        themeStyle: 'obsidian',
        partitionThickness: 0.5,
        // P2 trap-space proof: mirrored jambs frame an obvious central lure
        // court while the west edge stays outside encounter/hazard metadata
        // and conceals the actual payoff. Geometry never changes by state.
        pattern: authoredRoomPattern([
            '.................',
            '.................',
            '.................',
            '....###...###....',
            '....#.......#....',
            '....#.......#....',
            '....#.......#....',
            '....###...###....',
            '.................',
            '.................',
            '.................'
        ]),
        sockets: [{ id: 'entry', side: 'n', width: 3, required: true }],
        rotationPolicy: 'cardinal',
        tierEligibility: [2, 3, 4],
        biomeEligibility: ['active', 'cryo', 'bio'],
        roles: ['challenge', 'reward'],
        structuralAnchors: [
            { id: 'trap_emitter_west', type: 'prop_laser_trap_emitter', x: 4, y: 5 },
            { id: 'trap_emitter_east', type: 'prop_laser_trap_emitter', x: 12, y: 5 }
        ],
        interactionAnchors: [{ id: 'false_cache', type: 'prop_bunker_supplies', x: 8, y: 5 }],
        signatureAnchorId: 'false_cache',
        compassAnchors: { approach: 'entry', objective: 'false_cache' },
        coverZones: [
            { x: 4, y: 3, w: 3, h: 1 },
            { x: 4, y: 3, w: 1, h: 5 },
            { x: 4, y: 7, w: 3, h: 1 },
            { x: 10, y: 3, w: 3, h: 1 },
            { x: 12, y: 3, w: 1, h: 5 },
            { x: 10, y: 7, w: 3, h: 1 }
        ],
        encounterZones: [{ id: 'trap_trigger', x: 5, y: 3, w: 12, h: 5 }],
        rewardAnchors: [{ id: 'trap_payoff', type: 'prop_bunker_supplies', x: 2, y: 8 }],
        loreAnchors: [],
        hazardZones: [{ id: 'spore_vent', x: 7, y: 3, w: 10, h: 5 }],
        quietZones: [
            { x: 5, y: 0, w: 7, h: 3 },
            { x: 0, y: 3, w: 4, h: 6 }
        ],
        safeZone: false,
        containmentBounds: { minX: 0, minY: 0, maxX: 16, maxY: 10 },
        presentationVariants: ['warning', 'active', 'spent'],
        stateVariants: ['dormant', 'questActive', 'resolved'],
        adjacency: { prefers: [], forbids: ['camp'] },
        contentBudget: { structuralLarge: 2, activityZones: 2, pickupsMin: 1, enemiesMax: 2 }
    }),
    Object.freeze({
        id: 'reward_cache',
        family: 'cache',
        themeStyle: 'reliquary',
        partitionThickness: 0.5,
        // P2 reward-space proof: a broken C-shaped screen blocks the cache
        // body from the south entry while leaving distinct east and west
        // approaches. The reward appears only after a lateral turn.
        pattern: authoredRoomPattern([
            '...............',
            '...............',
            '...............',
            '...............',
            '....####.......',
            '....#..........',
            '...............',
            '....######.....',
            '...............',
            '...............',
            '...............'
        ]),
        sockets: [{ id: 'entry', side: 's', width: 3, required: true }],
        rotationPolicy: 'cardinal',
        tierEligibility: [1, 2, 3, 4],
        biomeEligibility: ['active', 'cryo', 'bio'],
        roles: ['reward'],
        structuralAnchors: [],
        interactionAnchors: [{ id: 'reward_vault', type: 'prop_bunker_supplies', x: 6, y: 5 }],
        signatureAnchorId: 'reward_vault',
        compassAnchors: { approach: 'entry', objective: 'reward_vault' },
        coverZones: [
            { x: 4, y: 4, w: 4, h: 1 },
            { x: 4, y: 4, w: 1, h: 2 },
            { x: 4, y: 7, w: 6, h: 1 }
        ],
        encounterZones: [],
        rewardAnchors: [{ id: 'reward_vault', type: 'prop_bunker_supplies', x: 6, y: 5 }],
        loreAnchors: [{ id: 'cache_provenance_log', type: 'lore_terminal', x: 2, y: 5 }],
        hazardZones: [],
        quietZones: [
            { x: 4, y: 8, w: 7, h: 3 },
            { x: 5, y: 4, w: 4, h: 3 },
            { x: 1, y: 4, w: 3, h: 3 }
        ],
        safeZone: true,
        containmentBounds: { minX: 0, minY: 0, maxX: 14, maxY: 10 },
        presentationVariants: ['locked', 'unlocked', 'emptied'],
        stateVariants: ['dormant', 'questActive', 'resolved'],
        adjacency: { prefers: [], forbids: [] },
        contentBudget: { structuralLarge: 0, activityZones: 1, pickupsMin: 1, enemiesMax: 0 }
    }),
    Object.freeze({
        id: 'fire_gate_cache',
        family: 'cache',
        themeStyle: 'cryo-vault',
        partitionThickness: 0.65,
        // The cache is a closed room-within-a-room. Its single southern
        // threshold is blocked by authored meltable ice; the M-70 source is
        // on the approach side, so generation never asks for a weapon that is
        // already behind the lock it opens.
        pattern: authoredRoomPattern([
            '...............',
            '...............',
            '...#########...',
            '...#.......#...',
            '...#.......#...',
            '...#.......#...',
            '...####.####...',
            '...............',
            '...............',
            '...............',
            '...............'
        ]),
        sockets: [{ id: 'entry', side: 's', width: 3, required: true }],
        rotationPolicy: 'cardinal',
        tierEligibility: [2, 3, 4],
        biomeEligibility: ['cryo'],
        roles: ['reward'],
        structuralAnchors: [],
        interactionAnchors: [
            { id: 'fire_weapon_source', type: 'weapon_flamethrower_case', x: 10, y: 8, blocking: false },
            { id: 'fire_gate', type: 'barrier_ice_intact', x: 7, y: 6, blocking: true }
        ],
        signatureAnchorId: 'fire_cache',
        compassAnchors: { approach: 'entry', objective: 'fire_cache' },
        coverZones: [
            { x: 3, y: 2, w: 9, h: 1 },
            { x: 3, y: 3, w: 1, h: 4 },
            { x: 11, y: 3, w: 1, h: 4 }
        ],
        encounterZones: [],
        rewardAnchors: [{ id: 'fire_cache', type: 'prop_bunker_supplies', x: 7, y: 4 }],
        loreAnchors: [{ id: 'thermal_breach_log', type: 'lore_terminal', x: 9, y: 4 }],
        hazardZones: [],
        quietZones: [
            { x: 4, y: 3, w: 7, h: 3 },
            { x: 5, y: 7, w: 5, h: 4 }
        ],
        safeZone: true,
        containmentBounds: { minX: 0, minY: 0, maxX: 14, maxY: 10 },
        presentationVariants: ['frozen', 'thawing', 'breached', 'emptied'],
        stateVariants: ['dormant', 'questActive', 'resolved'],
        adjacency: { prefers: ['cryo'], forbids: ['camp'] },
        contentBudget: { structuralLarge: 0, activityZones: 2, pickupsMin: 1, enemiesMax: 0 }
    }),
    Object.freeze({
        id: 'thermal_bypass_cache',
        family: 'cache',
        themeStyle: 'cryo-service',
        partitionThickness: 0.65,
        // The frozen center seam is the fast route to the cache and north
        // threshold. A readable service lane curls around the east end of the
        // bulkhead, so arriving without fuel can never strand the run. The
        // M-70 case stays on the entry side and turns the long safe route into
        // an earned shortcut once the player understands the heat language.
        pattern: authoredRoomPattern([
            '...............',
            '...............',
            '...............',
            '...........#...',
            '...........#...',
            '#######.####...',
            '...........#...',
            '...........#...',
            '...............',
            '...............',
            '...............'
        ]),
        sockets: [
            { id: 'entry', side: 's', width: 3, required: true },
            { id: 'farSide', side: 'n', width: 3, required: false }
        ],
        rotationPolicy: 'cardinal',
        tierEligibility: [2, 3, 4],
        biomeEligibility: ['cryo'],
        roles: ['reward'],
        structuralAnchors: [],
        interactionAnchors: [
            { id: 'fire_weapon_source', type: 'weapon_flamethrower_case', x: 9, y: 8, blocking: false },
            { id: 'fire_gate', type: 'barrier_ice_intact', x: 7, y: 5, blocking: true }
        ],
        fireGateRoute: {
            sourceAnchorId: 'fire_weapon_source',
            gateAnchorId: 'fire_gate',
            objectiveAnchorId: 'thermal_bypass_cache'
        },
        signatureAnchorId: 'thermal_bypass_cache',
        compassAnchors: { approach: 'entry', objective: 'thermal_bypass_cache' },
        coverZones: [
            { x: 0, y: 5, w: 7, h: 1 },
            { x: 8, y: 5, w: 4, h: 1 },
            { x: 11, y: 3, w: 1, h: 5 }
        ],
        encounterZones: [],
        rewardAnchors: [{ id: 'thermal_bypass_cache', type: 'prop_bunker_supplies', x: 7, y: 2 }],
        loreAnchors: [{ id: 'bypass_maintenance_log', type: 'lore_terminal', x: 13, y: 5 }],
        hazardZones: [],
        quietZones: [
            { x: 4, y: 0, w: 7, h: 5 },
            { x: 5, y: 6, w: 6, h: 5 }
        ],
        safeZone: true,
        containmentBounds: { minX: 0, minY: 0, maxX: 14, maxY: 10 },
        presentationVariants: ['frozen', 'bypassed', 'breached', 'emptied'],
        stateVariants: ['dormant', 'questActive', 'resolved'],
        adjacency: { prefers: ['cryo'], forbids: ['camp'] },
        contentBudget: { structuralLarge: 0, activityZones: 2, pickupsMin: 1, enemiesMax: 0 }
    }),
    Object.freeze({
        id: 'ring_crossing_landmark',
        family: 'gate',
        themeStyle: 'cathedral',
        partitionThickness: 0.5,
        pattern: rectRoomPattern(17, 13, [
            { x: 3, y: 4, w: 2, h: 3 },
            { x: 12, y: 4, w: 2, h: 3 }
        ]),
        // Flank sockets as well as approach/far side: the route may turn or
        // branch inside a gate chunk (north in, east out), and with only a
        // straight n/s pair no rotation matched, so the crossing fell back to
        // a best-effort room with one opening unconnected -- a dead-end gate
        // room the route bypassed on the ledges outside it. Every opening now
        // gets a door; the crossing's own door is still the outward one.
        sockets: [
            { id: 'approach', side: 's', width: 3, required: true },
            { id: 'farSide', side: 'n', width: 3, required: false },
            { id: 'flankEast', side: 'e', width: 3, required: false },
            { id: 'flankWest', side: 'w', width: 3, required: false }
        ],
        rotationPolicy: 'cardinal',
        tierEligibility: [1, 2, 3, 4],
        biomeEligibility: ['active', 'cryo', 'bio'],
        roles: ['ringCrossing'],
        structuralAnchors: [{ id: 'flank_pillar_a', type: 'prop_biomech_pillar_left', x: 4, y: 5 }, { id: 'flank_pillar_b', type: 'prop_biomech_pillar_right', x: 13, y: 5 }],
        // 'base_console' is a real connected 3D GLB
        // (public/3d/runtime/console.glb); the placeholder 'console' type
        // resolved to no texture. No dedicated gate-control sprite exists
        // yet — a natural next asset (e.g. prop_hydraulic_piston_actuator
        // per docs/sprint-23-room-juice-and-dressing-assets.md).
        interactionAnchors: [{ id: 'gate_control', type: 'base_console', x: 8, y: 7 }],
        signatureAnchorId: 'gate_control',
        compassAnchors: { approach: 'approach', objective: 'gate_control' },
        coverZones: [{ x: 3, y: 4, w: 2, h: 3 }, { x: 12, y: 4, w: 2, h: 3 }],
        encounterZones: [{ id: 'gate_staging', x: 6, y: 8, w: 5, h: 4 }],
        rewardAnchors: [],
        loreAnchors: [{ id: 'gate_placard', type: 'lore_terminal', x: 8, y: 10 }],
        hazardZones: [],
        quietZones: [],
        safeZone: false,
        containmentBounds: { minX: 0, minY: 0, maxX: 16, maxY: 12 },
        presentationVariants: ['locked', 'ready', 'boss_pending', 'open'],
        stateVariants: ['dormant', 'questActive', 'resolved'],
        adjacency: { prefers: ['defensive_approach'], forbids: ['camp', 'reward_vault'] },
        contentBudget: { structuralLarge: 2, activityZones: 2, pickupsMin: 0, enemiesMax: 4 }
    }),

    // ---------------------------------------------------------------------
    // Mandatory ship-goal rooms. src/ringManifest.js MANDATORY_SHIP_GOALS
    // reserves four of these every run, keyed by roomFamily + objectiveAnchorId,
    // but only the 'o2' one had an authored room -- the other three fell back to
    // generic architecture, so three of the game's four required objectives
    // happened in an unauthored box. Each build below carries the exact
    // objectiveAnchorId that manifest names, so the reservation resolves to a
    // real point instead of a fallback.
    //
    // Every prop type here was checked against the live registry before
    // authoring. None of the 3D-only arch_* pieces are referenced: those do not
    // render yet (docs/planning/setpiece-plan-addendum-2026-09-12.md 3.1).
    // ---------------------------------------------------------------------

    Object.freeze({
        id: 'reactor_vent_station',
        family: 'engineering',
        themeStyle: 'cryo_deck',
        partitionThickness: 0.5,
        // P2 pressure-space proof: a single broken C reads as a false vent
        // throat. The west service crescent owns the objective; the east
        // route exposes the reward and encounter floor. Both rejoin north.
        pattern: authoredRoomPattern([
            '...............',
            '...............',
            '...............',
            '......####.....',
            '......#........',
            '......#........',
            '......#........',
            '......####.....',
            '...............',
            '...............',
            '...............'
        ]),
        sockets: [
            { id: 'entry', side: 's', width: 3, required: true },
            { id: 'serviceExit', side: 'n', width: 3, required: false }
        ],
        rotationPolicy: 'cardinal',
        tierEligibility: [1, 2],
        biomeEligibility: ['active', 'cryo'],
        roles: ['questDestination', 'objective'],
        structuralAnchors: [
            { id: 'vent_stack_a', type: 'prop_conduit_hub', x: 8, y: 3 },
            { id: 'vent_stack_b', type: 'prop_conduit_hub', x: 8, y: 7 }
        ],
        interactionAnchors: [
            { id: 'reactor_vent_control', type: 'prop_valve_wheel_fused', x: 4, y: 5 }
        ],
        signatureAnchorId: 'reactor_vent_control',
        compassAnchors: { approach: 'entry', objective: 'reactor_vent_control' },
        coverZones: [
            { x: 6, y: 3, w: 4, h: 1 },
            { x: 6, y: 3, w: 1, h: 5 },
            { x: 6, y: 7, w: 4, h: 1 }
        ],
        encounterZones: [{ id: 'vent_floor', x: 7, y: 3, w: 7, h: 5 }],
        rewardAnchors: [{ id: 'vent_service_cache', type: 'prop_bunker_supplies', x: 12, y: 5 }],
        loreAnchors: [{ id: 'vent_shift_log', type: 'lore_terminal', x: 2, y: 7 }],
        hazardZones: [{ id: 'steam_plume', x: 7, y: 4, w: 3, h: 3 }],
        quietZones: [
            { x: 5, y: 8, w: 5, h: 3 },
            { x: 1, y: 3, w: 5, h: 5 }
        ],
        safeZone: false,
        containmentBounds: { minX: 0, minY: 0, maxX: 14, maxY: 10 },
        presentationVariants: ['pressurized', 'venting', 'stabilized'],
        stateVariants: ['dormant', 'questActive', 'resolved'],
        adjacency: { prefers: ['service_passage', 'pressure_corridor'], forbids: ['camp'] },
        contentBudget: { structuralLarge: 2, activityZones: 2, pickupsMin: 1, enemiesMax: 3 }
    }),

    Object.freeze({
        id: 'hull_fabrication_bay',
        family: 'engineering',
        themeStyle: 'bunker',
        partitionThickness: 0.5,
        // P2 shop-floor proof: a long west press bed and unequal loading
        // shoulders compress the entry around a permanently clear process
        // line. The objective lives on the revealed east inspection strip.
        pattern: authoredRoomPattern([
            '.................',
            '.................',
            '...####..........',
            '...#.............',
            '...#.............',
            '...#.............',
            '...#.............',
            '...####..........',
            '....###....###...',
            '....###....###...',
            '.................'
        ]),
        sockets: [
            { id: 'entry', side: 's', width: 3, required: true },
            { id: 'gantryExit', side: 'n', width: 3, required: false }
        ],
        rotationPolicy: 'cardinal',
        tierEligibility: [2, 3],
        biomeEligibility: ['active', 'cryo'],
        roles: ['objective', 'questDestination'],
        structuralAnchors: [
            { id: 'hull_press_a', type: 'prop_hydraulic_piston_actuator', x: 3, y: 5 },
            { id: 'hull_press_b', type: 'prop_hydraulic_piston_actuator', x: 5, y: 2 }
        ],
        // MANDATORY_SHIP_GOALS hullExpansion -> objectiveAnchorId, exactly.
        interactionAnchors: [
            { id: 'hull_fabrication_console', type: 'prop_fabricator_workstation', x: 13, y: 6 },
            { id: 'hull_bench', type: 'prop_engineering_bench', x: 14, y: 3 }
        ],
        signatureAnchorId: 'hull_fabrication_console',
        compassAnchors: { approach: 'entry', objective: 'hull_fabrication_console' },
        coverZones: [
            { x: 2, y: 1, w: 6, h: 8 },
            { x: 3, y: 8, w: 11, h: 2 }
        ],
        encounterZones: [{ id: 'bay_floor', x: 7, y: 1, w: 4, h: 7 }],
        rewardAnchors: [{ id: 'hull_plating_cache', type: 'prop_bunker_supplies', x: 15, y: 1 }],
        loreAnchors: [{ id: 'fabrication_log', type: 'lore_terminal', x: 14, y: 8 }],
        hazardZones: [],
        quietZones: [
            { x: 12, y: 1, w: 5, h: 7 },
            { x: 7, y: 8, w: 4, h: 3 }
        ],
        safeZone: false,
        containmentBounds: { minX: 0, minY: 0, maxX: 16, maxY: 10 },
        presentationVariants: ['intact', 'abandoned', 'infested', 'looted'],
        stateVariants: ['dormant', 'questActive', 'resolved'],
        adjacency: { prefers: ['service_passage', 'pressure_corridor'], forbids: ['camp'] },
        contentBudget: { structuralLarge: 2, activityZones: 1, pickupsMin: 1, enemiesMax: 3 }
    }),

    Object.freeze({
        id: 'radar_alignment_post',
        family: 'security',
        themeStyle: 'substation',
        partitionThickness: 0.5,
        // P2 alignment proof: the west threshold looks straight into the
        // dish pedestal, while unequal calibration banks peel north and
        // south around it. Both routes permanently rejoin at the east exit.
        pattern: authoredRoomPattern([
            '...............',
            '...............',
            '...............',
            '..........###..',
            '............#..',
            '......###......',
            '........#......',
            '......###......',
            '........###....',
            '..........#....',
            '..........#....',
            '...............',
            '...............'
        ]),
        sockets: [
            { id: 'entry', side: 'w', width: 3, required: true },
            { id: 'maintenanceExit', side: 'e', width: 3, required: false }
        ],
        rotationPolicy: 'cardinal',
        tierEligibility: [3, 4],
        biomeEligibility: ['active', 'cryo', 'bio'],
        roles: ['objective', 'defense'],
        signatureAnchors: [
            // The radar stands in the open mouth of a C-shaped plinth: its
            // back wall stops the direct route without swallowing the GLB.
            { id: 'mast_base', type: 'radar', x: 7, y: 6, blocking: true }
        ],
        structuralAnchors: [
            { id: 'post_locker', type: 'prop_security_locker', x: 11, y: 3 },
            { id: 'calibration_bank', type: 'prop_cyber_junction', x: 10, y: 9 }
        ],
        // MANDATORY_SHIP_GOALS radarNode -> objectiveAnchorId, exactly.
        interactionAnchors: [
            { id: 'radar_alignment_console', type: 'prop_diagnostic_console', x: 13, y: 10 },
            { id: 'post_terminal', type: 'prop_terminal_ruptured', x: 10, y: 2 }
        ],
        signatureAnchorId: 'mast_base',
        compassAnchors: { approach: 'entry', objective: 'radar_alignment_console' },
        coverZones: [
            { x: 5, y: 4, w: 5, h: 5 },
            { x: 9, y: 2, w: 5, h: 3 },
            { x: 8, y: 8, w: 4, h: 3 }
        ],
        encounterZones: [
            { id: 'north_approach', x: 3, y: 1, w: 7, h: 4 },
            { id: 'south_approach', x: 3, y: 8, w: 7, h: 4 }
        ],
        rewardAnchors: [{ id: 'post_ammo', type: 'prop_ammo_crate_stack', x: 12, y: 8 }],
        loreAnchors: [],
        hazardZones: [],
        quietZones: [{ x: 11, y: 8, w: 4, h: 5 }],
        safeZone: false,
        containmentBounds: { minX: 0, minY: 0, maxX: 14, maxY: 12 },
        presentationVariants: ['intact', 'abandoned', 'infested', 'looted'],
        stateVariants: ['dormant', 'questActive', 'resolved'],
        adjacency: { prefers: ['defensive_approach'], forbids: ['camp'] },
        contentBudget: { structuralLarge: 2, activityZones: 2, pickupsMin: 1, enemiesMax: 4 }
    }),

    Object.freeze({
        id: 'reactor_compressor_hall',
        family: 'engineering',
        themeStyle: 'biomech',
        partitionThickness: 0.5,
        // Lane A / P0A proof: one asymmetric compressor mass replaces the
        // old six-block forest. The west side is a broad service loop; the
        // two-cell channel between core and heat shield is the risky hot-side
        // bypass. Both reconnect before the north coolant exit.
        pattern: authoredRoomPattern([
            '###................',
            '##.................',
            '#..................',
            '...................',
            '.......#####..##...',
            '......######..##...',
            '......###.....##...',
            '.......##.....##...',
            '.......##.....##...',
            '..............##...',
            '..................#',
            '.................##',
            '................###'
        ]),
        sockets: [
            { id: 'entry', side: 's', width: 3, required: true },
            { id: 'coolantExit', side: 'n', width: 3, required: false }
        ],
        rotationPolicy: 'cardinal',
        tierEligibility: [4, 5],
        biomeEligibility: ['cryo', 'bio'],
        roles: ['objective', 'defense'],
        structuralAnchors: [
            { id: 'compressor_housing', type: 'prop_conduit_hub', x: 8, y: 6 },
            { id: 'coolant_manifold', type: 'prop_conduit_hub', x: 14, y: 6 }
        ],
        // A visible hero prop in the housing recess. It is presentation data,
        // not an interaction/objective anchor, so it does not invent a second
        // gameplay prompt beside the real compressor control.
        signatureAnchors: [
            { id: 'compressor_drive', type: 'prop_tesla_coil_node', x: 10, y: 6, blocking: true }
        ],
        // MANDATORY_SHIP_GOALS reactorCompressor -> objectiveAnchorId, exactly.
        interactionAnchors: [
            { id: 'compressor_control', type: 'prop_valve_wheel_fused', x: 12, y: 3 },
            { id: 'coolant_bench', type: 'prop_engineering_bench', x: 2, y: 6 }
        ],
        signatureAnchorId: 'compressor_drive',
        compassAnchors: { approach: 'entry', objective: 'compressor_control' },
        coverZones: [{ x: 6, y: 4, w: 6, h: 5 }, { x: 14, y: 4, w: 2, h: 6 }],
        encounterZones: [{ id: 'service_loop', x: 1, y: 3, w: 5, h: 7 }],
        rewardAnchors: [{ id: 'reactor_cache', type: 'prop_bunker_supplies', x: 16, y: 10 }],
        loreAnchors: [{ id: 'reactor_log', type: 'lore_terminal', x: 1, y: 11 }],
        // The coolant plume is the hall's one persistent hazard: it reads at a
        // glance and gives the lanes a reason to matter.
        hazardZones: [{ id: 'coolant_plume', x: 12, y: 4, w: 2, h: 5 }],
        quietZones: [{ x: 7, y: 10, w: 5, h: 3 }],
        safeZone: false,
        containmentBounds: { minX: 0, minY: 0, maxX: 18, maxY: 12 },
        presentationVariants: ['intact', 'abandoned', 'infested', 'looted'],
        stateVariants: ['dormant', 'questActive', 'resolved'],
        adjacency: { prefers: ['pressure_corridor', 'boss_staging_approach'], forbids: ['camp'] },
        contentBudget: { structuralLarge: 2, activityZones: 2, pickupsMin: 1, enemiesMax: 5 }
    })
]);

export const ALL_ROOM_BUILDS = Object.freeze([...ROOM_BUILD_CATALOG, ...CATHEDRAL_ROOM_BLUEPRINTS, ...N64_ROOM_BLUEPRINTS]);
