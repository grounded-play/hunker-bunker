# State Machines & Systems Architecture in Games

Clean separation of state prevents spaghetti code where movement, combat, animations, and inputs bleed together into hundreds of nested `if-else` blocks.

---

## 1. Hierarchical Finite State Machine (HFSM)

Use a dedicated FSM for entities (characters, bosses, AI) and for overall game modes (Menu, Loading, Playing, Paused, GameOver).

### Generic State Machine Pattern

```javascript
export class State {
  constructor(entity) {
    this.entity = entity;
  }
  enter(prevState) {}
  update(dt) {}
  exit(nextState) {}
  canTransitionTo(nextStateName) {
    return true;
  }
}

export class StateMachine {
  constructor(entity) {
    this.entity = entity;
    this.states = new Map();
    this.currentState = null;
    this.currentStateName = null;
  }

  addState(name, stateInstance) {
    this.states.set(name, stateInstance);
    return this;
  }

  setState(name) {
    if (this.currentStateName === name) return;

    const nextState = this.states.get(name);
    if (!nextState) {
      console.warn(`State "${name}" does not exist on state machine.`);
      return;
    }

    if (this.currentState && !this.currentState.canTransitionTo(name)) {
      return; // Transition rejected
    }

    const prevState = this.currentState;
    if (this.currentState) {
      this.currentState.exit(nextState);
    }

    this.currentState = nextState;
    this.currentStateName = name;
    this.currentState.enter(prevState);
  }

  update(dt) {
    if (this.currentState) {
      this.currentState.update(dt);
    }
  }
}
```

### Example: Character Combat States

```javascript
class AttackState extends State {
  constructor(entity) {
    super(entity);
    this.timer = 0;
    this.duration = 0.45; // 450ms attack animation
  }

  enter() {
    this.timer = 0;
    this.entity.animator.play('attack_slash', 0.1);
    this.entity.performAttackHitbox();
  }

  update(dt) {
    this.timer += dt;
    if (this.timer >= this.duration) {
      this.entity.fsm.setState('idle');
    }
  }

  canTransitionTo(nextStateName) {
    // Only allow hurt or death to cancel attack prematurely
    return nextStateName === 'hurt' || nextStateName === 'dead';
  }
}
```

---

## 2. Decoupled Event Bus (Pub-Sub)

Use a lightweight event bus to decouple game simulation from HUD updates, achievements, audio, and analytics:

```javascript
class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in event listener for "${event}":`, err);
        }
      });
    }
  }
}

export const events = new EventBus();
```
