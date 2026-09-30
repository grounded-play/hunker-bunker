import { loadAccessibilitySettings } from './accessibilitySettings.js';
import { isGoreEnabled } from './featureFlags.js';
import { createSuitCondition, reduceSuitCondition, resolveSuitCondition } from './suitCondition.js';

const BLOOD_RGB = Object.freeze({
    human: '126, 20, 25',
    alien: '157, 170, 76',
    ichor: '79, 105, 118'
});

export class SuitConditionController {
    constructor(documentRef = document) {
        this.document = documentRef;
        this.window = documentRef.defaultView;
        this.root = documentRef.documentElement;
        this.body = documentRef.body;
        this.state = createSuitCondition();
        this.cleanups = [];
        this.observer = null;
        this.dryTimer = null;
        this.joltTimer = null;
    }

    start() {
        const listen = (name, handler) => {
            this.window?.addEventListener(name, handler);
            this.cleanups.push(() => this.window?.removeEventListener(name, handler));
        };
        listen('combat-state-changed', (event) => this.apply({ type: 'combat', active: event.detail?.active }));
        listen('player-damaged', (event) => {
            const detail = event.detail ?? {};
            this.apply({
                type: 'damage',
                hp: detail.hp,
                maxHp: detail.maxHp,
                reason: detail.reason,
                inCombat: this.state.inCombat,
                goreEnabled: isGoreEnabled(),
                direction: this.resolveHitDirection(detail.sourceX, detail.sourceZ)
            }, { jolt: true });
        });
        listen('player-death', () => this.apply({ type: 'death' }));
        listen('player-health-changed', (event) => {
            const hp = Number(event.detail?.hp);
            if (this.state.dead && hp > 0) this.apply({ type: 'new-life' });
        });
        listen('health-restored', (event) => {
            const hp = Number(event.detail?.hp);
            const maxHp = Math.max(1, Number(event.detail?.maxHp) || 1);
            if (hp >= maxHp) this.apply({ type: 'wash' });
        });
        listen('camp-verb-activated', (event) => {
            if (event.detail?.campId === 'camp_tallow') this.apply({ type: 'wash' });
        });
        listen('suit-washed', () => this.apply({ type: 'wash' }));
        listen('suit-repaired', () => this.apply({ type: 'repair' }));

        const goreToggle = this.document.getElementById('setting-gore-toggle');
        const onGoreChange = () => {
            if (!goreToggle?.checked) this.apply({ type: 'clear-blood' });
        };
        goreToggle?.addEventListener('change', onGoreChange);
        this.cleanups.push(() => goreToggle?.removeEventListener('change', onGoreChange));

        for (const id of ['setting-reduced-pressure', 'setting-contrast']) {
            const element = this.document.getElementById(id);
            const rerender = () => this.render();
            element?.addEventListener('change', rerender);
            this.cleanups.push(() => element?.removeEventListener('change', rerender));
        }

        this.observer = new MutationObserver(() => this.readConditions());
        for (const element of [this.body, this.document.getElementById('console-terminal-modal')].filter(Boolean)) {
            this.observer.observe(element, { attributes: true, attributeFilter: ['class'] });
        }
        this.readConditions();
        this.render();
        return this;
    }

    stop() {
        for (const cleanup of this.cleanups.splice(0)) cleanup();
        this.observer?.disconnect();
        this.observer = null;
        if (this.dryTimer) this.window?.clearInterval(this.dryTimer);
        if (this.joltTimer) this.window?.clearTimeout(this.joltTimer);
        this.dryTimer = null;
        this.joltTimer = null;
    }

    resolveHitDirection(sourceX, sourceZ) {
        const game = this.window?.game;
        const player = game?.player?.position;
        const right = game?.cameraPlanarRight;
        if (![sourceX, sourceZ, player?.x, player?.z, right?.x, right?.y].every(Number.isFinite)) return 'center';
        const dx = Number(sourceX) - player.x;
        const dz = Number(sourceZ) - player.z;
        const length = Math.hypot(dx, dz) || 1;
        const side = (dx * right.x + dz * right.y) / length;
        if (side < -0.3) return 'left';
        if (side > 0.3) return 'right';
        return 'center';
    }

    readConditions() {
        const frozen = this.body?.classList.contains('player-cold-exposed') ? 1 : 0;
        const toxin = this.body?.classList.contains('player-poisoned') ? 1 : 0;
        if (this.state.frost !== frozen) this.state = reduceSuitCondition(this.state, { type: 'frost', intensity: frozen });
        if (this.state.toxin !== toxin) this.state = reduceSuitCondition(this.state, { type: 'toxin', intensity: toxin });

        const consoleModal = this.document.getElementById('console-terminal-modal');
        if (consoleModal && !consoleModal.classList.contains('hidden') && this.state.bloodCount > 0) {
            this.state = reduceSuitCondition(this.state, { type: 'wash' });
        }
        this.render();
    }

    apply(event, { jolt = false } = {}) {
        this.state = reduceSuitCondition(this.state, event);
        this.render({ jolt });
        this.syncDryTimer();
        return this.state;
    }

    visualPressure() {
        const settings = loadAccessibilitySettings();
        return settings.reducedPressure || settings.contrast === 'max' ? 0.4 : 1;
    }

    render({ jolt = false } = {}) {
        const view = resolveSuitCondition(this.state, { visualPressure: this.visualPressure() });
        const style = this.root.style;
        style.setProperty('--suit-blood', view.overlays.blood.toFixed(3));
        style.setProperty('--suit-blood-dry', view.overlays.bloodDry.toFixed(3));
        style.setProperty('--suit-scuffs', view.overlays.scuffs.toFixed(3));
        style.setProperty('--suit-frost', view.overlays.frost.toFixed(3));
        style.setProperty('--suit-toxin', view.overlays.toxin.toFixed(3));
        style.setProperty('--suit-blood-rgb', BLOOD_RGB[view.bloodColor] ?? BLOOD_RGB.human);
        this.root.dataset.suitDamageTier = String(view.damageTier);
        this.root.dataset.suitLamp = view.lamps.suit;
        this.root.dataset.thermalLamp = view.lamps.thermal;
        this.root.dataset.toxinLamp = view.lamps.toxin;
        this.root.dataset.suitBloodState = view.overlays.blood <= 0
            ? 'clean' : view.overlays.bloodDry >= 1 ? 'dried' : 'fresh';

        if (jolt && view.jolt) {
            this.root.dataset.suitHitDirection = view.jolt;
            if (this.joltTimer) this.window?.clearTimeout(this.joltTimer);
            this.joltTimer = this.window?.setTimeout(() => {
                delete this.root.dataset.suitHitDirection;
                this.joltTimer = null;
            }, 600);
        }
        this.window?.dispatchEvent(new CustomEvent('suit-condition-changed', { detail: { ...view } }));
        return view;
    }

    syncDryTimer() {
        const shouldTick = !this.state.inCombat && this.state.bloodCount > 0 && this.state.bloodDryMs < 30_000;
        if (shouldTick && !this.dryTimer) {
            this.dryTimer = this.window?.setInterval(() => {
                this.state = reduceSuitCondition(this.state, { type: 'tick', deltaMs: 250 });
                this.render();
                this.syncDryTimer();
            }, 250);
        } else if (!shouldTick && this.dryTimer) {
            this.window?.clearInterval(this.dryTimer);
            this.dryTimer = null;
        }
    }
}

if (typeof document !== 'undefined') {
    window.suitCondition = new SuitConditionController(document).start();
}
