import * as THREE from 'three';
import { createPlayer3dOverlay } from './player3dOverlay.js';

export class LeaderConversation3d {
    constructor(canvas) {
        this.canvas = canvas;
        this.renderer = null;
        this.overlay = null;
        this.frame = 0;
        // THREE.Clock is deprecated (it emits a console warning at boot, seen
        // at 9ms in docs/logs/log16.json). Timer additionally clamps the delta
        // spike that a tab-switch or window-blur would otherwise hand to the
        // animation mixer.
        this.timer = new THREE.Timer();
        this.idleActionName = 'idle';
        this.loadToken = 0;
    }

    async show(identity) {
        if (!this.canvas) return false;
        const token = ++this.loadToken;
        this.disposeOverlay();
        try {
            this.renderer ??= new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
            this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
            this.renderer.outputColorSpace = THREE.SRGBColorSpace;
            this.scene ??= this.createScene();
            this.camera ??= new THREE.PerspectiveCamera(28, 1, 0.1, 20);
            this.camera.position.set(0, 1.05, 4.25);
            this.camera.lookAt(0, 0.9, 0);
            const overlay = await createPlayer3dOverlay({
                ...identity.model,
                targetHeight: 1.9,
                weaponEnabled: false,
                weaponVisible: false,
                allowStatic: true
            });
            if (token !== this.loadToken) {
                overlay.dispose();
                return false;
            }
            this.overlay = overlay;
            overlay.root.rotation.y = 0.08;
            this.scene.add(overlay.root);
            this.canvas.classList.remove('hidden');
            this.timer.reset();
            this.animate();
            return true;
        } catch (error) {
            console.warn('[leader-conversation] 3D speaker unavailable; using portrait fallback', error);
            this.canvas.classList.add('hidden');
            return false;
        }
    }

    createScene() {
        const scene = new THREE.Scene();
        scene.add(new THREE.HemisphereLight(0xc9f7ff, 0x10141c, 2.4));
        const key = new THREE.DirectionalLight(0xffffff, 3.2);
        key.position.set(2, 3, 3);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0x73ffad, 2.2);
        rim.position.set(-2, 2, -2);
        scene.add(rim);
        return scene;
    }

    react(reaction = {}) {
        this.idleActionName = this.overlay?.actions?.has(reaction.idle) ? reaction.idle : 'idle';
        if (reaction.gesture && this.overlay?.actions?.has(reaction.gesture)) {
            this.overlay.trigger(reaction.gesture);
        }
    }

    animate = () => {
        if (!this.overlay || !this.renderer) return;
        const width = Math.max(1, this.canvas.clientWidth);
        const height = Math.max(1, this.canvas.clientHeight);
        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.renderer.setSize(width, height, false);
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        }
        this.timer.update();
        const delta = Math.min(this.timer.getDelta(), 0.05);
        this.overlay.update(delta, {
            isMoving: false,
            isFalling: false,
            isReloading: false,
            isInjured: this.idleActionName === 'injuredIdle',
            idleActionName: this.idleActionName,
            hasAim: false,
            moveX: 0,
            moveZ: 1,
            aimX: 0,
            aimZ: 1
        });
        this.renderer.render(this.scene, this.camera);
        this.frame = requestAnimationFrame(this.animate);
    };

    disposeOverlay() {
        cancelAnimationFrame(this.frame);
        this.frame = 0;
        this.overlay?.dispose();
        this.overlay = null;
    }

    hide() {
        this.loadToken += 1;
        this.disposeOverlay();
    }
}
