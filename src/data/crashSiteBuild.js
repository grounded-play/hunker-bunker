export const CRASH_SITE_BUILD_VERSION = 1;

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
        fromZ: 5,
        toZ: 18
    }),
    constructionSockets: Object.freeze([
        Object.freeze({ id: 'first-bed', kind: 'bed', x: 3.5, z: 15.5, yaw: Math.PI / 2 }),
        Object.freeze({ id: 'west-seal', kind: 'wall', x: 1.5, z: 12, yaw: Math.PI / 2 }),
        Object.freeze({ id: 'east-seal', kind: 'wall', x: 16.5, z: 12, yaw: -Math.PI / 2 })
    ])
});
