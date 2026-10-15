import * as THREE from 'three';

const DEFAULT_SOCKET_COLOR = 0x38bdf8; // Cyber cyan
const ACTIVE_SOCKET_COLOR = 0x34d399;  // Vibrant mint green when in zone / ready to place
const CARRY_ALERT_COLOR = 0x67e8f9;    // Bright cyan when carrying target object

/**
 * Creates a glowing holographic placement zone for the cot bed (or any base socket).
 * Features a glowing ground ring, holographic bed wireframe footprint, vertical beacon,
 * point light, and dynamic pulse animations so players instantly see where to place cargo.
 */
export function createBedInstallSocketVisual({
    label = 'SLEEP BAY // PLACE BED HERE',
    width = 0.88,
    length = 1.8,
    height = 0.36
} = {}) {
    const root = new THREE.Group();
    root.name = 'BedInstallSocketVisual';
    root.userData.isBedInstallSocketVisual = true;

    // 1. Ground glowing rings (additive blending)
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: DEFAULT_SOCKET_COLOR,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    const outerRing = new THREE.Mesh(new THREE.RingGeometry(1.05, 1.25, 40), ringMaterial);
    outerRing.rotation.x = -Math.PI / 2;
    outerRing.position.y = 0.035;

    const innerRingMaterial = ringMaterial.clone();
    innerRingMaterial.opacity = 0.45;
    const innerRing = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.7, 32), innerRingMaterial);
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = 0.038;

    // 2. Holographic bed footprint outline (wireframe silhouette of cot bed)
    const boxGeo = new THREE.BoxGeometry(width, height, length);
    const edgesGeo = new THREE.EdgesGeometry(boxGeo);
    const wireMaterial = new THREE.LineBasicMaterial({
        color: DEFAULT_SOCKET_COLOR,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const wireframe = new THREE.LineSegments(edgesGeo, wireMaterial);
    wireframe.position.y = height / 2 + 0.04;

    // Translucent top pad indicating bed surface
    const padMaterial = new THREE.MeshBasicMaterial({
        color: DEFAULT_SOCKET_COLOR,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    const padMesh = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.04, length - 0.04), padMaterial);
    padMesh.rotation.x = -Math.PI / 2;
    padMesh.position.y = height + 0.04;

    // 3. Vertical soft holographic light column
    const pillarMaterial = new THREE.MeshBasicMaterial({
        color: DEFAULT_SOCKET_COLOR,
        transparent: true,
        opacity: 0.14,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 2.0, 16, 1, true), pillarMaterial);
    pillar.position.y = 1.0;

    // 4. Floating downward chevron pointer
    const chevronGeo = new THREE.ConeGeometry(0.18, 0.35, 4);
    const chevronMaterial = new THREE.MeshBasicMaterial({
        color: DEFAULT_SOCKET_COLOR,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const chevron = new THREE.Mesh(chevronGeo, chevronMaterial);
    chevron.rotation.x = Math.PI; // point downwards
    chevron.position.y = 1.45;

    // 5. Point light casting subtle ambient illumination on surrounding floor & bulkhead
    const light = new THREE.PointLight(DEFAULT_SOCKET_COLOR, 0.9, 3.8, 2);
    light.position.set(0, 0.7, 0);
    light.castShadow = false;

    // 6. Floating 2D canvas marker sprite
    let labelSprite = null;
    let spriteMaterial = null;
    let spriteTex = null;
    if (typeof document !== 'undefined') {
        const spriteCanvas = document.createElement('canvas');
        spriteCanvas.width = 512;
        spriteCanvas.height = 128;
        const ctx = spriteCanvas.getContext?.('2d');
        if (ctx) {
            ctx.fillStyle = 'rgba(6, 18, 30, 0.78)';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.roundRect?.(16, 16, 480, 96, 16);
            ctx.fill();
            ctx.stroke();

            ctx.font = 'bold 30px monospace, "Courier New", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#67e8f9';
            ctx.fillText(label, 256, 64);
        }
        spriteTex = new THREE.CanvasTexture(spriteCanvas);
        spriteTex.minFilter = THREE.LinearFilter;
        spriteMaterial = new THREE.SpriteMaterial({
            map: spriteTex,
            transparent: true,
            opacity: 0.88,
            depthWrite: false
        });
        labelSprite = new THREE.Sprite(spriteMaterial);
        labelSprite.scale.set(1.9, 0.48, 1);
        labelSprite.position.set(0, 1.85, 0);
        root.add(labelSprite);
    }

    root.add(outerRing, innerRing, wireframe, padMesh, pillar, chevron, light);

    root.userData = {
        isBedInstallSocketVisual: true,
        outerRing,
        innerRing,
        ringMaterial,
        innerRingMaterial,
        wireframe,
        boxGeo,
        edgesGeo,
        wireMaterial,
        padMesh,
        padMaterial,
        pillar,
        pillarMaterial,
        chevron,
        chevronGeo,
        chevronMaterial,
        light,
        labelSprite,
        spriteMaterial,
        spriteTex
    };

    return root;
}

/**
 * Updates the holographic socket spot presentation.
 */
export function updateBedInstallSocketVisual(root, {
    isNear = false,
    isCarryingTarget = false,
    elapsedSeconds = 0,
    visible = true
} = {}) {
    if (!root?.userData?.isBedInstallSocketVisual) return false;
    root.visible = Boolean(visible);
    if (!visible) return true;

    const pulseSpeed = isCarryingTarget ? (isNear ? 5.5 : 4.0) : 2.2;
    const pulse = 0.5 + 0.5 * Math.sin(elapsedSeconds * pulseSpeed);
    const targetColorHex = isNear
        ? ACTIVE_SOCKET_COLOR
        : (isCarryingTarget ? CARRY_ALERT_COLOR : DEFAULT_SOCKET_COLOR);

    const {
        ringMaterial,
        innerRingMaterial,
        wireMaterial,
        padMaterial,
        pillarMaterial,
        chevronMaterial,
        chevron,
        light,
        outerRing,
        innerRing,
        labelSprite
    } = root.userData;

    ringMaterial.color.setHex(targetColorHex);
    innerRingMaterial.color.setHex(targetColorHex);
    wireMaterial.color.setHex(targetColorHex);
    padMaterial.color.setHex(targetColorHex);
    pillarMaterial.color.setHex(targetColorHex);
    chevronMaterial.color.setHex(targetColorHex);
    light.color.setHex(targetColorHex);

    // Dynamic light intensity
    const baseIntensity = isNear ? 1.6 : (isCarryingTarget ? 1.3 : 0.85);
    light.intensity = baseIntensity + pulse * 0.5;

    // Opacity modulation
    ringMaterial.opacity = (isNear ? 0.85 : 0.65) + pulse * 0.2;
    innerRingMaterial.opacity = (isNear ? 0.6 : 0.35) + pulse * 0.2;
    wireMaterial.opacity = (isNear ? 0.95 : 0.75) + pulse * 0.2;
    padMaterial.opacity = (isNear ? 0.35 : 0.16) + pulse * 0.12;
    pillarMaterial.opacity = (isNear ? 0.22 : 0.12) + pulse * 0.08;

    // Rings subtle scale expansion
    const scaleFactor = 1.0 + (isNear ? pulse * 0.06 : pulse * 0.03);
    outerRing.scale.set(scaleFactor, scaleFactor, 1);
    innerRing.scale.set(scaleFactor, scaleFactor, 1);

    // Chevron bobbing
    chevron.position.y = 1.35 + Math.sin(elapsedSeconds * 3.4) * 0.1;
    if (labelSprite) labelSprite.position.y = 1.85 + Math.sin(elapsedSeconds * 2.8) * 0.05;

    return true;
}

/**
 * Cleanly disposes of all geometries and materials for the socket spot.
 */
export function disposeBedInstallSocketVisual(root) {
    if (!root) return;
    const {
        outerRing,
        innerRing,
        ringMaterial,
        innerRingMaterial,
        boxGeo,
        edgesGeo,
        wireMaterial,
        padMesh,
        padMaterial,
        pillar,
        pillarMaterial,
        chevronGeo,
        chevronMaterial,
        labelSprite,
        spriteMaterial,
        spriteTex
    } = root.userData || {};

    outerRing?.geometry?.dispose();
    innerRing?.geometry?.dispose();
    ringMaterial?.dispose();
    innerRingMaterial?.dispose();
    boxGeo?.dispose();
    edgesGeo?.dispose();
    wireMaterial?.dispose();
    padMesh?.geometry?.dispose();
    padMaterial?.dispose();
    pillar?.geometry?.dispose();
    pillarMaterial?.dispose();
    chevronGeo?.dispose();
    chevronMaterial?.dispose();
    labelSprite?.geometry?.dispose();
    spriteMaterial?.dispose();
    spriteTex?.dispose();

    root.removeFromParent?.();
}
