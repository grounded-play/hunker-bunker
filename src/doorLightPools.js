/**
 * Pools of light at doorways (N64 world pass, lane G: docs/planning/
 * n64-architectural-level-design-overhaul-2026-10-10.md §7.6). Light where
 * things happen, darkness between: a soft glow on the floor on both sides of
 * every procedural door, coloured by what the door is (an ordinary door
 * cool, a route door warm, a locked one red), so thresholds read from across
 * the room. Additive and depth-write free, instanced per colour; no lights,
 * so nothing recompiles.
 */
import * as THREE from 'three';

export const DOOR_LIGHT_POOL = Object.freeze({
    /** Across the door (metres): a little wider than a three-cell doorway. */
    width: 3.6,
    /** Out from the door on each side (metres). */
    depth: 2.4,
    /** How far each pool's centre sits from the door line. */
    offset: 1.15,
    /** Just above the floor, under decals' worst z-fight. */
    height: 0.025,
    intensity: 0.9,
    colors: Object.freeze({
        ordinary: new THREE.Color(0.35, 0.75, 0.9),
        route: new THREE.Color(1.0, 0.62, 0.25),
        locked: new THREE.Color(1.0, 0.18, 0.12)
    })
});

/** A unit square lying flat on the floor, centred on the origin. */
export function createDoorLightPoolGeometry() {
    return new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
}

/** Additive glow, brightest where it meets the door and fading outward. */
export function createDoorLightPoolMaterial(color) {
    return new THREE.ShaderMaterial({
        uniforms: {
            uColor: { value: color.clone() },
            uIntensity: { value: DOOR_LIGHT_POOL.intensity }
        },
        vertexShader: `
            varying vec2 vPoolUv;
            void main() {
                vPoolUv = uv;
                #ifdef USE_INSTANCING
                    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4( position, 1.0 );
                #else
                    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                #endif
            }
        `,
        fragmentShader: `
            uniform vec3 uColor;
            uniform float uIntensity;
            varying vec2 vPoolUv;
            void main() {
                // uv.y runs from the door (1) outward (0) on each pool.
                vec2 hbFromDoor = vec2( ( vPoolUv.x - 0.5 ) * 2.0, 1.0 - vPoolUv.y );
                float hbFade = 1.0 - smoothstep( 0.15, 1.0, length( hbFromDoor * vec2( 1.0, 0.85 ) ) );
                gl_FragColor = vec4( uColor * hbFade * hbFade * uIntensity, 1.0 );
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
    });
}

/**
 * The two pools of one door, as instance matrices: one each side of the door
 * line, their uv.y = 1 edge against the door. `horizontal` doors span x.
 */
export function doorLightPoolMatrices({ worldX, worldZ, horizontal }) {
    const { width, depth, offset, height } = DOOR_LIGHT_POOL;
    const matrices = [];
    for (const side of [-1, 1]) {
        // The plane's uv.y = 1 edge is at local -z; turn it to face the door.
        const yaw = horizontal ? (side < 0 ? Math.PI : 0) : (side < 0 ? -Math.PI / 2 : Math.PI / 2);
        matrices.push(new THREE.Matrix4().compose(
            new THREE.Vector3(
                worldX + (horizontal ? 0 : side * offset),
                height,
                worldZ + (horizontal ? side * offset : 0)
            ),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
            new THREE.Vector3(width, 1, depth)
        ));
    }
    return matrices;
}
