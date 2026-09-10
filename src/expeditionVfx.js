import * as THREE from 'three';

export function disposeExpeditionEffect(root) {
    root.removeFromParent();
    root.traverse((node) => {
        node.geometry?.dispose();
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        for (const material of materials) material?.dispose();
    });
}

export function createRelicPickup(item) {
    const group = new THREE.Group();
    group.name = 'RunBuildPickup';
    const color = item.rarity === 'corrupted' ? 0xff3355 : item.rarity === 'mythic' ? 0xffb53e : 0x49dfff;
    const core = new THREE.Mesh(
        item.type === 'overclock' ? new THREE.BoxGeometry(0.16, 0.24, 0.12) : new THREE.OctahedronGeometry(0.15),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.65, roughness: 0.32, metalness: 0.55 })
    );
    core.name = 'RelicCore';
    core.position.y = 0.3;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.009, 4, 32),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, depthWrite: false }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.12;
    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.055, 0.85, 8, 1, true),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.17, depthWrite: false, side: THREE.DoubleSide }));
    beacon.position.y = 0.44;
    group.add(core, ring, beacon);
    group.userData = { item, isLootPickup: true, age: 0 };
    return group;
}

export function animateRelicPickup(root, delta) {
    root.userData.age = (root.userData.age || 0) + delta;
    const core = root.getObjectByName('RelicCore');
    if (core) {
        core.rotation.y += delta * 0.8;
        core.rotation.z = Math.sin(root.userData.age * 1.2) * 0.12;
        core.position.y = 0.3 + Math.sin(root.userData.age * 2) * 0.035;
    }
}

export function createImpactBurst(random = Math.random) {
    const root = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.055, 0.07, 20),
        new THREE.MeshBasicMaterial({ color: 0xffda8c, transparent: true, opacity: 0.65, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.025;
    ring.userData = { growth: 4 };
    root.add(ring);
    for (let i = 0; i < 6; i++) {
        const angle = random() * Math.PI * 2;
        const speed = 0.7 + random() * 1.1;
        const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.025, 0),
            new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffa64b : 0xffefca, transparent: true, opacity: 0.95, depthWrite: false }));
        shard.scale.set(0.45, 2.8, 0.45);
        shard.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.cos(angle), 0.6, Math.sin(angle)).normalize());
        shard.position.y = 0.06;
        shard.userData = { vx: Math.cos(angle) * speed, vz: Math.sin(angle) * speed, vy: 0.35 + random() * 0.4, growth: 0, isSpark: true };
        root.add(shard);
    }
    root.userData = { age: 0, duration: 0.22 };
    return root;
}
