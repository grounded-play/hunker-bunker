import * as THREE from 'three';

/**
 * Paper skitter (lived-in pass 2, Part 7 ambient motion): a few loose sheets
 * lie around each "loose damp paperwork" sticker (D14, decal_paper_scatter).
 * Running past lifts them; they flutter a short way and settle flat again.
 * Every sheet in a chunk draws as one instanced mesh, and the instance buffer
 * is only rewritten while a sheet is in the air.
 */
export const PAPER_SKITTER = Object.freeze({
    sheetsPerPatch: 3,
    // Sheets lie within this many metres of their sticker's centre.
    scatterRadius: 0.55,
    // A player this close, moving at least this fast (m/s), lifts a sheet.
    kickRadius: 0.9,
    kickSpeed: 2.2,
    // No sheet ends up further than this from where it was lifted.
    maxTravel: 2.0,
    // Above the floor stickers (0.012-0.023 m) and room decals (up to 0.042 m).
    restHeight: 0.045
});
const PAPER_FAMILY = 'decal_paper_scatter';
// Paper falls slowly: gravity against its drag, and air drag on the glide.
const FALL = 5.5;
const DRAG = 1.8;
const MAX_GLIDE = 2.2;
const SETTLE_COOLDOWN = 0.6;

function seededRandom(seedText) {
    let seed = 2166136261;
    for (const char of seedText) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
    return () => {
        seed = Math.imul(seed ^ (seed >>> 15), 2246822507);
        seed = Math.imul(seed ^ (seed >>> 13), 3266489909);
        seed ^= seed >>> 16;
        return (seed >>> 0) / 4294967296;
    };
}

/** The loose sheets for a chunk's stickers (world metres), deterministic per patch. */
export function planPaperSheets(stickers = []) {
    const sheets = [];
    for (const sticker of stickers) {
        if (sticker?.family !== PAPER_FAMILY || sticker.surface !== 'floor') continue;
        const random = seededRandom(`paper:${sticker.x},${sticker.z}`);
        for (let i = 0; i < PAPER_SKITTER.sheetsPerPatch; i += 1) {
            const angle = random() * Math.PI * 2;
            const distance = Math.sqrt(random()) * PAPER_SKITTER.scatterRadius;
            const size = 0.9 + random() * 0.2;
            sheets.push({
                x: sticker.x + Math.cos(angle) * distance,
                z: sticker.z + Math.sin(angle) * distance,
                yaw: random() * Math.PI * 2,
                // A4-ish, give or take.
                width: 0.21 * size,
                length: 0.28 * size,
                phase: random() * Math.PI * 2
            });
        }
    }
    return sheets;
}

let sharedGeometry = null;
let sharedMaterial = null;
function paperTexture() {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 86;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.fillStyle = '#e8e1cf';
    context.fillRect(0, 0, 64, 86);
    // Typed lines, a header block and a water stain.
    context.fillStyle = 'rgba(40, 44, 52, 0.55)';
    context.fillRect(8, 8, 30, 5);
    for (let y = 20; y < 78; y += 6) context.fillRect(8, y, 40 + ((y * 7) % 9), 1.5);
    context.fillStyle = 'rgba(120, 96, 60, 0.18)';
    context.beginPath();
    context.arc(46, 62, 14, 0, Math.PI * 2);
    context.fill();
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}
function sheetGeometry() {
    if (!sharedGeometry) sharedGeometry = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    return sharedGeometry;
}
function sheetMaterial() {
    if (!sharedMaterial) {
        const map = paperTexture();
        sharedMaterial = new THREE.MeshStandardMaterial({
            // Old paper, not fresh: kept below white so lamps don't blow it out.
            color: map ? 0xc4bdad : 0xb8b1a1,
            map,
            roughness: 0.95,
            metalness: 0,
            side: THREE.DoubleSide
        });
        sharedMaterial.name = 'paperSkitter';
    }
    return sharedMaterial;
}

/**
 * @param {Array<object>} plannedSheets from planPaperSheets
 * @returns {{ mesh: THREE.InstancedMesh, airborne: number, update: Function, dispose: Function }}
 */
export function createPaperSkitter(plannedSheets) {
    const sheets = plannedSheets.map((sheet) => ({
        ...sheet,
        y: PAPER_SKITTER.restHeight,
        tilt: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        spin: 0,
        airborne: false,
        cooldown: 0,
        liftX: sheet.x,
        liftZ: sheet.z
    }));
    const mesh = new THREE.InstancedMesh(sheetGeometry(), sheetMaterial(), Math.max(1, sheets.length));
    mesh.count = sheets.length;
    mesh.name = 'paper-skitter';
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.userData.isPaperSkitter = true;
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const yawTurn = new THREE.Quaternion();
    const tiltTurn = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const across = new THREE.Vector3(1, 0, 0);
    const write = (sheet, index) => {
        yawTurn.setFromAxisAngle(up, sheet.yaw);
        tiltTurn.setFromAxisAngle(across, sheet.tilt);
        matrix.compose(position.set(sheet.x, sheet.y, sheet.z), yawTurn.multiply(tiltTurn), scale.set(sheet.width, 1, sheet.length));
        mesh.setMatrixAt(index, matrix);
    };
    sheets.forEach(write);
    mesh.instanceMatrix.needsUpdate = true;

    let last = null;
    let time = 0;
    const random = seededRandom(`paper-kicks:${sheets[0]?.x ?? 0},${sheets[0]?.z ?? 0}`);
    const api = {
        mesh,
        airborne: 0,
        /**
         * @param {number} delta seconds
         * @param {{x:number, z:number}} player world position
         * @param {(x:number, z:number) => boolean} isOpen whether a point is walkable floor
         */
        update(delta, player, isOpen = () => true) {
            const dt = Math.min(Math.max(Number(delta) || 0, 0), 0.05);
            time += dt;
            let vx = 0;
            let vz = 0;
            // A jump of over a metre in one frame is a teleport or a return
            // after this chunk sat idle, not a run past the papers.
            if (player && last && dt > 0 && Math.hypot(player.x - last.x, player.z - last.z) <= 1) {
                vx = (player.x - last.x) / dt;
                vz = (player.z - last.z) / dt;
            }
            if (player) last = { x: player.x, z: player.z };
            const speed = Math.hypot(vx, vz);
            let dirty = false;
            let airborne = 0;
            sheets.forEach((sheet, index) => {
                if (sheet.cooldown > 0) sheet.cooldown -= dt;
                if (!sheet.airborne) {
                    if (!player || speed < PAPER_SKITTER.kickSpeed || sheet.cooldown > 0) return;
                    const awayX = sheet.x - player.x;
                    const awayZ = sheet.z - player.z;
                    const distance = Math.hypot(awayX, awayZ);
                    if (distance > PAPER_SKITTER.kickRadius) return;
                    // Lifted away from the runner and dragged along in their wake.
                    const push = 0.9 + random() * 0.7;
                    const dirX = awayX / Math.max(distance, 1e-3) + (vx / speed) * 0.6;
                    const dirZ = awayZ / Math.max(distance, 1e-3) + (vz / speed) * 0.6;
                    const length = Math.hypot(dirX, dirZ) || 1;
                    sheet.vx = (dirX / length) * push + vx * 0.25;
                    sheet.vz = (dirZ / length) * push + vz * 0.25;
                    const glide = Math.hypot(sheet.vx, sheet.vz);
                    if (glide > MAX_GLIDE) {
                        sheet.vx *= MAX_GLIDE / glide;
                        sheet.vz *= MAX_GLIDE / glide;
                    }
                    sheet.vy = 1.0 + random() * 0.8;
                    sheet.spin = (random() - 0.5) * 14;
                    sheet.airborne = true;
                    sheet.liftX = sheet.x;
                    sheet.liftZ = sheet.z;
                }
                // Flutter: the glide wanders side to side as the sheet turns.
                const flutter = Math.sin(time * 11 + sheet.phase) * 0.6 * dt;
                sheet.vy -= FALL * dt;
                const drag = Math.exp(-DRAG * dt);
                sheet.vx = sheet.vx * drag + flutter * Math.cos(sheet.yaw);
                sheet.vz = sheet.vz * drag + flutter * Math.sin(sheet.yaw);
                const nextX = sheet.x + sheet.vx * dt;
                const nextZ = sheet.z + sheet.vz * dt;
                const withinReach = (x, z) => Math.hypot(x - sheet.liftX, z - sheet.liftZ) < PAPER_SKITTER.maxTravel * 0.9;
                if (isOpen(nextX, sheet.z) && withinReach(nextX, sheet.z)) sheet.x = nextX;
                else sheet.vx = 0;
                if (isOpen(sheet.x, nextZ) && withinReach(sheet.x, nextZ)) sheet.z = nextZ;
                else sheet.vz = 0;
                sheet.y += sheet.vy * dt;
                sheet.tilt += sheet.spin * dt;
                sheet.yaw += sheet.spin * 0.15 * dt;
                if (sheet.y <= PAPER_SKITTER.restHeight && sheet.vy < 0) {
                    // Down flat, face up or face down.
                    sheet.y = PAPER_SKITTER.restHeight;
                    sheet.tilt = Math.round(sheet.tilt / Math.PI) * Math.PI;
                    sheet.vx = 0;
                    sheet.vy = 0;
                    sheet.vz = 0;
                    sheet.airborne = false;
                    sheet.cooldown = SETTLE_COOLDOWN;
                } else {
                    airborne += 1;
                }
                write(sheet, index);
                dirty = true;
            });
            api.airborne = airborne;
            if (dirty) mesh.instanceMatrix.needsUpdate = true;
        },
        dispose() {
            mesh.removeFromParent();
            mesh.dispose();
        }
    };
    return api;
}
