# 3D Cinematic Cutscene System & Animation Director Plan

**Author:** Antigravity  
**Date:** 2026-08-20  
**Target:** Real-Time 3D Cutscenes & Multi-Rig Animation Sequencer

---

## 1. Executive Summary & Capabilities

Hunker Bunker now possesses the core 3D asset foundation for in-engine cinematic cutscenes:
1. **Fully Rigged Character & NPC Models**: Scout, Tank, Engineer, Camp Leaders (Kaelen, Martha, Briggs, Nahl, Val), and Hive Entities (Aria, Queen-00, Corrupted Martha, Corrupted Briggs) in `public/3d/runtime/new3ds/`.
2. **Standardized Skeleton**: All characters share or retarget to standard Mixamo bone hierarchies (`mixamorig:Hips`, `mixamorig:Spine`, `mixamorig:Head`, `mixamorig:RightArm`, etc.).
3. **Mixamo Retargeting Engine**: `src/player3dOverlay.js` already features an automated quaternion-track rotation retargeter (`retargetMixamoClip`) that strips invalid translation tracks and maps gestures across different body proportions without mesh distortion.
4. **Cinematic Three.js Engine**: Post-processing bloom, tilt-shift depth-of-field, volumetric fog, dynamic rim/spot lights, and letterbox UI chrome are already operational in `src/threeGame.js` and `src/armoryScene.js`.

This document outlines how to wire all animation clips across all models with smooth cross-fading, and provides the architectural blueprint for a **Real-Time 3D Cutscene Director** (`src/cutscene3dDirector.js`).

---

## 2. Animation Clip Wiring & Universal Blending Architecture

### A. Animation Library Catalog (Available in Repo)

```
art/source/new3d/
├── Action Adventure & Locomotion Pack
│   ├── walking.fbx
│   ├── running.fbx
│   ├── run to stop.fbx
│   ├── crouched sneaking left.fbx / right.fbx
│   ├── left cover sneak.fbx / right cover sneak.fbx
│   ├── stand to cover.fbx / cover to stand.fbx
│   ├── jumping up.fbx
│   ├── falling idle.fbx / falling to roll.fbx
│   ├── hard landing.fbx
│   └── idle (1..5).fbx
└── Character Signature Gestures
    ├── Strut Walking (Cryo-Vanguard Scout)
    ├── Opening Rig (Sub-Terran Drill Engineer)
    ├── Beckoning (Commander Briggs / Trench Warden)
    ├── Standing Greeting (Overseer Kaelen)
    ├── Dismissing Gesture (Mother Martha)
    ├── Rummaging (Dr. Nahl)
    ├── Pointing Forward (Val)
    ├── Floating Trance (Aria)
    ├── Awareness Look-Around (Queen-00)
    ├── Bio-Spore Dance / Combat (Corrupted Martha)
    └── Charge & Stop (Corrupted Briggs)
```

### B. Universal Retargeting & Smooth Blending Pipeline

```
┌────────────────────────────────────────────────────────┐
│                   Source Animation FBX/GLTF            │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│         retargetMixamoClip(clip, srcPrefix, destRig)   │
│   - Strips non-root translation tracks                 │
│   - Maps bone quaternion rotations to target armature  │
│   - Normalizes clip duration & loops                   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│            Three.js AnimationMixer & Actions           │
│   - prevAction.fadeOut(fadeDuration)                   │
│   - nextAction.reset().fadeIn(fadeDuration).play()     │
│   - Root bone position lerping for world translation   │
└────────────────────────────────────────────────────────┘
```

#### Smooth Transition Implementation:
```javascript
export function crossFadeAnimation(mixer, fromAction, toAction, duration = 0.35, warp = false) {
    if (!toAction) return;
    if (!fromAction || fromAction === toAction) {
        toAction.reset().fadeIn(duration).play();
        return;
    }
    toAction.reset();
    toAction.setEffectiveTimeScale(1);
    toAction.setEffectiveWeight(1);
    
    if (warp) {
        fromAction.crossFadeTo(toAction, duration, true);
    } else {
        fromAction.fadeOut(duration);
        toAction.fadeIn(duration);
    }
    toAction.play();
}
```

---

## 3. Real-Time 3D Cutscene Director Architecture (`src/cutscene3dDirector.js`)

The Cutscene Director provides a lightweight, deterministic, timeline-based sequence runner that orchestrates cameras, actors, animations, dialogue subtitles, audio cues, and post-processing effects.

### Sequence Script Schema

```javascript
export const SCENE_ACT1_DEPARTURE = {
    id: 'act1_departure',
    duration: 12.0, // seconds
    environment: {
        preset: 'bunker_staging_bay',
        ambientColor: 0x060b13,
        rimColor: 0xff9f1c,
        fogDensity: 0.04
    },
    actors: [
        {
            id: 'player',
            modelUrl: '/3d/runtime/new3ds/chassis_cryo_vanguard_scout.glb',
            initialTransform: { position: [0, 0, -5], rotation: [0, Math.PI, 0] }
        },
        {
            id: 'briggs',
            modelUrl: '/3d/runtime/new3ds/npc_kaelen.glb',
            initialTransform: { position: [2.5, 0, -2], rotation: [0, -Math.PI * 0.75, 0] }
        }
    ],
    timeline: [
        // ── Camera Track ───────────────────────────────────────
        {
            time: 0.0,
            type: 'camera',
            action: 'shot',
            from: { pos: [0, 1.6, 2], target: [0, 1.2, -5], fov: 45 },
            to: { pos: [0, 1.4, 0], target: [0, 1.2, -5], fov: 42 },
            duration: 4.0,
            ease: 'easeInOutQuad'
        },
        {
            time: 4.0,
            type: 'camera',
            action: 'shot',
            from: { pos: [3.2, 1.5, -1.0], target: [2.5, 1.5, -2], fov: 35 },
            duration: 3.5
        },
        
        // ── Character Animation Track ──────────────────────────
        {
            time: 0.0,
            actorId: 'player',
            type: 'animation',
            clip: 'strut_walk',
            fadeDuration: 0.4,
            speed: 1.0
        },
        {
            time: 3.8,
            actorId: 'player',
            type: 'animation',
            clip: 'run_to_stop',
            fadeDuration: 0.3
        },
        {
            time: 4.2,
            actorId: 'briggs',
            type: 'animation',
            clip: 'standing_greeting',
            fadeDuration: 0.4
        },
        
        // ── Dialogue & Subtitles ───────────────────────────────
        {
            time: 4.5,
            type: 'dialogue',
            speaker: 'OVERSEER KAELEN',
            text: 'The grid is pulsing outside the airlock. If you descend now, don\'t look back.',
            duration: 4.0,
            audioCue: 'sfx_radio_chime'
        },
        
        // ── Post-Processing & Cinematic Chrome ──────────────────
        {
            time: 0.0,
            type: 'fx',
            action: 'letterbox',
            ratio: '2.39:1', // Anamorphic widescreen black bars
            fadeDuration: 0.8
        },
        {
            time: 11.0,
            type: 'fx',
            action: 'fadeToBlack',
            duration: 1.0
        }
    ]
};
```

---

## 4. Key Cutscenes to Implement

| Scene ID | Location | Key Dramatic Beats | Cast | Duration |
|---|---|---|---|:---:|
| **1. `intro_crash_landing`** | Surface Glacial Trench | Ship wreckage, operator pulls out of pod, inspects frozen hazard terrain. | Player Scout/Tank/Eng | 8.5s |
| **2. `camp_first_contact`** | Meridian / Tallow / Vesper | Operator approaches blast doors, leader emerges with signature gesture, dialogue choice reveal. | Player + Kaelen / Martha / Briggs | 10.0s |
| **3. `queen_throne_reveal`** | Sub-Core Hive Heart | Camera pans across pulsing amber egg clutches, Queen-00 awakens with six-arm flare. | Queen-00 + Player | 9.0s |
| **4. `act2_extraction_escape`** | Hunker Bunker Evac Shaft | Operator breaches into escape cabin, ship engines ignite, cavern collapses behind. | Player + Rescue Vessel | 11.0s |

---

## 5. Technical Requirements & Implementation Plan

1. **Step 1: Animation Clip Extractor & Registry (`src/animationRegistry.js`)**:
   - Create a central registry mapping animation names (`strut_walk`, `beckon`, `rummage`, `floating`, `dance`, `cover_sneak`) to their loaded GLTF clips so any model can request and play any animation.
2. **Step 2: Smooth Cross-Fading Controller (`src/animationBlender.js`)**:
   - Wrap Three.js `AnimationMixer` with a high-level API: `.play(clipName)`, `.crossFade(toClip, duration)`, `.setLayerWeight(layer, weight)`.
3. **Step 3: Cutscene Sequence Runner (`src/cutscene3dDirector.js`)**:
   - Implement the timeline runner that parses sequence JSON, steps time `dt`, interpolates camera vectors (`lerp`/`slerp`), triggers dialogue UI events, and provides a clean `onComplete()` callback to seamlessly resume gameplay.
4. **Step 4: Cinematic HUD & Letterbox Overlay**:
   - Add `.cinematic-letterbox` top/bottom bars with subtitle rendering and a `[ESC] / [SPACE] Skip` prompt.
