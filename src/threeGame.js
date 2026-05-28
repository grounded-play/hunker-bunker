import * as THREE from 'three';
import { BankManager, O2_GENERATOR_UPGRADES } from './bank.js';
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
const PICKUP_DISTRIBUTION = {
    clustered: 0.7,
    transitional: 0.2,
    stray: 0.1
};
const PICKUP_TYPES = [
    { type: 'health', weight: 0.35 },
    { type: 'ammo', weight: 0.35 },
    { type: 'weapon', weight: 0.18 },
    { type: 'coin', weight: 0.12 }
];
const O2_DRAIN_RATE_PCT_PER_SEC = 1 / 3;
const O2_DANGER_THRESHOLD = 25;
const O2_DRAIN_RATE_DANGER_MULT = 1.5;
const O2_HEALTH_DRAIN_INTERVAL = 20;
const BASE_HEARTS = 3;
const UPGRADED_HEARTS = 4;

const O2_GENERATOR_BUTTON_ID = 'terminal-btn-o2-generator';
const O2_GENERATOR_RING_BASE_RADIUS = 1;
const O2_GENERATOR_RING_BAND_THICKNESS = 0.24;
const O2_MODULE_COLLISION_RADIUS = 0.5;
const O2_MODULE_OFFSET = Object.freeze({ x: 1.75, z: 1.2 });
const PICKUP_MAGNET_RADIUS = 3.4;
const PICKUP_COLLECT_RADIUS = 0.72;
const PICKUP_COLLECT_DURATION = 0.2;
const SCATTER_CLUSTER_RATIO = 0.7;
const SCATTER_TRANSITION_RATIO = 0.2;
const SCATTER_STRAY_RATIO = 0.1;
const SCATTER_MIN_SEPARATION = 0.78;
const SCATTER_CLUSTER_CENTER_MIN_DISTANCE = 4.8;
const BUNKER_JUNK_TRIGGER_RADIUS = 1.35;
const BUNKER_JUNK_MIN_SEPARATION = 2.2;
const BUNKER_JUNK_DROP_COUNT_MIN = 2;
const BUNKER_JUNK_DROP_COUNT_MAX = 4;
const LOOT_RARITIES = [
    { key: 'basic', weight: 0.55, color: 0xb7c3d0 },
    { key: 'uncommon', weight: 0.27, color: 0x66ff9a },
    { key: 'rare', weight: 0.13, color: 0x58bbff },
    { key: 'legendary', weight: 0.05, color: 0xffb347 }
];
const JUNK_SCATTER_VARIANTS = [
    { type: 'bunker_junk', weight: 0.55, glowColor: 0xffcc74, smokeColor: 0x95a1ab },
    { type: 'bunker_junk_uncommon', weight: 0.27, glowColor: 0x66ff9a, smokeColor: 0x7ebd98 },
    { type: 'bunker_junk_rare', weight: 0.13, glowColor: 0x58bbff, smokeColor: 0x6d98bb },
    { type: 'bunker_junk_legendary', weight: 0.05, glowColor: 0xffb347, smokeColor: 0xc09762 }
];
const SPORE_SCATTER_VARIANTS = [
    { type: 'bio_spores', weight: 0.45 },
    { type: 'bio_spores_blue', weight: 0.275 },
    { type: 'bio_spores_amber', weight: 0.275 }
];
const JUNK_LOOT_BIAS = {
    bunker_junk: [
        { key: 'basic', weight: 0.8 },
        { key: 'uncommon', weight: 0.2 }
    ],
    bunker_junk_uncommon: [
        { key: 'uncommon', weight: 0.7 },
        { key: 'basic', weight: 0.3 }
    ],
    bunker_junk_rare: [
        { key: 'rare', weight: 0.7 },
        { key: 'uncommon', weight: 0.3 }
    ],
    bunker_junk_legendary: [
        { key: 'legendary', weight: 0.75 },
        { key: 'rare', weight: 0.25 }
    ]
};

export class ThreeGame {
    constructor({ parent, playerType = 'SCOUT', bankManager = null } = {}) {
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
        this.pendingChunkMounts = [];
        this.pendingChunkMountKeys = new Set();
        this.maxChunkMountsPerFrame = 2;
        this.wallMeshes = [];
        this.pickupMeshes = [];
        this.scatterSprites = [];
        this.depletedGearPileKeys = new Set();
        this.transientEffects = [];
        this.keys = { up: false, down: false, left: false, right: false };
        this.virtualInput = { x: 0, z: 0 };
        this.inputEnabled = true;
        this.isMoving = false;
        this.animationTimer = 0;
        this.currentFacingRow = 0;
        this.playerSpriteScale = 1.6;
        this.playerHeight = 0.06;
        this.playerSpriteLead = 0.18;
        this.playerMarkerHeight = 0.05;
        this.lastTime = performance.now();
        this.raycaster = new THREE.Raycaster();
        this.bank = bankManager instanceof BankManager ? bankManager : new BankManager();
        this.playerVitals = {
            hp: BASE_HEARTS,
            maxHp: BASE_HEARTS,
            o2: 100,
            o2HealthTimer: 0
        };
        this.isPlayerDead = false;
        this.o2DispatchTimer = 0;
        this.terminalCloseListenerBound = false;
        this.o2BubbleObjects = null;

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
        this.pickupAssets = this.createPickupAssets();

        // Load scatter textures directly from assets. The source files already contain alpha,
        // so avoid aggressive color-key postprocessing that can erase dark details.
        this.scatterTextures = {
            cybersnail: this.loadScatterTexture('/cybersnail.png', textureLoader),
            bunker_junk: this.loadScatterTexture('/bunker_junk.png', textureLoader),
            bunker_junk_uncommon: this.loadScatterTexture('/bunker_junk_uncommon.png', textureLoader),
            bunker_junk_rare: this.loadScatterTexture('/bunker_junk_rare.png', textureLoader),
            bunker_junk_legendary: this.loadScatterTexture('/bunker_junk_legendary.png', textureLoader),
            bio_spores: this.loadScatterTexture('/bio_spores.png', textureLoader),
            bio_spores_blue: this.loadScatterTexture('/bio_spores_blue.png', textureLoader),
            bio_spores_amber: this.loadScatterTexture('/bio_spores_amber.png', textureLoader)
        };

        this.scatterMaterials = {
            cybersnail: new THREE.SpriteMaterial({
                map: this.scatterTextures.cybersnail,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            bunker_junk: new THREE.SpriteMaterial({
                map: this.scatterTextures.bunker_junk,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            bunker_junk_uncommon: new THREE.SpriteMaterial({
                map: this.scatterTextures.bunker_junk_uncommon,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            bunker_junk_rare: new THREE.SpriteMaterial({
                map: this.scatterTextures.bunker_junk_rare,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            bunker_junk_legendary: new THREE.SpriteMaterial({
                map: this.scatterTextures.bunker_junk_legendary,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            bio_spores: new THREE.SpriteMaterial({
                map: this.scatterTextures.bio_spores,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            bio_spores_blue: new THREE.SpriteMaterial({
                map: this.scatterTextures.bio_spores_blue,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            bio_spores_amber: new THREE.SpriteMaterial({
                map: this.scatterTextures.bio_spores_amber,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            })
        };
        this.scatterPlaneMaterials = {
            bunker_junk: new THREE.MeshBasicMaterial({
                map: this.scatterTextures.bunker_junk,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                side: THREE.DoubleSide,
                fog: false
            }),
            bunker_junk_uncommon: new THREE.MeshBasicMaterial({
                map: this.scatterTextures.bunker_junk_uncommon,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                side: THREE.DoubleSide,
                fog: false
            }),
            bunker_junk_rare: new THREE.MeshBasicMaterial({
                map: this.scatterTextures.bunker_junk_rare,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                side: THREE.DoubleSide,
                fog: false
            }),
            bunker_junk_legendary: new THREE.MeshBasicMaterial({
                map: this.scatterTextures.bunker_junk_legendary,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                side: THREE.DoubleSide,
                fog: false
            })
        };

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
        this.setupCrashedShips();
    }

    setupCrashedShips() {
        // Create SpriteMaterials first and dynamically bind textures as they load
        const scoutShipMat = new THREE.SpriteMaterial({ transparent: true, alphaTest: 0.05, depthWrite: true, depthTest: true });
        const tankShipMat = new THREE.SpriteMaterial({ transparent: true, alphaTest: 0.05, depthWrite: true, depthTest: true });
        const engineerShipMat = new THREE.SpriteMaterial({ transparent: true, alphaTest: 0.05, depthWrite: true, depthTest: true });
        const consoleMat = new THREE.SpriteMaterial({ transparent: true, alphaTest: 0.05, depthWrite: true, depthTest: true });
        const o2ModuleMat = new THREE.SpriteMaterial({ transparent: true, alphaTest: 0.04, depthWrite: true, depthTest: true });

        // Load textures using our high-fidelity chroma-key transparency shader to strip black backgrounds perfectly!
        this.loadKeyedSpriteTexture('/scout_ship.png', 15, (tex) => {
            scoutShipMat.map = tex;
            scoutShipMat.needsUpdate = true;
        });
        this.loadKeyedSpriteTexture('/tank_ship.png', 15, (tex) => {
            tankShipMat.map = tex;
            tankShipMat.needsUpdate = true;
        });
        this.loadKeyedSpriteTexture('/engineer_ship.png', 15, (tex) => {
            engineerShipMat.map = tex;
            engineerShipMat.needsUpdate = true;
        });
        this.loadKeyedSpriteTexture('/console.png', 15, (tex) => {
            consoleMat.map = tex;
            consoleMat.needsUpdate = true;
        });
        this.loadKeyedSpriteTexture('/module_o2_generator.png', 18, (tex) => {
            o2ModuleMat.map = tex;
            o2ModuleMat.needsUpdate = true;
        }, { cropBottomRatio: 0.16 });

        // Placements relative to spawn (which is 9, 9 in starting chunk)
        this.crashedShips = [
            {
                type: 'SCOUT',
                tileX: 6,
                tileZ: 6,
                width: 1.3,
                scale: 3.5,
                elevation: 0.1,
                material: scoutShipMat,
                consoleOffset: { x: -1.6, z: 1.6 },
                o2ModuleOffset: { ...O2_MODULE_OFFSET },
                color: 0x7dff5a
            },
            {
                type: 'TANK',
                tileX: 12,
                tileZ: 6,
                width: 1.3,
                scale: 3.5,
                elevation: 0.1,
                material: tankShipMat,
                consoleOffset: { x: -1.6, z: 1.6 },
                o2ModuleOffset: { ...O2_MODULE_OFFSET },
                color: 0xffb700
            },
            {
                type: 'ENGINEER',
                tileX: 9,
                tileZ: 13,
                width: 1.3,
                scale: 3.5,
                elevation: 0.1,
                material: engineerShipMat,
                consoleOffset: { x: -1.6, z: 1.6 },
                o2ModuleOffset: { ...O2_MODULE_OFFSET },
                color: 0x00e5ff
            }
        ];


        const shadowMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.35,
            depthWrite: false
        });

        const consoleShadowMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.25,
            depthWrite: false
        });

        for (const ship of this.crashedShips) {
            // 1. Shadow for Ship
            const shadowGeo = new THREE.CircleGeometry(1.2, 32);
            const shadow = new THREE.Mesh(shadowGeo, shadowMat);
            shadow.rotation.x = -Math.PI / 2;
            shadow.position.set(ship.tileX, 0.02, ship.tileZ);
            this.scene.add(shadow);

            // 2. Sprite for Ship
            const shipSprite = new THREE.Sprite(ship.material);
            shipSprite.center.set(0.5, 0.15); // Adjust center so base stands on ground
            shipSprite.position.set(ship.tileX, ship.elevation, ship.tileZ);
            shipSprite.scale.set(ship.scale, ship.scale, 1);
            shipSprite.renderOrder = 4;
            this.scene.add(shipSprite);

            // 3. Console Placement
            const consoleX = ship.tileX + ship.consoleOffset.x;
            const consoleZ = ship.tileZ + ship.consoleOffset.z;

            // Console Shadow
            const consoleShadowGeo = new THREE.CircleGeometry(0.42, 32);
            const consoleShadow = new THREE.Mesh(consoleShadowGeo, consoleShadowMat);
            consoleShadow.rotation.x = -Math.PI / 2;
            consoleShadow.position.set(consoleX, 0.02, consoleZ);
            this.scene.add(consoleShadow);

            // Console Sprite
            const consoleSprite = new THREE.Sprite(consoleMat);
            consoleSprite.center.set(0.5, 0.1);
            consoleSprite.position.set(consoleX, 0.1, consoleZ);
            consoleSprite.scale.set(1.0, 1.0, 1);
            consoleSprite.renderOrder = 4;
            this.scene.add(consoleSprite);

            // O2 generator module near each crashed ship
            const moduleX = ship.tileX + ship.o2ModuleOffset.x;
            const moduleZ = ship.tileZ + ship.o2ModuleOffset.z;
            ship.o2ModuleX = moduleX;
            ship.o2ModuleZ = moduleZ;

            const moduleShadowGeo = new THREE.CircleGeometry(0.48, 32);
            const moduleShadow = new THREE.Mesh(moduleShadowGeo, consoleShadowMat);
            moduleShadow.rotation.x = -Math.PI / 2;
            moduleShadow.position.set(moduleX, 0.021, moduleZ);
            this.scene.add(moduleShadow);
            ship.o2ModuleShadow = moduleShadow;

            const moduleSprite = new THREE.Sprite(o2ModuleMat);
            moduleSprite.center.set(0.5, 0.08);
            moduleSprite.position.set(moduleX, 0.09, moduleZ);
            moduleSprite.scale.set(1.58, 1.58, 1);
            moduleSprite.renderOrder = 4;
            this.scene.add(moduleSprite);
            ship.o2ModuleSprite = moduleSprite;

            // 4. Interactive Console Neon Glowing Ring (Pulsing Indicator)
            const ringGeo = new THREE.RingGeometry(0.38, 0.44, 32);
            const ringMat = new THREE.MeshBasicMaterial({
                color: ship.color,
                transparent: true,
                opacity: 0.85,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            const ringMesh = new THREE.Mesh(ringGeo, ringMat);
            ringMesh.rotation.x = -Math.PI / 2;
            ringMesh.position.set(consoleX, 0.03, consoleZ);
            this.scene.add(ringMesh);
            ship.consoleRing = ringMesh;

            // 5. Light source for terminal screen (wow factor!)
            const terminalLight = new THREE.PointLight(ship.color, 1.8, 2.8, 2);
            terminalLight.position.set(consoleX, 0.5, consoleZ);
            this.scene.add(terminalLight);

            // Store all 3D objects associated with this base so we can toggle visibility
            ship.threeObjects = [shadow, shipSprite, consoleShadow, consoleSprite, moduleShadow, moduleSprite, ringMesh, terminalLight];
        }

        this.updateCrashedShipsVisibility(false);
    }

    setupPlayer() {
        this.player = new THREE.Group();

        this.playerMesh = new THREE.Mesh(
            new THREE.SphereGeometry(this.playerRadius, 20, 20),
            this.playerMaterial
        );
        this.playerMesh.position.y = this.playerRadius + 0.02;
        // Keep the collision sphere invisible and prevent a second large shadow under the player.
        this.playerMesh.castShadow = false;
        this.player.add(this.playerMesh);

        this.playerShadow = new THREE.Mesh(
            new THREE.CircleGeometry(0.42, 20),
            new THREE.MeshBasicMaterial({
                color: 0x000000,
                transparent: true,
                opacity: 0.24,
                depthWrite: false
            })
        );
        this.playerShadow.rotation.x = -Math.PI / 2;
        this.playerShadow.position.set(this.playerSpriteLead, 0.035, this.playerSpriteLead);
        this.playerShadow.scale.set(1, 1, 0.7);
        this.player.add(this.playerShadow);

        this.playerSprite = new THREE.Sprite(this.playerMaterials[this.playerType] ?? this.playerMaterials.SCOUT);
        this.playerSprite.center.set(0.5, 0);
        this.playerSprite.position.x = this.playerSpriteLead;
        this.playerSprite.position.y = this.playerHeight;
        this.playerSprite.position.z = this.playerSpriteLead;
        this.playerSprite.scale.set(this.playerSpriteScale, this.playerSpriteScale, 1);
        this.playerSprite.renderOrder = 5;
        this.player.add(this.playerSprite);

        this.playerMarker = this.createHiddenPlayerMarker();
        this.playerMarker.visible = false;
        this.scene.add(this.playerMarker);

        this.syncPersistentUpgrades();
        this.resetVitalsForRun({ emit: false });

        const spawn = this.getSpawnTile();
        this.player.position.set(spawn.x, 0, spawn.y);
        this.scene.add(this.player);
        this.playerGlow.position.set(spawn.x, 1.6, spawn.y);
        this.playerMarker.position.set(spawn.x, this.playerMarkerHeight, spawn.y);
        this.updatePlayerSpriteFrame(0, this.currentFacingRow);
        this.ensureO2BubbleVisualState();
        this.emitVitalsState();
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
            color: 0xff9f1c,
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
                color: 0xff9f1c,
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
        this.handleKeyDown = (event) => {
            if (!this.inputEnabled) return;
            if (event.code === 'KeyE') {
                this.interactWithConsole();
            }
            this.setKeyState(event.code, true);
        };
        this.handleKeyUp = (event) => this.setKeyState(event.code, false);
        this.handlePromptTap = (event) => {
            event.preventDefault();
            this.interactWithConsole();
        };
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        this.consolePromptEl = document.getElementById('console-hud-prompt');
        this.consolePromptEl?.addEventListener('pointerup', this.handlePromptTap);
    }

    setKeyState(code, pressed) {
        if (!this.inputEnabled && pressed) return;
        if (code === 'ArrowUp' || code === 'KeyW') this.keys.up = pressed;
        if (code === 'ArrowDown' || code === 'KeyS') this.keys.down = pressed;
        if (code === 'ArrowLeft' || code === 'KeyA') this.keys.left = pressed;
        if (code === 'ArrowRight' || code === 'KeyD') this.keys.right = pressed;
    }

    setVirtualInput(x = 0, z = 0) {
        if (!this.inputEnabled) {
            this.virtualInput.x = 0;
            this.virtualInput.z = 0;
            return;
        }
        this.virtualInput.x = THREE.MathUtils.clamp(x, -1, 1);
        this.virtualInput.z = THREE.MathUtils.clamp(z, -1, 1);
    }

    setInputEnabled(enabled = true) {
        this.inputEnabled = Boolean(enabled);

        if (this.inputEnabled) {
            return;
        }

        this.keys.up = false;
        this.keys.down = false;
        this.keys.left = false;
        this.keys.right = false;
        this.virtualInput.x = 0;
        this.virtualInput.z = 0;
        this.isMoving = false;

        this.activeInteractiveConsole = null;
        const promptEl = document.getElementById('console-hud-prompt');
        if (promptEl) {
            promptEl.classList.add('hidden');
            promptEl.classList.remove('visible');
        }

        const modal = document.getElementById('console-terminal-modal');
        if (modal && !modal.classList.contains('hidden')) {
            modal.classList.add('hidden');
        }
    }

    getPlayerPosition() {
        if (!this.player) return null;
        return {
            x: this.player.position.x,
            z: this.player.position.z
        };
    }

    isPlayerMoving() {
        return Boolean(this.isMoving);
    }

    getActiveShipInfo() {
        const activeShip = this.crashedShips?.find((ship) => ship.type === this.playerType);
        if (!activeShip) return null;

        const consoleX = activeShip.tileX + activeShip.consoleOffset.x;
        const consoleZ = activeShip.tileZ + activeShip.consoleOffset.z;

        return {
            type: activeShip.type,
            color: activeShip.color,
            tileX: activeShip.tileX,
            tileZ: activeShip.tileZ,
            elevation: activeShip.elevation,
            consoleX,
            consoleZ
        };
    }

    getActiveConsoleDistance() {
        if (!this.player) return Infinity;
        const activeShip = this.crashedShips?.find((ship) => ship.type === this.playerType);
        if (!activeShip) return Infinity;

        const consoleX = activeShip.tileX + activeShip.consoleOffset.x;
        const consoleZ = activeShip.tileZ + activeShip.consoleOffset.z;
        const dx = this.player.position.x - consoleX;
        const dz = this.player.position.z - consoleZ;
        return Math.hypot(dx, dz);
    }

    getWorldScreenPoint(worldX, worldY = 0.1, worldZ) {
        if (!this.camera || !this.renderer?.domElement) return null;
        if (!Number.isFinite(worldX) || !Number.isFinite(worldY) || !Number.isFinite(worldZ)) return null;

        const point = new THREE.Vector3(worldX, worldY, worldZ).project(this.camera);
        const canvas = this.renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        const canvasX = (point.x * 0.5 + 0.5) * rect.width;
        const canvasY = (-point.y * 0.5 + 0.5) * rect.height;

        return {
            x: canvasX,
            y: canvasY,
            viewportX: rect.left + canvasX,
            viewportY: rect.top + canvasY
        };
    }

    getSpawnCompassState() {
        if (!this.player) return null;

        const activeShip = this.crashedShips?.find(ship => ship.type === this.playerType);
        let targetX, targetZ;
        if (activeShip) {
            targetX = activeShip.tileX + activeShip.consoleOffset.x;
            targetZ = activeShip.tileZ + activeShip.consoleOffset.z;
        } else {
            const spawn = this.getSpawnTile();
            targetX = spawn.x;
            targetZ = spawn.y;
        }

        const toTargetX = targetX - this.player.position.x;
        const toTargetZ = targetZ - this.player.position.z;
        let distance = Math.hypot(toTargetX, toTargetZ);

        if (activeShip) {
            // Subtract the console collision threshold so that distance reads 0 when standing right next to it
            const collisionRadius = 0.42 + this.playerRadius * 0.7;
            distance = Math.max(0, distance - collisionRadius);
        }

        const screenX = (toTargetX * this.cameraPlanarRight.x) + (toTargetZ * this.cameraPlanarRight.y);
        const screenY = (toTargetX * this.cameraPlanarForward.x) + (toTargetZ * this.cameraPlanarForward.y);
        const angle = distance > 0.0001
            ? THREE.MathUtils.radToDeg(Math.atan2(screenX, screenY))
            : 0;

        return {
            angle,
            distance,
            radar: this.getRadarCompassState()
        };
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

        this.updateCrashedShipsVisibility(true);
        this.ensureO2BubbleVisualState();
        this.emitVitalsState();
    }

    updateCrashedShipsVisibility(poof = false) {
        if (!this.crashedShips) return;

        for (const ship of this.crashedShips) {
            const shouldBeVisible = ship.type === this.playerType;

            // Trigger visual 3D smoke poof if it just became visible
            if (shouldBeVisible && !ship.isVisible && poof) {
                this.spawnShipPoofEffect(ship.tileX, ship.tileZ, ship.color);
            }

            ship.isVisible = shouldBeVisible;

            if (ship.threeObjects) {
                for (const obj of ship.threeObjects) {
                    obj.visible = shouldBeVisible;
                }
            }
        }
    }

    spawnShipPoofEffect(x, z, colorHex) {
        const color = new THREE.Color(colorHex);
        const effect = new THREE.Group();
        const smokeMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.38,
            depthWrite: false,
            depthTest: false
        });

        // Spawn 22 glowing smoke spheres expanding and rising!
        for (let i = 0; i < 22; i++) {
            const size = 0.4 + Math.random() * 0.72;
            const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 8), smokeMaterial);
            
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 0.9;
            mesh.position.set(
                x + Math.cos(angle) * radius,
                0.2 + Math.random() * 1.3,
                z + Math.sin(angle) * radius
            );
            
            mesh.userData = {
                vx: (Math.random() - 0.5) * 1.6,
                vy: 1.0 + Math.random() * 1.4,
                vz: (Math.random() - 0.5) * 1.6,
                life: 1.0,
                decay: 0.75 + Math.random() * 0.5
            };
            effect.add(mesh);
        }

        this.scene.add(effect);
        this.transientEffects.push(effect);
    }

    refreshActivePlayerSprite(type) {
        if (!this.playerSprite || this.playerType !== type) {
            return;
        }

        this.playerSprite.material = this.playerMaterials[type] ?? this.playerMaterials.SCOUT;
        this.playerSprite.material.needsUpdate = true;
        this.updatePlayerSpriteFrame(0, this.currentFacingRow);
    }

    createPlayerSpriteTexture(type, path, _textureLoader) {
        const texture = new THREE.Texture();
        texture.colorSpace = THREE.SRGBColorSpace;

        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0);

            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;

            // Remove chroma green border/background pixels
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const a = data[i + 3];
                if (a > 0) {
                    if (r < 140 && b < 140 && g > 90 && g > r * 1.4 && g > b * 1.4) {
                        data[i + 3] = 0; // Make transparent
                    }
                }
            }

            ctx.putImageData(imgData, 0, 0);

            texture.image = canvas;
            texture.needsUpdate = true;

            this.playerMaterials?.[type] && (this.playerMaterials[type].needsUpdate = true);
            this.refreshActivePlayerSprite(type);
            console.info(`[ThreeGame] Loaded and green-keyed player sprite ${type} from ${path} (${image.width}x${image.height})`);
        };

        image.onerror = (error) => {
            console.warn(`[ThreeGame] Failed to load player sprite ${type} from ${path}`, error);
        };

        image.src = path;

        return texture;
    }

    loadScatterTexture(path, textureLoader) {
        return textureLoader.load(path, (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.wrapS = THREE.ClampToEdgeWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;

            const maxAnisotropy = this.renderer?.capabilities?.getMaxAnisotropy?.() ?? 1;
            if (maxAnisotropy > 1) {
                texture.anisotropy = Math.min(4, maxAnisotropy);
            }
        }, undefined, (error) => {
            console.warn(`[ThreeGame] Failed to load scatter texture from ${path}`, error);
        });
    }

    loadKeyedSpriteTexture(path, threshold = 15, onLoad = null, options = {}) {
        const texture = new THREE.Texture();
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;

        const image = new Image();
        image.onload = () => {
            const cropBottomRatioRaw = Number(options?.cropBottomRatio);
            const cropBottomRatio = Number.isFinite(cropBottomRatioRaw)
                ? THREE.MathUtils.clamp(cropBottomRatioRaw, 0, 0.9)
                : 0;
            const sourceHeight = Math.max(1, Math.floor(image.height * (1 - cropBottomRatio)));

            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = sourceHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(
                image,
                0,
                0,
                image.width,
                sourceHeight,
                0,
                0,
                image.width,
                sourceHeight
            );

            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;

            // Remove flat black background nicely using threshold for dark pixels
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                if (r <= threshold && g <= threshold && b <= threshold) {
                    data[i + 3] = 0; // Make transparent
                }
            }

            ctx.putImageData(imgData, 0, 0);
            
            texture.image = canvas;
            texture.needsUpdate = true;
            if (onLoad) {
                onLoad(texture);
            }
        };

        image.onerror = (err) => {
            console.error(`[ThreeGame] loadKeyedSpriteTexture: Failed to load image: ${path}`, err);
        };

        image.src = path;

        return texture;
    }

    loadDecalTexture(path) {
        const texture = new THREE.Texture();
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;

        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0);

            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;
            let minX = image.width;
            let minY = image.height;
            let maxX = 0;
            let maxY = 0;
            let foundVisible = false;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const maxChannel = Math.max(r, g, b);
                const pixelIndex = i / 4;
                const x = pixelIndex % image.width;
                const y = Math.floor(pixelIndex / image.width);
                let alpha = 0;

                if (maxChannel > 6) {
                    alpha = Math.min(255, Math.max(0, ((maxChannel - 6) / 40) * 255));
                }

                data[i + 3] = Math.max(data[i + 3], alpha);

                if (data[i + 3] > 10) {
                    foundVisible = true;
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }

            if (!foundVisible) {
                ctx.putImageData(imgData, 0, 0);
                texture.image = canvas;
                texture.needsUpdate = true;
                return;
            }

            const padding = 12;
            const cropX = Math.max(0, minX - padding);
            const cropY = Math.max(0, minY - padding);
            const cropWidth = Math.min(image.width - cropX, (maxX - minX + 1) + padding * 2);
            const cropHeight = Math.min(image.height - cropY, (maxY - minY + 1) + padding * 2);
            const croppedCanvas = document.createElement('canvas');
            croppedCanvas.width = cropWidth;
            croppedCanvas.height = cropHeight;
            const croppedCtx = croppedCanvas.getContext('2d');

            ctx.putImageData(imgData, 0, 0);
            croppedCtx.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
            
            texture.image = croppedCanvas;
            texture.needsUpdate = true;
        };

        image.onerror = (err) => {
            console.error(`[ThreeGame] loadDecalTexture: Failed to load image: ${path}`, err);
        };

        image.src = path;

        return texture;
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
        this.updatePickups(delta, now);
        this.updateScatter(delta, now);
        this.updateTransientEffects(delta, now);
        this.updateHiddenPlayerMarker(now);
        this.updateConsoles(delta, now);
        this.updateVitals(delta);
        this.renderer.render(this.scene, this.camera);
    }

    updateConsoles(delta, now) {
        if (!this.crashedShips || !this.player) return;

        const hudActive = !document.getElementById('ui')?.classList.contains('hidden');
        if (!this.inputEnabled || !hudActive) {
            this.activeInteractiveConsole = null;
            const promptEl = document.getElementById('console-hud-prompt');
            if (promptEl) {
                promptEl.classList.add('hidden');
                promptEl.classList.remove('visible');
            }
            return;
        }

        let nearestConsole = null;
        let minDistance = Infinity;

        for (const ship of this.crashedShips) {
            if (!ship.isVisible) continue;
            // Animate pulsing neon floor rings
            if (ship.consoleRing) {
                const pulse = 0.65 + Math.sin(now * 0.006) * 0.25;
                ship.consoleRing.material.opacity = pulse;
                const scalePulse = 0.95 + Math.sin(now * 0.006) * 0.05;
                ship.consoleRing.scale.set(scalePulse, scalePulse, 1.0);
            }

            const consoleX = ship.tileX + ship.consoleOffset.x;
            const consoleZ = ship.tileZ + ship.consoleOffset.z;
            const dx = this.player.position.x - consoleX;
            const dz = this.player.position.z - consoleZ;
            const distance = Math.hypot(dx, dz);

            if (distance < 2.05 && distance < minDistance) {
                nearestConsole = ship;
                minDistance = distance;
            }
        }

        // Show/hide floating HUD prompt
        const promptEl = document.getElementById('console-hud-prompt');
        if (nearestConsole) {
            this.activeInteractiveConsole = nearestConsole;
            if (promptEl) {
                const actionText = promptEl.querySelector('.prompt-text');
                const promptKey = promptEl.querySelector('.prompt-key');
                const touchMoveControl = document.getElementById('touch-move-control');
                const touchMoveVisible = touchMoveControl && !touchMoveControl.classList.contains('hidden');
                const shouldUseTapLabel = Boolean(touchMoveVisible);
                if (actionText) {
                    actionText.textContent = `${shouldUseTapLabel ? 'TAP TO ACCESS' : 'PRESS E TO ACCESS'} ${nearestConsole.type} BASE SHOP`;
                }
                if (promptKey) {
                    promptKey.textContent = shouldUseTapLabel ? 'TAP' : 'E';
                    promptKey.classList.toggle('prompt-key--tap', shouldUseTapLabel);
                }
                promptEl.classList.add('visible');
                promptEl.classList.remove('hidden');
            }
        } else {
            this.activeInteractiveConsole = null;
            if (promptEl) {
                promptEl.classList.add('hidden');
                promptEl.classList.remove('visible');
            }

            // Automagically close terminal window if the player walks too far away
            const modal = document.getElementById('console-terminal-modal');
            if (modal && !modal.classList.contains('hidden')) {
                this.closeConsoleModal();
            }
        }
    }

    interactWithConsole() {
        if (!this.activeInteractiveConsole) return;
        this.openConsoleModal(this.activeInteractiveConsole);
    }

    getSessionInventory() {
        const snapshot = window.getPickupCounterState?.();
        if (!snapshot || typeof snapshot !== 'object') {
            return { health: 0, ammo: 0, weapon: 0, coin: 0, total: 0 };
        }

        const health = Number.isFinite(snapshot.health) ? Math.max(0, Math.floor(snapshot.health)) : 0;
        const ammo = Number.isFinite(snapshot.ammo) ? Math.max(0, Math.floor(snapshot.ammo)) : 0;
        const weapon = Number.isFinite(snapshot.weapon) ? Math.max(0, Math.floor(snapshot.weapon)) : 0;
        const coin = Number.isFinite(snapshot.coin) ? Math.max(0, Math.floor(snapshot.coin)) : 0;

        return {
            health,
            ammo,
            weapon,
            coin,
            total: health + ammo + weapon + coin
        };
    }

    getO2GeneratorState(bankState = this.bank.getState()) {
        const level = Number.isFinite(bankState?.o2GeneratorLevel)
            ? Math.max(0, Math.floor(bankState.o2GeneratorLevel))
            : 0;
        const currentUpgrade = O2_GENERATOR_UPGRADES.find((entry) => entry.level === level) ?? null;
        const nextUpgrade = O2_GENERATOR_UPGRADES.find((entry) => entry.level === level + 1) ?? null;

        return {
            level,
            isOnline: level > 0,
            maxed: !nextUpgrade,
            currentUpgrade,
            nextUpgrade,
            radius: currentUpgrade?.radius ?? 0,
            refillRate: currentUpgrade?.refillRate ?? 0
        };
    }

    formatResourceCost(cost = {}) {
        const rows = [];
        const med = Number.isFinite(cost.med) ? Math.max(0, Math.floor(cost.med)) : 0;
        const ammo = Number.isFinite(cost.ammo) ? Math.max(0, Math.floor(cost.ammo)) : 0;
        const tech = Number.isFinite(cost.tech) ? Math.max(0, Math.floor(cost.tech)) : 0;
        const coin = Number.isFinite(cost.coin) ? Math.max(0, Math.floor(cost.coin)) : 0;

        if (tech > 0) rows.push(`${tech} TECH`);
        if (med > 0) rows.push(`${med} MED`);
        if (ammo > 0) rows.push(`${ammo} AMMO`);
        if (coin > 0) rows.push(`${coin} COIN`);

        return rows.length > 0 ? rows.join(' / ') : 'NO COST';
    }

    getO2GeneratorButtonState(generatorState) {
        if (generatorState.maxed) {
            return {
                stateClass: 'btn-state--online',
                label: 'FIELD AT MAX RANGE',
                enabled: false
            };
        }

        if (!generatorState.nextUpgrade) {
            return {
                stateClass: 'btn-state--locked',
                label: 'NO UPGRADE PATH',
                enabled: false
            };
        }

        const affordable = this.bank.canAfford(generatorState.nextUpgrade.cost);
        if (!affordable) {
            return {
                stateClass: 'btn-state--insufficient',
                label: `NEED ${this.formatResourceCost(generatorState.nextUpgrade.cost)}`,
                enabled: false
            };
        }

        return {
            stateClass: 'btn-state--available',
            label: generatorState.level === 0 ? 'REPAIR GENERATOR' : 'UPGRADE FIELD RADIUS',
            enabled: true
        };
    }

    renderConsoleBanking(ship) {
        const inventory = this.getSessionInventory();
        const bankState = this.bank.getState();
        const generatorState = this.getO2GeneratorState(bankState);
        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = String(value);
        };

        setText('terminal-run-med', inventory.health);
        setText('terminal-run-ammo', inventory.ammo);
        setText('terminal-run-tech', inventory.weapon);
        setText('terminal-run-coin', inventory.coin);

        setText('terminal-bank-med', bankState.med);
        setText('terminal-bank-ammo', bankState.ammo);
        setText('terminal-bank-tech', bankState.tech);
        setText('terminal-bank-coin', bankState.coin);

        const hint = document.getElementById('terminal-bank-hint');
        if (hint) {
            if (inventory.total > 0) {
                hint.textContent = 'DEPOSIT READY. RESOURCE TRANSFER CHANNEL OPEN.';
            } else {
                hint.textContent = 'DEPOSIT RESOURCES TO FUND O₂ REPAIRS.';
            }
        }

        const statusEl = document.getElementById('terminal-o2-generator-status');
        if (statusEl) {
            statusEl.textContent = generatorState.isOnline
                ? `ONLINE // LVL ${generatorState.level}`
                : 'OFFLINE // REPAIR REQUIRED';
        }

        const costEl = document.getElementById('terminal-o2-generator-cost');
        if (costEl) {
            costEl.textContent = generatorState.nextUpgrade
                ? `NEXT COST: ${this.formatResourceCost(generatorState.nextUpgrade.cost)}`
                : 'NEXT COST: NONE';
        }

        const fieldEl = document.getElementById('terminal-o2-generator-field');
        if (fieldEl) {
            fieldEl.textContent = generatorState.isOnline
                ? `FIELD RADIUS ${generatorState.radius.toFixed(1)}u // REFILL ${generatorState.refillRate.toFixed(1)}%/s`
                : 'FIELD RADIUS 0.0u // REFILL OFFLINE';
        }

        const generatorHint = document.getElementById('terminal-o2-generator-hint');
        if (generatorHint) {
            if (generatorState.maxed) {
                generatorHint.textContent = 'O₂ GENERATOR OUTPUT IS MAXED FOR THIS EXOSUIT BAY.';
            } else if (!generatorState.isOnline) {
                generatorHint.textContent = 'REPAIR THIS MODULE TO CREATE A SAFE O₂ ZONE NEAR YOUR SHIP.';
            } else {
                generatorHint.textContent = 'UPGRADES EXPAND THE BLUE O₂ FIELD SO YOU CAN REFILL FROM FURTHER OUT.';
            }
        }

        const upgradeBtn = document.getElementById(O2_GENERATOR_BUTTON_ID);
        if (upgradeBtn) {
            const buttonState = this.getO2GeneratorButtonState(generatorState);
            upgradeBtn.textContent = buttonState.label;
            upgradeBtn.disabled = !buttonState.enabled;
            upgradeBtn.classList.remove('btn-state--online', 'btn-state--locked', 'btn-state--insufficient', 'btn-state--available');
            upgradeBtn.classList.add(buttonState.stateClass);
        }

        const ticker = document.getElementById('terminal-status-ticker');
        if (ticker) {
            if (this.isPlayerDead) {
                ticker.textContent = 'WARNING: EXOSUIT LIFE SUPPORT FAILURE DETECTED.';
            } else if (this.playerVitals.o2 <= O2_DANGER_THRESHOLD) {
                ticker.textContent = 'WARNING: O₂ LEVELS CRITICAL. RETURN TO SHIP IMMEDIATELY.';
            } else if (!generatorState.isOnline) {
                ticker.textContent = 'ALERT: O₂ GENERATOR OFFLINE. REPAIR IS STRONGLY ADVISED.';
            } else if (!generatorState.maxed) {
                ticker.textContent = `O₂ FIELD ACTIVE [${generatorState.radius.toFixed(1)}u]. PAY TO EXPAND RANGE.`;
            } else if (ship) {
                ticker.textContent = `${ship.type} BASE LINK STABLE. O₂ FIELD OPERATING AT MAXIMUM RANGE.`;
            }
        }
    }

    handleDepositAll(ship) {
        const inventory = this.getSessionInventory();
        if (inventory.total <= 0) {
            window.AudioManager?.play('ui_error', { volume: 0.58 });
            this.renderConsoleBanking(ship);
            return;
        }

        this.bank.deposit(inventory);
        window.resetPickupCounter?.();
        window.AudioManager?.play('ui_click', { volume: 0.62 });
        this.renderConsoleBanking(ship);
    }

    attemptO2GeneratorUpgrade(ship) {
        const upgrade = this.bank.upgradeO2Generator();
        if (!upgrade) {
            window.AudioManager?.play('ui_error', { volume: 0.58 });
            this.renderConsoleBanking(ship);
            return;
        }

        this.syncPersistentUpgrades();
        this.ensureO2BubbleVisualState();
        this.emitO2State();
        window.dispatchEvent(new CustomEvent('o2-bubble-activated', {
            detail: {
                active: true,
                level: upgrade.level,
                radius: upgrade.radius
            }
        }));
        window.AudioManager?.play('class_lock', { volume: 0.55 });
        this.renderConsoleBanking(ship);
    }

    openConsoleModal(ship) {
        const modal = document.getElementById('console-terminal-modal');
        if (!modal) return;

        window.AudioManager?.play('ui_scan_ping', { volume: 0.6 });

        // Update class styling based on ship type
        const content = modal.querySelector('.console-terminal-content');
        if (content) {
            const glowColor = ship.type === 'SCOUT' ? '#7dff5a' : (ship.type === 'TANK' ? '#ffb700' : '#00e5ff');
            const glowRgb = ship.type === 'SCOUT' ? '125, 255, 90' : (ship.type === 'TANK' ? '255, 183, 0' : '0, 229, 255');
            content.style.setProperty('--terminal-glow', glowColor);
            content.style.setProperty('--terminal-glow-rgb', glowRgb);
        }

        // Update badge text
        const badge = document.getElementById('terminal-class-badge');
        if (badge) {
            const isActive = this.playerType === ship.type;
            badge.textContent = `${ship.type} BASE STATUS ${isActive ? '[ACTIVE EXOSUIT]' : '[STANDBY]'}`;
        }

        this.syncPersistentUpgrades();
        this.renderConsoleBanking(ship);

        const depositBtn = document.getElementById('terminal-deposit-all');
        if (depositBtn) {
            depositBtn.onclick = () => this.handleDepositAll(ship);
        }

        const o2UpgradeBtn = document.getElementById(O2_GENERATOR_BUTTON_ID);
        if (o2UpgradeBtn) {
            o2UpgradeBtn.onclick = () => this.attemptO2GeneratorUpgrade(ship);
        }

        // Hook up Close button
        const closeBtn = document.getElementById('close-console-terminal');
        if (closeBtn) {
            closeBtn.onclick = () => this.closeConsoleModal();
        }

        modal.classList.remove('hidden');
    }

    closeConsoleModal() {
        const modal = document.getElementById('console-terminal-modal');
        if (modal) {
            window.AudioManager?.play('ui_click', { volume: 0.5 });
            modal.classList.add('hidden');
        }
    }

    syncPersistentUpgrades() {
        this.unlocks = this.bank.getUnlocks();
        this.o2GeneratorLevel = this.bank.getO2GeneratorLevel();
        this.playerVitals.maxHp = this.unlocks.hullExpansion ? UPGRADED_HEARTS : BASE_HEARTS;
        this.playerVitals.hp = Math.min(this.playerVitals.hp, this.playerVitals.maxHp);
        this.ensureO2BubbleVisualState();
    }

    hasUpgrade(goalKey) {
        return Boolean(this.unlocks?.[goalKey]);
    }

    getActiveShip() {
        return this.crashedShips?.find((ship) => ship.type === this.playerType) ?? null;
    }

    getActiveO2GeneratorPosition() {
        const activeShip = this.getActiveShip();
        if (!activeShip) return null;

        const x = Number.isFinite(activeShip.o2ModuleX)
            ? activeShip.o2ModuleX
            : activeShip.tileX + (activeShip.o2ModuleOffset?.x ?? O2_MODULE_OFFSET.x);
        const z = Number.isFinite(activeShip.o2ModuleZ)
            ? activeShip.o2ModuleZ
            : activeShip.tileZ + (activeShip.o2ModuleOffset?.z ?? O2_MODULE_OFFSET.z);

        return { x, z };
    }

    getActiveO2GeneratorDistance() {
        if (!this.player) return Infinity;
        const generatorPos = this.getActiveO2GeneratorPosition();
        if (!generatorPos) return Infinity;

        const dx = this.player.position.x - generatorPos.x;
        const dz = this.player.position.z - generatorPos.z;
        return Math.hypot(dx, dz);
    }

    createO2BubbleObjects() {
        if (this.o2BubbleObjects) return;

        const light = new THREE.PointLight(0x8af1ff, 0.62, 6, 2);
        const ringInnerRadius = Math.max(0.2, O2_GENERATOR_RING_BASE_RADIUS - (O2_GENERATOR_RING_BAND_THICKNESS * 0.5));
        const ringOuterRadius = O2_GENERATOR_RING_BASE_RADIUS + (O2_GENERATOR_RING_BAND_THICKNESS * 0.5);
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(ringInnerRadius, ringOuterRadius, 72),
            new THREE.MeshBasicMaterial({
                color: 0x91f2ff,
                transparent: true,
                opacity: 0.24,
                side: THREE.DoubleSide,
                depthWrite: false
            })
        );

        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.035;
        ring.visible = false;
        light.visible = false;

        this.scene.add(light);
        this.scene.add(ring);

        this.o2BubbleObjects = { light, ring };
    }

    ensureO2BubbleVisualState() {
        this.createO2BubbleObjects();
        const generatorState = this.getO2GeneratorState();
        const generatorPos = this.getActiveO2GeneratorPosition();
        const enabled = generatorState.isOnline && Boolean(generatorPos);

        if (this.crashedShips) {
            for (const ship of this.crashedShips) {
                const isThisOnline = (ship.type === this.playerType) && generatorState.isOnline;
                if (ship.o2ModuleSprite) {
                    ship.o2ModuleSprite.visible = isThisOnline;
                }
                if (ship.o2ModuleShadow) {
                    ship.o2ModuleShadow.visible = isThisOnline;
                }
            }
        }

        if (!this.o2BubbleObjects) return;

        if (!enabled) {
            this.o2BubbleObjects.light.visible = false;
            this.o2BubbleObjects.ring.visible = false;
            return;
        }

        const ringScale = Math.max(0.01, generatorState.radius / O2_GENERATOR_RING_BASE_RADIUS);
        this.o2BubbleObjects.ring.scale.set(ringScale, ringScale, 1);
        this.o2BubbleObjects.light.position.set(generatorPos.x, 0.68, generatorPos.z);
        this.o2BubbleObjects.light.distance = Math.max(6, generatorState.radius * 2.15);
        this.o2BubbleObjects.ring.position.set(generatorPos.x, 0.035, generatorPos.z);
        this.o2BubbleObjects.light.visible = true;
        this.o2BubbleObjects.ring.visible = true;
    }

    resetVitalsForRun({ emit = true } = {}) {
        this.syncPersistentUpgrades();
        this.playerVitals.hp = this.playerVitals.maxHp;
        this.playerVitals.o2 = 100;
        this.playerVitals.o2HealthTimer = 0;
        this.isPlayerDead = false;
        this.o2DispatchTimer = 0;

        if (emit) {
            this.emitVitalsState();
        }
    }

    emitHealthState() {
        window.dispatchEvent(new CustomEvent('player-health-changed', {
            detail: {
                hp: this.playerVitals.hp,
                maxHp: this.playerVitals.maxHp
            }
        }));
    }

    emitO2State() {
        const generatorState = this.getO2GeneratorState();
        window.dispatchEvent(new CustomEvent('player-o2-changed', {
            detail: {
                o2: this.playerVitals.o2,
                bubbleActive: generatorState.isOnline
            }
        }));
    }

    emitVitalsState() {
        this.emitHealthState();
        this.emitO2State();
    }

    getPlayerVitals() {
        return {
            hp: this.playerVitals.hp,
            maxHp: this.playerVitals.maxHp,
            o2: this.playerVitals.o2
        };
    }

    getRadarCompassState() {
        if (!this.player || !this.hasUpgrade('radarNode')) {
            return { active: false, angle: 0, distance: 0 };
        }

        let nearest = null;
        let nearestDistance = Infinity;

        for (const pickup of this.pickupMeshes) {
            if (!pickup?.parent || pickup.userData?.collectedReported) continue;

            const dx = pickup.position.x - this.player.position.x;
            const dz = pickup.position.z - this.player.position.z;
            const distance = Math.hypot(dx, dz);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = { dx, dz, distance };
            }
        }

        if (!nearest) {
            return { active: false, angle: 0, distance: 0 };
        }

        const screenX = (nearest.dx * this.cameraPlanarRight.x) + (nearest.dz * this.cameraPlanarRight.y);
        const screenY = (nearest.dx * this.cameraPlanarForward.x) + (nearest.dz * this.cameraPlanarForward.y);
        const angle = nearest.distance > 0.0001
            ? THREE.MathUtils.radToDeg(Math.atan2(screenX, screenY))
            : 0;

        return {
            active: true,
            angle,
            distance: nearest.distance
        };
    }

    healPlayer(amount = 1) {
        if (this.isPlayerDead) return;
        const previousHp = this.playerVitals.hp;
        this.playerVitals.hp = Math.min(this.playerVitals.maxHp, this.playerVitals.hp + Math.max(0, amount));
        if (this.playerVitals.hp === previousHp) return;

        this.emitHealthState();
        window.dispatchEvent(new CustomEvent('health-restored', {
            detail: {
                amount: this.playerVitals.hp - previousHp,
                hp: this.playerVitals.hp,
                maxHp: this.playerVitals.maxHp
            }
        }));
    }

    takeDamage(amount = 1, reason = 'hazard') {
        if (this.isPlayerDead) return;
        const previousHp = this.playerVitals.hp;
        this.playerVitals.hp = Math.max(0, this.playerVitals.hp - Math.max(0, amount));
        if (this.playerVitals.hp === previousHp) return;

        this.emitHealthState();
        window.dispatchEvent(new CustomEvent('player-damaged', {
            detail: {
                amount: previousHp - this.playerVitals.hp,
                hp: this.playerVitals.hp,
                maxHp: this.playerVitals.maxHp,
                reason
            }
        }));

        if (this.playerVitals.hp <= 0) {
            this.handleDeath(reason);
        }
    }

    handleDeath(reason = 'hazard') {
        if (this.isPlayerDead) return;
        this.isPlayerDead = true;
        this.closeConsoleModal();
        window.dispatchEvent(new CustomEvent('player-death', {
            detail: { reason }
        }));
    }

    clearLoadedChunksForRunReset() {
        for (const group of this.chunkMeshes.values()) {
            group.traverse((child) => {
                if (child.userData?.isScatter) {
                    child.material?.dispose?.();
                    child.geometry?.dispose?.();
                }
                if (child.userData?.isPickup) {
                    child.userData.shadow?.material?.dispose?.();
                    child.userData.shadow?.geometry?.dispose?.();
                    child.userData.glow?.material?.dispose?.();
                    child.userData.glow?.geometry?.dispose?.();
                    child.userData.burst?.material?.dispose?.();
                    child.userData.burst?.geometry?.dispose?.();
                }
            });
            this.chunkGroups.remove(group);
        }

        this.chunkMeshes.clear();
        this.pendingChunkMounts = [];
        this.pendingChunkMountKeys.clear();
        this.wallMeshes = [];
        this.pickupMeshes = [];
        this.scatterSprites = [];
    }

    respawnPlayer({ resetRunState = true, skipEffects = false } = {}) {
        this.resetVitalsForRun({ emit: false });
        this.keys.up = false;
        this.keys.down = false;
        this.keys.left = false;
        this.keys.right = false;
        this.virtualInput.x = 0;
        this.virtualInput.z = 0;
        this.isMoving = false;

        const spawn = this.getSpawnTile();
        this.player.position.set(spawn.x, 0, spawn.y);
        this.playerGlow.position.set(spawn.x, 1.6, spawn.y);
        this.playerMarker.position.set(spawn.x, this.playerMarkerHeight, spawn.y);

        if (resetRunState) {
            window.resetPickupCounter?.();
            this.depletedGearPileKeys.clear();
            this.clearLoadedChunksForRunReset();
            this.syncVisibleChunks(true);
        }

        this.ensureO2BubbleVisualState();
        if (!skipEffects) {
            this.spawnShipPoofEffect(spawn.x, spawn.y, PLAYER_COLORS[this.playerType] ?? 0xffffff);
        }

        this.emitVitalsState();
        window.dispatchEvent(new CustomEvent('player-respawned', {
            detail: {
                hp: this.playerVitals.hp,
                maxHp: this.playerVitals.maxHp,
                o2: this.playerVitals.o2
            }
        }));
    }

    updateVitals(delta) {
        if (!this.player || this.isPlayerDead) return;

        const previousO2 = this.playerVitals.o2;
        const generatorState = this.getO2GeneratorState();
        const inBubble = generatorState.isOnline && this.getActiveO2GeneratorDistance() <= generatorState.radius;
        const reactorUpgrade = this.hasUpgrade('reactorCompressor');

        if (inBubble) {
            const refillRate = reactorUpgrade
                ? generatorState.refillRate * 1.2
                : generatorState.refillRate;
            this.playerVitals.o2 = Math.min(100, this.playerVitals.o2 + refillRate * delta);
            this.playerVitals.o2HealthTimer = 0;
        } else {
            let drainRate = O2_DRAIN_RATE_PCT_PER_SEC;
            if (this.playerVitals.o2 < O2_DANGER_THRESHOLD) {
                drainRate *= O2_DRAIN_RATE_DANGER_MULT;
            }
            if (reactorUpgrade) {
                drainRate *= 0.8;
            }
            this.playerVitals.o2 = Math.max(0, this.playerVitals.o2 - drainRate * delta);

            if (this.playerVitals.o2 <= 0) {
                this.playerVitals.o2HealthTimer += delta;
                while (this.playerVitals.o2HealthTimer >= O2_HEALTH_DRAIN_INTERVAL && !this.isPlayerDead) {
                    this.playerVitals.o2HealthTimer -= O2_HEALTH_DRAIN_INTERVAL;
                    this.takeDamage(1, 'o2-depletion');
                }
            } else {
                this.playerVitals.o2HealthTimer = 0;
            }
        }

        if (this.o2BubbleObjects?.ring?.visible) {
            const t = performance.now() * 0.001;
            const ringBaseScale = Math.max(0.01, generatorState.radius / O2_GENERATOR_RING_BASE_RADIUS);
            const pulse = ringBaseScale * (0.97 + Math.sin(t * 2.2) * 0.06);
            const opacity = 0.16 + Math.sin(t * 2.6) * 0.06;
            this.o2BubbleObjects.ring.scale.set(pulse, pulse, 1);
            this.o2BubbleObjects.ring.material.opacity = opacity;
            this.o2BubbleObjects.light.intensity = 0.5 + Math.sin(t * 2.4) * 0.1;
        }

        this.o2DispatchTimer += delta;
        if (Math.abs(this.playerVitals.o2 - previousO2) >= 0.05 || this.o2DispatchTimer >= 0.12) {
            this.emitO2State();
            const modal = document.getElementById('console-terminal-modal');
            if (modal && !modal.classList.contains('hidden') && this.activeInteractiveConsole) {
                this.renderConsoleBanking(this.activeInteractiveConsole);
            }
            this.o2DispatchTimer = 0;
        }
    }

    updatePlayer(delta) {
        if (this.isPlayerDead) {
            this.isMoving = false;
            return;
        }

        const keyAxisX = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
        const keyAxisZ = (this.keys.down ? 1 : 0) - (this.keys.up ? 1 : 0);
        const screenAxisX = THREE.MathUtils.clamp(keyAxisX + this.virtualInput.x, -1, 1);
        const screenAxisZ = THREE.MathUtils.clamp(keyAxisZ + this.virtualInput.z, -1, 1);
        const moveAxisX = (this.cameraPlanarRight.x * screenAxisX) + (this.cameraPlanarForward.x * -screenAxisZ);
        const moveAxisZ = (this.cameraPlanarRight.y * screenAxisX) + (this.cameraPlanarForward.y * -screenAxisZ);
        const isMoving = Boolean(moveAxisX || moveAxisZ);
        this.isMoving = isMoving;

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
        this.playerMarker.position.set(this.player.position.x, this.playerMarkerHeight, this.player.position.z);
    }

    updatePlayerSpriteAnimation(axisX, axisZ, delta, isMoving) {
        if (isMoving) {
            this.currentFacingRow = this.getFacingRow(axisX, axisZ);
            this.animationTimer += delta * SPRITE_ANIMATION_SPEED;
            const column = Math.floor(this.animationTimer) % SPRITE_GRID_SIZE;
            this.updatePlayerSpriteFrame(column, this.currentFacingRow);

            if (this.lastAnimationColumn === undefined) {
                this.lastAnimationColumn = -1;
            }
            if (column !== this.lastAnimationColumn) {
                this.lastAnimationColumn = column;
                if (column === 1 || column === 3) {
                    window.AudioManager?.playProceduralFootstep(this.playerType);
                }
            }
            return;
        }

        this.animationTimer = 0;
        this.lastAnimationColumn = -1;
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
        this.pickupMeshes = [];
        this.scatterSprites = [];

        for (let chunkY = centerChunkY - this.visibleChunkRadius; chunkY <= centerChunkY + this.visibleChunkRadius; chunkY++) {
            for (let chunkX = centerChunkX - this.visibleChunkRadius; chunkX <= centerChunkX + this.visibleChunkRadius; chunkX++) {
                const key = `${chunkX},${chunkY}`;
                needed.add(key);
                if (force || !this.chunkMeshes.has(key)) {
                    this.queueChunkMount(chunkX, chunkY, centerChunkX, centerChunkY);
                }
            }
        }

        this.pendingChunkMounts = this.pendingChunkMounts.filter((entry) => needed.has(entry.key));
        this.pendingChunkMountKeys = new Set(this.pendingChunkMounts.map((entry) => entry.key));

        this.processPendingChunkMounts(force ? 1 : this.maxChunkMountsPerFrame);

        for (const [key, group] of this.chunkMeshes.entries()) {
            if (needed.has(key)) continue;
            group.traverse((child) => {
                if (child.userData?.isScatter) {
                    child.material?.dispose?.();
                    child.geometry?.dispose?.();
                }
                if (child.userData?.isPickup) {
                    child.userData.shadow?.material?.dispose?.();
                    child.userData.shadow?.geometry?.dispose?.();
                    child.userData.glow?.material?.dispose?.();
                    child.userData.glow?.geometry?.dispose?.();
                    child.userData.burst?.material?.dispose?.();
                    child.userData.burst?.geometry?.dispose?.();
                }
            });
            this.chunkGroups.remove(group);
            this.chunkMeshes.delete(key);
            this.pendingChunkMountKeys.delete(key);
        }

        for (const group of this.chunkMeshes.values()) {
            for (const child of group.children) {
                if (child.userData.isWall) {
                    this.wallMeshes.push(child);
                }
                if (child.userData.isPickup) {
                    this.pickupMeshes.push(child);
                }
                if (child.userData.isScatter) {
                    this.scatterSprites.push(child);
                }
            }
        }
    }

    queueChunkMount(chunkX, chunkY, centerChunkX, centerChunkY) {
        const key = `${chunkX},${chunkY}`;
        if (this.chunkMeshes.has(key) || this.pendingChunkMountKeys.has(key)) {
            return;
        }

        this.pendingChunkMountKeys.add(key);
        this.pendingChunkMounts.push({
            key,
            chunkX,
            chunkY,
            priority: Math.abs(chunkX - centerChunkX) + Math.abs(chunkY - centerChunkY)
        });
        this.pendingChunkMounts.sort((a, b) => a.priority - b.priority);
    }

    processPendingChunkMounts(limit = 1) {
        let mounted = 0;
        while (mounted < limit && this.pendingChunkMounts.length > 0) {
            const next = this.pendingChunkMounts.shift();
            this.pendingChunkMountKeys.delete(next.key);
            if (this.chunkMeshes.has(next.key)) {
                continue;
            }

            this.mountChunk(next.chunkX, next.chunkY);
            mounted += 1;
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

        // Spawn visual scatter sprites using the Snail Swarm Scatter algorithm
        const scatterPlacements = this.createChunkScatterPlacements(chunkX, chunkY, grid);
        for (const placement of scatterPlacements) {
            if (placement.type.startsWith('bunker_junk') && this.depletedGearPileKeys.has(placement.scatterKey)) {
                continue;
            }
            const scatter = this.createScatterInstance(placement);
            if (scatter) {
                group.add(scatter);
            }
        }

        this.chunkGroups.add(group);
        this.chunkMeshes.set(`${chunkX},${chunkY}`, group);
    }

    createPickupAssets() {
        const healthMaterial = new THREE.MeshStandardMaterial({
            color: 0xff6f7d,
            emissive: 0x8f1c28,
            emissiveIntensity: 0.85,
            roughness: 0.28,
            metalness: 0.1
        });
        const ammoMaterial = new THREE.MeshStandardMaterial({
            color: 0x63d4ff,
            emissive: 0x0d4c72,
            emissiveIntensity: 0.75,
            roughness: 0.32,
            metalness: 0.5
        });
        const weaponMaterial = new THREE.MeshStandardMaterial({
            color: 0xffcc58,
            emissive: 0x72560a,
            emissiveIntensity: 0.72,
            roughness: 0.3,
            metalness: 0.58
        });
        const coinMaterial = new THREE.MeshStandardMaterial({
            color: 0xffd86a,
            emissive: 0x7c5600,
            emissiveIntensity: 0.82,
            roughness: 0.22,
            metalness: 0.68
        });
        const shadowMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.16,
            depthWrite: false
        });

        return {
            health: {
                material: healthMaterial,
                accent: new THREE.MeshStandardMaterial({
                    color: 0xffd6db,
                    emissive: 0x4f0d16,
                    emissiveIntensity: 0.45,
                    roughness: 0.24,
                    metalness: 0.08
                })
            },
            ammo: {
                material: ammoMaterial,
                accent: new THREE.MeshStandardMaterial({
                    color: 0xc9f2ff,
                    emissive: 0x12435f,
                    emissiveIntensity: 0.36,
                    roughness: 0.18,
                    metalness: 0.2
                })
            },
            weapon: {
                material: weaponMaterial,
                accent: new THREE.MeshStandardMaterial({
                    color: 0xfff0b3,
                    emissive: 0x4f3908,
                    emissiveIntensity: 0.42,
                    roughness: 0.18,
                    metalness: 0.24
                })
            },
            coin: {
                material: coinMaterial,
                accent: new THREE.MeshStandardMaterial({
                    color: 0xfff2b0,
                    emissive: 0x5b4308,
                    emissiveIntensity: 0.42,
                    roughness: 0.16,
                    metalness: 0.32
                })
            },
            shadowMaterial
        };
    }

    createChunkPickupPlacements(chunkX, chunkY, grid) {
        const random = this.createSeededRandom(this.hashTile(chunkX * 401 + 17, chunkY * 733 + 29));
        const spawn = this.getSpawnTile();
        const candidates = [];

        for (let localY = 0; localY < this.chunkSize; localY++) {
            for (let localX = 0; localX < this.chunkSize; localX++) {
                if (grid[localY][localX] === '#') continue;

                const worldX = chunkX * this.chunkSize + localX;
                const worldZ = chunkY * this.chunkSize + localY;
                const dx = worldX - spawn.x;
                const dz = worldZ - spawn.y;
                const distToSpawn = Math.sqrt(dx * dx + dz * dz);

                if (distToSpawn <= 6.0) continue;

                candidates.push({
                    localX,
                    localY,
                    worldX,
                    worldZ,
                    edgeDistance: Math.min(localX, localY, this.chunkSize - 1 - localX, this.chunkSize - 1 - localY)
                });
            }
        }

        if (candidates.length < 10) {
            return [];
        }

        const occupied = new Set();
        const placements = [];
        const totalPlacements = Math.min(
            Math.max(5, Math.round(candidates.length * 0.08)),
            12
        );
        const clusterCount = Math.min(4, Math.max(2, Math.round(totalPlacements / 3.2)));
        const clusterTargets = [];

        for (let clusterIndex = 0; clusterIndex < clusterCount; clusterIndex++) {
            const center = this.selectClusterCenter(candidates, clusterTargets, random);
            if (!center) break;

            const clusterRadius = 1.3 + random() * 2.1;
            const clusterSize = Math.max(2, Math.round((totalPlacements / clusterCount) * (0.75 + random() * 0.6)));
            const subgroupCount = 1 + Math.floor(random() * 3);
            const subgroupAnchors = Array.from({ length: subgroupCount }, () => ({
                x: center.worldX + (random() - 0.5) * clusterRadius * 1.3,
                z: center.worldZ + (random() - 0.5) * clusterRadius * 1.3
            }));

            clusterTargets.push({ center, clusterRadius, clusterSize, subgroupAnchors });
        }

        const clusteredTarget = Math.round(totalPlacements * PICKUP_DISTRIBUTION.clustered);
        const transitionalTarget = Math.round(totalPlacements * PICKUP_DISTRIBUTION.transitional);
        const strayTarget = Math.max(1, totalPlacements - clusteredTarget - transitionalTarget);

        for (const cluster of clusterTargets) {
            while (placements.length < clusteredTarget && cluster.clusterSize > 0) {
                const subgroup = cluster.subgroupAnchors[Math.floor(random() * cluster.subgroupAnchors.length)];
                const point = this.selectPickupCandidateNear(candidates, occupied, subgroup, cluster.clusterRadius, random);
                if (!point) break;
                placements.push(this.buildPickupPlacement(point, random));
                cluster.clusterSize -= 1;
            }
        }

        let transitionsPlaced = 0;
        while (transitionsPlaced < transitionalTarget) {
            const sourceCluster = clusterTargets[Math.floor(random() * clusterTargets.length)];
            const point = this.selectTransitionCandidate(candidates, occupied, sourceCluster, random);
            if (!point) break;
            placements.push(this.buildPickupPlacement(point, random));
            transitionsPlaced += 1;
        }

        let straysPlaced = 0;
        while (straysPlaced < strayTarget) {
            const point = this.selectStrayCandidate(candidates, occupied, clusterTargets, random);
            if (!point) break;
            placements.push(this.buildPickupPlacement(point, random));
            straysPlaced += 1;
        }

        return placements;
    }

    selectClusterCenter(candidates, clusters, random) {
        let bestCandidate = null;
        let bestScore = -Infinity;

        for (const candidate of candidates) {
            if (candidate.edgeDistance < 1) continue;

            const nearestClusterDistance = clusters.length === 0
                ? this.chunkSize
                : Math.min(...clusters.map((cluster) => (
                    Math.hypot(
                        candidate.worldX - cluster.center.worldX,
                        candidate.worldZ - cluster.center.worldZ
                    )
                )));

            if (nearestClusterDistance < 3.1) continue;

            const score = candidate.edgeDistance * 1.5 + nearestClusterDistance * 0.65 + random() * 1.2;
            if (score > bestScore) {
                bestScore = score;
                bestCandidate = candidate;
            }
        }

        return bestCandidate;
    }

    selectPickupCandidateNear(candidates, occupied, anchor, radius, random) {
        const nearby = candidates
            .filter((candidate) => {
                const key = `${candidate.localX},${candidate.localY}`;
                if (occupied.has(key)) return false;
                const distance = Math.hypot(candidate.worldX - anchor.x, candidate.worldZ - anchor.z);
                return distance <= radius + random() * 0.7;
            })
            .sort((a, b) => {
                const distA = Math.hypot(a.worldX - anchor.x, a.worldZ - anchor.z);
                const distB = Math.hypot(b.worldX - anchor.x, b.worldZ - anchor.z);
                return (distA + random() * 0.45) - (distB + random() * 0.45);
            });

        const choice = nearby.find((candidate) => this.claimPickupTile(candidate, occupied));
        return choice ?? null;
    }

    selectTransitionCandidate(candidates, occupied, cluster, random) {
        if (!cluster) return null;

        const angle = random() * Math.PI * 2;
        const stretch = cluster.clusterRadius * (1.4 + random() * 1.7);
        const anchor = {
            x: cluster.center.worldX + Math.cos(angle) * stretch,
            z: cluster.center.worldZ + Math.sin(angle) * stretch
        };

        return this.selectPickupCandidateNear(candidates, occupied, anchor, 1.8 + random() * 1.3, random);
    }

    selectStrayCandidate(candidates, occupied, clusters, random) {
        const isolated = candidates
            .filter((candidate) => {
                const key = `${candidate.localX},${candidate.localY}`;
                if (occupied.has(key)) return false;
                return clusters.every((cluster) => {
                    const distance = Math.hypot(candidate.worldX - cluster.center.worldX, candidate.worldZ - cluster.center.worldZ);
                    return distance >= cluster.clusterRadius * 1.2;
                });
            })
            .sort((a, b) => (b.edgeDistance + random()) - (a.edgeDistance + random()));

        const choice = isolated.find((candidate) => this.claimPickupTile(candidate, occupied));
        return choice ?? null;
    }

    claimPickupTile(candidate, occupied) {
        const neighbors = [
            [0, 0],
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1]
        ];

        for (const [offsetX, offsetY] of neighbors) {
            if (occupied.has(`${candidate.localX + offsetX},${candidate.localY + offsetY}`)) {
                return false;
            }
        }

        occupied.add(`${candidate.localX},${candidate.localY}`);
        return true;
    }

    buildPickupPlacement(candidate, random) {
        const type = this.choosePickupType(random);
        const scale = type === 'weapon'
            ? 0.9 + random() * 0.3
            : 0.82 + random() * 0.24;

        return {
            ...candidate,
            type,
            scale,
            rotation: random() * Math.PI * 2,
            tiltX: (random() - 0.5) * 0.16,
            tiltZ: (random() - 0.5) * 0.16,
            elevation: 0.2 + random() * 0.18,
            offsetX: (random() - 0.5) * 0.28,
            offsetZ: (random() - 0.5) * 0.28,
            bobOffset: random() * Math.PI * 2,
            shadowRadius: (type === 'weapon' ? 0.34 : 0.28) + random() * 0.06
        };
    }

    createChunkScatterPlacements(chunkX, chunkY, grid) {
        const random = this.createSeededRandom(this.hashTile(chunkX * 523 + 43, chunkY * 859 + 71));
        const spawn = this.getSpawnTile();
        const candidates = [];

        // Find walkable candidates in this chunk
        for (let localY = 0; localY < this.chunkSize; localY++) {
            for (let localX = 0; localX < this.chunkSize; localX++) {
                if (grid[localY][localX] === '#') continue;

                const worldX = chunkX * this.chunkSize + localX;
                const worldZ = chunkY * this.chunkSize + localY;
                const dx = worldX - spawn.x;
                const dz = worldZ - spawn.y;
                const distToSpawn = Math.sqrt(dx * dx + dz * dz);

                // Keep away from player's starting spawn tile
                if (distToSpawn <= 6.0) continue;

                candidates.push({
                    localX,
                    localY,
                    worldX,
                    worldZ
                });
            }
        }

        if (candidates.length < 10) return [];

        const totalItems = Math.floor(6 + random() * 5);
        const targetClustered = Math.round(totalItems * SCATTER_CLUSTER_RATIO);
        const targetTransitional = Math.round(totalItems * SCATTER_TRANSITION_RATIO);
        const targetStrays = Math.max(
            1,
            Math.round(totalItems * SCATTER_STRAY_RATIO),
            totalItems - targetClustered - targetTransitional
        );

        const placements = [];

        // 1. Setup Macro Cluster Centers
        const numClusters = Math.min(3, Math.max(2, Math.round(totalItems / 6)));
        const clusters = [];
        for (let i = 0; i < numClusters; i++) {
            const center = this.selectScatterClusterCenter(candidates, clusters, random);
            if (!center) break;
            clusters.push({
                center,
                radius: 1.8 + random() * 1.6,
                weight: 0.5 + random() * 0.5
            });
        }

        // Helper to check if a continuous coordinate is walkable
        const isWalkable = (x, z) => {
            const localX = Math.round(x - chunkX * this.chunkSize);
            const localY = Math.round(z - chunkY * this.chunkSize);
            if (localX < 0 || localX >= this.chunkSize || localY < 0 || localY >= this.chunkSize) return false;
            return grid[localY][localX] !== '#';
        };

        // 2. Generate Clustered elements (70%)
        let clusteredPlaced = 0;
        let attempts = 0;
        while (clusteredPlaced < targetClustered && attempts < 120 && clusters.length > 0) {
            attempts++;
            const cluster = clusters[Math.floor(random() * clusters.length)];
            const angle = random() * Math.PI * 2;
            const dist = Math.pow(random(), 0.8) * cluster.radius;
            const x = cluster.center.worldX + Math.cos(angle) * dist;
            const z = cluster.center.worldZ + Math.sin(angle) * dist;

            if (isWalkable(x, z)) {
                placements.push({ x, z, groupType: 'clustered' });
                clusteredPlaced++;
            }
        }

        // 3. Generate Transitional elements (20%) - bridge between clusters
        let transitionalPlaced = 0;
        attempts = 0;
        while (transitionalPlaced < targetTransitional && attempts < 80 && clusters.length >= 2) {
            attempts++;
            const idxA = Math.floor(random() * clusters.length);
            let idxB = Math.floor(random() * clusters.length);
            if (idxA === idxB) idxB = (idxA + 1) % clusters.length;

            const cA = clusters[idxA].center;
            const cB = clusters[idxB].center;

            // Choose an interpolation point with some perpendicular jitter
            const t = 0.2 + random() * 0.6;
            const perpAngle = Math.atan2(cB.worldZ - cA.worldZ, cB.worldX - cA.worldX) + Math.PI / 2;
            const jitter = (random() - 0.5) * 1.9;

            const x = cA.worldX + (cB.worldX - cA.worldX) * t + Math.cos(perpAngle) * jitter;
            const z = cA.worldZ + (cB.worldZ - cA.worldZ) * t + Math.sin(perpAngle) * jitter;

            if (isWalkable(x, z)) {
                placements.push({ x, z, groupType: 'transitional' });
                transitionalPlaced++;
            }
        }

        // Fallback for transitional if there's only 1 cluster
        if (transitionalPlaced < targetTransitional && clusters.length === 1) {
            attempts = 0;
            while (transitionalPlaced < targetTransitional && attempts < 80) {
                attempts++;
                const cluster = clusters[0];
                const angle = random() * Math.PI * 2;
                // Place further out
                const dist = cluster.radius + 0.8 + random() * 2.4;
                const x = cluster.center.worldX + Math.cos(angle) * dist;
                const z = cluster.center.worldZ + Math.sin(angle) * dist;

                if (isWalkable(x, z)) {
                    placements.push({ x, z, groupType: 'transitional' });
                    transitionalPlaced++;
                }
            }
        }

        // 4. Generate Isolated Strays (10%) - far from clusters
        let straysPlaced = 0;
        attempts = 0;
        while (straysPlaced < targetStrays && attempts < 120) {
            attempts++;
            const candidate = candidates[Math.floor(random() * candidates.length)];
            const offsetAngle = random() * Math.PI * 2;
            const offsetDist = random() * 0.65;
            const x = candidate.worldX + Math.cos(offsetAngle) * offsetDist;
            const z = candidate.worldZ + Math.sin(offsetAngle) * offsetDist;

            // Check if far from all cluster centers
            const farFromClusters = clusters.every(c => {
                const dist = Math.hypot(x - c.center.worldX, z - c.center.worldZ);
                    return dist > c.radius * 1.8 + 1.8;
                });

            if (farFromClusters && isWalkable(x, z)) {
                placements.push({ x, z, groupType: 'stray' });
                straysPlaced++;
            }
        }

        // 5. Relaxation pass to push overlaps away (5 passes)
        const minDistance = SCATTER_MIN_SEPARATION;
        for (let pass = 0; pass < 5; pass++) {
            for (let i = 0; i < placements.length; i++) {
                for (let j = i + 1; j < placements.length; j++) {
                    const p1 = placements[i];
                    const p2 = placements[j];
                    const dx = p2.x - p1.x;
                    const dz = p2.z - p1.z;
                    const dist = Math.hypot(dx, dz);
                    if (dist < minDistance) {
                        const overlap = minDistance - dist;
                        const angle = dist > 0.001 ? Math.atan2(dz, dx) : random() * Math.PI * 2;
                        const pushX = Math.cos(angle) * overlap * 0.5;
                        const pushZ = Math.sin(angle) * overlap * 0.5;

                        // Push away if still walkable
                        if (isWalkable(p1.x - pushX, p1.z - pushZ)) {
                            p1.x -= pushX;
                            p1.z -= pushZ;
                        }
                        if (isWalkable(p2.x + pushX, p2.z + pushZ)) {
                            p2.x += pushX;
                            p2.z += pushZ;
                        }
                    }
                }
            }
        }

        // 6. Build the final micro-varied placement properties
        const finalPlacements = [];
        const junkPlacementAnchors = [];
        for (const p of placements) {
            // Re-verify after relaxation that it's still walkable
            if (!isWalkable(p.x, p.z)) continue;

            // Determine asset type based on weighted roll
            // no snails for now: gears on the floor, spores floating above
            const roll = random();
            let type;
            let scaleMultiplier;
            let elevation;
            let opacity;
            if (roll < 0.62) {
                type = this.chooseWeightedType(JUNK_SCATTER_VARIANTS, random);
                scaleMultiplier = 1.72 + random() * 0.34;
                // Keep junk piles visually grounded but high enough to avoid floor clipping artifacts.
                elevation = 0.13 + random() * 0.08;
                opacity = 1;
            } else {
                type = this.chooseWeightedType(SPORE_SCATTER_VARIANTS, random);
                scaleMultiplier = 0.42 + random() * 0.1;
                elevation = 1.45 + random() * 0.95;
                opacity = 0.58 + random() * 0.16;
            }

            // Prevent junk piles from spawning too close to each other.
            if (type.startsWith('bunker_junk')) {
                const tooCloseToOtherJunk = junkPlacementAnchors.some((anchor) => (
                    Math.hypot(p.x - anchor.x, p.z - anchor.z) < BUNKER_JUNK_MIN_SEPARATION
                ));

                if (tooCloseToOtherJunk) {
                    type = this.chooseWeightedType(SPORE_SCATTER_VARIANTS, random);
                    scaleMultiplier = 0.42 + random() * 0.1;
                    elevation = 1.45 + random() * 0.95;
                    opacity = 0.58 + random() * 0.16;
                } else {
                    junkPlacementAnchors.push({ x: p.x, z: p.z });
                }
            }

            // Micro-variations
            // Scale variation (+- 25%)
            const scale = scaleMultiplier * (0.75 + random() * 0.5);
            // Tilt distortion
            const tiltX = (random() - 0.5) * 0.16;
            const tiltZ = (random() - 0.5) * 0.16;
            // Subtle rotation (0 to 2pi)
            const rotation = random() * Math.PI * 2;

            finalPlacements.push({
                x: p.x,
                z: p.z,
                type,
                scatterKey: `${chunkX},${chunkY}:${finalPlacements.length}:${type}`,
                scale,
                rotation,
                tiltX,
                tiltZ,
                elevation,
                groupType: p.groupType,
                phase: random() * Math.PI * 2,
                opacity
            });
        }

        return finalPlacements;
    }

    createJunkBurstPickupPlacement(originX, originZ, targetX, targetZ, random, junkType = 'bunker_junk') {
        const rarity = this.chooseLootRarityForJunkType(junkType, random);
        const type = this.chooseJunkBurstPickupType(rarity, random);
        const scale = type === 'coin'
            ? 0.66 + random() * 0.14
            : 0.78 + random() * 0.18;

        return {
            worldX: targetX,
            worldZ: targetZ,
            type,
            rarity,
            scale,
            rotation: random() * Math.PI * 2,
            tiltX: (random() - 0.5) * 0.12,
            tiltZ: (random() - 0.5) * 0.12,
            elevation: 0.18 + random() * 0.08,
            offsetX: 0,
            offsetZ: 0,
            bobOffset: random() * Math.PI * 2,
            shadowRadius: (
                type === 'coin'
                    ? 0.18
                    : type === 'weapon'
                        ? 0.32
                        : 0.26
            ) + random() * 0.05,
            collectLock: 0.58,
            ejectStartX: originX,
            ejectStartZ: originZ,
            ejectTargetX: targetX,
            ejectTargetZ: targetZ
        };
    }

    createScatterInstance(placement) {
        const scaleX = placement.scale;
        const scaleY = placement.scale * (1.0 + placement.tiltX);

        if (placement.type.startsWith('bunker_junk')) {
            const spriteMaterial = this.scatterMaterials[placement.type];
            if (!spriteMaterial) return null;

            const clonedMat = spriteMaterial.clone();
            clonedMat.rotation = placement.rotation;
            clonedMat.alphaTest = 0.001;

            const sprite = new THREE.Sprite(clonedMat);
            sprite.center.set(0.5, 0);
            sprite.position.set(placement.x, placement.elevation, placement.z);
            sprite.scale.set(scaleX, scaleY, 1);
            sprite.frustumCulled = false;
            sprite.renderOrder = 4;
            sprite.userData = {
                isScatter: true,
                type: placement.type,
                scatterKey: placement.scatterKey,
                groupType: placement.groupType,
                baseY: placement.elevation,
                baseScaleX: scaleX,
                baseScaleY: scaleY,
                burstTriggered: false,
                burstTimer: 0,
                phase: placement.phase ?? 0,
                baseOpacity: placement.opacity ?? 1
            };
            return sprite;
        }

        const spriteMaterial = this.scatterMaterials[placement.type];
        if (!spriteMaterial) return null;

        const clonedMat = spriteMaterial.clone();
        clonedMat.rotation = placement.rotation;
        clonedMat.alphaTest = 0.001;

        const sprite = new THREE.Sprite(clonedMat);
        sprite.center.set(0.5, 0);
        sprite.position.set(placement.x, placement.elevation, placement.z);
        sprite.frustumCulled = false;
        sprite.renderOrder = 3;
        sprite.scale.set(scaleX, scaleY, 1);
        sprite.userData = {
            isScatter: true,
            type: placement.type,
            scatterKey: placement.scatterKey,
            groupType: placement.groupType,
            baseY: placement.elevation,
            baseScaleX: scaleX,
            baseScaleY: scaleY,
            burstTriggered: false,
            burstTimer: 0,
            phase: placement.phase ?? 0,
            baseOpacity: placement.opacity ?? 1
        };
        return sprite;
    }

    chooseWeightedType(variants, random) {
        const totalWeight = variants.reduce((sum, entry) => sum + entry.weight, 0);
        let roll = random() * totalWeight;

        for (const variant of variants) {
            roll -= variant.weight;
            if (roll <= 0) {
                return variant.type;
            }
        }

        return variants[variants.length - 1].type;
    }

    chooseLootRarity(random) {
        const totalWeight = LOOT_RARITIES.reduce((sum, entry) => sum + entry.weight, 0);
        let roll = random() * totalWeight;

        for (const rarity of LOOT_RARITIES) {
            roll -= rarity.weight;
            if (roll <= 0) {
                return rarity;
            }
        }

        return LOOT_RARITIES[0];
    }

    chooseLootRarityForJunkType(junkType, random) {
        const weightedBias = JUNK_LOOT_BIAS[junkType];
        if (!weightedBias) {
            return this.chooseLootRarity(random);
        }

        const totalWeight = weightedBias.reduce((sum, entry) => sum + entry.weight, 0);
        let roll = random() * totalWeight;

        for (const entry of weightedBias) {
            roll -= entry.weight;
            if (roll <= 0) {
                return LOOT_RARITIES.find((rarity) => rarity.key === entry.key) ?? LOOT_RARITIES[0];
            }
        }

        return LOOT_RARITIES[0];
    }

    chooseJunkBurstPickupType(rarity, random) {
        const rarityKey = rarity?.key ?? 'basic';
        const roll = random();

        if (rarityKey === 'legendary') {
            if (roll < 0.28) return 'coin';
            if (roll < 0.56) return 'weapon';
            if (roll < 0.79) return 'ammo';
            return 'health';
        }

        if (rarityKey === 'rare') {
            if (roll < 0.2) return 'coin';
            if (roll < 0.38) return 'weapon';
            if (roll < 0.72) return 'ammo';
            return 'health';
        }

        if (rarityKey === 'uncommon') {
            if (roll < 0.16) return 'coin';
            if (roll < 0.24) return 'weapon';
            if (roll < 0.58) return 'ammo';
            return 'health';
        }

        if (roll < 0.1) return 'coin';
        if (roll < 0.13) return 'weapon';
        if (roll < 0.52) return 'ammo';
        return 'health';
    }

    getJunkVariantEffectColors(junkType) {
        const variant = JUNK_SCATTER_VARIANTS.find((entry) => entry.type === junkType);
        return variant ?? JUNK_SCATTER_VARIANTS[0];
    }

    createJunkBurstTargets(originX, originZ, random) {
        const totalItems = BUNKER_JUNK_DROP_COUNT_MIN + Math.floor(random() * (BUNKER_JUNK_DROP_COUNT_MAX - BUNKER_JUNK_DROP_COUNT_MIN + 1));
        const clusteredTarget = Math.max(1, Math.round(totalItems * 0.7));
        const transitionalTarget = Math.max(0, Math.round(totalItems * 0.2));
        const strayTarget = Math.max(0, totalItems - clusteredTarget - transitionalTarget);
        const targets = [];
        const centerAngle = random() * Math.PI * 2;
        const centerRadius = 0.9 + random() * 0.35;
        const clusterCenter = {
            x: originX + Math.cos(centerAngle) * centerRadius,
            z: originZ + Math.sin(centerAngle) * centerRadius
        };

        for (let i = 0; i < clusteredTarget; i++) {
            const angle = random() * Math.PI * 2;
            const radius = 0.35 + random() * 0.65;
            targets.push({
                x: clusterCenter.x + Math.cos(angle) * radius,
                z: clusterCenter.z + Math.sin(angle) * radius
            });
        }

        for (let i = 0; i < transitionalTarget; i++) {
            const t = 0.35 + random() * 0.45;
            const jitterAngle = centerAngle + (random() - 0.5) * 1.3;
            const jitterRadius = (random() - 0.5) * 0.55;
            targets.push({
                x: originX + (clusterCenter.x - originX) * t + Math.cos(jitterAngle) * jitterRadius,
                z: originZ + (clusterCenter.z - originZ) * t + Math.sin(jitterAngle) * jitterRadius
            });
        }

        for (let i = 0; i < strayTarget; i++) {
            const angle = centerAngle + Math.PI + (random() - 0.5) * 1.8;
            const radius = 1.35 + random() * 0.75;
            targets.push({
                x: originX + Math.cos(angle) * radius,
                z: originZ + Math.sin(angle) * radius
            });
        }

        return targets;
    }

    selectScatterClusterCenter(candidates, clusters, random) {
        let bestCandidate = null;
        let bestScore = -Infinity;

        for (const candidate of candidates) {
            const nearestClusterDistance = clusters.length === 0
                ? this.chunkSize
                : Math.min(...clusters.map((cluster) => (
                    Math.hypot(
                        candidate.worldX - cluster.center.worldX,
                        candidate.worldZ - cluster.center.worldZ
                    )
                )));

            if (nearestClusterDistance < SCATTER_CLUSTER_CENTER_MIN_DISTANCE) {
                continue;
            }

            const edgeDistance = Math.min(
                candidate.localX,
                candidate.localY,
                this.chunkSize - 1 - candidate.localX,
                this.chunkSize - 1 - candidate.localY
            );
            const score = nearestClusterDistance * 0.8 + edgeDistance * 0.45 + random() * 0.8;

            if (score > bestScore) {
                bestScore = score;
                bestCandidate = candidate;
            }
        }

        return bestCandidate ?? candidates[Math.floor(random() * candidates.length)] ?? null;
    }

    choosePickupType(random) {
        const totalWeight = PICKUP_TYPES.reduce((sum, entry) => sum + entry.weight, 0);
        let roll = random() * totalWeight;

        for (const entry of PICKUP_TYPES) {
            roll -= entry.weight;
            if (roll <= 0) return entry.type;
        }

        return PICKUP_TYPES[PICKUP_TYPES.length - 1].type;
    }

    createPickupInstance(placement) {
        const root = new THREE.Group();
        const body = new THREE.Group();
        const burst = new THREE.Mesh(
            new THREE.RingGeometry(0.12, 0.24, 20),
            new THREE.MeshBasicMaterial({
                color: placement.type === 'health'
                    ? 0xffa4af
                    : placement.type === 'coin'
                        ? 0xffde8f
                    : placement.type === 'weapon'
                        ? 0xffdb78
                        : 0x8fe4ff,
                transparent: true,
                opacity: 0,
                side: THREE.DoubleSide,
                depthWrite: false
            })
        );
        root.userData = {
            isPickup: true,
            type: placement.type,
            state: placement.ejectStartX !== undefined ? 'ejecting' : 'idle',
            bobOffset: placement.bobOffset,
            baseY: placement.elevation,
            scale: placement.scale,
            rarity: placement.rarity ?? LOOT_RARITIES[0],
            burst,
            collectTimer: 0,
            collectLock: placement.collectLock ?? 0,
            ejectTimer: 0,
            ejectDuration: 0.24 + Math.random() * 0.1,
            ejectTargetX: placement.ejectTargetX ?? placement.worldX + placement.offsetX,
            ejectTargetZ: placement.ejectTargetZ ?? placement.worldZ + placement.offsetZ
        };

        if (placement.type === 'health') {
            body.add(this.createHealthPickupMesh());
        } else if (placement.type === 'coin') {
            body.add(this.createCoinPickupMesh());
        } else if (placement.type === 'weapon') {
            body.add(this.createWeaponPickupMesh());
        } else {
            body.add(this.createAmmoPickupMesh());
        }

        const shadow = new THREE.Mesh(
            new THREE.CircleGeometry(placement.shadowRadius, 18),
            this.pickupAssets.shadowMaterial.clone()
        );
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = -placement.elevation + 0.02;
        shadow.scale.setScalar(placement.scale * 1.1);
        body.add(shadow);

        body.rotation.y = placement.rotation;
        body.rotation.x = placement.tiltX;
        body.rotation.z = placement.tiltZ;
        body.scale.setScalar(placement.scale);
        const glow = new THREE.Mesh(
            new THREE.RingGeometry(0.16, 0.34, 20),
            new THREE.MeshBasicMaterial({
                color: root.userData.rarity.color,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide,
                depthWrite: false
            })
        );
        glow.rotation.x = -Math.PI / 2;
        glow.position.y = 0.03;
        body.add(glow);
        root.userData.body = body;
        root.userData.shadow = shadow;
        root.userData.glow = glow;

        burst.rotation.x = -Math.PI / 2;
        burst.position.y = 0.04;
        burst.scale.setScalar(0.2);
        body.add(burst);

        root.position.set(
            (placement.ejectStartX ?? placement.worldX) + placement.offsetX,
            placement.elevation,
            (placement.ejectStartZ ?? placement.worldZ) + placement.offsetZ
        );
        root.add(body);
        return root;
    }

    createHealthPickupMesh() {
        const group = new THREE.Group();
        const core = new THREE.Mesh(
            new THREE.BoxGeometry(0.54, 0.14, 0.18),
            this.pickupAssets.health.material
        );
        const cross = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.14, 0.54),
            this.pickupAssets.health.material
        );
        const halo = new THREE.Mesh(
            new THREE.TorusGeometry(0.28, 0.045, 10, 20),
            this.pickupAssets.health.accent
        );
        halo.rotation.x = Math.PI / 2;
        halo.position.y = 0.03;
        core.castShadow = true;
        cross.castShadow = true;
        group.add(core, cross, halo);
        return group;
    }

    createAmmoPickupMesh() {
        const group = new THREE.Group();
        const crate = new THREE.Mesh(
            new THREE.BoxGeometry(0.42, 0.22, 0.3),
            this.pickupAssets.ammo.material
        );
        const band = new THREE.Mesh(
            new THREE.BoxGeometry(0.48, 0.07, 0.08),
            this.pickupAssets.ammo.accent
        );
        band.position.y = 0.08;
        const shellLeft = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, 0.24, 10),
            this.pickupAssets.weapon.accent
        );
        const shellRight = shellLeft.clone();
        shellLeft.rotation.z = Math.PI / 2;
        shellRight.rotation.z = Math.PI / 2;
        shellLeft.position.set(-0.12, 0.18, 0);
        shellRight.position.set(0.12, 0.18, 0);
        crate.castShadow = true;
        band.castShadow = true;
        shellLeft.castShadow = true;
        shellRight.castShadow = true;
        group.add(crate, band, shellLeft, shellRight);
        return group;
    }

    createCoinPickupMesh() {
        const group = new THREE.Group();
        const coin = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.18, 0.08, 20),
            this.pickupAssets.coin.material
        );
        coin.rotation.x = Math.PI / 2;

        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.145, 0.022, 10, 20),
            this.pickupAssets.coin.accent
        );
        ring.position.z = 0.01;

        const ringBack = ring.clone();
        ringBack.position.z = -0.01;

        coin.castShadow = true;
        ring.castShadow = true;
        ringBack.castShadow = true;
        group.add(coin, ring, ringBack);
        return group;
    }

    createWeaponPickupMesh() {
        const group = new THREE.Group();
        const base = new THREE.Mesh(
            new THREE.BoxGeometry(0.56, 0.12, 0.18),
            this.pickupAssets.weapon.material
        );
        const barrel = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.08, 0.08),
            this.pickupAssets.weapon.accent
        );
        const stock = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, 0.14, 0.18),
            this.pickupAssets.weapon.material
        );
        barrel.position.set(0.28, 0.04, 0);
        stock.position.set(-0.18, -0.02, 0);
        base.castShadow = true;
        barrel.castShadow = true;
        stock.castShadow = true;
        group.add(base, barrel, stock);
        return group;
    }

    updatePickups(delta, now) {
        const time = now * 0.0012;
        const removals = [];

        for (const pickup of this.pickupMeshes) {
            const body = pickup.userData.body;
            if (!body) continue;

            const shadow = pickup.userData.shadow;
            const burst = pickup.userData.burst;
            const toPlayerX = this.player.position.x - pickup.position.x;
            const toPlayerZ = this.player.position.z - pickup.position.z;
            const planarDistance = Math.hypot(toPlayerX, toPlayerZ);
            const isCollecting = pickup.userData.state === 'collecting';
            pickup.userData.collectLock = Math.max(0, (pickup.userData.collectLock ?? 0) - delta);

            if (pickup.userData.state === 'ejecting') {
                pickup.userData.ejectTimer += delta;
                const t = Math.min(pickup.userData.ejectTimer / pickup.userData.ejectDuration, 1);
                const lift = Math.sin(t * Math.PI) * 0.58;
                const targetX = Number.isFinite(pickup.userData.ejectTargetX)
                    ? pickup.userData.ejectTargetX
                    : pickup.position.x;
                const targetZ = Number.isFinite(pickup.userData.ejectTargetZ)
                    ? pickup.userData.ejectTargetZ
                    : pickup.position.z;
                pickup.position.x = THREE.MathUtils.lerp(pickup.position.x, targetX, Math.min(delta * 18, 1));
                pickup.position.z = THREE.MathUtils.lerp(pickup.position.z, targetZ, Math.min(delta * 18, 1));
                pickup.position.y = pickup.userData.baseY + lift;
                body.rotation.y += 0.16;
                body.scale.setScalar(pickup.userData.scale * (0.9 + Math.sin(t * Math.PI) * 0.18));

                if (shadow) {
                    shadow.material.opacity = 0.12 + t * 0.05;
                }
                if (pickup.userData.glow) {
                    pickup.userData.glow.material.opacity = 0.85;
                    pickup.userData.glow.scale.setScalar(1 + Math.sin(t * Math.PI) * 0.55);
                }

                if (t >= 1) {
                    pickup.userData.state = 'idle';
                    pickup.position.x = targetX;
                    pickup.position.z = targetZ;
                    pickup.position.y = pickup.userData.baseY;
                }

                continue;
            }

            if (pickup.userData.collectLock > 0) {
                pickup.userData.state = pickup.userData.state === 'magnetized' ? 'idle' : pickup.userData.state;
            } else if (!isCollecting && planarDistance <= PICKUP_COLLECT_RADIUS) {
                pickup.userData.state = 'collecting';
                pickup.userData.collectTimer = 0;
            } else if (pickup.userData.state === 'idle' && planarDistance <= PICKUP_MAGNET_RADIUS) {
                pickup.userData.state = 'magnetized';
            } else if (pickup.userData.state === 'magnetized' && planarDistance > PICKUP_MAGNET_RADIUS * 1.35) {
                pickup.userData.state = 'idle';
            }

            if (pickup.userData.state === 'collecting') {
                pickup.userData.collectTimer += delta;
                const t = Math.min(pickup.userData.collectTimer / PICKUP_COLLECT_DURATION, 1);
                const burstT = Math.min(t / 0.45, 1);
                const targetY = this.playerRadius + 0.45;

                pickup.position.x += toPlayerX * Math.min(delta * 18, 1);
                pickup.position.z += toPlayerZ * Math.min(delta * 18, 1);
                pickup.position.y = THREE.MathUtils.lerp(pickup.position.y, targetY, Math.min(delta * 18, 1));

                const popScale = pickup.userData.scale * (1 + Math.sin(burstT * Math.PI) * 0.42) * (1 - t * 0.65);
                body.scale.setScalar(Math.max(popScale, 0.001));
                body.rotation.y += 0.14;

                if (shadow) {
                    shadow.scale.setScalar((1.1 + t * 0.5) * pickup.userData.scale);
                    shadow.material.opacity = 0.16 * (1 - t);
                }
                if (pickup.userData.glow) {
                    pickup.userData.glow.material.opacity = (1 - t) * 0.95;
                    pickup.userData.glow.scale.setScalar(1.15 + burstT * 0.85);
                }

                if (burst) {
                    burst.material.opacity = (1 - t) * 0.85;
                    burst.scale.setScalar(0.2 + burstT * 1.25);
                }

                if (t >= 1) {
                    if (!pickup.userData.collectedReported) {
                        pickup.userData.collectedReported = true;
                        const pickupType = pickup.userData.type ?? 'unknown';
                        const rarity = pickup.userData.rarity?.key ?? null;
                        if (pickupType === 'health' && this.playerVitals.hp < this.playerVitals.maxHp) {
                            this.healPlayer(1);
                            window.AudioManager?.playProceduralLoot('health', rarity);
                        } else {
                            window.dispatchEvent(new CustomEvent('pickup-collected', {
                                detail: {
                                    type: pickupType,
                                    rarity
                                }
                            }));
                        }
                    }
                    removals.push(pickup);
                }

                continue;
            }

            if (pickup.userData.state === 'magnetized' && planarDistance > 0.001) {
                const magnetStrength = 2.8 + (1 - Math.min(planarDistance / PICKUP_MAGNET_RADIUS, 1)) * 6.2;
                const moveStep = Math.min(delta * magnetStrength, planarDistance);
                pickup.position.x += (toPlayerX / planarDistance) * moveStep;
                pickup.position.z += (toPlayerZ / planarDistance) * moveStep;
                pickup.position.y = THREE.MathUtils.lerp(
                    pickup.position.y,
                    pickup.userData.baseY + 0.18,
                    Math.min(delta * 8, 1)
                );
            } else {
                const bob = Math.sin(time * 2.6 + pickup.userData.bobOffset) * 0.06;
                pickup.position.y = pickup.userData.baseY + bob;
            }

            body.scale.setScalar(pickup.userData.scale);
            const baseSpin = pickup.userData.rarity?.key === 'legendary' || pickup.userData.type === 'coin'
                ? 0.02
                : 0.006;
            body.rotation.y += pickup.userData.state === 'magnetized' ? Math.max(baseSpin, 0.03) : baseSpin;

            if (shadow) {
                shadow.material.opacity = 0.16;
                shadow.scale.setScalar(pickup.userData.scale * 1.1);
            }
            if (pickup.userData.glow) {
                const rarityPulse = 0.78 + Math.sin(time * 3.1 + pickup.userData.bobOffset) * 0.12;
                pickup.userData.glow.material.opacity = rarityPulse;
                pickup.userData.glow.scale.setScalar(1 + Math.sin(time * 2.3 + pickup.userData.bobOffset) * 0.08);
            }

            if (burst) {
                burst.material.opacity = 0;
                burst.scale.setScalar(0.2);
            }
        }

        for (const pickup of removals) {
            pickup.userData.shadow?.material?.dispose?.();
            pickup.userData.shadow?.geometry?.dispose?.();
            pickup.userData.glow?.material?.dispose?.();
            pickup.userData.glow?.geometry?.dispose?.();
            pickup.userData.burst?.material?.dispose?.();
            pickup.userData.burst?.geometry?.dispose?.();
            pickup.parent?.remove(pickup);
        }
    }

    updateScatter(delta, now) {
        const time = now * 0.001;
        
        for (const child of this.scatterSprites) {
            if (child.userData.type.startsWith('bio_spores')) {
                const phase = child.userData.phase;
                const drift = Math.sin(time * 0.75 + phase) * 0.16;
                const pulse = 0.92 + Math.sin(time * 1.15 + phase * 1.3) * 0.16;
                const shimmer = 0.72 + Math.sin(time * 1.6 + phase) * 0.28;
                child.position.y = child.userData.baseY + drift;
                child.scale.set(
                    child.userData.baseScaleX * pulse,
                    child.userData.baseScaleY * pulse,
                    1
                );
                child.material.opacity = child.userData.baseOpacity * shimmer;
            } else if (child.userData.type.startsWith('bunker_junk')) {
                child.position.y = child.userData.baseY;
                child.scale.set(
                    child.userData.baseScaleX,
                    child.userData.baseScaleY,
                    1
                );
                child.material.opacity = child.userData.baseOpacity;
            }

            if (child.userData.burstTriggered) {
                child.userData.burstTimer += delta;
                if (child.userData.type.startsWith('bunker_junk')) {
                    const fadeDuration = 0.28;
                    const fadeT = Math.min(child.userData.burstTimer / fadeDuration, 1);
                    const burstScale = 1 + Math.sin(Math.min(child.userData.burstTimer * 8, Math.PI)) * 0.18;
                    child.scale.set(
                        child.userData.baseScaleX * burstScale,
                        child.userData.baseScaleY * burstScale,
                        1
                    );
                    child.material.opacity = child.userData.baseOpacity * (1 - fadeT);

                    if (fadeT >= 1) {
                        child.parent?.remove(child);
                        child.material?.dispose?.();
                        child.geometry?.dispose?.();
                        this.scatterSprites = this.scatterSprites.filter((sprite) => sprite !== child);
                        continue;
                    }
                }
            }

            if (
                child.userData.type.startsWith('bunker_junk') &&
                !child.userData.burstTriggered &&
                Math.hypot(this.player.position.x - child.position.x, this.player.position.z - child.position.z)
                    <= Math.max(
                        BUNKER_JUNK_TRIGGER_RADIUS,
                        Math.max(child.userData.baseScaleX ?? 1, child.userData.baseScaleY ?? 1) * 0.62
                            + this.playerRadius * 0.95
                    )
            ) {
                this.triggerBunkerJunkBurst(child);
            }
        }
    }

    triggerBunkerJunkBurst(sprite) {
        sprite.userData.burstTriggered = true;
        sprite.userData.burstTimer = 0;
        if (sprite.userData.scatterKey) {
            this.depletedGearPileKeys.add(sprite.userData.scatterKey);
        }

        const seed = this.hashTile(Math.round(sprite.position.x * 100), Math.round(sprite.position.z * 100));
        const random = this.createSeededRandom(seed);
        const chunkGroup = sprite.parent;

        if (!chunkGroup) {
            return;
        }

        this.spawnGearPoofEffect(sprite.position.x, sprite.position.z, sprite.userData.type);
        window.AudioManager?.playProceduralJunkBurst(sprite.userData.type);

        for (const target of this.createJunkBurstTargets(sprite.position.x, sprite.position.z, random)) {
            let placement = null;

            for (let attempt = 0; attempt < 10; attempt++) {
                const targetX = target.x + (random() - 0.5) * 0.14;
                const targetZ = target.z + (random() - 0.5) * 0.14;

                if (this.getTileType(Math.round(targetX), Math.round(targetZ)) === '#') {
                    continue;
                }

                placement = this.createJunkBurstPickupPlacement(
                    sprite.position.x,
                    sprite.position.z,
                    targetX,
                    targetZ,
                    random,
                    sprite.userData.type
                );
                break;
            }

            if (!placement) {
                // Fallback to guaranteed nearby placement so every burst spawns visible loot.
                const fallbackAngle = random() * Math.PI * 2;
                let fallbackRadius = 0.9 + (random() - 0.5) * 0.22;
                let fallbackX = sprite.position.x + Math.cos(fallbackAngle) * fallbackRadius;
                let fallbackZ = sprite.position.z + Math.sin(fallbackAngle) * fallbackRadius;

                if (this.getTileType(Math.round(fallbackX), Math.round(fallbackZ)) === '#') {
                    fallbackRadius = 0.48;
                    fallbackX = sprite.position.x + Math.cos(fallbackAngle) * fallbackRadius;
                    fallbackZ = sprite.position.z + Math.sin(fallbackAngle) * fallbackRadius;
                }

                if (this.getTileType(Math.round(fallbackX), Math.round(fallbackZ)) === '#') {
                    fallbackX = sprite.position.x;
                    fallbackZ = sprite.position.z;
                }

                placement = this.createJunkBurstPickupPlacement(
                    sprite.position.x,
                    sprite.position.z,
                    fallbackX,
                    fallbackZ,
                    random,
                    sprite.userData.type
                );
            }

            const pickup = this.createPickupInstance(placement);
            chunkGroup.add(pickup);
            this.pickupMeshes.push(pickup);
        }
    }

    spawnGearPoofEffect(x, z, junkType = 'bunker_junk') {
        const colors = this.getJunkVariantEffectColors(junkType);
        const smokeColor = new THREE.Color(colors.smokeColor).lerp(new THREE.Color(0x6b7177), 0.45);
        const glowColor = new THREE.Color(colors.glowColor).lerp(new THREE.Color(0x7a7a7a), 0.62);
        const sporeColor = new THREE.Color(colors.glowColor).lerp(new THREE.Color(0xcce7b6), 0.38);
        const effect = new THREE.Group();
        const smokeMaterial = new THREE.MeshBasicMaterial({
            color: smokeColor,
            transparent: true,
            opacity: 0.34,
            depthWrite: false,
            depthTest: false
        });
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: glowColor,
            transparent: true,
            opacity: 0.44,
            side: THREE.DoubleSide,
            depthWrite: false,
            depthTest: false
        });
        const sporeMaterial = new THREE.MeshBasicMaterial({
            color: sporeColor,
            transparent: true,
            opacity: 0.82,
            depthWrite: false,
            depthTest: false
        });

        for (let i = 0; i < 6; i++) {
            const puff = new THREE.Mesh(new THREE.CircleGeometry(0.08 + i * 0.016, 14), smokeMaterial.clone());
            puff.rotation.x = -Math.PI / 2;
            puff.position.set((Math.random() - 0.5) * 0.14, 0.025 + i * 0.008, (Math.random() - 0.5) * 0.14);
            puff.renderOrder = 26;
            puff.userData = {
                isSmoke: true,
                vx: (Math.random() - 0.5) * 0.42,
                vz: (Math.random() - 0.5) * 0.42,
                vy: 0.2 + Math.random() * 0.12,
                growth: 0.45 + Math.random() * 0.22
            };
            effect.add(puff);
        }

        for (let i = 0; i < 9; i++) {
            const mote = new THREE.Mesh(new THREE.CircleGeometry(0.02 + Math.random() * 0.025, 12), sporeMaterial.clone());
            mote.rotation.x = -Math.PI / 2;
            mote.position.set((Math.random() - 0.5) * 0.12, 0.04 + Math.random() * 0.08, (Math.random() - 0.5) * 0.12);
            mote.renderOrder = 27;
            mote.userData = {
                isSpore: true,
                vx: (Math.random() - 0.5) * 0.32,
                vz: (Math.random() - 0.5) * 0.32,
                vy: 0.28 + Math.random() * 0.24,
                growth: 0.2 + Math.random() * 0.2
            };
            effect.add(mote);
        }

        const glow = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.3, 24), glowMaterial);
        glow.rotation.x = -Math.PI / 2;
        glow.position.y = 0.045;
        glow.renderOrder = 28;
        glow.userData = { isGlow: true };
        effect.add(glow);

        effect.position.set(x, 0.02, z);
        effect.userData = { age: 0, duration: 0.56 };
        this.scene.add(effect);
        this.transientEffects.push(effect);
    }

    updateTransientEffects(delta) {
        const removals = [];

        for (const effect of this.transientEffects) {
            effect.userData.age += delta;
            const t = Math.min(effect.userData.age / effect.userData.duration, 1);

            for (const child of effect.children) {
                if (child.userData?.isGlow) {
                    child.material.opacity = (1 - t) * 0.9;
                    child.scale.setScalar(1 + t * 1.45);
                    continue;
                }

                child.position.x += child.userData.vx * delta;
                child.position.z += child.userData.vz * delta;
                child.position.y += child.userData.vy * delta;
                child.scale.setScalar(1 + t * child.userData.growth);
                if (child.userData?.isSpore) {
                    child.material.opacity = (1 - t) * 0.9;
                } else {
                    child.material.opacity = (1 - t) * 0.45;
                }
            }

            if (t >= 1) {
                removals.push(effect);
            }
        }

        for (const effect of removals) {
            effect.traverse((child) => {
                child.material?.dispose?.();
                child.geometry?.dispose?.();
            });
            this.scene.remove(effect);
        }

        this.transientEffects = this.transientEffects.filter((effect) => !removals.includes(effect));
    }

    canOccupyPosition(x, z) {
        if (this.crashedShips) {
            for (const ship of this.crashedShips) {
                if (!ship.isVisible) continue;
                // 1. Ship collision
                const dxShip = x - ship.tileX;
                const dzShip = z - ship.tileZ;
                const distShip = Math.hypot(dxShip, dzShip);
                if (distShip < (ship.width + this.playerRadius * 0.7)) {
                    return false;
                }

                // 2. Console collision
                const consoleX = ship.tileX + ship.consoleOffset.x;
                const consoleZ = ship.tileZ + ship.consoleOffset.z;
                const dxConsole = x - consoleX;
                const dzConsole = z - consoleZ;
                const distConsole = Math.hypot(dxConsole, dzConsole);
                if (distConsole < (0.42 + this.playerRadius * 0.7)) {
                    return false;
                }

                // 3. O2 module collision
                const moduleX = Number.isFinite(ship.o2ModuleX)
                    ? ship.o2ModuleX
                    : ship.tileX + (ship.o2ModuleOffset?.x ?? O2_MODULE_OFFSET.x);
                const moduleZ = Number.isFinite(ship.o2ModuleZ)
                    ? ship.o2ModuleZ
                    : ship.tileZ + (ship.o2ModuleOffset?.z ?? O2_MODULE_OFFSET.z);
                const dxModule = x - moduleX;
                const dzModule = z - moduleZ;
                const distModule = Math.hypot(dxModule, dzModule);
                if (distModule < (O2_MODULE_COLLISION_RADIUS + this.playerRadius * 0.7)) {
                    return false;
                }
            }
        }

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
                const dx = worldX - spawn.x;
                const dy = worldY - spawn.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance <= 6.0) {
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
        this.consolePromptEl?.removeEventListener('pointerup', this.handlePromptTap);
        Object.values(this.playerMaterials ?? {}).forEach((material) => material.dispose());
        Object.values(this.playerTextures ?? {}).forEach((texture) => texture.dispose());
        Object.values(this.scatterMaterials ?? {}).forEach((material) => material.dispose?.());
        Object.values(this.scatterPlaneMaterials ?? {}).forEach((material) => material.dispose?.());
        Object.values(this.scatterTextures ?? {}).forEach((texture) => texture.dispose?.());
        this.playerShadow?.material?.dispose?.();
        this.playerShadow?.geometry?.dispose?.();
        Object.values(this.pickupAssets ?? {}).forEach((asset) => {
            if (asset?.material?.dispose) asset.material.dispose();
            if (asset?.accent?.dispose) asset.accent.dispose();
        });
        this.pickupAssets?.shadowMaterial?.dispose?.();
        for (const effect of this.transientEffects) {
            effect.traverse((child) => {
                child.material?.dispose?.();
                child.geometry?.dispose?.();
            });
            this.scene.remove(effect);
        }
        if (this.o2BubbleObjects) {
            this.o2BubbleObjects.ring?.material?.dispose?.();
            this.o2BubbleObjects.ring?.geometry?.dispose?.();
            this.scene.remove(this.o2BubbleObjects.ring);
            this.scene.remove(this.o2BubbleObjects.light);
            this.o2BubbleObjects = null;
        }
        this.renderer.dispose();
        this.container.replaceChildren();
    }
}
