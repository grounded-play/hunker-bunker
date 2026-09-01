import * as THREE from 'three';
import {
    SKY_LAYERS,
    CLOUD_MOTION,
    resolveSkyLayers,
    resolveSkyBodies,
    resolveSkyTransients
} from './skyLayers.js';
import { createSkyBillboardPool } from './skyBillboards.js';
import { createSkyCloudMaterial, updateSkyCloudMaterial, CLOUD_MODES } from './skyCloudMaterial.js';

// The camera-locked sky rig: a base gradient dome plus one shell per texture
// layer, all parented to a group that tracks the camera.
//
// Camera-locking is what makes the 160-unit perspective far plane
// (threeGame.js perspectiveCamera) irrelevant -- the sky never moves relative
// to the viewer, so it can never be clipped. Parallax is faked by offsetting
// each layer's texture against camera world position instead of by actually
// separating the shells in depth.

const BASE_RADIUS = 60;
// Nested radii keep the shells from z-fighting. Depth writes are off, so this
// is only about a stable draw order between shells.
const LAYER_RADIUS_STEP = 0.6;

// Each layer occupies its own slice of elevation rather than a full sphere.
// The third-person rig (FOV 58, near-level gaze) almost never shows the zenith,
// so filling it with horizon geometry would be wasted fill rate.
//
// theta is measured from straight up, so PI/2 is the horizon. The three horizon
// bands must each straddle PI/2 -- a band entirely above it would float in the
// air, one entirely below would be buried in terrain -- and nearer bands
// subtend a wider arc so they read as closer. Bands deliberately overlap: an
// uncovered ring between them shows the bare base dome as a hard seam.
const PI = Math.PI;
const LAYER_BANDS = Object.freeze({
    'deepfield':    { thetaStart: 0,        thetaLength: 0.56 * PI },
    'stars':        { thetaStart: 0,        thetaLength: 0.56 * PI },
    'aurora':       { thetaStart: 0.16 * PI, thetaLength: 0.34 * PI },
    'highcloud':    { thetaStart: 0.16 * PI, thetaLength: 0.34 * PI },
    'stormdeck':    { thetaStart: 0.18 * PI, thetaLength: 0.33 * PI },
    'horizon.far':  { thetaStart: 0.455 * PI, thetaLength: 0.100 * PI },
    'horizon.mid':  { thetaStart: 0.440 * PI, thetaLength: 0.130 * PI },
    'horizon.near': { thetaStart: 0.420 * PI, thetaLength: 0.170 * PI }
});

// How far a layer's texture slides per world unit of camera travel. Small, or
// the horizon would swim visibly as the player walks.
const PARALLAX_UV_SCALE = 0.0016;

// Bodies sit just inside the star plates so the space layers read as further
// away than the things in front of them.
const BILLBOARD_RADIUS = BASE_RADIUS - 2;

const BASE_VERTEX_SHADER = `
varying vec3 vWorldDirection;
void main() {
    vWorldDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Horizon haze fading up to a dark zenith. Deliberately cheap -- the painted
// layers carry the detail, this only has to be a believable ground colour for
// them to sit against.
const BASE_FRAGMENT_SHADER = `
uniform vec3 uHorizonColor;
uniform vec3 uZenithColor;
varying vec3 vWorldDirection;
void main() {
    float elevation = clamp(normalize(vWorldDirection).y, 0.0, 1.0);
    float haze = pow(1.0 - elevation, 3.0);
    gl_FragColor = vec4(mix(uZenithColor, uHorizonColor, haze), 1.0);
}
`;

function createBaseDome() {
    const geometry = new THREE.SphereGeometry(BASE_RADIUS + LAYER_RADIUS_STEP * (SKY_LAYERS.length + 1), 32, 20);
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uHorizonColor: { value: new THREE.Color(0.7, 0.5, 0.3) },
            uZenithColor: { value: new THREE.Color(0.08, 0.11, 0.2) }
        },
        vertexShader: BASE_VERTEX_SHADER,
        fragmentShader: BASE_FRAGMENT_SHADER,
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        fog: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = -100;
    mesh.frustumCulled = false;
    mesh.userData = { isSkyBase: true };
    return mesh;
}

function createLayerMesh(definition, index) {
    const band = LAYER_BANDS[definition.id];
    const geometry = new THREE.SphereGeometry(
        BASE_RADIUS - index * LAYER_RADIUS_STEP,
        48,
        24,
        0,
        Math.PI * 2,
        band.thetaStart,
        band.thetaLength
    );
    // Cloud, storm and aurora layers move, so they get the animated shader.
    // Everything else is a still plate and a basic material is cheaper.
    const motion = CLOUD_MOTION[definition.id];
    const material = motion
        ? createSkyCloudMaterial({
            mode: motion === 'shimmer' ? CLOUD_MODES.SHIMMER : CLOUD_MODES.DRIFT
        })
        : new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        // Depth testing is what keeps the sky behind the world. three.js draws
        // transparent materials after ALL opaque geometry and renderOrder only
        // sorts within that list, so without this the sky paints over the maze
        // walls it is supposed to sit behind.
        depthTest: true,
        fog: false,
        side: THREE.BackSide,
        color: new THREE.Color(1, 1, 1)
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = definition.renderOrder;
    mesh.frustumCulled = false;
    mesh.visible = false;
    mesh.userData = { layerId: definition.id };
    return mesh;
}

export function createSkyRig({ textureLoader = new THREE.TextureLoader() } = {}) {
    const group = new THREE.Group();
    group.name = 'skyRig';
    // The sky must never be culled -- it surrounds the camera, so its bounding
    // sphere straddles every frustum plane.
    group.frustumCulled = false;

    const base = createBaseDome();
    group.add(base);

    const meshes = new Map();
    SKY_LAYERS.forEach((definition, index) => {
        const mesh = createLayerMesh(definition, index);
        meshes.set(definition.id, mesh);
        group.add(mesh);
    });

    // Celestial bodies and, later, animated transients ride the same pool --
    // a transient is a billboard whose texture happens to be a sprite sheet.
    // Sits inside the space layers so a moon is occluded by cloud, not by star
    // plates drawn over it.
    const billboards = createSkyBillboardPool({ textureLoader, capacity: 12 });
    billboards.group.renderOrder = -55;
    group.add(billboards.group);

    // One texture per url for the whole rig lifetime. Reloading on biome change
    // would stutter exactly when the player is crossing a sector boundary.
    const textureCache = new Map();
    function getTexture(url) {
        let texture = textureCache.get(url);
        if (!texture) {
            texture = textureLoader.load(url);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            textureCache.set(url, texture);
        }
        return texture;
    }

    // Cloud time is the rig's own accumulator rather than performance.now(),
    // so the sky freezes with the game instead of jumping forward across a
    // pause or a cinematic.
    let cloudTime = 0;

    function update({ skyState, biomeKey = 'active', cameraPosition = null, delta = 0 } = {}) {
        if (!skyState) return;
        cloudTime += delta;

        if (cameraPosition) {
            group.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
        }

        base.material.uniforms.uHorizonColor.value.setRGB(
            skyState.horizonColor.r, skyState.horizonColor.g, skyState.horizonColor.b
        );
        base.material.uniforms.uZenithColor.value.setRGB(
            skyState.zenithColor.r, skyState.zenithColor.g, skyState.zenithColor.b
        );

        // Transients come after the bodies so a comet crossing in front of a
        // moon takes the nearer slot, and both share one pool -- a transient is
        // a billboard whose texture happens to be a sprite sheet.
        billboards.sync([
            ...resolveSkyBodies(skyState),
            ...resolveSkyTransients(skyState)
        ], BILLBOARD_RADIUS, cloudTime);

        const resolved = new Map(
            resolveSkyLayers({ biomeKey, skyState }).map((layer) => [layer.layerId, layer])
        );

        for (const [layerId, mesh] of meshes) {
            const layer = resolved.get(layerId);
            if (!layer) {
                // Keep the mesh -- a faded layer comes back, and rebuilding it
                // would recompile its material mid-run.
                mesh.visible = false;
                continue;
            }

            const texture = getTexture(layer.url);
            const parallaxOffset = cameraPosition
                ? -cameraPosition.x * layer.parallax * PARALLAX_UV_SCALE
                : 0;

            mesh.material.blending = layer.blend === 'additive'
                ? THREE.AdditiveBlending
                : THREE.NormalBlending;

            if (layer.animated) {
                // Parallax rides a uniform here, never texture.offset: textures
                // are cached by url, so writing the offset would let two layers
                // sharing one silently stomp each other.
                updateSkyCloudMaterial(mesh.material, {
                    map: texture,
                    time: cloudTime,
                    opacity: layer.opacity,
                    wind: skyState.wind,
                    parallax: parallaxOffset,
                    additive: layer.blend === 'additive',
                    tint: layer.tint ?? { r: 1, g: 1, b: 1 }
                });
                mesh.visible = true;
                continue;
            }

            if (mesh.material.map !== texture) {
                mesh.material.map = texture;
                mesh.material.needsUpdate = true;
            }
            // Additive art is read from RGB alone: the keyed nebulae would lose
            // their falloff to a near-binary alpha, and the un-keyed aurora and
            // lens plates carry alpha 255 everywhere (catalog section 1c).
            mesh.material.alphaMap = null;

            if (layer.blend === 'additive') {
                // Additive blending adds src * srcAlpha, and the keyed art is
                // almost fully opaque, so alpha is a poor dimmer -- three of
                // these at full strength blow the night sky out to white.
                // Scaling RGB is what actually attenuates them.
                mesh.material.opacity = 1;
                mesh.material.color.setScalar(layer.opacity);
            } else {
                mesh.material.opacity = layer.opacity;
            }

            if (layer.tint && layer.blend !== 'additive') {
                const strength = layer.tintStrength ?? 1;
                mesh.material.color.setRGB(
                    1 + (layer.tint.r - 1) * strength,
                    1 + (layer.tint.g - 1) * strength,
                    1 + (layer.tint.b - 1) * strength
                );
            } else if (layer.blend !== 'additive') {
                mesh.material.color.setRGB(1, 1, 1);
            }

            if (cameraPosition && texture.offset) {
                texture.offset.x = parallaxOffset;
            }

            mesh.visible = true;
        }
    }

    function dispose() {
        billboards.dispose();
        group.remove(billboards.group);
        for (const child of [...group.children]) {
            child.geometry.dispose();
            child.material.dispose();
            group.remove(child);
        }
        for (const texture of textureCache.values()) {
            texture.dispose?.();
        }
        textureCache.clear();
        meshes.clear();
    }

    return { group, update, dispose };
}
