import * as THREE from 'three';
import { createWorld3dModel } from './world3dOverlay.js';

export const SHOWROOM_CHUNK_X = 500;
export const SHOWROOM_CHUNK_Y = 500;
export const SHOWROOM_CHUNK_KEY = `${SHOWROOM_CHUNK_X},${SHOWROOM_CHUNK_Y}`;

// Categorized catalog for exhibition
export const SHOWROOM_CATEGORIES = Object.freeze({
    TACTICAL_PROPS: [
        'base_console',
        'o2_generator',
        'fusion_generator',
        'hull_matrix',
        'radar',
        'prop_ammo_crate_stack',
        'prop_bunker_supplies',
        'prop_fabricator_workstation',
        'prop_tesla_coil_node',
        'prop_o2_filter_vat',
        'prop_security_barricade',
        'prop_conduit_hub',
        'prop_vital_monitor'
    ],
    BIOMECH_PROPS: [
        'prop_medical_bed',
        'prop_surgical_cart',
        'prop_diagnostic_console',
        'prop_specimen_tank',
        'prop_broken_specimen_tank',
        'prop_biomech_flesh_locker',
        'prop_biomech_incubator',
        'prop_biomech_respirator',
        'prop_biomech_triage_cradle',
        'prop_biomech_neural_synapse',
        'prop_biomech_sphincter_trap',
        'prop_laser_trap_emitter'
    ],
    SETPIECES: [
        'broken_scout_ship',
        'broken_tank_ship',
        'broken_engineer_ship',
        'prop_biomech_arch',
        'prop_cave_queen_throne',
        'prop_cave_bones',
        'storage_locker',
        'frozen_tanker',
        'basic_pile',
        'bunker_junk_rare',
        'bunker_junk_uncommon'
    ],
    ENEMIES: [
        'cryosnail',
        'sporesnail',
        'alien_proto_crawler',
        'alien_proto_spitter',
        'boss_cybersnail',
        'boss_cryosnail',
        'boss_sporesnail',
        'boss_corrupted_scout',
        'boss_corrupted_tank',
        'boss_corrupted_engineer',
        'fungal_spore_vent',
        'mycelium_stalker',
        'bio_charger',
        'spore_mortar'
    ]
});

// Helper to create a text sprite label in 3D world
function createLabelSprite(text, { color = '#00f0ff', bgColor = 'rgba(10, 16, 26, 0.85)', size = 48 } = {}) {
    if (typeof document === 'undefined') return new THREE.Group();
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Group();

    ctx.fillStyle = bgColor;
    ctx.roundRect(8, 8, 496, 112, 16);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.roundRect(8, 8, 496, 112, 16);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.font = `bold ${size}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.toUpperCase(), 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(2.4, 0.6, 1);
    return sprite;
}

// Builds the entire Showroom at (SHOWROOM_CHUNK_X, SHOWROOM_CHUNK_Y)
export async function buildShowroomScene(threeGame) {
    const root = new THREE.Group();
    root.name = 'debug-showroom-root';

    const originX = SHOWROOM_CHUNK_X * threeGame.chunkSize;
    const originZ = SHOWROOM_CHUNK_Y * threeGame.chunkSize;

    // Floor base
    const floorSize = 120;
    const floorGeo = new THREE.PlaneGeometry(floorSize, floorSize, 60, 60);
    const floorMat = new THREE.MeshStandardMaterial({
        color: 0x0a101a,
        roughness: 0.35,
        metalness: 0.8,
        wireframe: false
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(originX + floorSize * 0.5, 0, originZ + floorSize * 0.5);
    floor.receiveShadow = true;
    root.add(floor);

    // Subtle showroom grid lines
    const gridHelper = new THREE.GridHelper(floorSize, 60, 0x00f0ff, 0x1a3d8f);
    gridHelper.position.set(originX + floorSize * 0.5, 0.01, originZ + floorSize * 0.5);
    root.add(gridHelper);

    // Welcome banner at entrance
    const welcomeLabel = createLabelSprite('DEBUG VALIDATION GALLERY // CHUNK (500,500)', { color: '#00f0ff', size: 36 });
    welcomeLabel.position.set(originX + 10, 3.2, originZ + 10);
    root.add(welcomeLabel);

    const navHelpLabel = createLabelSprite('4-WALL ORIENTATION: N(0°) S(180°) E(90°) W(270°)', { color: '#ffd000', size: 32 });
    navHelpLabel.position.set(originX + 10, 2.4, originZ + 10);
    root.add(navHelpLabel);

    // Spacing between individual exhibition stalls
    const STALL_SIZE = 8; // 8x8 meter room per prop
    const STALLS_PER_ROW = 6;

    const allItems = [
        ...SHOWROOM_CATEGORIES.TACTICAL_PROPS.map((id) => ({ id, type: 'prop', category: 'TACTICAL' })),
        ...SHOWROOM_CATEGORIES.BIOMECH_PROPS.map((id) => ({ id, type: 'prop', category: 'BIOMECH' })),
        ...SHOWROOM_CATEGORIES.SETPIECES.map((id) => ({ id, type: 'prop', category: 'SETPIECE' })),
        ...SHOWROOM_CATEGORIES.ENEMIES.map((id) => ({ id, type: 'enemy', category: 'ENEMY' }))
    ];

    for (let i = 0; i < allItems.length; i++) {
        const item = allItems[i];
        const col = i % STALLS_PER_ROW;
        const row = Math.floor(i / STALLS_PER_ROW);

        const stallCenterX = originX + 12 + col * (STALL_SIZE + 4);
        const stallCenterZ = originZ + 18 + row * (STALL_SIZE + 4);

        // Stall boundaries (subtle perimeter box)
        const boxGeo = new THREE.BoxGeometry(STALL_SIZE, 0.1, STALL_SIZE);
        const boxMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.35 });
        const box = new THREE.Mesh(boxGeo, boxMat);
        box.position.set(stallCenterX, 0.05, stallCenterZ);
        root.add(box);

        // Stall title banner
        const stallLabel = createLabelSprite(item.id, {
            color: item.type === 'enemy' ? '#ff007f' : '#00f0ff',
            size: 34
        });
        stallLabel.position.set(stallCenterX, 3.0, stallCenterZ - STALL_SIZE * 0.5 + 0.5);
        root.add(stallLabel);

        // Wall offsets: N, S, E, W, and Center Pedestal
        const WALL_DIST = STALL_SIZE * 0.38;
        const placements = [
            { name: 'N', x: stallCenterX, z: stallCenterZ - WALL_DIST, yaw: 0 }, // North wall, faces South
            { name: 'S', x: stallCenterX, z: stallCenterZ + WALL_DIST, yaw: Math.PI }, // South wall, faces North
            { name: 'E', x: stallCenterX + WALL_DIST, z: stallCenterZ, yaw: -Math.PI / 2 }, // East wall, faces West
            { name: 'W', x: stallCenterX - WALL_DIST, z: stallCenterZ, yaw: Math.PI / 2 }, // West wall, faces East
            { name: 'CTR', x: stallCenterX, z: stallCenterZ, yaw: 0 } // Center pedestal
        ];

        for (const p of placements) {
            // Directional indicator floor arrow
            const markerGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.04, 16);
            const markerMat = new THREE.MeshBasicMaterial({
                color: p.name === 'CTR' ? 0xffd000 : 0x00ff66,
                transparent: true,
                opacity: 0.6
            });
            const marker = new THREE.Mesh(markerGeo, markerMat);
            marker.position.set(p.x, 0.02, p.z);
            root.add(marker);

            // Small text tag for wall direction
            const dirLabel = createLabelSprite(`${p.name}`, { color: '#ffffff', size: 28 });
            dirLabel.scale.set(0.8, 0.2, 1);
            dirLabel.position.set(p.x, 0.2, p.z + (p.name === 'N' ? 0.6 : -0.6));
            root.add(dirLabel);

            if (item.type === 'prop') {
                try {
                    const modelGroup = await createWorld3dModel(item.id);
                    if (modelGroup) {
                        modelGroup.position.set(p.x, 0, p.z);
                        modelGroup.rotation.y = p.yaw;
                        root.add(modelGroup);
                    }
                } catch (err) {
                    console.warn(`[Showroom] Failed loading prop: ${item.id}`, err);
                }
            } else if (item.type === 'enemy') {
                const enemyMesh = threeGame.createScatterMesh?.(item.id, p.x, p.z)
                    ?? threeGame.createEnemySpriteMesh?.(item.id);
                if (enemyMesh) {
                    enemyMesh.position.set(p.x, 0, p.z);
                    enemyMesh.rotation.y = p.yaw;
                    root.add(enemyMesh);
                }
            }
        }
    }

    // Showroom Lighting (clean, bright studio lighting)
    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    root.add(ambient);

    const dirLight1 = new THREE.DirectionalLight(0x00f0ff, 0.8);
    dirLight1.position.set(originX + 20, 40, originZ + 20);
    root.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffd000, 0.6);
    dirLight2.position.set(originX + 80, 40, originZ + 80);
    root.add(dirLight2);

    return {
        root,
        spawnX: originX + 10,
        spawnZ: originZ + 10
    };
}
