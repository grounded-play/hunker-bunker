# Input Handling: Unified Action Mapping & Gamepad API

Directly listening for `e.code === 'KeyW'` inside game entities couples input hardware directly to game logic. Modern games decouple input devices via **Action Mapping**.

---

## 1. Action Mapping System

Define abstract actions (`MOVE_FORWARD`, `FIRE`, `JUMP`, `INTERACT`) and map keys, mouse buttons, and gamepad buttons to them.

```javascript
export class InputManager {
  constructor() {
    this.keyBindings = {
      KeyW: 'MOVE_FORWARD',
      ArrowUp: 'MOVE_FORWARD',
      KeyS: 'MOVE_BACKWARD',
      ArrowDown: 'MOVE_BACKWARD',
      KeyA: 'MOVE_LEFT',
      ArrowLeft: 'MOVE_LEFT',
      KeyD: 'MOVE_RIGHT',
      ArrowRight: 'MOVE_RIGHT',
      Space: 'JUMP',
      ShiftLeft: 'SPRINT',
      KeyE: 'INTERACT',
    };

    this.mouseBindings = {
      0: 'PRIMARY_FIRE', // Left click
      2: 'SECONDARY_FIRE', // Right click
    };

    this.actions = new Map();
    this.justPressed = new Set();
    this.mouseDelta = { x: 0, y: 0 };
    this.pointerLocked = false;

    this.initListeners();
  }

  initListeners() {
    window.addEventListener('keydown', (e) => {
      const action = this.keyBindings[e.code];
      if (action) {
        if (!this.actions.get(action)) {
          this.justPressed.add(action);
        }
        this.actions.set(action, true);
      }
    });

    window.addEventListener('keyup', (e) => {
      const action = this.keyBindings[e.code];
      if (action) {
        this.actions.set(action, false);
      }
    });

    window.addEventListener('mousedown', (e) => {
      const action = this.mouseBindings[e.button];
      if (action) {
        this.justPressed.add(action);
        this.actions.set(action, true);
      }
    });

    window.addEventListener('mouseup', (e) => {
      const action = this.mouseBindings[e.button];
      if (action) {
        this.actions.set(action, false);
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.pointerLocked) {
        this.mouseDelta.x += e.movementX || 0;
        this.mouseDelta.y += e.movementY || 0;
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement !== null;
    });
  }

  isActionActive(actionName) {
    return !!this.actions.get(actionName);
  }

  wasActionJustPressed(actionName) {
    return this.justPressed.has(actionName);
  }

  // Call at the very end of every frame
  endFrame() {
    this.justPressed.clear();
    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;
  }
}
```

---

## 2. Gamepad API with Deadzone Filtering

Analog sticks require deadzone thresholds to prevent camera drift on worn controllers:

```javascript
export function pollGamepad(deadzone = 0.15) {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = gamepads[0];
  if (!gp) return null;

  function filterDeadzone(value) {
    if (Math.abs(value) < deadzone) return 0;
    // Rescale smoothly from deadzone to 1.0
    return Math.sign(value) * ((Math.abs(value) - deadzone) / (1 - deadzone));
  }

  return {
    leftStick: {
      x: filterDeadzone(gp.axes[0]),
      y: filterDeadzone(gp.axes[1]),
    },
    rightStick: {
      x: filterDeadzone(gp.axes[2]),
      y: filterDeadzone(gp.axes[3]),
    },
    jump: gp.buttons[0]?.pressed,     // A / Cross
    fire: gp.buttons[7]?.value > 0.1, // Right Trigger
  };
}
```
