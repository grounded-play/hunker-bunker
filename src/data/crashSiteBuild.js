export const CRASH_SITE_BUILD_VERSION = 3;

const sectorZeroRooms = Object.freeze([
    Object.freeze({ id: 'impact_cradle', phase: 'phase_1_boot', left: 4, right: 14, top: 4, bottom: 15 }),
    Object.freeze({ id: 'pod_armory', phase: 'phase_2_weapon', left: 2, right: 7, top: 18, bottom: 27 }),
    Object.freeze({ id: 'salvage_bay', phase: 'phase_3_salvage', left: 20, right: 28, top: 8, bottom: 18 }),
    Object.freeze({ id: 'proving_ground', phase: 'phase_4_combat', left: 10, right: 18, top: 18, bottom: 27 }),
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
    Object.freeze({ id: 'sector_zero_pod_rack', roomId: 'pod_armory', type: 'life_supply_drop_pod', x: 4, z: 20, rotation: Math.PI / 2, scale: 0.9, solid: true }),
    Object.freeze({ id: 'sector_zero_weapon_locker', roomId: 'pod_armory', type: 'prop_security_locker', x: 4, z: 25, rotation: Math.PI / 2, scale: 0.82, solid: true }),
    Object.freeze({ id: 'jammed_hydraulic_cable', roomId: 'proving_ground', type: 'prop_wall_cable_tray_swag', x: 17.2, z: 19, rotation: -Math.PI / 2, scale: 1.05, hp: 1, solid: true, obstacleId: 'jammed_hydraulic_cable' }),
    Object.freeze({ id: 'sector_zero_salvage_console', roomId: 'salvage_bay', type: 'prop_diagnostic_console', x: 24, z: 12, rotation: -Math.PI / 2, scale: 0.86, solid: true }),
    Object.freeze({ id: 'sector_zero_airlock', roomId: 'departure_airlock', type: 'kit_space_gate_door', x: 9, z: 3, rotation: 0, scale: 1, solid: false }),
    Object.freeze({ id: 'sector_zero_airlock_manifold', roomId: 'departure_airlock', type: 'ind_hydraulic_manifold', x: 12.2, z: 1.5, rotation: -Math.PI / 2, scale: 0.78, solid: true })
]);

export const CRASH_SITE_BUILD = Object.freeze({
    id: 'crash-site-two-zone-v2',
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
        hub: Object.freeze({ x: 9, y: 9 }),
        releaseBounds: Object.freeze({ left: 5, right: 13, top: 6, bottom: 12 })
    }),
    clearManeuverLane: Object.freeze({
        axis: 'z',
        centerX: 9,
        halfWidth: 2,
        fromZ: 4,
        toZ: 28
    }),
    sectorZero: Object.freeze({
        id: 'sector-zero-five-room-v1',
        rooms: sectorZeroRooms,
        partitions: sectorZeroPartitions,
        props: sectorZeroProps,
        jammedCablePosition: Object.freeze({ x: 17.2, z: 19 }),
        weaponRack: Object.freeze({ x: 5.5, z: 22.5, profileId: 'mk1_sidearm' }),
        salvageCache: Object.freeze({ x: 24, z: 14, type: 'weapon', amount: 10 }),
        salvageCachePosition: Object.freeze({ x: 24, z: 14 }),
        combatSpawn: Object.freeze({ x: 14, z: 23, type: 'alien_proto_crawler' }),
        combatSpawnPosition: Object.freeze({ x: 14, z: 23 }),
        departureThresholdZ: 2.75
    }),
    constructionSockets: Object.freeze([
        Object.freeze({ id: 'first-bed', kind: 'bed', x: 3.5, z: 15.5, yaw: Math.PI / 2 }),
        Object.freeze({ id: 'west-seal', kind: 'wall', x: 1.5, z: 13, yaw: Math.PI / 2 }),
        Object.freeze({ id: 'east-seal', kind: 'wall', x: 28.5, z: 13, yaw: -Math.PI / 2 }),
        Object.freeze({ id: 'base-arcade', kind: 'arcade', x: 12.5, z: 26.5, yaw: 0 })
    ])
});
