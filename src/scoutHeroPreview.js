import * as THREE from 'three';
import { createPlayer3dOverlay } from './player3dOverlay.js';
import { resolveChassisModelUrl } from './chassisBodies.js';
import { CHASSIS_SKIN_MODELS } from './data/operatorModelUrls.js';

const DEFAULT_ARCHETYPES = Object.freeze({
    SCOUT: 'talon',
    ENGINEER: 'tesla_lock',
    TANK: 'siege_breaker'
});

function resolveClassConfig(type, loadout = null) {
    const classType = ['SCOUT', 'ENGINEER', 'TANK'].includes(type) ? type : 'SCOUT';
    const classId = classType.toLowerCase();
    const activeLoadout = loadout || globalThis.loadout?.getClassLoadout?.(classId) || null;
    const archetype = activeLoadout?.archetypeId || DEFAULT_ARCHETYPES[classType] || 'talon';
    const skinId = activeLoadout?.weaponSkinId ?? null;
    const sheenColor = activeLoadout?.sheenColor ?? activeLoadout?.weaponSheenColor ?? 0xffffff;
    const charmId = activeLoadout?.charmId ?? null;

    const baseConfigs = {
        SCOUT: {
            targetHeight: 1.95,
            modelUrl: '/3d/scouting-scout/Scout.game.glb',
            idleActionName: 'heroIdle',
            weaponVisible: true,
            weaponEnabled: true,
            weaponArchetype: archetype,
            weaponSkinId: skinId,
            weaponSheenColor: sheenColor,
            charmId
        },
        ENGINEER: {
            targetHeight: 1.95,
            modelUrl: '/3d/runtime/engineer-rigged-gestures.glb',
            animationModelUrl: '/3d/scouting-scout/Scout.game.glb',
            animationBonePrefix: 'mixamorig',
            idleActionName: 'heroIdle',
            weaponVisible: true,
            weaponEnabled: true,
            weaponArchetype: archetype,
            weaponSkinId: skinId,
            weaponSheenColor: sheenColor,
            charmId
        },
        TANK: {
            targetHeight: 1.86,
            modelUrl: '/3d/runtime/tank-rigged.glb',
            animationModelUrl: '/3d/scouting-scout/Scout.game.glb',
            animationBonePrefix: 'mixamorig',
            idleActionName: 'heroIdle',
            weaponVisible: true,
            weaponEnabled: true,
            weaponArchetype: archetype,
            weaponSkinId: skinId,
            weaponSheenColor: sheenColor,
            charmId
        }
    };

    const config = { ...baseConfigs[classType] };
    const chassisSkinId = activeLoadout?.chassisSkinId;
    if (chassisSkinId) {
        const chassisUrl = resolveChassisModelUrl(chassisSkinId, activeLoadout?.chassisBody, CHASSIS_SKIN_MODELS);
        if (chassisUrl) {
            config.modelUrl = chassisUrl;
            config.animationModelUrl = '/3d/scouting-scout/Scout.game.glb';
            config.animationBonePrefix = 'mixamorig';
        }
    }
    return { classType, config, archetype, skinId, sheenColor, charmId, chassisSkinId };
}

export async function createScoutHeroPreview(canvas) {
    if (!canvas) throw new Error('Scout hero preview requires a canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, 2));
    renderer.setSize(480, 480, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 30);
    camera.position.set(2.28, 1.16, 3.28);
    camera.lookAt(0, 0.98, 0);
    scene.add(new THREE.HemisphereLight(0xdaf4ff, 0x18202a, 2.15));
    const key = new THREE.DirectionalLight(0xffffff, 3.1);
    key.position.set(3, 5, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x7dff5a, 1.8);
    rim.position.set(-3, 2, -2);
    scene.add(rim);

    let activeType = 'SCOUT';
    let activePolish = 0xffffff;
    let activePresentationKey = '';

    const initial = resolveClassConfig('SCOUT');
    let overlay = await createPlayer3dOverlay({ ...initial.config });
    // Keep the portrait centered without clipping boots or helmet
    overlay.root.position.y = 0.0;
    overlay.root.rotation.y = Math.atan2(camera.position.x, camera.position.z);
    overlay.setOperatorPolish(activePolish);
    scene.add(overlay.root);
    activePresentationKey = `${initial.classType}:${initial.archetype}:${initial.skinId ?? ''}:${initial.sheenColor}:${initial.charmId ?? ''}:${initial.chassisSkinId ?? ''}`;

    let loadGeneration = 0;

    async function setPresentation({ classType = 'SCOUT', loadout = null } = {}) {
        const resolved = resolveClassConfig(classType, loadout);
        const nextKey = `${resolved.classType}:${resolved.archetype}:${resolved.skinId ?? ''}:${resolved.sheenColor}:${resolved.charmId ?? ''}:${resolved.chassisSkinId ?? ''}`;
        const generation = ++loadGeneration;
        if (nextKey === activePresentationKey && resolved.classType === activeType) return true;

        const nextOverlay = await createPlayer3dOverlay({ ...resolved.config });
        if (disposed || generation !== loadGeneration) {
            nextOverlay.dispose();
            return false;
        }
        if (!nextOverlay.hasAnimation?.('idle') && !nextOverlay.hasAnimation?.('heroIdle')) {
            nextOverlay.dispose();
            throw new Error(`${resolved.classType} preview has no validated idle animation`);
        }

        overlay.root.removeFromParent();
        overlay.dispose();
        overlay = nextOverlay;
        overlay.setOperatorPolish(activePolish);
        activeType = resolved.classType;
        activePresentationKey = nextKey;
        presentationState = 'ARMED_IDLE';
        nextStateChangeAt = performance.now() + 5400;
        aimBlend = 0;
        idleState.idleActionName = 'heroIdle';
        idleState.hasAim = false;
        idleState.presentationAim = 0;
        overlay.root.position.y = 0.0;
        overlay.root.rotation.y = Math.atan2(camera.position.x, camera.position.z);
        scene.add(overlay.root);
        overlay.update(0, idleState);
        overlay.triggerCharmImpulse(1.0);
        return true;
    }

    async function setType(type) {
        return setPresentation({ classType: type });
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
        hasAim: false,
        moveX: 0,
        moveZ: 1,
        // Match the preview camera's planar position so the operator faces us.
        aimX: camera.position.x,
        aimZ: camera.position.z,
        lockRootFacing: true,
        presentationAim: 0,
        idleActionName: 'heroIdle'
    };

    let presentationState = 'ARMED_IDLE'; // 'ARMED_IDLE' | 'AIM_READY'
    let nextStateChangeAt = performance.now() + 5400;
    let aimBlend = 0;

    const render = (time) => {
        if (disposed || !visible || document.hidden) {
            running = false;
            return;
        }
        const delta = Math.min((time - previousTime) / 1000, 0.05);
        previousTime = time;

        if (time >= nextStateChangeAt) {
            if (presentationState === 'ARMED_IDLE') {
                presentationState = 'AIM_READY';
                nextStateChangeAt = time + 2400;
                overlay.triggerCharmImpulse(1.4);
            } else {
                presentationState = 'ARMED_IDLE';
                nextStateChangeAt = time + 5800;
                overlay.triggerCharmImpulse(0.7);
            }
        }

        aimBlend = THREE.MathUtils.damp(
            aimBlend,
            presentationState === 'AIM_READY' ? 1 : 0,
            presentationState === 'AIM_READY' ? 3.2 : 4.5,
            delta
        );
        const cameraYaw = Math.atan2(camera.position.x, camera.position.z);
        const lookOffset = (0.18 + Math.sin(time * 0.0012) * 0.035) * aimBlend;
        idleState.aimX = Math.sin(cameraYaw + lookOffset);
        idleState.aimZ = Math.cos(cameraYaw + lookOffset);
        idleState.presentationAim = aimBlend;
        idleState.hasAim = presentationState === 'AIM_READY' || aimBlend > 0.05;
        idleState.idleActionName = presentationState === 'AIM_READY' || aimBlend > 0.4 ? 'idle' : 'heroIdle';
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
        setPresentation,
        setOperatorPolish(color = 0xffffff) {
            activePolish = color;
            overlay.setOperatorPolish(activePolish);
        },
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
