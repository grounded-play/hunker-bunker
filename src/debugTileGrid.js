/**
 * Wing 2: Architectural & Canyon Tile Grid (docs/debug-gallery-and-architectural-grid-expansion-plan.md §3)
 *
 * Dev-only architectural proving grounds displaying room templates, canyon edge pieces,
 * camp & hive layouts, and door mechanisms over a high-visibility demo grid floor.
 *
 * Registered in src/debugZoneRegistry.js at origin (11000, 9500).
 */
import * as THREE from 'three';
import { getDebugZone } from './debugZoneRegistry.js';

const TILE_GRID_ORIGIN = Object.freeze(getDebugZone('wing2-roomgrid')
    ? { x: getDebugZone('wing2-roomgrid').originX, z: getDebugZone('wing2-roomgrid').originZ }
    : { x: 11000, z: 9500 });
const MODULE_SIZE = 32; // 32m standard chunk module footprint
const MODULE_SPACING = 40; // 8m walking corridors between modules

/**
 * Creates a high-contrast canvas texture with 1m subtle subdivisions and 32m highlighted chunk boundaries.
 */
function createDemoGridTexture() {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    if (!canvas?.getContext) return null;
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Dark slate background
    ctx.fillStyle = '#0a1017';
    ctx.fillRect(0, 0, 512, 512);

    // 1m subdivision grid lines
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
    ctx.lineWidth = 1;
    const step = 512 / 32; // 16px per meter
    for (let i = 0; i <= 512; i += step) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 512);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(512, i);
        ctx.stroke();
    }

    // 32m outer chunk border highlight
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 508, 508);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

function makeModulePlacard(title, subtitle, { color = '#00f0ff' } = {}) {
    if (typeof document === 'undefined') return new THREE.Group();
    const canvas = document.createElement('canvas');
    if (!canvas?.getContext) return new THREE.Group();
    canvas.width = 640;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Group();

    ctx.fillStyle = 'rgba(8, 14, 22, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);

    ctx.fillStyle = color;
    ctx.font = '700 36px "Space Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(title, canvas.width / 2, 24);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 24px "Space Mono", monospace';
    ctx.fillText(subtitle, canvas.width / 2, 85);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.renderOrder = 999;
    sprite.scale.set(4.0, 1.0, 1);
    return sprite;
}

/**
 * Creates boundary corner pins for visualising 32m chunk borders.
 */
function createBoundaryPins(cx, cz, size = MODULE_SIZE) {
    const group = new THREE.Group();
    const half = size / 2;
    const corners = [
        [-half, -half],
        [half, -half],
        [half, half],
        [-half, half]
    ];

    const pinGeo = new THREE.CylinderGeometry(0.15, 0.15, 2.5, 8);
    const pinMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.8 });

    corners.forEach(([ox, oz]) => {
        const pin = new THREE.Mesh(pinGeo, pinMat);
        pin.position.set(cx + ox, 1.25, cz + oz);
        group.add(pin);
    });

    return group;
}

export const TILE_GRID_MODULES = [
    // Row 0: Canyon Edges & Chasms
    {
        id: 'canyon_straight_n',
        row: 0,
        col: 0,
        title: 'CANYON EDGE: NORTH',
        subtitle: '32x32m // Straight Chasm Wall // Sockets: [E, W]',
        biome: 'cryo',
        type: 'canyon_edge',
        config: { edge: 'north', depth: 8 }
    },
    {
        id: 'canyon_corner_inner',
        row: 0,
        col: 1,
        title: 'CANYON CORNER: INNER',
        subtitle: '32x32m // 90° Interior Angle // Sockets: [S, W]',
        biome: 'cryo',
        type: 'canyon_corner',
        config: { corner: 'inner', depth: 8 }
    },
    {
        id: 'canyon_corner_outer',
        row: 0,
        col: 2,
        title: 'CANYON CORNER: OUTER',
        subtitle: '32x32m // 270° Promontory // Sockets: [N, E, S]',
        biome: 'cryo',
        type: 'canyon_promontory',
        config: { corner: 'outer', depth: 8 }
    },
    {
        id: 'canyon_chasm_bridge',
        row: 0,
        col: 3,
        title: 'CHASM & STRUT BRIDGE',
        subtitle: '32x32m // Traverse Ravine // Sockets: [N, S]',
        biome: 'cryo',
        type: 'chasm_bridge',
        config: { bridgeWidth: 4, ravineDepth: 12 }
    },

    // Row 1: Core Room Archetypes
    {
        id: 'room_cryo_lab',
        row: 1,
        col: 0,
        title: 'ROOM: CRYO LABORATORY',
        subtitle: '32x32m // Research Vault // 4 Bulkhead Sockets',
        biome: 'cryo',
        type: 'room_lab',
        config: { props: ['cryo_pod', 'terminal', 'coolant_tank'] }
    },
    {
        id: 'room_bio_hazard',
        row: 1,
        col: 1,
        title: 'ROOM: BIO-HAZARD AIRLOCK',
        subtitle: '32x32m // Decontamination Hub // Sealed Doors',
        biome: 'bio',
        type: 'room_bio',
        config: { props: ['fungal_vent', 'slime_grate', 'specimen_vat'] }
    },
    {
        id: 'room_active_industrial',
        row: 1,
        col: 2,
        title: 'ROOM: INDUSTRIAL SECTOR',
        subtitle: '32x32m // Power Hub // Heavy Machine Sockets',
        biome: 'active',
        type: 'room_industrial',
        config: { props: ['power_generator', 'crane_track', 'ore_hopper'] }
    },
    {
        id: 'room_bunker_hub',
        row: 1,
        col: 3,
        title: 'ROOM: CENTRAL BUNKER HUB',
        subtitle: '32x32m // Security & Command // Radial Sockets',
        biome: 'active',
        type: 'room_hub',
        config: { props: ['holomap_table', 'defense_turret', 'comm_relay'] }
    },

    // Row 2: Camp & Hive Layouts
    {
        id: 'layout_survivor_camp',
        row: 2,
        col: 0,
        title: 'OUTPOST: SURVIVOR CAMP',
        subtitle: '32x32m // Firepit, Stash, NPCs // Sockets: [N, S, E, W]',
        biome: 'cryo',
        type: 'survivor_camp',
        config: { hasFirepit: true, hasTrader: true, hasFabricator: true }
    },
    {
        id: 'layout_hive_heart',
        row: 2,
        col: 1,
        title: 'INFESTATION: HIVE HEART',
        subtitle: '32x32m // Spore Hive & Egg Cluster // Organic Walls',
        biome: 'bio',
        type: 'hive_heart',
        config: { eggClusterCount: 6, sporeVentCount: 4 }
    },
    {
        id: 'layout_hive_nursery',
        row: 2,
        col: 2,
        title: 'INFESTATION: HIVE NURSERY',
        subtitle: '32x32m // Larval Pods & Webbing // Bio Sockets',
        biome: 'bio',
        type: 'hive_nursery',
        config: { podCount: 8, webCoverPct: 0.65 }
    },
    {
        id: 'layout_camp_fortified',
        row: 2,
        col: 3,
        title: 'OUTPOST: FORTIFIED REDOUBT',
        subtitle: '32x32m // Barricades, Sandbags, Spotlight Turrets',
        biome: 'active',
        type: 'camp_fortified',
        config: { sandbagWalls: 4, spotlightTowers: 2 }
    },

    // Row 3: Doors, Gateways & Security Rings
    {
        id: 'door_bulkhead_closed',
        row: 3,
        col: 0,
        title: 'GATE: BULKHEAD (CLOSED)',
        subtitle: '32x32m // Heavy Blast Door // Solid Obstacle',
        biome: 'active',
        type: 'door_blast_closed',
        config: { doorState: 'closed', thickness: 1.2 }
    },
    {
        id: 'door_bulkhead_open',
        row: 3,
        col: 1,
        title: 'GATE: BULKHEAD (OPEN)',
        subtitle: '32x32m // Heavy Blast Door // Traversed Path',
        biome: 'active',
        type: 'door_blast_open',
        config: { doorState: 'open', passageWidth: 4 }
    },
    {
        id: 'door_ring_barrier_locked',
        row: 3,
        col: 2,
        title: 'RING GATE: LOCKED BARRIER',
        subtitle: '32x32m // Radial Security Field // Keycard Required',
        biome: 'cryo',
        type: 'ring_barrier_locked',
        config: { fieldColor: 0xff3344, isLocked: true }
    },
    {
        id: 'door_ring_barrier_unlocked',
        row: 3,
        col: 3,
        title: 'RING GATE: UNLOCKED PASS',
        subtitle: '32x32m // Radial Security Field // Disengaged Field',
        biome: 'cryo',
        type: 'ring_barrier_unlocked',
        config: { fieldColor: 0x00ff88, isLocked: false }
    }
];

/**
 * Builds the visual module geometry for a specific room/canyon/camp definition.
 */
function buildModuleScene(moduleDef, mx, mz) {
    const group = new THREE.Group();
    group.name = `tile-module-${moduleDef.id}`;

    // 1. Module Floor Plate with High-Visibility Grid
    const gridTexture = createDemoGridTexture();
    const floorMat = gridTexture
        ? new THREE.MeshStandardMaterial({
            map: gridTexture,
            roughness: 0.4,
            metalness: 0.6
        })
        : new THREE.MeshStandardMaterial({ color: 0x0a1017, roughness: 0.5 });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(MODULE_SIZE, MODULE_SIZE), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(mx, 0, mz);
    group.add(floor);

    // 2. Corner boundary pins
    group.add(createBoundaryPins(mx, mz, MODULE_SIZE));

    // 3. Module placard
    const placard = makeModulePlacard(moduleDef.title, moduleDef.subtitle, {
        color: moduleDef.biome === 'bio' ? '#44ff88' : moduleDef.biome === 'active' ? '#ffaa22' : '#00f0ff'
    });
    placard.position.set(mx, 4.2, mz - MODULE_SIZE / 2 - 1.2);
    group.add(placard);

    // 4. Characteristic architectural features per type
    const wallMat = new THREE.MeshStandardMaterial({
        color: moduleDef.biome === 'bio' ? 0x1a2e1a : moduleDef.biome === 'active' ? 0x2e1a10 : 0x142030,
        roughness: 0.8,
        metalness: 0.2
    });

    if (moduleDef.type === 'canyon_edge') {
        // North cliff chasm
        const chasm = new THREE.Mesh(
            new THREE.BoxGeometry(MODULE_SIZE, 8, MODULE_SIZE / 2),
            new THREE.MeshBasicMaterial({ color: 0x020406 })
        );
        chasm.position.set(mx, -4, mz - MODULE_SIZE / 4);
        group.add(chasm);

        const edgeTrim = new THREE.Mesh(
            new THREE.BoxGeometry(MODULE_SIZE, 0.4, 0.4),
            new THREE.MeshStandardMaterial({ color: 0x00f0ff })
        );
        edgeTrim.position.set(mx, 0.2, mz);
        group.add(edgeTrim);
    } else if (moduleDef.type === 'canyon_corner') {
        const cornerWall = new THREE.Mesh(
            new THREE.BoxGeometry(MODULE_SIZE / 2, 4, MODULE_SIZE / 2),
            wallMat
        );
        cornerWall.position.set(mx - MODULE_SIZE / 4, 2, mz - MODULE_SIZE / 4);
        group.add(cornerWall);
    } else if (moduleDef.type === 'survivor_camp') {
        // Central Campfire / Shelter ring
        const firePit = new THREE.Mesh(
            new THREE.CylinderGeometry(1.2, 1.4, 0.4, 8),
            new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.9 })
        );
        firePit.position.set(mx, 0.2, mz);
        group.add(firePit);

        const flame = new THREE.PointLight(0xff6600, 2.5, 12);
        flame.position.set(mx, 1.2, mz);
        group.add(flame);

        // Shelter tents / crates
        const tent = new THREE.Mesh(
            new THREE.ConeGeometry(2.5, 3.0, 4),
            new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.7 })
        );
        tent.position.set(mx + 6, 1.5, mz + 5);
        group.add(tent);
    } else if (moduleDef.type === 'hive_heart') {
        // Organic Spore Pods & Pulsing Biomass
        const hiveCore = new THREE.Mesh(
            new THREE.SphereGeometry(3.0, 16, 16),
            new THREE.MeshStandardMaterial({ color: 0x226633, roughness: 0.3, metalness: 0.4 })
        );
        hiveCore.position.set(mx, 2.0, mz);
        group.add(hiveCore);

        const bioGlow = new THREE.PointLight(0x44ff88, 3.0, 14);
        bioGlow.position.set(mx, 3.0, mz);
        group.add(bioGlow);
    } else if (moduleDef.type.startsWith('door_blast')) {
        const isOpen = moduleDef.config?.doorState === 'open';
        const doorFrame = new THREE.Mesh(
            new THREE.BoxGeometry(8, 4.5, 1.5),
            new THREE.MeshStandardMaterial({ color: 0x223344, metalness: 0.8, roughness: 0.3 })
        );
        doorFrame.position.set(mx, 2.25, mz);
        group.add(doorFrame);

        if (!isOpen) {
            const doorLeaf = new THREE.Mesh(
                new THREE.BoxGeometry(5.5, 4.0, 0.8),
                new THREE.MeshStandardMaterial({ color: 0xff4422, metalness: 0.5, roughness: 0.4 })
            );
            doorLeaf.position.set(mx, 2.0, mz);
            group.add(doorLeaf);
        }
    } else if (moduleDef.type.startsWith('ring_barrier')) {
        const isLocked = moduleDef.config?.isLocked;
        const pylonLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 5, 8), wallMat);
        pylonLeft.position.set(mx - 4, 2.5, mz);
        const pylonRight = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 5, 8), wallMat);
        pylonRight.position.set(mx + 4, 2.5, mz);
        group.add(pylonLeft, pylonRight);

        const barrierField = new THREE.Mesh(
            new THREE.PlaneGeometry(8, 4.5),
            new THREE.MeshBasicMaterial({
                color: isLocked ? 0xff2244 : 0x00ff88,
                transparent: true,
                opacity: isLocked ? 0.6 : 0.2,
                side: THREE.DoubleSide
            })
        );
        barrierField.position.set(mx, 2.25, mz);
        group.add(barrierField);
    }

    return group;
}

/**
 * Opens the Architectural & Canyon Tile Grid QA Proving Grounds.
 */
export async function openDebugTileGrid(game) {
    if (!game?.scene || !game?.player) {
        console.warn('[debug-tile-grid] no active game/player — start a run first.');
        return false;
    }

    // Ensure clean state
    closeDebugTileGrid(game);

    const rootGroup = new THREE.Group();
    rootGroup.name = 'debug-tile-grid';
    game.scene.add(rootGroup);

    // Studio lighting
    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    rootGroup.add(ambient);
    const sunLight = new THREE.DirectionalLight(0x00f0ff, 0.8);
    sunLight.position.set(TILE_GRID_ORIGIN.x + 80, 80, TILE_GRID_ORIGIN.z - 60);
    rootGroup.add(sunLight);

    // Build all registered modules in 4x4 matrix
    for (const mod of TILE_GRID_MODULES) {
        const mx = TILE_GRID_ORIGIN.x + mod.col * MODULE_SPACING;
        const mz = TILE_GRID_ORIGIN.z + mod.row * MODULE_SPACING;
        const modScene = buildModuleScene(mod, mx, mz);
        rootGroup.add(modScene);
    }

    // Teleport player to first observation pad
    game.player.position.set(TILE_GRID_ORIGIN.x, 0, TILE_GRID_ORIGIN.z + 12);
    if (typeof game.setGodMode === 'function') game.setGodMode(true);

    console.log(`[debug-tile-grid] opened: ${TILE_GRID_MODULES.length} architectural modules spawned across 4x4 grid at (${TILE_GRID_ORIGIN.x}, ${TILE_GRID_ORIGIN.z}).`);
    return true;
}

export function closeDebugTileGrid(game) {
    const group = game?.scene?.getObjectByName('debug-tile-grid');
    if (!group) return false;
    group.traverse((child) => {
        child.material?.map?.dispose?.();
        child.material?.dispose?.();
        child.geometry?.dispose?.();
    });
    game.scene.remove(group);
    return true;
}

if (typeof window !== 'undefined') {
    window.__DEBUG__ = window.__DEBUG__ || {};
    window.__DEBUG__.openTileGrid = (game = window.game || window.threeGame) => openDebugTileGrid(game);
    window.__DEBUG__.closeTileGrid = (game = window.game || window.threeGame) => closeDebugTileGrid(game);
}
