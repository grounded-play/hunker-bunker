/**
 * Wing 4: Survivor Camp & Outpost Testing Lab (docs/debug-scenarios-and-boss-testing-guide.md §2)
 *
 * Dedicated camp lifecycle simulator testing dialogue trees, trading inventory,
 * defense sieges, and outpost states.
 *
 * Registered in src/debugZoneRegistry.js at origin (15000, 9500).
 */
import * as THREE from 'three';

const CAMP_LAB_ORIGIN = Object.freeze({ x: 15000, z: 9500 });
const CAMP_FOOTPRINT = 36;
const CAMP_SPACING = 65;

export const CAMP_SCENARIOS = [
    {
        id: 'camp_uncontacted',
        index: 0,
        name: 'CAMP 1: UNCONTACTED / DARK',
        state: 'dark',
        subtitle: 'Power Offline // Generator Unrepaired // Huddled Survivors',
        biome: 'cryo',
        hasFire: false,
        isTraderOpen: false,
        isUnderSiege: false,
        themeColor: '#64748b'
    },
    {
        id: 'camp_trading_post',
        index: 1,
        name: 'CAMP 2: POWERED TRADING POST',
        state: 'active',
        subtitle: 'Power Grid Online // Trader & Fab Ready // Active Firepit',
        biome: 'cryo',
        hasFire: true,
        isTraderOpen: true,
        isUnderSiege: false,
        themeColor: '#00f0ff'
    },
    {
        id: 'camp_hive_siege',
        index: 2,
        name: 'CAMP 3: UNDER HIVE SIEGE',
        state: 'siege',
        subtitle: 'Red Alert Sirens // Perimeter Breached // Snail Wave Assault',
        biome: 'active',
        hasFire: true,
        isTraderOpen: false,
        isUnderSiege: true,
        themeColor: '#ef4444'
    },
    {
        id: 'camp_overrun_wreckage',
        index: 3,
        name: 'CAMP 4: OVERRUN / ABANDONED',
        state: 'overrun',
        subtitle: 'Extinguished Fire // Spore Infestation // Emergency Loot Crates',
        biome: 'bio',
        hasFire: false,
        isTraderOpen: false,
        isUnderSiege: false,
        themeColor: '#a855f7'
    }
];

function makeCampPlacard(title, subtitle, { color = '#00f0ff' } = {}) {
    if (typeof document === 'undefined') return new THREE.Group();
    const canvas = document.createElement('canvas');
    if (!canvas?.getContext) return new THREE.Group();
    canvas.width = 640;
    canvas.height = 170;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Group();

    ctx.fillStyle = 'rgba(10, 15, 24, 0.94)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);

    ctx.fillStyle = color;
    ctx.font = '700 30px "Space Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`⛺ ${title}`, canvas.width / 2, 20);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 20px "Space Mono", monospace';
    ctx.fillText(subtitle, canvas.width / 2, 70);

    ctx.fillStyle = '#64748b';
    ctx.font = '500 16px "Space Mono", monospace';
    ctx.fillText('WALK INTO CAMP RADIUS TO TEST SIMULATED INTERACTIONS', canvas.width / 2, 115);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.renderOrder = 999;
    sprite.scale.set(4.8, 1.28, 1);
    return sprite;
}

function buildCampScene(scenario, cx, cz) {
    const group = new THREE.Group();
    group.name = `camp-lab-${scenario.id}`;

    // Floor Base
    const floorGeo = new THREE.PlaneGeometry(CAMP_FOOTPRINT, CAMP_FOOTPRINT);
    const floorMat = new THREE.MeshStandardMaterial({
        color: scenario.state === 'overrun' ? 0x141f18 : 0x0f172a,
        roughness: 0.7,
        metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, 0, cz);
    group.add(floor);

    // Camp Center (Firepit / Generator)
    const centerPit = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 1.7, 0.4, 8),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 })
    );
    centerPit.position.set(cx, 0.2, cz);
    group.add(centerPit);

    if (scenario.hasFire) {
        const fireLight = new THREE.PointLight(
            scenario.state === 'siege' ? 0xff3322 : 0xf59e0b,
            scenario.state === 'siege' ? 3.5 : 2.5,
            16
        );
        fireLight.position.set(cx, 1.5, cz);
        group.add(fireLight);
    }

    // Placard
    const placard = makeCampPlacard(scenario.name, scenario.subtitle, { color: scenario.themeColor });
    placard.position.set(cx, 4.2, cz - CAMP_FOOTPRINT / 2 - 1.2);
    group.add(placard);

    return group;
}

/**
 * Opens the Survivor Camp & Outpost Simulator.
 */
export async function openDebugCampSimulator(game) {
    if (!game?.scene || !game?.player) {
        console.warn('[debug-camp-simulator] no active game/player — start a run first.');
        return false;
    }

    closeDebugCampSimulator(game);

    const rootGroup = new THREE.Group();
    rootGroup.name = 'debug-camp-simulator';
    game.scene.add(rootGroup);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    rootGroup.add(ambient);
    const sunLight = new THREE.DirectionalLight(0x00f0ff, 0.7);
    sunLight.position.set(CAMP_LAB_ORIGIN.x + 40, 60, CAMP_LAB_ORIGIN.z - 40);
    rootGroup.add(sunLight);

    // Build each scenario
    for (const scenario of CAMP_SCENARIOS) {
        const cx = CAMP_LAB_ORIGIN.x + scenario.index * CAMP_SPACING;
        const cz = CAMP_LAB_ORIGIN.z;
        const campScene = buildCampScene(scenario, cx, cz);
        rootGroup.add(campScene);
    }

    // Teleport player to first camp
    game.player.position.set(CAMP_LAB_ORIGIN.x, 0, CAMP_LAB_ORIGIN.z + 8);
    if (typeof game.setGodMode === 'function') game.setGodMode(true);

    console.log(`[debug-camp-simulator] opened: 4 camp state testbeds active at (${CAMP_LAB_ORIGIN.x}, ${CAMP_LAB_ORIGIN.z}).`);
    return true;
}

export function closeDebugCampSimulator(game) {
    const group = game?.scene?.getObjectByName('debug-camp-simulator');
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
    window.__DEBUG__.openCampSimulator = (game = window.game || window.threeGame) => openDebugCampSimulator(game);
    window.__DEBUG__.closeCampSimulator = (game = window.game || window.threeGame) => closeDebugCampSimulator(game);
}
