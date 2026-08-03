import * as THREE from 'three';
import { createPlayer3dOverlay } from './player3dOverlay.js';

export async function createScoutHeroPreview(canvas) {
    if (!canvas) throw new Error('Scout hero preview requires a canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, 2));
    renderer.setSize(320, 320, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 30);
    camera.position.set(2.75, 1.35, 4.0);
    camera.lookAt(0, 1.05, 0);
    scene.add(new THREE.HemisphereLight(0xdaf4ff, 0x18202a, 2.15));
    const key = new THREE.DirectionalLight(0xffffff, 3.1);
    key.position.set(3, 5, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x7dff5a, 1.8);
    rim.position.set(-3, 2, -2);
    scene.add(rim);

    let activeType = 'SCOUT';
    let overlay = await createPlayer3dOverlay({
        targetHeight: 2.05,
        idleActionName: 'heroIdle',
        weaponVisible: false
    });
    // Keep the portrait centered on the Scout's face and upper torso instead
    // of letting the bottom of the preview window swallow the model.
    overlay.root.position.y += 0.04;
    overlay.root.rotation.y = Math.atan2(camera.position.x, camera.position.z);
    scene.add(overlay.root);
    let loadGeneration = 0;

    async function setType(type) {
        const nextType = ['SCOUT', 'ENGINEER', 'TANK'].includes(type) ? type : 'SCOUT';
        const generation = ++loadGeneration;
        if (nextType === activeType) return;
        const configs = {
            SCOUT: { idleActionName: 'heroIdle', weaponVisible: false },
            ENGINEER: {
                modelUrl: '/3d/runtime/engineer-vanguard.glb',
                animationModelUrl: '/3d/scouting-scout/Scout.game.glb',
                animationBonePrefix: 'mixamorig',
                idleActionName: 'heroIdle',
                weaponEnabled: false,
            },
            TANK: {
                modelUrl: '/3d/runtime/tank-rigged.glb',
                idleActionName: 'Armature|mixamo.com|Layer0',
                weaponEnabled: false,
            }
        };
        const nextOverlay = await createPlayer3dOverlay({ targetHeight: 2.05, ...configs[nextType] });
        if (disposed || generation !== loadGeneration) {
            nextOverlay.dispose();
            return;
        }
        overlay.root.removeFromParent();
        overlay.dispose();
        overlay = nextOverlay;
        activeType = nextType;
        weaponReady = false;
        idleState.idleActionName = nextType === 'SCOUT' ? 'heroIdle' : configs[nextType].idleActionName;
        overlay.root.position.y += 0.04;
        overlay.root.rotation.y = Math.atan2(camera.position.x, camera.position.z);
        scene.add(overlay.root);
    }

    let visible = false;
    let disposed = false;
    let frame = 0;
    let running = false;
    let previousTime = performance.now();
    const idleState = {
        isMoving: false,
        isSprinting: false,
        isFalling: false,
        isReloading: false,
        hasAim: true,
        moveX: 0,
        moveZ: 1,
        // Match the preview camera's planar position so the operator faces us.
        aimX: camera.position.x,
        aimZ: camera.position.z,
        idleActionName: 'heroIdle'
    };
    let nextReadyChangeAt = performance.now() + 4200;
    let weaponReady = false;

    const render = (time) => {
        if (disposed || !visible || document.hidden) {
            running = false;
            return;
        }
        const delta = Math.min((time - previousTime) / 1000, 0.05);
        previousTime = time;
        if (activeType === 'SCOUT' && time >= nextReadyChangeAt) {
            weaponReady = !weaponReady;
            overlay.setWeaponVisible(weaponReady);
            idleState.idleActionName = weaponReady ? 'idle' : 'heroIdle';
            nextReadyChangeAt = time + (weaponReady ? 3200 : 5200);
        }
        const cameraYaw = Math.atan2(camera.position.x, camera.position.z);
        const lookOffset = weaponReady ? Math.sin(time * 0.0009) * 0.16 : 0;
        idleState.aimX = Math.sin(cameraYaw + lookOffset);
        idleState.aimZ = Math.cos(cameraYaw + lookOffset);
        overlay.update(delta, idleState);
        renderer.render(scene, camera);
        frame = requestAnimationFrame(render);
    };

    function startLoop() {
        if (running || disposed || !visible || document.hidden) return;
        running = true;
        previousTime = performance.now();
        frame = requestAnimationFrame(render);
    }

    function stopLoop() {
        running = false;
        if (frame) {
            cancelAnimationFrame(frame);
            frame = 0;
        }
    }

    const onVisibilityChange = () => {
        if (document.hidden) {
            stopLoop();
        } else if (visible) {
            startLoop();
        }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return {
        setType,
        setVisible(nextVisible) {
            visible = Boolean(nextVisible);
            canvas.classList.toggle('hidden', !visible);
            if (visible) {
                startLoop();
            } else {
                stopLoop();
            }
        },
        dispose() {
            disposed = true;
            stopLoop();
            document.removeEventListener('visibilitychange', onVisibilityChange);
            overlay.dispose();
            renderer.dispose();
        }
    };
}
