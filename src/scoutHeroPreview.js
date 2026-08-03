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
    const camera = new THREE.PerspectiveCamera(31, 1, 0.01, 30);
    camera.position.set(2.7, 1.8, 3.8);
    camera.lookAt(0, 0.82, 0);
    scene.add(new THREE.HemisphereLight(0xdaf4ff, 0x18202a, 2.15));
    const key = new THREE.DirectionalLight(0xffffff, 3.1);
    key.position.set(3, 5, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x7dff5a, 1.8);
    rim.position.set(-3, 2, -2);
    scene.add(rim);

    const overlay = await createPlayer3dOverlay({ targetHeight: 1.72 });
    overlay.root.position.y += 0.06;
    overlay.root.rotation.y = -0.28;
    scene.add(overlay.root);

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
        aimX: -0.22,
        aimZ: 1
    };

    const render = (time) => {
        if (disposed || !visible || document.hidden) {
            running = false;
            return;
        }
        const delta = Math.min((time - previousTime) / 1000, 0.05);
        previousTime = time;
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

