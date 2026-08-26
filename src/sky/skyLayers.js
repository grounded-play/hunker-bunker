// Which textures make up the sky this frame, and how each one blends.
//
// Pure: returns a plain description that skyDome.js turns into meshes. Keeping
// the selection logic here means biome/weather/opacity rules are testable
// without a GPU, and the THREE layer stays a dumb renderer of this output.
//
// Layer ids, radii and parallax factors follow
// docs/sky-layer-and-weather-asset-catalog-2026-08-25.md section 2.

import { SKY_SHEETS, frameRectFor } from './skySheets.js';
import { sheetTimeForTransient, anchorDirectionFor } from './skyTransients.js';

const SKY_DIR = '/sky';

// Additive layers ignore their alpha channel entirely. Two different kinds of
// art land here and the same rule fixes both (catalog section 1c): the batch-2
// nebulae and stars were green-keyed to a near-binary alpha, which would throw
// away their soft falloff, while the batch-3/4 suns, ring, aurora and lens
// elements ship un-keyed on black with alpha uniformly 255. Both are correct
// when blended additively against black and read from RGB alone.
export const ADDITIVE_LAYER_IDS = Object.freeze([
    'deepfield',
    'stars',
    'aurora'
]);

// Which layers move, and how. Cloud and storm decks are blown downwind; aurora
// undulates along its own curtain instead, because aurora is not carried by
// wind and scrolling it sideways reads as sliding cloth. Deep space and the
// horizon bands never move -- one is too far away to drift on a human
// timescale, the other is terrain.
export const CLOUD_MOTION = Object.freeze({
    aurora: 'shimmer',
    highcloud: 'drift',
    stormdeck: 'drift'
});

export const SKY_LAYERS = Object.freeze([
    { id: 'deepfield', renderOrder: -60, parallax: 0.0, band: 'dome' },
    { id: 'stars', renderOrder: -59, parallax: 0.0, band: 'dome' },
    { id: 'aurora', renderOrder: -52, parallax: 0.03, band: 'upper' },
    { id: 'highcloud', renderOrder: -48, parallax: 0.06, band: 'upper' },
    { id: 'stormdeck', renderOrder: -44, parallax: 0.12, band: 'upper' },
    { id: 'horizon.far', renderOrder: -40, parallax: 0.22, band: 'horizon' },
    { id: 'horizon.mid', renderOrder: -36, parallax: 0.38, band: 'horizon' },
    { id: 'horizon.near', renderOrder: -32, parallax: 0.62, band: 'horizon' }
]);

const LAYER_BY_ID = new Map(SKY_LAYERS.map((layer) => [layer.id, layer]));

// Horizon bands per biome. `far` and `mid` are grayscale luminance masks tinted
// at runtime; `near` ships as RGBA but came back near-monochrome, so it takes a
// gentler tint rather than a regeneration pass (catalog section 1c).
const HORIZON_SETS = Object.freeze({
    active: { far: 'far_mesa_ridge', mid: 'mid_wreck_skyline', near: 'near_rock_teeth' },
    cryo: { far: 'far_glacier_wall', mid: 'mid_frozen_rig', near: 'near_frost_pines' },
    bio: { far: 'far_fungal_massif', mid: 'mid_hive_spires', near: 'near_spore_forest' }
});

const STORM_DECKS = Object.freeze({
    rainstorm: 'storm_dust_wall',
    snow: 'storm_ice_haze',
    spore_drift: 'storm_spore_veil',
    fog_gust: 'storm_ash_fall'
});

const DEEP_FIELD_TEXTURE = 'nebula_band_core';
const STAR_TEXTURE = 'star_dense_knot';
const AURORA_TEXTURE = 'aurora_curtain_tall';
const HIGH_CLOUD_TEXTURE = 'cloud_cirrus_thin';

const clamp01 = (value) => (value < 0 ? 0 : value > 1 ? 1 : value);

function makeLayer(id, textureName, opacity, extras = {}) {
    const definition = LAYER_BY_ID.get(id);
    const additive = ADDITIVE_LAYER_IDS.includes(id);
    const cloudMode = CLOUD_MOTION[id] ?? null;
    return {
        layerId: id,
        animated: cloudMode !== null,
        cloudMode,
        url: `${SKY_DIR}/${textureName}.png`,
        renderOrder: definition.renderOrder,
        parallax: definition.parallax,
        band: definition.band,
        blend: additive ? 'additive' : 'alpha',
        // Additive layers read RGB only -- see ADDITIVE_LAYER_IDS above.
        ignoreAlpha: additive,
        opacity: clamp01(opacity),
        ...extras
    };
}

export function resolveSkyLayers({ biomeKey = 'active', skyState } = {}) {
    const {
        starOpacity = 0,
        stormDensity = 0,
        weatherState = 'clear',
        dayFactor = 0,
        horizonColor = { r: 1, g: 1, b: 1 }
    } = skyState ?? {};

    const horizons = HORIZON_SETS[biomeKey] ?? HORIZON_SETS.active;
    // Additive gains are deliberately well under 1: these layers stack, and the
    // painted nebula art is bright enough that unattenuated it washes the whole
    // night sky to white.
    const layers = [
        makeLayer('deepfield', DEEP_FIELD_TEXTURE, starOpacity * 0.42),
        makeLayer('stars', STAR_TEXTURE, starOpacity * 0.30),
        // Aurora is a night phenomenon and a storm hides it.
        makeLayer('aurora', AURORA_TEXTURE, starOpacity * 0.22 * (1 - stormDensity)),
        // High cloud is only readable against a lit sky.
        makeLayer('highcloud', HIGH_CLOUD_TEXTURE, dayFactor * 0.6 * (1 - stormDensity * 0.7))
    ];

    const stormTexture = STORM_DECKS[weatherState];
    if (stormTexture && stormDensity > 0) {
        layers.push(makeLayer('stormdeck', stormTexture, stormDensity * 0.95));
    }

    // The three horizon bands are always present -- they meet the terrain edge,
    // so dropping one would leave a visible seam rather than a subtler sky.
    layers.push(makeLayer('horizon.far', horizons.far, 1, { tint: horizonColor }));
    layers.push(makeLayer('horizon.mid', horizons.mid, 1, { tint: horizonColor }));
    layers.push(makeLayer('horizon.near', horizons.near, 1, { tint: horizonColor, tintStrength: 0.35 }));

    return layers
        .filter((layer) => layer.opacity > 0)
        .sort((a, b) => a.renderOrder - b.renderOrder);
}

// Celestial body textures. Catalog L3 splits this layer by nature rather than
// by kind: suns and the ring arc are pure emitted light shipped un-keyed on
// black, so they blend additively; moons, planets and the derelict are opaque
// lit solids shipped green-keyed, so they alpha-blend.
const BODY_TEXTURES = Object.freeze({
    sky_body_sun_primary: 'body_sun_primary',
    sky_body_sun_dwarf: 'body_sun_dwarf',
    sky_body_ring_arc: 'body_ring_arc',
    sky_body_moon_cratered_large: 'body_moon_cratered_large',
    sky_body_moon_cratered_small: 'body_moon_cratered_small',
    sky_body_moon_shattered: 'body_moon_shattered',
    sky_body_planet_rust: 'body_planet_rust',
    sky_body_planet_dead_ocean: 'body_planet_dead_ocean',
    sky_body_gasgiant_ringed: 'body_gasgiant_ringed',
    sky_body_mothership_derelict: 'body_mothership_derelict'
});

const ADDITIVE_BODY_IDS = Object.freeze([
    'sky_body_sun_primary',
    'sky_body_sun_dwarf',
    'sky_body_ring_arc'
]);

export function resolveSkyBodies(skyState) {
    const { bodies = [], dayFactor = 0, stormDensity = 0 } = skyState ?? {};

    return bodies
        .filter((body) => BODY_TEXTURES[body.assetId])
        .map((body) => {
            const additive = ADDITIVE_BODY_IDS.includes(body.assetId);
            // A sun burns through daylight; a moon or planet washes out in it.
            // Thin atmosphere, so they never disappear entirely at noon.
            const daylightFade = additive ? 1 : clamp01(1 - dayFactor * 0.78);
            return {
                key: body.assetId,
                url: `${SKY_DIR}/${BODY_TEXTURES[body.assetId]}.png`,
                direction: body.direction,
                angularSize: body.angularSize,
                blend: additive ? 'additive' : 'alpha',
                opacity: clamp01(daylightFade * (1 - stormDensity))
            };
        });
}

// Active transients as billboard entries. Every animation atlas ships un-keyed
// on black, so they are additive without exception -- there is no keyed variant
// to branch on the way the celestial bodies have.
export function resolveSkyTransients(skyState) {
    const { transients = [], stormDensity = 0 } = skyState ?? {};

    return transients
        .filter((transient) => SKY_SHEETS[transient.sheetId])
        .map((transient) => {
            const definition = SKY_SHEETS[transient.sheetId];
            return {
                key: transient.key,
                url: definition.url,
                // The sheet's own timeline is not the transient's lifetime;
                // sheetTimeForTransient reconciles them.
                frameRect: frameRectFor(definition, sheetTimeForTransient(definition, transient)),
                direction: anchorDirectionFor(definition.anchor, skyState, transient.direction),
                angularSize: transient.angularSize,
                blend: 'additive',
                // Heavy weather hides everything above the cloud deck, except
                // the lightning that belongs to the storm itself.
                opacity: definition.renderAs?.includes('storm')
                    ? 1
                    : clamp01(1 - stormDensity * 0.85)
            };
        });
}
