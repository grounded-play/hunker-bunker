import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { VitalsHUD } from './vitals.js';
import { FATIGUE_STAGES } from './fatigue.js';

// Minimal DOM: the HUD only needs the nodes it writes to. The suite runs in
// node, so document/window are stubbed rather than jsdom'd.
function el() {
    const node = {
        textContent: '',
        _classes: new Set(),
        style: {},
        classList: {
            toggle(name, on) { if (on) node._classes.add(name); else node._classes.delete(name); },
            add(name) { node._classes.add(name); },
            remove(name) { node._classes.delete(name); },
            contains: (name) => node._classes.has(name)
        },
        replaceChildren() { node.children = []; },
        appendChild(child) { (node.children ??= []).push(child); },
        setAttribute() {}
    };
    return node;
}

let nodes;
let listeners;

beforeEach(() => {
    nodes = {
        'vitals-panel': el(),
        'vitals-hearts': el(),
        'vitals-o2-bar': el(),
        'vitals-o2-pct': el(),
        'vitals-o2-label': el(),
        'vitals-fatigue-row': el(),
        'vitals-fatigue-stage': el()
    };
    listeners = new Map();
    globalThis.document = {
        getElementById: (id) => nodes[id] ?? null,
        createElement: () => el(),
        body: el()
    };
    globalThis.window = {
        addEventListener: (type, fn) => listeners.set(type, fn),
        removeEventListener: (type) => listeners.delete(type)
    };
});

afterEach(() => {
    delete globalThis.document;
    delete globalThis.window;
});

const fire = (type, detail) => listeners.get(type)?.({ detail });

describe('VitalsHUD fatigue readout', () => {
    it('subscribes to fatigue without owning any fatigue state', () => {
        const hud = new VitalsHUD();
        expect(listeners.has('fatigue-changed')).toBe(true);
        // The HUD holds no ladder of its own: it renders what it is told.
        expect(hud.state.expeditionsSinceSleep).toBeUndefined();
        expect(hud.state.scars).toBeUndefined();
    });

    it('shows the stage it is handed and stays hidden at baseline', () => {
        new VitalsHUD();
        // RESTED and ALERT are unremarkable; the row stays out of the way.
        fire('fatigue-changed', { stageId: 'ALERT', stageLabel: 'ALERT' });
        expect(nodes['vitals-fatigue-row']._classes.has('hidden')).toBe(true);

        fire('fatigue-changed', { stageId: 'RAGGED', stageLabel: 'RAGGED' });
        expect(nodes['vitals-fatigue-row']._classes.has('hidden')).toBe(false);
        expect(nodes['vitals-fatigue-stage'].textContent).toBe('RAGGED');
    });

    it('marks the body with the stage so strain treatment is pure CSS', () => {
        new VitalsHUD();
        fire('fatigue-changed', { stageId: 'LONG_DARK', stageLabel: 'THE LONG DARK' });
        expect(document.body._classes.has('fatigue-long-dark')).toBe(true);

        // Sleeping clears it again.
        fire('fatigue-changed', { stageId: 'RESTED', stageLabel: 'RESTED' });
        expect(document.body._classes.has('fatigue-long-dark')).toBe(false);
        expect(document.body._classes.has('fatigue-ragged')).toBe(false);
    });

    it('accepts every stage the module defines, so a new stage cannot desync', () => {
        new VitalsHUD();
        for (const stage of FATIGUE_STAGES) {
            expect(() => fire('fatigue-changed', { stageId: stage.id, stageLabel: stage.label })).not.toThrow();
            expect(nodes['vitals-fatigue-stage'].textContent).toBe(
                stage.id === 'RESTED' || stage.id === 'ALERT' ? '' : stage.label
            );
        }
    });

    it('survives a malformed or empty event', () => {
        new VitalsHUD();
        expect(() => fire('fatigue-changed', undefined)).not.toThrow();
        expect(() => fire('fatigue-changed', { stageId: 'NOT_A_STAGE' })).not.toThrow();
        expect(nodes['vitals-fatigue-row']._classes.has('hidden')).toBe(true);
    });

    it('drops the body class on destroy so it cannot leak into the menu', () => {
        const hud = new VitalsHUD();
        fire('fatigue-changed', { stageId: 'RAGGED', stageLabel: 'RAGGED' });
        expect(document.body._classes.has('fatigue-ragged')).toBe(true);
        hud.destroy();
        expect(document.body._classes.has('fatigue-ragged')).toBe(false);
        expect(listeners.has('fatigue-changed')).toBe(false);
    });
});
