# Walkthrough — Asset Generation & Integration Guidelines

I have generated and processed all the necessary assets to support the Hex Terrain, Roguelike Vitals/Banking progression, and Cutscene/Tutorial sequences. The files are cleaned up and ready in your `public/` folder.

---

## 1. Generated Assets Summary

Here are the files added and processed in your `public/` directory. All assets are formatted as 2D pixel art with pre-processed transparent/black backgrounds:

| Asset Path | Type | Purpose / Description | Visual Features |
|---|---|---|---|
| `public/ship_wreckage.png` | Static Sprite | Replaces ship model on impact in crash cutscene. | Charred hull plates, exposed loose cabling, smoking frame. |
| `public/module_o2_generator.png` | Static Sprite | Materializes for Goal 1 (O2 Bubble Restoration). | Cylindrical scrubbing unit with glowing cyan lights. |
| `public/module_hull_matrix.png` | Static Sprite | Materializes for Goal 2 (Hull Expansion). | Heavy tower with glowing blue energy matrix elements. |
| `public/module_radar_dish.png` | Animated 2x2 Sheet | Materializes for Goal 3 (Radar Node Upgrade). | Rotating dish showing 4 key angles (glowing yellow). |
| `public/module_reactor_compressor.png` | Static Sprite | Materializes for Goal 4 (Reactor Compressor). | High-energy circular reactor core with glowing orange plasma rings. |
| `public/hex_decal_cracks.png` | Flat Decal Texture | Overlay for damaged/steep hex tiles. | Fractured metal floor plates, visible wiring underneath. |
| `public/hex_decal_infestation.png` | Flat Decal Texture | Overlay for transitions to deep zones. | Bioluminescent purple & pink alien vines and spores. |
| **Lore-Anchored Cryo Sector** | | | |
| `public/cryo_base_frost.png` | Seamless Texture | Frosty metal plate floor base. | Metal industrial floor plates and grates covered in frost. |
| `public/cryo_grunge_rime.png` | Seamless Texture | Frozen coolant leakage overlay. | Snow-rime details representing frozen coolant spills. |
| `public/cryo_wall_conduit.png` | Seamless Texture | Frozen coolant wall face. | Conduit pipes, valves, and gauges crusted in ice and frost. |
| `public/scatter_cryo_icicle.png` | Static Sprite | Coolant icicles scatter. | Frozen coolant droplets, icicle formations on steel. |
| **Alien Bio Sector** | | | |
| `public/bio_base_growth.png` | Seamless Texture | Fleshy organic floor base. | Pulsating roots and purple tendrils crawling over metal. |
| `public/bio_grunge_spores.png` | Seamless Texture | Slime mold details overlay. | Glowing green slime spots, mold, and spore dust. |
| `public/bio_wall_veins.png` | Seamless Texture | Bio-mechanical wall face. | Dark steel panels wrapped in glowing red-orange vascular veins. |
| `public/scatter_bio_pod.png` | Static Sprite | Alien egg pod scatter. | Glowing violet/pink alien pod with organic membrane. |
| **Procedural Details & Decals** | | | |
| `public/scatter_gravel.png` | Ground Decal | Scattered floor gravel. | Procedural clusters of small shaded pebbles and metal grit. |
| `public/scatter_coolant_puddle.png`| Ground Decal | Cyan coolant puddle. | Semi-transparent glowing blue liquid pool with a bright rim. |
| `public/scatter_slime_puddle.png` | Ground Decal | Green slime puddle. | Viscous green acid pool with a neon outline. |
| `public/decal_scars.png` | Wall Decal | Scrapes, claws, and burns. | Jagged black claw marks and burnt carbon blast craters. |
| **PBR Normal Maps** | | | |
| `public/bunker_base_metal_normal.png`| Normal Map | Bunker floor normal map. | Sobel-generated height bumps for floor plates (strength=1.2). |
| `public/bunker_wall_metal_normal.png`| Normal Map | Bunker wall normal map. | Height gradients for metallic wall panels. |
| `public/cryo_base_frost_normal.png` | Normal Map | Cryo floor normal map. | Ridge bumps for frost sheets and grates (strength=1.5). |
| `public/cryo_wall_conduit_normal.png`| Normal Map | Cryo wall normal map. | Highly defined 3D normals for coolant pipes (strength=2.0). |
| `public/bio_base_growth_normal.png` | Normal Map | Bio floor normal map. | Rounded high-relief normal vectors for organic roots (strength=2.2). |
| `public/bio_wall_veins_normal.png`  | Normal Map | Bio wall normal map. | 3D normal bumps for vascular organic veins. |

---

## 2. Animated Spritesheet Structure: `module_radar_dish.png`

The radar dish is generated as a **2x2 animation grid** consisting of 4 sequential frames (Top-Left, Top-Right, Bottom-Left, Bottom-Right):

```
┌───────────────────┬───────────────────┐
│     FRAME 0       │     FRAME 1       │
│    (Top-Left)     │    (Top-Right)    │
├───────────────────┼───────────────────┤
│     FRAME 2       │     FRAME 3       │
│   (Bottom-Left)   │   (Bottom-Right)  │
└───────────────────┴───────────────────┘
```

### Animating the Spritesheet in Three.js

To animate this sheet, configure the texture repeat and offset, and cycle through the offsets in the update loop:

```js
// 1. Initial configuration during texture load
radarTexture.repeat.set(0.5, 0.5);

// 2. Mapping frames to offsets (Three.js coordinates start bottom-left)
const RADAR_FRAMES = [
    { x: 0.0, y: 0.5 }, // Frame 0: Top-Left
    { x: 0.5, y: 0.5 }, // Frame 1: Top-Right
    { x: 0.0, y: 0.0 }, // Frame 2: Bottom-Left
    { x: 0.5, y: 0.0 }  // Frame 3: Bottom-Right
];

// 3. Inside the update loop (e.g. 10 frames per second)
const frameIndex = Math.floor(now * 0.01) % 4;
radarTexture.offset.set(RADAR_FRAMES[frameIndex].x, RADAR_FRAMES[frameIndex].y);
```

---

## 3. Integration Code Blueprints

### A. Preloading and Materials Setup in `src/threeGame.js`
Add the new module, detail decals, and normal map asset files to your preloading list:
```js
// Inside ThreeGame constructor or initialization
this.moduleTextures = {};
this.moduleMaterials = {};
this.biomeTextures = {};

const assetsToLoad = {
    // Upgrades
    wreckage: '/ship_wreckage.png',
    o2_generator: '/module_o2_generator.png',
    hull_matrix: '/module_hull_matrix.png',
    radar_dish: '/module_radar_dish.png',
    reactor_compressor: '/module_reactor_compressor.png',
    decal_cracks: '/hex_decal_cracks.png',
    decal_infestation: '/hex_decal_infestation.png',
    // Subtle Details & Wall Scars
    scatter_gravel: '/scatter_gravel.png',
    scatter_coolant_puddle: '/scatter_coolant_puddle.png',
    scatter_slime_puddle: '/scatter_slime_puddle.png',
    decal_scars: '/decal_scars.png',
    // Cryo Sector (Biome 2)
    cryo_base: '/cryo_base_frost.png',
    cryo_grunge: '/cryo_grunge_rime.png',
    cryo_wall: '/cryo_wall_conduit.png',
    scatter_cryo: '/scatter_cryo_icicle.png',
    // Bio Sector (Biome 3)
    bio_base: '/bio_base_growth.png',
    bio_grunge: '/bio_grunge_spores.png',
    bio_wall: '/bio_wall_veins.png',
    scatter_bio: '/scatter_bio_pod.png',
    // PBR Normal Maps
    bunker_base_normal: '/bunker_base_metal_normal.png',
    bunker_wall_normal: '/bunker_wall_metal_normal.png',
    cryo_base_normal: '/cryo_base_frost_normal.png',
    cryo_wall_normal: '/cryo_wall_conduit_normal.png',
    bio_base_normal: '/bio_base_growth_normal.png',
    bio_wall_normal: '/bio_wall_veins_normal.png'
};

Object.entries(assetsToLoad).forEach(([key, path]) => {
    // Async load and setup
    this.loadKeyedSpriteTexture(path, 15, (tex) => {
        this.moduleTextures[key] = tex;
        
        // Modules, decals, puddles, and scars get materials
        if (key.startsWith('module_') || key.startsWith('decal_') || key.startsWith('scatter_') || key === 'wreckage') {
            const isLiquid = key.includes('puddle');
            this.moduleMaterials[key] = new THREE.MeshStandardMaterial({
                map: tex,
                transparent: true,
                alphaTest: 0.05,
                depthWrite: !isLiquid,
                depthTest: true,
                roughness: isLiquid ? 0.08 : 0.85,
                metalness: isLiquid ? 0.9 : 0.1,
                opacity: 1.0
            });
            if (key === 'module_radar_dish') {
                tex.repeat.set(0.5, 0.5); // 2x2 grid
            }
        }
    });
});
```

### B. Spawning and Alpha-In Materialization
Create a method in `ThreeGame` to handle spawning of an upgrade module when the goal is unlocked:
```js
spawnUpgradeModule(goalType) {
    const ship = this.crashedShips.find(s => s.type === this.playerType);
    if (!ship) return;

    // Define offsets relative to the ship (prevent blocking console)
    const offsets = {
        o2Bubble: { x: -2.5, z: 0.5, matKey: 'o2_generator', lightColor: 0x00e5ff },
        hullExpansion: { x: -0.5, z: 2.5, matKey: 'hull_matrix', lightColor: 0x3b82f6 },
        radarNode: { x: 2.5, z: 0.5, matKey: 'radar_dish', lightColor: 0xeab308 },
        reactorCompressor: { x: 1.5, z: -1.5, matKey: 'reactor_compressor', lightColor: 0xf97316 }
    };

    const config = offsets[goalType];
    if (!config) return;

    const material = this.moduleMaterials[config.matKey];
    if (!material) return;

    // Clone material so we can fade individual modules independently
    const clonedMat = material.clone();
    const sprite = new THREE.Sprite(clonedMat);
    sprite.center.set(0.5, 0);

    const worldX = ship.tileX + config.x;
    const worldZ = ship.tileZ + config.z;
    // Y position queries the terrain system to avoid floating/clipping
    const worldY = this.getTerrainHeightAt ? this.getTerrainHeightAt(worldX, worldZ) : 0.0;

    sprite.position.set(worldX, worldY + 0.1, worldZ);
    sprite.scale.set(1.5, 1.5, 1);
    this.scene.add(sprite);

    // Dynamic light attachment
    let pointLight = null;
    if (config.lightColor) {
        pointLight = new THREE.PointLight(config.lightColor, 0.0, 4.0);
        pointLight.position.set(worldX, worldY + 1.0, worldZ);
        this.scene.add(pointLight);
    }

    // Keep track of spawned module for updates and collisions
    this.activeModules = this.activeModules || [];
    const moduleEntry = {
        type: goalType,
        sprite,
        light: pointLight,
        material: clonedMat,
        x: worldX,
        z: worldZ,
        radius: 0.55,
        fadeTimer: 0.0,
        isO2Generator: goalType === 'o2Bubble',
        isReactor: goalType === 'reactorCompressor',
        isRadar: goalType === 'radarNode'
    };
    this.activeModules.push(moduleEntry);

    // Trigger alpha-in materialization loop
    const animateFade = (timestamp) => {
        moduleEntry.fadeTimer += 0.016; // 60 FPS estimate
        const progress = Math.min(1.0, moduleEntry.fadeTimer / 2.0); // 2-second fade
        
        clonedMat.opacity = progress;
        if (pointLight) {
            pointLight.intensity = progress * (goalType === 'hullExpansion' ? 0.8 : 1.2);
        }

        if (progress < 1.0) {
            requestAnimationFrame(animateFade);
        }
    };
    requestAnimationFrame(animateFade);
}
```

### C. Updating Pulsing Lights & Spritesheet Animation
Update the animation ticks in `ThreeGame.update()`:
```js
updateActiveModules(delta) {
    if (!this.activeModules) return;

    const now = Date.now();

    this.activeModules.forEach(module => {
        // 1. PointLight Pulsing (O2 Generator & Reactor)
        if (module.light && (module.isO2Generator || module.isReactor)) {
            const pulse = 0.8 + Math.sin(now * 0.005) * 0.4;
            module.light.intensity = pulse;
        }

        // 2. Radar Spritesheet Frame Tick
        if (module.isRadar && this.moduleTextures['radar_dish']) {
            const frameIndex = Math.floor(now * 0.008) % 4;
            const RADAR_FRAMES = [
                { x: 0.0, y: 0.5 },
                { x: 0.5, y: 0.5 },
                { x: 0.0, y: 0.0 },
                { x: 0.5, y: 0.0 }
            ];
            const tex = module.material.map;
            if (tex) {
                tex.offset.set(RADAR_FRAMES[frameIndex].x, RADAR_FRAMES[frameIndex].y);
            }
        }
    });
}
```

### D. Circular Proximity Collisions
Integrate the circular radius collision into `canOccupyPosition(x, z)`:
```js
// Inside canOccupyPosition(x, z)
if (this.activeModules) {
    const playerRadius = 0.35; // typical player bounds radius
    for (const module of this.activeModules) {
        const dx = x - module.x;
        const dz = z - module.z;
        const dist = Math.hypot(dx, dz);
        // Collision boundary overlap check
        if (dist < (playerRadius + module.radius)) {
            return false;
        }
    }
}
```

---

## 4. Biome Terrain Packs — Unified Shader System

Instead of swapping materials chunk-by-chunk (which creates seams and increases draw calls), use a **single, unified floor/wall shader material** that handles distance-based per-fragment blending.

### A. Distance Thresholds & Lore Anchors
Biomes are renamed and mapped to wider, progression-earned distance thresholds relative to the ship crash coordinate:
- **Active Sector** (Bunker): 0–60 units (Crater & Near zone)
- **Cryo Sector** (Cryogenic coolant bays): 60–140 units (Ruptured coolant lines, frost metal, ice icicles)
- **Bio Sector** (Biological containment failure): 140+ units (True endgame territory, roots, slime, pods)

### B. Unified Shader Blending in GLSL (`onBeforeCompile`)
Compile all biome textures onto the single floor/wall materials and use a distance mask to mix them seamlessly:

```js
// Define uniforms on the floor material
this.floorMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uShipWorldPos = { value: new THREE.Vector2(shipX, shipZ) };
    shader.uniforms.tCryoBase = { value: this.moduleTextures['cryo_base'] };
    shader.uniforms.tCryoGrunge = { value: this.moduleTextures['cryo_grunge'] };
    shader.uniforms.tBioBase = { value: this.moduleTextures['bio_base'] };
    shader.uniforms.tBioGrunge = { value: this.moduleTextures['bio_grunge'] };

    // Inject uniforms into fragment shader
    shader.fragmentShader = `
        uniform vec2 uShipWorldPos;
        uniform sampler2D tCryoBase;
        uniform sampler2D tCryoGrunge;
        uniform sampler2D tBioBase;
        uniform sampler2D tBioGrunge;
        ${shader.fragmentShader}
    `;

    // Replace the standard mapping block to compute blends dynamically
    shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        #ifdef USE_MAP
            float dist = length(vWorldPos.xz - uShipWorldPos);

            // Compute mix factors: 20-unit transition windows
            float cryoMix = smoothstep(50.0, 70.0, dist);
            float bioMix  = smoothstep(110.0, 130.0, dist);

            // Triplanar sample Bunker, Cryo, and Bio colors:
            vec4 bunkerColor = texture2D(tBase, vWorldPos.xz * 0.12);
            vec4 cryoColor   = texture2D(tCryoBase, vWorldPos.xz * 0.12);
            vec4 bioColor    = texture2D(tBioBase, vWorldPos.xz * 0.12);

            // Mix them sequentially
            vec4 floorColor = mix(bunkerColor, cryoColor, cryoMix);
            floorColor = mix(floorColor, bioColor, bioMix);

            diffuseColor *= floorColor;
        #endif
        `
    );
};
```

### C. Dynamic Ambient Lighting & Fog Lerps
Calculate biome blending weights in the update loop to adjust lighting colors smoothly as the player walks:
```js
updateActiveBiomeLighting(delta) {
    const ship = this.crashedShips.find(s => s.type === this.playerType);
    const shipX = ship ? ship.tileX : 9.0;
    const shipZ = ship ? ship.tileZ : 9.0;
    
    const dist = Math.hypot(this.player.position.x - shipX, this.player.position.z - shipZ);
    
    const cryoMix = THREE.MathUtils.smoothstep(dist, 50.0, 70.0);
    const bioMix  = THREE.MathUtils.smoothstep(dist, 110.0, 130.0);

    // Fog Colors
    const bunkerFog = new THREE.Color(0x0b0d0f); // Bunker Dark
    const cryoFog   = new THREE.Color(0x080f1a); // Coolant Navy tint
    const bioFog    = new THREE.Color(0x060d08); // Sickly Spore green tint
    
    this.scene.fog.color
        .lerpColors(bunkerFog, cryoFog, cryoMix)
        .lerp(bioFog, bioMix);

    this.scene.background.copy(this.scene.fog.color);

    // Ambient Light Colors
    const bunkerAmb = new THREE.Color(0xffffff);
    const cryoAmb   = new THREE.Color(0xb0ccff); // Icy blue
    const bioAmb    = new THREE.Color(0x90a870); // Sickly olive green
    
    this.ambientLight.color
        .lerpColors(bunkerAmb, cryoAmb, cryoMix)
        .lerp(bioAmb, bioMix);
}
```

### D. Gameplay Integrations (O2 Drain & HUD Prompts)
Apply O2 multipliers and dispatch notifications when biome transitions are crossed:

1.  **O2 Drain Rate Modifiers**:
    ```js
    getO2DrainMultiplier() {
        const dist = Math.hypot(this.player.position.x - shipX, this.player.position.z - shipZ);
        if (dist >= 140.0) return 1.3;  // Bio Sector: Spore toxicity
        if (dist >= 60.0) return 1.15; // Cryo Sector: Extreme cold thermal load
        return 1.0;                    // Active Sector: Nominal suit load
    }
    ```
2.  **HUD Biome Indicators**:
    Store the current biome state on the player Exosuit, and trigger a floating prompt if they step into a new area:
    ```js
    updateBiomeNotification(newBiome) {
        if (this.currentBiome === newBiome) return;
        this.currentBiome = newBiome;

        const messages = {
            bunker: "ENTERING ACTIVE SECTOR — LIFE SIGNS CACHED",
            cryo: "ENTERING CRYO SECTOR — SUIT THERMAL LOAD INCREASING",
            bio: "WARNING: ENTERING BIO SECTOR — TOXIC SPORE WARNING"
        };
        
        // Show floating HUD notification
        this.showHUDNotification(messages[newBiome]);
    }
    ```
3.  **UI Level Label**:
    Map `BUNKER LEVEL 0` to the corresponding biome string:
    - Distance < 60u: `ACTIVE SECTOR`
    - Distance 60–140u: `CRYO SECTOR`
    - Distance > 140u: `BIO SECTOR`

---

## 5. PBR Normal Mapping Shader Integration

To make surfaces look 3D and catch light dynamically, we feed the normal maps into `floorMaterial` and `wallMaterial` shaders.

### A. Dynamic Normal map Blending in `floorMaterial` Shader
```js
this.floorMaterial.onBeforeCompile = (shader) => {
    // In addition to diffuse textures, bind normal textures
    shader.uniforms.tBaseNormal = { value: this.moduleTextures['bunker_base_normal'] };
    shader.uniforms.tCryoNormal = { value: this.moduleTextures['cryo_base_normal'] };
    shader.uniforms.tBioNormal = { value: this.moduleTextures['bio_base_normal'] };
    
    shader.fragmentShader = `
        uniform sampler2D tBaseNormal;
        uniform sampler2D tCryoNormal;
        uniform sampler2D tBioNormal;
        ${shader.fragmentShader}
    `;
    
    shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_maps>',
        `
        #ifdef USE_NORMALMAP
            // Sample normal map channels
            vec3 bunkerNorm = texture2D(tBaseNormal, vWorldPos.xz * 0.12).xyz * 2.0 - 1.0;
            vec3 cryoNorm   = texture2D(tCryoNormal, vWorldPos.xz * 0.12).xyz * 2.0 - 1.0;
            vec3 bioNorm    = texture2D(tBioNormal, vWorldPos.xz * 0.12).xyz * 2.0 - 1.0;
            
            // Blend normals using the same biome mix weights computed above
            vec3 blendedNorm = mix(bunkerNorm, cryoNorm, cryoMix);
            blendedNorm = mix(blendedNorm, bioNorm, bioMix);
            
            // Apply to tangent-space normal vector
            normal = normalize(vTBN * blendedNorm);
        #endif
        `
    );
};
```

---

## 6. Subtle Detail Decals and Wall Scars Placement

Ground coverings (gravel, liquid puddles) and wall scratches/blast marks are spawned dynamically when mounting chunks.

### A. Ground Coverings Setup
Ground details are spawned as flat plane meshes placed slightly above the terrain floor (`y + 0.01` to prevent Z-fighting).
```js
spawnGroundDetail(worldX, worldZ, type) {
    const material = this.moduleMaterials[type];
    if (!material) return;
    
    const geom = new THREE.PlaneGeometry(0.8, 0.8);
    const mesh = new THREE.Mesh(geom, material);
    
    mesh.rotation.x = -Math.PI / 2; // Flat on floor
    mesh.rotation.z = Math.random() * Math.PI * 2; // Random rotation
    
    const terrainY = this.getTerrainHeightAt(worldX, worldZ);
    mesh.position.set(worldX + (Math.random() - 0.5) * 0.4, terrainY + 0.01, worldZ + (Math.random() - 0.5) * 0.4);
    
    // Add to chunk group so it streams out on chunk unmount
    this.currentChunkGroup.add(mesh);
}
```

### B. Wall Scars Setup
Wall details (claw scrapes, blast soot) are aligned with cliff quads.
```js
spawnWallScar(v1, v2, topY, botY, faceNormal) {
    const material = this.moduleMaterials['decal_scars'];
    if (!material) return;
    
    const geom = new THREE.PlaneGeometry(1.0, 1.2);
    const mesh = new THREE.Mesh(geom, material);
    
    // Position at wall center, offset slightly forward to prevent clipping
    const cx = (v1.x + v2.x) / 2 + faceNormal.x * 0.02;
    const cz = (v1.z + v2.z) / 2 + faceNormal.z * 0.02;
    const cy = (topY + botY) / 2;
    
    mesh.position.set(cx, cy, cz);
    
    // Align rotation with the cliff face normal
    const angle = Math.atan2(faceNormal.x, faceNormal.z);
    mesh.rotation.y = angle;
    
    this.currentChunkGroup.add(mesh);
}
```
