export const CRASH_SITE_BUILD_VERSION = 2;

const sectorZeroRooms = Object.freeze([
    Object.freeze({ id: 'impact_cradle', phase: 'phase_1_boot', left: 6, right: 12, top: 7, bottom: 14 }),
    Object.freeze({ id: 'pod_armory', phase: 'phase_2_weapon', left: 2, right: 4, top: 7, bottom: 14 }),
    Object.freeze({ id: 'salvage_bay', phase: 'phase_3_salvage', left: 14, right: 16, top: 7, bottom: 14 }),
    Object.freeze({ id: 'proving_ground', phase: 'phase_4_combat', left: 4, right: 14, top: 4, bottom: 5 }),
    Object.freeze({ id: 'departure_airlock', phase: 'phase_5_departure', left: 8, right: 10, top: 0, bottom: 3 })
]);

const sectorZeroPartitions = Object.freeze([
    // The widened openings and shifted partitions give the ship (scale 3.5, safe ring radius 2.4)
    // generous clearance and prevent cramped wall boundaries around the consoles and modules.
    Object.freeze({ axis: 'vertical', at: 5, from: 7, to: 14, openings: Object.freeze([10, 11]) }),
    Object.freeze({ axis: 'vertical', at: 13, from: 7, to: 14, openings: Object.freeze([10, 11]) }),
    Object.freeze({ axis: 'horizontal', at: 6, from: 1, to: 17, openings: Object.freeze([7, 8, 9, 10, 11]) })
]);

const sectorZeroProps = Object.freeze([
    Object.freeze({ id: 'sector_zero_pod_rack', roomId: 'pod_armory', type: 'life_supply_drop_pod', x: 3.1, z: 9.1, rotation: Math.PI / 2, scale: 0.9, solid: true }),
    Object.freeze({ id: 'sector_zero_weapon_locker', roomId: 'pod_armory', type: 'prop_security_locker', x: 3.2, z: 12.2, rotation: Math.PI / 2, scale: 0.82, solid: true }),
    Object.freeze({ id: 'jammed_hydraulic_cable', roomId: 'impact_cradle', type: 'prop_wall_cable_tray_swag', x: 9, z: 6.0, rotation: 0, scale: 1.05, hp: 1, solid: true, obstacleId: 'jammed_hydraulic_cable' }),
    Object.freeze({ id: 'sector_zero_salvage_console', roomId: 'salvage_bay', type: 'prop_diagnostic_console', x: 15.2, z: 11.4, rotation: -Math.PI / 2, scale: 0.86, solid: true }),
    Object.freeze({ id: 'sector_zero_airlock', roomId: 'departure_airlock', type: 'kit_space_gate_door', x: 9, z: 3, rotation: 0, scale: 1, solid: false }),
    Object.freeze({ id: 'sector_zero_airlock_manifold', roomId: 'departure_airlock', type: 'ind_hydraulic_manifold', x: 11.15, z: 3.75, rotation: -Math.PI / 2, scale: 0.78, solid: true })
]);

export const CRASH_SITE_BUILD = Object.freeze({
    id: 'crash-site-two-zone-v1',
    center: Object.freeze({ x: 9, z: 9 }),
    edgeOffset: 4,
    originChunk: Object.freeze({ x: 0, y: 0 }),
    approachChunk: Object.freeze({ x: 0, y: -1 }),
    primaryChamber: Object.freeze({ left: 1, right: 17, top: 4, bottom: 19 }),
    northPreHall: Object.freeze({ halfWidth: 1, top: 0, bottom: 3 }),
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
        toZ: 18
    }),
    sectorZero: Object.freeze({
        id: 'sector-zero-five-room-v1',
        rooms: sectorZeroRooms,
        partitions: sectorZeroPartitions,
        props: sectorZeroProps,
        weaponRack: Object.freeze({ x: 4.35, z: 10.4, profileId: 'mk1_sidearm' }),
        salvageCache: Object.freeze({ x: 13.75, z: 10.2, type: 'weapon', amount: 10 }),
        combatSpawn: Object.freeze({ x: 9, z: 5.25, type: 'alien_proto_crawler' }),
        departureThresholdZ: 2.75
    }),
    constructionSockets: Object.freeze([
        Object.freeze({ id: 'first-bed', kind: 'bed', x: 3.5, z: 15.5, yaw: Math.PI / 2 }),
        Object.freeze({ id: 'west-seal', kind: 'wall', x: 1.5, z: 12, yaw: Math.PI / 2 }),
        Object.freeze({ id: 'east-seal', kind: 'wall', x: 16.5, z: 12, yaw: -Math.PI / 2 }),
        Object.freeze({ id: 'base-arcade', kind: 'arcade', x: 4.5, z: 12.5, yaw: 0 })
    ])
});
