import * as THREE from 'three';
import { MarkovGenerator } from './generator.js';

const PLAYER_COLORS = {
    SCOUT: 0x7dff5a,
    TANK: 0xffb700,
    ENGINEER: 0x00e5ff
};

const PLAYER_SPRITESHEET_PATHS = {
    SCOUT: '/scout_walk.png',
    TANK: '/tank_walk.png',
    ENGINEER: '/engineer_walk.png'
};

const SPRITE_GRID_SIZE = 4;
const SPRITE_FRAME_REPEAT = 1 / SPRITE_GRID_SIZE;
const SPRITE_ANIMATION_SPEED = 12;

export class ThreeGame {
    constructor({ parent, playerType = 'SCOUT' } = {}) {
        this.container = typeof parent === 'string' ? document.getElementById(parent) : parent;
        if (!this.container) {
            throw new Error('ThreeGame requires a valid parent container.');
        }

        this.playerType = playerType;
        this.chunkSize = 19;
        this.chunkCellCount = (this.chunkSize - 1) / 2;
        this.visibleChunkRadius = 1;
        this.wallHeight = 2.8;
        this.playerRadius = 0.66;
        this.moveSpeed = 3.8;
        this.cameraLift = 10;
        this.cameraOffset = new THREE.Vector3(8, this.cameraLift, 8);
        this.cameraPlanarForward = new THREE.Vector2(-this.cameraOffset.x, -this.cameraOffset.z).normalize();
        this.cameraPlanarRight = new THREE.Vector2(-this.cameraPlanarForward.y, this.cameraPlanarForward.x).normalize();
        this.chunkCache = new Map();
        this.chunkMeshes = new Map();
        this.chunkGroups = new THREE.Group();
        this.wallMeshes = [];
        this.keys = { up: false, down: false, left: false, right: false };
        this.virtualInput = { x: 0, z: 0 };
        this.animationTimer = 0;
        this.currentFacingRow = 0;
        this.playerSpriteScale = 1.6;
        this.playerHeight = -0.18;
        this.playerSpriteLead = 0.18;
        this.lastTime = performance.now();
        this.raycaster = new THREE.Raycaster();

        this.scale = {
            refresh: () => this.resize()
        };

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0b0d0f);
        this.scene.fog = new THREE.Fog(0x0b0d0f, 10, 28);

        this.camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
        this.camera.position.copy(this.cameraOffset);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.replaceChildren(this.renderer.domElement);

        const textureLoader = new THREE.TextureLoader();
        const baseMetalTex = textureLoader.load('/bunker_base_metal.png');
        const grungeRustTex = textureLoader.load('/bunker_grunge_rust.png');
        const techScratchesTex = textureLoader.load('/bunker_tech_scratches.png');
        this.playerTextures = Object.fromEntries(
            Object.entries(PLAYER_SPRITESHEET_PATHS).map(([type, path]) => [
                type,
                this.createPlayerSpriteTexture(type, path, textureLoader)
            ])
        );

        baseMetalTex.wrapS = THREE.RepeatWrapping;
        baseMetalTex.wrapT = THREE.RepeatWrapping;
        baseMetalTex.minFilter = THREE.LinearMipmapLinearFilter;
        baseMetalTex.magFilter = THREE.LinearFilter;

        grungeRustTex.wrapS = THREE.RepeatWrapping;
        grungeRustTex.wrapT = THREE.RepeatWrapping;
        grungeRustTex.minFilter = THREE.LinearMipmapLinearFilter;
        grungeRustTex.magFilter = THREE.LinearFilter;

        techScratchesTex.wrapS = THREE.RepeatWrapping;
        techScratchesTex.wrapT = THREE.RepeatWrapping;
        techScratchesTex.minFilter = THREE.LinearMipmapLinearFilter;
        techScratchesTex.magFilter = THREE.LinearFilter;

        const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
        if (maxAnisotropy > 1) {
            baseMetalTex.anisotropy = maxAnisotropy;
            grungeRustTex.anisotropy = maxAnisotropy;
            techScratchesTex.anisotropy = maxAnisotropy;
        }

        Object.values(this.playerTextures).forEach((texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            texture.repeat.set(SPRITE_FRAME_REPEAT, SPRITE_FRAME_REPEAT);
            texture.offset.set(0, (SPRITE_GRID_SIZE - 1) * SPRITE_FRAME_REPEAT);
        });

        this.floorMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.85,
            metalness: 0.22,
            emissive: new THREE.Color(0x000000)
        });

        // Set map so the ThreeJS compiler compiles mapping features into the shader
        this.floorMaterial.map = baseMetalTex;

        this.floorMaterial.onBeforeCompile = (shader) => {
            shader.uniforms.tBase = { value: baseMetalTex };
            shader.uniforms.tGrunge = { value: grungeRustTex };
            shader.uniforms.tDetail = { value: techScratchesTex };

            // Inject world position varying into vertex shader
            shader.vertexShader = shader.vertexShader.replace(
                'void main() {',
                `
                varying vec3 vWorldPos;
                void main() {
                `
            );
            shader.vertexShader = shader.vertexShader.replace(
                '#include <worldpos_vertex>',
                `
                #include <worldpos_vertex>
                vWorldPos = (modelMatrix * vec4( transformed, 1.0 )).xyz;
                `
            );

            // Inject uniforms and varying into fragment shader
            shader.fragmentShader = `
                varying vec3 vWorldPos;
                uniform sampler2D tBase;
                uniform sampler2D tGrunge;
                uniform sampler2D tDetail;
                ${shader.fragmentShader}
            `;

            // Replace standard UV-mapping chunk with our world-space, coprime scale blending
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <map_fragment>',
                `
                #ifdef USE_MAP
                    // Map using absolute world-space coordinates
                    vec2 uvBase = vWorldPos.xz * 0.12;      // metal plates
                    vec2 uvGrunge = vWorldPos.xz * 0.053;   // slow rust/grunge spots
                    vec2 uvDetail = vWorldPos.xz * 0.27;    // tech stencils and fine scratches

                    vec4 colBase = texture2D( tBase, uvBase );
                    vec4 colGrunge = texture2D( tGrunge, uvGrunge );
                    vec4 colDetail = texture2D( tDetail, uvDetail );

                    // Base metal plates
                    vec3 blended = colBase.rgb;

                    // Blend rust grunge layer based on red & green channels
                    float rustMask = clamp((colGrunge.r * 0.85 + colGrunge.g * 0.35) * 0.95, 0.0, 1.0);
                    vec3 rustColor = vec3(0.18, 0.09, 0.05) * (0.6 + 0.4 * colGrunge.b);
                    blended = mix(blended, rustColor, rustMask * 0.88);

                    // Add mechanical scratch lines
                    float scratchMask = colDetail.r * 0.22;
                    blended += vec3(scratchMask);

                    diffuseColor *= vec4(blended, 1.0);
                #endif
                `
            );

            // Add glowing high-tech stencils to emissive light
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <emissivemap_fragment>',
                `
                #include <emissivemap_fragment>
                #ifdef USE_MAP
                    vec2 uvDetailEmissive = vWorldPos.xz * 0.27;
                    vec4 colDetailEmissive = texture2D( tDetail, uvDetailEmissive );
                    float glowIntensity = smoothstep(0.35, 0.7, colDetailEmissive.g * colDetailEmissive.b);
                    totalEmissiveRadiance += vec3(0.0, 0.7, 0.85) * glowIntensity * 1.35;
                #endif
                `
            );
        };

        const wallMetalTex = textureLoader.load('/bunker_wall_metal.png');
        const wallGrungeTex = textureLoader.load('/bunker_wall_grunge.png');

        wallMetalTex.wrapS = THREE.RepeatWrapping;
        wallMetalTex.wrapT = THREE.RepeatWrapping;
        wallMetalTex.minFilter = THREE.LinearMipmapLinearFilter;
        wallMetalTex.magFilter = THREE.LinearFilter;

        wallGrungeTex.wrapS = THREE.RepeatWrapping;
        wallGrungeTex.wrapT = THREE.RepeatWrapping;
        wallGrungeTex.minFilter = THREE.LinearMipmapLinearFilter;
        wallGrungeTex.magFilter = THREE.LinearFilter;

        if (maxAnisotropy > 1) {
            wallMetalTex.anisotropy = maxAnisotropy;
            wallGrungeTex.anisotropy = maxAnisotropy;
        }

        this.wallMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.76,
            metalness: 0.26
        });

        // Set map so THREE compiler enables map fragment code path
        this.wallMaterial.map = wallMetalTex;

        this.wallMaterial.onBeforeCompile = (shader) => {
            shader.uniforms.tWallSide = { value: wallMetalTex };
            shader.uniforms.tWallTop = { value: baseMetalTex }; // reuses floor plates for the top face
            shader.uniforms.tWallGrunge = { value: wallGrungeTex };

            // Inject world position and world normal varyings in vertex shader
            shader.vertexShader = shader.vertexShader.replace(
                'void main() {',
                `
                varying vec3 vWorldPos;
                varying vec3 vWorldNormal;
                void main() {
                `
            );
            shader.vertexShader = shader.vertexShader.replace(
                '#include <worldpos_vertex>',
                `
                #include <worldpos_vertex>
                vWorldPos = (modelMatrix * vec4( transformed, 1.0 )).xyz;
                vWorldNormal = normalize( (modelMatrix * vec4( normal, 0.0 )).xyz );
                `
            );

            // Inject uniforms and varyings in fragment shader
            shader.fragmentShader = `
                varying vec3 vWorldPos;
                varying vec3 vWorldNormal;
                uniform sampler2D tWallSide;
                uniform sampler2D tWallTop;
                uniform sampler2D tWallGrunge;
                ${shader.fragmentShader}
            `;

            // Replace standard UV-mapping with Triplanar World-Space Projection
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <map_fragment>',
                `
                #ifdef USE_MAP
                    // Triplanar mapping axis blend weights based on normal alignment
                    vec3 blendWeights = abs( normalize( vWorldNormal ) );
                    // Normalize weights
                    blendWeights /= ( blendWeights.x + blendWeights.y + blendWeights.z );

                    // Project texture coordinates along X, Y, Z world axes
                    // Y projection (top face) uses floor metal plate texture (XZ plane)
                    vec2 uvY = vWorldPos.xz * 0.12; 
                    vec4 colY = texture2D( tWallTop, uvY );

                    // X projection (left/right sides) uses vertical bulkhead panels (ZY plane)
                    vec2 uvX = vec2( vWorldPos.z * 0.45, vWorldPos.y * 0.35 );
                    vec4 colX = texture2D( tWallSide, uvX );

                    // Z projection (front/back sides) uses vertical bulkhead panels (XY plane)
                    vec2 uvZ = vec2( vWorldPos.x * 0.45, vWorldPos.y * 0.35 );
                    vec4 colZ = texture2D( tWallSide, uvZ );

                    // Blend colors
                    vec4 wallCol = colX * blendWeights.x + colY * blendWeights.y + colZ * blendWeights.z;

                    // Project wall grunge/rust drip streaks
                    vec2 uvGrungeY = vWorldPos.xz * 0.053;
                    vec4 grungeY = texture2D( tWallGrunge, uvGrungeY );

                    vec2 uvGrungeX = vec2( vWorldPos.z * 0.25, vWorldPos.y * 0.2 );
                    vec4 grungeX = texture2D( tWallGrunge, uvGrungeX );

                    vec2 uvGrungeZ = vec2( vWorldPos.x * 0.25, vWorldPos.y * 0.2 );
                    vec4 grungeZ = texture2D( tWallGrunge, uvGrungeZ );

                    vec4 wallGrunge = grungeX * blendWeights.x + grungeY * blendWeights.y + grungeZ * blendWeights.z;

                    // Blend grunge with base metals
                    vec3 blended = wallCol.rgb;
                    float rustMask = clamp((wallGrunge.r * 0.85 + wallGrunge.g * 0.3) * 0.95, 0.0, 1.0);
                    vec3 rustColor = vec3(0.18, 0.09, 0.05) * (0.6 + 0.4 * wallGrunge.b);
                    blended = mix(blended, rustColor, rustMask * 0.82);

                    diffuseColor *= vec4(blended, 1.0);
                #endif
                `
            );
        };
        this.playerMaterials = Object.fromEntries(
            Object.entries(this.playerTextures).map(([type, texture]) => {
                const material = new THREE.SpriteMaterial({
                    map: texture,
                    transparent: true,
                    alphaTest: 0.12,
                    depthWrite: false,
                    depthTest: true
                });
                material.onBeforeCompile = (shader) => {
                    shader.fragmentShader = shader.fragmentShader.replace(
                        '#include <map_fragment>',
                        `
                        #ifdef USE_MAP
                            vec4 mapTexel = texture2D( map, vMapUv );
                            diffuseColor *= mapTexel;
                        #endif
                        `
                    );
                };
                return [type, material];
            })
        );
        this.playerMaterial = new THREE.MeshStandardMaterial({
            color: PLAYER_COLORS[this.playerType] ?? 0xffffff,
            emissive: PLAYER_COLORS[this.playerType] ?? 0xffffff,
            emissiveIntensity: 0.22,
            roughness: 0.3,
            metalness: 0.05
        });
        this.playerMaterial.colorWrite = false;
        this.playerMaterial.depthWrite = false;

        this.setupLighting();
        this.setupWorld();
        this.setupPlayer();
        this.setupInput();
        this.resize();
        this.syncVisibleChunks(true);
        this.renderer.setAnimationLoop(() => this.render());
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.9);
        this.scene.add(ambientLight);

        const fillLight = new THREE.HemisphereLight(0x6b8db3, 0x07090c, 0.8);
        this.scene.add(fillLight);

        const directionalLight = new THREE.DirectionalLight(0xd6e7ff, 2.3);
        directionalLight.position.set(10, 18, 8);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 40;
        directionalLight.shadow.camera.left = -14;
        directionalLight.shadow.camera.right = 14;
        directionalLight.shadow.camera.top = 14;
        directionalLight.shadow.camera.bottom = -14;
        this.scene.add(directionalLight);

        const playerGlow = new THREE.PointLight(PLAYER_COLORS[this.playerType] ?? 0xffffff, 2.4, 8, 2);
        playerGlow.position.set(0, 1.6, 0);
        this.playerGlow = playerGlow;
        this.scene.add(playerGlow);
    }

    setupWorld() {
        const baseFloor = new THREE.Mesh(
            new THREE.CircleGeometry(18, 48),
            new THREE.MeshStandardMaterial({
                color: 0x111418,
                roughness: 1,
                metalness: 0
            })
        );
        baseFloor.rotation.x = -Math.PI / 2;
        baseFloor.position.y = -0.03;
        baseFloor.receiveShadow = true;
        this.scene.add(baseFloor);

        this.scene.add(this.chunkGroups);
    }

    setupPlayer() {
        this.player = new THREE.Group();

        this.playerMesh = new THREE.Mesh(
            new THREE.SphereGeometry(this.playerRadius, 20, 20),
            this.playerMaterial
        );
        this.playerMesh.position.y = this.playerRadius + 0.02;
        this.playerMesh.castShadow = true;
        this.player.add(this.playerMesh);

        this.playerSprite = new THREE.Sprite(this.playerMaterials[this.playerType] ?? this.playerMaterials.SCOUT);
        this.playerSprite.center.set(0.5, 0);
        this.playerSprite.position.x = this.playerSpriteLead;
        this.playerSprite.position.y = this.playerHeight;
        this.playerSprite.position.z = this.playerSpriteLead;
        this.playerSprite.scale.set(this.playerSpriteScale, this.playerSpriteScale, 1);
        this.player.add(this.playerSprite);

        this.playerMarker = this.createHiddenPlayerMarker();
        this.playerMarker.visible = false;
        this.scene.add(this.playerMarker);

        const spawn = this.getSpawnTile();
        this.player.position.set(spawn.x, 0, spawn.y);
        this.scene.add(this.player);
        this.playerGlow.position.set(spawn.x, 1.6, spawn.y);
        this.playerMarker.position.set(spawn.x, this.playerRadius + 0.08, spawn.y);
        this.updatePlayerSpriteFrame(0, this.currentFacingRow);
    }

    createHiddenPlayerMarker() {
        const marker = new THREE.Group();
        const segments = 48;
        const points = [];

        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            points.push(new THREE.Vector3(Math.cos(angle) * 0.42, 0, Math.sin(angle) * 0.42));
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineDashedMaterial({
            color: 0xffffff,
            dashSize: 0.08,
            gapSize: 0.05,
            transparent: true,
            opacity: 0.95,
            depthTest: false,
            depthWrite: false
        });
        const ring = new THREE.LineLoop(geometry, material);
        ring.computeLineDistances();
        ring.rotation.x = -Math.PI / 2;
        ring.renderOrder = 999;
        marker.add(ring);

        const beacon = new THREE.Mesh(
            new THREE.RingGeometry(0.08, 0.16, 24),
            new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.9,
                side: THREE.DoubleSide,
                depthTest: false,
                depthWrite: false
            })
        );
        beacon.rotation.x = -Math.PI / 2;
        beacon.position.y = 0.02;
        beacon.renderOrder = 999;
        marker.add(beacon);

        marker.renderOrder = 999;

        return marker;
    }

    setupInput() {
        this.handleKeyDown = (event) => this.setKeyState(event.code, true);
        this.handleKeyUp = (event) => this.setKeyState(event.code, false);
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
    }

    setKeyState(code, pressed) {
        if (code === 'ArrowUp' || code === 'KeyW') this.keys.up = pressed;
        if (code === 'ArrowDown' || code === 'KeyS') this.keys.down = pressed;
        if (code === 'ArrowLeft' || code === 'KeyA') this.keys.left = pressed;
        if (code === 'ArrowRight' || code === 'KeyD') this.keys.right = pressed;
    }

    setVirtualInput(x = 0, z = 0) {
        this.virtualInput.x = THREE.MathUtils.clamp(x, -1, 1);
        this.virtualInput.z = THREE.MathUtils.clamp(z, -1, 1);
    }

    updatePlayerType(type) {
        this.playerType = type;
        const color = PLAYER_COLORS[type] ?? 0xffffff;
        this.playerSprite.material = this.playerMaterials[type] ?? this.playerMaterials.SCOUT;
        this.playerSprite.material.needsUpdate = true;
        this.playerMaterial.color.setHex(color);
        this.playerMaterial.emissive.setHex(color);
        this.playerGlow.color.setHex(color);
        this.updatePlayerSpriteFrame(0, this.currentFacingRow);
    }

    refreshActivePlayerSprite(type) {
        if (!this.playerSprite || this.playerType !== type) {
            return;
        }

        this.playerSprite.material = this.playerMaterials[type] ?? this.playerMaterials.SCOUT;
        this.playerSprite.material.needsUpdate = true;
        this.updatePlayerSpriteFrame(0, this.currentFacingRow);
    }

    createPlayerSpriteTexture(type, path, textureLoader) {
        return textureLoader.load(path, (texture) => {
            this.playerMaterials?.[type] && (this.playerMaterials[type].needsUpdate = true);
            this.refreshActivePlayerSprite(type);
            console.info(`[ThreeGame] Loaded player sprite ${type} from ${path} (${texture.image?.width ?? 0}x${texture.image?.height ?? 0})`);
        }, undefined, (error) => {
            console.warn(`[ThreeGame] Failed to load player sprite ${type} from ${path}`, error);
        });
    }

    resize() {
        const width = this.container.clientWidth || 1;
        const height = this.container.clientHeight || 1;
        const aspect = width / height;
        const viewSize = 6.8;

        this.camera.left = -viewSize * aspect;
        this.camera.right = viewSize * aspect;
        this.camera.top = viewSize;
        this.camera.bottom = -viewSize;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height, false);
    }

    render() {
        const now = performance.now();
        const delta = Math.min((now - this.lastTime) / 1000, 0.05);
        this.lastTime = now;

        this.updatePlayer(delta);
        this.updateCamera(delta);
        this.syncVisibleChunks();
        this.updateHiddenPlayerMarker(now);
        this.renderer.render(this.scene, this.camera);
    }

    updatePlayer(delta) {
        const keyAxisX = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
        const keyAxisZ = (this.keys.down ? 1 : 0) - (this.keys.up ? 1 : 0);
        const screenAxisX = THREE.MathUtils.clamp(keyAxisX + this.virtualInput.x, -1, 1);
        const screenAxisZ = THREE.MathUtils.clamp(keyAxisZ + this.virtualInput.z, -1, 1);
        const moveAxisX = (this.cameraPlanarRight.x * screenAxisX) + (this.cameraPlanarForward.x * -screenAxisZ);
        const moveAxisZ = (this.cameraPlanarRight.y * screenAxisX) + (this.cameraPlanarForward.y * -screenAxisZ);
        const isMoving = Boolean(moveAxisX || moveAxisZ);

        if (isMoving) {
            const moveVector = new THREE.Vector3(moveAxisX, 0, moveAxisZ).normalize().multiplyScalar(this.moveSpeed * delta);
            const current = this.player.position.clone();
            const nextX = new THREE.Vector3(current.x + moveVector.x, current.y, current.z);
            const nextZ = new THREE.Vector3(current.x, current.y, current.z + moveVector.z);

            if (this.canOccupyPosition(nextX.x, nextX.z)) {
                this.player.position.x = nextX.x;
            }

            if (this.canOccupyPosition(nextZ.x, nextZ.z)) {
                this.player.position.z = nextZ.z;
            }
        }

        this.updatePlayerSpriteAnimation(screenAxisX, screenAxisZ, delta, isMoving);
        this.playerGlow.position.set(this.player.position.x, 1.6, this.player.position.z);
        this.playerMarker.position.set(this.player.position.x, this.playerRadius + 0.08, this.player.position.z);
    }

    updatePlayerSpriteAnimation(axisX, axisZ, delta, isMoving) {
        if (isMoving) {
            this.currentFacingRow = this.getFacingRow(axisX, axisZ);
            this.animationTimer += delta * SPRITE_ANIMATION_SPEED;
            const column = Math.floor(this.animationTimer) % SPRITE_GRID_SIZE;
            this.updatePlayerSpriteFrame(column, this.currentFacingRow);
            return;
        }

        this.animationTimer = 0;
        this.updatePlayerSpriteFrame(0, this.currentFacingRow);
    }

    getFacingRow(axisX, axisZ) {
        const angle = Math.atan2(axisZ, axisX);

        if (angle > -Math.PI / 4 && angle <= Math.PI / 4) {
            return 2;
        }

        if (angle > Math.PI / 4 && angle <= (3 * Math.PI) / 4) {
            return 0;
        }

        if (angle > (-3 * Math.PI) / 4 && angle <= -Math.PI / 4) {
            return 3;
        }

        return 1;
    }

    updatePlayerSpriteFrame(column, row) {
        const texture = this.playerTextures[this.playerType] ?? this.playerTextures.SCOUT;
        texture.offset.set(column * SPRITE_FRAME_REPEAT, (SPRITE_GRID_SIZE - 1 - row) * SPRITE_FRAME_REPEAT);
    }

    updateCamera(delta) {
        const target = new THREE.Vector3(
            this.player.position.x + this.cameraOffset.x,
            this.cameraOffset.y,
            this.player.position.z + this.cameraOffset.z
        );
        this.camera.position.lerp(target, 1 - Math.exp(-delta * 7));
        this.camera.lookAt(this.player.position.x, 0.4, this.player.position.z);
    }

    syncVisibleChunks(force = false) {
        const centerChunkX = Math.floor(this.player.position.x / this.chunkSize);
        const centerChunkY = Math.floor(this.player.position.z / this.chunkSize);
        const needed = new Set();
        this.wallMeshes = [];

        for (let chunkY = centerChunkY - this.visibleChunkRadius; chunkY <= centerChunkY + this.visibleChunkRadius; chunkY++) {
            for (let chunkX = centerChunkX - this.visibleChunkRadius; chunkX <= centerChunkX + this.visibleChunkRadius; chunkX++) {
                const key = `${chunkX},${chunkY}`;
                needed.add(key);
                if (force || !this.chunkMeshes.has(key)) {
                    this.mountChunk(chunkX, chunkY);
                }
            }
        }

        for (const [key, group] of this.chunkMeshes.entries()) {
            if (needed.has(key)) continue;
            this.chunkGroups.remove(group);
            this.chunkMeshes.delete(key);
        }

        for (const group of this.chunkMeshes.values()) {
            for (const child of group.children) {
                if (child.userData.isWall) {
                    this.wallMeshes.push(child);
                }
            }
        }
    }

    mountChunk(chunkX, chunkY) {
        const grid = this.getOrCreateChunk(chunkX, chunkY);
        const group = new THREE.Group();
        const wallGeometry = new THREE.BoxGeometry(1, this.wallHeight, 1);
        const floorGeometry = new THREE.PlaneGeometry(1, 1);

        for (let localY = 0; localY < this.chunkSize; localY++) {
            for (let localX = 0; localX < this.chunkSize; localX++) {
                const worldX = chunkX * this.chunkSize + localX;
                const worldZ = chunkY * this.chunkSize + localY;

                const floor = new THREE.Mesh(floorGeometry, this.floorMaterial);
                floor.rotation.x = -Math.PI / 2;
                floor.position.set(worldX, 0, worldZ);
                floor.receiveShadow = true;
                group.add(floor);

                if (grid[localY][localX] !== '#') continue;

                const wall = new THREE.Mesh(wallGeometry, this.wallMaterial);
                wall.position.set(worldX, this.wallHeight / 2, worldZ);
                wall.castShadow = true;
                wall.receiveShadow = true;
                wall.userData.isWall = true;
                group.add(wall);
            }
        }

        this.chunkGroups.add(group);
        this.chunkMeshes.set(`${chunkX},${chunkY}`, group);
    }

    canOccupyPosition(x, z) {
        const tileX = Math.round(x);
        const tileY = Math.round(z);

        for (let offsetY = -2; offsetY <= 2; offsetY++) {
            for (let offsetX = -2; offsetX <= 2; offsetX++) {
                const checkX = tileX + offsetX;
                const checkY = tileY + offsetY;

                if (this.getTileType(checkX, checkY) !== '#') continue;
                if (this.overlapsWall(x, z, checkX, checkY)) return false;
            }
        }

        return true;
    }

    overlapsWall(x, z, wallX, wallZ) {
        const minX = wallX - 0.5 - this.playerRadius;
        const maxX = wallX + 0.5 + this.playerRadius;
        const minZ = wallZ - 0.5 - this.playerRadius;
        const maxZ = wallZ + 0.5 + this.playerRadius;
        return x >= minX && x <= maxX && z >= minZ && z <= maxZ;
    }

    updateHiddenPlayerMarker(now) {
        const origin = this.camera.position.clone();
        const target = this.player.position.clone();
        const direction = target.clone().sub(origin);
        const distance = direction.length();

        if (distance <= 0.001 || this.wallMeshes.length === 0) {
            this.playerMarker.visible = false;
            return;
        }

        direction.normalize();
        this.raycaster.set(origin, direction);
        this.raycaster.far = distance - this.playerRadius * 0.25;
        const hits = this.raycaster.intersectObjects(this.wallMeshes, false);
        const hidden = hits.length > 0;

        this.playerMarker.visible = hidden;
        if (!hidden) return;

        const pulse = 0.7 + Math.sin(now * 0.012) * 0.2;
        this.playerMarker.children[0].material.opacity = pulse;
        this.playerMarker.children[1].material.opacity = 0.7 + Math.sin(now * 0.012 + 0.7) * 0.2;
        this.playerMarker.lookAt(this.camera.position.x, this.playerMarker.position.y, this.camera.position.z);
    }

    getTileType(worldX, worldY) {
        const chunkX = Math.floor(worldX / this.chunkSize);
        const chunkY = Math.floor(worldY / this.chunkSize);
        const localX = worldX - chunkX * this.chunkSize;
        const localY = worldY - chunkY * this.chunkSize;
        const chunk = this.getOrCreateChunk(chunkX, chunkY);
        return chunk[localY][localX];
    }

    getOrCreateChunk(chunkX, chunkY) {
        const key = `${chunkX},${chunkY}`;
        if (!this.chunkCache.has(key)) {
            this.chunkCache.set(key, this.buildChunk(chunkX, chunkY));
        }
        return this.chunkCache.get(key);
    }

    buildChunk(chunkX, chunkY) {
        const grid = Array(this.chunkSize).fill(null).map(() => Array(this.chunkSize).fill('#'));
        const random = this.createSeededRandom(this.hashTile(chunkX + 1000, chunkY - 1000) + 101);
        const centerCell = Math.floor(this.chunkCellCount / 2);
        const stack = [[centerCell, centerCell]];
        const visited = new Set([`${centerCell},${centerCell}`]);

        this.carveCell(grid, centerCell, centerCell);

        while (stack.length > 0) {
            const [cellX, cellY] = stack[stack.length - 1];
            const neighbors = this.shuffleDirections([
                { dx: 1, dy: 0 },
                { dx: -1, dy: 0 },
                { dx: 0, dy: 1 },
                { dx: 0, dy: -1 }
            ], random);
            let carved = false;

            for (const { dx, dy } of neighbors) {
                const nextX = cellX + dx;
                const nextY = cellY + dy;
                const key = `${nextX},${nextY}`;

                if (
                    nextX < 0 ||
                    nextX >= this.chunkCellCount ||
                    nextY < 0 ||
                    nextY >= this.chunkCellCount ||
                    visited.has(key)
                ) {
                    continue;
                }

                this.carvePassage(grid, cellX, cellY, nextX, nextY);
                visited.add(key);
                stack.push([nextX, nextY]);
                carved = true;
                break;
            }

            if (!carved) {
                stack.pop();
            }
        }

        this.ensureChunkPortals(grid, chunkX, chunkY);
        this.runMarkovPass(grid, random);
        this.widenChunkCorridors(grid);
        this.clearSpawnArea(grid, chunkX, chunkY);
        return grid;
    }

    carveCell(grid, cellX, cellY) {
        grid[cellY * 2 + 1][cellX * 2 + 1] = '.';
    }

    carvePassage(grid, fromCellX, fromCellY, toCellX, toCellY) {
        const fromX = fromCellX * 2 + 1;
        const fromY = fromCellY * 2 + 1;
        const toX = toCellX * 2 + 1;
        const toY = toCellY * 2 + 1;

        grid[fromY][fromX] = '.';
        grid[toY][toX] = '.';
        grid[(fromY + toY) / 2][(fromX + toX) / 2] = '.';
    }

    ensureChunkPortals(grid, chunkX, chunkY) {
        const openings = {
            north: this.getEdgeOpening('horizontal', chunkX, chunkY),
            south: this.getEdgeOpening('horizontal', chunkX, chunkY + 1),
            west: this.getEdgeOpening('vertical', chunkX, chunkY),
            east: this.getEdgeOpening('vertical', chunkX + 1, chunkY)
        };

        if (!openings.north.open && !openings.south.open && !openings.west.open && !openings.east.open) {
            openings.east.open = true;
        }

        if (openings.north.open) {
            const localX = openings.north.offset * 2 + 1;
            grid[0][localX] = '.';
            grid[1][localX] = '.';
        }

        if (openings.south.open) {
            const localX = openings.south.offset * 2 + 1;
            grid[this.chunkSize - 1][localX] = '.';
            grid[this.chunkSize - 2][localX] = '.';
        }

        if (openings.west.open) {
            const localY = openings.west.offset * 2 + 1;
            grid[localY][0] = '.';
            grid[localY][1] = '.';
        }

        if (openings.east.open) {
            const localY = openings.east.offset * 2 + 1;
            grid[localY][this.chunkSize - 1] = '.';
            grid[localY][this.chunkSize - 2] = '.';
        }
    }

    getEdgeOpening(axis, edgeX, edgeY) {
        const seed = this.hashTile(edgeX * 97 + (axis === 'vertical' ? 11 : 23), edgeY * 193 + (axis === 'vertical' ? 41 : 59));
        return {
            open: seed % 100 < 68,
            offset: seed % this.chunkCellCount
        };
    }

    runMarkovPass(grid, random) {
        const generator = new MarkovGenerator(this.chunkSize, this.chunkSize, random);
        generator.grid = grid.map((row) => [...row]);
        generator.addRule(['.#'], ['..'], 0.15);
        generator.addRule(['#.'], ['..'], 0.15);
        generator.addRule(['.', '#'], ['.', '.'], 0.15);
        generator.addRule(['#', '.'], ['.', '.'], 0.15);
        generator.run(24);

        for (let y = 0; y < this.chunkSize; y++) {
            for (let x = 0; x < this.chunkSize; x++) {
                grid[y][x] = generator.grid[y][x];
            }
        }
    }

    widenChunkCorridors(grid) {
        const widened = grid.map((row) => [...row]);

        for (let y = 1; y < this.chunkSize - 1; y++) {
            for (let x = 1; x < this.chunkSize - 1; x++) {
                if (grid[y][x] !== '.') continue;

                const leftOpen = grid[y][x - 1] === '.';
                const rightOpen = grid[y][x + 1] === '.';
                const upOpen = grid[y - 1][x] === '.';
                const downOpen = grid[y + 1][x] === '.';

                if (leftOpen && rightOpen) {
                    widened[y - 1][x] = '.';
                    widened[y + 1][x] = '.';
                }

                if (upOpen && downOpen) {
                    widened[y][x - 1] = '.';
                    widened[y][x + 1] = '.';
                }

                if ((leftOpen || rightOpen) && (upOpen || downOpen)) {
                    widened[y - 1][x] = '.';
                    widened[y + 1][x] = '.';
                    widened[y][x - 1] = '.';
                    widened[y][x + 1] = '.';
                }
            }
        }

        for (let y = 0; y < this.chunkSize; y++) {
            for (let x = 0; x < this.chunkSize; x++) {
                grid[y][x] = widened[y][x];
            }
        }
    }

    clearSpawnArea(grid, chunkX, chunkY) {
        const spawn = this.getSpawnTile();

        for (let localY = 0; localY < this.chunkSize; localY++) {
            for (let localX = 0; localX < this.chunkSize; localX++) {
                const worldX = chunkX * this.chunkSize + localX;
                const worldY = chunkY * this.chunkSize + localY;
                const distance = Math.abs(worldX - spawn.x) + Math.abs(worldY - spawn.y);
                if (distance <= 2) {
                    grid[localY][localX] = '.';
                }
            }
        }
    }

    getSpawnTile() {
        const centerCell = Math.floor(this.chunkCellCount / 2);
        return {
            x: centerCell * 2 + 1,
            y: centerCell * 2 + 1
        };
    }

    shuffleDirections(items, random) {
        const copy = [...items];
        for (let i = copy.length - 1; i > 0; i--) {
            const swapIndex = Math.floor(random() * (i + 1));
            [copy[i], copy[swapIndex]] = [copy[swapIndex], copy[i]];
        }
        return copy;
    }

    createSeededRandom(seed) {
        let state = (seed >>> 0) || 1;
        return () => {
            state ^= state << 13;
            state ^= state >>> 17;
            state ^= state << 5;
            return (state >>> 0) / 4294967296;
        };
    }

    hashTile(x, y) {
        const seed = Math.imul(x, 73856093) ^ Math.imul(y, 19349663);
        return Math.abs(seed);
    }

    destroy() {
        this.renderer.setAnimationLoop(null);
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        Object.values(this.playerMaterials ?? {}).forEach((material) => material.dispose());
        Object.values(this.playerTextures ?? {}).forEach((texture) => texture.dispose());
        this.renderer.dispose();
        this.container.replaceChildren();
    }
}
