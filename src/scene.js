import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export class GameScene {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x020205);

        const aspect = window.innerWidth / window.innerHeight;
        const d = 10;
        this.camera = new THREE.OrthographicCamera(
            -d * aspect, d * aspect, d, -d, 1, 1000
        );
        
        this.camera.position.set(20, 20, 20);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        document.body.appendChild(this.renderer.domElement);

        // Post-processing
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));

        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5, 0.4, 0.85
        );
        bloomPass.threshold = 0.1;
        bloomPass.strength = 0.8;
        bloomPass.radius = 0.5;
        this.composer.addPass(bloomPass);

        this.setupLighting();
        this.addBaseGrid();

        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x404040, 2);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // Neon Blue accent light
        const pointLight = new THREE.PointLight(0x00ffff, 5, 50);
        pointLight.position.set(0, 5, 0);
        this.scene.add(pointLight);
    }

    addBaseGrid() {
        const gridHelper = new THREE.GridHelper(20, 20, 0x00ffff, 0x222222);
        gridHelper.position.y = -0.01;
        this.scene.add(gridHelper);

        // Simple base floor
        const geometry = new THREE.PlaneGeometry(20, 20);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x111111,
            roughness: 0.8,
            metalness: 0.2
        });
        const floor = new THREE.Mesh(geometry, material);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
    }

    onWindowResize() {
        const aspect = window.innerWidth / window.innerHeight;
        const d = 10;
        this.camera.left = -d * aspect;
        this.camera.right = d * aspect;
        this.camera.top = d;
        this.camera.bottom = -d;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }

    render() {
        this.composer.render();
    }
}
