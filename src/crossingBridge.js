import * as THREE from 'three';

// The span a cleared canyon crossing lays over the chasm: steel grating deck,
// yellow safety rails on posts, amber beacons at both landings. Standard
// materials match the world's existing lit programs; the beacons are unlit
// so the bridge adds no light to the scene (a runtime light recompiles every
// lit material). Purely presentational: the crossing's door already gates
// traversal, and it opens in the same reconcile pass that builds this.
export function createCrossingBridgeMesh(span, { crossingId = null } = {}) {
    const group = new THREE.Group();
    group.name = `crossing-bridge:${crossingId ?? 'unknown'}`;
    group.userData = { kind: 'crossing-bridge', crossingId };
    group.position.set(span.center.x, 0, span.center.z);
    group.rotation.y = span.yaw;

    const deckWidth = 3.2;
    const deck = new THREE.Mesh(
        new THREE.BoxGeometry(deckWidth, 0.12, span.length),
        new THREE.MeshStandardMaterial({ color: 0x4a5560, metalness: 0.8, roughness: 0.45 })
    );
    deck.position.y = 0.06;
    deck.receiveShadow = true;
    deck.userData.part = 'deck';
    group.add(deck);

    // Grating ribs read as walkable steel instead of a grey slab.
    const ribMaterial = new THREE.MeshStandardMaterial({ color: 0x2c333a, metalness: 0.85, roughness: 0.5 });
    const ribGeometry = new THREE.BoxGeometry(deckWidth, 0.04, 0.08);
    for (let z = -span.length / 2 + 0.5; z < span.length / 2; z += 0.75) {
        const rib = new THREE.Mesh(ribGeometry, ribMaterial);
        rib.position.set(0, 0.13, z);
        group.add(rib);
    }

    const railMaterial = new THREE.MeshStandardMaterial({ color: 0xffc629, metalness: 0.4, roughness: 0.5 });
    const postGeometry = new THREE.BoxGeometry(0.08, 0.9, 0.08);
    for (const side of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, span.length), railMaterial);
        rail.position.set(side * (deckWidth / 2 - 0.05), 0.95, 0);
        rail.userData.part = 'guardrail';
        group.add(rail);
        for (let z = -span.length / 2 + 0.3; z <= span.length / 2; z += 1.5) {
            const post = new THREE.Mesh(postGeometry, railMaterial);
            post.position.set(side * (deckWidth / 2 - 0.05), 0.5, z);
            group.add(post);
        }
    }

    const beaconMaterial = new THREE.MeshBasicMaterial({ color: 0xffa200 });
    const beaconGeometry = new THREE.SphereGeometry(0.12, 10, 8);
    for (const end of [-1, 1]) {
        for (const side of [-1, 1]) {
            const beacon = new THREE.Mesh(beaconGeometry, beaconMaterial);
            beacon.position.set(side * (deckWidth / 2 - 0.05), 1.08, end * (span.length / 2 - 0.3));
            beacon.userData.part = 'beacon';
            group.add(beacon);
        }
    }
    return group;
}
