import * as THREE from 'three';

// Billboard material for celestial bodies and animated transients.
//
// Two things a plain MeshBasicMaterial cannot do, both required by
// docs/sky-fx-animation-classes-2026-08-26.md:
//
//   1. Sample TWO atlas cells and cross-fade between them. A single uv window
//      can only step to the nearest whole frame, and stepping is exactly wrong
//      for anything slow -- a body meant to change over a minute either pops
//      every few seconds or appears frozen. There is no frame rate that fixes
//      that; it needs interpolation.
//   2. Procedural surface motion for the assets that should NOT get atlases.
//      A star's granulation and a nebula's billow are non-directional, so noise
//      beats any finite sheet and never repeats. Moons and planets get no
//      surface motion at all, because a tidally locked body genuinely does not
//      change and faking it looks wrong.

export const SPRITE_MODES = Object.freeze({
    NONE: 0,
    GRANULATION: 1,   // stars: convection churn + prominence flicker
    BILLOW: 2,        // nebula veils: slow domain-warped drift
    SCINTILLATE: 3    // galactic band, ring arc, star accents: brightness only
});

const VERTEX_SHADER = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = `
uniform sampler2D uMap;
// xy = uv offset, zw = uv repeat, for each of the two frames being blended.
uniform vec4 uRectA;
uniform vec4 uRectB;
uniform float uMix;
uniform float uOpacity;
uniform float uMode;
uniform float uTime;
uniform float uAdditive;
uniform vec3 uTint;
varying vec2 vUv;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

vec4 sampleCell(vec4 rect, vec2 uv) {
    return texture2D(uMap, rect.xy + clamp(uv, 0.0, 1.0) * rect.zw);
}

void main() {
    vec2 uv = vUv;

    // Procedural surface motion, applied to the sample coordinate so it warps
    // the art rather than sitting on top of it.
    if (uMode > 0.5 && uMode < 1.5) {
        // Granulation: two counter-drifting noise fields, so the surface
        // churns without ever settling into a pattern.
        float a = noise(uv * 9.0 + vec2(uTime * 0.05, -uTime * 0.04));
        float b = noise(uv * 17.0 - vec2(uTime * 0.03, uTime * 0.06));
        uv += (vec2(a, b) - 0.5) * 0.010;
    } else if (uMode > 1.5 && uMode < 2.5) {
        // Billow: very slow, very large -- a nebula should read as barely
        // moving, not as smoke.
        float w = noise(uv * 2.2 + uTime * 0.006);
        uv += (vec2(w, noise(uv * 1.7 - uTime * 0.004)) - 0.5) * 0.024;
    }

    vec4 a = sampleCell(uRectA, uv);
    vec4 b = sampleCell(uRectB, uv);
    // Smoothstep the blend: a linear ramp reads as a double exposure at the
    // midpoint, where both frames sit at half strength simultaneously.
    float m = uMix * uMix * (3.0 - 2.0 * uMix);
    vec4 texel = mix(a, b, m);

    float gain = 1.0;
    if (uMode > 2.5) {
        // Scintillation is atmospheric, not stellar -- brightness only, and
        // fast enough to read as twinkle rather than as a pulse.
        gain = 0.88 + 0.12 * noise(uv * 3.0 + uTime * 1.7);
    }

    vec3 rgb = texel.rgb * uTint * gain;
    if (uAdditive > 0.5) {
        // Additive art is attenuated through RGB, never alpha: it is close to
        // fully opaque, so alpha barely dims it.
        gl_FragColor = vec4(rgb * uOpacity, 1.0);
    } else {
        gl_FragColor = vec4(rgb, texel.a * uOpacity);
    }
}
`;

export function createSkySpriteMaterial({ mode = SPRITE_MODES.NONE } = {}) {
    return new THREE.ShaderMaterial({
        uniforms: {
            uMap: { value: null },
            uRectA: { value: new THREE.Vector4(0, 0, 1, 1) },
            uRectB: { value: new THREE.Vector4(0, 0, 1, 1) },
            uMix: { value: 0 },
            uOpacity: { value: 1 },
            uMode: { value: mode },
            uTime: { value: 0 },
            uAdditive: { value: 0 },
            uTint: { value: new THREE.Color(1, 1, 1) }
        },
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        fog: false,
        side: THREE.DoubleSide
    });
}

const clamp01 = (value) => (value < 0 ? 0 : value > 1 ? 1 : value);

function writeRect(target, rect) {
    target.set(rect.offsetX, rect.offsetY, rect.repeatX, rect.repeatY);
}

export function updateSkySpriteMaterial(material, {
    map,
    rectA,
    rectB,
    mix,
    opacity,
    tint,
    time,
    additive,
    mode
} = {}) {
    const { uniforms } = material;
    if (map !== undefined && uniforms.uMap.value !== map) {
        uniforms.uMap.value = map;
        material.needsUpdate = true;
    }
    if (rectA) {
        writeRect(uniforms.uRectA.value, rectA);
        // With no second frame the material collapses to a single window, which
        // is how stepped transients and still bodies share this shader.
        if (!rectB) {
            writeRect(uniforms.uRectB.value, rectA);
            uniforms.uMix.value = 0;
        }
    }
    if (rectB) {
        writeRect(uniforms.uRectB.value, rectB);
        uniforms.uMix.value = clamp01(mix ?? 0);
    }
    if (opacity !== undefined) uniforms.uOpacity.value = opacity;
    if (time !== undefined) uniforms.uTime.value = time;
    if (additive !== undefined) uniforms.uAdditive.value = additive ? 1 : 0;
    if (mode !== undefined) uniforms.uMode.value = mode;
    if (tint) uniforms.uTint.value.setRGB(tint.r, tint.g, tint.b);
    return material;
}
