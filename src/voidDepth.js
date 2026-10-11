/**
 * Depth under the void (N64 world pass, lane D: docs/planning/
 * n64-architectural-level-design-overhaul-2026-10-10.md §7.4).
 *
 * The canyon void is a dark mask just under the rim (a deep plane showed the
 * sky behind the horizon), so a pit read as black paint. Here the mask's
 * shader casts each pixel from the camera down to a floor VOID_DEPTH below
 * and lights that floor faintly: slow-drifting light, ember in the bunker,
 * teal in cryo, green in bio, fading with distance like fog. It moves with
 * parallax as the camera moves, so the hole reads as deep. No geometry, no
 * draw calls, no lights.
 */
import * as THREE from 'three';

export const VOID_DEPTH = Object.freeze({
    /** How far below the rim the lit floor appears (metres). */
    floorDepth: 14,
    /** Base glow everywhere down there, and the extra at the drifting light's peaks. */
    ambient: 0.02,
    peak: 0.14,
    /** Exponential fade per metre of ray travelled below the rim. */
    fade: 0.035
});

const VOID_TIME = { value: 0 };

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
                uniform vec2 uShipWorldPos;`)
            .replace('#include <dithering_fragment>', `#include <dithering_fragment>
                vec3 hbDir = normalize( vVoidWorldPos - cameraPosition );
                float hbT = ( -${VOID_DEPTH.floorDepth.toFixed(1)} - vVoidWorldPos.y ) / min( hbDir.y, -0.08 );
                vec3 hbDeep = vVoidWorldPos + hbDir * hbT;
                vec2 hbQ = hbDeep.xz * 0.47;
                float hbN = sin( hbQ.x + uVoidTime * 0.13 + sin( hbQ.y * 1.7 ) ) * sin( hbQ.y * 1.3 - uVoidTime * 0.09 + sin( hbQ.x * 1.1 ) );
                hbN += 0.5 * sin( hbQ.x * 2.3 + hbQ.y * 1.9 + uVoidTime * 0.21 );
                float hbGlow = smoothstep( 0.75, 1.35, hbN );
                float hbDist = length( vVoidWorldPos.xz - uShipWorldPos );
                vec3 hbTint = mix( vec3( 0.55, 0.2, 0.06 ), vec3( 0.08, 0.38, 0.5 ), smoothstep( ${cryoStart.toFixed(1)}, ${cryoEnd.toFixed(1)}, hbDist ) );
                hbTint = mix( hbTint, vec3( 0.22, 0.5, 0.12 ), smoothstep( ${bioStart.toFixed(1)}, ${bioEnd.toFixed(1)}, hbDist ) );
                gl_FragColor.rgb += hbTint * ( ${VOID_DEPTH.ambient.toFixed(3)} + hbGlow * ${VOID_DEPTH.peak.toFixed(3)} ) * exp( -hbT * ${VOID_DEPTH.fade.toFixed(3)} );`);
    };
    material.customProgramCacheKey = () => 'hb-void-depth';
    return material;
}
