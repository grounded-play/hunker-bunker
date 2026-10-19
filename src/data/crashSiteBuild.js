export const CRASH_SITE_BUILD_VERSION = 5;

const sectorZeroRooms = Object.freeze([
    Object.freeze({ id: 'impact_cradle', phase: 'phase_1_boot', left: 2, right: 16, top: 4, bottom: 16 }),
    Object.freeze({ id: 'pod_armory', phase: 'phase_2_weapon', left: 1, right: 7, top: 18, bottom: 27 }),
    Object.freeze({ id: 'salvage_bay', phase: 'phase_3_salvage', left: 20, right: 29, top: 8, bottom: 18 }),
    Object.freeze({ id: 'proving_ground', phase: 'phase_4_combat', left: 10, right: 18, top: 18, bottom: 29 }),
    Object.freeze({ id: 'departure_airlock', phase: 'phase_5_departure', left: 7, right: 13, top: 0, bottom: 3 })
]);

const sectorZeroPartitions = Object.freeze([
    // Keep every partition outside the 11x11 ship maneuver envelope (x/z 4..14).
    // Every opening is five cells wide so authored rooms never collapse back
    // into the shoulder-width passages reported in the PC playthrough.
    Object.freeze({ axis: 'horizontal', at: 17, from: 1, to: 29, openings: Object.freeze([7, 8, 9, 10, 11]) }),
    Object.freeze({ axis: 'vertical', at: 8, from: 18, to: 28, openings: Object.freeze([21, 22, 23, 24, 25]) }),
    Object.freeze({ axis: 'vertical', at: 19, from: 7, to: 28, openings: Object.freeze([11, 12, 13, 14, 15, 21, 22, 23, 24, 25]) })
]);

const sectorZeroProps = Object.freeze([
    Object.freeze({ id: 'sector_zero_pod_rack', roomId: 'pod_armory', type: 'life_supply_drop_pod', x: 1, z: 20, rotation: Math.PI / 2, scale: 0.9, solid: true, wallNormal: Object.freeze({ x: 1, z: 0 }) }),
    Object.freeze({ id: 'sector_zero_weapon_locker', roomId: 'pod_armory', type: 'prop_security_locker', x: 1, z: 25, rotation: Math.PI / 2, scale: 0.82, solid: true, wallNormal: Object.freeze({ x: 1, z: 0 }) }),
    Object.freeze({ id: 'jammed_hydraulic_cable', roomId: 'proving_ground', type: 'prop_wall_cable_tray_swag', x: 17, z: 29, rotation: Math.PI, scale: 1.05, hp: 1, solid: true, obstacleId: 'jammed_hydraulic_cable', wallNormal: Object.freeze({ x: 0, z: -1 }) }),
    Object.freeze({ id: 'sector_zero_salvage_console', roomId: 'salvage_bay', type: 'prop_diagnostic_console', x: 29, z: 12, rotation: -Math.PI / 2, scale: 0.86, solid: true, wallNormal: Object.freeze({ x: -1, z: 0 }) }),
    Object.freeze({ id: 'sector_zero_airlock', roomId: 'departure_airlock', type: 'kit_space_gate_door', x: 9, z: 3, rotation: 0, scale: 1, solid: false }),
    Object.freeze({ id: 'sector_zero_airlock_manifold', roomId: 'departure_airlock', type: 'ind_hydraulic_manifold', x: 11, z: 1.5, rotation: -Math.PI / 2, scale: 0.78, solid: true, wallNormal: Object.freeze({ x: -1, z: 0 }) })
]);

export const CRASH_SITE_BUILD = Object.freeze({
    id: 'crash-site-two-zone-v4',
    center: Object.freeze({ x: 9, z: 9 }),
    edgeOffset: 4,
    originChunk: Object.freeze({ x: 0, y: 0 }),
    approachChunk: Object.freeze({ x: 0, y: -1 }),
    primaryChamber: Object.freeze({ left: 1, right: 29, top: 4, bottom: 29 }),
    // The boundary remains the world's standard centered OPEN3 socket. One
    // cell into the room it flares to a five-cell route.
    northPreHall: Object.freeze({ socketHalfWidth: 1, halfWidth: 2, top: 0, bottom: 3 }),
    serviceApproach: Object.freeze({
        halfWidth: 3,
        // Keep the first destination within one short hallway of the crash
        // door. The former y=9 hub made the opening approach 39 cells long.
        hub: Object.freeze({ x: 9, y: 39 }),
        releaseBounds: Object.freeze({ left: 3, right: 15, top: 34, bottom: 44 }),
        encounter: Object.freeze({ localX: 9, localY: 37, type: 'cybersnail' }),
        supplies: Object.freeze([
            Object.freeze({ id: 'first-aid', localX: 5, localY: 39, type: 'health', amount: 1 }),
            Object.freeze({ id: 'first-ammo', localX: 7, localY: 42, type: 'ammo', amount: 12 }),
            Object.freeze({ id: 'first-weapon', localX: 11, localY: 42, type: 'weapon', amount: 1 }),
            Object.freeze({ id: 'first-coin', localX: 13, localY: 39, type: 'coin', amount: 3 })
        ])
    }),
    // Ship systems are authored as part of the impact cradle, rather than
    // being inferred from an unrelated waypoint or procedural room.
    shipSystems: Object.freeze({
        roomId: 'impact_cradle',
        o2ModuleOffset: Object.freeze({ x: 3.5, z: 0.5 }),
        // The first physical rebuild part belongs to the crash-room loop,
        // not a distant procedural objective reservation.
        o2RecoveryPosition: Object.freeze({ x: 15, z: 14 })
    }),
    clearManeuverLane: Object.freeze({
        axis: 'z',
        centerX: 9,
        halfWidth: 2,
        fromZ: 4,
        toZ: 28
    }),
    sectorZero: Object.freeze({
        id: 'sector-zero-five-room-v2',
        rooms: sectorZeroRooms,
        partitions: sectorZeroPartitions,
        props: sectorZeroProps,
        jammedCablePosition: Object.freeze({ x: 17, z: 29 }),
        // The operator lands unarmed and retrieves the selected armory gun
        // beside the berth before entering the combat tutorial.
        weaponRack: Object.freeze({ x: 5, z: 15, profileId: 'mk1_sidearm' }),
        salvageCache: Object.freeze({ x: 24, z: 14, type: 'weapon', amount: 10 }),
        salvageCachePosition: Object.freeze({ x: 24, z: 14 }),
        combatSpawn: Object.freeze({ x: 14, z: 23, type: 'alien_proto_crawler' }),
        combatSpawnPosition: Object.freeze({ x: 14, z: 23 }),
        departureThresholdZ: 2.75
    }),
    constructionSockets: Object.freeze([
        Object.freeze({ id: 'first-bed', kind: 'bed', x: 2.5, z: 14.5, yaw: Math.PI / 2 }),
        Object.freeze({ id: 'west-seal', kind: 'wall', x: 1.5, z: 13, yaw: Math.PI / 2 }),
        Object.freeze({ id: 'east-seal', kind: 'wall', x: 28.5, z: 13, yaw: -Math.PI / 2 }),
        Object.freeze({ id: 'base-arcade', kind: 'arcade', x: 12.5, z: 26.5, yaw: 0 })
    ])
});
