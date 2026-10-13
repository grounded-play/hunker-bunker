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
    light: options.lit ? {
        bounds: options.lightAt ?? options.glowAt ?? [0.5, 0.48, 0.5],
        color: options.color ?? 0x76d95c,
        intensity: options.intensity ?? 0.45,
        distance: options.distance ?? 2.2,
        decay: 2,
        pulse: options.pulse ?? 0.16
    } : null,
    motion: { kind: 'breathe', amount: options.motion ?? 0.012, speed: options.speed ?? 1.25 }
});

// Smouldering wreckage: a slow smoke column over an ember glow.
const smoulderProfile = (options = {}) => profile({
    maxDistance: options.maxDistance ?? 22,
    effects: [
        atBounds('smoke', options.at ?? [0.5, 0.7, 0.5], {
            color: options.color ?? 0x7d756c, count: options.count ?? 6, height: options.height ?? 0.9, radius: options.radius ?? 0.22
        }),
        atBounds('glow', options.glowAt ?? [0.5, 0.45, 0.5], { color: 0xff6a18, radius: options.glowRadius ?? 0.16, pulse: 0.2 })
    ],
    light: options.lit === false ? null : {
        bounds: options.glowAt ?? [0.5, 0.45, 0.5], color: 0xff7a24, intensity: 0.6, distance: 2.6, decay: 2, flicker: 0.18
    }
});

// Cold vapour off ice, cryo kit and frozen bodies.
const coldProfile = (options = {}) => profile({
    maxDistance: options.maxDistance ?? 20,
    effects: [
        atBounds('steam', options.at ?? [0.5, 0.6, 0.5], {
            color: 0xd8f4ff, count: options.count ?? 6, height: options.height ?? 0.4, radius: options.radius ?? 0.24
        }),
        ...(options.glowAt ? [atBounds('glow', options.glowAt, { color: 0x5fe3ff, radius: options.glowRadius ?? 0.12, pulse: 0.1 })] : [])
    ],
    light: options.glowAt ? {
        bounds: options.glowAt, color: 0x5fe3ff, intensity: 0.7, distance: 2.6, decay: 2, pulse: 0.08
    } : null
});

// A working lamp: the glow plus a pooled light.
const lampProfile = (options = {}) => poweredProfile({ radius: 0.15, pulse: 0.05, ...options });

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
    // Recent world-story GLBs, vertical slice 1. Bounds coordinates are the
    // fallback contract; authored FX_* empties take precedence when present.
    life_arcade_cabinet: poweredProfile({ glowAt: [0.5, 0.7, 0.58], color: 0x55d9ff, radius: 0.2, pulse: 0.18, intensity: 0.62, distance: 2.5 }),
    life_surgical_lamp: lampProfile({ glowAt: [0.5, 0.88, 0.52], color: 0xe9fff4, radius: 0.24, pulse: 0.025, intensity: 1.15, distance: 3.6 }),
    cryo_heater_station: thermalProfile({ flameAt: [0.5, 0.38, 0.58], glowAt: [0.5, 0.42, 0.58], scale: 0.45, intensity: 1.05, distance: 3.2 }),
    hive_brood_dome: organicProfile({ glowAt: [0.5, 0.48, 0.5], color: 0x92d65c, radius: 0.34, pulse: 0.2, motion: 0.015, lit: true, intensity: 0.62, distance: 2.7 }),
    chasm_beacon_post: lampProfile({ glowAt: [0.5, 0.94, 0.5], color: 0xff3b2f, radius: 0.16, pulse: 0.48, intensity: 1.2, distance: 4.2 }),
    corp_executive_sarcophagus: poweredProfile({ glowAt: [0.5, 0.66, 0.56], color: 0xd946ef, radius: 0.18, pulse: 0.12, intensity: 0.72, distance: 2.8 }),
    corp_suppression_barrier: poweredProfile({ glowAt: [0.5, 0.72, 0.56], color: 0xef4444, radius: 0.2, pulse: 0.28, intensity: 0.82, distance: 3.1 }),
    meridian_capacitor_bomb: poweredProfile({ glowAt: [0.5, 0.55, 0.5], sparkAt: [0.5, 0.7, 0.5], color: 0xffa648, radius: 0.2, pulse: 0.32, intensity: 0.9, distance: 3, sparks: true, sparkCount: 7 }),
    tina_covert_nursery_chest: organicProfile({ glowAt: [0.5, 0.38, 0.55], color: 0x76d95c, radius: 0.22, pulse: 0.14, spores: false, motion: 0.009, lit: true, intensity: 0.42, distance: 2 }),
    hive_sphincter_iris: organicProfile({ glowAt: [0.5, 0.5, 0.54], color: 0xa3e635, radius: 0.3, pulse: 0.22, spores: false, motion: 0.018, lit: true, intensity: 0.58, distance: 2.6 }),
    ind_biomass_grinder: poweredProfile({ glowAt: [0.5, 0.48, 0.58], sparkAt: [0.56, 0.63, 0.55], color: 0xff8a2b, radius: 0.18, pulse: 0.1, intensity: 0.75, distance: 2.8, sparks: true, sparkCount: 6 }),
    crash_cockpit_canopy: smoulderProfile({ at: [0.5, 0.72, 0.5], glowAt: [0.52, 0.34, 0.55], count: 5, intensity: 0.55, distance: 2.5 }),

    // Pass 2 world-story mature models (19 models)
    bay_c_pod_312_rupture: coldProfile({ at: [0.5, 0.75, 0.52], glowAt: [0.5, 0.88, 0.52] }),
    chen_sealed_confession_console: poweredProfile({ glowAt: [0.5, 0.72, 0.58], color: 0xffa834, radius: 0.22, pulse: 0.12, intensity: 0.75, distance: 2.6 }),
    decon_exosuit_scrubber_station: profile({ maxDistance: 22, effects: [atBounds('glow', [0.5, 0.92, 0.52], { color: 0xd8f8ff, radius: 0.25, pulse: 0.04 }), atBounds('steam', [0.5, 0.75, 0.52], { color: 0xe0f7fa, count: 10, height: 1.2, radius: 0.35 })], light: { bounds: [0.5, 0.92, 0.52], color: 0xd8f8ff, intensity: 1.25, distance: 3.8, decay: 2 } }),
    engineer_wave_relay_dynamo: poweredProfile({ glowAt: [0.5, 0.55, 0.5], sparkAt: [0.5, 0.65, 0.5], color: 0x38bdf8, radius: 0.25, pulse: 0.22, intensity: 1.1, distance: 3.5, sparks: true, sparkCount: 8 }),
    evac_four_seat_cockpit_module: smoulderProfile({ at: [0.5, 0.72, 0.5], glowAt: [0.5, 0.58, 0.55], count: 6, intensity: 0.8, distance: 3.0 }),
    tank_orbital_siege_cannon: profile({ maxDistance: 24, effects: [atBounds('glow', [0.5, 0.78, 0.65], { color: 0xff4433, radius: 0.24, pulse: 0.15 }), atBounds('steam', [0.5, 0.65, 0.5], { color: 0x94a3b8, count: 7, height: 0.8, radius: 0.3 })], light: { bounds: [0.5, 0.78, 0.65], color: 0xff4433, intensity: 1.35, distance: 4.2, decay: 2 } }),

    queen_royal_brood_throne: organicProfile({ glowAt: [0.5, 0.75, 0.5], sporeAt: [0.5, 0.82, 0.5], color: 0xa855f7, sporeColor: 0xd8b4fe, radius: 0.45, pulse: 0.12, motion: 0.02, lit: true, intensity: 1.4, distance: 4.0 }),
    carapace_sentry_chrysalis: organicProfile({ glowAt: [0.5, 0.65, 0.5], color: 0xa3e635, radius: 0.28, pulse: 0.18, motion: 0.015, lit: true, intensity: 0.8, distance: 2.8 }),
    royal_egg_clutch_caul: organicProfile({ glowAt: [0.5, 0.42, 0.5], color: 0xf59e0b, radius: 0.32, pulse: 0.14, spores: false, motion: 0.01, lit: true, intensity: 0.65, distance: 2.2 }),
    vass_acoustic_resonator_tank: liquidProfile({ surfaceAt: [0.5, 0.75, 0.5], bubblesAt: [0.5, 0.45, 0.5], color: 0x06b6d4, bubbleColor: 0x67e8f9, count: 12, intensity: 1.05, distance: 3.2 }),
    vass_hybrid_embryo_incubator: liquidProfile({ surfaceAt: [0.5, 0.72, 0.5], bubblesAt: [0.5, 0.4, 0.5], color: 0x84cc16, bubbleColor: 0xbef264, count: 12, intensity: 0.95, distance: 3.0 }),
    suture_mercy_cocoon_canopy: liquidProfile({ surfaceAt: [0.5, 0.7, 0.5], bubblesAt: [0.5, 0.4, 0.5], color: 0x2dd4bf, bubbleColor: 0x99f6e4, count: 8, intensity: 0.85, distance: 2.8 }),
    relay_false_beacon_spire: lampProfile({ glowAt: [0.5, 0.96, 0.5], color: 0xfbbf24, radius: 0.3, pulse: 0.4, intensity: 1.5, distance: 5.0 }),

    corp_biometric_collar_chute: poweredProfile({ glowAt: [0.5, 0.78, 0.54], sparkAt: [0.5, 0.82, 0.54], color: 0xef4444, radius: 0.2, pulse: 0.25, intensity: 0.85, distance: 2.6, sparks: true, sparkCount: 5 }),
    crawler_signal_antenna_rig: lampProfile({ glowAt: [0.5, 0.98, 0.5], color: 0xff3333, radius: 0.22, pulse: 0.5, intensity: 1.3, distance: 4.5 }),
    evac_manifest_allocation_terminal: poweredProfile({ glowAt: [0.5, 0.74, 0.56], color: 0x4ade80, radius: 0.2, pulse: 0.15, intensity: 0.75, distance: 2.4 }),
    evac_preflight_fuel_umbilical: profile({ maxDistance: 20, effects: [atBounds('glow', [0.5, 0.65, 0.5], { color: 0xfacc15, radius: 0.18, pulse: 0.12 }), atBounds('steam', [0.5, 0.72, 0.5], { color: 0xfef08a, count: 6, height: 0.5, radius: 0.2 })], light: { bounds: [0.5, 0.65, 0.5], color: 0xfacc15, intensity: 0.9, distance: 2.8, decay: 2 } }),
    scout_tracking_beacon_core: lampProfile({ glowAt: [0.5, 0.62, 0.5], color: 0x60a5fa, radius: 0.18, pulse: 0.45, intensity: 0.9, distance: 3.0 }),
    sector_zero_bore_drillhead: profile({ maxDistance: 22, effects: [atBounds('glow', [0.5, 0.72, 0.58], { color: 0xffedd5, radius: 0.25, pulse: 0.05 }), atBounds('smoke', [0.5, 0.85, 0.5], { color: 0x52525b, count: 7, height: 0.7, radius: 0.25 })], light: { bounds: [0.5, 0.72, 0.58], color: 0xffedd5, intensity: 1.3, distance: 3.8, decay: 2 } }),

    // Wave D: Pass 1 Corporate, Meridian, Tallow & Vesper (15 models)
    corp_interrogation_chair: poweredProfile({ glowAt: [0.5, 0.75, 0.5], sparkAt: [0.5, 0.78, 0.5], color: 0xef4444, radius: 0.18, pulse: 0.25, intensity: 0.75, distance: 2.6, sparks: true, sparkCount: 5 }),
    corp_debt_severing_kiosk: poweredProfile({ glowAt: [0.5, 0.7, 0.55], color: 0xf59e0b, radius: 0.2, pulse: 0.15, intensity: 0.8, distance: 2.6 }),
    corp_dissection_gurney: lampProfile({ glowAt: [0.5, 0.82, 0.5], color: 0xe2e8f0, radius: 0.24, pulse: 0.04, intensity: 0.9, distance: 3.2 }),
    corp_incinerator_hopper: profile({ maxDistance: 22, effects: [atBounds('smoke', [0.5, 0.75, 0.5], { color: 0x475569, count: 6, height: 0.8, radius: 0.25 }), atBounds('glow', [0.5, 0.35, 0.5], { color: 0xf97316, radius: 0.22, pulse: 0.2 })], light: { bounds: [0.5, 0.35, 0.5], color: 0xf97316, intensity: 1.2, distance: 3.4, decay: 2, flicker: 0.2 } }),
    meridian_cyber_graft_bench: poweredProfile({ glowAt: [0.5, 0.72, 0.5], sparkAt: [0.5, 0.76, 0.5], color: 0x06b6d4, radius: 0.2, pulse: 0.18, intensity: 0.85, distance: 2.8, sparks: true, sparkCount: 6 }),
    meridian_mainframe_altar: poweredProfile({ glowAt: [0.5, 0.68, 0.5], color: 0x38bdf8, radius: 0.25, pulse: 0.12, intensity: 1.1, distance: 3.5 }),
    meridian_servitor_dock: poweredProfile({ glowAt: [0.5, 0.65, 0.5], sparkAt: [0.5, 0.75, 0.5], color: 0x2563eb, radius: 0.22, pulse: 0.2, intensity: 0.9, distance: 3.0, sparks: true, sparkCount: 5 }),
    tallow_compost_fermenter: liquidProfile({ surfaceAt: [0.5, 0.7, 0.5], bubblesAt: [0.5, 0.45, 0.5], color: 0x65a30d, bubbleColor: 0xa3e635, count: 10, intensity: 0.7, distance: 2.5 }),
    tallow_spore_cradle: organicProfile({ glowAt: [0.5, 0.45, 0.5], sporeAt: [0.5, 0.55, 0.5], color: 0x84cc16, sporeColor: 0xbef264, radius: 0.26, pulse: 0.18, motion: 0.015, lit: true, intensity: 0.6, distance: 2.4 }),
    tallow_flesh_trellis: organicProfile({ glowAt: [0.5, 0.6, 0.5], color: 0x16a34a, radius: 0.3, pulse: 0.15, spores: false, motion: 0.02, lit: true, intensity: 0.65, distance: 2.6 }),
    tallow_sacrificial_altar: thermalProfile({ flameAt: [0.5, 0.55, 0.5], glowAt: [0.5, 0.5, 0.5], color: 0xdc2626, intensity: 0.95, distance: 3.2 }),
    vesper_amputation_rig: poweredProfile({ glowAt: [0.5, 0.78, 0.5], sparkAt: [0.5, 0.82, 0.5], color: 0xb91c1c, radius: 0.22, pulse: 0.2, intensity: 0.85, distance: 2.8, sparks: true, sparkCount: 5 }),
    vesper_autocannon_bipod: poweredProfile({ glowAt: [0.5, 0.62, 0.5], color: 0xf59e0b, radius: 0.2, pulse: 0.1, intensity: 0.7, distance: 2.5 }),
    vesper_hanging_cage: lampProfile({ glowAt: [0.5, 0.45, 0.5], color: 0xef4444, radius: 0.16, pulse: 0.25, intensity: 0.6, distance: 2.4 }),
    vesper_reloading_station: lampProfile({ glowAt: [0.5, 0.72, 0.5], color: 0xfde047, radius: 0.22, pulse: 0.05, intensity: 0.8, distance: 2.8 }),

    // Wave E: Pass 1 Hive, Cryo Brutality, Tina & Chasm (18 models)
    tina_molted_carapace: organicProfile({ glowAt: [0.5, 0.5, 0.5], color: 0xa3e635, radius: 0.25, pulse: 0.1, spores: false, motion: 0.008, lit: true, intensity: 0.5, distance: 2.2 }),
    tina_mimic_vanity: lampProfile({ glowAt: [0.5, 0.75, 0.5], color: 0xf1f5f9, radius: 0.26, pulse: 0.03, intensity: 0.95, distance: 3.2 }),
    tina_trophy_trove: lampProfile({ glowAt: [0.5, 0.68, 0.5], color: 0xfbbf24, radius: 0.24, pulse: 0.06, intensity: 0.85, distance: 3.0 }),
    hive_visceral_ovipositor: organicProfile({ glowAt: [0.5, 0.7, 0.5], sporeAt: [0.5, 0.75, 0.5], color: 0xe11d48, sporeColor: 0xfb7185, radius: 0.35, pulse: 0.2, motion: 0.02, lit: true, intensity: 0.9, distance: 3.2 }),
    hive_vivisected_engineer: poweredProfile({ glowAt: [0.5, 0.65, 0.5], color: 0x06b6d4, radius: 0.2, pulse: 0.15, intensity: 0.75, distance: 2.6 }),
    hive_gestation_sac: organicProfile({ glowAt: [0.5, 0.5, 0.5], color: 0xf59e0b, radius: 0.3, pulse: 0.16, spores: false, motion: 0.018, lit: true, intensity: 0.7, distance: 2.6 }),
    hive_pulmonary_bellows: profile({ maxDistance: 20, effects: [atBounds('glow', [0.5, 0.6, 0.5], { color: 0xf43f5e, radius: 0.28, pulse: 0.25 }), atBounds('steam', [0.5, 0.72, 0.5], { color: 0xfda4af, count: 8, height: 0.7, radius: 0.3 })], light: { bounds: [0.5, 0.6, 0.5], color: 0xf43f5e, intensity: 0.8, distance: 2.8, decay: 2 }, motion: { kind: 'breathe', amount: 0.025, speed: 1.5 } }),
    hive_amniotic_feeder_trough: liquidProfile({ surfaceAt: [0.5, 0.35, 0.5], bubblesAt: [0.5, 0.2, 0.5], color: 0x84cc16, bubbleColor: 0xbef264, count: 9, intensity: 0.75, distance: 2.6 }),
    cryo_ruptured_pod: coldProfile({ at: [0.5, 0.6, 0.5], glowAt: [0.5, 0.45, 0.5] }),
    cryo_cannibal_butchery_table: lampProfile({ glowAt: [0.5, 0.72, 0.5], color: 0xd97706, radius: 0.22, pulse: 0.12, intensity: 0.9, distance: 2.8 }),
    cryo_ice_core_specimen: coldProfile({ at: [0.5, 0.7, 0.5], glowAt: [0.5, 0.65, 0.5] }),
    cryo_thawing_trough: thermalProfile({ flameAt: [0.5, 0.35, 0.5], glowAt: [0.5, 0.4, 0.5], color: 0xf97316, intensity: 0.8, distance: 2.8 }),
    cryo_frozen_shelter_pod: lampProfile({ glowAt: [0.5, 0.6, 0.5], color: 0xef4444, radius: 0.18, pulse: 0.3, intensity: 0.5, distance: 2.2 }),
    chasm_hanging_elevator: lampProfile({ glowAt: [0.5, 0.85, 0.5], color: 0xf59e0b, radius: 0.22, pulse: 0.15, intensity: 0.9, distance: 3.2 }),
    chasm_suicide_ledge_cross: profile({ maxDistance: 18, effects: [atBounds('glow', [0.5, 0.5, 0.5], { color: 0xf59e0b, radius: 0.2, pulse: 0.18 })], light: { bounds: [0.5, 0.5, 0.5], color: 0xf59e0b, intensity: 0.7, distance: 2.5, decay: 2, flicker: 0.15 } }),
    chasm_dredge_hook_crane: lampProfile({ glowAt: [0.5, 0.88, 0.5], color: 0xeab308, radius: 0.24, pulse: 0.4, intensity: 1.1, distance: 3.8 }),
    ind_hydraulic_manifold: ventProfile({ at: [0.5, 0.65, 0.5], color: 0x94a3b8, count: 8, height: 0.8, radius: 0.25 }),
    ind_fuel_rod_cask: lampProfile({ glowAt: [0.5, 0.7, 0.5], color: 0xf59e0b, radius: 0.22, pulse: 0.35, intensity: 1.0, distance: 3.2 }),

    // Wave F: 2026-10-11 World Completion Machinery, Daily Life & Camps
    life_server_racks: poweredProfile({ glowAt: [0.5, 0.7, 0.5], color: 0x38bdf8, radius: 0.2, pulse: 0.18, intensity: 0.6, distance: 2.5 }),
    life_transformer_bank: poweredProfile({ glowAt: [0.5, 0.65, 0.5], sparkAt: [0.5, 0.75, 0.5], color: 0xef4444, radius: 0.22, pulse: 0.25, intensity: 0.8, distance: 2.8, sparks: true, sparkCount: 6 }),
    life_fire_station: lampProfile({ glowAt: [0.5, 0.75, 0.5], color: 0xdc2626, radius: 0.18, pulse: 0.3, intensity: 0.7, distance: 2.4 }),
    life_conveyor_section: lampProfile({ glowAt: [0.5, 0.5, 0.5], color: 0xfacc15, radius: 0.18, pulse: 0.1, intensity: 0.6, distance: 2.2 }),
    life_cistern_tank: liquidProfile({ surfaceAt: [0.5, 0.65, 0.5], bubblesAt: [0.5, 0.3, 0.5], color: 0x38bdf8, bubbleColor: 0xbae6fd, count: 8, intensity: 0.7, distance: 2.6 }),
    life_scaffold_tower: lampProfile({ glowAt: [0.5, 0.85, 0.5], color: 0xfef08a, radius: 0.22, pulse: 0.05, intensity: 0.8, distance: 2.8 }),
    life_forklift: lampProfile({ glowAt: [0.5, 0.75, 0.5], color: 0xf59e0b, radius: 0.22, pulse: 0.35, intensity: 0.9, distance: 3.0 }),
    life_shower_stall: ventProfile({ at: [0.5, 0.8, 0.5], color: 0xe0f2fe, count: 8, height: 0.8, radius: 0.3 }),
    life_laundry_machines: lampProfile({ glowAt: [0.5, 0.6, 0.5], color: 0xf59e0b, radius: 0.18, pulse: 0.2, intensity: 0.6, distance: 2.2 }),
    life_overseer_desk: lampProfile({ glowAt: [0.5, 0.65, 0.5], color: 0x22c55e, radius: 0.2, pulse: 0.05, intensity: 0.75, distance: 2.5 }),
    life_planning_board: lampProfile({ glowAt: [0.5, 0.7, 0.5], color: 0xfef08a, radius: 0.2, pulse: 0.04, intensity: 0.7, distance: 2.4 }),
    life_algae_tank: liquidProfile({ surfaceAt: [0.5, 0.55, 0.5], bubblesAt: [0.5, 0.35, 0.5], color: 0x22c55e, bubbleColor: 0x86efac, count: 10, intensity: 0.85, distance: 2.8 }),
    cryo_ice_crawler: lampProfile({ glowAt: [0.5, 0.65, 0.7], color: 0x7dd3fc, radius: 0.28, pulse: 0.08, intensity: 1.2, distance: 4.0 }),
    cryo_frozen_cascade: coldProfile({ at: [0.5, 0.7, 0.5], glowAt: [0.5, 0.5, 0.5] }),
    cryo_snowbound_crates: coldProfile({ at: [0.5, 0.4, 0.5] }),
    cryo_ice_blocks: coldProfile({ at: [0.5, 0.3, 0.5] }),
    hive_resin_pillar: organicProfile({ glowAt: [0.5, 0.6, 0.5], color: 0x4ade80, radius: 0.28, pulse: 0.16, spores: true, motion: 0.012, lit: true, intensity: 0.8, distance: 2.8 }),
    hive_cocooned_crew: organicProfile({ glowAt: [0.5, 0.5, 0.5], color: 0x84cc16, radius: 0.26, pulse: 0.22, spores: true, motion: 0.02, lit: true, intensity: 0.7, distance: 2.5 }),
    hive_pheromone_node: organicProfile({ glowAt: [0.5, 0.65, 0.5], sporeAt: [0.5, 0.75, 0.5], color: 0xa3e635, sporeColor: 0xd9f99d, radius: 0.3, pulse: 0.25, motion: 0.018, lit: true, intensity: 0.75, distance: 2.8 }),
    hive_tendril_arch: organicProfile({ glowAt: [0.5, 0.8, 0.5], color: 0x4ade80, radius: 0.35, pulse: 0.14, spores: false, motion: 0.015, lit: true, intensity: 0.6, distance: 2.6 }),
    hive_assimilated_generator: poweredProfile({ glowAt: [0.5, 0.6, 0.5], sparkAt: [0.5, 0.7, 0.5], color: 0x84cc16, radius: 0.25, pulse: 0.3, intensity: 1.0, distance: 3.2, sparks: true, sparkCount: 8 }),
    crash_engine_nacelle: smoulderProfile({ at: [0.5, 0.65, 0.5], glowAt: [0.5, 0.5, 0.5], color: 0x64748b, count: 7, intensity: 1.1, distance: 3.5 }),
    salvage_tagged_heap: lampProfile({ glowAt: [0.5, 0.5, 0.5], color: 0xf59e0b, radius: 0.18, pulse: 0.3, intensity: 0.7, distance: 2.4 }),
    camp_canvas_tent: lampProfile({ glowAt: [0.5, 0.45, 0.5], color: 0xfbbf24, radius: 0.25, pulse: 0.08, intensity: 0.9, distance: 2.8 }),
    camp_water_barrel: liquidProfile({
        surfaceAt: [0.5, 0.76, 0.5],
        bubblesAt: [0.5, 0.72, 0.5],
        color: 0x6eb7bd,
        bubbleColor: 0xbce8e8,
        radius: 0.3,
        bubbleRadius: 0.24,
        count: 3,
        lit: false
    }),
    life_sink_row: liquidProfile({
        surfaceAt: [0.5, 0.68, 0.54],
        bubblesAt: [0.5, 0.64, 0.54],
        color: 0x8ec9d1,
        bubbleColor: 0xd8f4f5,
        radius: 0.2,
        bubbleRadius: 0.15,
        count: 3,
        lit: false
    }),

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
    life_hydro_rack: organicProfile({ color: 0x70c86c, spores: false, motion: 0.006 }),

    // Lived-in pass 2 (props 41-79) and the older props that had no recipe.
    // Inert furniture (pews, crates, sandbags) and architecture get none.
    life_cochlear_intercom: lampProfile({ glowAt: [0.75, 0.72, 0.7], color: 0xffa648 }),
    life_ribcage_rescue_cabinet: lampProfile({ glowAt: [0.55, 0.86, 0.6], color: 0xff3b2f, pulse: 0.2 }),
    life_checkpoint_post: lampProfile({ glowAt: [0.72, 0.92, 0.5], color: 0xffa648 }),
    life_pneumatic_tube_node: profile({
        effects: [
            atBounds('steam', [0.5, 0.35, 0.65], { color: 0xc8dde0, count: 5, height: 0.5, radius: 0.16 }),
            atBounds('glow', [0.68, 0.7, 0.62], { color: 0xffa648, radius: 0.1, pulse: 0.12 })
        ]
    }),
    life_wayfinding_totem: lampProfile({ glowAt: [0.5, 0.95, 0.5], color: 0x55d9ff, pulse: 0.12 }),
    life_seismic_drill: profile({
        effects: [
            atBounds('glow', [0.5, 0.95, 0.5], { color: 0xffa648, radius: 0.13, pulse: 0.08 }),
            atBounds('smoke', [0.5, 0.08, 0.5], { color: 0x9a9182, count: 6, height: 0.35, radius: 0.22 })
        ],
        light: { bounds: [0.5, 0.95, 0.5], color: 0xffa648, intensity: 1.1, distance: 3.6, decay: 2, flicker: 0.05 }
    }),
    life_supply_drop_pod: smoulderProfile({ at: [0.55, 0.85, 0.45], glowAt: [0.45, 0.4, 0.4] }),
    life_wind_mast: lampProfile({ glowAt: [0.5, 0.98, 0.5], color: 0xff3b2f, pulse: 0.45 }),
    life_rope_anchor_post: lampProfile({ glowAt: [0.5, 0.95, 0.5], color: 0xffa648 }),
    life_lookout_perch: lampProfile({ glowAt: [0.62, 0.9, 0.55], color: 0xffa648 }),
    life_fallen_comm_dish: poweredProfile({ sparks: true, lit: false, color: 0x55d9ff, glowAt: [0.45, 0.4, 0.5] }),
    life_ceiling_collapse: poweredProfile({ sparks: true, lit: false, color: 0xffb45b, glowAt: [0.5, 0.6, 0.5], sparkAt: [0.5, 0.9, 0.5] }),
    life_pod_seat_row: poweredProfile({ sparks: true, lit: false, color: 0xff3b2f, glowAt: [0.5, 0.35, 0.6] }),
    life_pipeline_trestle: ventProfile({ at: [0.3, 0.85, 0.5], count: 8 }),
    life_ice_sled: coldProfile({ at: [0.5, 0.5, 0.5], count: 4 }),
    life_ice_core_rack: coldProfile({ glowAt: [0.5, 0.15, 0.5] }),
    life_ice_bore_winch: coldProfile({ at: [0.5, 0.12, 0.5], glowAt: [0.55, 0.98, 0.5] }),
    life_parka_hooks: thermalProfile({ flameAt: [0.5, 0.22, 0.6], glowAt: [0.5, 0.22, 0.6], scale: 0.25, intensity: 0.5, distance: 2 }),
    life_brood_comb: organicProfile({ glowAt: [0.5, 0.5, 0.6], radius: 0.28 }),
    life_hive_dew_funnel: organicProfile({ glowAt: [0.5, 0.15, 0.5] }),
    life_hive_feeding_bladder: organicProfile({ glowAt: [0.5, 0.55, 0.5], radius: 0.3, motion: 0.02 }),
    life_assimilated_desk: poweredProfile({ color: 0x76d95c, glowAt: [0.5, 0.75, 0.5] }),
    life_fungal_cable_bundle: organicProfile({ glowAt: [0.5, 0.45, 0.65] }),
    life_colossal_limb: organicProfile({ glowAt: [0.5, 0.3, 0.5], radius: 0.4, motion: 0.003 }),
    life_drip_buckets: liquidProfile({ surfaceAt: [0.5, 0.6, 0.5], bubblesAt: [0.5, 0.3, 0.5], lit: false, count: 3 }),
    life_confessional: thermalProfile({ flameAt: [0.25, 0.4, 0.4], glowAt: [0.25, 0.4, 0.4], scale: 0.22, intensity: 0.55, distance: 2.2 }),
    life_devotion_tree: thermalProfile({ flameAt: [0.5, 0.12, 0.5], glowAt: [0.5, 0.15, 0.5], scale: 0.3, intensity: 0.9, radius: 0.3 }),
    life_meat_smoking_rack: smoulderProfile({ at: [0.5, 0.75, 0.5], glowAt: [0.5, 0.12, 0.5], count: 8 }),
    life_welding_station: poweredProfile({ sparks: true, color: 0xffb45b, glowAt: [0.55, 0.62, 0.55], sparkAt: [0.55, 0.62, 0.55], sparkCount: 8 }),
    life_exosuit_teardown: poweredProfile({ sparks: true, lit: false, glowAt: [0.6, 0.6, 0.5] }),
    life_fuse_bypass_panel: poweredProfile({ sparks: true, color: 0xff3b2f, glowAt: [0.5, 0.6, 0.65], sparkAt: [0.5, 0.55, 0.65], pulse: 0.3 }),
    life_janitor_cart: liquidProfile({ surfaceAt: [0.3, 0.5, 0.5], bubblesAt: [0.3, 0.35, 0.5], lit: false, count: 3, color: 0x7f8a6a }),
    life_suit_drying_rack: ventProfile({ at: [0.5, 0.8, 0.5], count: 5, color: 0xd9e2e0 }),
    life_pipe_hammock: ventProfile({ at: [0.2, 0.85, 0.5], count: 4 }),
    life_latrine_stall: liquidProfile({ surfaceAt: [0.5, 0.25, 0.5], bubblesAt: [0.5, 0.2, 0.5], lit: false, count: 3, color: 0x6f7a55 }),
    life_sanitation_bidet: liquidProfile({ surfaceAt: [0.5, 0.45, 0.5], bubblesAt: [0.5, 0.35, 0.5], lit: false, count: 3 }),
    life_memorial_board: thermalProfile({ flameAt: [0.5, 0.08, 0.7], glowAt: [0.5, 0.1, 0.7], scale: 0.2, intensity: 0.45, distance: 1.8 }),
    life_acoustic_ear_horn: poweredProfile({ color: 0xffa648, glowAt: [0.5, 0.55, 0.6] }),
    frozen_tanker: coldProfile({ glowAt: [0.5, 0.6, 0.5] }),
    prop_body_human_frozen: coldProfile({ count: 4 }),
    body_frozen_human: coldProfile({ count: 4 }),
    prop_icey_thermal_pod: coldProfile({ glowAt: [0.5, 0.7, 0.5] }),
    prop_oxygen_bottle_cascade_rack: coldProfile({ at: [0.5, 0.85, 0.5], count: 5 }),
    prop_camp_cookfire: smoulderProfile({ at: [0.5, 0.4, 0.5], glowAt: [0.5, 0.15, 0.5], count: 4, lit: false }),
    prop_conduit_hub: poweredProfile({ sparks: true }),
    prop_wall_cable_tray_swag: poweredProfile({ sparks: true, lit: false, glowAt: [0.5, 0.4, 0.6] }),
    prop_chair_operator_wrecked: poweredProfile({ sparks: true, lit: false, glowAt: [0.5, 0.6, 0.5] }),
    prop_floor_conduit_bridge: poweredProfile({ glowAt: [0.5, 0.3, 0.5], color: 0x55d9ff }),
    prop_surgical_cart: poweredProfile({ glowAt: [0.5, 0.8, 0.5], color: 0x52ff9a, radius: 0.08 }),
    prop_medical_bed: poweredProfile({ glowAt: [0.8, 0.7, 0.5], color: 0x52ff9a, radius: 0.1 }),
    prop_valve_wheel_fused: ventProfile({ at: [0.5, 0.7, 0.5], count: 5 }),
    prop_vent_grate_exploded: ventProfile({ at: [0.5, 0.4, 0.5], count: 6 }),
    prop_shrine_plinth_broken: thermalProfile({ flameAt: [0.5, 0.75, 0.5], glowAt: [0.5, 0.72, 0.5], scale: 0.3, intensity: 0.6 }),
    prop_flesh_steel_coffin: organicProfile({ spores: false, motion: 0.008 }),
    prop_flesh_steel_cradle: organicProfile({ spores: false, motion: 0.01 }),
    prop_autopsy_dissection_slab: organicProfile({ spores: false, motion: 0.004, color: 0xd94a4a, glowAt: [0.5, 0.6, 0.5] }),
    prop_cave_queen_throne: organicProfile({ radius: 0.3 }),
    prop_biomech_arch: organicProfile({ spores: false, motion: 0.004 }),
    prop_body_empty_exosuit: poweredProfile({ sparks: true, lit: false, glowAt: [0.5, 0.7, 0.5], color: 0xff3b2f }),
    body_empty_exosuit: poweredProfile({ sparks: true, lit: false, glowAt: [0.5, 0.7, 0.5], color: 0xff3b2f })
};

// The loose ends of a severed spline (src/splineDressingRenderer.js): a cut
// wire keeps arcing, a vein oozes, a coolant pipe vents, a vine sheds.
const SEVERED_SPLINE_PROFILES = {
    spline_cut_wire: profile({
        maxDistance: 22,
        effects: [
            { kind: 'sparks', position: [0, 0, 0], color: 0x9fdcff, count: 9, height: 0.28, radius: 0.05 },
            { kind: 'glow', position: [0, 0, 0], color: 0x7cc8ff, radius: 0.07, pulse: 0.6 }
        ],
        light: { position: [0, 0.05, 0], color: 0x8fd0ff, intensity: 0.7, distance: 2.2, decay: 2, flicker: 0.55 }
    }),
    spline_cut_vein: profile({
        maxDistance: 20,
        effects: [
            { kind: 'bubbles', position: [0, -0.02, 0], color: 0xa8e85a, count: 6, height: -0.35, radius: 0.03 },
            { kind: 'glow', position: [0, 0, 0], color: 0x84cc16, radius: 0.08, pulse: 0.3 }
        ]
    }),
    spline_cut_pipe: profile({
        maxDistance: 22,
        effects: [{ kind: 'steam', position: [0, 0, 0], color: 0xdff6ff, count: 10, height: 0.7, radius: 0.06 }]
    }),
    spline_cut_vine: profile({
        maxDistance: 18,
        effects: [{ kind: 'spores', position: [0, 0, 0], color: 0xc9a06a, count: 4, height: -0.3, radius: 0.05 }]
    })
};

export const PROP_FX_PROFILES = Object.freeze({ ...AMBIENT_PROFILES, ...HERO_PROFILES, ...SEVERED_SPLINE_PROFILES });

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

// Half the drawing buffer's height in pixels: particle sizes are in metres,
// projected through the camera (ThreeGame keeps this current on resize).
const FX_VIEWPORT_HALF_HEIGHT = { value: 450 };
export function setPropFxViewportHeight(pixels) {
    if (Number.isFinite(pixels) && pixels > 0) FX_VIEWPORT_HALF_HEIGHT.value = pixels / 2;
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
        // Metres across: a steam puff, a spark, a spore, a bubble.
        uPointSize: { value: steam ? 0.22 : sparks ? 0.035 : spores ? 0.06 : 0.05 },
        uViewportHalfHeight: FX_VIEWPORT_HALF_HEIGHT,
        uStyle: { value: style }
    };
    const material = new THREE.ShaderMaterial({
        uniforms: local,
        vertexShader: `
            uniform float uTime;
            uniform float uHeight;
            uniform float uSpeed;
            uniform float uPointSize;
            uniform float uViewportHalfHeight;
            uniform int uStyle;
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
                // World size through the projection: orthographic cameras keep it
                // constant, perspective ones shrink it with depth. Puffs grow as they rise.
                float perspective = projectionMatrix[3][3] > 0.5 ? 1.0 : 1.0 / max(0.6, -mv.z);
                float grow = uStyle == 1 ? 0.6 + life * 0.9 : 1.0;
                gl_PointSize = clamp(uPointSize * grow * projectionMatrix[1][1] * uViewportHalfHeight * perspective, 1.5, 96.0);
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

// Dust caught in a practical light: a static cloud filling the pool the light
// throws, from the floor to a little above the lamp. Each mote drifts on its
// own slow loop in the vertex shader and shows only where the light reaches,
// twinkling as it turns. One draw per light; nothing per frame but the clock.
const DUST_MOTE_COUNT = 48;
function createDustMotes(lightSpec, lightPosition, uniforms, seed) {
    const random = seededRandom(seed);
    const reach = (lightSpec.distance ?? 2) * 0.5;
    const top = Math.max(lightPosition.y + 0.25, 0.9);
    const positions = new Float32Array(DUST_MOTE_COUNT * 3);
    const phases = new Float32Array(DUST_MOTE_COUNT);
    for (let i = 0; i < DUST_MOTE_COUNT; i += 1) {
        const angle = random() * Math.PI * 2;
        // Inset by the drift (0.12 m) so a drifting mote stays inside the pool.
        const distance = Math.sqrt(random()) * Math.max(0.1, reach - 0.12);
        positions[i * 3] = lightPosition.x + Math.cos(angle) * distance;
        positions[i * 3 + 1] = 0.08 + random() * (top - 0.16);
        positions[i * 3 + 2] = lightPosition.z + Math.sin(angle) * distance;
        phases[i] = random();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    // Dust reads as the light's colour washed toward warm white.
    const color = new THREE.Color(lightSpec.color ?? 0xffffff).lerp(new THREE.Color(0xfff1d6), 0.45);
    const local = {
        uTime: { value: 0 },
        uColor: { value: color },
        uLight: { value: lightPosition.clone() },
        uReach: { value: reach },
        uPointSize: { value: 0.032 },
        uViewportHalfHeight: FX_VIEWPORT_HALF_HEIGHT
    };
    const material = new THREE.ShaderMaterial({
        uniforms: local,
        vertexShader: `
            uniform float uTime;
            uniform float uPointSize;
            uniform float uViewportHalfHeight;
            uniform vec3 uLight;
            uniform float uReach;
            attribute float aPhase;
            varying float vGlow;
            void main() {
                float t = uTime + aPhase * 97.0;
                vec3 p = position + vec3(sin(t * 0.21 + aPhase * 6.28) * 0.12, sin(t * 0.13 + aPhase * 3.1) * 0.08, cos(t * 0.17 + aPhase * 5.0) * 0.12);
                vec4 mv = modelViewMatrix * vec4(p, 1.0);
                gl_Position = projectionMatrix * mv;
                float perspective = projectionMatrix[3][3] > 0.5 ? 1.0 : 1.0 / max(0.6, -mv.z);
                gl_PointSize = clamp(uPointSize * projectionMatrix[1][1] * uViewportHalfHeight * perspective, 2.0, 24.0);
                float lit = 1.0 - smoothstep(uReach * 0.25, uReach, distance(p, uLight));
                vGlow = lit * (0.45 + 0.55 * max(0.0, sin(t * 1.3 + aPhase * 20.0)));
            }
        `,
        fragmentShader: `
            uniform vec3 uColor;
            varying float vGlow;
            void main() {
                float disc = smoothstep(0.5, 0.1, length(gl_PointCoord - 0.5));
                gl_FragColor = vec4(uColor, disc * vGlow * 0.8);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    points.renderOrder = 6;
    points.userData.propFxOwned = true;
    uniforms.push(local.uTime);
    return points;
}

let haloTexture = null;
function getHaloTexture() {
    if (haloTexture) return haloTexture;
    const size = 64;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const r = Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) / (size / 2);
            // A bright core and a long soft falloff, like light in dusty air.
            const a = Math.max(0, 1 - r) ** 2.2 * 0.75 + Math.max(0, 1 - r * 3.2) ** 2 * 0.25;
            const i = (y * size + x) * 4;
            data[i] = data[i + 1] = data[i + 2] = 255;
            data[i + 3] = Math.round(Math.min(1, a) * 255);
        }
    }
    haloTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    haloTexture.needsUpdate = true;
    haloTexture.magFilter = THREE.LinearFilter;
    haloTexture.minFilter = THREE.LinearFilter;
    return haloTexture;
}

function createGlow(spec, pulseTargets) {
    const material = new THREE.SpriteMaterial({
        map: getHaloTexture(),
        color: spec.color ?? 0xffffff,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
    });
    const sprite = new THREE.Sprite(material);
    // The halo spreads several times the source's radius.
    const scale = (spec.radius ?? 0.2) * 5;
    sprite.scale.setScalar(scale);
    sprite.renderOrder = 7;
    // The sprite's material is ours; its geometry is three's shared quad.
    material.userData.propFxOwnedMaterial = true;
    sprite.userData.propFxOwned = true;
    sprite.userData.propFxSharedGeometry = true;
    pulseTargets.push({ object: sprite, material, amount: spec.pulse ?? 0.12, baseOpacity: material.opacity, baseScale: scale });
    return sprite;
}

export function getPropFxProfile(type) {
    return PROP_FX_PROFILES[type] ?? null;
}

/** Attach the reusable FX recipe for a normalized world model. */
// Settings > Graphics > Effects (src/graphicsSettings.js): full shows every
// effect; reduced drops the dust motes; off drops every particle but keeps
// flames and water, which are part of what the prop is. Lights are never
// touched (toggling a light recompiles every lit shader).
let propFxQuality = 'full';

/** Sets the effects level for props built from now on. */
export function setPropFxQuality(level) {
    propFxQuality = ['full', 'reduced', 'off'].includes(level) ? level : 'full';
}

function propFxObjectVisible(object, level) {
    if (level === 'full') return true;
    if (level === 'reduced') return !object.name?.endsWith(':DustMotes');
    return !(object.isPoints || object.isSprite);
}

/** Applies an effects level to everything under `root` (built props, a whole scene). */
export function applyPropFxQuality(root, level = propFxQuality) {
    root?.traverse?.((object) => {
        if (object.userData?.propFxOwned) object.visible = propFxObjectVisible(object, level);
    });
}

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
        const motes = createDustMotes(spec, light.position, timeUniforms, seed ^ hashString('motes'));
        motes.name = `${type}:DustMotes`;
        group.add(motes);
    }

    applyPropFxQuality(group);
    root.add(group);
    const scratch = new THREE.Vector3();
    const baseModelScale = model.scale.clone();
    const animateModel = Boolean(config.motion && !root.userData?.mixer);
    let elapsed = (seed % 4096) / 193;
    let disposed = false;
    let enabled = true;
    let mode = 'idle';
    const api = {
        type,
        group,
        lightSources,
        get enabled() { return enabled; },
        get mode() { return mode; },
        /** Switch the effects and their pooled light (never `.visible` on a light). */
        setEnabled(next) {
            enabled = Boolean(next);
            api.update(0);
            return enabled;
        },
        /** Named interaction state for persistence and authored prop behavior. */
        setMode(next) {
            mode = String(next || 'idle');
            if (['off', 'spent', 'disabled', 'destroyed'].includes(mode)) api.setEnabled(false);
            else if (['idle', 'on', 'working', 'open', 'armed'].includes(mode)) api.setEnabled(true);
            return mode;
        },
        toggle() { return api.setEnabled(!enabled); },
        update(delta = 0, cameraPosition = null) {
            if (disposed) return;
            elapsed += Math.min(Math.max(Number(delta) || 0, 0), 0.1);
            let active = enabled && root.visible !== false;
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
                target.object.scale.setScalar((target.baseScale ?? 1) * pulse);
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
                if (!object.userData.propFxSharedGeometry) object.geometry?.dispose?.();
                const materials = Array.isArray(object.material) ? object.material : [object.material];
                for (const material of materials) material?.dispose?.();
            });
            group.removeFromParent();
        }
    };
    api.update(0);
    return api;
}
