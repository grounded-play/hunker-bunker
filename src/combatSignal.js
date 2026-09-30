export const DEFAULT_COMBAT_WINDOW_SECONDS = 4;

export class CombatSignal {
    constructor({ windowSeconds = DEFAULT_COMBAT_WINDOW_SECONDS } = {}) {
        this.windowSeconds = Math.max(0, Number(windowSeconds) || 0);
        this.remainingSeconds = 0;
        this.active = false;
        this.lastSource = null;
    }

    mark(source = 'unknown') {
        const changed = !this.active;
        this.remainingSeconds = this.windowSeconds;
        this.active = this.windowSeconds > 0;
        this.lastSource = source;
        return { active: this.active, changed, source: this.lastSource };
    }

    update(deltaSeconds = 0) {
        if (!this.active) {
            return { active: false, changed: false, source: this.lastSource };
        }
        const delta = Math.max(0, Number(deltaSeconds) || 0);
        this.remainingSeconds = Math.max(0, this.remainingSeconds - delta);
        if (this.remainingSeconds > Number.EPSILON) {
            return { active: true, changed: false, source: this.lastSource };
        }
        this.active = false;
        return { active: false, changed: true, source: this.lastSource };
    }

    reset() {
        const changed = this.active;
        this.remainingSeconds = 0;
        this.active = false;
        this.lastSource = null;
        return { active: false, changed, source: null };
    }
}
