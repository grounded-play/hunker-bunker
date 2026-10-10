# Procedural Spline Pipes, Cables, and Rigging System
## Architecture, Performance, Environmental Set-Dressing & Asset Interconnection Plan
**Date:** 2026-10-09  
**Status:** Architectural Plan  
**Target Platform:** WebGL2 / Three.js (Steam Deck 60 FPS Target, Desktop 120 FPS)  
**Related Documents:** 
- [`docs/planning/lived-in-world-pass-2-2026-10-09.md`](lived-in-world-pass-2-2026-10-09.md)
- [`docs/planning/lived-in-world-pass-2-interactions-2026-10-09.md`](lived-in-world-pass-2-interactions-2026-10-09.md)
- [`docs/planning/world-prop-interactivity-master-plan-2026-10-09.md`](world-prop-interactivity-master-plan-2026-10-09.md)
- [`.agents/skills/threejs-builder/SKILL.md`](../../.agents/skills/threejs-builder/SKILL.md)

---

## Status — 2026-10-09 (later)

The router, geometry and renderer shipped in c225a670. This pass made the conduits real.

- **Bespoke surfaces per area.**
  - `scripts/art/build_spline_textures.py` cuts bands from the owner's sticker art:
    - the bunker's corrugated cable with duct-tape and hazard bands, from the taped-cables sticker;
    - the hive's braided sinew veins, from resin creep;
    - cryo's frost-sheathed coolant pipe, from frost creep;
    - the camp's tangled vine roots, from resin creep;
    - the collars' gunmetal, from cracked seam.
  - Each band is made seamless along its length and baked to PBR (albedo, normal, roughness, metalness) as BC7 KTX2 texture-array layers.
  - One layered material draws every run in a chunk in one draw call. Each vertex carries its layer, and the texture repeats every two circumferences, so the art keeps its proportions on any radius.
  - The router gives every run in a room its area's conduit: bunker wire, bio and cathedral vein, cryo pipe, camp vine.
- **This replaces the atlas plan in section 6.** Array layers have no band bleeding and no wrapped-v seam, which the atlas design had.
- **Readable size.** Runs draw at 1.9 times their real radius, with at least 6 sides. At 2–4 cm they were hairlines from the game camera.
- **Cuttable and destructible, for real.**
  - Shooting or cutting a run now severs it at the cut point (`buildSeveredSplineGeometry`). Two halves hang from their anchors, and each free end sags under its own weight.
  - The ends keep looping effects: a cut wire arcs with sparks and a flickering pooled light, a vein oozes, a coolant pipe vents cold steam, and a vine sheds.
  - A run cut on an earlier visit comes back severed.
  - The per-type destruction effects in `propInteractions.js` (electric damage, bile, cryo burst) still fire.
- **Verified by** `tests/e2e/probes/spline-captures.spec.js`. On the pinned map it found 51 vine, 23 vein, 5 pipe and 2 wire runs, and cut one of each.

**Audit, 2026-10-09 evening.** Fixed:
- **Wall runs floated in the room.** They sat at cell centre plus 8 cm, about 0.6 m off the face. They now hug the face, using the drawn radius so thick runs never sink in.
- **Only north walls ever got runs.** All four walls are scanned now, with up to 4 crawlers per room.
- **Runs anchored to dressing that wasn't built.** The spline pass re-planned dressing without `recentModels`. It now reuses the chunk's actual plan.
- **Prop sockets rotated the wrong way.** They used the inverse of three.js `rotation.y`.
- **Orphan sockets never reached a wall.** They dropped to a mid-floor collar. They now run to the nearest wall face.
- **Overhead swags hung in mid-air.** They spanned the room 0.1 m inside one wall to 0.9 m past the other, with no ceiling. They now hang along a wall top between brackets at 2.42 m.

Added:
- **Cut by hand.** Conduits can be cut with E (`[E] CUT POWER CABLE`, `SEVER VEIN`, `CRACK COOLANT PIPE`, `CUT VINE`), through the same break path as shooting them.
- **One draw call.** A chunk's intact cuttable runs draw as one mesh, rebuilt when one is cut. Before, each run was its own draw call.

Covered by new router tests: face hugging, all four walls, swag height and placement, orphan routing, and socket yaw.

## 1. Executive Summary & Vision

The environments in *Hunker-Bunker* feature powerful individual hero props (generators, cryo manifolds, bio-incubators, wall terminals) and static clutter (crates, oil drums, wall decals). However, industrial and biomechanical spaces in the real world—and in iconic industrial horror like *Alien* and H.R. Giger’s biomechanical nightmares—derive their claustrophobic, "lived-in" atmosphere from **continuous infrastructure**:
- Pipes that snake across bulkheads, carry pressurized coolant, and dive into floor grates.
- Heavy electrical conduits and drop cables that sag in catenary loops from overhead beams.
- Taut rigging, winches, and frayed utility ropes lashed around makeshift camps.
- Direct physical umbilicals connecting machines together (e.g., generator to wall breaker, coolant drum to manifold).

Currently, existing pipe assets in the game are either standalone fixed-length 3D meshes (such as `prop_biomech_tracheal_wall_pipe`, `life_pipeline_trestle`, or `prop_wall_cable_tray_swag`) or flat 2D decals (like `decal_wall_panel_grille_01`). 

**The Objective:**  
Introduce a **procedural 3D spline system** that generates physical 3D pipes, cables, and ropes across rooms and hallways:
1. **Zero Memory & Performance Bloat:** Render all procedural conduits in a chunk in **at most 1–2 draw calls**, with ultra-low-polygon cross-sections (3 to 6-sided prisms), adaptive longitudinal stepping, and static geometry merging during chunk generation.
2. **Deterministic Environmental Set-Dressing:** Procedurally route dangling overhead swags, wall-mounted conduit runs, and floor-skirting pipes without blocking player movement or interfering with gameplay collisions.
3. **Point-to-Point Asset Interconnection:** Connect placed 3D hero props together (socket-to-socket) via realistic pathways.
4. **Localized Biome Styling:** Adapt visual materials, palettes, insulation, sag, and grime to the four core sector themes: *Bunker Industrial*, *Cryo Sub-Zero*, *Bio Cathedral*, and *Camp Survivor*.

```
+----------------------------------------------------------------------------------------------------+
|                                 PROCEDURAL SPLINE INFRASTRUCTURE                                  |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  [ CEILING LAYER ]       Sagging Overhead Drop Cables & Rigging (Catenary Curves, Y >= 2.2m)       |
|                                       \                    /                                       |
|                                        v                  v                                        |
|  [ SOCKET ROUTING ]      Generator [Socket Out] =====> Wall Junction Box [Socket In]               |
|                                                      |                                             |
|                                                      v (Vertical Riser)                            |
|  [ WALL PERIMETER ]      Conduit Racks & Hydraulic Runs (Manhattan Orthogonal Routing, Y = 0.35m)  |
|                                                      |                                             |
|                                                      v (Floor Drop)                                |
|  [ FLOOR & TRENCH ]      Skirted Perimeter Hoses & Trench Runs (T10 Floor Grates, Non-blocking)    |
|                                                                                                    |
|  [ RENDER ENGINE ]       All Curves -> 3/6-Sided Extrusions -> 1 Merged BufferGeometry Per Chunk   |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Real-World Mechanical & Industrial References

To make procedural runs look like functional engineering rather than computer-generated noodles, the generation rules must mirror real-world industrial piping, electrical routing, and rigging standards.

### 2.1 Industrial Piping Systems (ASME/ANSI A13.1 & Marine Standards)
In naval bulkheads, nuclear installations, and chemical processing facilities, piping is strictly disciplined:
- **Orthogonal "Manhattan" Routing:** Rigid pipes do not bend diagonally across open space. They travel parallel to walls and bulkheads, using standard 90° elbows, 45° offsets, and tee-junctions.
- **ASME/ANSI A13.1 Color Bands & Markings:** Pipes feature color-coded bands identifying contents and danger levels:
  - *High-Pressure Steam / Hazard:* Safety Yellow with black chevron hazard bands.
  - *Coolant / Chilled Water / Refrigerant:* Pale Seafoam Green or Cyan (`#10b981` / `#06b6d4`).
  - *Compressed Gas / Breathing O2:* Emerald Green or Pure White with pressure gauge readouts.
  - *Hydraulics / Flammable Oils:* Safety Orange or Rust Ochre (`#ea580c` / `#b45309`).
  - *Biomechanical Trachea (H.R. Giger):* Wet black ribbed latex with bone-ivory cartilage bands.
- **Physical Mounting Hardware:** Pipes are never suspended magically in mid-air:
  - *Wall/Strut Clamps (Unistrut):* Heavy channel brackets clamping pipes to bulkheads every 2.0–3.0 meters.
  - *Clevis & Trapeze Hangers:* Threaded rods dropping from ceiling I-beams to support horizontal pipe banks.
  - *Expansion Loops (U-bends):* U-shaped horizontal loops inserted into long steam/coolant runs to absorb thermal expansion and seismic shifting.
  - *Flanged Couplings:* Heavy bolted rings placed every 4–6 meters indicating prefabricated sections joined together.
  - *Condensation Drip Legs:* Small vertical drop tubes extending downward with drain petcocks at low points.

### 2.2 Electrical Cables & Signal Conduits
Unlike rigid pipes, electrical cables and hydraulic flex-lines respond to gravity, tension, and bundling:
- **Catenary Sag Physics:** Any cable suspended between two anchor points follows an idealized catenary curve:
  $$y = a \left(\cosh\left(\frac{x}{a}\right) - 1\right) \approx \frac{x^2}{2a}$$
  Slack lines droop deeply; tensioned power feeds droop minimally.
- **Drip Loops:** Before any outdoor or industrial cable enters an electrical junction box or wall penetration, it dips *below* the entry gland and curves back up. This forces condensing moisture to pool and drip off at the lowest point rather than running into the electrical contacts.
- **Cable Trays & Bundling:** Heavy power runs sit in perforated wire-basket or ladder trays (matching `prop_wall_cable_tray_swag`). Loose branches leave the tray bundled with nylon zip-ties, braided kevlar sleeves, or vulcanized rubber straps every 0.8 meters.
- **Drop Lines:** Overhead utility cables drop vertically from ceiling trays directly to floor machinery, often encased in a protective coiled spring or flexible ribbed conduit at the base to resist foot traffic.

### 2.3 Ropes, Rigging & Cordage
In survivor outposts, maintenance bays, and makeshift cargo zones:
- **Cordage Types:** Three-strand twisted natural hemp rope (rough, fibrous, tan/brown), braided synthetic climbing/rigging rope (kernmantle with high contrast sheath), and braided steel aircraft cable (galvanized, high-specular metallic).
- **Tension States:**
  - *Taut (Standing Rigging):* Straight lines under tension with turnbuckles or lashing hitches holding tarps, antennas, and structural bracing.
  - *Slack (Suspended Rigging):* Catenary loops supporting cargo nets, hoist pulleys, or festooned lighting.
  - *Grounded / Coiled:* Perimeter coils resting on the floor in neat spirals or hung in loops over bulkhead pegs.
- **Biomechanical Sinew (Giger Biomech):** Viscous, wet umbilical tendrils that stretch between bio-structures, featuring organic taper, mucus drip nodes, and irregular skin webbing.

---

## 3. High-Performance Spline Architecture (Zero Memory Eating)

### 3.1 The Performance Traps of Naive Three.js Splines
A common pitfall when rendering 3D splines in Three.js is to create dynamic meshes using built-in high-level classes:
```javascript
// ANTIPATTERN: DO NOT DO THIS IN PRODUCTION
for (let i = 0; i < 60; i++) {
    const curve = new THREE.CatmullRomCurve3(points);
    const geom = new THREE.TubeGeometry(curve, 64, 0.04, 12, false); // 1,536 triangles!
    const mesh = new THREE.Mesh(geom, new THREE.MeshStandardMaterial()); // New draw call!
    scene.add(mesh);
}
```
**Why this destroys performance:**
1. **Draw Call Explosion:** 60 unique meshes = 60 draw calls. On the Steam Deck or integrated GPUs, exceeding 100 draw calls total per frame can cause massive CPU bottlenecks.
2. **Vertex/Triangle Overkill:** A 12-sided tube with 64 tubular segments produces 1,536 triangles per pipe. 60 pipes add ~92,000 triangles for background set-dressing alone.
3. **Heap Churn & Garbage Collection:** Generating `Vector3` instances, curves, and matrices inside the game loop causes garbage collection pauses (stutters and frame drops).
4. **Frenet Frame Gimbal Twisting:** Standard `THREE.TubeGeometry` uses standard Frenet-Serret framing, which flips and pinches when a curve moves purely vertically ($Y$-axis aligned).

### 3.2 The Low-Memory Engine Design
To achieve cinematic visual fidelity with virtually zero CPU/GPU overhead, our system enforces five core technical pillars:

```
+----------------------------------------------------------------------------------------+
|                                 LOW-MEMORY ENGINE PILLARS                              |
+----------------------------------------------------------------------------------------+
| 1. Ultra-Low Poly Cross-Sections | 3-sided prism (rope/cables), 6-sided prism (pipes)  |
| 2. Adaptive Longitudinal Steps   | 2 vertices for straight runs; 6-8 for catenary sags |
| 3. Parallel Transport Frames     | Zero gimbal pinch/twisting on vertical pipe risers  |
| 4. Single-Batch Chunk Merge      | 1 BufferGeometry & 1 Draw Call per chunk            |
| 5. Deterministic Chunk Lifecycle | Baked at chunk load, zero CPU updates, clean VRAM   |
+----------------------------------------------------------------------------------------+
```

#### Pillar 1: Prismatic Low-Poly Cross-Sections
Under smooth vertex normal shading, a prism looks virtually identical to a high-density cylinder:
- **Thin Cables & Ropes (Radius $\le 0.02\text{m}$):** **3-sided prism** (equilateral triangle cross-section). Smooth normals make it appear round, requiring only 3 vertices per ring.
- **Standard Conduits & Flex Hoses (Radius $0.02\text{m} - 0.06\text{m}$):** **4-sided prism** (diamond cross-section) or **6-sided prism** (hexagonal).
- **Heavy Industrial Pipes (Radius $\ge 0.08\text{m}$):** **6-sided prism** (hexagonal cross-section).
- **Triangle Savings:** A 6-segment cable with a 3-sided cross-section uses only **36 triangles** (compared to 1,536 triangles in standard `TubeGeometry`), representing a **97.6% geometry reduction**.

#### Pillar 2: Adaptive Longitudinal Stepping
Pipes do not need uniform segment spacing along their length:
- **Rigid Straight Runs:** Evaluated with only **2 rings** (start and end). A 10-meter straight pipe along a wall uses exactly 12 triangles total!
- **90° Elbows & Fillets:** Subdivided into **3 or 4 segments** across the curve radius ($r = 0.15\text{m}$).
- **Catenary Swags:** Evaluated using **6 to 8 segments** along the curve, concentrated where curvature is highest.

#### Pillar 3: Parallel Transport Frames (Double Reflection Method)
Standard Frenet-Serret frames calculate binormals using second derivatives:
$$\mathbf{T} = \frac{\mathbf{C}'(t)}{\|\mathbf{C}'(t)\|}, \quad \mathbf{N} = \frac{\mathbf{T}'(t)}{\|\mathbf{T}'(t)\|}, \quad \mathbf{B} = \mathbf{T} \times \mathbf{N}$$
When a pipe goes straight up a wall ($\mathbf{T} = [0, 1, 0]$), $\mathbf{T}'(t)$ approaches zero or causes frame flipping (gimbal twist).
We use the **Parallel Transport Frame (Rotation Minimizing Frame - RMF)** algorithm:
1. Define initial reference frame $(\mathbf{T}_0, \mathbf{R}_0, \mathbf{S}_0)$ at curve start.
2. For each step $i \to i+1$, propagate the frame by reflecting across the bisecting plane between $\mathbf{T}_i$ and $\mathbf{T}_{i+1}$.
3. Guaranteed zero twisting, zero pinching, and smooth orientation through vertical rises and loops.

#### Pillar 4: Chunk-Level Geometry Merging (Single Draw Call)
All procedural pipes, cables, and ropes within a 48m $\times$ 48m chunk are generated during the chunk build phase and merged into **a single static `THREE.BufferGeometry`**:
- Utilizes `three/examples/jsm/utils/BufferGeometryUtils.js` (`mergeGeometries`).
- Shared material: Uses one single `MeshStandardMaterial` backed by a shared 2048 $\times$ 2048 texture atlas (PBR: Albedo, Normal, Roughness/Metalness/AO).
- Total draw calls added for all procedural pipes in an entire chunk: **Exactly 1 draw call**.

#### Pillar 5: Deterministic Lifecycle & Memory Safety
- **Deterministic PRNG:** Splines are generated from room/chunk seeds using `mulberry32` keyed by `${roomId}:splines:v1`. Co-op peers generate identical conduits without any network synchronization packets.
- **VRAM Clean Teardown:** When a chunk is unmounted or recycled, the chunk token triggers:
  ```javascript
  if (chunkSplineMesh) {
      chunkSplineMesh.geometry.dispose();
      chunkGroup.remove(chunkSplineMesh);
  }
  ```
- **Zero Runtime Allocation:** Once built, the spline geometry is completely static. The frame render loop does not evaluate splines, mutate matrices, or allocate memory.

---

## 4. Set-Dressing Placement Rules & Gameplay Invariance

To guarantee that decorative pipes and cables never obstruct player movement, snag combat encounters, or interfere with line-of-sight:

```
+----------------------------------------------------------------------------------------------------+
|                                    VERTICAL CLEARANCE & PLACEMENT                                  |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  Y = 2.4m - 2.8m  [OVERHEAD ZONE]    Ceiling beams, dangling swags (Catenary, clearance >= 2.1m)   |
|                                                                                                    |
|  Y = 1.9m - 2.2m  [CROWN BAND]       Upper wall conduit racks, high-voltage feeds                  |
|                                                                                                    |
|  Y = 0.9m - 1.8m  [INTERACTION ZONE] CLEAR WALKING CORRIDOR (No loose diagonal cables)             |
|                                      Wall fixtures & sockets strictly flush to wall (< 0.15m)       |
|                                                                                                    |
|  Y = 0.15m - 0.4m [BASEBOARD BAND]   Heavy hydraulic & drainage runs hugging perimeter kickplate   |
|                                                                                                    |
|  Y = 0.0m         [FLOOR PERIMETER]  Skirted cables, trench grates (T10), conduit bridge ramps     |
+----------------------------------------------------------------------------------------------------+
```

### 4.1 Layer 1: Dangling Overhead (Ceiling Beams & Rafters)
- **Anchor Criteria:** Supported by ceiling grid nodes, overhead I-beams, or fixtures like `prop_overhead_cage_fluorescent` and `prop_ceiling_crane_hoist`.
- **Clearance Rule:** Minimum cable clearance at the nadir (lowest droop point) must be $Y \ge 2.15\text{m}$.
  - The player character collision capsule height is $1.8\text{m}$.
  - Guaranteeing $Y \ge 2.15\text{m}$ prevents camera clipping during third-person camera rotation and prevents visual occlusion of aiming reticles.
- **Swag Configurations:**
  - *Single Sag:* Two anchor points on opposite bulkheads with sag depth $S = 0.25\text{m} - 0.45\text{m}$.
  - *Festoon Loop:* Series of 3–5 short hanging swags pinned to overhead conduits every 2 meters.
  - *Broken Drop:* A severed cable dangling loose from the ceiling, coiling slightly before hanging dead ($Y = 1.6\text{m}$ only against non-walkable wall perimeters).

### 4.2 Layer 2: Fastened Wall Runs (Bulkhead Conduits & Risers)
- **Crown Band ($Y = 1.95\text{m} - 2.20\text{m}$):**
  - Continuous conduit trays running parallel to the ceiling joint.
  - Carries high-voltage electrical feeds, communication wire bundles, and low-pressure oxygen tubes.
- **Baseboard Band ($Y = 0.15\text{m} - 0.35\text{m}$):**
  - Heavy industrial pipes running directly above the kick-plate grime band (matching `T13 Wall kick-plate grime band` from pass-2).
  - Fastened with stamped wall brackets every 2.0 meters.
- **Vertical Risers ($X/Z$ fixed, $Y = 0.35\text{m} \to 2.05\text{m}$):**
  - Orthogonal vertical feeds connecting baseboard conduits to overhead trays, placed flush in room corners or beside door frames.

### 4.3 Layer 3: Floor Perimeters & Trench Integration
- **Perimeter Skirting:** Cables running along the floor must remain within $0.25\text{m}$ of the room wall boundary. They sit in the non-traversable "clutter ring" alongside existing props.
- **Doorway Rules:** Loose floor cables **MUST NEVER** cross an open doorway threshold or tactical corridor.
  - If a pipe run must cross a path, it routes either:
    1. Up the wall, over the door header ($Y = 2.2\text{m}$), and down the opposite side.
    2. Under the floor via the `T10 Grating over pipe trench` material.
    3. Shielded beneath a rubberized floor bridge (`prop_floor_conduit_bridge`).
- **Concave Corner Coils:** In dead room corners where two walls meet, loose cables can terminate in small circular floor coils (radius $0.3\text{m} - 0.4\text{m}$).

### 4.4 Gameplay Invariance Contract
- **No Physics Colliders:** Procedural spline meshes are tagged with `userData.isSplineDressing = true` and `blocking: false`. They are never added to `this.scatterSprites`, the spatial collision hash, or navigation grids.
- **No Enemy NavMesh Occlusion:** Pathfinding nodes ignore spline conduits entirely.
- **Line-of-Sight Safety:** Conduits maintain thin silhouettes ($r \le 0.06\text{m}$ for single pipes) so they do not block line-of-sight raycasts for enemy targeting or bullet ballistics.

---

## 5. Point-to-Point Asset Interconnection (Socket Architecture)

To connect hero machinery with wall fixtures, we establish an explicit **Socket Contract**.

### 5.1 Socket Definition Specification (`src/data/propSockets.js`)
Assets declare input and output ports in their local model space:

```javascript
/**
 * Socket metadata for 3D props.
 * Positions are in normalized local model coordinates before world rotation.
 */
export const PROP_SOCKET_REGISTRY = Object.freeze({
    // Heavy power generator
    prop_fusion_generator: [
        { id: 'power_out_a', type: 'cable_bundle', pos: [0.65, 0.42, -0.3], normal: [1, 0, 0], radius: 0.045 },
        { id: 'coolant_in',   type: 'pipe_insulated', pos: [-0.65, 0.85, 0.0], normal: [-1, 0, 0], radius: 0.06 }
    ],
    // Wall junction breaker
    prop_conduit_junction_box: [
        { id: 'feed_in',     type: 'conduit_rigid', pos: [0.0, -0.25, 0.12], normal: [0, -1, 0], radius: 0.035 },
        { id: 'branch_out',  type: 'cable_flex',    pos: [0.15, 0.0, 0.12],  normal: [1, 0, 0], radius: 0.025 }
    ],
    // Coolant leak drum
    prop_coolant_drum_leaking_pool: [
        { id: 'discharge',   type: 'pipe_ribbed',   pos: [0.0, 0.65, 0.28],  normal: [0, 0, 1], radius: 0.05 }
    ],
    // Cryo manifold
    prop_icey_frost_manifold: [
        { id: 'inlet_main',  type: 'pipe_insulated', pos: [-0.4, 0.1, 0.1],  normal: [-1, 0, 0], radius: 0.06 },
        { id: 'inlet_aux',   type: 'pipe_insulated', pos: [0.4, 0.1, 0.1],   normal: [1, 0, 0], radius: 0.06 }
    ],
    // Biomechanical incubator
    prop_biomech_incubator: [
        { id: 'umbilical_a', type: 'bio_trachea',   pos: [0.0, 1.45, -0.5],  normal: [0, 0.7, -0.7], radius: 0.07 },
        { id: 'drain_b',     type: 'bio_sinew',     pos: [0.35, 0.1, 0.4],   normal: [0.7, -0.3, 0], radius: 0.035 }
    ],
    // Biomechanical tracheal wall pipe
    prop_biomech_tracheal_wall_pipe: [
        { id: 'trachea_in',  type: 'bio_trachea',   pos: [0.0, 0.2, 0.15],   normal: [0, -1, 0], radius: 0.07 },
        { id: 'trachea_out', type: 'bio_trachea',   pos: [0.0, 2.1, 0.15],   normal: [0, 1, 0], radius: 0.07 }
    ]
});
```

### 5.2 Spline Routing Algorithms
When two compatible props spawn within the same room or an asset connects to a room bulkhead, the router chooses one of three connection strategies:

```
                                SPLINE ROUTING STRATEGIES
                                
  1. MANHATTAN ORTHOGONAL (Rigid Pipes)       2. CATENARY SLACK (Suspended Cables)
  
     Socket A                                     Socket A
        |                                            \
        v (Extend along normal)                       \  (Sagging curve)
        +--------+                                     \__
                 |                                        \___
                 v (Drop to baseboard)                        \
                 +--------------> Socket B                     v Socket B
```

#### Strategy A: Manhattan Orthogonal Routing (Rigid Industrial Pipes)
1. **Normal Extension:** Extend a straight lead-out segment from `Socket A` along its `normal` vector by $0.25\text{m} - 0.40\text{m}$ to ensure it clears the machine body.
2. **Axis-Aligned Steps:**
   - Drop vertically to the standard perimeter baseboard height ($Y = 0.25\text{m}$).
   - Travel along $X$ or $Z$ until aligned with the nearest wall kickplate.
   - Run along the wall face to `Socket B`'s lateral coordinate.
   - Step back out and rise vertically to meet `Socket B`'s lead-in vector.
3. **Corner Fillets:** Replace every 90° corner with a smooth circular fillet arc ($r = 0.12\text{m}$, 3 segments).

#### Strategy B: Catenary Slack Routing (Flexible Cables & Ropes)
1. Given start point $\mathbf{P}_0$ and end point $\mathbf{P}_1$ with span distance $L = \|\mathbf{P}_1 - \mathbf{P}_0\|$:
2. Calculate midpoint $\mathbf{M} = \frac{\mathbf{P}_0 + \mathbf{P}_1}{2}$.
3. Displace midpoint downward by sag factor:
   $$\mathbf{M}_y = \mathbf{M}_y - \min(0.12 \cdot L, 0.65\text{m})$$
4. Construct cubic Bezier control points using socket normals:
   $$\mathbf{C}_0 = \mathbf{P}_0 + \mathbf{N}_0 \cdot 0.35, \quad \mathbf{C}_1 = \mathbf{P}_1 + \mathbf{N}_1 \cdot 0.35$$
5. Evaluate parabolic sag perturbation to maintain natural droop regardless of tension.

#### Strategy C: Bulkhead Termination (Wall Escape)
If a hero prop has an open socket and no partner machine exists in the room:
- The spline routes from the socket directly to the nearest wall surface.
- It terminates flush against the wall into an instanced flange collar or wall-gland decal.

---

## 6. Localized Theming, Biome Palettes & PBR Texture Atlas

The visual treatment of pipes, cables, and ropes shifts dramatically across the game’s sectors, mirroring the environmental narrative.

| Sector Theme | Mechanical Conduit Profile | Real-World & Visual Analog | Dominant Palette | Surface Imperfections |
|---|---|---|---|---|
| **Bunker (Standard Industrial)** | Rigid galvanized steel, unistrut conduit, black rubber power cables. | Submarine reactor rooms, naval bulkheads, heavy power sub-stations. | Gunmetal Grey (`#334155`), Safety Yellow (`#eab308`), Hazard Chevrons, Matte Black. | Rust bleeding from brackets, oil grime rings, chipped paint edges. |
| **Cryo (Sub-Zero Sector)** | Corrugated insulated coolant pipes, wrapped aluminum foil cladding, freon flex-tubes. | Industrial ammonia refrigeration, cryogenics facilities, permafrost stations. | Pale Seafoam Cyan (`#06b6d4`), Ice White (`#e2e8f0`), Muted Zinc, Insulated Foil. | Thick white frost patina, icicle stalactites hanging from low cable points, condensation runs. |
| **Bio / Cathedral (Giger Biomech)** | Ribbed black-latex tracheal hoses, bone-knuckle segmented tubing, pulsing umbilicals. | H.R. Giger biomechanical alien anatomy, medical peristaltic pumps, wet tendons. | Glossy Wet Black Latex (`#0f172a`), Ivory Bone (`#f1f5f9`), Chitin Amber (`#78350f`). | Wet specular sheen (roughness 0.15), translucent mucus slime drips, organic sinew webbing. |
| **Camp (Survivor Outpost)** | Makeshift spliced wiring, patched hoses with jubilee clips, twisted hemp/nylon cordage. | Guerrilla base camps, salvage vessels, emergency bypass jury-rigs. | Oxidized Copper (`#b45309`), Electrical Tape Black, Raw Hemp Tan (`#d97706`), Silver Duct Tape. | Mismatched splice joints, hanging makeshift incandescent work bulbs, frayed rope ends. |

### 6.1 Unified 2048x2048 PBR Atlas Layout
To keep all chunk spline runs inside **one single material** and **one draw call**, the textures are arranged in horizontal bands along the $V$-axis of a single atlas:

```
+-----------------------------------------------------------------------------------+
|               UNIFIED 2048x2048 SPLINE TEXTURE ATLAS (ALBEDO / ORM / NORMAL)      |
+-----------------------------------------------------------------------------------+
| V: 0.75 - 1.00 | RIGID STEEL PIPING & FLANGES                                     |
|                | Seamless brushed gunmetal, painted yellow bands, bolted flange   |
+-----------------------------------------------------------------------------------+
| V: 0.50 - 0.75 | RIBBED BIOMECH TRACHEA & CARTILAGE                               |
|                | Segmented wet latex rings, bone knuckle sleeves, slime channels  |
+-----------------------------------------------------------------------------------+
| V: 0.25 - 0.50 | INDUSTRIAL ELECTRICAL CABLES & CONDUIT                           |
|                | Braided wire mesh, matte rubber bundle, hazard stripe wrap       |
+-----------------------------------------------------------------------------------+
| V: 0.00 - 0.25 | RIGGING CORDAGE, HEMP ROPE & SINEW TETHERS                       |
|                | 3-strand twisted hemp fiber, high-tensile wire rope, raw sinew   |
+-----------------------------------------------------------------------------------+
```

- **$U$-Axis (Around Circumference):** Mapped $[0, 1]$ around the 3-sided or 6-sided prism.
- **$V$-Axis (Along Length):** Mapped along the spline curve arc-length, scaled so that textures repeat naturally (e.g. 1 tile per 1.0 meter).
- **Material Shader Config:**
  ```javascript
  const splineAtlasMaterial = new THREE.MeshStandardMaterial({
      map: atlasAlbedo,
      normalMap: atlasNormal,
      roughnessMap: atlasORM,
      metalnessMap: atlasORM,
      roughness: 0.7,
      metalness: 0.4
  });
  ```

---

## 7. Mathematical Formulations & Geometric Algorithms

### 7.1 Fast Catenary Evaluation (Parabolic Approximation)
True catenary curves involve hyperbolic cosines ($\cosh$), which are computationally expensive when evaluating hundreds of spline points.
For slack sags with $sag \ll span$, the Taylor expansion yields a parabolic curve with $< 1.5\%$ visual error:
$$\mathbf{P}(t) = (1 - t)\mathbf{P}_0 + t\mathbf{P}_1 + 4 \cdot sag \cdot t(1 - t) \cdot \mathbf{g}$$
where:
- $t \in [0, 1]$ is the normalized parameter along the span.
- $\mathbf{P}_0, \mathbf{P}_1$ are the start and end attachment coordinates.
- $\mathbf{g} = [0, -1, 0]$ is the downward gravity unit vector.
- $sag$ is the maximum sag depth in meters at $t = 0.5$.

### 7.2 Parallel Transport Frame Generation (RMF)
To extrude a 2D prism profile along a 3D spline curve with vertices $\mathbf{x}_0, \mathbf{x}_1, \dots, \mathbf{x}_N$:

1. Compute unit tangent vector at each point:
   $$\mathbf{T}_i = \frac{\mathbf{x}_{i+1} - \mathbf{x}_i}{\|\mathbf{x}_{i+1} - \mathbf{x}_i\|}$$
2. Initialize normal $\mathbf{R}_0$ at index 0 by projecting world up $\mathbf{u} = [0, 1, 0]$ onto the plane orthogonal to $\mathbf{T}_0$:
   $$\mathbf{R}_0 = \frac{\mathbf{u} - (\mathbf{u} \cdot \mathbf{T}_0)\mathbf{T}_0}{\|\mathbf{u} - (\mathbf{u} \cdot \mathbf{T}_0)\mathbf{T}_0\|}, \quad \mathbf{S}_0 = \mathbf{T}_0 \times \mathbf{R}_0$$
3. For each subsequent point $i$ to $i+1$:
   - Vector between points: $\mathbf{v}_1 = \mathbf{x}_{i+1} - \mathbf{x}_i$
   - Reflection vector: $\mathbf{n}_1 = \mathbf{T}_i + \mathbf{T}_{i+1}$
   - Rotate $\mathbf{R}_i$ using Householder reflection:
     $$\mathbf{R}_{i+1} = \mathbf{R}_i - 2 \frac{\mathbf{n}_1 \cdot \mathbf{R}_i}{\mathbf{n}_1 \cdot \mathbf{n}_1} \mathbf{n}_1$$
   - Compute bitangent: $\mathbf{S}_{i+1} = \mathbf{T}_{i+1} \times \mathbf{R}_{i+1}$.
4. Generate ring vertices for an $M$-sided polygon of radius $r$:
   $$\mathbf{V}_{i, k} = \mathbf{x}_i + r \cos\left(\frac{2\pi k}{M}\right)\mathbf{R}_i + r \sin\left(\frac{2\pi k}{M}\right)\mathbf{S}_i \quad (k = 0, \dots, M-1)$$

---

## 8. Implementation Code Architecture

The feature will be encapsulated into four cohesive modules that integrate directly with the existing room dressing pipeline.

```
src/
├── splineGeometry.js         # Core math: RMF, catenary, prism extrusion, buffer creation
├── splineRouter.js           # Placement planner: Room layout analysis, socket routing, ambient swags
├── data/
│   └── propSockets.js        # Catalog of 3D asset attachment points and normal vectors
└── splineDressingRenderer.js # Chunk-level geometry merging, atlas binding, and VRAM disposal
```

### 8.1 Module Contracts

#### `src/splineGeometry.js`
- `buildPrismTubeGeometry(points, { radius, sides = 4, vAtlasOffset = 0.0, vAtlasScale = 0.25 })`:
  Returns a `THREE.BufferGeometry` containing packed `position`, `normal`, and `uv` arrays.
- `evaluateCatenaryPoints(p0, p1, sag, segments = 6)`:
  Returns an array of `THREE.Vector3` points following the gravity curve.
- `evaluateFilletedManhattanPoints(waypoints, radius = 0.12, filletSegments = 3)`:
  Smooths 90° corners into industrial pipe bends.

#### `src/splineRouter.js`
- `planChunkSplineDressing(chunk, rooms, { seed })`:
  Inspects all room instances and their planned props in the chunk.
  1. Identifies hero prop pairs with matching sockets and plans interconnection splines.
  2. For open room spaces, plans 1–3 ambient overhead catenary swags ($Y \ge 2.2\text{m}$).
  3. For long wall bulkheads ($> 6\text{m}$), plans horizontal baseboard conduit runs ($Y = 0.25\text{m}$).
  4. Returns a manifest of spline descriptions: `{ type, radius, points, theme }`.

#### `src/splineDressingRenderer.js`
- `buildChunkSplineMesh(splineManifest, theme)`:
  Generates individual low-poly geometries for each spline in the manifest, merges them via `BufferGeometryUtils.mergeGeometries`, binds the shared atlas material, and tags the resulting single mesh for the chunk scene.

### 8.2 Integration into `src/threeGame.js`
In `ThreeGame.prototype.buildChunkRoomDressing` (around line 30680):
```javascript
// Step 1: Normal room dressing instanced batches
buildRoomDressingGroup(items, { ... }).then((dressing) => {
    group.add(dressing);
});

// Step 2: Single-batch procedural spline network
const splineManifest = planChunkSplineDressing(chunkMetadata, chunkMetadata.roomInstances, {
    seed: `${chunkX},${chunkY}:spline`
});
if (splineManifest?.length > 0) {
    const splineMesh = buildChunkSplineMesh(splineManifest, chunkTheme);
    if (splineMesh) {
        group.add(splineMesh);
        // Register for clean VRAM disposal on chunk unmount
        token.splineMesh = splineMesh;
    }
}
```

---

## 9. Rollout Roadmap & Verification Plan

### Phase 1: Pure Mathematical & Geometry Engine
- [ ] Implement `src/splineGeometry.js` with RMF Parallel Transport and low-poly prism extrusion.
- [ ] Implement parabolic catenary and filleted Manhattan curve generators.
- [ ] Unit tests (`src/splineGeometry.test.js`):
  - Verify that 3-sided, 4-sided, and 6-sided extrusions generate valid, non-degenerate normal vectors.
  - Verify that vertical lines ($Y$-aligned) do not produce NaN normals or gimbal twists.
  - Verify vertex count formulas: $N \text{ segments} \times M \text{ sides}$.

### Phase 2: Socket Catalog & Routing Logic
- [ ] Implement `src/data/propSockets.js` with initial socket coordinates for key machines (`prop_fusion_generator`, `prop_conduit_junction_box`, `prop_icey_frost_manifold`, `prop_coolant_drum_leaking_pool`, `prop_biomech_incubator`, `prop_biomech_tracheal_wall_pipe`).
- [ ] Implement `src/splineRouter.js` to route connections and ambient ceiling/wall swags.
- [ ] Unit tests (`src/splineRouter.test.js`):
  - Determinism test: verify identical point outputs across repeated runs with identical seed.
  - Clearance validation: assert that all overhead swags maintain $Y \ge 2.15\text{m}$ across room interiors.
  - Clearance validation: assert that floor cables never cross doorway threshold cells.

### Phase 3: Texture Atlas & Three.js Batch Renderer
- [ ] Author/pack the unified 2048x2048 PBR atlas (`public/textures/splines/conduit_atlas_pbr.png`) covering steel pipes, biomech trachea, rubber cables, and hemp rope.
- [ ] Implement `src/splineDressingRenderer.js` with `BufferGeometryUtils.mergeGeometries`.
- [ ] Hook into `src/threeGame.js` chunk load/unload lifecycle with recursive `.dispose()` safety.

### Phase 4: Biome Theming & Visual Polish
- [ ] Wire sector themes:
  - Bunker: Gunmetal + hazard striping + wall brackets.
  - Cryo: Insulated wrap + frost bloom shader modulation.
  - Bio: Wet black latex + pulsating cartilage umbilicals.
  - Camp: Spliced cables + hanging Edison work lamps.
- [ ] In-game review via furnished-room debug gallery (`/debug/museum` and live gameplay).

### Performance Acceptance Gate (Steam Deck Target):
1. **Draw Calls:** Exactly **+1 draw call** per active world chunk.
2. **CPU Build Time:** $< 1.2\text{ms}$ total execution time per chunk during level generation.
3. **Runtime Frame Cost:** **0.00ms** per frame (completely static after chunk mount).
4. **VRAM Footprint:** $< 1.5\text{MB}$ total geometry VRAM across all loaded active chunks.
5. **Gameplay Safety:** Zero player collision hitches, zero camera obstruction, zero AI navmesh degradation.
