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
const CLASS_STATS = {
    SCOUT:    { moveSpeed: 4.8, o2DrainMult: 1.25, pickupMagnetRadius: 4.2 },
    TANK:     { moveSpeed: 2.6, o2DrainMult: 0.75, pickupMagnetRadius: 2.8 },
    ENGINEER: { moveSpeed: 3.6, o2DrainMult: 1.0,  pickupMagnetRadius: 3.4 }
};

const O2_DRAIN_RATE_PCT_PER_SEC = 1 / 3;
const O2_DANGER_THRESHOLD = 25;
const O2_DRAIN_RATE_DANGER_MULT = 1.5;
const O2_HEALTH_DRAIN_INTERVAL = 1;
const BASE_HEARTS = 3;
const UPGRADED_HEARTS = 4;
const DEPTH_TIER_NAMES = Object.freeze(['SURFACE', 'SHALLOW', 'DEEP', 'ABYSS']);
const DEPTH_TIER_LOOT_CONFIG = Object.freeze([
    Object.freeze({ pickupMultiplier: 0.8, legendaryBoost: 0 }),
    Object.freeze({ pickupMultiplier: 1.0, legendaryBoost: 0 }),
    Object.freeze({ pickupMultiplier: 1.3, legendaryBoost: 0.05 }),
    Object.freeze({ pickupMultiplier: 1.7, legendaryBoost: 0.15 })
]);

const O2_GENERATOR_BUTTON_ID = 'terminal-btn-o2-generator';
const O2_GENERATOR_RING_BASE_RADIUS = 1;
const O2_GENERATOR_RING_BAND_THICKNESS = 0.24;
const O2_MODULE_COLLISION_RADIUS = 0.5;
const MODULE_OFFSETS = Object.freeze({
    o2Generator: Object.freeze({ x: 1.75, z: 1.2 }),
    hullMatrix: Object.freeze({ x: 2.7, z: 0.25 }),
    radarDish: Object.freeze({ x: 1.9, z: -1.15 }),
    reactorCompressor: Object.freeze({ x: 0.45, z: 3.0 })
});
const O2_MODULE_OFFSET = MODULE_OFFSETS.o2Generator;
const LOCKED_MODULE_OPACITY = 0.4;
const UNLOCKED_MODULE_OPACITY = 1;
const GOAL_CARD_CONFIGS = Object.freeze([
    Object.freeze({
        goalKey: 'hullExpansion',
        prereqKey: 'o2Bubble',
        statusId: 'terminal-hull-status',
        costId: 'terminal-hull-cost',
        buttonId: 'terminal-btn-hull',
        lockedStatusText: 'LOCKED — REPAIR O₂ GENERATOR FIRST'
    }),
    Object.freeze({
        goalKey: 'radarNode',
        prereqKey: 'hullExpansion',
        statusId: 'terminal-radar-status',
        costId: 'terminal-radar-cost',
        buttonId: 'terminal-btn-radar',
        lockedStatusText: 'LOCKED — INSTALL HULL MATRIX FIRST'
    }),
    Object.freeze({
        goalKey: 'reactorCompressor',
        prereqKey: 'radarNode',
        statusId: 'terminal-reactor-status',
        costId: 'terminal-reactor-cost',
        buttonId: 'terminal-btn-reactor',
        lockedStatusText: 'LOCKED — INSTALL RADAR NODE FIRST'
    })
]);
const PICKUP_MAGNET_RADIUS = 3.4;
const PICKUP_COLLECT_RADIUS = 0.72;
const PICKUP_COLLECT_DURATION = 0.2;
const WEAPON_CLIP_SIZE = 6;
const WEAPON_RELOAD_DURATION = 1.25;
const WEAPON_FIRE_COOLDOWN = 0.14;
const PROJECTILE_SPEED = 13.4;
const PROJECTILE_TTL = 1.15;
const PROJECTILE_RADIUS = 0.16;
const PROJECTILE_DAMAGE = 1;
const SHIP_MAX_HP = 24;
const SHIP_NO_FIRE_RADIUS = 2.4;
const SHIP_HIT_RADIUS_MULT = 0.78;
const SNAIL_MAX_HP = 2;
const SNAIL_MOVE_SPEED = 1.2;
const SNAIL_ENRAGED_MOVE_SPEED = 2.1;
const SNAIL_ENRAGED_TINT = 0xff4a4a;
const SNAIL_HIT_RADIUS = 0.62;
const SNAIL_ATTACK_RADIUS = 1.1;
const SNAIL_ATTACK_COOLDOWN = 1.1;
const SNAIL_PATH_RECALC_MIN = 0.24;
const SNAIL_PATH_RECALC_MAX = 0.5;
const SNAIL_WANDER_RECALC_MIN = 0.9;
const SNAIL_WANDER_RECALC_MAX = 1.6;
const SNAIL_WANDER_DISTANCE_MIN = 1.2;
const SNAIL_WANDER_DISTANCE_MAX = 4.2;
const SNAIL_WANDER_TARGET_DISTANCE = 10.5;
const SNAIL_PATH_NODE_BUDGET = 360;
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
const BIOME_KEYS = Object.freeze({
    ACTIVE: 'active',
    CRYO: 'cryo',
    BIO: 'bio'
});
const BIOME_LABELS = Object.freeze({
    [BIOME_KEYS.ACTIVE]: 'ACTIVE SECTOR',
    [BIOME_KEYS.CRYO]: 'CRYO SECTOR',
    [BIOME_KEYS.BIO]: 'BIO SECTOR'
});
const BIOME_ORDER = Object.freeze([
    BIOME_KEYS.ACTIVE,
    BIOME_KEYS.CRYO,
    BIOME_KEYS.BIO
]);
const BIOME_THRESHOLD_CRYO = 60;
const BIOME_THRESHOLD_BIO = 140;
const BIOME_BLEND_HALF_WIDTH = 10;
const BIOME_O2_DRAIN_MULTIPLIERS = Object.freeze({
    [BIOME_KEYS.ACTIVE]: 1.0,
    [BIOME_KEYS.CRYO]: 1.15,
    [BIOME_KEYS.BIO]: 1.3
});
const BIOME_LIGHTING = Object.freeze({
    [BIOME_KEYS.ACTIVE]: Object.freeze({
        fog: 0x0b0d0f,
        ambient: 0xffffff,
        directional: 0xd6e7ff,
        hemisphereSky: 0x6b8db3,
        hemisphereGround: 0x07090c
    }),
    [BIOME_KEYS.CRYO]: Object.freeze({
        fog: 0x080f1a,
        ambient: 0xb0ccff,
        directional: 0xa8cfff,
        hemisphereSky: 0x456da2,
        hemisphereGround: 0x06090f
    }),
    [BIOME_KEYS.BIO]: Object.freeze({
        fog: 0x060d08,
        ambient: 0x90a870,
        directional: 0xc8b878,
        hemisphereSky: 0x3f5c38,
        hemisphereGround: 0x050804
    })
});
const BIOME_TERRAIN_TEXTURE_PATHS = Object.freeze({
    [BIOME_KEYS.ACTIVE]: Object.freeze({
        floorBase: '/bunker_base_metal.png',
        floorGrunge: '/bunker_grunge_rust.png',
        floorDetail: '/bunker_tech_scratches.png',
        wallSide: '/bunker_wall_metal.png',
        wallTop: '/bunker_base_metal.png',
        wallGrunge: '/bunker_wall_grunge.png'
    }),
    [BIOME_KEYS.CRYO]: Object.freeze({
        floorBase: '/cryo_base_frost.png',
        floorGrunge: '/cryo_grunge_rime.png',
        floorDetail: '/cryo_wall_conduit.png',
        wallSide: '/cryo_wall_conduit.png',
        wallTop: '/cryo_base_frost.png',
        wallGrunge: '/cryo_grunge_rime.png',
        fallback: Object.freeze({
            floorBase: '/ice_base_rock.png',
            floorGrunge: '/ice_grunge_snow.png',
            floorDetail: '/ice_wall_glacier.png',
            wallSide: '/ice_wall_glacier.png',
            wallTop: '/ice_base_rock.png',
            wallGrunge: '/ice_grunge_snow.png'
        })
    }),
    [BIOME_KEYS.BIO]: Object.freeze({
        floorBase: '/bio_base_growth.png',
        floorGrunge: '/bio_grunge_spores.png',
        floorDetail: '/bio_wall_veins.png',
        wallSide: '/bio_wall_veins.png',
        wallTop: '/bio_base_growth.png',
        wallGrunge: '/bio_grunge_spores.png'
    })
});
const CRYO_SCATTER_VARIANTS = [
    { type: 'scatter_coolant_puddle', weight: 0.42 },
    { type: 'scatter_ice_stalagmite', weight: 0.32 },
    { type: 'scatter_cryo_icicle', weight: 0.26 }
];
const BIO_SCATTER_VARIANTS = [
    { type: 'scatter_bio_pod', weight: 0.42 },
    { type: 'scatter_slime_puddle', weight: 0.3 },
    { type: 'bio_spores', weight: 0.16 },
    { type: 'bio_spores_blue', weight: 0.06 },
    { type: 'bio_spores_amber', weight: 0.06 }
];
const ACTIVE_SCATTER_VARIANTS = [
    { type: 'scatter_gravel', weight: 0.38 },
    { type: 'ship_wreckage', weight: 0.08 },
    ...SPORE_SCATTER_VARIANTS
];
const BIOME_SCATTER_VARIANTS = Object.freeze({
    [BIOME_KEYS.ACTIVE]: ACTIVE_SCATTER_VARIANTS,
    [BIOME_KEYS.CRYO]: CRYO_SCATTER_VARIANTS,
    [BIOME_KEYS.BIO]: BIO_SCATTER_VARIANTS
});
const BIOME_NOTIFICATION_MESSAGES = Object.freeze({
    [BIOME_KEYS.ACTIVE]: 'ENTERING ACTIVE SECTOR — NAV GRID STABLE',
    [BIOME_KEYS.CRYO]: 'ENTERING CRYO SECTOR — SUIT THERMAL LOAD INCREASING',
    [BIOME_KEYS.BIO]: 'ENTERING BIO SECTOR — SPORE DENSITY RISING'
});
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

function getDepthTier(chunkX, chunkY) {
    const dist = Math.hypot(chunkX, chunkY);
    if (dist < 2) return 0;
    if (dist < 5) return 1;
    if (dist < 9) return 2;
    return 3;
}

function getDepthLootConfig(depthTier) {
    const index = Math.max(0, Math.min(DEPTH_TIER_LOOT_CONFIG.length - 1, Math.floor(depthTier)));
    return DEPTH_TIER_LOOT_CONFIG[index];
}

const ENGINEER_CONSOLE_DISCOUNT = 0.80;

const ROOM_TYPES = Object.freeze({
    DEAD_END: 'dead_end',
    CORRIDOR: 'corridor',
    JUNCTION: 'junction',
    CHAMBER:  'chamber'
});

const SNAIL_DEPTH_SPAWN = Object.freeze([
    Object.freeze({ maxCount: 0, chance: 0 }),
    Object.freeze({ maxCount: 1, chance: 0.08 }),
    Object.freeze({ maxCount: 2, chance: 0.12 }),
    Object.freeze({ maxCount: 3, chance: 0.16 })
]);

const SNAIL_BIOME_TINTS = Object.freeze({
    active: 0xffffff,
    cryo:   0x88ccff,
    bio:    0x88ff88
});

function classifyChunkCells(grid, chunkSize) {
    const roomTypes = Array.from({ length: chunkSize }, () => Array(chunkSize).fill(null));
    for (let y = 0; y < chunkSize; y++) {
        for (let x = 0; x < chunkSize; x++) {
            if (grid[y][x] === '#') continue;
            let floorNeighbors = 0;
            if (y > 0 && grid[y - 1][x] !== '#') floorNeighbors++;
            if (y < chunkSize - 1 && grid[y + 1][x] !== '#') floorNeighbors++;
            if (x > 0 && grid[y][x - 1] !== '#') floorNeighbors++;
            if (x < chunkSize - 1 && grid[y][x + 1] !== '#') floorNeighbors++;
            if (floorNeighbors <= 1) roomTypes[y][x] = ROOM_TYPES.DEAD_END;
            else if (floorNeighbors === 2) roomTypes[y][x] = ROOM_TYPES.CORRIDOR;
            else if (floorNeighbors === 3) roomTypes[y][x] = ROOM_TYPES.JUNCTION;
            else roomTypes[y][x] = ROOM_TYPES.CHAMBER;
        }
    }
    return roomTypes;
}

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
        const _initialStats = CLASS_STATS[this.playerType] ?? CLASS_STATS.ENGINEER;
        this.moveSpeed = _initialStats.moveSpeed;
        this.o2DrainMult = _initialStats.o2DrainMult;
        this.pickupMagnetRadius = _initialStats.pickupMagnetRadius ?? PICKUP_MAGNET_RADIUS;
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
        this.aimDirX = 1;
        this.aimDirZ = 0;
        this.aimFacingRow = 2;
        this.aimWorldPoint = null;
        this.hasActiveAim = false;
        this.mouseAimActive = false;
        this.lastMouseClientX = null;
        this.lastMouseClientY = null;
        this._aimResetTimer = 0;
        this._aimRaycaster = new THREE.Raycaster();
        this._projRaycaster = new THREE.Raycaster();
        this.activeProjectiles = [];
        this.weaponClipAmmo = WEAPON_CLIP_SIZE;
        this.weaponReloading = false;
        this.weaponReloadTimer = 0;
        this.weaponFireCooldown = 0;
        this.isPlayerDead = false;
        this.o2DispatchTimer = 0;
        this.footstepTimer = 0;
        this.snailsKilledThisRun = 0;
        this._threatAudioTimer = 0;
        this._cameraShakeTimer = 0;
        this._cameraShakeIntensity = 0;
        this.visitedChunks = new Set();
        this.totalDistanceTravelled = 0;
        this.maxDepthTierReached = 0;
        this.currentDepthTier = 0;
        this.currentBiomeKey = BIOME_KEYS.ACTIVE;
        this.currentBiomeO2DrainMult = BIOME_O2_DRAIN_MULTIPLIERS[BIOME_KEYS.ACTIVE];
        this.biomeMixState = { cryoMix: 0, bioMix: 0 };
        this.biomeShipAnchor = new THREE.Vector2();
        this.floorShaderUniforms = null;
        this.wallShaderUniforms = null;
        this.biomeLightingColors = {
            fogA: new THREE.Color(),
            fogB: new THREE.Color(),
            ambientA: new THREE.Color(),
            ambientB: new THREE.Color(),
            directionalA: new THREE.Color(),
            directionalB: new THREE.Color(),
            hemiSkyA: new THREE.Color(),
            hemiSkyB: new THREE.Color(),
            hemiGroundA: new THREE.Color(),
            hemiGroundB: new THREE.Color()
        };
        this.terminalCloseListenerBound = false;
        this.o2BubbleObjects = null;
        this.goalModuleMaterials = null;
        this.snailsEnabled = false;

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
        this.textureLoader = textureLoader;
        const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
        this.maxTextureAnisotropy = maxAnisotropy;
        this.biomeTerrainTextures = this.createBiomeTerrainTextures(textureLoader, maxAnisotropy);
        const activeTerrainTextures = this.biomeTerrainTextures[BIOME_KEYS.ACTIVE];
        const cryoTerrainTextures = this.biomeTerrainTextures[BIOME_KEYS.CRYO];
        const bioTerrainTextures = this.biomeTerrainTextures[BIOME_KEYS.BIO];

        const baseMetalTex = activeTerrainTextures.floorBase;
        const grungeRustTex = activeTerrainTextures.floorGrunge;
        const techScratchesTex = activeTerrainTextures.floorDetail;
        this.playerTextures = Object.fromEntries(
            Object.entries(PLAYER_SPRITESHEET_PATHS).map(([type, path]) => [
                type,
                this.createPlayerSpriteTexture(type, path, textureLoader)
            ])
        );

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
            shader.uniforms.tCryoBase = { value: cryoTerrainTextures.floorBase };
            shader.uniforms.tCryoGrunge = { value: cryoTerrainTextures.floorGrunge };
            shader.uniforms.tCryoDetail = { value: cryoTerrainTextures.floorDetail };
            shader.uniforms.tBioBase = { value: bioTerrainTextures.floorBase };
            shader.uniforms.tBioGrunge = { value: bioTerrainTextures.floorGrunge };
            shader.uniforms.tBioDetail = { value: bioTerrainTextures.floorDetail };
            shader.uniforms.uShipWorldPos = { value: this.biomeShipAnchor };
            this.floorShaderUniforms = shader.uniforms;

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
                uniform sampler2D tCryoBase;
                uniform sampler2D tCryoGrunge;
                uniform sampler2D tCryoDetail;
                uniform sampler2D tBioBase;
                uniform sampler2D tBioGrunge;
                uniform sampler2D tBioDetail;
                uniform vec2 uShipWorldPos;
                ${shader.fragmentShader}
            `;

            // Replace standard UV-mapping chunk with our world-space, coprime scale blending
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <map_fragment>',
                `
                #ifdef USE_MAP
                    vec2 uvBase = vWorldPos.xz * 0.12;
                    vec2 uvGrunge = vWorldPos.xz * 0.053;
                    vec2 uvDetail = vWorldPos.xz * 0.27;

                    vec4 bunkerBase = texture2D( tBase, uvBase );
                    vec4 bunkerGrunge = texture2D( tGrunge, uvGrunge );
                    vec4 bunkerDetail = texture2D( tDetail, uvDetail );

                    vec4 cryoBase = texture2D( tCryoBase, uvBase );
                    vec4 cryoGrunge = texture2D( tCryoGrunge, uvGrunge );
                    vec4 cryoDetail = texture2D( tCryoDetail, uvDetail );

                    vec4 bioBase = texture2D( tBioBase, uvBase );
                    vec4 bioGrunge = texture2D( tBioGrunge, uvGrunge );
                    vec4 bioDetail = texture2D( tBioDetail, uvDetail );

                    float distFromShip = length(vWorldPos.xz - uShipWorldPos);
                    float cryoMix = smoothstep(${(BIOME_THRESHOLD_CRYO - BIOME_BLEND_HALF_WIDTH).toFixed(1)}, ${(BIOME_THRESHOLD_CRYO + BIOME_BLEND_HALF_WIDTH).toFixed(1)}, distFromShip);
                    float bioMix = smoothstep(${(BIOME_THRESHOLD_BIO - BIOME_BLEND_HALF_WIDTH).toFixed(1)}, ${(BIOME_THRESHOLD_BIO + BIOME_BLEND_HALF_WIDTH).toFixed(1)}, distFromShip);

                    vec3 bunkerColor = bunkerBase.rgb;
                    float bunkerRustMask = clamp((bunkerGrunge.r * 0.85 + bunkerGrunge.g * 0.35) * 0.95, 0.0, 1.0);
                    vec3 bunkerRustColor = vec3(0.18, 0.09, 0.05) * (0.6 + 0.4 * bunkerGrunge.b);
                    bunkerColor = mix(bunkerColor, bunkerRustColor, bunkerRustMask * 0.88);
                    bunkerColor += vec3(bunkerDetail.r * 0.22);

                    vec3 cryoColor = cryoBase.rgb;
                    float cryoRustMask = clamp((cryoGrunge.r * 0.6 + cryoGrunge.g * 0.55) * 0.9, 0.0, 1.0);
                    vec3 cryoTint = vec3(0.45, 0.67, 0.85) * (0.65 + 0.35 * cryoGrunge.b);
                    cryoColor = mix(cryoColor, cryoTint, cryoRustMask * 0.82);
                    cryoColor += vec3(cryoDetail.r * 0.16);

                    vec3 bioColor = bioBase.rgb;
                    float bioMask = clamp((bioGrunge.g * 0.82 + bioGrunge.r * 0.28) * 1.02, 0.0, 1.0);
                    vec3 bioTint = vec3(0.21, 0.34, 0.16) * (0.7 + 0.3 * bioGrunge.b);
                    bioColor = mix(bioColor, bioTint, bioMask * 0.9);
                    bioColor += vec3(bioDetail.g * 0.18);

                    vec3 floorColor = mix(bunkerColor, cryoColor, cryoMix);
                    floorColor = mix(floorColor, bioColor, bioMix);
                    diffuseColor *= vec4(floorColor, 1.0);
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

        const wallMetalTex = activeTerrainTextures.wallSide;
        const wallGrungeTex = activeTerrainTextures.wallGrunge;

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
            shader.uniforms.tCryoWallSide = { value: cryoTerrainTextures.wallSide };
            shader.uniforms.tCryoWallTop = { value: cryoTerrainTextures.wallTop };
            shader.uniforms.tCryoWallGrunge = { value: cryoTerrainTextures.wallGrunge };
            shader.uniforms.tBioWallSide = { value: bioTerrainTextures.wallSide };
            shader.uniforms.tBioWallTop = { value: bioTerrainTextures.wallTop };
            shader.uniforms.tBioWallGrunge = { value: bioTerrainTextures.wallGrunge };
            shader.uniforms.uShipWorldPos = { value: this.biomeShipAnchor };
            this.wallShaderUniforms = shader.uniforms;

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
                uniform sampler2D tCryoWallSide;
                uniform sampler2D tCryoWallTop;
                uniform sampler2D tCryoWallGrunge;
                uniform sampler2D tBioWallSide;
                uniform sampler2D tBioWallTop;
                uniform sampler2D tBioWallGrunge;
                uniform vec2 uShipWorldPos;
                ${shader.fragmentShader}
            `;

            // Replace standard UV-mapping with Triplanar World-Space Projection
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <map_fragment>',
                `
                #ifdef USE_MAP
                    vec3 blendWeights = abs( normalize( vWorldNormal ) );
                    blendWeights /= ( blendWeights.x + blendWeights.y + blendWeights.z );

                    vec2 uvY = vWorldPos.xz * 0.12; 
                    vec2 uvX = vec2( vWorldPos.z * 0.45, vWorldPos.y * 0.35 );
                    vec2 uvZ = vec2( vWorldPos.x * 0.45, vWorldPos.y * 0.35 );
                    vec2 uvGrungeY = vWorldPos.xz * 0.053;
                    vec2 uvGrungeX = vec2( vWorldPos.z * 0.25, vWorldPos.y * 0.2 );
                    vec2 uvGrungeZ = vec2( vWorldPos.x * 0.25, vWorldPos.y * 0.2 );

                    vec4 bunkerY = texture2D( tWallTop, uvY );
                    vec4 bunkerX = texture2D( tWallSide, uvX );
                    vec4 bunkerZ = texture2D( tWallSide, uvZ );
                    vec4 bunkerWallCol = bunkerX * blendWeights.x + bunkerY * blendWeights.y + bunkerZ * blendWeights.z;

                    vec4 bunkerGrungeY = texture2D( tWallGrunge, uvGrungeY );
                    vec4 bunkerGrungeX = texture2D( tWallGrunge, uvGrungeX );
                    vec4 bunkerGrungeZ = texture2D( tWallGrunge, uvGrungeZ );
                    vec4 bunkerWallGrunge = bunkerGrungeX * blendWeights.x + bunkerGrungeY * blendWeights.y + bunkerGrungeZ * blendWeights.z;

                    vec4 cryoY = texture2D( tCryoWallTop, uvY );
                    vec4 cryoX = texture2D( tCryoWallSide, uvX );
                    vec4 cryoZ = texture2D( tCryoWallSide, uvZ );
                    vec4 cryoWallCol = cryoX * blendWeights.x + cryoY * blendWeights.y + cryoZ * blendWeights.z;

                    vec4 cryoGrungeY = texture2D( tCryoWallGrunge, uvGrungeY );
                    vec4 cryoGrungeX = texture2D( tCryoWallGrunge, uvGrungeX );
                    vec4 cryoGrungeZ = texture2D( tCryoWallGrunge, uvGrungeZ );
                    vec4 cryoWallGrunge = cryoGrungeX * blendWeights.x + cryoGrungeY * blendWeights.y + cryoGrungeZ * blendWeights.z;

                    vec4 bioY = texture2D( tBioWallTop, uvY );
                    vec4 bioX = texture2D( tBioWallSide, uvX );
                    vec4 bioZ = texture2D( tBioWallSide, uvZ );
                    vec4 bioWallCol = bioX * blendWeights.x + bioY * blendWeights.y + bioZ * blendWeights.z;

                    vec4 bioGrungeY = texture2D( tBioWallGrunge, uvGrungeY );
                    vec4 bioGrungeX = texture2D( tBioWallGrunge, uvGrungeX );
                    vec4 bioGrungeZ = texture2D( tBioWallGrunge, uvGrungeZ );
                    vec4 bioWallGrunge = bioGrungeX * blendWeights.x + bioGrungeY * blendWeights.y + bioGrungeZ * blendWeights.z;

                    float distFromShip = length(vWorldPos.xz - uShipWorldPos);
                    float cryoMix = smoothstep(${(BIOME_THRESHOLD_CRYO - BIOME_BLEND_HALF_WIDTH).toFixed(1)}, ${(BIOME_THRESHOLD_CRYO + BIOME_BLEND_HALF_WIDTH).toFixed(1)}, distFromShip);
                    float bioMix = smoothstep(${(BIOME_THRESHOLD_BIO - BIOME_BLEND_HALF_WIDTH).toFixed(1)}, ${(BIOME_THRESHOLD_BIO + BIOME_BLEND_HALF_WIDTH).toFixed(1)}, distFromShip);

                    vec3 bunkerBlended = bunkerWallCol.rgb;
                    float bunkerRustMask = clamp((bunkerWallGrunge.r * 0.85 + bunkerWallGrunge.g * 0.3) * 0.95, 0.0, 1.0);
                    vec3 bunkerRustColor = vec3(0.18, 0.09, 0.05) * (0.6 + 0.4 * bunkerWallGrunge.b);
                    bunkerBlended = mix(bunkerBlended, bunkerRustColor, bunkerRustMask * 0.82);

                    vec3 cryoBlended = cryoWallCol.rgb;
                    float cryoMask = clamp((cryoWallGrunge.r * 0.52 + cryoWallGrunge.g * 0.72) * 0.88, 0.0, 1.0);
                    vec3 cryoColor = vec3(0.52, 0.7, 0.86) * (0.65 + 0.35 * cryoWallGrunge.b);
                    cryoBlended = mix(cryoBlended, cryoColor, cryoMask * 0.78);

                    vec3 bioBlended = bioWallCol.rgb;
                    float bioMask = clamp((bioWallGrunge.g * 0.84 + bioWallGrunge.r * 0.24) * 0.98, 0.0, 1.0);
                    vec3 bioColor = vec3(0.2, 0.36, 0.16) * (0.72 + 0.28 * bioWallGrunge.b);
                    bioBlended = mix(bioBlended, bioColor, bioMask * 0.88);

                    vec3 finalWallColor = mix(bunkerBlended, cryoBlended, cryoMix);
                    finalWallColor = mix(finalWallColor, bioBlended, bioMix);
                    diffuseColor *= vec4(finalWallColor, 1.0);
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

        // Most scatter assets carry alpha already. Cyber snails are keyed from black
        // so their background does not render as a dark rectangle.
        this.scatterTextures = {
            cybersnail: this.loadKeyedSpriteTexture('/cybersnail.png', 14),
            bunker_junk: this.loadScatterTexture('/bunker_junk.png', textureLoader),
            bunker_junk_uncommon: this.loadScatterTexture('/bunker_junk_uncommon.png', textureLoader),
            bunker_junk_rare: this.loadScatterTexture('/bunker_junk_rare.png', textureLoader),
            bunker_junk_legendary: this.loadScatterTexture('/bunker_junk_legendary.png', textureLoader),
            bio_spores: this.loadScatterTexture('/bio_spores.png', textureLoader),
            bio_spores_blue: this.loadScatterTexture('/bio_spores_blue.png', textureLoader),
            bio_spores_amber: this.loadScatterTexture('/bio_spores_amber.png', textureLoader),
            scatter_coolant_puddle: this.loadScatterTexture('/scatter_coolant_puddle.png', textureLoader),
            scatter_ice_stalagmite: this.loadScatterTexture('/scatter_ice_stalagmite.png', textureLoader),
            scatter_bio_pod: this.loadScatterTexture('/scatter_bio_pod.png', textureLoader),
            scatter_slime_puddle: this.loadScatterTexture('/scatter_slime_puddle.png', textureLoader),
            scatter_gravel: this.loadScatterTexture('/scatter_gravel.png', textureLoader),
            scatter_cryo_icicle: this.loadScatterTexture('/scatter_cryo_icicle.png', textureLoader),
            ship_wreckage: this.loadScatterTexture('/ship_wreckage.png', textureLoader)
        };

        this.scatterMaterials = {
            cybersnail: new THREE.SpriteMaterial({
                map: this.scatterTextures.cybersnail,
                transparent: true,
                alphaTest: 0.06,
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
            }),
            scatter_coolant_puddle: new THREE.SpriteMaterial({
                map: this.scatterTextures.scatter_coolant_puddle,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            scatter_ice_stalagmite: new THREE.SpriteMaterial({
                map: this.scatterTextures.scatter_ice_stalagmite,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            scatter_bio_pod: new THREE.SpriteMaterial({
                map: this.scatterTextures.scatter_bio_pod,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            scatter_slime_puddle: new THREE.SpriteMaterial({
                map: this.scatterTextures.scatter_slime_puddle,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            scatter_gravel: new THREE.SpriteMaterial({
                map: this.scatterTextures.scatter_gravel,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            scatter_cryo_icicle: new THREE.SpriteMaterial({
                map: this.scatterTextures.scatter_cryo_icicle,
                transparent: true,
                alphaTest: 0.001,
                depthWrite: false,
                depthTest: true,
                fog: false
            }),
            ship_wreckage: new THREE.SpriteMaterial({
                map: this.scatterTextures.ship_wreckage,
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
        this.updateBiomeEnvironment({ immediate: true, forceEvent: true });
        this.renderer.setAnimationLoop(() => this.render());
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.9);
        this.scene.add(ambientLight);
        this.ambientLight = ambientLight;

        const fillLight = new THREE.HemisphereLight(0x6b8db3, 0x07090c, 0.8);
        this.scene.add(fillLight);
        this.fillLight = fillLight;

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
        this.directionalLight = directionalLight;

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
        const hullModuleMat = new THREE.SpriteMaterial({ transparent: true, alphaTest: 0.04, depthWrite: true, depthTest: true, opacity: LOCKED_MODULE_OPACITY });
        const radarModuleMat = new THREE.SpriteMaterial({ transparent: true, alphaTest: 0.04, depthWrite: true, depthTest: true, opacity: LOCKED_MODULE_OPACITY });
        const reactorModuleMat = new THREE.SpriteMaterial({ transparent: true, alphaTest: 0.04, depthWrite: true, depthTest: true, opacity: LOCKED_MODULE_OPACITY });
        this.goalModuleMaterials = {
            hullMatrix: hullModuleMat,
            radarDish: radarModuleMat,
            reactorCompressor: reactorModuleMat
        };

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
        this.loadKeyedSpriteTexture('/module_hull_matrix.png', 18, (tex) => {
            hullModuleMat.map = tex;
            hullModuleMat.needsUpdate = true;
        }, { cropBottomRatio: 0.16 });
        this.loadKeyedSpriteTexture('/module_radar_dish.png', 18, (tex) => {
            radarModuleMat.map = tex;
            radarModuleMat.needsUpdate = true;
        }, { cropBottomRatio: 0.16 });
        this.loadKeyedSpriteTexture('/module_reactor_compressor.png', 18, (tex) => {
            reactorModuleMat.map = tex;
            reactorModuleMat.needsUpdate = true;
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
                hullModuleOffset: { ...MODULE_OFFSETS.hullMatrix },
                radarModuleOffset: { ...MODULE_OFFSETS.radarDish },
                reactorModuleOffset: { ...MODULE_OFFSETS.reactorCompressor },
                color: 0x7dff5a,
                maxHp: SHIP_MAX_HP,
                hp: SHIP_MAX_HP
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
                hullModuleOffset: { ...MODULE_OFFSETS.hullMatrix },
                radarModuleOffset: { ...MODULE_OFFSETS.radarDish },
                reactorModuleOffset: { ...MODULE_OFFSETS.reactorCompressor },
                color: 0xffb700,
                maxHp: SHIP_MAX_HP,
                hp: SHIP_MAX_HP
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
                hullModuleOffset: { ...MODULE_OFFSETS.hullMatrix },
                radarModuleOffset: { ...MODULE_OFFSETS.radarDish },
                reactorModuleOffset: { ...MODULE_OFFSETS.reactorCompressor },
                color: 0x00e5ff,
                maxHp: SHIP_MAX_HP,
                hp: SHIP_MAX_HP
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
        const createModuleSprite = (ship, {
            keyPrefix,
            offset,
            material
        }) => {
            const moduleX = ship.tileX + offset.x;
            const moduleZ = ship.tileZ + offset.z;
            ship[`${keyPrefix}X`] = moduleX;
            ship[`${keyPrefix}Z`] = moduleZ;

            const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.48, 32), consoleShadowMat);
            shadow.rotation.x = -Math.PI / 2;
            shadow.position.set(moduleX, 0.021, moduleZ);
            this.scene.add(shadow);
            ship[`${keyPrefix}Shadow`] = shadow;

            const sprite = new THREE.Sprite(material);
            sprite.center.set(0.5, 0.08);
            sprite.position.set(moduleX, 0.09, moduleZ);
            sprite.scale.set(1.58, 1.58, 1);
            sprite.renderOrder = 4;
            this.scene.add(sprite);
            ship[`${keyPrefix}Sprite`] = sprite;

            return { shadow, sprite };
        };

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

            const o2Module = createModuleSprite(ship, {
                keyPrefix: 'o2Module',
                offset: ship.o2ModuleOffset,
                material: o2ModuleMat
            });
            const hullModule = createModuleSprite(ship, {
                keyPrefix: 'hullModule',
                offset: ship.hullModuleOffset,
                material: hullModuleMat
            });
            const radarModule = createModuleSprite(ship, {
                keyPrefix: 'radarModule',
                offset: ship.radarModuleOffset,
                material: radarModuleMat
            });
            const reactorModule = createModuleSprite(ship, {
                keyPrefix: 'reactorModule',
                offset: ship.reactorModuleOffset,
                material: reactorModuleMat
            });

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

            const safeRing = new THREE.Mesh(
                new THREE.RingGeometry(Math.max(0.1, SHIP_NO_FIRE_RADIUS - 0.04), SHIP_NO_FIRE_RADIUS + 0.04, 64),
                new THREE.MeshBasicMaterial({
                    color: ship.color,
                    transparent: true,
                    opacity: 0.14,
                    side: THREE.DoubleSide,
                    depthWrite: false
                })
            );
            safeRing.rotation.x = -Math.PI / 2;
            safeRing.position.set(ship.tileX, 0.028, ship.tileZ);
            this.scene.add(safeRing);
            ship.safeRing = safeRing;

            // 5. Light source for terminal screen (wow factor!)
            const terminalLight = new THREE.PointLight(ship.color, 1.8, 2.8, 2);
            terminalLight.position.set(consoleX, 0.5, consoleZ);
            this.scene.add(terminalLight);

            // Store all 3D objects associated with this base so we can toggle visibility
            ship.threeObjects = [
                shadow,
                shipSprite,
                consoleShadow,
                consoleSprite,
                o2Module.shadow,
                o2Module.sprite,
                hullModule.shadow,
                hullModule.sprite,
                radarModule.shadow,
                radarModule.sprite,
                reactorModule.shadow,
                reactorModule.sprite,
                ringMesh,
                safeRing,
                terminalLight
            ];
        }

        this.syncPersistentUpgrades();
        this.updateCrashedShipsVisibility(false);
        this.emitShipHealthState();
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
        this.emitWeaponClipState();
        this.emitShipHealthState();
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
            if (event.code === 'KeyR') {
                event.preventDefault();
                this.requestReload({ manual: true });
            }
            this.setKeyState(event.code, true);
        };
        this.handleKeyUp = (event) => this.setKeyState(event.code, false);
        this.handlePromptTap = (event) => {
            event.preventDefault();
            this.interactWithConsole();
        };

        // Pointer/tap state for canvas input.
        this._canvasTapStartX = 0;
        this._canvasTapStartY = 0;
        this._canvasPointerType = 'mouse';
        this.handleCanvasPointerDown = (event) => {
            this._canvasTapStartX = event.clientX;
            this._canvasTapStartY = event.clientY;
            this._canvasPointerType = event.pointerType || 'mouse';
            if (this._canvasPointerType === 'mouse') {
                this.lastMouseClientX = event.clientX;
                this.lastMouseClientY = event.clientY;
            }

            if (!this.inputEnabled || this.isPlayerDead) return;
            const pointerType = this._canvasPointerType;
            const isTouchPointer = pointerType !== 'mouse';
            if (isTouchPointer && this.isInTouchMoveControlBounds(event.clientX, event.clientY)) {
                return;
            }

            if (this.tryInteractWithConsolePointer(event.clientX, event.clientY)) {
                return;
            }

            this.updateAimFromClient(event.clientX, event.clientY, {
                keepMouseActive: pointerType === 'mouse',
                persistDuration: pointerType === 'mouse' ? 0 : 2.0
            });
            this.tryFireWeapon(event.clientX, event.clientY);
        };

        this.handleCanvasPointerMove = (event) => {
            if (!this.inputEnabled || this.isPlayerDead) return;
            const pointerType = event.pointerType || this._canvasPointerType || 'mouse';
            if (pointerType !== 'mouse') return;
            this.lastMouseClientX = event.clientX;
            this.lastMouseClientY = event.clientY;
            this.updateAimFromClient(event.clientX, event.clientY, {
                keepMouseActive: true,
                persistDuration: 0
            });
        };

        this.handleCanvasTap = (event) => {
            if (!this.inputEnabled || this.isPlayerDead) return;
            const dx = event.clientX - this._canvasTapStartX;
            const dy = event.clientY - this._canvasTapStartY;
            const wasTap = Math.sqrt(dx * dx + dy * dy) < 14;
            if (!wasTap) return;
        };

        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        this.consolePromptEl = document.getElementById('console-hud-prompt');
        this.consolePromptEl?.addEventListener('pointerup', this.handlePromptTap);
        this.renderer.domElement.addEventListener('pointerdown', this.handleCanvasPointerDown);
        this.renderer.domElement.addEventListener('pointermove', this.handleCanvasPointerMove);
        this.renderer.domElement.addEventListener('pointerup', this.handleCanvasTap);
    }

    isInTouchMoveControlBounds(clientX, clientY) {
        const touchMoveControl = document.getElementById('touch-move-control');
        if (!touchMoveControl || touchMoveControl.classList.contains('hidden')) return false;
        const rect = touchMoveControl.getBoundingClientRect();
        return (
            clientX >= rect.left
            && clientX <= rect.right
            && clientY >= rect.top
            && clientY <= rect.bottom
        );
    }

    getWorldAimPoint(clientX, clientY) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
        this._aimRaycaster.setFromCamera({ x: ndcX, y: ndcY }, this.camera);

        const worldPoint = new THREE.Vector3();
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const hit = this._aimRaycaster.ray.intersectPlane(groundPlane, worldPoint);
        if (!hit) return null;
        return worldPoint;
    }

    updateAimFromClient(clientX, clientY, { keepMouseActive = false, persistDuration = 2.0 } = {}) {
        if (!this.player) return null;
        const worldPoint = this.getWorldAimPoint(clientX, clientY);
        if (!worldPoint) return null;

        const aimDirX = worldPoint.x - this.player.position.x;
        const aimDirZ = worldPoint.z - this.player.position.z;
        const length = Math.hypot(aimDirX, aimDirZ);
        if (length <= 0.0001) return null;

        this.aimWorldPoint = worldPoint.clone();
        this.aimDirX = aimDirX / length;
        this.aimDirZ = aimDirZ / length;
        this.aimFacingRow = this.getFacingRow(this.aimDirX, this.aimDirZ);
        this.hasActiveAim = true;
        this.mouseAimActive = keepMouseActive;
        this._aimResetTimer = keepMouseActive ? 0 : Math.max(0, persistDuration);
        return worldPoint;
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
        this.mouseAimActive = false;
        this.hasActiveAim = false;
        this._aimResetTimer = 0;
        this.lastMouseClientX = null;
        this.lastMouseClientY = null;

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

    setSnailsEnabled(enabled = true, { removeExisting = true } = {}) {
        this.snailsEnabled = Boolean(enabled);
        if (!this.snailsEnabled && removeExisting) {
            this.removeActiveSnails();
        }
    }

    removeActiveSnails() {
        const survivors = [];
        for (const sprite of this.scatterSprites) {
            if (sprite?.userData?.type !== 'cybersnail') {
                survivors.push(sprite);
                continue;
            }

            sprite.parent?.remove(sprite);
            sprite.material?.dispose?.();
            sprite.geometry?.dispose?.();
        }
        this.scatterSprites = survivors;
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
        const stats = CLASS_STATS[type] ?? CLASS_STATS.ENGINEER;
        this.moveSpeed = stats.moveSpeed;
        this.o2DrainMult = stats.o2DrainMult;
        this.pickupMagnetRadius = stats.pickupMagnetRadius ?? PICKUP_MAGNET_RADIUS;
        this.playerSprite.material = this.playerMaterials[type] ?? this.playerMaterials.SCOUT;
        this.playerSprite.material.needsUpdate = true;
        this.playerMaterial.color.setHex(color);
        this.playerMaterial.emissive.setHex(color);
        this.playerGlow.color.setHex(color);
        this.updatePlayerSpriteFrame(0, this.currentFacingRow);

        this.updateCrashedShipsVisibility(true);
        this.ensureO2BubbleVisualState();
        this.updateBiomeEnvironment({ immediate: true, forceEvent: true });
        this.emitVitalsState();
        this.emitShipHealthState();
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

    configureTerrainTexture(texture, maxAnisotropy = 1) {
        if (!texture) return;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        if (maxAnisotropy > 1) {
            texture.anisotropy = maxAnisotropy;
        }
    }

    loadTerrainTexture(path, textureLoader, maxAnisotropy = 1, fallbackPath = null) {
        const texture = textureLoader.load(path, (loadedTexture) => {
            this.configureTerrainTexture(loadedTexture, maxAnisotropy);
        }, undefined, (error) => {
            if (!fallbackPath || fallbackPath === path) {
                console.warn(`[ThreeGame] Failed to load terrain texture from ${path}`, error);
                return;
            }

            console.warn(`[ThreeGame] Failed to load ${path}; falling back to ${fallbackPath}`, error);
            textureLoader.load(fallbackPath, (fallbackTexture) => {
                this.configureTerrainTexture(fallbackTexture, maxAnisotropy);
                texture.image = fallbackTexture.image;
                texture.needsUpdate = true;
            }, undefined, (fallbackError) => {
                console.warn(`[ThreeGame] Failed to load terrain fallback texture from ${fallbackPath}`, fallbackError);
            });
        });

        this.configureTerrainTexture(texture, maxAnisotropy);
        return texture;
    }

    createBiomeTerrainTextures(textureLoader, maxAnisotropy = 1) {
        const textures = {};

        for (const biomeKey of BIOME_ORDER) {
            const config = BIOME_TERRAIN_TEXTURE_PATHS[biomeKey];
            const fallback = config?.fallback ?? null;
            textures[biomeKey] = {
                floorBase: this.loadTerrainTexture(config.floorBase, textureLoader, maxAnisotropy, fallback?.floorBase),
                floorGrunge: this.loadTerrainTexture(config.floorGrunge, textureLoader, maxAnisotropy, fallback?.floorGrunge),
                floorDetail: this.loadTerrainTexture(config.floorDetail, textureLoader, maxAnisotropy, fallback?.floorDetail),
                wallSide: this.loadTerrainTexture(config.wallSide, textureLoader, maxAnisotropy, fallback?.wallSide),
                wallTop: this.loadTerrainTexture(config.wallTop, textureLoader, maxAnisotropy, fallback?.wallTop),
                wallGrunge: this.loadTerrainTexture(config.wallGrunge, textureLoader, maxAnisotropy, fallback?.wallGrunge)
            };
        }

        return textures;
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
        this.updateBiomeEnvironment({ delta });
        this.updateWeaponState(delta);
        this.updateProjectiles(delta);
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
            if (ship.safeRing) {
                ship.safeRing.material.opacity = 0.1 + Math.sin(now * 0.003 + 1.1) * 0.03;
            }

            const consoleX = ship.tileX + ship.consoleOffset.x;
            const consoleZ = ship.tileZ + ship.consoleOffset.z;
            const dx = this.player.position.x - consoleX;
            const dz = this.player.position.z - consoleZ;
            const distance = Math.hypot(dx, dz);

            if (distance < 3.0 && distance < minDistance) {
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

    tryInteractWithConsolePointer(clientX, clientY) {
        const ship = this.activeInteractiveConsole;
        if (!ship || !this.inputEnabled) return false;

        const modal = document.getElementById('console-terminal-modal');
        if (modal && !modal.classList.contains('hidden')) {
            return false;
        }

        const worldPoint = this.getWorldAimPoint(clientX, clientY);
        if (!worldPoint) return false;

        const consoleX = ship.tileX + ship.consoleOffset.x;
        const consoleZ = ship.tileZ + ship.consoleOffset.z;
        const distToConsole = Math.hypot(worldPoint.x - consoleX, worldPoint.z - consoleZ);
        const distToShipCore = Math.hypot(worldPoint.x - ship.tileX, worldPoint.z - ship.tileZ);

        if (distToConsole <= 1.25 || distToShipCore <= Math.max(0.95, ship.width * 0.72)) {
            this.interactWithConsole();
            return true;
        }

        return false;
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
            total: health + weapon + coin
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

    getEffectiveCost(cost = {}) {
        if (this.playerType !== 'ENGINEER') return cost;
        const discount = ENGINEER_CONSOLE_DISCOUNT;
        return {
            med:  Number.isFinite(cost.med)  ? Math.max(1, Math.ceil(cost.med  * discount)) : 0,
            ammo: Number.isFinite(cost.ammo) ? Math.max(1, Math.ceil(cost.ammo * discount)) : 0,
            tech: Number.isFinite(cost.tech) ? Math.max(1, Math.ceil(cost.tech * discount)) : 0,
            coin: Number.isFinite(cost.coin) ? Math.max(1, Math.ceil(cost.coin * discount)) : 0
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

        const effectiveCost = this.getEffectiveCost(generatorState.nextUpgrade.cost);
        const affordable = this.bank.canAfford(effectiveCost);
        if (!affordable) {
            return {
                stateClass: 'btn-state--insufficient',
                label: `NEED ${this.formatResourceCost(effectiveCost)}`,
                enabled: false
            };
        }

        return {
            stateClass: 'btn-state--available',
            label: generatorState.level === 0 ? 'REPAIR GENERATOR' : 'UPGRADE FIELD RADIUS',
            enabled: true
        };
    }

    getGoalCardButtonState({ unlocked, prereqMet, affordable }) {
        if (unlocked) {
            return {
                stateClass: 'btn-state--online',
                label: 'ONLINE',
                enabled: false
            };
        }

        if (!prereqMet) {
            return {
                stateClass: 'btn-state--locked',
                label: 'LOCKED',
                enabled: false
            };
        }

        if (!affordable) {
            return {
                stateClass: 'btn-state--insufficient',
                label: 'INSUFFICIENT RESOURCES',
                enabled: false
            };
        }

        return {
            stateClass: 'btn-state--available',
            label: 'INITIATE BUILD',
            enabled: true
        };
    }

    renderGoalCard(ship, bankState, cardConfig) {
        const rawCost = this.bank.getGoalCost(cardConfig.goalKey) ?? {};
        const cost = this.getEffectiveCost(rawCost);
        const unlocked = Boolean(bankState?.unlocks?.[cardConfig.goalKey]);
        const prereqMet = cardConfig.prereqKey
            ? Boolean(bankState?.unlocks?.[cardConfig.prereqKey])
            : true;
        const affordable = this.bank.canAfford(cost);
        const isDiscounted = this.playerType === 'ENGINEER';

        const statusEl = document.getElementById(cardConfig.statusId);
        if (statusEl) {
            if (unlocked) {
                statusEl.textContent = 'ONLINE';
            } else if (!prereqMet) {
                statusEl.textContent = cardConfig.lockedStatusText;
            } else if (!affordable) {
                statusEl.textContent = 'READY — RESOURCE DEFICIT';
            } else {
                statusEl.textContent = 'READY — BUILD PERMITTED';
            }
        }

        const costEl = document.getElementById(cardConfig.costId);
        if (costEl) {
            const discountTag = isDiscounted ? ' [ENG -20%]' : '';
            costEl.textContent = `COST: ${this.formatResourceCost(cost)}${discountTag}`;
        }

        const button = document.getElementById(cardConfig.buttonId);
        if (!button) return;

        const buttonState = this.getGoalCardButtonState({
            unlocked,
            prereqMet,
            affordable
        });

        button.textContent = buttonState.label;
        button.disabled = !buttonState.enabled;
        button.classList.remove('btn-state--online', 'btn-state--locked', 'btn-state--insufficient', 'btn-state--available');
        button.classList.add(buttonState.stateClass);

        if (button.dataset.listenerAttached === 'true') return;
        button.dataset.listenerAttached = 'true';
        button.addEventListener('click', () => this.attemptGoalUnlock(this.activeInteractiveConsole ?? ship, cardConfig));
    }

    updateGoalModuleVisualState(unlocks = this.unlocks) {
        const safeUnlocks = unlocks ?? {};
        const hullUnlocked = Boolean(safeUnlocks.hullExpansion);
        const radarUnlocked = Boolean(safeUnlocks.radarNode);
        const reactorUnlocked = Boolean(safeUnlocks.reactorCompressor);
        const hullOpacity = hullUnlocked ? UNLOCKED_MODULE_OPACITY : LOCKED_MODULE_OPACITY;
        const radarOpacity = radarUnlocked ? UNLOCKED_MODULE_OPACITY : LOCKED_MODULE_OPACITY;
        const reactorOpacity = reactorUnlocked ? UNLOCKED_MODULE_OPACITY : LOCKED_MODULE_OPACITY;

        if (this.goalModuleMaterials?.hullMatrix) {
            this.goalModuleMaterials.hullMatrix.opacity = hullOpacity;
            this.goalModuleMaterials.hullMatrix.needsUpdate = true;
        }
        if (this.goalModuleMaterials?.radarDish) {
            this.goalModuleMaterials.radarDish.opacity = radarOpacity;
            this.goalModuleMaterials.radarDish.needsUpdate = true;
        }
        if (this.goalModuleMaterials?.reactorCompressor) {
            this.goalModuleMaterials.reactorCompressor.opacity = reactorOpacity;
            this.goalModuleMaterials.reactorCompressor.needsUpdate = true;
        }
    }

    renderConsoleBanking(ship) {
        const inventory = this.getSessionInventory();
        const bankState = this.bank.getState();
        const generatorState = this.getO2GeneratorState(bankState);
        this.updateGoalModuleVisualState(bankState.unlocks);
        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = String(value);
        };

        setText('terminal-session-med', inventory.health);
        setText('terminal-session-tech', inventory.weapon);
        setText('terminal-session-coin', inventory.coin);
        const depositableTotal = (inventory.health ?? 0) + (inventory.weapon ?? 0) + (inventory.coin ?? 0);
        setText('terminal-bank-med', bankState.med);
        setText('terminal-bank-tech', bankState.tech);
        setText('terminal-bank-coin', bankState.coin);
        const totalBanked = (bankState.med ?? 0) + (bankState.tech ?? 0) + (bankState.coin ?? 0);
        setText('terminal-summary-run', depositableTotal);
        setText('terminal-summary-bank', totalBanked);
        setText('terminal-summary-hp', `${this.playerVitals.hp}/${this.playerVitals.maxHp}`);
        setText('terminal-summary-o2', `${Math.round(this.playerVitals.o2)}%`);
        const heartsFromMed = Math.floor(bankState.med / 10);
        setText('terminal-med-hearts', heartsFromMed > 0 ? `♥ ×${heartsFromMed} AVAILABLE` : `${bankState.med}/10 FOR ♥`);

        const hint = document.getElementById('terminal-bank-hint');
        if (hint) {
            if (depositableTotal > 0) {
                hint.textContent = 'DEPOSIT READY. RESOURCE TRANSFER CHANNEL OPEN.';
            } else {
                hint.textContent = 'DEPOSIT RESOURCES TO FUND O₂ REPAIRS.';
            }
        }

        const medkitBtn = document.getElementById('terminal-btn-medkit');
        const medkitStatus = document.getElementById('terminal-medkit-status');
        const medkitHint = document.getElementById('terminal-medkit-hint');
        const canConvertMed = bankState.med >= 10 && this.playerVitals.hp < this.playerVitals.maxHp;
        const heartsMissing = Math.max(0, this.playerVitals.maxHp - this.playerVitals.hp);
        const conversionsReady = Math.floor(bankState.med / 10);

        if (medkitStatus) {
            if (this.playerVitals.hp >= this.playerVitals.maxHp) {
                medkitStatus.textContent = 'HP FULL';
            } else if (bankState.med < 10) {
                medkitStatus.textContent = `${bankState.med}/10 MED`;
            } else {
                medkitStatus.textContent = `×${conversionsReady} AVAILABLE`;
            }
        }

        if (medkitHint) {
            if (this.playerVitals.hp >= this.playerVitals.maxHp) {
                medkitHint.textContent = 'EXOSUIT INTEGRITY IS FULL. NO CONVERSION NEEDED.';
            } else {
                medkitHint.textContent = `${heartsMissing} HEART${heartsMissing === 1 ? '' : 'S'} MISSING. ${conversionsReady} CONVERSION${conversionsReady === 1 ? '' : 'S'} AVAILABLE (${bankState.med} MED STORED).`;
            }
        }

        if (medkitBtn) {
            medkitBtn.disabled = !canConvertMed;
            medkitBtn.classList.toggle('btn-state--available', canConvertMed);
            medkitBtn.classList.toggle('btn-state--locked', !canConvertMed);
        }

        const statusEl = document.getElementById('terminal-o2-generator-status');
        if (statusEl) {
            statusEl.textContent = generatorState.isOnline
                ? `ONLINE // LVL ${generatorState.level}`
                : 'OFFLINE // REPAIR REQUIRED';
        }

        const costEl = document.getElementById('terminal-o2-generator-cost');
        if (costEl) {
            if (generatorState.nextUpgrade) {
                const effectiveCost = this.getEffectiveCost(generatorState.nextUpgrade.cost);
                const discountTag = this.playerType === 'ENGINEER' ? ' [ENG -20%]' : '';
                costEl.textContent = `NEXT COST: ${this.formatResourceCost(effectiveCost)}${discountTag}`;
            } else {
                costEl.textContent = 'NEXT COST: NONE';
            }
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

        for (const cardConfig of GOAL_CARD_CONFIGS) {
            this.renderGoalCard(ship, bankState, cardConfig);
        }

        const ticker = document.getElementById('terminal-status-ticker');
        if (ticker) {
            this._tickerRefreshTimer = (this._tickerRefreshTimer ?? 0) + 0.12;
            const shouldCycle = this._tickerRefreshTimer >= 6.0;
            if (shouldCycle) this._tickerRefreshTimer = 0;
            const message = this._buildTerminalTickerMessage(ship, bankState, generatorState, shouldCycle);
            if (ticker.textContent !== message) {
                ticker.textContent = message;
            }
        }
    }

    _buildTerminalTickerMessage(ship, bankState, generatorState, shouldCycle = false) {
        const biomeKey = this.currentBiomeKey ?? BIOME_KEYS.ACTIVE;
        const o2 = this.playerVitals?.o2 ?? 100;
        const hp = this.playerVitals?.hp ?? 3;
        const unlocks = bankState?.unlocks ?? {};
        const depthTier = this.currentDepthTier ?? 0;

        if (this.isPlayerDead) {
            return 'CRITICAL: EXOSUIT LIFE SUPPORT FAILURE. EMERGENCY REVIVAL PROTOCOL INITIATED.';
        }

        if (o2 <= 0) {
            return 'CRITICAL: O₂ RESERVES EXHAUSTED. SUIT INTEGRITY COMPROMISED. IMMEDIATE RETURN REQUIRED.';
        }

        if (o2 <= O2_DANGER_THRESHOLD) {
            const pct = Math.round(o2);
            return `WARNING: O₂ AT ${pct}%. EXOSUIT FILTERS FAILING. RETURN TO SHIP IMMEDIATELY.`;
        }

        if (!generatorState.isOnline) {
            const techNeeded = generatorState.nextUpgrade?.cost?.tech ?? 10;
            return `ALERT: O₂ GENERATOR OFFLINE. DEPOSIT ${techNeeded} TECH TO INITIATE FIELD REPAIR.`;
        }

        if (hp <= 1) {
            return 'WARNING: EXOSUIT HULL BREACH CRITICAL. SEEK MEDICAL SUPPLIES OR RETURN TO BASE.';
        }

        if (biomeKey === BIOME_KEYS.BIO) {
            const pool = [
                'CONTAMINATION ALERT: BIOHAZARD SPORE DENSITY CRITICAL. SUIT DECON FILTERS OVERLOADED.',
                'BIO SECTOR: ALIEN ORGANISM GROWTH DETECTED. PROCEED WITH EXTREME CAUTION.',
                `BIO SECTOR DEPTH ${depthTier}. LOOT DENSITY ELEVATED. OXYGEN DEMAND +30%.`
            ];
            if (!Number.isFinite(this._tickerBioIndex)) this._tickerBioIndex = 0;
            const msg = pool[this._tickerBioIndex % pool.length];
            if (shouldCycle) this._tickerBioIndex = (this._tickerBioIndex + 1) % pool.length;
            return msg;
        }

        if (biomeKey === BIOME_KEYS.CRYO) {
            const pool = [
                'THERMAL WARNING: CRYO SECTOR DETECTED. SUIT INSULATION LOAD ELEVATED BY 15%.',
                'CRYO SECTOR: RUPTURED COOLANT LINES DETECTED. FROZEN DEBRIS DENSITY HIGH.',
                `CRYO SECTOR DEPTH ${depthTier}. LOOT DENSITY ELEVATED. THERMAL DRAIN ACTIVE.`
            ];
            if (!Number.isFinite(this._tickerCryoIndex)) this._tickerCryoIndex = 0;
            const msg = pool[this._tickerCryoIndex % pool.length];
            if (shouldCycle) this._tickerCryoIndex = (this._tickerCryoIndex + 1) % pool.length;
            return msg;
        }

        if (generatorState.maxed) {
            if (unlocks.reactorCompressor) {
                return `ALL SYSTEMS NOMINAL. O₂ FIELD AT MAX RANGE [${generatorState.radius.toFixed(1)}u]. REACTOR EFFICIENCY OPTIMAL.`;
            }
            return `O₂ FIELD MAXED [${generatorState.radius.toFixed(1)}u]. REACTOR COMPRESSOR UPGRADE RECOMMENDED.`;
        }

        if (unlocks.hullExpansion) {
            return `HULL MATRIX ACTIVE. STRUCTURAL INTEGRITY ENHANCED. O₂ FIELD RADIUS ${generatorState.radius.toFixed(1)}u.`;
        }

        const fallback = [
            'BUNKER PERIMETER SCAN NOMINAL. TACTICAL NETWORK UPLINK STABLE.',
            'RESOURCE CACHES DETECTED WITHIN OPERATIONAL RANGE. CONTINUE EXTRACTION.',
            `MOTHERSHIP MONITORING ACTIVE. DEPTH TIER: ${DEPTH_TIER_NAMES[depthTier] ?? 'SURFACE'}. STAY VIGILANT.`,
            `O₂ FIELD ACTIVE [${generatorState.radius.toFixed(1)}u]. REFILL RATE: ${generatorState.refillRate?.toFixed(1) ?? '0.0'}%/s.`
        ];
        if (!Number.isFinite(this._tickerFallbackIndex)) this._tickerFallbackIndex = 0;
        const msg = fallback[this._tickerFallbackIndex % fallback.length];
        if (shouldCycle) this._tickerFallbackIndex = (this._tickerFallbackIndex + 1) % fallback.length;
        return msg;
    }

    handleDepositAll(ship) {
        const inventory = this.getSessionInventory();
        const depositPayload = {
            med: Math.max(0, Math.floor(inventory.health ?? 0)),
            tech: Math.max(0, Math.floor(inventory.weapon ?? 0)),
            coin: Math.max(0, Math.floor(inventory.coin ?? 0))
        };
        const depositableTotal = depositPayload.med + depositPayload.tech + depositPayload.coin;

        if (depositableTotal <= 0) {
            window.AudioManager?.play('ui_error', { volume: 0.58 });
            this.renderConsoleBanking(ship);
            return;
        }

        this.bank.deposit(depositPayload);
        window.consumeSessionInventoryForDeposit?.({
            health: depositPayload.med,
            weapon: depositPayload.tech,
            coin: depositPayload.coin
        });
        window.AudioManager?.play('ui_click', { volume: 0.62 });
        this.renderConsoleBanking(ship);
    }

    attemptGoalUnlock(ship, cardConfig) {
        const rawCost = this.bank.getGoalCost(cardConfig.goalKey);
        if (!rawCost) {
            window.AudioManager?.play('ui_error', { volume: 0.58 });
            this.renderConsoleBanking(ship);
            return;
        }
        const cost = this.getEffectiveCost(rawCost);
        const prereqKey = cardConfig.prereqKey;
        const prereqMet = !prereqKey || Boolean(this.bank.getState()?.unlocks?.[prereqKey]);
        const alreadyUnlocked = Boolean(this.bank.getState()?.unlocks?.[cardConfig.goalKey]);
        if (alreadyUnlocked || !prereqMet || !this.bank.canAfford(cost)) {
            window.AudioManager?.play('ui_error', { volume: 0.58 });
            this.renderConsoleBanking(ship);
            return;
        }

        if (!this.bank.spend(cost)) {
            window.AudioManager?.play('ui_error', { volume: 0.58 });
            this.renderConsoleBanking(ship);
            return;
        }

        const unlocked = this.bank.setUnlock(cardConfig.goalKey);
        if (!unlocked) {
            this.bank.deposit(cost);
            window.AudioManager?.play('ui_error', { volume: 0.58 });
            this.renderConsoleBanking(ship);
            return;
        }

        this.syncPersistentUpgrades();
        this.emitVitalsState();
        window.AudioManager?.play('class_lock', { volume: 0.55 });
        this.renderConsoleBanking(ship);
    }

    attemptO2GeneratorUpgrade(ship) {
        const generatorState = this.getO2GeneratorState();
        const nextUpgrade = generatorState.nextUpgrade;
        let upgrade;
        if (nextUpgrade && this.playerType === 'ENGINEER') {
            const discountedCost = this.getEffectiveCost(nextUpgrade.cost);
            if (!this.bank.canAfford(discountedCost)) {
                window.AudioManager?.play('ui_error', { volume: 0.58 });
                this.renderConsoleBanking(ship);
                return;
            }
            if (!this.bank.spend(discountedCost)) {
                window.AudioManager?.play('ui_error', { volume: 0.58 });
                this.renderConsoleBanking(ship);
                return;
            }
            upgrade = this.bank.markO2GeneratorLevelOnly(nextUpgrade.level);
        } else {
            upgrade = this.bank.upgradeO2Generator();
        }
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

    attemptMedConversion(ship) {
        const bankState = this.bank.getState();
        if (bankState.med < 10 || this.playerVitals.hp >= this.playerVitals.maxHp) {
            window.AudioManager?.play('ui_error', { volume: 0.55 });
            return;
        }

        if (!this.bank.spend({ med: 10 })) {
            window.AudioManager?.play('ui_error', { volume: 0.55 });
            return;
        }

        this.healPlayer(1);
        window.AudioManager?.play('ui_click', { volume: 0.55, playbackRate: 1.08 });
        window.AudioManager?.play('ui_scan_ping', { volume: 0.3, playbackRate: 0.85 });
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

        const medkitBtn = document.getElementById('terminal-btn-medkit');
        if (medkitBtn) {
            medkitBtn.onclick = () => this.attemptMedConversion(ship);
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
        this.updateGoalModuleVisualState(this.unlocks);
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
        const unlocks = this.unlocks ?? this.bank.getUnlocks();

        if (this.crashedShips) {
            for (const ship of this.crashedShips) {
                const isActiveShip = ship.type === this.playerType;
                const o2ModuleOnline = isActiveShip && generatorState.isOnline;
                const hullOnline = isActiveShip && Boolean(unlocks.hullExpansion);
                const radarOnline = isActiveShip && Boolean(unlocks.radarNode);
                const reactorOnline = isActiveShip && Boolean(unlocks.reactorCompressor);
                if (ship.o2ModuleSprite) {
                    ship.o2ModuleSprite.visible = o2ModuleOnline;
                }
                if (ship.o2ModuleShadow) {
                    ship.o2ModuleShadow.visible = o2ModuleOnline;
                }
                if (ship.hullModuleSprite) {
                    ship.hullModuleSprite.visible = hullOnline;
                }
                if (ship.hullModuleShadow) {
                    ship.hullModuleShadow.visible = hullOnline;
                }
                if (ship.radarModuleSprite) {
                    ship.radarModuleSprite.visible = radarOnline;
                }
                if (ship.radarModuleShadow) {
                    ship.radarModuleShadow.visible = radarOnline;
                }
                if (ship.reactorModuleSprite) {
                    ship.reactorModuleSprite.visible = reactorOnline;
                }
                if (ship.reactorModuleShadow) {
                    ship.reactorModuleShadow.visible = reactorOnline;
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

    emitWeaponClipState() {
        const reloadProgress = this.weaponReloading
            ? Math.max(0, Math.min(1, 1 - (this.weaponReloadTimer / WEAPON_RELOAD_DURATION)))
            : 0;
        window.dispatchEvent(new CustomEvent('weapon-clip-updated', {
            detail: {
                clip: this.weaponClipAmmo,
                maxClip: WEAPON_CLIP_SIZE,
                cache: this.getAvailableAmmo(),
                reloading: this.weaponReloading,
                reloadProgress
            }
        }));
    }

    emitShipHealthState(ship = this.getActiveShip()) {
        const activeShip = ship ?? this.getActiveShip();
        if (!activeShip) return;
        window.dispatchEvent(new CustomEvent('ship-health-changed', {
            detail: {
                shipType: activeShip.type,
                hp: activeShip.hp,
                maxHp: activeShip.maxHp
            }
        }));
    }

    resetWeaponState({ emit = true } = {}) {
        for (const projectile of this.activeProjectiles) {
            projectile?.mesh?.parent?.remove(projectile.mesh);
            projectile?.mesh?.material?.dispose?.();
            projectile?.mesh?.geometry?.dispose?.();
        }
        this.weaponClipAmmo = WEAPON_CLIP_SIZE;
        this.weaponReloading = false;
        this.weaponReloadTimer = 0;
        this.weaponFireCooldown = 0;
        this.activeProjectiles = [];
        if (emit) {
            this.emitWeaponClipState();
        }
    }

    isInsideNoFireZone() {
        const activeShip = this.getActiveShip();
        if (!activeShip || !this.player) return false;

        const shipDist = Math.hypot(
            this.player.position.x - activeShip.tileX,
            this.player.position.z - activeShip.tileZ
        );
        if (shipDist <= SHIP_NO_FIRE_RADIUS) {
            return true;
        }

        const generatorState = this.getO2GeneratorState();
        if (!generatorState.isOnline) {
            return false;
        }

        return this.getActiveO2GeneratorDistance() <= generatorState.radius;
    }

    damageShip(ship, amount = 1, reason = 'impact') {
        if (!ship) return;
        const prevHp = Number.isFinite(ship.hp) ? ship.hp : ship.maxHp;
        ship.hp = Math.max(0, prevHp - Math.max(0, amount));
        if (ship.hp === prevHp) return;
        if (reason !== 'friendly-fire') this.triggerCameraShake(0.12, 0.25);

        if (ship.type === this.playerType) {
            this.emitShipHealthState(ship);
        }

        window.dispatchEvent(new CustomEvent('ship-damaged', {
            detail: {
                shipType: ship.type,
                amount: prevHp - ship.hp,
                hp: ship.hp,
                maxHp: ship.maxHp,
                reason
            }
        }));

        if (ship.hp <= 0 && ship.type === this.playerType) {
            this.handleDeath('ship-destroyed');
        }
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

        this.triggerCameraShake(0.22, 0.4);
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
        this.chunkCache.clear();
        this._chunkRoomTypeCache?.clear();
        this.pendingChunkMounts = [];
        this.pendingChunkMountKeys.clear();
        this.wallMeshes = [];
        this.pickupMeshes = [];
        this.scatterSprites = [];
    }

    respawnPlayer({ resetRunState = true, skipEffects = false } = {}) {
        this.resetVitalsForRun({ emit: false });
        this.resetWeaponState({ emit: false });
        this.mouseAimActive = false;
        this.hasActiveAim = false;
        this._aimResetTimer = 0;
        this.aimWorldPoint = null;
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
            this.totalDistanceTravelled = 0;
            this.maxDepthTierReached = 0;
            this.currentDepthTier = 0;
            this.snailsKilledThisRun = 0;
            this.visitedChunks = new Set();
            if (this.crashedShips) {
                for (const ship of this.crashedShips) {
                    ship.hp = ship.maxHp;
                }
            }
            window.resetPickupCounter?.();
            this.depletedGearPileKeys.clear();
            this.clearLoadedChunksForRunReset();
            this.syncVisibleChunks(true);
            this.emitDepthTierChanged(0);
        }

        this.ensureO2BubbleVisualState();
        this.updateBiomeEnvironment({ immediate: true, forceEvent: true });
        if (!skipEffects) {
            this.spawnShipPoofEffect(spawn.x, spawn.y, PLAYER_COLORS[this.playerType] ?? 0xffffff);
        }

        this.emitVitalsState();
        this.emitWeaponClipState();
        this.emitShipHealthState();
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

        if (inBubble && !this._wasInBubble) {
            window.AudioManager?.play('ui_scan_ping', { volume: 0.22, playbackRate: 0.72, bus: 'sfx' });
        }
        this._wasInBubble = inBubble;

        if (inBubble) {
            const refillRate = reactorUpgrade
                ? generatorState.refillRate * 1.2
                : generatorState.refillRate;
            this.playerVitals.o2 = Math.min(100, this.playerVitals.o2 + refillRate * delta);
            this.playerVitals.o2HealthTimer = 0;
        } else {
            let drainRate = O2_DRAIN_RATE_PCT_PER_SEC
                * (this.o2DrainMult ?? 1.0)
                * (this.currentBiomeO2DrainMult ?? 1.0);
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
            const prevX = this.player.position.x;
            const prevZ = this.player.position.z;

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

            const dx = this.player.position.x - prevX;
            const dz = this.player.position.z - prevZ;
            this.totalDistanceTravelled += Math.sqrt(dx * dx + dz * dz);
        }

        this.updatePlayerSpriteAnimation(screenAxisX, screenAxisZ, delta, isMoving);
        this.playerGlow.position.set(this.player.position.x, 1.6, this.player.position.z);
        this.playerMarker.position.set(this.player.position.x, this.playerMarkerHeight, this.player.position.z);

        if (isMoving) {
            this.footstepTimer += delta;
            const stepInterval = 0.38 + (this.moveSpeed > 4 ? -0.08 : this.moveSpeed < 3 ? 0.08 : 0);
            if (this.footstepTimer >= stepInterval) {
                this.footstepTimer = 0;
                const footRate = 1.6 + Math.random() * 0.3;
                window.AudioManager?.play('amb_metal_stress', { volume: 0.055, playbackRate: footRate });
            }
        } else {
            this.footstepTimer = 0;
        }
    }

    onNewChunkDiscovered(chunkX, chunkY) {
        const biomeKey = this.getBiomeKeyForWorldPosition(
            chunkX * this.chunkSize + this.chunkSize * 0.5,
            chunkY * this.chunkSize + this.chunkSize * 0.5
        );
        const depthTier = getDepthTier(chunkX, chunkY);
        if (depthTier >= 1) {
            const drips = ['amb_drip1', 'amb_drip2', 'amb_drip3', 'amb_drip4'];
            const pick = drips[Math.floor(Math.random() * drips.length)];
            const vol = 0.08 + depthTier * 0.04 + (biomeKey === 'cryo' ? 0.05 : 0);
            setTimeout(() => {
                window.AudioManager?.play(pick, { volume: vol, playbackRate: 0.82 + Math.random() * 0.36, bus: 'world' });
            }, 200 + Math.random() * 400);
        }
    }

    getDepthTier(chunkX, chunkY) {
        return getDepthTier(chunkX, chunkY);
    }

    getDepthTierName(depthTier) {
        const index = Math.max(0, Math.min(DEPTH_TIER_NAMES.length - 1, Math.floor(depthTier)));
        return DEPTH_TIER_NAMES[index];
    }

    getDepthLootConfigForWorldPosition(worldX, worldZ) {
        const chunkX = Math.floor(worldX / this.chunkSize);
        const chunkY = Math.floor(worldZ / this.chunkSize);
        return getDepthLootConfig(this.getDepthTier(chunkX, chunkY));
    }

    getBiomeAnchorPosition() {
        const ship = this.getActiveShip();
        if (ship) {
            return { x: ship.tileX, z: ship.tileZ };
        }

        const spawn = this.getSpawnTile();
        return { x: spawn.x, z: spawn.y };
    }

    getBiomeMixValues(distanceFromAnchor) {
        const distance = Number.isFinite(distanceFromAnchor) ? Math.max(0, distanceFromAnchor) : 0;
        const cryoMix = THREE.MathUtils.clamp(
            THREE.MathUtils.smoothstep(
                distance,
                BIOME_THRESHOLD_CRYO - BIOME_BLEND_HALF_WIDTH,
                BIOME_THRESHOLD_CRYO + BIOME_BLEND_HALF_WIDTH
            ),
            0,
            1
        );
        const bioMix = THREE.MathUtils.clamp(
            THREE.MathUtils.smoothstep(
                distance,
                BIOME_THRESHOLD_BIO - BIOME_BLEND_HALF_WIDTH,
                BIOME_THRESHOLD_BIO + BIOME_BLEND_HALF_WIDTH
            ),
            0,
            1
        );
        return { cryoMix, bioMix };
    }

    getBiomeKeyFromDistance(distanceFromAnchor) {
        if (distanceFromAnchor >= BIOME_THRESHOLD_BIO) {
            return BIOME_KEYS.BIO;
        }

        if (distanceFromAnchor >= BIOME_THRESHOLD_CRYO) {
            return BIOME_KEYS.CRYO;
        }

        return BIOME_KEYS.ACTIVE;
    }

    getBiomeKeyForWorldPosition(worldX, worldZ) {
        const anchor = this.getBiomeAnchorPosition();
        const distance = Math.hypot(worldX - anchor.x, worldZ - anchor.z);
        return this.getBiomeKeyFromDistance(distance);
    }

    getBiomeLabel(biomeKey = this.currentBiomeKey) {
        return BIOME_LABELS[biomeKey] ?? BIOME_LABELS[BIOME_KEYS.ACTIVE];
    }

    emitBiomeChanged(biomeKey, distanceFromAnchor = 0) {
        const key = BIOME_ORDER.includes(biomeKey) ? biomeKey : BIOME_KEYS.ACTIVE;
        window.dispatchEvent(new CustomEvent('biome-changed', {
            detail: {
                key,
                label: this.getBiomeLabel(key),
                distance: Math.round(distanceFromAnchor),
                o2DrainMultiplier: BIOME_O2_DRAIN_MULTIPLIERS[key] ?? 1,
                message: BIOME_NOTIFICATION_MESSAGES[key] ?? ''
            }
        }));
    }

    blendBiomeColor(activeHex, cryoHex, bioHex, cryoMix, bioMix, lowColor, highColor) {
        lowColor.setHex(activeHex).lerp(highColor.setHex(cryoHex), cryoMix);
        return lowColor.lerp(highColor.setHex(bioHex), bioMix);
    }

    updateBiomeLighting(cryoMix, bioMix, delta = 0.016, immediate = false) {
        if (!this.scene?.fog || !this.ambientLight || !this.directionalLight || !this.fillLight) {
            return;
        }

        const lerpAlpha = immediate
            ? 1
            : THREE.MathUtils.clamp(delta * 3.6, 0.04, 0.2);
        const blendedFog = this.blendBiomeColor(
            BIOME_LIGHTING[BIOME_KEYS.ACTIVE].fog,
            BIOME_LIGHTING[BIOME_KEYS.CRYO].fog,
            BIOME_LIGHTING[BIOME_KEYS.BIO].fog,
            cryoMix,
            bioMix,
            this.biomeLightingColors.fogA,
            this.biomeLightingColors.fogB
        );
        this.scene.fog.color.lerp(blendedFog, lerpAlpha);
        if (this.scene.background?.isColor) {
            this.scene.background.lerp(blendedFog, lerpAlpha * 0.85);
        }

        const blendedAmbient = this.blendBiomeColor(
            BIOME_LIGHTING[BIOME_KEYS.ACTIVE].ambient,
            BIOME_LIGHTING[BIOME_KEYS.CRYO].ambient,
            BIOME_LIGHTING[BIOME_KEYS.BIO].ambient,
            cryoMix,
            bioMix,
            this.biomeLightingColors.ambientA,
            this.biomeLightingColors.ambientB
        );
        this.ambientLight.color.lerp(blendedAmbient, lerpAlpha);

        const blendedDirectional = this.blendBiomeColor(
            BIOME_LIGHTING[BIOME_KEYS.ACTIVE].directional,
            BIOME_LIGHTING[BIOME_KEYS.CRYO].directional,
            BIOME_LIGHTING[BIOME_KEYS.BIO].directional,
            cryoMix,
            bioMix,
            this.biomeLightingColors.directionalA,
            this.biomeLightingColors.directionalB
        );
        this.directionalLight.color.lerp(blendedDirectional, lerpAlpha);

        const blendedHemiSky = this.blendBiomeColor(
            BIOME_LIGHTING[BIOME_KEYS.ACTIVE].hemisphereSky,
            BIOME_LIGHTING[BIOME_KEYS.CRYO].hemisphereSky,
            BIOME_LIGHTING[BIOME_KEYS.BIO].hemisphereSky,
            cryoMix,
            bioMix,
            this.biomeLightingColors.hemiSkyA,
            this.biomeLightingColors.hemiSkyB
        );
        this.fillLight.color.lerp(blendedHemiSky, lerpAlpha);

        const blendedHemiGround = this.blendBiomeColor(
            BIOME_LIGHTING[BIOME_KEYS.ACTIVE].hemisphereGround,
            BIOME_LIGHTING[BIOME_KEYS.CRYO].hemisphereGround,
            BIOME_LIGHTING[BIOME_KEYS.BIO].hemisphereGround,
            cryoMix,
            bioMix,
            this.biomeLightingColors.hemiGroundA,
            this.biomeLightingColors.hemiGroundB
        );
        this.fillLight.groundColor.lerp(blendedHemiGround, lerpAlpha);
    }

    updateBiomeEnvironment({ delta = 0.016, immediate = false, forceEvent = false } = {}) {
        if (!this.player) return;

        const anchor = this.getBiomeAnchorPosition();
        this.biomeShipAnchor.set(anchor.x, anchor.z);
        const distanceFromAnchor = Math.hypot(
            this.player.position.x - anchor.x,
            this.player.position.z - anchor.z
        );
        const { cryoMix, bioMix } = this.getBiomeMixValues(distanceFromAnchor);
        this.biomeMixState = { cryoMix, bioMix };

        if (this.floorShaderUniforms?.uShipWorldPos) {
            this.floorShaderUniforms.uShipWorldPos.value = this.biomeShipAnchor;
        }
        if (this.wallShaderUniforms?.uShipWorldPos) {
            this.wallShaderUniforms.uShipWorldPos.value = this.biomeShipAnchor;
        }

        this.updateBiomeLighting(cryoMix, bioMix, delta, immediate);

        const nextBiomeKey = this.getBiomeKeyFromDistance(distanceFromAnchor);
        this.currentBiomeO2DrainMult = BIOME_O2_DRAIN_MULTIPLIERS[nextBiomeKey] ?? 1;
        if (nextBiomeKey !== this.currentBiomeKey || forceEvent) {
            this.currentBiomeKey = nextBiomeKey;
            this.emitBiomeChanged(nextBiomeKey, distanceFromAnchor);
        }
    }

    emitDepthTierChanged(depthTier = this.maxDepthTierReached) {
        const tier = Math.max(0, Math.min(DEPTH_TIER_NAMES.length - 1, Math.floor(depthTier)));
        window.dispatchEvent(new CustomEvent('depth-tier-changed', {
            detail: {
                tier,
                label: this.getDepthTierName(tier)
            }
        }));
    }

    updateDepthTierProgress(chunkX, chunkY, { forceEmit = false } = {}) {
        const depthTier = this.getDepthTier(chunkX, chunkY);
        this.currentDepthTier = depthTier;

        if (depthTier > this.maxDepthTierReached) {
            this.maxDepthTierReached = depthTier;
            this.emitDepthTierChanged(depthTier);
            return;
        }

        if (forceEmit) {
            this.emitDepthTierChanged(this.maxDepthTierReached);
        }
    }

    getRunStats() {
        const bankState = this.bank.getState();
        const totalBanked = (bankState.med ?? 0) + (bankState.tech ?? 0) + (bankState.coin ?? 0);
        return {
            distanceTravelled: Math.round(this.totalDistanceTravelled),
            totalPickups: totalBanked,
            generatorLevel: this.bank.getO2GeneratorLevel(),
            depthTier: this.maxDepthTierReached,
            depthTierName: this.getDepthTierName(this.maxDepthTierReached),
            biomeKey: this.currentBiomeKey,
            biomeLabel: this.getBiomeLabel(this.currentBiomeKey),
            snailsKilled: this.snailsKilledThisRun ?? 0
        };
    }

    getBiomeState() {
        if (!this.player) {
            return {
                key: this.currentBiomeKey,
                label: this.getBiomeLabel(this.currentBiomeKey),
                distance: 0,
                o2DrainMultiplier: this.currentBiomeO2DrainMult
            };
        }

        const anchor = this.getBiomeAnchorPosition();
        const distance = Math.hypot(
            this.player.position.x - anchor.x,
            this.player.position.z - anchor.z
        );
        return {
            key: this.currentBiomeKey,
            label: this.getBiomeLabel(this.currentBiomeKey),
            distance,
            o2DrainMultiplier: this.currentBiomeO2DrainMult
        };
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
        if (this.hasActiveAim) {
            this.currentFacingRow = this.aimFacingRow;
        }
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

    updateWeaponState(delta) {
        if (this.weaponFireCooldown > 0) {
            this.weaponFireCooldown = Math.max(0, this.weaponFireCooldown - delta);
        }

        if (this.mouseAimActive && Number.isFinite(this.lastMouseClientX) && Number.isFinite(this.lastMouseClientY)) {
            this.updateAimFromClient(this.lastMouseClientX, this.lastMouseClientY, {
                keepMouseActive: true,
                persistDuration: 0
            });
        }

        if (!this.mouseAimActive && this._aimResetTimer > 0) {
            this._aimResetTimer = Math.max(0, this._aimResetTimer - delta);
            if (this._aimResetTimer === 0) {
                this.hasActiveAim = false;
            }
        }

        if (!this.weaponReloading) return;
        const previousTimer = this.weaponReloadTimer;
        this.weaponReloadTimer = Math.max(0, this.weaponReloadTimer - delta);
        if (this.weaponReloadTimer !== previousTimer) {
            this.emitWeaponClipState();
        }
        if (this.weaponReloadTimer > 0) return;

        this.weaponReloading = false;
        const availableAmmo = this.getAvailableAmmo();
        const missingAmmo = Math.max(0, WEAPON_CLIP_SIZE - this.weaponClipAmmo);
        const ammoLoaded = Math.min(missingAmmo, availableAmmo);
        if (ammoLoaded > 0) {
            this.weaponClipAmmo += ammoLoaded;
            window.dispatchEvent(new CustomEvent('player-consume-ammo-cache', { detail: { amount: ammoLoaded } }));
        }
        this.emitWeaponClipState();
        window.AudioManager?.play('ui_click', { volume: 0.28, playbackRate: 1.18 });
    }

    getAvailableAmmo() {
        return Number.isFinite(window.pickupCounterState?.ammo)
            ? Math.max(0, Math.floor(window.pickupCounterState.ammo))
            : 0;
    }

    startReload() {
        if (this.weaponReloading) return false;
        const availableAmmo = this.getAvailableAmmo();
        const missingAmmo = Math.max(0, WEAPON_CLIP_SIZE - this.weaponClipAmmo);
        const refillAmount = Math.min(missingAmmo, availableAmmo);
        if (refillAmount <= 0) return false;
        this.weaponReloading = true;
        this.weaponReloadTimer = WEAPON_RELOAD_DURATION;
        this.emitWeaponClipState();
        window.AudioManager?.play('door_gears_spin', { volume: 0.22, playbackRate: 1.22 });
        return true;
    }

    requestReload({ manual = false } = {}) {
        if (!this.inputEnabled || this.isPlayerDead) return false;
        if (this.weaponReloading) return false;

        const availableAmmo = this.getAvailableAmmo();
        if (availableAmmo < 1) {
            if (manual) {
                window.AudioManager?.play('ui_error', { volume: 0.45 });
                window.dispatchEvent(new CustomEvent('combat-no-ammo'));
            }
            return false;
        }

        const missingAmmo = Math.max(0, WEAPON_CLIP_SIZE - this.weaponClipAmmo);
        const refillAmount = Math.min(missingAmmo, availableAmmo);
        if (refillAmount <= 0) {
            if (manual) {
                window.AudioManager?.play('ui_error', { volume: 0.3, playbackRate: 1.05 });
            }
            return false;
        }

        return this.startReload();
    }

    tryFireWeapon(clientX, clientY) {
        if (!this.inputEnabled || this.isPlayerDead) return;

        if (this.isInsideNoFireZone()) {
            window.AudioManager?.play('ui_error', { volume: 0.42 });
            window.dispatchEvent(new CustomEvent('combat-no-fire-zone'));
            return;
        }

        if (this.weaponReloading) {
            window.AudioManager?.play('ui_error', { volume: 0.34, playbackRate: 1.05 });
            return;
        }
        if (this.weaponFireCooldown > 0) {
            return;
        }
        if (this.weaponClipAmmo <= 0) {
            const availableAmmo = this.getAvailableAmmo();
            if (availableAmmo < 1) {
                window.AudioManager?.play('ui_error', { volume: 0.45 });
                window.dispatchEvent(new CustomEvent('combat-no-ammo'));
                return;
            }
            this.requestReload();
            return;
        }

        const worldPoint = this.updateAimFromClient(clientX, clientY, {
            keepMouseActive: this._canvasPointerType === 'mouse',
            persistDuration: this._canvasPointerType === 'mouse' ? 0 : 2.0
        });

        if (!worldPoint && !this.hasActiveAim) return;

        const normX = this.aimDirX;
        const normZ = this.aimDirZ;
        if (!Number.isFinite(normX) || !Number.isFinite(normZ)) return;

        this.weaponClipAmmo = Math.max(0, this.weaponClipAmmo - 1);
        this.weaponFireCooldown = WEAPON_FIRE_COOLDOWN;
        this.emitWeaponClipState();

        this.spawnProjectile({
            x: this.player.position.x + normX * 0.62,
            z: this.player.position.z + normZ * 0.62,
            vx: normX * PROJECTILE_SPEED,
            vz: normZ * PROJECTILE_SPEED,
            ttl: PROJECTILE_TTL,
            damage: PROJECTILE_DAMAGE,
            radius: PROJECTILE_RADIUS
        });

        window.AudioManager?.play('ui_scan_ping', { volume: 0.34, playbackRate: 1.42 });

        if (this.weaponClipAmmo <= 0) {
            this.requestReload();
        }
    }

    spawnProjectile({
        x,
        z,
        vx,
        vz,
        ttl = PROJECTILE_TTL,
        damage = PROJECTILE_DAMAGE,
        radius = PROJECTILE_RADIUS
    }) {
        const group = new THREE.Group();
        const core = new THREE.Mesh(
            new THREE.SphereGeometry(radius, 8, 8),
            new THREE.MeshBasicMaterial({
                color: 0xffe08f,
                transparent: true,
                opacity: 0.95
            })
        );
        const glow = new THREE.Mesh(
            new THREE.SphereGeometry(radius * 2.8, 6, 6),
            new THREE.MeshBasicMaterial({
                color: 0xffaa22,
                transparent: true,
                opacity: 0.28,
                depthWrite: false
            })
        );
        core.renderOrder = 25;
        glow.renderOrder = 24;
        group.add(core, glow);
        group.position.set(x, 0.42, z);
        this.scene.add(group);

        this.activeProjectiles.push({
            mesh: group,
            vx,
            vz,
            ttl,
            damage,
            radius
        });
    }

    checkProjectileWallHit(projectile) {
        const speed = Math.hypot(projectile.vx, projectile.vz);
        if (speed <= 0.0001) return false;
        this._projRaycaster.set(
            new THREE.Vector3(projectile.mesh.position.x, 0.45, projectile.mesh.position.z),
            new THREE.Vector3(projectile.vx / speed, 0, projectile.vz / speed)
        );
        this._projRaycaster.far = Math.max(0.08, speed * 0.045);
        const hits = this._projRaycaster.intersectObjects(this.wallMeshes, false);
        return hits.length > 0;
    }

    checkProjectileShipHit(projectile) {
        if (!this.crashedShips) return null;
        for (const ship of this.crashedShips) {
            if (!ship.isVisible || ship.hp <= 0) continue;
            const dist = Math.hypot(
                projectile.mesh.position.x - ship.tileX,
                projectile.mesh.position.z - ship.tileZ
            );
            if (dist <= (ship.width * SHIP_HIT_RADIUS_MULT) + (projectile.radius ?? PROJECTILE_RADIUS)) {
                return ship;
            }
        }
        return null;
    }

    checkProjectileSnailHit(projectile) {
        for (const sprite of this.scatterSprites) {
            if (!sprite?.parent) continue;
            if (sprite.userData?.type !== 'cybersnail') continue;
            if (sprite.userData?.burstTriggered) continue;
            const dist = Math.hypot(
                projectile.mesh.position.x - sprite.position.x,
                projectile.mesh.position.z - sprite.position.z
            );
            if (dist <= SNAIL_HIT_RADIUS + (projectile.radius ?? PROJECTILE_RADIUS)) {
                return sprite;
            }
        }
        return null;
    }

    destroyProjectile(projectile) {
        if (!projectile?.mesh) return;
        projectile.mesh.parent?.remove(projectile.mesh);
        projectile.mesh.traverse?.((child) => {
            child.material?.dispose?.();
            child.geometry?.dispose?.();
        });
    }

    spawnProjectileImpactEffect(x, z) {
        const effect = new THREE.Group();
        for (let i = 0; i < 4; i++) {
            const spark = new THREE.Mesh(
                new THREE.CircleGeometry(0.04 + Math.random() * 0.04, 5),
                new THREE.MeshBasicMaterial({
                    color: 0xffe08f,
                    transparent: true,
                    opacity: 0.9,
                    depthWrite: false
                })
            );
            spark.rotation.x = -Math.PI / 2;
            spark.position.set((Math.random() - 0.5) * 0.1, 0.05 + Math.random() * 0.06, (Math.random() - 0.5) * 0.1);
            spark.renderOrder = 30;
            spark.userData = {
                vx: (Math.random() - 0.5) * 0.6,
                vz: (Math.random() - 0.5) * 0.6,
                vy: 0.18 + Math.random() * 0.14,
                growth: 0,
                isSpark: true
            };
            effect.add(spark);
        }
        effect.position.set(x, 0, z);
        effect.userData = { age: 0, duration: 0.18 };
        this.scene.add(effect);
        this.transientEffects.push(effect);
    }

    updateProjectiles(delta) {
        if (!this.activeProjectiles.length) return;
        const toRemove = new Set();

        for (const projectile of this.activeProjectiles) {
            projectile.ttl -= delta;
            if (projectile.ttl <= 0) {
                toRemove.add(projectile);
                continue;
            }

            projectile.mesh.position.x += projectile.vx * delta;
            projectile.mesh.position.z += projectile.vz * delta;

            if (this.checkProjectileWallHit(projectile)) {
                this.spawnProjectileImpactEffect(projectile.mesh.position.x, projectile.mesh.position.z);
                toRemove.add(projectile);
                continue;
            }

            const snail = this.checkProjectileSnailHit(projectile);
            if (snail) {
                this.damageSnail(snail, projectile.damage);
                toRemove.add(projectile);
                continue;
            }

            const ship = this.checkProjectileShipHit(projectile);
            if (ship) {
                this.damageShip(ship, projectile.damage, 'friendly-fire');
                toRemove.add(projectile);
            }
        }

        if (toRemove.size === 0) return;
        const survivors = [];
        for (const projectile of this.activeProjectiles) {
            if (toRemove.has(projectile)) {
                this.destroyProjectile(projectile);
                continue;
            }
            survivors.push(projectile);
        }
        this.activeProjectiles = survivors;
    }

    updateCamera(delta) {
        const target = new THREE.Vector3(
            this.player.position.x + this.cameraOffset.x,
            this.cameraOffset.y,
            this.player.position.z + this.cameraOffset.z
        );
        this.camera.position.lerp(target, 1 - Math.exp(-delta * 7));

        if (this._cameraShakeTimer > 0) {
            this._cameraShakeTimer -= delta;
            const intensity = this._cameraShakeIntensity * Math.max(0, this._cameraShakeTimer / 0.35);
            this.camera.position.x += (Math.random() - 0.5) * intensity;
            this.camera.position.z += (Math.random() - 0.5) * intensity;
        }

        this.camera.lookAt(this.player.position.x, 0.4, this.player.position.z);
    }

    triggerCameraShake(intensity = 0.18, duration = 0.35) {
        this._cameraShakeIntensity = Math.max(this._cameraShakeIntensity, intensity);
        this._cameraShakeTimer = Math.max(this._cameraShakeTimer, duration);
    }

    syncVisibleChunks(force = false) {
        const centerChunkX = Math.floor(this.player.position.x / this.chunkSize);
        const centerChunkY = Math.floor(this.player.position.z / this.chunkSize);
        this.updateDepthTierProgress(centerChunkX, centerChunkY);
        const needed = new Set();
        this.wallMeshes = [];
        this.pickupMeshes = [];
        this.scatterSprites = [];

        for (let chunkY = centerChunkY - this.visibleChunkRadius; chunkY <= centerChunkY + this.visibleChunkRadius; chunkY++) {
            for (let chunkX = centerChunkX - this.visibleChunkRadius; chunkX <= centerChunkX + this.visibleChunkRadius; chunkX++) {
                const key = `${chunkX},${chunkY}`;
                needed.add(key);
                const isNewChunk = !this.chunkMeshes.has(key) && !this.visitedChunks.has(key);
                if (force || !this.chunkMeshes.has(key)) {
                    this.queueChunkMount(chunkX, chunkY, centerChunkX, centerChunkY);
                }
                if (isNewChunk && !force) {
                    this.visitedChunks.add(key);
                    this.onNewChunkDiscovered(chunkX, chunkY);
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

        // Add subtle reward-cache glow lights in dead-end rooms
        const roomTypes = this.getRoomTypeGrid(chunkX, chunkY);
        if (roomTypes) {
            const biomeKey = this.getBiomeKeyForWorldPosition(
                chunkX * this.chunkSize + this.chunkSize * 0.5,
                chunkY * this.chunkSize + this.chunkSize * 0.5
            );
            const lightColor = biomeKey === 'cryo' ? 0x88aaff : biomeKey === 'bio' ? 0x66cc88 : 0xffcc66;
            const deadEndLights = [];
            for (let localY = 1; localY < this.chunkSize - 1; localY++) {
                for (let localX = 1; localX < this.chunkSize - 1; localX++) {
                    if (roomTypes[localY][localX] === ROOM_TYPES.DEAD_END) {
                        const wx = chunkX * this.chunkSize + localX;
                        const wz = chunkY * this.chunkSize + localY;
                        deadEndLights.push({ wx, wz });
                    }
                }
            }
            for (const { wx, wz } of deadEndLights.slice(0, 2)) {
                const deLight = new THREE.PointLight(lightColor, 1.1, 5, 2);
                deLight.position.set(wx, 1.4, wz);
                group.add(deLight);
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
        const depthTier = this.getDepthTier(chunkX, chunkY);
        const depthLootConfig = getDepthLootConfig(depthTier);
        const spawn = this.getSpawnTile();
        const roomTypes = this.getRoomTypeGrid(chunkX, chunkY);
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

                const roomType = roomTypes?.[localY]?.[localX] ?? ROOM_TYPES.CORRIDOR;
                candidates.push({
                    localX,
                    localY,
                    worldX,
                    worldZ,
                    roomType,
                    edgeDistance: Math.min(localX, localY, this.chunkSize - 1 - localX, this.chunkSize - 1 - localY)
                });
            }
        }

        if (candidates.length < 10) {
            return [];
        }

        const occupied = new Set();
        const placements = [];
        const basePlacements = Math.min(
            Math.max(5, Math.round(candidates.length * 0.08)),
            12
        );
        const totalPlacements = Math.min(
            candidates.length,
            Math.max(3, Math.round(basePlacements * depthLootConfig.pickupMultiplier))
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
                placements.push(this.buildPickupPlacement(point, random, depthLootConfig.legendaryBoost));
                cluster.clusterSize -= 1;
            }
        }

        let transitionsPlaced = 0;
        while (transitionsPlaced < transitionalTarget) {
            const sourceCluster = clusterTargets[Math.floor(random() * clusterTargets.length)];
            const point = this.selectTransitionCandidate(candidates, occupied, sourceCluster, random);
            if (!point) break;
            placements.push(this.buildPickupPlacement(point, random, depthLootConfig.legendaryBoost));
            transitionsPlaced += 1;
        }

        let straysPlaced = 0;
        while (straysPlaced < strayTarget) {
            const point = this.selectStrayCandidate(candidates, occupied, clusterTargets, random);
            if (!point) break;
            placements.push(this.buildPickupPlacement(point, random, depthLootConfig.legendaryBoost));
            straysPlaced += 1;
        }

        // Dead-end reward rooms: guaranteed extra pickups at any dead-end tiles in this chunk.
        // Dead ends are branching paths worth exploring — payoff the player for detouring.
        const deadEndCandidates = candidates.filter((c) => c.roomType === ROOM_TYPES.DEAD_END);
        for (const de of deadEndCandidates) {
            const key = `${de.localX},${de.localY}`;
            if (occupied.has(key)) continue;
            const extraCount = 2 + Math.floor(random() * 2);
            for (let i = 0; i < extraCount; i++) {
                const nearKey = `${de.localX + Math.round((random() - 0.5))},${de.localY + Math.round((random() - 0.5))}`;
                if (occupied.has(nearKey)) continue;
                occupied.add(nearKey);
                placements.push(this.buildPickupPlacement(de, random, depthLootConfig.legendaryBoost + 0.08));
            }
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

    buildPickupPlacement(candidate, random, legendaryBoost = 0) {
        const type = this.choosePickupTypeForRoom(random, candidate.roomType);
        const rarity = this.chooseLootRarity(random, legendaryBoost);
        const scale = type === 'weapon'
            ? 0.9 + random() * 0.3
            : 0.82 + random() * 0.24;

        return {
            ...candidate,
            type,
            rarity,
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
        const roomTypes = this.getRoomTypeGrid(chunkX, chunkY);
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
        const chunkCenterX = chunkX * this.chunkSize + (this.chunkSize * 0.5);
        const chunkCenterZ = chunkY * this.chunkSize + (this.chunkSize * 0.5);
        const biomeKey = this.getBiomeKeyForWorldPosition(chunkCenterX, chunkCenterZ);
        const biomeVariants = BIOME_SCATTER_VARIANTS[biomeKey] ?? BIOME_SCATTER_VARIANTS[BIOME_KEYS.ACTIVE];
        const allowJunkPiles = biomeKey === BIOME_KEYS.ACTIVE;

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
        let snailCount = 0;
        const depthTierForScatter = this.getDepthTier(chunkX, chunkY);
        const snailSpawnConfig = SNAIL_DEPTH_SPAWN[Math.min(depthTierForScatter, SNAIL_DEPTH_SPAWN.length - 1)];
        const chunkBiomeKey = this.getBiomeKeyForWorldPosition(chunkCenterX, chunkCenterZ);
        for (const p of placements) {
            // Re-verify after relaxation that it's still walkable
            if (!isWalkable(p.x, p.z)) continue;

            // Determine asset type based on weighted roll.
            const roll = random();
            const distFromSpawn = Math.hypot(p.x - spawn.x, p.z - spawn.y);
            const localPX = Math.round(p.x - chunkX * this.chunkSize);
            const localPZ = Math.round(p.z - chunkY * this.chunkSize);
            const pRoomType = roomTypes?.[localPZ]?.[localPX] ?? null;
            const isDeadEnd = pRoomType === ROOM_TYPES.DEAD_END;
            const canSpawnSnail = distFromSpawn > 14 && snailCount < snailSpawnConfig.maxCount && !isDeadEnd;
            let type;
            let scaleMultiplier;
            let elevation;
            let opacity;
            if (canSpawnSnail && roll < snailSpawnConfig.chance) {
                type = 'cybersnail';
                scaleMultiplier = 1.05 + random() * 0.26;
                elevation = 0.09 + random() * 0.05;
                opacity = 1;
                snailCount += 1;
            } else if (allowJunkPiles && roll < 0.52) {
                type = this.chooseWeightedType(JUNK_SCATTER_VARIANTS, random);
                scaleMultiplier = 1.72 + random() * 0.34;
                // Keep junk piles visually grounded but high enough to avoid floor clipping artifacts.
                elevation = 0.13 + random() * 0.08;
                opacity = 1;
            } else {
                type = this.chooseWeightedType(biomeVariants, random);
                const isGroundCover = type.includes('puddle') || type === 'scatter_gravel';
                const isTallScatter = type === 'scatter_ice_stalagmite' || type === 'scatter_bio_pod';
                const isWreckage = type === 'ship_wreckage';
                if (isWreckage) {
                    scaleMultiplier = 1.05 + random() * 0.3;
                    elevation = 0.12 + random() * 0.08;
                    opacity = 0.92;
                } else if (isGroundCover) {
                    scaleMultiplier = 0.85 + random() * 0.28;
                    elevation = 0.05 + random() * 0.04;
                    opacity = 0.72 + random() * 0.14;
                } else if (isTallScatter) {
                    scaleMultiplier = 0.62 + random() * 0.24;
                    elevation = 0.8 + random() * 0.55;
                    opacity = 0.68 + random() * 0.22;
                } else {
                    scaleMultiplier = 0.42 + random() * 0.1;
                    elevation = 1.45 + random() * 0.95;
                    opacity = 0.58 + random() * 0.16;
                }
            }

            // Prevent junk piles from spawning too close to each other.
            if (type.startsWith('bunker_junk')) {
                const tooCloseToOtherJunk = junkPlacementAnchors.some((anchor) => (
                    Math.hypot(p.x - anchor.x, p.z - anchor.z) < BUNKER_JUNK_MIN_SEPARATION
                ));

                if (tooCloseToOtherJunk) {
                    type = this.chooseWeightedType(biomeVariants, random);
                    scaleMultiplier = 0.58 + random() * 0.18;
                    elevation = 0.9 + random() * 0.7;
                    opacity = 0.62 + random() * 0.16;
                } else {
                    junkPlacementAnchors.push({ x: p.x, z: p.z });
                }
            }

            // Micro-variations
            // Scale variation (+- 25%)
            const scale = scaleMultiplier * (0.75 + random() * 0.5);
            // Tilt distortion
            const tiltX = type === 'cybersnail' ? 0 : (random() - 0.5) * 0.16;
            const tiltZ = type === 'cybersnail' ? 0 : (random() - 0.5) * 0.16;
            // Subtle rotation (0 to 2pi)
            const rotation = type === 'cybersnail' ? 0 : random() * Math.PI * 2;

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
                opacity,
                biomeTint: type === 'cybersnail' ? (SNAIL_BIOME_TINTS[chunkBiomeKey] ?? 0xffffff) : undefined,
                spawnedEnraged: type === 'cybersnail' && depthTierForScatter >= 3
            });
        }

        return finalPlacements;
    }

    createJunkBurstPickupPlacement(originX, originZ, targetX, targetZ, random, junkType = 'bunker_junk') {
        const depthLootConfig = this.getDepthLootConfigForWorldPosition(originX, originZ);
        const rarity = this.chooseLootRarityForJunkType(junkType, random, depthLootConfig.legendaryBoost);
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

        if (placement.type === 'cybersnail') {
            if (!this.snailsEnabled) return null;
            const snailMaterial = this.scatterMaterials.cybersnail;
            if (!snailMaterial) return null;
            const clonedMat = snailMaterial.clone();
            clonedMat.rotation = 0;
            clonedMat.alphaTest = 0.06;
            const tintColor = placement.biomeTint ?? 0xffffff;
            clonedMat.color.setHex(tintColor);

            const isPreEnraged = Boolean(placement.spawnedEnraged);
            const sprite = new THREE.Sprite(clonedMat);
            sprite.center.set(0.5, 0);
            sprite.position.set(placement.x, placement.elevation, placement.z);
            sprite.frustumCulled = false;
            sprite.renderOrder = 6;
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
                baseOpacity: placement.opacity ?? 1,
                hp: SNAIL_MAX_HP,
                maxHp: SNAIL_MAX_HP,
                speed: isPreEnraged ? SNAIL_ENRAGED_MOVE_SPEED : SNAIL_MOVE_SPEED,
                enraged: isPreEnraged,
                facingSign: 1,
                pathNodes: null,
                pathIndex: 0,
                pathGoalTileX: null,
                pathGoalTileZ: null,
                pathRetargetTimer: 0,
                aiMode: 'hunt',
                targetType: 'ship',
                attackCooldown: 0,
                biomeTint: tintColor
            };
            if (isPreEnraged) {
                clonedMat.color.setHex(SNAIL_ENRAGED_TINT);
            }
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

    sampleLootRarity(weightedEntries, random, legendaryBoost = 0) {
        const boost = Number.isFinite(legendaryBoost) ? Math.max(0, legendaryBoost) : 0;
        const sourceEntries = Array.isArray(weightedEntries) ? weightedEntries : [];
        const normalized = sourceEntries
            .map((entry) => ({
                key: entry?.key,
                weight: Number.isFinite(entry?.weight) ? Math.max(0, entry.weight) : 0
            }))
            .filter((entry) => typeof entry.key === 'string' && entry.weight > 0);

        if (normalized.length === 0) {
            return LOOT_RARITIES[0];
        }

        const totalWeight = normalized.reduce((sum, entry) => sum + entry.weight, 0);
        if (totalWeight <= 0) {
            return LOOT_RARITIES[0];
        }

        const normalizedWithLegend = [...normalized];
        if (!normalizedWithLegend.some((entry) => entry.key === 'legendary')) {
            normalizedWithLegend.push({ key: 'legendary', weight: 0 });
        }

        const normalizedByTotal = normalizedWithLegend.map((entry) => ({
            key: entry.key,
            weight: entry.weight / totalWeight
        }));
        const legendaryEntry = normalizedByTotal.find((entry) => entry.key === 'legendary');
        const currentLegendary = legendaryEntry?.weight ?? 0;
        const targetLegendary = Math.min(0.95, currentLegendary + boost);
        const remainingCurrent = Math.max(0, 1 - currentLegendary);
        const remainingTarget = Math.max(0, 1 - targetLegendary);
        const scale = remainingCurrent > 0 ? (remainingTarget / remainingCurrent) : 0;

        const adjusted = normalizedByTotal.map((entry) => {
            if (entry.key === 'legendary') {
                return { key: entry.key, weight: targetLegendary };
            }
            return { key: entry.key, weight: entry.weight * scale };
        }).filter((entry) => entry.weight > 0);

        const adjustedTotal = adjusted.reduce((sum, entry) => sum + entry.weight, 0);
        let roll = random() * adjustedTotal;

        for (const entry of adjusted) {
            roll -= entry.weight;
            if (roll <= 0) {
                return LOOT_RARITIES.find((rarity) => rarity.key === entry.key) ?? LOOT_RARITIES[0];
            }
        }

        return LOOT_RARITIES[0];
    }

    chooseLootRarity(random, legendaryBoost = 0) {
        const weighted = LOOT_RARITIES.map((entry) => ({ key: entry.key, weight: entry.weight }));
        return this.sampleLootRarity(weighted, random, legendaryBoost);
    }

    chooseLootRarityForJunkType(junkType, random, legendaryBoost = 0) {
        const weightedBias = JUNK_LOOT_BIAS[junkType];
        if (!weightedBias) {
            return this.chooseLootRarity(random, legendaryBoost);
        }

        return this.sampleLootRarity(weightedBias, random, legendaryBoost);
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
        const depthLootConfig = this.getDepthLootConfigForWorldPosition(originX, originZ);
        const baseItems = BUNKER_JUNK_DROP_COUNT_MIN + Math.floor(random() * (BUNKER_JUNK_DROP_COUNT_MAX - BUNKER_JUNK_DROP_COUNT_MIN + 1));
        const totalItems = Math.max(1, Math.round(baseItems * depthLootConfig.pickupMultiplier));
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

    choosePickupTypeForRoom(random, roomType) {
        const ROOM_PICKUP_BIAS = {
            [ROOM_TYPES.DEAD_END]: [
                { type: 'health', weight: 0.20 },
                { type: 'ammo',   weight: 0.20 },
                { type: 'weapon', weight: 0.34 },
                { type: 'coin',   weight: 0.26 }
            ],
            [ROOM_TYPES.CORRIDOR]: [
                { type: 'health', weight: 0.28 },
                { type: 'ammo',   weight: 0.52 },
                { type: 'weapon', weight: 0.12 },
                { type: 'coin',   weight: 0.08 }
            ],
            [ROOM_TYPES.CHAMBER]: [
                { type: 'health', weight: 0.32 },
                { type: 'ammo',   weight: 0.30 },
                { type: 'weapon', weight: 0.24 },
                { type: 'coin',   weight: 0.14 }
            ]
        };
        const weights = ROOM_PICKUP_BIAS[roomType] ?? PICKUP_TYPES;
        const totalWeight = weights.reduce((s, e) => s + e.weight, 0);
        let roll = random() * totalWeight;
        for (const entry of weights) {
            roll -= entry.weight;
            if (roll <= 0) return entry.type;
        }
        return weights[weights.length - 1].type;
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
            } else if (pickup.userData.state === 'idle' && planarDistance <= this.pickupMagnetRadius) {
                pickup.userData.state = 'magnetized';
            } else if (pickup.userData.state === 'magnetized' && planarDistance > this.pickupMagnetRadius * 1.35) {
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
                const magnetStrength = 2.8 + (1 - Math.min(planarDistance / this.pickupMagnetRadius, 1)) * 6.2;
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

    createSnailDropPlacement(originX, originZ, targetX, targetZ, type = 'weapon') {
        const depthLootConfig = this.getDepthLootConfigForWorldPosition(originX, originZ);
        const rarity = this.chooseLootRarity(() => Math.random(), depthLootConfig.legendaryBoost + 0.08)
            ?? LOOT_RARITIES.find((entry) => entry.key === 'uncommon')
            ?? LOOT_RARITIES[0];
        return {
            worldX: targetX,
            worldZ: targetZ,
            type,
            rarity,
            scale: type === 'coin' ? 0.7 : 0.82,
            rotation: Math.random() * Math.PI * 2,
            tiltX: (Math.random() - 0.5) * 0.12,
            tiltZ: (Math.random() - 0.5) * 0.12,
            elevation: 0.18 + Math.random() * 0.08,
            offsetX: 0,
            offsetZ: 0,
            bobOffset: Math.random() * Math.PI * 2,
            shadowRadius: type === 'weapon' ? 0.3 : 0.24,
            collectLock: 0.34,
            ejectStartX: originX,
            ejectStartZ: originZ,
            ejectTargetX: targetX,
            ejectTargetZ: targetZ
        };
    }

    spawnSnailDrops(sprite) {
        const parent = sprite?.parent;
        if (!parent) return;
        const x = sprite.position.x;
        const z = sprite.position.z;
        const depthLootConfig = this.getDepthLootConfigForWorldPosition(x, z);
        const depthTier = Math.floor(depthLootConfig.pickupMultiplier);
        const wasEnraged = Boolean(sprite.userData.enraged);
        const baseDrops = wasEnraged ? ['weapon', 'weapon', 'ammo', 'coin'] : ['weapon', 'weapon', 'ammo'];
        const dropTypes = depthTier >= 2 ? [...baseDrops, 'ammo'] : baseDrops;
        let placed = 0;

        for (const type of dropTypes) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 0.45 + Math.random() * 0.32;
            const targetX = x + Math.cos(angle) * radius;
            const targetZ = z + Math.sin(angle) * radius;
            if (this.getTileType(Math.round(targetX), Math.round(targetZ)) === '#') {
                continue;
            }
            const placement = this.createSnailDropPlacement(x, z, targetX, targetZ, type);
            const pickup = this.createPickupInstance(placement);
            parent.add(pickup);
            this.pickupMeshes.push(pickup);
            placed += 1;
        }

        if (placed === 0) {
            const placement = this.createSnailDropPlacement(x, z, x, z, 'weapon');
            const pickup = this.createPickupInstance(placement);
            parent.add(pickup);
            this.pickupMeshes.push(pickup);
        }
    }

    damageSnail(sprite, amount = 1) {
        if (!sprite?.userData || sprite.userData.type !== 'cybersnail' || sprite.userData.burstTriggered) return;
        const previousHp = Number.isFinite(sprite.userData.hp) ? sprite.userData.hp : SNAIL_MAX_HP;
        const damage = Math.max(0, amount);
        if (damage <= 0) return;
        sprite.userData.hp = Math.max(0, previousHp - damage);
        if (sprite.userData.hp === previousHp) return;

        if (sprite.userData.hp === 1 && !sprite.userData.enraged) {
            sprite.userData.enraged = true;
            sprite.userData.speed = SNAIL_ENRAGED_MOVE_SPEED;
            sprite.userData.attackCooldown = Math.min(sprite.userData.attackCooldown ?? 0, 0.2);
            sprite.material?.color?.setHex(SNAIL_ENRAGED_TINT);
            window.AudioManager?.play('amb_metal_stress', { volume: 0.38, playbackRate: 1.55 });
        }

        if (sprite.userData.hp > 0) {
            window.AudioManager?.play('ui_scan_ping', { volume: 0.26, playbackRate: 0.65 });
            this._flashSnailHit(sprite);
            window.dispatchEvent(new CustomEvent('enemy-hit', {
                detail: {
                    type: 'cybersnail',
                    hp: sprite.userData.hp,
                    maxHp: sprite.userData.maxHp ?? SNAIL_MAX_HP,
                    enraged: Boolean(sprite.userData.enraged)
                }
            }));
            return;
        }

        sprite.userData.burstTriggered = true;
        sprite.userData.burstTimer = 0;
        this.snailsKilledThisRun = (this.snailsKilledThisRun ?? 0) + 1;
        this.spawnSnailDrops(sprite);
        this.spawnGearPoofEffect(sprite.position.x, sprite.position.z, 'bunker_junk_uncommon');
        window.AudioManager?.play('door_slam_vertical', { volume: 0.24, playbackRate: 1.16 });
        window.AudioManager?.play('ui_error', { volume: 0.2, playbackRate: 0.72 });
    }

    _flashSnailHit(sprite) {
        if (!sprite?.material?.color) return;
        const originalColor = sprite.userData.enraged ? SNAIL_ENRAGED_TINT : (sprite.userData.biomeTint ?? 0xffffff);
        sprite.material.color.setHex(0xffffff);
        setTimeout(() => {
            if (sprite?.material?.color && !sprite.userData.burstTriggered) {
                sprite.material.color.setHex(originalColor);
            }
        }, 80);
    }

    isSnailTileWalkable(tileX, tileZ) {
        return this.getTileType(tileX, tileZ) !== '#';
    }

    pickSnailWanderTile(sprite, target = null) {
        const originX = sprite.position.x;
        const originZ = sprite.position.z;
        const baseAngle = target
            ? Math.atan2(target.z - originZ, target.x - originX)
            : Math.random() * Math.PI * 2;

        for (let attempt = 0; attempt < 12; attempt += 1) {
            const angle = baseAngle + (Math.random() - 0.5) * Math.PI * (1.2 + attempt * 0.18);
            const distance = SNAIL_WANDER_DISTANCE_MIN + Math.random() * (SNAIL_WANDER_DISTANCE_MAX - SNAIL_WANDER_DISTANCE_MIN);
            const tileX = Math.round(originX + Math.cos(angle) * distance);
            const tileZ = Math.round(originZ + Math.sin(angle) * distance);
            if (this.isSnailTileWalkable(tileX, tileZ)) {
                return { x: tileX, z: tileZ };
            }
        }

        return null;
    }

    selectSnailTarget(sprite, activeShip) {
        const targets = [];
        if (this.player && !this.isPlayerDead) {
            targets.push({
                type: 'player',
                x: this.player.position.x,
                z: this.player.position.z
            });
        }
        if (activeShip && activeShip.hp > 0) {
            targets.push({
                type: 'ship',
                x: activeShip.tileX,
                z: activeShip.tileZ
            });
        }
        if (!targets.length) return null;

        for (const target of targets) {
            target.distance = Math.hypot(target.x - sprite.position.x, target.z - sprite.position.z);
        }
        targets.sort((a, b) => a.distance - b.distance);
        const nearest = targets[0];

        if (!sprite.userData.enraged && nearest.distance > SNAIL_WANDER_TARGET_DISTANCE) {
            const wanderTile = this.pickSnailWanderTile(sprite, nearest);
            if (wanderTile) {
                return {
                    ...nearest,
                    mode: 'wander',
                    goalX: wanderTile.x,
                    goalZ: wanderTile.z
                };
            }
        }

        return {
            ...nearest,
            mode: 'hunt',
            goalX: nearest.x,
            goalZ: nearest.z
        };
    }

    findSnailPath(startTileX, startTileZ, goalTileX, goalTileZ, nodeBudget = SNAIL_PATH_NODE_BUDGET) {
        const keyOf = (x, z) => `${x},${z}`;
        const parseKey = (key) => {
            const [x, z] = key.split(',');
            return { x: Number(x), z: Number(z) };
        };
        const heuristic = (ax, az, bx, bz) => Math.hypot(bx - ax, bz - az);
        const directions = [
            { dx: 1, dz: 0, cost: 1 },
            { dx: -1, dz: 0, cost: 1 },
            { dx: 0, dz: 1, cost: 1 },
            { dx: 0, dz: -1, cost: 1 },
            { dx: 1, dz: 1, cost: Math.SQRT2, diagonal: true },
            { dx: 1, dz: -1, cost: Math.SQRT2, diagonal: true },
            { dx: -1, dz: 1, cost: Math.SQRT2, diagonal: true },
            { dx: -1, dz: -1, cost: Math.SQRT2, diagonal: true }
        ];

        if (!this.isSnailTileWalkable(startTileX, startTileZ)) {
            return [{ x: startTileX, z: startTileZ }];
        }

        let resolvedGoalX = goalTileX;
        let resolvedGoalZ = goalTileZ;
        if (!this.isSnailTileWalkable(resolvedGoalX, resolvedGoalZ)) {
            const fallbackOffsets = [
                [1, 0], [-1, 0], [0, 1], [0, -1],
                [1, 1], [-1, 1], [1, -1], [-1, -1],
                [2, 0], [-2, 0], [0, 2], [0, -2]
            ];
            let fallback = null;
            let fallbackDist = Infinity;
            for (const [dx, dz] of fallbackOffsets) {
                const nx = resolvedGoalX + dx;
                const nz = resolvedGoalZ + dz;
                if (!this.isSnailTileWalkable(nx, nz)) continue;
                const dist = heuristic(startTileX, startTileZ, nx, nz);
                if (dist < fallbackDist) {
                    fallback = { x: nx, z: nz };
                    fallbackDist = dist;
                }
            }
            if (fallback) {
                resolvedGoalX = fallback.x;
                resolvedGoalZ = fallback.z;
            }
        }

        const startKey = keyOf(startTileX, startTileZ);
        const goalKey = keyOf(resolvedGoalX, resolvedGoalZ);
        if (startKey === goalKey) {
            return [{ x: startTileX, z: startTileZ }];
        }

        const openSet = [startKey];
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map([[startKey, 0]]);
        const fScore = new Map([[startKey, heuristic(startTileX, startTileZ, resolvedGoalX, resolvedGoalZ)]]);

        let explored = 0;
        let bestKey = startKey;
        let bestDistance = heuristic(startTileX, startTileZ, resolvedGoalX, resolvedGoalZ);

        while (openSet.length > 0 && explored < nodeBudget) {
            openSet.sort((a, b) => (fScore.get(a) ?? Infinity) - (fScore.get(b) ?? Infinity));
            const currentKey = openSet.shift();
            if (!currentKey) break;
            if (closedSet.has(currentKey)) continue;

            const current = parseKey(currentKey);
            const distanceToGoal = heuristic(current.x, current.z, resolvedGoalX, resolvedGoalZ);
            if (distanceToGoal < bestDistance) {
                bestDistance = distanceToGoal;
                bestKey = currentKey;
            }

            if (currentKey === goalKey) {
                bestKey = currentKey;
                break;
            }

            closedSet.add(currentKey);
            explored += 1;
            const currentG = gScore.get(currentKey) ?? Infinity;

            for (const dir of directions) {
                const nx = current.x + dir.dx;
                const nz = current.z + dir.dz;
                if (!this.isSnailTileWalkable(nx, nz)) continue;
                if (dir.diagonal) {
                    if (!this.isSnailTileWalkable(current.x + dir.dx, current.z) || !this.isSnailTileWalkable(current.x, current.z + dir.dz)) {
                        continue;
                    }
                }

                const neighborKey = keyOf(nx, nz);
                if (closedSet.has(neighborKey)) continue;
                const tentativeG = currentG + dir.cost;
                if (tentativeG >= (gScore.get(neighborKey) ?? Infinity)) continue;

                cameFrom.set(neighborKey, currentKey);
                gScore.set(neighborKey, tentativeG);
                const nextF = tentativeG + heuristic(nx, nz, resolvedGoalX, resolvedGoalZ);
                fScore.set(neighborKey, nextF);
                if (!openSet.includes(neighborKey)) {
                    openSet.push(neighborKey);
                }
            }
        }

        const pathKeys = [bestKey];
        let walkKey = bestKey;
        while (cameFrom.has(walkKey)) {
            walkKey = cameFrom.get(walkKey);
            pathKeys.push(walkKey);
        }
        pathKeys.reverse();

        return pathKeys.map((key) => {
            const point = parseKey(key);
            return { x: point.x, z: point.z };
        });
    }

    updateSnailBehavior(sprite, delta, activeShip) {
        const data = sprite.userData;
        data.attackCooldown = Math.max(0, (data.attackCooldown ?? 0) - delta);
        data.pathRetargetTimer = Math.max(0, (data.pathRetargetTimer ?? 0) - delta);

        const target = this.selectSnailTarget(sprite, activeShip);
        if (!target) return;

        const startTileX = Math.round(sprite.position.x);
        const startTileZ = Math.round(sprite.position.z);
        const goalTileX = Math.round(target.goalX);
        const goalTileZ = Math.round(target.goalZ);
        const targetChanged = data.pathGoalTileX !== goalTileX
            || data.pathGoalTileZ !== goalTileZ
            || data.aiMode !== target.mode
            || data.targetType !== target.type;
        const noPath = !Array.isArray(data.pathNodes) || data.pathNodes.length === 0 || data.pathIndex >= data.pathNodes.length;
        const shouldRepath = targetChanged || noPath || data.pathRetargetTimer <= 0;

        if (shouldRepath) {
            const previousMode = data.aiMode;
            const pathNodes = this.findSnailPath(startTileX, startTileZ, goalTileX, goalTileZ, SNAIL_PATH_NODE_BUDGET);
            data.pathNodes = pathNodes;
            data.pathIndex = pathNodes.length > 1 ? 1 : 0;
            data.pathGoalTileX = goalTileX;
            data.pathGoalTileZ = goalTileZ;
            data.aiMode = target.mode;
            data.targetType = target.type;
            if (previousMode !== 'hunt' && target.mode === 'hunt' && target.type === 'player') {
                window.AudioManager?.play('ui_scan_ping', { volume: 0.2, playbackRate: 0.55, bus: 'sfx' });
            }
            data.pathRetargetTimer = target.mode === 'hunt'
                ? SNAIL_PATH_RECALC_MIN + Math.random() * (SNAIL_PATH_RECALC_MAX - SNAIL_PATH_RECALC_MIN)
                : SNAIL_WANDER_RECALC_MIN + Math.random() * (SNAIL_WANDER_RECALC_MAX - SNAIL_WANDER_RECALC_MIN);
        }

        let moveTargetX = target.goalX;
        let moveTargetZ = target.goalZ;
        if (Array.isArray(data.pathNodes) && data.pathNodes.length > 0) {
            const index = Math.max(0, Math.min(data.pathIndex ?? 0, data.pathNodes.length - 1));
            const waypoint = data.pathNodes[index];
            moveTargetX = waypoint.x;
            moveTargetZ = waypoint.z;
            const waypointDistance = Math.hypot(moveTargetX - sprite.position.x, moveTargetZ - sprite.position.z);
            if (waypointDistance <= 0.22 && index < data.pathNodes.length - 1) {
                data.pathIndex = index + 1;
                const nextWaypoint = data.pathNodes[data.pathIndex];
                moveTargetX = nextWaypoint.x;
                moveTargetZ = nextWaypoint.z;
            } else {
                data.pathIndex = index;
            }
        }

        const toGoalX = moveTargetX - sprite.position.x;
        const toGoalZ = moveTargetZ - sprite.position.z;
        const moveDistance = Math.hypot(toGoalX, toGoalZ);
        if (moveDistance > 0.001) {
            const dirX = toGoalX / moveDistance;
            const dirZ = toGoalZ / moveDistance;
            const step = Math.min(moveDistance, (data.speed ?? SNAIL_MOVE_SPEED) * delta);
            const nextX = sprite.position.x + dirX * step;
            const nextZ = sprite.position.z + dirZ * step;

            if (this.isSnailTileWalkable(Math.round(nextX), Math.round(nextZ))) {
                sprite.position.x = nextX;
                sprite.position.z = nextZ;
            } else {
                data.pathRetargetTimer = 0;
                data.pathNodes = null;
            }

            const xTurnThreshold = 0.08;
            if (dirX <= -xTurnThreshold) {
                data.facingSign = -1;
            } else if (dirX >= xTurnThreshold) {
                data.facingSign = 1;
            }
            const facingSign = data.facingSign === -1 ? -1 : 1;
            sprite.scale.set(Math.abs(data.baseScaleX) * facingSign, data.baseScaleY, 1);
        }

        const distanceToTarget = Math.hypot(target.x - sprite.position.x, target.z - sprite.position.z);
        if (distanceToTarget <= SNAIL_ATTACK_RADIUS && data.attackCooldown <= 0) {
            data.attackCooldown = SNAIL_ATTACK_COOLDOWN;
            if (target.type === 'player') {
                this.takeDamage(1, 'snail');
            } else if (activeShip) {
                this.damageShip(activeShip, 1, 'snail');
            }
            window.AudioManager?.play('amb_metal_stress', { volume: 0.24, playbackRate: 1.1 });
        }
    }

    updateScatter(delta, now) {
        const time = now * 0.001;
        const activeShip = this.getActiveShip();

        this._threatAudioTimer = (this._threatAudioTimer ?? 0) - delta;
        if (this._threatAudioTimer <= 0 && this.player && !this.isPlayerDead) {
            let nearestHuntingSnail = Infinity;
            for (const child of this.scatterSprites) {
                if (child.userData?.type !== 'cybersnail') continue;
                if (child.userData?.burstTriggered) continue;
                if (child.userData?.aiMode !== 'hunt') continue;
                const dist = Math.hypot(this.player.position.x - child.position.x, this.player.position.z - child.position.z);
                if (dist < nearestHuntingSnail) nearestHuntingSnail = dist;
            }
            if (nearestHuntingSnail < 5.5) {
                window.AudioManager?.play('amb_metal_stress', { volume: 0.08 + (1 - nearestHuntingSnail / 5.5) * 0.06, playbackRate: 1.25, bus: 'sfx' });
                this._threatAudioTimer = 1.8;
            } else {
                this._threatAudioTimer = 0.5;
            }
        }

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
            } else if (child.userData.type === 'cybersnail') {
                child.position.y = child.userData.baseY + Math.sin(time * 4 + child.userData.phase) * 0.04;
                child.material.opacity = child.userData.baseOpacity;
                this.updateSnailBehavior(child, delta, activeShip);
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
                } else if (child.userData.type === 'cybersnail') {
                    const fadeDuration = 0.22;
                    const fadeT = Math.min(child.userData.burstTimer / fadeDuration, 1);
                    const burstScale = 1 + Math.sin(Math.min(child.userData.burstTimer * 11, Math.PI)) * 0.24;
                    const facingSign = child.scale.x < 0 ? -1 : 1;
                    child.scale.set(
                        child.userData.baseScaleX * facingSign * burstScale,
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

                const modulePositions = [
                    {
                        enabled: Boolean(ship.o2ModuleSprite?.visible),
                        x: Number.isFinite(ship.o2ModuleX)
                            ? ship.o2ModuleX
                            : ship.tileX + (ship.o2ModuleOffset?.x ?? O2_MODULE_OFFSET.x),
                        z: Number.isFinite(ship.o2ModuleZ)
                            ? ship.o2ModuleZ
                            : ship.tileZ + (ship.o2ModuleOffset?.z ?? O2_MODULE_OFFSET.z)
                    },
                    {
                        enabled: Boolean(ship.hullModuleSprite?.visible),
                        x: Number.isFinite(ship.hullModuleX)
                            ? ship.hullModuleX
                            : ship.tileX + (ship.hullModuleOffset?.x ?? MODULE_OFFSETS.hullMatrix.x),
                        z: Number.isFinite(ship.hullModuleZ)
                            ? ship.hullModuleZ
                            : ship.tileZ + (ship.hullModuleOffset?.z ?? MODULE_OFFSETS.hullMatrix.z)
                    },
                    {
                        enabled: Boolean(ship.radarModuleSprite?.visible),
                        x: Number.isFinite(ship.radarModuleX)
                            ? ship.radarModuleX
                            : ship.tileX + (ship.radarModuleOffset?.x ?? MODULE_OFFSETS.radarDish.x),
                        z: Number.isFinite(ship.radarModuleZ)
                            ? ship.radarModuleZ
                            : ship.tileZ + (ship.radarModuleOffset?.z ?? MODULE_OFFSETS.radarDish.z)
                    },
                    {
                        enabled: Boolean(ship.reactorModuleSprite?.visible),
                        x: Number.isFinite(ship.reactorModuleX)
                            ? ship.reactorModuleX
                            : ship.tileX + (ship.reactorModuleOffset?.x ?? MODULE_OFFSETS.reactorCompressor.x),
                        z: Number.isFinite(ship.reactorModuleZ)
                            ? ship.reactorModuleZ
                            : ship.tileZ + (ship.reactorModuleOffset?.z ?? MODULE_OFFSETS.reactorCompressor.z)
                    }
                ];

                for (const modulePos of modulePositions) {
                    if (!modulePos.enabled) continue;
                    const distModule = Math.hypot(x - modulePos.x, z - modulePos.z);
                    if (distModule < (O2_MODULE_COLLISION_RADIUS + this.playerRadius * 0.7)) {
                        return false;
                    }
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
        return this.getOrCreateChunk(chunkX, chunkY)[localY][localX];
    }

    getRoomTypeGrid(chunkX, chunkY) {
        const key = `${chunkX},${chunkY}`;
        if (!this.chunkCache.has(key)) {
            this.getOrCreateChunk(chunkX, chunkY);
        }
        return this._chunkRoomTypeCache?.get(key) ?? null;
    }

    getOrCreateChunk(chunkX, chunkY) {
        const key = `${chunkX},${chunkY}`;
        if (!this.chunkCache.has(key)) {
            const grid = this.buildChunk(chunkX, chunkY);
            this.chunkCache.set(key, grid);
            if (!this._chunkRoomTypeCache) this._chunkRoomTypeCache = new Map();
            this._chunkRoomTypeCache.set(key, classifyChunkCells(grid, this.chunkSize));
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
        this.resetWeaponState({ emit: false });
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        this.consolePromptEl?.removeEventListener('pointerup', this.handlePromptTap);
        this.renderer.domElement.removeEventListener('pointerdown', this.handleCanvasPointerDown);
        this.renderer.domElement.removeEventListener('pointermove', this.handleCanvasPointerMove);
        this.renderer.domElement.removeEventListener('pointerup', this.handleCanvasTap);
        Object.values(this.playerMaterials ?? {}).forEach((material) => material.dispose());
        Object.values(this.playerTextures ?? {}).forEach((texture) => texture.dispose());
        Object.values(this.biomeTerrainTextures ?? {}).forEach((textureSet) => {
            Object.values(textureSet ?? {}).forEach((texture) => texture?.dispose?.());
        });
        this.floorMaterial?.dispose?.();
        this.wallMaterial?.dispose?.();
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
