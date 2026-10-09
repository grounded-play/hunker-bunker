import * as THREE from 'three';

// Runtime contract for authored prop effects. Blender exports may contain
// empties with these names; until an asset is re-authored, each effect uses
// the normalized fallback position in its profile.
export const PROP_FX_ANCHORS = Object.freeze({
    LIGHT: 'FX_LIGHT_00',
    FLAME: 'FX_FLAME_00',
    SMOKE: 'FX_SMOKE_00',
    WATER: 'FX_WATER_SURFACE',
    BUBBLES: 'FX_BUBBLE_VOLUME',
    STEAM: 'FX_STEAM_00',
    GLOW: 'FX_GLOW_00',
    SPARKS: 'FX_SPARKS_00',
    SPORES: 'FX_SPORES_00'
});

const profile = (value) => Object.freeze({
    maxDistance: 24,
    ...value,
    effects: Object.freeze((value.effects ?? []).map((effect) => Object.freeze({ ...effect }))),
    light: value.light ? Object.freeze({ ...value.light }) : null,
    motion: value.motion ? Object.freeze({ ...value.motion }) : null
});

const atBounds = (kind, bounds, values = {}) => ({ kind, bounds, ...values });

const thermalProfile = (options = {}) => profile({
    maxDistance: options.maxDistance ?? 20,
    effects: [
        atBounds('flame', options.flameAt ?? [0.5, 0.72, 0.5], { scale: options.scale ?? 0.5 }),
        atBounds('glow', options.glowAt ?? [0.5, 0.68, 0.5], {
            color: options.color ?? 0xff7a24, radius: options.radius ?? 0.18
        })
    ],
    light: {
        bounds: options.lightAt ?? options.glowAt ?? [0.5, 0.70, 0.5],
        color: options.color ?? 0xff7a24,
        intensity: options.intensity ?? 0.85,
        distance: options.distance ?? 2.8,
        decay: 2,
        flicker: 0.13
    }
});

const liquidProfile = (options = {}) => profile({
    maxDistance: options.maxDistance ?? 20,
    effects: [
        atBounds('water', options.surfaceAt ?? [0.5, 0.64, 0.5], {
            color: options.color ?? 0x54cbd4, radius: options.radius ?? 0.24
        }),
        atBounds('bubbles', options.bubblesAt ?? [0.5, 0.18, 0.5], {
            color: options.bubbleColor ?? 0xb6fff5,
            count: options.count ?? 7,
            height: options.height ?? 0.48,
            radius: options.bubbleRadius ?? 0.18
        })
    ],
    light: options.lit === false ? null : {
        bounds: options.lightAt ?? [0.5, 0.62, 0.5],
        color: options.color ?? 0x54cbd4,
        intensity: options.intensity ?? 0.55,
        distance: options.distance ?? 2.4,
        decay: 2,
        pulse: 0.08
    }
});

const poweredProfile = (options = {}) => profile({
    maxDistance: options.maxDistance ?? 18,
    effects: [
        atBounds('glow', options.glowAt ?? [0.5, 0.66, 0.56], {
            color: options.color ?? 0x55d9ff,
            radius: options.radius ?? 0.13,
            pulse: options.pulse ?? 0.10
        }),
        ...(options.sparks ? [atBounds('sparks', options.sparkAt ?? [0.5, 0.72, 0.53], {
            color: options.sparkColor ?? 0xffb45b,
            count: options.sparkCount ?? 5,
            height: options.sparkHeight ?? 0.34,
            radius: options.sparkRadius ?? 0.11
        })] : [])
    ],
    light: options.lit === false ? null : {
        bounds: options.lightAt ?? options.glowAt ?? [0.5, 0.66, 0.56],
        color: options.color ?? 0x55d9ff,
        intensity: options.intensity ?? 0.42,
        distance: options.distance ?? 2.0,
        decay: 2,
        pulse: options.pulse ?? 0.10
    }
});

const ventProfile = (options = {}) => profile({
    maxDistance: options.maxDistance ?? 20,
    effects: [atBounds('steam', options.at ?? [0.5, 0.72, 0.5], {
        color: options.color ?? 0xc5e0e3,
        count: options.count ?? 7,
        height: options.height ?? 0.6,
        radius: options.radius ?? 0.2
    })]
});

const organicProfile = (options = {}) => profile({
    maxDistance: options.maxDistance ?? 18,
    effects: [
        atBounds('glow', options.glowAt ?? [0.5, 0.48, 0.5], {
            color: options.color ?? 0x76d95c,
            radius: options.radius ?? 0.18,
            pulse: options.pulse ?? 0.16
        }),
        ...(options.spores === false ? [] : [atBounds('spores', options.sporeAt ?? [0.5, 0.56, 0.5], {
            color: options.sporeColor ?? 0xb8e889,
            count: options.count ?? 5,
            height: options.height ?? 0.42,
            radius: options.sporeRadius ?? 0.2
        })])
    ],
    motion: { kind: 'breathe', amount: options.motion ?? 0.012, speed: options.speed ?? 1.25 }
});

const profilesFor = (types, makeProfile) => Object.fromEntries(types.map((type) => [type, makeProfile(type)]));

const HERO_PROFILES = {
    prop_camp_cookfire_lit: profile({
        effects: [
            { kind: 'flame', anchor: PROP_FX_ANCHORS.FLAME, position: [0, 0.34, 0], scale: 1.0 },
            { kind: 'smoke', anchor: PROP_FX_ANCHORS.SMOKE, position: [0, 0.52, 0], color: 0x8d8278, count: 7 },
            { kind: 'glow', anchor: PROP_FX_ANCHORS.GLOW, position: [0, 0.30, 0], color: 0xff6a18, radius: 0.24 }
        ],
        light: { anchor: PROP_FX_ANCHORS.LIGHT, position: [0, 0.48, 0], color: 0xff7a24, intensity: 1.65, distance: 4.4, decay: 2, flicker: 0.22 }
    }),
    life_water_still: profile({
        effects: [
            { kind: 'water', anchor: PROP_FX_ANCHORS.WATER, position: [0, 0.76, 0], color: 0x56c9df, radius: 0.28 },
            { kind: 'bubbles', anchor: PROP_FX_ANCHORS.BUBBLES, position: [0, 0.40, 0], color: 0xb7f3ff, count: 10, height: 0.55, radius: 0.20 }
        ],
        light: { anchor: PROP_FX_ANCHORS.LIGHT, position: [0, 0.68, 0], color: 0x5fe3ff, intensity: 1.1, distance: 3.4, decay: 2, pulse: 0.08 }
    }),
    prop_specimen_tank: profile({
        effects: [
            { kind: 'water', anchor: PROP_FX_ANCHORS.WATER, position: [0, 0.75, 0], color: 0x42d6c4, radius: 0.27 },
            { kind: 'bubbles', anchor: PROP_FX_ANCHORS.BUBBLES, position: [0, 0.25, 0], color: 0xa9fff0, count: 14, height: 0.85, radius: 0.23 },
            { kind: 'glow', anchor: PROP_FX_ANCHORS.GLOW, position: [0, 0.68, 0], color: 0x37d9b9, radius: 0.32 }
        ],
        light: { anchor: PROP_FX_ANCHORS.LIGHT, position: [0, 0.78, 0], color: 0x58e8d0, intensity: 1.25, distance: 3.7, decay: 2, pulse: 0.12 }
    }),
    prop_exhaust_blower_fan_hood: profile({
        effects: [
            { kind: 'steam', anchor: PROP_FX_ANCHORS.STEAM, position: [0, 1.42, 0.12], color: 0xb8ced1, count: 8, height: 0.75, radius: 0.28 }
        ]
    }),
    prop_vital_monitor: profile({
        effects: [
            { kind: 'glow', anchor: PROP_FX_ANCHORS.GLOW, position: [0, 0.76, 0.12], color: 0x52ff9a, radius: 0.18, pulse: 0.18 }
        ],
        light: { anchor: PROP_FX_ANCHORS.LIGHT, position: [0, 0.82, 0.12], color: 0x52ff9a, intensity: 0.75, distance: 2.4, decay: 2, pulse: 0.16 }
    }),
    prop_votive_candle_shrine: profile({
        effects: [
            { kind: 'flame', anchor: PROP_FX_ANCHORS.FLAME, position: [0, 0.74, 0.10], scale: 0.55 },
            { kind: 'glow', anchor: PROP_FX_ANCHORS.GLOW, position: [0, 0.70, 0.08], color: 0xffa33c, radius: 0.20 }
        ],
        light: { anchor: PROP_FX_ANCHORS.LIGHT, position: [0, 0.78, 0.08], color: 0xffa648, intensity: 1.15, distance: 3.2, decay: 2, flicker: 0.12 }
    }),
    prop_hive_resin_sac: profile({
        effects: [
            { kind: 'glow', anchor: PROP_FX_ANCHORS.GLOW, position: [0, 0.42, 0], color: 0x74ff72, radius: 0.34, pulse: 0.26 },
            { kind: 'bubbles', anchor: PROP_FX_ANCHORS.BUBBLES, position: [0, 0.18, 0], color: 0xb4ff87, count: 7, height: 0.48, radius: 0.22 }
        ],
        light: { anchor: PROP_FX_ANCHORS.LIGHT, position: [0, 0.48, 0], color: 0x79ff6a, intensity: 0.9, distance: 3.0, decay: 2, pulse: 0.22 }
    }),
    prop_pipe_rupture: profile({
        effects: [
            { kind: 'steam', anchor: PROP_FX_ANCHORS.STEAM, position: [0, 0.56, 0], color: 0xc8e2e5, count: 9, height: 0.72, radius: 0.24 }
        ]
    }),
    prop_coolant_drum_leaking_pool: profile({
        effects: [
            { kind: 'water', anchor: PROP_FX_ANCHORS.WATER, position: [0.16, 0.025, 0.12], color: 0x58c8ff, radius: 0.46 },
            { kind: 'bubbles', anchor: PROP_FX_ANCHORS.BUBBLES, position: [0.16, 0.03, 0.12], color: 0xbcecff, count: 6, height: 0.10, radius: 0.34 }
        ]
    }),
    prop_fungal_resin_basin: profile({
        effects: [
            { kind: 'water', anchor: PROP_FX_ANCHORS.WATER, position: [0, 0.42, 0], color: 0x76bd55, radius: 0.34 },
            { kind: 'bubbles', anchor: PROP_FX_ANCHORS.BUBBLES, position: [0, 0.30, 0], color: 0xb7f38e, count: 9, height: 0.22, radius: 0.28 }
        ]
    })
};

// Ambient recipes use normalized model bounds, so they survive art re-exports
// without hand-retuning. Hero props above still prefer Blender-authored empties.
const AMBIENT_PROFILES = {
    ...profilesFor([
        'life_galley_hotplate', 'life_barrel_heater', 'life_warmth_hearth',
        'life_pheromone_censer'
    ], () => thermalProfile()),
    fixture_sconce_vine: thermalProfile({ flameAt: [0.5, 0.62, 0.56], glowAt: [0.5, 0.62, 0.56], scale: 0.42 }),
    arch_niche_shrine: thermalProfile({ flameAt: [0.5, 0.42, 0.56], glowAt: [0.5, 0.42, 0.56], scale: 0.38 }),

    ...profilesFor([
        'prop_broken_specimen_tank', 'prop_biomech_incubator', 'prop_biomech_respirator',
        'prop_biomech_triage_cradle', 'prop_flesh_steel_inhaler', 'prop_fungal_mycelium_loom',
        'prop_fungal_spore_dispenser', 'prop_o2_filter_vat', 'prop_floor_drainage_sump_trough',
        'life_infusion_cradle', 'life_resin_extractor', 'life_vulval_drain_sump',
        'life_scent_distiller', 'life_peristaltic_feeder', 'life_pelvic_autopsy_trough'
    ], () => liquidProfile()),
    prop_decon_eyewash_shower_station: liquidProfile({ surfaceAt: [0.5, 0.18, 0.53], bubblesAt: [0.5, 0.10, 0.53], lit: false }),

    ...profilesFor([
        'prop_icey_frost_manifold', 'prop_icey_frost_vent', 'prop_pipe_organ_heat_exchanger',
        'prop_biomech_sphincter_hatch_vent', 'prop_biomech_tracheal_wall_pipe',
        'life_lung_filter_bellows'
    ], () => ventProfile()),

    ...profilesFor([
        'base_console', 'o2_generator', 'hull_matrix', 'radar', 'fusion_generator',
        'prop_diagnostic_console', 'prop_fabricator_workstation', 'prop_laser_trap_emitter',
        'prop_tesla_coil_node', 'prop_base_defense_turret', 'prop_camp_meridian_radio',
        'prop_ceiling_crane_hoist', 'prop_exosuit_docking_gantry', 'prop_liturgical_terminal_lectern',
        'prop_maintenance_tool_cart', 'life_route_map_table', 'life_reloading_bench',
        'life_flood_lamp_tripod', 'life_vending_machine', 'life_ammo_ovipositor',
        'life_tactile_console', 'life_bone_clamp_rig', 'life_fuel_probe_boom',
        'life_stigmata_inscriber'
    ], () => poweredProfile()),
    prop_terminal_ruptured: poweredProfile({ sparks: true, pulse: 0.22 }),
    prop_conduit_junction_box: poweredProfile({ sparks: true, lit: false }),
    prop_overhead_cage_fluorescent: poweredProfile({ glowAt: [0.5, 0.5, 0.5], radius: 0.20, color: 0xb8e5d6 }),
    prop_light_cluster_dripping: poweredProfile({ glowAt: [0.5, 0.58, 0.5], radius: 0.22, color: 0x9ec8ba, pulse: 0.18 }),
    prop_corporate_saint_reliquary: poweredProfile({ color: 0xffc56b, radius: 0.18, pulse: 0.08 }),

    ...profilesFor([
        'prop_biomech_flesh_locker', 'prop_biomech_neural_synapse', 'prop_biomech_sphincter_trap',
        'prop_cave_eggs_intact', 'scatter_hive_eggs', 'prop_cave_hive_wounded',
        'prop_cave_spores', 'prop_spore_colony', 'prop_cave_lichen',
        'state_growth_overrun_1', 'state_growth_overrun_2', 'prop_fungal_tendril_altar',
        'prop_biomech_spore_umbilical_cable', 'prop_biomech_spore_umbilical_cable_rigged',
        'life_sleep_sleeve', 'life_sensory_chair', 'life_umbilical_tether'
    ], () => organicProfile()),
    prop_cave_eggs_hatched: organicProfile({ spores: false, motion: 0.006 }),
    prop_hive_carapace_molt: organicProfile({ spores: false, motion: 0.006 }),
    prop_vertebral_cable_riser: organicProfile({ spores: false, motion: 0.008 }),
    life_hydro_rack: organicProfile({ color: 0x70c86c, spores: false, motion: 0.006 })
};

export const PROP_FX_PROFILES = Object.freeze({ ...AMBIENT_PROFILES, ...HERO_PROFILES });

function hashString(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function seededRandom(seed) {
    let state = seed >>> 0;
    return () => {
        state += 0x6d2b79f5;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}

function effectPosition(root, model, spec) {
    const position = new THREE.Vector3(...(spec.position ?? [0, 0, 0]));
    const authored = spec.anchor ? model.getObjectByName(spec.anchor) : null;
    if (authored) {
        root.updateMatrixWorld(true);
        authored.getWorldPosition(position);
        return root.worldToLocal(position);
    }
    if (spec.bounds) {
        const bounds = new THREE.Box3().setFromObject(model);
        const [x = 0.5, y = 0.5, z = 0.5] = spec.bounds;
        position.set(
            THREE.MathUtils.lerp(bounds.min.x, bounds.max.x, x),
            THREE.MathUtils.lerp(bounds.min.y, bounds.max.y, y),
            THREE.MathUtils.lerp(bounds.min.z, bounds.max.z, z)
        );
    }
    return position;
}

function createFlame(spec, uniforms) {
    const geometry = new THREE.ConeGeometry(0.13, 0.42, 7, 1, true);
    geometry.translate(0, 0.21, 0);
    const local = { uTime: { value: 0 }, uPhase: { value: (hashString(spec.anchor ?? 'flame') % 997) / 997 } };
    const material = new THREE.ShaderMaterial({
        uniforms: local,
        vertexShader: `
            uniform float uTime;
            uniform float uPhase;
            varying vec2 vUv;
            void main() {
                vUv = uv;
                vec3 p = position;
                float tip = clamp(p.y / 0.42, 0.0, 1.0);
                p.x += sin(uTime * 8.0 + uPhase * 6.283 + p.y * 9.0) * tip * 0.045;
                p.z += cos(uTime * 6.3 + uPhase * 4.1 + p.y * 7.0) * tip * 0.028;
                p.y *= 0.92 + 0.10 * sin(uTime * 10.0 + uPhase * 9.0);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
            }
        `,
        fragmentShader: `
            varying vec2 vUv;
            void main() {
                float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
                float fade = smoothstep(1.0, 0.12, vUv.y);
                vec3 color = mix(vec3(1.0, 0.12, 0.01), vec3(1.0, 0.88, 0.28), vUv.y);
                gl_FragColor = vec4(color, edge * fade * 0.86);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: true
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.setScalar(spec.scale ?? 1);
    mesh.renderOrder = 7;
    mesh.userData.propFxOwned = true;
    uniforms.push(local.uTime);
    return mesh;
}

function createWater(spec, uniforms) {
    const geometry = new THREE.CircleGeometry(spec.radius ?? 0.3, 24);
    const local = { uTime: { value: 0 }, uColor: { value: new THREE.Color(spec.color ?? 0x59cbdc) } };
    const material = new THREE.ShaderMaterial({
        uniforms: local,
        vertexShader: `
            uniform float uTime;
            varying vec2 vUv;
            varying float vWave;
            void main() {
                vUv = uv;
                vec3 p = position;
                vWave = sin(p.x * 28.0 + uTime * 2.2) * cos(p.y * 24.0 - uTime * 1.7);
                p.z += vWave * 0.008;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 uColor;
            uniform float uTime;
            varying vec2 vUv;
            varying float vWave;
            void main() {
                float radius = length(vUv - 0.5) * 2.0;
                float ripple = 0.5 + 0.5 * sin(radius * 32.0 - uTime * 3.0 + vWave * 2.0);
                float alpha = smoothstep(1.0, 0.84, radius) * (0.40 + ripple * 0.14);
                vec3 color = uColor * (0.72 + ripple * 0.32);
                gl_FragColor = vec4(color, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.renderOrder = 5;
    mesh.userData.propFxOwned = true;
    uniforms.push(local.uTime);
    return mesh;
}

function createRisingPoints(spec, uniforms, seed) {
    const count = Math.max(1, spec.count ?? 8);
    const radius = spec.radius ?? 0.2;
    const random = seededRandom(seed);
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
        const angle = random() * Math.PI * 2;
        const distance = Math.sqrt(random()) * radius;
        positions[i * 3] = Math.cos(angle) * distance;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = Math.sin(angle) * distance;
        phases[i] = random();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    const steam = spec.kind === 'steam' || spec.kind === 'smoke';
    const sparks = spec.kind === 'sparks';
    const spores = spec.kind === 'spores';
    const style = steam ? 1 : sparks ? 2 : spores ? 3 : 0;
    const local = {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(spec.color ?? 0xffffff) },
        uHeight: { value: spec.height ?? 0.6 },
        uSpeed: { value: steam ? 0.16 : sparks ? 0.72 : spores ? 0.08 : 0.25 },
        uPointSize: { value: steam ? 0.085 : sparks ? 0.025 : spores ? 0.045 : 0.040 },
        uStyle: { value: style }
    };
    const material = new THREE.ShaderMaterial({
        uniforms: local,
        vertexShader: `
            uniform float uTime;
            uniform float uHeight;
            uniform float uSpeed;
            uniform float uPointSize;
            attribute float aPhase;
            varying float vLife;
            void main() {
                float life = fract(aPhase + uTime * uSpeed);
                vec3 p = position;
                p.y += life * uHeight;
                p.x += sin((aPhase + uTime) * 8.0) * life * 0.06;
                p.z += cos((aPhase * 1.7 + uTime) * 7.0) * life * 0.05;
                vec4 mv = modelViewMatrix * vec4(p, 1.0);
                gl_Position = projectionMatrix * mv;
                gl_PointSize = clamp(uPointSize * (210.0 / max(0.6, -mv.z)), 1.5, 18.0);
                vLife = life;
            }
        `,
        fragmentShader: `
            uniform vec3 uColor;
            uniform int uStyle;
            varying float vLife;
            void main() {
                vec2 q = gl_PointCoord - 0.5;
                float disc = smoothstep(0.5, 0.16, length(q));
                float bubbleRing = smoothstep(0.48, 0.30, length(q)) - smoothstep(0.30, 0.20, length(q));
                float shape = uStyle == 1 ? disc : (uStyle == 0 ? max(bubbleRing, disc * 0.14) : disc);
                float fade = sin(vLife * 3.14159265);
                float opacity = uStyle == 1 ? 0.28 : (uStyle == 3 ? 0.42 : 0.70);
                gl_FragColor = vec4(uColor, shape * fade * opacity);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: steam ? THREE.NormalBlending : THREE.AdditiveBlending
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    points.renderOrder = 6;
    points.userData.propFxOwned = true;
    uniforms.push(local.uTime);
    return points;
}

function createGlow(spec, pulseTargets) {
    const geometry = new THREE.SphereGeometry(spec.radius ?? 0.2, 10, 7);
    const material = new THREE.MeshBasicMaterial({
        color: spec.color ?? 0xffffff,
        transparent: true,
        opacity: 0.10,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.propFxOwned = true;
    pulseTargets.push({ object: mesh, material, amount: spec.pulse ?? 0.12, baseOpacity: material.opacity });
    return mesh;
}

export function getPropFxProfile(type) {
    return PROP_FX_PROFILES[type] ?? null;
}

/** Attach the reusable FX recipe for a normalized world model. */
export function createPropFx(root, model, type) {
    const config = getPropFxProfile(type);
    if (!root || !model || !config) return null;

    const group = new THREE.Group();
    group.name = `PropFx:${type}`;
    group.userData.isPropFx = true;
    const timeUniforms = [];
    const pulseTargets = [];
    const lightSources = [];
    const seed = hashString(type);

    for (const spec of config.effects) {
        let object = null;
        if (spec.kind === 'flame') object = createFlame(spec, timeUniforms);
        else if (spec.kind === 'water') object = createWater(spec, timeUniforms);
        else if (['bubbles', 'steam', 'smoke', 'sparks', 'spores'].includes(spec.kind)) {
            object = createRisingPoints(spec, timeUniforms, seed ^ hashString(`${spec.kind}:${spec.anchor}`));
        } else if (spec.kind === 'glow') object = createGlow(spec, pulseTargets);
        if (!object) continue;
        object.position.copy(effectPosition(root, model, spec));
        group.add(object);
    }

    if (config.light) {
        const spec = config.light;
        const light = new THREE.PointLight(spec.color, spec.intensity, spec.distance, spec.decay);
        light.name = `${type}:PropFxLight`;
        light.position.copy(effectPosition(root, model, spec));
        light.visible = false; // Enabled only after ThreeGame registers it with the fixed pool.
        light.castShadow = false;
        light.userData.isAnchorPracticalLight = true;
        light.userData.isPropFxLight = true;
        light.userData.propFxBaseIntensity = spec.intensity;
        light.userData.propFxFlicker = spec.flicker ?? 0;
        light.userData.propFxPulse = spec.pulse ?? 0;
        group.add(light);
        lightSources.push(light);
    }

    root.add(group);
    const scratch = new THREE.Vector3();
    const baseModelScale = model.scale.clone();
    const animateModel = Boolean(config.motion && !root.userData?.mixer);
    let elapsed = (seed % 4096) / 193;
    let disposed = false;
    const api = {
        type,
        group,
        lightSources,
        update(delta = 0, cameraPosition = null) {
            if (disposed) return;
            elapsed += Math.min(Math.max(Number(delta) || 0, 0), 0.1);
            let active = root.visible !== false;
            if (active && cameraPosition?.isVector3) {
                root.getWorldPosition(scratch);
                active = scratch.distanceToSquared(cameraPosition) <= config.maxDistance * config.maxDistance;
            }
            group.visible = active;
            for (const uniform of timeUniforms) uniform.value = elapsed;
            const wave = Math.sin(elapsed * 2.7 + seed * 0.001);
            if (animateModel && active && config.motion.kind === 'breathe') {
                const breath = Math.sin(elapsed * config.motion.speed + seed * 0.0007) * config.motion.amount;
                model.scale.set(
                    baseModelScale.x * (1 + breath),
                    baseModelScale.y * (1 + breath * 0.65),
                    baseModelScale.z * (1 + breath)
                );
            }
            for (const target of pulseTargets) {
                const pulse = 1 + wave * target.amount;
                target.object.scale.setScalar(pulse);
                target.material.opacity = target.baseOpacity * (0.86 + 0.14 * wave);
            }
            for (const light of lightSources) {
                light.userData.envLightEnabled = active;
                const flicker = light.userData.propFxFlicker;
                const pulse = light.userData.propFxPulse;
                const smoothFlicker = Math.sin(elapsed * 11.7 + seed) * 0.58 + Math.sin(elapsed * 17.3 + seed * 0.7) * 0.42;
                light.intensity = light.userData.propFxBaseIntensity * (1 + smoothFlicker * flicker + wave * pulse);
            }
        },
        dispose() {
            if (disposed) return;
            disposed = true;
            if (animateModel) model.scale.copy(baseModelScale);
            for (const light of lightSources) light.userData.envLightEnabled = false;
            group.traverse((object) => {
                if (!object.userData?.propFxOwned) return;
                object.geometry?.dispose?.();
                const materials = Array.isArray(object.material) ? object.material : [object.material];
                for (const material of materials) material?.dispose?.();
            });
            group.removeFromParent();
        }
    };
    api.update(0);
    return api;
}
