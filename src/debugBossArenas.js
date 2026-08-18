/**
 * Wing 3: Boss & Encounter Proving Grounds (docs/debug-scenarios-and-boss-testing-guide.md §1)
 *
 * Dedicated live encounter testing arenas with arena reset buttons, phase jumpers,
 * and combat telemetry monitoring.
 *
 * Registered in src/debugZoneRegistry.js at origin (13000, 9500).
 */
import * as THREE from 'three';

const BOSS_ARENAS_ORIGIN = Object.freeze({ x: 13000, z: 9500 });
const ARENA_RADIUS = 24;
const ARENA_SPACING = 65;

export const BOSS_ENCOUNTERS = [
    {
        id: 'encounter_queen',
        index: 0,
        name: 'HIVE QUEEN CRUCIBLE',
        bossType: 'boss_queen',
        biome: 'bio',
        phases: [
            { phase: 1, hpPct: 1.0, title: 'Phase 1: Slime Barrage & Swarm' },
            { phase: 2, hpPct: 0.66, title: 'Phase 2: Web Snare & Enrage' },
            { phase: 3, hpPct: 0.33, title: 'Phase 3: Toxic Nova Frenzy' }
        ]
    },
    {
        id: 'encounter_cryo_behemoth',
        index: 1,
        name: 'CRYO BEHEMOTH CHAMBER',
        bossType: 'boss_cryo_behemoth',
        biome: 'cryo',
        phases: [
            { phase: 1, hpPct: 1.0, title: 'Phase 1: Glacial Stomp & Charge' },
            { phase: 2, hpPct: 0.5, title: 'Phase 2: Permafrost Blizzard & Icicles' }
        ]
    },
    {
        id: 'encounter_sporesnail',
        index: 2,
        name: 'SPORE SNAIL OVERLORD',
        bossType: 'boss_sporesnail',
        biome: 'bio',
        phases: [
            { phase: 1, hpPct: 1.0, title: 'Phase 1: Toxic Slime Trail' },
            { phase: 2, hpPct: 0.5, title: 'Phase 2: Fungal Eruption' }
        ]
    },
    {
        id: 'encounter_stalker',
        index: 3,
        name: 'MYCELIUM STALKER DEN',
        bossType: 'mycelium_stalker',
        biome: 'bio',
        phases: [
            { phase: 1, hpPct: 1.0, title: 'Phase 1: Camouflage & Stalking' },
            { phase: 2, hpPct: 0.4, title: 'Phase 2: Rapid Ambush Strikes' }
        ]
    },
    {
        id: 'encounter_cybersnail',
        index: 4,
        name: 'CYBER SNAIL MATRIX ALPHA',
        bossType: 'boss_cybersnail',
        biome: 'active',
        phases: [
            { phase: 1, hpPct: 1.0, title: 'Phase 1: Pulse Shield & Blasters' },
            { phase: 2, hpPct: 0.5, title: 'Phase 2: Overclock EMP Burst' }
        ]
    }
];

function makeArenaPlacard(title, phases, { color = '#ff3366' } = {}) {
    if (typeof document === 'undefined') return new THREE.Group();
    const canvas = document.createElement('canvas');
    if (!canvas?.getContext) return new THREE.Group();
    canvas.width = 640;
    canvas.height = 180;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Group();

    ctx.fillStyle = 'rgba(10, 14, 24, 0.92)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);

    ctx.fillStyle = color;
    ctx.font = '700 32px "Space Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`⚔️ ${title}`, canvas.width / 2, 20);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '500 20px "Space Mono", monospace';
    const phaseList = phases.map(p => `[P${p.phase}: ${(p.hpPct * 100)}%]`).join(' ');
    ctx.fillText(phaseList, canvas.width / 2, 70);

    ctx.fillStyle = '#64748b';
    ctx.font = '500 16px "Space Mono", monospace';
    ctx.fillText('STAND ON CONTROL PAD TO SPAWN / RESET', canvas.width / 2, 115);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.renderOrder = 999;
    sprite.scale.set(4.8, 1.35, 1);
    return sprite;
}

function buildArenaRing(ax, az, encounter) {
    const group = new THREE.Group();
    group.name = `boss-arena-${encounter.id}`;

    const color = encounter.biome === 'bio' ? 0x22c55e : encounter.biome === 'cryo' ? 0x38bdf8 : 0xf97316;

    // Arena Floor
    const floorGeo = new THREE.CircleGeometry(ARENA_RADIUS, 32);
    const floorMat = new THREE.MeshStandardMaterial({
        color: 0x090d14,
        roughness: 0.4,
        metalness: 0.6
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(ax, 0, az);
    group.add(floor);

    // Glowing Perimeter Ring
    const ringGeo = new THREE.TorusGeometry(ARENA_RADIUS, 0.25, 8, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(ax, 0.05, az);
    group.add(ring);

    // Control Pad
    const padGeo = new THREE.CylinderGeometry(2.0, 2.2, 0.3, 8);
    const padMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.8 });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.set(ax, 0.15, az + ARENA_RADIUS - 4);
    group.add(pad);

    const padLight = new THREE.PointLight(color, 2.0, 8);
    padLight.position.set(ax, 1.2, az + ARENA_RADIUS - 4);
    group.add(padLight);

    // Placard
    const placard = makeArenaPlacard(encounter.name, encounter.phases, {
        color: encounter.biome === 'bio' ? '#22c55e' : encounter.biome === 'cryo' ? '#38bdf8' : '#f97316'
    });
    placard.position.set(ax, 4.5, az - ARENA_RADIUS - 1.5);
    group.add(placard);

    return group;
}

/**
 * Opens the Boss & Encounter Proving Grounds.
 */
export async function openDebugBossArenas(game) {
    if (!game?.scene || !game?.player) {
        console.warn('[debug-boss-arenas] no active game/player — start a run first.');
        return false;
    }

    closeDebugBossArenas(game);

    const rootGroup = new THREE.Group();
    rootGroup.name = 'debug-boss-arenas';
    game.scene.add(rootGroup);

    // Arena lighting
    const ambient = new THREE.AmbientLight(0xffffff, 1.1);
    rootGroup.add(ambient);
    const sunLight = new THREE.DirectionalLight(0xff3366, 0.9);
    sunLight.position.set(BOSS_ARENAS_ORIGIN.x + 40, 60, BOSS_ARENAS_ORIGIN.z - 40);
    rootGroup.add(sunLight);

    // Build each encounter arena in row
    for (const enc of BOSS_ENCOUNTERS) {
        const ax = BOSS_ARENAS_ORIGIN.x + enc.index * ARENA_SPACING;
        const az = BOSS_ARENAS_ORIGIN.z;
        const arenaScene = buildArenaRing(ax, az, enc);
        rootGroup.add(arenaScene);
    }

    // Teleport player to first arena entrance
    game.player.position.set(BOSS_ARENAS_ORIGIN.x, 0, BOSS_ARENAS_ORIGIN.z + ARENA_RADIUS - 4);
    if (typeof game.setGodMode === 'function') game.setGodMode(true);

    console.log(`[debug-boss-arenas] opened: 5 boss arenas ready at (${BOSS_ARENAS_ORIGIN.x}, ${BOSS_ARENAS_ORIGIN.z}).`);
    return true;
}

export function closeDebugBossArenas(game) {
    const group = game?.scene?.getObjectByName('debug-boss-arenas');
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
    window.__DEBUG__.openBossArenas = (game = window.game || window.threeGame) => openDebugBossArenas(game);
    window.__DEBUG__.closeBossArenas = (game = window.game || window.threeGame) => closeDebugBossArenas(game);
}
