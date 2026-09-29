---
name: game-dev
description: >-
  Comprehensive guide and design patterns for game development, game architecture, and game feel.
  Use this skill whenever building gameplay mechanics, game loops, fixed timestep physics,
  kinematic character controllers, screen shake and "juice", finite state machines (FSM),
  input action mapping, Web Audio systems, procedural generation (WFC, BSP), or combat systems.
---

# Game Development & Game Feel ("Juice") Mastery

This skill provides core game architecture patterns, deterministic loop setups, kinematic physics, input pipelines, audio architectures, and the principles of "game juice" to turn static 3D/2D scenes into punchy, responsive, and exhilarating games.

---

## The Golden Rules of Game Feel & Architecture

1. **Decouple Physics from Rendering (Fixed Timestep)**:
   Never run physics, collisions, or game logic directly on variable `requestAnimationFrame` delta times. High-refresh screens (144Hz+) or lag spikes will desync movement speeds and break collision checks. Always use a fixed simulation tick (e.g. 60Hz) with an accumulator.
   👉 See [references/game-loop-and-ticks.md](references/game-loop-and-ticks.md).

2. **Juice Every Action (The Vlambeer Principle)**:
   A game without juice feels sterile and cheap. Always layer physical feedback on interactions:
   - **Screen Shake**: Use trauma-based shake (`trauma^2`) with smooth noise, not raw random jitter.
   - **Hit Stop**: Freeze the simulation for 30–80ms on impactful hits.
   - **Particles & Impact**: Emit sparks, dust, or shell casings in the direction of the impact normal.
   - **Squash & Stretch**: Compress characters vertically on landing and stretch on jumping.
   👉 See [references/game-feel-and-juice.md](references/game-feel-and-juice.md).

3. **Forgiving Player Mechanics (Coyote Time & Buffering)**:
   Human reaction times and inputs are imperfect. Give players:
   - **Coyote Time**: Allow jumping for 100–150ms *after* walking off a ledge.
   - **Jump Buffering**: If the jump button is pressed 100ms *before* landing, execute the jump immediately upon landing.
   👉 See [references/character-controller-and-physics.md](references/character-controller-and-physics.md).

4. **Kinematic Over Rigid-Body for Player Movement**:
   Physics-driven rigid bodies (forces, impulses) often feel slippery, floaty, and frustrating to control. Use a **Kinematic Character Controller (KCC)** that directly updates velocity with explicit gravity, acceleration, and wall-sliding vector projections.

5. **Audio Feedback With Pitch Randomization**:
   Repetitive sound effects (footsteps, gunshots, sword swings) quickly trigger ear fatigue. Modulate `playbackRate` or pitch by `±8-12%` on every trigger.
   👉 See [references/audio-and-sound-design.md](references/audio-and-sound-design.md).

---

## Architectural Breakdown & Subdocs

Read the following specialized references when working on specific subsystems:

- **Game Loop & Fixed Timestep**: [references/game-loop-and-ticks.md](references/game-loop-and-ticks.md)
  - Accumulator pattern, lag spike clamping, spiral-of-death prevention, simulation alpha blending.
- **Game Feel & "Juice"**: [references/game-feel-and-juice.md](references/game-feel-and-juice.md)
  - Screen shake algorithms, hit stop / freeze frame, squash & stretch, impact particles, damage flashes.
- **State Machines & Systems**: [references/state-machines-and-systems.md](references/state-machines-and-systems.md)
  - Hierarchical Finite State Machines (HFSM) for characters and bosses, game state transitions, event bus decoupling.
- **Character Controller & Kinematics**: [references/character-controller-and-physics.md](references/character-controller-and-physics.md)
  - Kinematic character controller, wall sliding, step-up heights, slope limits, coyote time, jump buffering.
- **Input & Control Mapping**: [references/input-and-controls.md](references/input-and-controls.md)
  - Action-based input mapping, keyboard, mouse/pointer lock, gamepad API with analog deadzones.
- **Audio & Sound Design**: [references/audio-and-sound-design.md](references/audio-and-sound-design.md)
  - Web Audio API context unlock, audio pooling, 3D spatial audio, audio ducking, pitch variation.
- **Procedural Generation**: [references/procedural-generation.md](references/procedural-generation.md)
  - Wave Function Collapse (WFC), cellular automata caves, BSP room trees, seeded PRNG.

---

## Production Game Loop Implementation

For a battle-tested fixed timestep game loop with accumulator and lag clamping:
👉 [examples/game-loop.js](examples/game-loop.js)
