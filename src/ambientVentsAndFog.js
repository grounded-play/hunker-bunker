/**
 * Sprint 53 (L2 & L3): Ambient Vents & Floor Fog.
 *
 * L2. Ambient Vents:
 * - Active: Steam from floor grates and wall vents (low rolling hiss, then every 6-12s
 *   a burst that shoots 2-3m up with a pressure whistle and warm under-light).
 * - Cryo: Cryo frost jets (white plumes freezing into crystals, cold cyan flash on burst).
 * - Bio: Spore chimneys (slow green-glowing spore columns that drift and settle).
 * - Geothermal expedition: Fissure geysers (amber glow, rumble telegraph, column of steam
 *   and sparks, brief heat damage if player stands in it).
 * - Night: Vents carry their own dynamic pulsed light, illuminating dark rooms in pulses.
 *
 * L3. Floor Fog:
 * - Thin animated fog layer hugging the floor (y ~ 0.08) in large rooms (>= 16 tiles)
 *   and cave/canyon landforms.
 * - Thicker at night and near active vents.
 * - Instanced and pooled, only updating visible chunks.
 */

import * as THREE from 'three';

export const VENT_TYPES = Object.freeze({
    STEAM: 'steam',
    CRYO: 'cryo',
    SPORE: 'spore',
    GEYSER: 'geyser'
});

export const GEYSER_DAMAGE_RADIUS = 1.35;
export const GEYSER_DAMAGE_AMOUNT = 1;
export const GEYSER_TELEGRAPH_DURATION = 1.5;

export const VENT_PROFILES = Object.freeze({
    [VENT_TYPES.STEAM]: {
        name: 'steam',
        minInterval: 6.0,
        maxInterval: 12.0,
        burstDuration: 1.8,
        height: 2.6,
        color: 0xe0e8f0,
        glowColor: 0xffaa44,
        glowIntensity: 2.2,
        lightDistance: 7.5
    },
    [VENT_TYPES.CRYO]: {
        name: 'cryo',
        minInterval: 7.0,
        maxInterval: 11.0,
        burstDuration: 1.6,
        height: 2.4,
        color: 0xc8f0ff,
        glowColor: 0x4de8ff,
        glowIntensity: 2.4,
        lightDistance: 7.0
    },
    [VENT_TYPES.SPORE]: {
        name: 'spore',
        minInterval: 5.0,
        maxInterval: 8.5,
        burstDuration: 2.4,
        height: 2.1,
        color: 0x55ff88,
        glowColor: 0x44ff88,
        glowIntensity: 1.8,
        lightDistance: 6.5
    },
    [VENT_TYPES.GEYSER]: {
        name: 'geyser',
        minInterval: 8.0,
        maxInterval: 14.0,
        burstDuration: 2.2,
        height: 3.4,
        color: 0xff8833,
        glowColor: 0xff5511,
        glowIntensity: 3.2,
        lightDistance: 8.5
    }
});

function stableHash(x, y, seed = 0) {
    let h = (Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1274126177)) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Plan deterministic vent placements for a chunk based on its rooms and landforms.
 */
export function planChunkVents({ chunkX, chunkY, chunkSize = 49, rooms = [], landform = null, condition = null, seed = 42 }) {
    const vents = [];
    const isGeothermal = condition === 'geothermal';

    // Room vents
    for (const room of rooms) {
        const role = room?.role ?? 'generic';
        const interior = room?.interior ?? [];
        if (interior.length < 9) continue;

        const cx = room?.center?.x ?? 0;
        const cy = room?.center?.y ?? 0;
        const roomHash = stableHash(chunkX * 100 + cx, chunkY * 100 + cy, seed);
        const ventType = isGeothermal
            ? VENT_TYPES.GEYSER
            : role === 'cryo-lab' || role === 'medical'
                ? VENT_TYPES.CRYO
                : role === 'nest' || role === 'hive'
                    ? VENT_TYPES.SPORE
                    : VENT_TYPES.STEAM;

        // Utility, engineering, reactor, cryo-lab, medical, hive get vents reliably
        const isHighVentRole = (
            role === 'utility' ||
            role === 'engineering' ||
            role === 'reactor' ||
            role === 'cryo-lab' ||
            role === 'medical' ||
            role === 'hive' ||
            role === 'nest'
        );
        const ventCount = isHighVentRole
            ? (roomHash > 0.5 ? 3 : 2)
            : (roomHash > 0.35 ? 1 : 0);

        if (ventCount <= 0) continue;

        for (let i = 0; i < ventCount; i++) {
            const cellIndex = Math.floor(stableHash(chunkX * 50 + i * 17, chunkY * 50 + i * 31, seed) * interior.length);
            const cell = interior[cellIndex];
            if (!cell) continue;

            const wx = chunkX * chunkSize + cell.x + 0.5;
            const wz = chunkY * chunkSize + cell.y + 0.5;
            const profile = VENT_PROFILES[ventType];
            const interval = profile.minInterval + stableHash(cell.x, cell.y, seed + i) * (profile.maxInterval - profile.minInterval);
            const phase = stableHash(cell.y, cell.x, seed + i * 3) * interval;

            vents.push({
                id: `vent_${chunkX}_${chunkY}_${cell.x}_${cell.y}_${i}`,
                chunkKey: `${chunkX},${chunkY}`,
                x: wx,
                z: wz,
                y: 0.02,
                type: ventType,
                interval,
                phase,
                burstDuration: profile.burstDuration,
                height: profile.height,
                color: profile.color,
                glowColor: profile.glowColor,
                glowIntensity: profile.glowIntensity,
                lightDistance: profile.lightDistance
            });
        }
    }

    // Canyon and cave fissures
    if (landform === 'canyon' || landform === 'cave' || landform === 'pocket') {
        const fissureType = isGeothermal ? VENT_TYPES.GEYSER : VENT_TYPES.STEAM;
        const fissureHash = stableHash(chunkX * 73, chunkY * 89, seed);
        if (fissureHash > 0.35) {
            const count = fissureHash > 0.75 ? 2 : 1;
            for (let i = 0; i < count; i++) {
                const lx = 8 + stableHash(chunkX, i * 13, seed) * (chunkSize - 16);
                const lz = 8 + stableHash(chunkY, i * 29, seed) * (chunkSize - 16);
                const wx = chunkX * chunkSize + lx;
                const wz = chunkY * chunkSize + lz;
                const profile = VENT_PROFILES[fissureType];
                const interval = profile.minInterval + stableHash(lx, lz, seed) * (profile.maxInterval - profile.minInterval);
                const phase = stableHash(lz, lx, seed) * interval;

                vents.push({
                    id: `vent_fissure_${chunkX}_${chunkY}_${i}`,
                    chunkKey: `${chunkX},${chunkY}`,
                    x: wx,
                    z: wz,
                    y: 0.02,
                    type: fissureType,
                    interval,
                    phase,
                    burstDuration: profile.burstDuration,
                    height: profile.height,
                    color: profile.color,
                    glowColor: profile.glowColor,
                    glowIntensity: profile.glowIntensity,
                    lightDistance: profile.lightDistance
                });
            }
        }
    }

    return vents;
}

/**
 * Plan floor fog patches for large rooms (>= 16 cells) and caves/canyons.
 */
export function planChunkFloorFog({ chunkX, chunkY, chunkSize = 49, rooms = [], landform = null, biome = 'active' }) {
    const patches = [];

    // Large rooms get a floor-hugging fog patch
    for (const room of rooms) {
        const interior = room?.interior ?? [];
        if (interior.length < 16) continue;

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const cell of interior) {
            minX = Math.min(minX, cell.x);
            maxX = Math.max(maxX, cell.x);
            minY = Math.min(minY, cell.y);
            maxY = Math.max(maxY, cell.y);
        }

        const width = (maxX - minX + 1);
        const depth = (maxY - minY + 1);
        const cx = chunkX * chunkSize + (minX + maxX + 1) * 0.5;
        const cz = chunkY * chunkSize + (minY + maxY + 1) * 0.5;

        const color = biome === 'bio'
            ? 0x2e663e
            : biome === 'cryo'
                ? 0x3d7099
                : 0x485868;

        patches.push({
            id: `fog_room_${chunkX}_${chunkY}_${room.id ?? minX}`,
            chunkKey: `${chunkX},${chunkY}`,
            x: cx,
            z: cz,
            y: 0.08,
            width: width * 0.95,
            depth: depth * 0.95,
            color,
            density: interior.length >= 32 ? 0.45 : 0.32
        });
    }

    // Canyon or cave floor fog
    if (landform === 'canyon' || landform === 'cave' || landform === 'pocket') {
        const cx = chunkX * chunkSize + chunkSize * 0.5;
        const cz = chunkY * chunkSize + chunkSize * 0.5;
        const color = biome === 'bio' ? 0x224d30 : biome === 'cryo' ? 0x2c5e88 : 0x3b4d5e;
        patches.push({
            id: `fog_canyon_${chunkX}_${chunkY}`,
            chunkKey: `${chunkX},${chunkY}`,
            x: cx,
            z: cz,
            y: 0.06,
            width: chunkSize * 0.75,
            depth: chunkSize * 0.75,
            color,
            density: 0.40
        });
    }

    return patches;
}

/**
 * Creates the shader material used for instanced animated vent plume particles.
 */
export function createVentPlumeMaterial() {
    return new THREE.ShaderMaterial({
        name: 'AmbientVentPlumeMaterial',
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
        side: THREE.DoubleSide,
        uniforms: {
            uTime: { value: 0 },
            uDayBlend: { value: 1.0 }
        },
        vertexShader: `
            attribute float aBurstProgress; // 0.0 to 1.0 during active burst
            attribute vec3 aVentColor;
            attribute vec3 aGlowColor;

            varying vec2 vUv;
            varying float vProgress;
            varying vec3 vColor;
            varying vec3 vGlow;
            varying float vHeight;

            void main() {
                vUv = uv;
                vProgress = aBurstProgress;
                vColor = aVentColor;
                vGlow = aGlowColor;

                // Scale plume vertically with burst progress
                vec3 transformed = position;
                float verticalExpansion = mix(0.15, 1.0, aBurstProgress);
                float horizontalBillow = mix(0.35, 1.25, aBurstProgress);
                transformed.y *= verticalExpansion;
                transformed.x *= horizontalBillow;
                transformed.z *= horizontalBillow;

                vHeight = uv.y;
                vec4 worldPosition = instanceMatrix * vec4(transformed, 1.0);
                gl_Position = projectionMatrix * modelViewMatrix * worldPosition;
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform float uDayBlend;

            varying vec2 vUv;
            varying float vProgress;
            varying vec3 vColor;
            varying vec3 vGlow;
            varying float vHeight;

            void main() {
                if (vProgress <= 0.005) {
                    discard;
                }

                // Vertical soft billow profile
                float radial = clamp(1.0 - length(vUv - vec2(0.5, vUv.y)) * 2.0, 0.0, 1.0);
                float vertFade = smoothstep(0.0, 0.22, vHeight) * (1.0 - smoothstep(0.65, 1.0, vHeight));
                float burstEnvelope = sin(vProgress * 3.14159);

                // Subtle animated billow turbulence
                float turbulence = 0.85 + 0.15 * sin(vHeight * 12.0 - uTime * 4.0);

                float alpha = radial * vertFade * burstEnvelope * turbulence;
                if (alpha < 0.015) discard;

                // At night, vent glow contrast increases
                float nightBoost = mix(1.8, 1.0, uDayBlend);
                vec3 finalColor = mix(vColor, vGlow, (1.0 - vHeight) * 0.75) * nightBoost;

                gl_FragColor = vec4(finalColor, alpha * 0.72);
            }
        `
    });
}

/**
 * Creates the shader material for animated floor fog hugging large rooms and caves.
 */
export function createFloorFogMaterial() {
    return new THREE.ShaderMaterial({
        name: 'AmbientFloorFogMaterial',
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
        side: THREE.DoubleSide,
        uniforms: {
            uTime: { value: 0 },
            uDayBlend: { value: 1.0 }
        },
        vertexShader: `
            attribute vec3 aFogColor;
            attribute float aDensity;

            varying vec2 vUv;
            varying vec3 vFogColor;
            varying float vDensity;
            varying vec3 vWorldPos;

            void main() {
                vUv = uv;
                vFogColor = aFogColor;
                vDensity = aDensity;

                vec4 worldPosition = instanceMatrix * vec4(position, 1.0);
                vWorldPos = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * worldPosition;
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform float uDayBlend;

            varying vec2 vUv;
            varying vec3 vFogColor;
            varying float vDensity;
            varying vec3 vWorldPos;

            void main() {
                // Radial soft edge falloff so plane edges are invisible
                vec2 centered = (vUv - 0.5) * 2.0;
                float edgeFalloff = clamp(1.0 - dot(centered, centered), 0.0, 1.0);
                edgeFalloff = smoothstep(0.0, 0.55, edgeFalloff);

                // Animated gentle drifting mist layers
                float drift1 = sin(vWorldPos.x * 0.22 + uTime * 0.35) * cos(vWorldPos.z * 0.22 + uTime * 0.25);
                float drift2 = sin(vWorldPos.x * 0.45 - uTime * 0.20 + 1.2) * cos(vWorldPos.z * 0.45 + uTime * 0.30);
                float mistPattern = 0.65 + 0.35 * (drift1 * 0.6 + drift2 * 0.4);

                // L3: Thicker at night (dayBlend 0.0 = night, 1.0 = day)
                float nightDensity = mix(1.65, 0.90, uDayBlend);
                float alpha = edgeFalloff * mistPattern * vDensity * nightDensity * 0.42;

                if (alpha < 0.01) discard;

                // Color slightly tinted toward night dark cyan/blue
                vec3 nightColor = mix(vFogColor, vec3(0.15, 0.35, 0.50), (1.0 - uDayBlend) * 0.45);
                gl_FragColor = vec4(nightColor, alpha);
            }
        `
    });
}

/**
 * Ambient Vent and Floor Fog Runtime System.
 */
export class AmbientVentSystem {
    constructor(scene) {
        this.scene = scene;
        this.activeVents = new Map(); // id -> vent state
        this.chunkVents = new Map();  // chunkKey -> vent[]
        this.chunkFog = new Map();    // chunkKey -> fogPatch[]

        this.plumeMaterial = createVentPlumeMaterial();
        this.plumeGeometry = new THREE.CylinderGeometry(0.35, 0.1, 2.5, 8, 1, true);
        this.plumeGeometry.translate(0, 1.25, 0); // Origin at bottom

        // Vent base meshes (grate / mound placeholder geometry)
        this.grateGeometry = new THREE.CylinderGeometry(0.38, 0.42, 0.06, 12);
        this.grateMaterial = new THREE.MeshStandardMaterial({
            color: 0x22262a,
            roughness: 0.65,
            metalness: 0.85
        });

        this.fissureGeometry = new THREE.BoxGeometry(0.75, 0.04, 0.4);
        this.fissureMaterial = new THREE.MeshStandardMaterial({
            color: 0x1f1917,
            emissive: 0x441100,
            roughness: 0.88,
            metalness: 0.2
        });

        // Dynamic pulsed point light pool for bursting vents. Always visible,
        // idle at intensity 0: three bakes the count of visible point lights
        // into every lit shader, so toggling .visible recompiled every material
        // in view at each burst (2-10 s frames on ANGLE/D3D11, owner log
        // 2026-10-07). See also ThreeGame._ensureEnvLightPool.
        this.lightPool = [];
        this.maxDynamicLights = 3;
        for (let i = 0; i < this.maxDynamicLights; i++) {
            const light = new THREE.PointLight(0xffaa44, 0, 7.5, 1.6);
            light.name = `AmbientVentLight_${i}`;
            light.visible = true;
            if (this.scene) this.scene.add(light);
            this.lightPool.push(light);
        }

        this.lastDamageTimes = new Map();
        this.lastAudioTimes = new Map();
        this.lastTelegraphTimes = new Map();
    }

    /**
     * Build vent meshes for a chunk and register them into active systems.
     */
    buildChunkVents(group, chunkX, chunkY, metadata, grid, landform, expedition = null) {
        const chunkKey = `${chunkX},${chunkY}`;
        const condition = expedition?.condition ?? null;
        const seed = (Math.abs(chunkX * 104729) ^ Math.abs(chunkY * 7919) ^ (expedition?.seed ?? 42)) >>> 0;
        const plannedVents = planChunkVents({
            chunkX,
            chunkY,
            chunkSize: 49,
            rooms: metadata?.roomInstances ?? [],
            landform,
            condition,
            seed
        });

        if (plannedVents.length === 0) return;

        this.chunkVents.set(chunkKey, plannedVents);
        for (const v of plannedVents) {
            this.activeVents.set(v.id, {
                ...v,
                state: 'idle',
                progress: 0,
                lastBurstAt: 0,
                telegraphed: false
            });
        }

        // Add visual placeholder hardware for each vent base
        const grateMatrices = [];
        const fissureMatrices = [];

        for (const v of plannedVents) {
            const mat = new THREE.Matrix4().makeTranslation(v.x, v.y, v.z);
            if (v.type === VENT_TYPES.GEYSER) {
                fissureMatrices.push(mat);
            } else {
                grateMatrices.push(mat);
            }
        }

        if (grateMatrices.length > 0) {
            const grateMesh = new THREE.InstancedMesh(this.grateGeometry, this.grateMaterial, grateMatrices.length);
            grateMatrices.forEach((m, i) => grateMesh.setMatrixAt(i, m));
            grateMesh.instanceMatrix.needsUpdate = true;
            grateMesh.userData = { isVentHardware: true };
            group.add(grateMesh);
        }

        if (fissureMatrices.length > 0) {
            const fissureMesh = new THREE.InstancedMesh(this.fissureGeometry, this.fissureMaterial, fissureMatrices.length);
            fissureMatrices.forEach((m, i) => fissureMesh.setMatrixAt(i, m));
            fissureMesh.instanceMatrix.needsUpdate = true;
            fissureMesh.userData = { isVentHardware: true };
            group.add(fissureMesh);
        }

        // Create instanced plume mesh for this chunk
        const plumeGeom = this.plumeGeometry.clone();
        const plumeMesh = new THREE.InstancedMesh(plumeGeom, this.plumeMaterial, plannedVents.length);
        const burstProgressArray = new Float32Array(plannedVents.length);
        const ventColorArray = new Float32Array(plannedVents.length * 3);
        const glowColorArray = new Float32Array(plannedVents.length * 3);

        plannedVents.forEach((v, i) => {
            const m = new THREE.Matrix4().makeTranslation(v.x, v.y, v.z);
            plumeMesh.setMatrixAt(i, m);

            const c = new THREE.Color(v.color);
            const g = new THREE.Color(v.glowColor);
            ventColorArray[i * 3] = c.r;
            ventColorArray[i * 3 + 1] = c.g;
            ventColorArray[i * 3 + 2] = c.b;
            glowColorArray[i * 3] = g.r;
            glowColorArray[i * 3 + 1] = g.g;
            glowColorArray[i * 3 + 2] = g.b;
        });

        plumeMesh.instanceMatrix.needsUpdate = true;
        plumeMesh.geometry.setAttribute('aBurstProgress', new THREE.InstancedBufferAttribute(burstProgressArray, 1));
        plumeMesh.geometry.setAttribute('aVentColor', new THREE.InstancedBufferAttribute(ventColorArray, 3));
        plumeMesh.geometry.setAttribute('aGlowColor', new THREE.InstancedBufferAttribute(glowColorArray, 3));
        plumeMesh.userData = { isVentPlumePool: true, chunkKey, ventIds: plannedVents.map(v => v.id) };
        group.add(plumeMesh);
    }

    /**
     * Called when a chunk is unloaded.
     */
    unloadChunk(chunkKey) {
        const vents = this.chunkVents.get(chunkKey);
        if (vents) {
            for (const v of vents) {
                this.activeVents.delete(v.id);
                this.lastDamageTimes.delete(v.id);
                this.lastAudioTimes.delete(v.id);
                this.lastTelegraphTimes.delete(v.id);
            }
            this.chunkVents.delete(chunkKey);
        }
        this.chunkFog.delete(chunkKey);
    }

    clear() {
        this.chunkVents.clear();
        this.activeVents.clear();
        this.lastDamageTimes.clear();
        this.lastAudioTimes.clear();
        this.lastTelegraphTimes.clear();
        this.chunkFog.clear();
        for (const light of this.lightPool) light.intensity = 0;
    }

    /**
     * Per-frame update, only processing visible/mounted chunks (Sprint 52 perf).
     */
    update(delta, now, playerPosition, game, dayBlend = 1.0) {
        const timeSec = now * 0.001;
        if (this.plumeMaterial?.uniforms) {
            this.plumeMaterial.uniforms.uTime.value = timeSec;
            this.plumeMaterial.uniforms.uDayBlend.value = dayBlend;
        }

        // Idle dynamic lights by default (intensity only; see the constructor).
        for (const light of this.lightPool) light.intensity = 0;
        let lightIdx = 0;

        // Iterate mounted chunks
        for (const [chunkKey, vents] of this.chunkVents.entries()) {
            // Find plume mesh in chunk group
            const chunkGroup = game?.chunkMeshes?.get(chunkKey);
            if (!chunkGroup || !chunkGroup.visible) continue;

            const plumeMesh = chunkGroup.children.find(c => c.userData?.isVentPlumePool);
            const progressAttr = plumeMesh?.geometry?.getAttribute?.('aBurstProgress');

            for (let i = 0; i < vents.length; i++) {
                const vent = vents[i];
                const state = this.activeVents.get(vent.id);
                if (!state) continue;

                const cycleTime = (timeSec + vent.phase) % vent.interval;
                const isBursting = cycleTime < vent.burstDuration;
                const progress = isBursting ? (cycleTime / vent.burstDuration) : 0;

                state.progress = progress;
                if (progressAttr) {
                    progressAttr.setX(i, progress);
                }

                // Check geothermal telegraph 1.5s prior to eruption
                const timeToBurst = isBursting ? 0 : (vent.interval - cycleTime);
                if (vent.type === VENT_TYPES.GEYSER && timeToBurst <= GEYSER_TELEGRAPH_DURATION) {
                    const lastTelegraph = this.lastTelegraphTimes.get(vent.id) ?? 0;
                    if (now - lastTelegraph > 6000) {
                        this.lastTelegraphTimes.set(vent.id, now);
                        // Trigger rumble sound if near player
                        if (playerPosition) {
                            const d = Math.hypot(vent.x - playerPosition.x, vent.z - playerPosition.z);
                            if (d < 14) {
                                if (typeof window !== 'undefined' && window.AudioManager) {
                                    window.AudioManager.playMetalStress?.({ volume: 0.15, playbackRate: 0.65 });
                                }
                            }
                        }
                    }
                }

                if (isBursting) {
                    // Audio trigger on burst onset
                    const lastAudio = this.lastAudioTimes.get(vent.id) ?? 0;
                    if (now - lastAudio > 4000) {
                        this.lastAudioTimes.set(vent.id, now);
                        if (playerPosition) {
                            const dist = Math.hypot(vent.x - playerPosition.x, vent.z - playerPosition.z);
                            if (dist < 16) {
                                this.playVentBurstAudio(vent.type, dist);
                            }
                        }
                    }

                    // Dynamic light pulse for active burst
                    if (lightIdx < this.maxDynamicLights) {
                        const light = this.lightPool[lightIdx++];
                        light.position.set(vent.x, vent.y + 0.6, vent.z);
                        light.color.setHex(vent.glowColor);
                        // Night gives vents higher contrast: "Night: vents carry their own light, so a dark room is lit in pulses"
                        const nightMultiplier = THREE.MathUtils.lerp(1.75, 1.0, dayBlend);
                        const envelope = Math.sin(progress * Math.PI);
                        light.intensity = vent.glowIntensity * envelope * nightMultiplier;
                        light.distance = vent.lightDistance;
                    }

                    // Geothermal geyser damage check: brief heat damage if player is standing in it
                    if (vent.type === VENT_TYPES.GEYSER && playerPosition) {
                        const distToPlayer = Math.hypot(vent.x - playerPosition.x, vent.z - playerPosition.z);
                        if (distToPlayer <= GEYSER_DAMAGE_RADIUS) {
                            const lastDmg = this.lastDamageTimes.get(vent.id) ?? 0;
                            if (now - lastDmg >= 1200) {
                                this.lastDamageTimes.set(vent.id, now);
                                game?.takeDamage?.(GEYSER_DAMAGE_AMOUNT, 'geothermal-fissure', vent.x, vent.z);
                            }
                        }
                    }
                }
            }

            if (progressAttr) {
                progressAttr.needsUpdate = true;
            }
        }
    }

    playVentBurstAudio(type, distance) {
        if (typeof window === 'undefined' || !window.AudioManager) return;
        const volume = Math.max(0.05, Math.min(0.5, (16 - distance) / 16 * 0.35));
        if (type === VENT_TYPES.STEAM) {
            window.AudioManager.playMetalStress?.({ volume: volume * 0.8, playbackRate: 1.4 });
        } else if (type === VENT_TYPES.CRYO) {
            window.AudioManager.play?.('crystal_shatter', { volume: volume * 0.6, playbackRate: 1.3 });
        } else if (type === VENT_TYPES.SPORE) {
            window.AudioManager.play?.('hive_spores_puff', { volume: volume * 0.7, playbackRate: 0.9 });
        } else if (type === VENT_TYPES.GEYSER) {
            window.AudioManager.playMetalStress?.({ volume: volume * 1.0, playbackRate: 0.55 });
        }
    }

    dispose() {
        this.plumeGeometry?.dispose();
        this.plumeMaterial?.dispose();
        this.grateGeometry?.dispose();
        this.grateMaterial?.dispose();
        this.fissureGeometry?.dispose();
        this.fissureMaterial?.dispose();
        for (const light of this.lightPool) {
            light.removeFromParent();
            light.dispose?.();
        }
        this.lightPool = [];
        this.activeVents.clear();
        this.chunkVents.clear();
        this.chunkFog.clear();
    }
}

/**
 * Floor Fog Runtime System.
 */
export class FloorFogSystem {
    constructor() {
        this.fogMaterial = createFloorFogMaterial();
        this.chunkPatches = new Map(); // chunkKey -> patches[]
        this.planeGeometry = new THREE.PlaneGeometry(1, 1);
        this.planeGeometry.rotateX(-Math.PI / 2); // Lay flat on XZ plane
    }

    buildChunkFloorFog(group, chunkX, chunkY, metadata, grid, landform, _expedition = null) {
        const chunkKey = `${chunkX},${chunkY}`;
        const biome = metadata?.biome ?? 'active';
        const patches = planChunkFloorFog({
            chunkX,
            chunkY,
            chunkSize: 49,
            rooms: metadata?.roomInstances ?? [],
            landform,
            biome
        });

        if (patches.length === 0) return;

        this.chunkPatches.set(chunkKey, patches);

        const fogGeom = this.planeGeometry.clone();
        const instancedFog = new THREE.InstancedMesh(fogGeom, this.fogMaterial, patches.length);
        const fogColorArray = new Float32Array(patches.length * 3);
        const densityArray = new Float32Array(patches.length);

        patches.forEach((p, i) => {
            const matrix = new THREE.Matrix4();
            matrix.compose(
                new THREE.Vector3(p.x, p.y, p.z),
                new THREE.Quaternion(),
                new THREE.Vector3(p.width, 1.0, p.depth)
            );
            instancedFog.setMatrixAt(i, matrix);

            const c = new THREE.Color(p.color);
            fogColorArray[i * 3] = c.r;
            fogColorArray[i * 3 + 1] = c.g;
            fogColorArray[i * 3 + 2] = c.b;
            densityArray[i] = p.density;
        });

        instancedFog.instanceMatrix.needsUpdate = true;
        instancedFog.geometry.setAttribute('aFogColor', new THREE.InstancedBufferAttribute(fogColorArray, 3));
        instancedFog.geometry.setAttribute('aDensity', new THREE.InstancedBufferAttribute(densityArray, 1));
        instancedFog.userData = { isFloorFogPool: true, chunkKey };
        group.add(instancedFog);
    }

    unloadChunk(chunkKey) {
        this.chunkPatches.delete(chunkKey);
    }

    clear() {
        this.chunkPatches.clear();
    }

    update(delta, now, dayBlend = 1.0) {
        const timeSec = now * 0.001;
        if (this.fogMaterial?.uniforms) {
            this.fogMaterial.uniforms.uTime.value = timeSec;
            this.fogMaterial.uniforms.uDayBlend.value = dayBlend;
        }
    }

    dispose() {
        this.planeGeometry?.dispose();
        this.fogMaterial?.dispose();
        this.chunkPatches.clear();
    }
}
