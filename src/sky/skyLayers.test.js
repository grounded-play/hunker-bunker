import { describe, expect, it } from 'vitest';
import { SKY_LAYERS, resolveSkyLayers, resolveSkyBodies, resolveSkyTransients, ADDITIVE_LAYER_IDS, BODY_SPRITE_MODES } from './skyLayers.js';
import { SPRITE_MODES } from './skySpriteMaterial.js';

const baseState = {
    starOpacity: 1,
    stormDensity: 0,
    weatherState: 'clear',
    dayFactor: 0,
    horizonColor: { r: 0.7, g: 0.5, b: 0.3 }
};
const resolve = (overrides = {}) => resolveSkyLayers({
    biomeKey: 'active',
    skyState: { ...baseState, ...(overrides.skyState ?? {}) },
    ...overrides
});

describe('SKY_LAYERS definition', () => {
    it('assigns every layer a unique render order', () => {
        const orders = SKY_LAYERS.map((l) => l.renderOrder);
        expect(new Set(orders).size).toBe(orders.length);
    });

    it('orders layers back to front, matching the catalog stack', () => {
        const orders = SKY_LAYERS.map((l) => l.renderOrder);
        expect(orders).toEqual([...orders].sort((a, b) => a - b));
    });

    it('gives nearer layers more parallax than further ones', () => {
        for (let i = 1; i < SKY_LAYERS.length; i += 1) {
            expect(SKY_LAYERS[i].parallax).toBeGreaterThanOrEqual(SKY_LAYERS[i - 1].parallax);
        }
    });
});

describe('resolveSkyLayers blending', () => {
    it('marks additive layers so the renderer ignores their alpha channel', () => {
        // The delivered nebula/star art was hard-keyed and the aurora/lens art
        // ships un-keyed on black. Ignoring alpha is what makes both correct.
        for (const layer of resolve().filter((l) => ADDITIVE_LAYER_IDS.includes(l.layerId))) {
            expect(layer.blend).toBe('additive');
            expect(layer.ignoreAlpha).toBe(true);
        }
    });

    it('keeps alpha blending for the green-keyed cutout layers', () => {
        for (const layer of resolve().filter((l) => !ADDITIVE_LAYER_IDS.includes(l.layerId))) {
            expect(layer.blend).toBe('alpha');
            expect(layer.ignoreAlpha).toBe(false);
        }
    });

    it('only emits texture urls under the sky asset directory', () => {
        for (const layer of resolve()) {
            expect(layer.url).toMatch(/^\/sky\/[a-z0-9_]+\.png$/);
        }
    });
});

describe('resolveSkyLayers biome selection', () => {
    it('picks the cryo horizon set when the player is in the cryo sector', () => {
        const urls = resolve({ biomeKey: 'cryo' }).map((l) => l.url);
        expect(urls).toContain('/sky/far_glacier_wall.png');
        expect(urls).not.toContain('/sky/far_mesa_ridge.png');
    });

    it('picks the bio horizon set when the player is in the bio sector', () => {
        const urls = resolve({ biomeKey: 'bio' }).map((l) => l.url);
        expect(urls).toContain('/sky/mid_hive_spires.png');
        expect(urls).not.toContain('/sky/mid_wreck_skyline.png');
    });

    it('emits a horizon layer for each of the three depth bands in every biome', () => {
        for (const biomeKey of ['active', 'cryo', 'bio']) {
            const ids = resolve({ biomeKey }).map((l) => l.layerId);
            expect(ids).toContain('horizon.far');
            expect(ids).toContain('horizon.mid');
            expect(ids).toContain('horizon.near');
        }
    });
});

describe('resolveSkyLayers weather', () => {
    it('emits no storm deck while the sky is clear', () => {
        expect(resolve().find((l) => l.layerId === 'stormdeck')).toBeUndefined();
    });

    it('emits the storm deck matching the active weather state', () => {
        const layer = resolve({ skyState: { weatherState: 'snow', stormDensity: 0.5 } })
            .find((l) => l.layerId === 'stormdeck');
        expect(layer.url).toBe('/sky/storm_ice_haze.png');
    });

    it('scales storm deck opacity with storm density', () => {
        const light = resolve({ skyState: { weatherState: 'rainstorm', stormDensity: 0.2 } })
            .find((l) => l.layerId === 'stormdeck');
        const heavy = resolve({ skyState: { weatherState: 'rainstorm', stormDensity: 1 } })
            .find((l) => l.layerId === 'stormdeck');
        expect(heavy.opacity).toBeGreaterThan(light.opacity);
    });
});

describe('resolveSkyLayers opacity', () => {
    it('drives deep-field opacity from the state star opacity', () => {
        const night = resolve({ skyState: { starOpacity: 1 } })
            .find((l) => l.layerId === 'deepfield');
        const noon = resolve({ skyState: { starOpacity: 0.16 } })
            .find((l) => l.layerId === 'deepfield');
        expect(night.opacity).toBeGreaterThan(noon.opacity);
    });

    it('never emits a layer outside the unit opacity range', () => {
        for (const density of [0, 0.35, 1]) {
            for (const layer of resolve({ skyState: { weatherState: 'rainstorm', stormDensity: density } })) {
                expect(layer.opacity).toBeGreaterThanOrEqual(0);
                expect(layer.opacity).toBeLessThanOrEqual(1);
            }
        }
    });

    it('omits layers that would render fully transparent', () => {
        const layers = resolve({ skyState: { starOpacity: 0 } });
        expect(layers.every((l) => l.opacity > 0)).toBe(true);
    });

    it('tints the horizon mask layers with the sky horizon colour', () => {
        const layer = resolve().find((l) => l.layerId === 'horizon.far');
        expect(layer.tint).toEqual(baseState.horizonColor);
    });
});

describe('resolveSkyLayers motion', () => {
    it('animates the cloud and storm decks', () => {
        // High cloud only renders against a lit sky, so this needs daylight.
        const storm = resolve({ skyState: { weatherState: 'rainstorm', stormDensity: 0.8, dayFactor: 1 } });
        for (const id of ['highcloud', 'stormdeck']) {
            expect(storm.find((l) => l.layerId === id).animated).toBe(true);
        }
    });

    it('animates the aurora with a shimmer rather than a downwind drift', () => {
        const aurora = resolve().find((l) => l.layerId === 'aurora');
        expect(aurora.animated).toBe(true);
        expect(aurora.cloudMode).toBe('shimmer');
    });

    it('drifts the cloud decks downwind', () => {
        expect(resolve({ skyState: { dayFactor: 1 } })
            .find((l) => l.layerId === 'highcloud').cloudMode).toBe('drift');
    });

    it('leaves deep space and the horizon bands still', () => {
        // Deep space does not drift on a human timescale, and the horizon
        // bands are terrain.
        for (const id of ['deepfield', 'stars', 'horizon.far', 'horizon.mid', 'horizon.near']) {
            expect(resolve().find((l) => l.layerId === id).animated).toBe(false);
        }
    });
});

describe('resolveSkyBodies', () => {
    const bodies = [
        { assetId: 'sky_body_sun_primary', angularSize: 0.04, direction: { x: 0, y: 1, z: 0 } },
        { assetId: 'sky_body_moon_shattered', angularSize: 0.1, direction: { x: 1, y: 0.3, z: 0 } },
        { assetId: 'sky_body_ring_arc', angularSize: 0.5, direction: { x: 0, y: 0.4, z: 1 } }
    ];
    const resolveBodies = (over = {}) => resolveSkyBodies({
        ...baseState, bodies, ...over
    });

    it('maps every body to a texture under the sky asset directory', () => {
        for (const entry of resolveBodies()) {
            expect(entry.url).toMatch(/^\/sky\/[a-z0-9_]+\.png$/);
        }
    });

    it('blends emissive bodies additively and solid ones through alpha', () => {
        const byId = Object.fromEntries(resolveBodies().map((e) => [e.key, e]));
        // Catalog L3: suns and the ring arc are un-keyed light on black; moons
        // and planets are green-keyed opaque solids.
        expect(byId.sky_body_sun_primary.blend).toBe('additive');
        expect(byId.sky_body_ring_arc.blend).toBe('additive');
        expect(byId.sky_body_moon_shattered.blend).toBe('alpha');
    });

    it('carries each body direction and angular size through untouched', () => {
        const [sun] = resolveBodies();
        expect(sun.direction).toEqual(bodies[0].direction);
        expect(sun.angularSize).toBe(bodies[0].angularSize);
    });

    it('fades the faint bodies out in daylight but never the suns', () => {
        const byIdDay = Object.fromEntries(
            resolveSkyBodies({ ...baseState, bodies, dayFactor: 1 }).map((e) => [e.key, e])
        );
        const byIdNight = Object.fromEntries(
            resolveSkyBodies({ ...baseState, bodies, dayFactor: 0 }).map((e) => [e.key, e])
        );
        expect(byIdDay.sky_body_moon_shattered.opacity)
            .toBeLessThan(byIdNight.sky_body_moon_shattered.opacity);
        expect(byIdDay.sky_body_sun_primary.opacity).toBeCloseTo(1, 5);
    });

    it('returns nothing when the sky has no bodies', () => {
        expect(resolveSkyBodies({ ...baseState, bodies: [] })).toEqual([]);
    });

    it('hides everything behind a heavy storm', () => {
        const stormed = resolveSkyBodies({ ...baseState, bodies, stormDensity: 1 });
        expect(stormed.every((e) => e.opacity === 0 || e.opacity < 0.05)).toBe(true);
    });
});

describe('resolveSkyTransients', () => {
    const transient = {
        key: 'scheduled:100',
        sheetId: 'sky_fx_comet_longtail',
        progress: 0.5,
        elapsedInTransient: 10,
        angularSize: 0.18,
        direction: { x: 0, y: 0.7, z: 0.71 }
    };
    const build = (over = {}) => resolveSkyTransients({
        ...baseState, sunDirection: { x: 0, y: 1, z: 0 }, transients: [transient], ...over
    });

    it('points each transient at its atlas in the sky directory', () => {
        expect(build()[0].url).toBe('/sky/fx_comet_longtail.png');
    });

    it('always blends transients additively', () => {
        // Every animation atlas ships un-keyed on black.
        expect(build()[0].blend).toBe('additive');
    });

    it('windows the atlas down to the frame the progress calls for', () => {
        const [entry] = build();
        expect(entry.frameRect).toBeDefined();
        expect(entry.frameRect.repeatX).toBeCloseTo(1 / 4, 6);
    });

    it('advances the frame as the transient progresses', () => {
        const early = build({ transients: [{ ...transient, progress: 0 }] })[0];
        const late = build({ transients: [{ ...transient, progress: 1 }] })[0];
        expect(late.frameRect.offsetY !== early.frameRect.offsetY
            || late.frameRect.offsetX !== early.frameRect.offsetX).toBe(true);
    });

    it('anchors the dying sun to the sun rather than to a path', () => {
        const [entry] = build({
            transients: [{ ...transient, sheetId: 'sky_fx_sun_gutter' }]
        });
        expect(entry.direction.y).toBeCloseTo(1, 5);
    });

    it('ignores a transient whose atlas is not in the manifest', () => {
        expect(build({ transients: [{ ...transient, sheetId: 'nope' }] })).toEqual([]);
    });

    it('returns nothing when the sky is empty', () => {
        expect(build({ transients: [] })).toEqual([]);
    });
});

describe('resolveSkyTransients fade-out', () => {
    const base = {
        key: 'scheduled:100',
        sheetId: 'sky_fx_comet_longtail',
        elapsedInTransient: 10,
        angularSize: 0.18,
        direction: { x: 0, y: 0.7, z: 0.71 }
    };
    const at = (progress, sheetId = base.sheetId) => resolveSkyTransients({
        ...baseState,
        sunDirection: { x: 0, y: 1, z: 0 },
        transients: [{ ...base, sheetId, progress }]
    })[0];

    it('runs a trigger animation at full strength through its middle', () => {
        expect(at(0.5).opacity).toBeCloseTo(1, 5);
    });

    it('fades the final frames out instead of cutting them off', () => {
        expect(at(0.95).opacity).toBeLessThan(at(0.75).opacity);
        expect(at(0.995).opacity).toBeLessThan(0.1);
    });

    it('eases in so a trigger never pops onto the screen at full brightness', () => {
        expect(at(0.01).opacity).toBeLessThan(1);
        expect(at(0.01).opacity).toBeGreaterThan(0);
    });

    it('fades a looping tumbler out too, even though its frames keep cycling', () => {
        // The satellite's frames loop, but its pass through the sky does not --
        // the envelope governs presence, the cycle governs frames.
        expect(at(0.98, 'sky_fx_satellite_tumble').opacity)
            .toBeLessThan(at(0.5, 'sky_fx_satellite_tumble').opacity);
    });

    it('gives lightning a snappier tail than a slow narrative beat', () => {
        // A strike that lingered would stop reading as a strike.
        expect(at(0.85, 'sky_fx_lightning_fork').opacity)
            .toBeGreaterThan(at(0.85, 'sky_fx_mothership_transit').opacity);
    });

    it('never emits an opacity outside the unit range', () => {
        for (let p = 0; p <= 1; p += 0.02) {
            const entry = at(p);
            if (!entry) continue;
            expect(entry.opacity).toBeGreaterThanOrEqual(0);
            expect(entry.opacity).toBeLessThanOrEqual(1);
        }
    });
});

describe('resolveSkyBodies surface motion', () => {
    const body = (assetId, y = 0.9) => ({
        assetId, angularSize: 0.1, direction: { x: 0, y, z: Math.sqrt(Math.max(0, 1 - y * y)) }
    });
    const build = (bodies, over = {}) => resolveSkyBodies({ ...baseState, bodies, ...over });

    it('churns a star surface rather than leaving it a flat disc', () => {
        expect(build([body('sky_body_sun_primary')])[0].spriteMode).toBe(SPRITE_MODES.GRANULATION);
    });

    it('leaves moons and planets with no surface motion at all', () => {
        // A tidally locked body genuinely does not change, and the art already
        // carries a baked terminator that a procedural one would fight.
        for (const id of ['sky_body_moon_cratered_large', 'sky_body_planet_rust',
                          'sky_body_moon_shattered', 'sky_body_planet_dead_ocean']) {
            expect(build([body(id)])[0].spriteMode, id).toBe(SPRITE_MODES.NONE);
        }
    });

    it('scintillates the ring arc instead of moving it', () => {
        expect(build([body('sky_body_ring_arc')])[0].spriteMode).toBe(SPRITE_MODES.SCINTILLATE);
    });

    it('assigns a mode to every body in the catalog', () => {
        for (const assetId of Object.keys(BODY_SPRITE_MODES)) {
            expect(build([body(assetId)])[0].spriteMode).toBeDefined();
        }
    });
});

describe('resolveSkyBodies atmospheric extinction', () => {
    const moon = (y) => ({
        assetId: 'sky_body_moon_cratered_large',
        angularSize: 0.1,
        direction: { x: 0, y, z: Math.sqrt(Math.max(0, 1 - y * y)) }
    });
    const build = (y) => resolveSkyBodies({ ...baseState, bodies: [moon(y)] })[0];

    it('dims a body as it sinks toward the horizon', () => {
        // Real extinction: more atmosphere in the way at low elevation.
        expect(build(0.06).opacity).toBeLessThan(build(0.9).opacity);
    });

    it('warms a body toward the horizon rather than only darkening it', () => {
        const low = build(0.06).tint;
        const high = build(0.9).tint;
        expect(low.r / Math.max(low.b, 1e-6)).toBeGreaterThan(high.r / Math.max(high.b, 1e-6));
    });

    it('leaves a body overhead essentially untinted', () => {
        const { tint } = build(1);
        expect(tint.r).toBeCloseTo(1, 2);
        expect(tint.b).toBeCloseTo(1, 2);
    });

    it('keeps tint channels inside the unit range at every elevation', () => {
        for (let y = 0.01; y <= 1; y += 0.05) {
            const { tint } = build(y);
            for (const channel of [tint.r, tint.g, tint.b]) {
                expect(channel).toBeGreaterThanOrEqual(0);
                expect(channel).toBeLessThanOrEqual(1);
            }
        }
    });
});

describe('resolveSkyBodies tumble', () => {
    const body = (assetId) => ({
        assetId, angularSize: 0.1, direction: { x: 0, y: 0.2, z: 0.98 }
    });

    it('tumbles the derelict, whose orientation genuinely changes in orbit', () => {
        const [entry] = resolveSkyBodies({
            ...baseState, bodies: [body('sky_body_mothership_derelict')]
        });
        expect(entry.tumble).toBeTruthy();
        expect(entry.tumble.rollPeriod).not.toBe(entry.tumble.squashPeriod);
    });

    it('leaves natural bodies untumbled', () => {
        // A moon does not visibly roll, and a planet certainly does not
        // foreshorten -- a sphere looks the same from every angle.
        for (const id of ['sky_body_moon_cratered_large', 'sky_body_planet_rust',
                          'sky_body_gasgiant_ringed', 'sky_body_sun_primary']) {
            const [entry] = resolveSkyBodies({ ...baseState, bodies: [body(id)] });
            expect(entry.tumble, id).toBeUndefined();
        }
    });
});
