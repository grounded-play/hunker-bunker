const STATE_PRIORITY = Object.freeze([
    ['dead', (state) => state.dead],
    ['critical', (state) => state.critical],
    ['frozen', (state) => state.frozen],
    ['toxic', (state) => state.toxic],
    ['boss', (state) => state.boss],
    ['reloading', (state) => state.reloading],
    ['engaged', (state) => state.engaged],
    ['ability-ready', (state) => state.abilityReady],
    ['idle', () => true]
]);

export function resolveHudGameplayState(input = {}) {
    const hp = Number(input.hp);
    const o2 = Number(input.o2);
    const maxO2 = Math.max(1, Number(input.maxO2) || 100);
    const hull = Number(input.hull);
    const maxHull = Math.max(1, Number(input.maxHull) || 1);
    const state = {
        dead: Boolean(input.dead) || (Number.isFinite(hp) && hp <= 0),
        critical: Boolean(input.hazardActive)
            || (Number.isFinite(hp) && hp <= 1)
            || (Number.isFinite(o2) && o2 / maxO2 <= 0.25)
            || (Number.isFinite(hull) && hull / maxHull <= 0.25),
        frozen: Boolean(input.frozen),
        toxic: Boolean(input.toxic),
        boss: Boolean(input.bossActive),
        reloading: Boolean(input.reloading),
        engaged: Boolean(input.inCombat),
        abilityReady: Boolean(input.abilityReady)
    };
    return STATE_PRIORITY.find(([, matches]) => matches(state))?.[0] ?? 'idle';
}

function elementVisible(element) {
    return Boolean(element)
        && !element.classList.contains('hidden')
        && element.getAttribute('aria-hidden') !== 'true';
}

export class HudGameplayStateController {
    constructor(documentRef = document) {
        this.document = documentRef;
        this.window = documentRef.defaultView;
        this.root = documentRef.documentElement;
        this.body = documentRef.body;
        this.snapshot = {};
        this.cleanups = [];
        this.observer = null;
        this.feedbackTimers = new Map();
    }

    start() {
        const listen = (name, handler) => {
            this.window?.addEventListener(name, handler);
            this.cleanups.push(() => this.window?.removeEventListener(name, handler));
        };
        listen('combat-state-changed', (event) => this.update({ inCombat: Boolean(event.detail?.active) }));
        listen('player-health-changed', (event) => this.update({ hp: event.detail?.hp, maxHp: event.detail?.maxHp }));
        listen('player-o2-changed', (event) => this.update({ o2: event.detail?.o2, maxO2: event.detail?.maxO2 ?? 100 }));
        listen('ship-health-changed', (event) => this.update({ hull: event.detail?.hp, maxHull: event.detail?.maxHp }));
        listen('weapon-clip-updated', (event) => {
            const wasReloading = Boolean(this.snapshot.reloading);
            const reloading = Boolean(event.detail?.reloading);
            this.update({ reloading });
            if (wasReloading && !reloading) this.pulse('weapon-status-panel', 'reload-complete');
        });
        listen('player-death', () => this.update({ dead: true }));
        listen('health-restored', (event) => this.update({ dead: false, hp: event.detail?.hp, maxHp: event.detail?.maxHp }));
        listen('pickup-collected', () => this.pulse('pickup-counter-panel', 'pickup'));
        listen('shell-collected', () => this.pulse('pickup-counter-panel', 'pickup'));

        this.observer = new MutationObserver(() => this.readDomState());
        const observed = [
            this.body,
            this.document.getElementById('boss-status-panel'),
            this.document.getElementById('hazard-status-panel'),
            this.document.getElementById('class-ability-panel'),
            this.document.getElementById('radar-scan-panel')
        ].filter(Boolean);
        for (const element of observed) {
            this.observer.observe(element, { attributes: true, attributeFilter: ['class', 'aria-hidden'] });
        }
        this.readDomState();
        return this;
    }

    stop() {
        for (const cleanup of this.cleanups.splice(0)) cleanup();
        this.observer?.disconnect();
        this.observer = null;
        for (const timer of this.feedbackTimers.values()) this.window?.clearTimeout(timer);
        this.feedbackTimers.clear();
    }

    readDomState() {
        const abilityPanels = [
            this.document.getElementById('class-ability-panel'),
            this.document.getElementById('radar-scan-panel')
        ].filter(Boolean);
        const abilityReady = abilityPanels.some((panel) => panel.classList.contains('class-ability-panel--ready'));
        if (abilityReady && !this.snapshot.abilityReady) {
            const readyPanel = abilityPanels.find((panel) => panel.classList.contains('class-ability-panel--ready'));
            if (readyPanel?.id) this.pulse(readyPanel.id, 'ability-ready');
        }
        this.update({
            frozen: this.body?.classList.contains('player-cold-exposed'),
            toxic: this.body?.classList.contains('player-poisoned'),
            hazardActive: elementVisible(this.document.getElementById('hazard-status-panel')),
            bossActive: elementVisible(this.document.getElementById('boss-status-panel')),
            abilityReady
        });
    }

    update(patch = {}) {
        Object.assign(this.snapshot, patch);
        const state = resolveHudGameplayState(this.snapshot);
        if (this.root.dataset.hudGameplayState === state) return state;
        this.root.dataset.hudGameplayState = state;
        this.window?.dispatchEvent(new CustomEvent('hud-gameplay-state-changed', {
            detail: { state, snapshot: { ...this.snapshot } }
        }));
        return state;
    }

    pulse(id, feedback) {
        const element = this.document.getElementById(id);
        if (!element) return;
        const existing = this.feedbackTimers.get(id);
        if (existing) this.window?.clearTimeout(existing);
        element.dataset.hudFeedback = feedback;
        const timer = this.window?.setTimeout(() => {
            if (element.dataset.hudFeedback === feedback) delete element.dataset.hudFeedback;
            this.feedbackTimers.delete(id);
        }, 600);
        this.feedbackTimers.set(id, timer);
    }
}

if (typeof document !== 'undefined') {
    window.hudGameplayState = new HudGameplayStateController(document).start();
}
