import * as THREE from 'three';

/**
 * Procedural PBR Material Finishes for Hunker Bunker weapons.
 * 
 * Pure finishes (Tier 1) are applied onto the operative's base archetype weapon
 * without loading a separate 3D mesh. Bespoke 3D weapons (Tier 2 exotics) load
 * their dedicated GLBs via WEAPON_SKIN_MESHES.
 */

// Procedural pattern cache so textures are generated once and reused across weapons
const patternCache = new Map();

function generatePatternCanvas(type) {
    if (typeof document === 'undefined' || !document.createElement) return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (type === 'hazard_stripes') {
        // High-contrast diagonal caution stripes
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = '#facc15';
        ctx.lineWidth = 24;
        for (let i = -256; i < 512; i += 48) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i + 256, 256);
            ctx.stroke();
        }
    } else if (type === 'frost_rime') {
        // Translucent glacial crystalline rime
        const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
        grad.addColorStop(0, '#e0f7fa');
        grad.addColorStop(0.5, '#4dd0e1');
        grad.addColorStop(1, '#006064');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 20; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * 256, Math.random() * 256);
            ctx.lineTo(Math.random() * 256, Math.random() * 256);
            ctx.stroke();
        }
    } else if (type === 'obsidian_fracture') {
        // Polished obsidian dark glass with purple fracture micro-veins
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(20, 20); ctx.lineTo(110, 95); ctx.lineTo(190, 80); ctx.lineTo(240, 220);
        ctx.stroke();
    } else if (type === 'circuit_traces') {
        // Tech PCB traces with digital nodes
        ctx.fillStyle = '#022c22';
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 3;
        for (let y = 32; y < 256; y += 48) {
            ctx.beginPath();
            ctx.moveTo(16, y); ctx.lineTo(128, y); ctx.lineTo(160, y + 20); ctx.lineTo(240, y + 20);
            ctx.stroke();
            ctx.fillStyle = '#86efac';
            ctx.fillRect(124, y - 4, 8, 8);
        }
    }

    return canvas;
}

export function getFinishTexture(type) {
    if (!type) return null;
    if (patternCache.has(type)) return patternCache.get(type);

    const canvas = generatePatternCanvas(type);
    if (!canvas) return null;

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    patternCache.set(type, texture);
    return texture;
}

export const FINISH_DEFINITIONS = Object.freeze({
    '2200': { name: 'Chrome Plated Sidearm', color: 0xdce6ed, metalness: 1, roughness: 0.14, emissive: '#000000', emissiveIntensity: 0 },
    // 4100 Sub-Zero Frostbite (Scout)
    '4100': {
        name: 'Sub-Zero Frostbite',
        color: '#dff6ff',
        roughness: 0.3,
        metalness: 0.6,
        emissive: '#00e5ff',
        emissiveIntensity: 0.35,
        pattern: 'frost_rime'
    },
    // 4101 Hazard Stripe SMG (Scout)
    '4101': {
        name: 'Hazard Stripe',
        color: '#facc15',
        roughness: 0.65,
        metalness: 0.25,
        emissive: '#eab308',
        emissiveIntensity: 0.15,
        pattern: 'hazard_stripes'
    },
    // 4105 Obsidian Shard Sidearm (Scout)
    '4105': {
        name: 'Obsidian Shard',
        color: '#18181b',
        roughness: 0.15,
        metalness: 0.85,
        emissive: '#a855f7',
        emissiveIntensity: 0.3,
        pattern: 'obsidian_fracture'
    },
    // 4108 Glitched Circuit Bolter (Scout)
    '4108': {
        name: 'Glitched Circuit',
        color: '#064e3b',
        roughness: 0.45,
        metalness: 0.5,
        emissive: '#22c55e',
        emissiveIntensity: 0.55,
        pattern: 'circuit_traces'
    }
});

export function isMaterialFinish(skinId) {
    return Boolean(FINISH_DEFINITIONS[String(skinId)]);
}

// Track cloned materials and base states per root mesh to avoid cumulative corruption
const finishInstances = new WeakMap();

export function applyWeaponMaterialFinish(root, finishId) {
    if (!root) return false;
    const def = FINISH_DEFINITIONS[String(finishId)];
    if (!def) return false;

    let materials = finishInstances.get(root);
    if (!materials) {
        const clones = new Map();
        materials = [];
        root.traverse((mesh) => {
            if (!mesh.isMesh || !mesh.material) return;
            const clone = (source) => {
                if (!clones.has(source)) {
                    const material = source.clone();
                    clones.set(source, material);
                    materials.push({
                        material,
                        baseColor: source.color?.clone(),
                        baseRoughness: source.roughness ?? 0.5,
                        baseMetalness: source.metalness ?? 0.5,
                        baseEmissive: source.emissive?.clone() ?? new THREE.Color(0x000000),
                        baseEmissiveIntensity: source.emissiveIntensity ?? 0,
                        baseMap: source.map ?? null
                    });
                }
                return clones.get(source);
            };
            mesh.material = Array.isArray(mesh.material) ? mesh.material.map(clone) : clone(mesh.material);
        });
        finishInstances.set(root, materials);
    }

    const finishColor = new THREE.Color(def.color);
    const emissiveColor = new THREE.Color(def.emissive);
    const texture = getFinishTexture(def.pattern);

    for (const entry of materials) {
        const mat = entry.material;
        if (mat.color) {
            mat.color.copy(finishColor);
        }
        if (typeof mat.roughness === 'number') {
            mat.roughness = def.roughness;
        }
        if (typeof mat.metalness === 'number') {
            mat.metalness = def.metalness;
        }
        if (mat.emissive) {
            mat.emissive.copy(emissiveColor);
            mat.emissiveIntensity = def.emissiveIntensity;
        }
        if (texture && mat.map !== undefined) {
            mat.map = texture;
            mat.needsUpdate = true;
        }
    }

    root.userData.weaponFinish = String(finishId);
    return true;
}

export function restoreWeaponMaterialFinish(root) {
    const materials = finishInstances.get(root);
    if (!materials) return;
    for (const entry of materials) {
        const mat = entry.material;
        if (entry.baseColor && mat.color) mat.color.copy(entry.baseColor);
        if (typeof mat.roughness === 'number') mat.roughness = entry.baseRoughness;
        if (typeof mat.metalness === 'number') mat.metalness = entry.baseMetalness;
        if (entry.baseEmissive && mat.emissive) {
            mat.emissive.copy(entry.baseEmissive);
            mat.emissiveIntensity = entry.baseEmissiveIntensity;
        }
        if (mat.map !== undefined) {
            mat.map = entry.baseMap;
            mat.needsUpdate = true;
        }
    }
    delete root.userData.weaponFinish;
}

export function disposeWeaponMaterialFinish(root) {
    const materials = finishInstances.get(root);
    if (materials) {
        for (const entry of materials) entry.material.dispose();
        finishInstances.delete(root);
    }
}
