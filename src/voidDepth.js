/**
 * Depth under the void (N64 world pass, lane D: docs/planning/
 * n64-architectural-level-design-overhaul-2026-10-10.md §7.4).
 *
 * The canyon void is a dark mask just under the rim (a deep plane showed the
 * sky behind the horizon), so a pit read as black paint. Here the mask's
 * shader casts each pixel from the camera onto two sparse light fields far
 * below: ember in the bunker, teal in cryo, green in bio. Their different
 * projection depths create scale parallax as the camera moves. The existing
 * canyon-drop shader also carries broken bounce light and a few rising motes.
 * No geometry, draw calls, particle objects, or lights.
 */
import * as THREE from 'three';

export const VOID_DEPTH = Object.freeze({
    /** Apparent depths of the two light fields below the rim (metres). */
    nearPlane: 18,
    farPlane: 42,
    /** Darkness dominates; sparse peaks provide the scale references. */
    ambient: 0.008,
    nearPeak: 0.5,
    farPeak: 0.3,
    /** Cell sizes and occupancy thresholds for deterministic light clusters. */
    nearCellSize: 4.8,
    farCellSize: 8.5,
    nearThreshold: 0.9,
    farThreshold: 0.93
});

/**
 * Light rising out of the pit onto the cliff walls that drop into it: none at
 * the rim, building toward the bottom, in the district's colour, breathing
 * slowly on the same clock as the void floor. Added after fog (softened by
 * it, so a distant pit glows without punching through haze). No lights.
 */
export const VOID_UPLIGHT = Object.freeze({
    /** World y where the glow starts, and where it is full (wall bottom is -14). */
    startY: -2.5,
    fullY: -12.5,
    strength: 0.2,
    moteStrength: 0.52,
    tint: Object.freeze({
        active: Object.freeze([1.0, 0.42, 0.12]),
        cryo: Object.freeze([0.25, 0.72, 1.0]),
        bio: Object.freeze([0.45, 0.95, 0.25])
    })
});

const VOID_TIME = { value: 0 };

/**
 * Patches a cliff-drop wall shader (from an onBeforeCompile) with the rising
 * light. The shader must already pass `vCanyonDropWorldPos`.
 */
export function applyVoidUplight(shader, biomeKey) {
    const [r, g, b] = VOID_UPLIGHT.tint[biomeKey] ?? VOID_UPLIGHT.tint.active;
    shader.uniforms.uVoidTime = VOID_TIME;
    shader.fragmentShader = shader.fragmentShader
        .replace('void main() {', 'uniform float uVoidTime;\nvoid main() {')
        .replace('#include <dithering_fragment>', `#include <dithering_fragment>
            float hbUp = smoothstep( ${VOID_UPLIGHT.startY.toFixed(1)}, ${VOID_UPLIGHT.fullY.toFixed(1)}, vCanyonDropWorldPos.y );
            float hbWallSeed = fract( sin( dot( floor( vCanyonDropWorldPos.xz * 1.7 ), vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
            float hbBreakup = 0.24 + 0.76 * smoothstep( -0.1, 0.72,
                sin( vCanyonDropWorldPos.y * 0.72 + hbWallSeed * 6.2831 )
                * sin( ( vCanyonDropWorldPos.x + vCanyonDropWorldPos.z ) * 2.1 ) );
            float hbBreath = 0.88 + 0.12 * sin( uVoidTime * 0.38 + hbWallSeed * 6.2831 );
            float hbUpGlow = hbUp * hbUp * ${VOID_UPLIGHT.strength.toFixed(2)} * hbBreakup * hbBreath;
            float hbMoteLane = step( 0.86, hbWallSeed );
            float hbMoteX = abs( fract( ( vCanyonDropWorldPos.x + vCanyonDropWorldPos.z ) * 2.7 + hbWallSeed ) - 0.5 );
            float hbMotePhase = fract( -vCanyonDropWorldPos.y * 0.16 - uVoidTime * ( 0.035 + hbWallSeed * 0.025 ) + hbWallSeed );
            float hbMoteBody = ( 1.0 - smoothstep( 0.025, 0.09, hbMoteX ) )
                * smoothstep( 0.42, 0.49, hbMotePhase )
                * ( 1.0 - smoothstep( 0.49, 0.58, hbMotePhase ) );
            float hbMote = hbMoteLane * hbMoteBody * smoothstep( 0.08, 0.42, hbUp ) * ${VOID_UPLIGHT.moteStrength.toFixed(2)};
            #ifdef USE_FOG
                hbUpGlow *= 1.0 - fogFactor * 0.7;
                hbMote *= 1.0 - fogFactor * 0.85;
            #endif
            gl_FragColor.rgb += vec3( ${r.toFixed(2)}, ${g.toFixed(2)}, ${b.toFixed(2)} ) * ( hbUpGlow + hbMote );`);
    return shader;
}

/** Advances the drifting light; called once a frame. */
export function setVoidDepthTime(seconds) {
    VOID_TIME.value = seconds;
}

/**
 * Patches the void mask material in place and returns it. `shipWorldPos`
 * returns the ship's position (Vector2), read at compile; `range` gives the
 * distances from the ship where cryo and bio begin and are full.
 */
export function applyVoidDepth(material, { shipWorldPos, range }) {
    const { cryoStart, cryoEnd, bioStart, bioEnd } = range;
    material.onBeforeCompile = (shader) => {
        shader.uniforms.uVoidTime = VOID_TIME;
        shader.uniforms.uShipWorldPos = { value: shipWorldPos?.() ?? new THREE.Vector2() };
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vVoidWorldPos;')
            .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
                vec4 hbVoidWorld = vec4( transformed, 1.0 );
                #ifdef USE_INSTANCING
                    hbVoidWorld = instanceMatrix * hbVoidWorld;
                #endif
                vVoidWorldPos = ( modelMatrix * hbVoidWorld ).xyz;`);
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>
                varying vec3 vVoidWorldPos;
                uniform float uVoidTime;
                uniform vec2 uShipWorldPos;

                float hbVoidHash( vec2 cell ) {
                    return fract( sin( dot( cell, vec2( 127.1, 311.7 ) ) ) * 43758.5453123 );
                }

                float hbVoidLightLayer( vec3 projected, float cellSize, float threshold, float phase ) {
                    vec2 field = projected.xz / cellSize;
                    vec2 cell = floor( field );
                    vec2 local = fract( field ) - 0.5;
                    float seed = hbVoidHash( cell + phase );
                    vec2 offset = vec2( hbVoidHash( cell + phase + 17.3 ), hbVoidHash( cell + phase + 43.1 ) ) - 0.5;
                    offset *= 0.62;
                    float distanceToLight = length( local - offset );
                    float occupancy = smoothstep( threshold, 0.995, seed );
                    float halo = 1.0 - smoothstep( 0.025, 0.19, distanceToLight );
                    float core = 1.0 - smoothstep( 0.008, 0.035, distanceToLight );
                    float paired = step( 0.975, seed )
                        * ( 1.0 - smoothstep( 0.018, 0.055, length( local - offset - vec2( 0.085, 0.0 ) ) ) );
                    float flicker = 0.9 + 0.1 * sin( uVoidTime * ( 0.32 + seed * 0.21 ) + seed * 19.0 );
                    return occupancy * ( halo * 0.24 + core + paired * 0.72 ) * flicker;
                }`)
            .replace('#include <dithering_fragment>', `#include <dithering_fragment>
                vec3 hbDir = normalize( vVoidWorldPos - cameraPosition );
                float hbRayY = min( hbDir.y, -0.08 );
                float hbNearT = ( -${VOID_DEPTH.nearPlane.toFixed(1)} - vVoidWorldPos.y ) / hbRayY;
                float hbFarT = ( -${VOID_DEPTH.farPlane.toFixed(1)} - vVoidWorldPos.y ) / hbRayY;
                vec3 hbNearProjection = vVoidWorldPos + hbDir * hbNearT;
                vec3 hbFarProjection = vVoidWorldPos + hbDir * hbFarT;
                float hbNearLights = hbVoidLightLayer( hbNearProjection, ${VOID_DEPTH.nearCellSize.toFixed(1)}, ${VOID_DEPTH.nearThreshold.toFixed(3)}, 0.0 );
                float hbFarLights = hbVoidLightLayer( hbFarProjection, ${VOID_DEPTH.farCellSize.toFixed(1)}, ${VOID_DEPTH.farThreshold.toFixed(3)}, 91.7 );
                float hbDist = length( vVoidWorldPos.xz - uShipWorldPos );
                vec3 hbTint = mix( vec3( 0.55, 0.2, 0.06 ), vec3( 0.08, 0.38, 0.5 ), smoothstep( ${cryoStart.toFixed(1)}, ${cryoEnd.toFixed(1)}, hbDist ) );
                hbTint = mix( hbTint, vec3( 0.22, 0.5, 0.12 ), smoothstep( ${bioStart.toFixed(1)}, ${bioEnd.toFixed(1)}, hbDist ) );
                float hbDistanceHaze = exp( -max( hbNearT, 0.0 ) * 0.018 );
                float hbLight = ${VOID_DEPTH.ambient.toFixed(3)}
                    + hbNearLights * ${VOID_DEPTH.nearPeak.toFixed(2)} * hbDistanceHaze
                    + hbFarLights * ${VOID_DEPTH.farPeak.toFixed(2)};
                gl_FragColor.rgb += hbTint * hbLight;`);
    };
    material.customProgramCacheKey = () => 'hb-void-depth-v2';
    return material;
}
