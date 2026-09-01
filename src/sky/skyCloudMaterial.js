import * as THREE from 'three';

// Animated material for the cloud, storm and aurora layers.
//
// The plates ship as seamless horizontal strips, so a continuous UV scroll
// wraps with no seam and loops forever without popping. Scrolling alone,
// though, always reads as a moving painting -- the shape never changes, it just
// slides. Three things fix that:
//
//   1. Dual-rate sampling. The strip is read twice at different scale and
//      speed. The two slide through each other, so coverage builds and thins
//      where they beat -- cloud appears to form and dissolve rather than
//      translate. This is the effect that matters; the rest is polish.
//   2. Domain warp. Sample UVs are displaced by a slow drifting field so edges
//      billow and curl instead of moving rigidly.
//   3. Horizon squash. Drift slows toward the bottom of the band so clouds
//      foreshorten into the distance instead of marching at a uniform rate.
//
// Everything is driven from skyState uniforms; the shader keeps no clock of
// its own, which is what lets weather actually change how the sky moves.

export const CLOUD_MODES = Object.freeze({
    DRIFT: 0,    // cloud and storm decks: blown downwind
    SHIMMER: 1   // aurora: undulates along the curtain, never blown sideways
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
uniform float uTime;
uniform float uOpacity;
uniform float uWindSpeed;
uniform float uParallax;
uniform float uMode;
uniform float uAdditive;
uniform vec3 uTint;
varying vec2 vUv;

// Cheap two-axis warp. Amplitude is deliberately tiny -- this is meant to make
// edges breathe, and anything larger turns the plate into visible soup.
vec2 warp(vec2 uv, float t) {
    return uv + vec2(
        sin(uv.y * 6.283 + t * 0.31),
        cos(uv.x * 4.712 + t * 0.23)
    ) * 0.012;
}

void main() {
    float t = uTime;
    // vUv.y is 1 at the top of the band and 0 toward the horizon, so this
    // slows drift as the band recedes.
    float depth = mix(0.42, 1.0, vUv.y);
    vec2 base = vec2(vUv.x + uParallax, vUv.y);

    vec2 uv1;
    vec2 uv2;
    if (uMode < 0.5) {
        // Drift: two horizontal rates beating against each other.
        // Calibrated against a measured frame-pair diff: at the old 0.010 a
        // calm sky moved ~4px of a 2048 strip over 1.6s, which is
        // indistinguishable from frozen. These rates give gentle but clearly
        // live drift at calm, and a racing sky under a front.
        uv1 = warp(vec2(base.x - t * uWindSpeed * 0.033 * depth, base.y), t);
        uv2 = warp(vec2(base.x * 1.37 - t * uWindSpeed * 0.052 * depth + 0.31,
                        base.y * 1.11 + 0.07), t * 1.3);
    } else {
        // Shimmer: motion runs along the curtain, with a lateral ripple.
        uv1 = vec2(base.x + sin(base.y * 9.0 + t * 0.70) * 0.010,
                   base.y - t * uWindSpeed * 0.014);
        uv2 = vec2(base.x + sin(base.y * 6.0 - t * 0.50) * 0.014,
                   base.y * 1.05 - t * uWindSpeed * 0.022 + 0.20);
    }

    vec4 a = texture2D(uMap, uv1);
    vec4 b = texture2D(uMap, uv2);

    // The negative bias is what makes cloud dissolve: where only one sample has
    // coverage the result thins to nothing, and density only builds where both
    // agree. Without it the two samples simply add and the sky fogs over.
    vec3 rgb = max(a.rgb, b.rgb);
    float coverage = clamp(a.a * 0.75 + b.a * 0.65 - 0.12, 0.0, 1.0);

    if (uAdditive > 0.5) {
        // Additive layers are attenuated through RGB -- their art is close to
        // fully opaque, so alpha is a poor dimmer and stacked layers blow out.
        gl_FragColor = vec4(rgb * uTint * uOpacity, 1.0);
    } else {
        gl_FragColor = vec4(rgb * uTint, coverage * uOpacity);
    }
}
`;

export function createSkyCloudMaterial({ mode = CLOUD_MODES.DRIFT } = {}) {
    return new THREE.ShaderMaterial({
        uniforms: {
            uMap: { value: null },
            uTime: { value: 0 },
            uOpacity: { value: 0 },
            uWindSpeed: { value: 0 },
            uParallax: { value: 0 },
            uMode: { value: mode },
            uAdditive: { value: 0 },
            uTint: { value: new THREE.Color(1, 1, 1) }
        },
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        // Same reason as every other sky layer: three.js draws transparent
        // materials after all opaque geometry, so without a depth test the sky
        // paints over the world.
        depthTest: true,
        fog: false,
        side: THREE.BackSide
    });
}

export function updateSkyCloudMaterial(material, {
    map,
    time,
    opacity,
    wind,
    parallax,
    tint,
    additive
} = {}) {
    const { uniforms } = material;
    if (map !== undefined && uniforms.uMap.value !== map) {
        uniforms.uMap.value = map;
        // Swapping a sampler changes the compiled program's inputs; swapping a
        // scalar does not, so only this path dirties the material.
        material.needsUpdate = true;
    }
    if (time !== undefined) uniforms.uTime.value = time;
    if (opacity !== undefined) uniforms.uOpacity.value = opacity;
    if (wind !== undefined) uniforms.uWindSpeed.value = wind.speed ?? 0;
    if (parallax !== undefined) uniforms.uParallax.value = parallax;
    if (additive !== undefined) uniforms.uAdditive.value = additive ? 1 : 0;
    if (tint !== undefined) uniforms.uTint.value.setRGB(tint.r, tint.g, tint.b);
    return material;
}
