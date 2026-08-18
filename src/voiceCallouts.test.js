import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initVoiceCallouts } from './voiceCallouts.js';

if (typeof globalThis.window === 'undefined') {
    globalThis.window = new EventTarget();
}
if (typeof globalThis.CustomEvent === 'undefined') {
    globalThis.CustomEvent = class CustomEvent extends Event {
        constructor(type, { detail } = {}) {
            super(type);
            this.detail = detail;
        }
    };
}

describe('voiceCallouts: real event -> cue wiring', () => {
    beforeEach(() => {
        window.AudioManager = { playVoiceCallout: vi.fn() };
        initVoiceCallouts();
    });

    const cases = [
        ['milestone-boss-spawned', {}, 'boss_spotted'],
        ['hive-harvest-boss-spawned', {}, 'boss_spotted'],
        ['mission-objective-complete', {}, 'sector_cleared'],
        ['player-extracted', {}, 'victory'],
        ['wall-breached', {}, 'breached'],
        ['dash-overdrive-ready', {}, 'overdrive_ready']
    ];

    it.each(cases)('%s dispatches -> playVoiceCallout(%s)', (eventName, detail, cue) => {
        window.dispatchEvent(new CustomEvent(eventName, { detail }));
        expect(window.AudioManager.playVoiceCallout).toHaveBeenCalledWith(cue);
    });

    it('enemy-killed with isBoss true plays target_down', () => {
        window.dispatchEvent(new CustomEvent('enemy-killed', { detail: { isBoss: true } }));
        expect(window.AudioManager.playVoiceCallout).toHaveBeenCalledWith('target_down');
    });

    it('enemy-killed without isBoss stays silent', () => {
        window.dispatchEvent(new CustomEvent('enemy-killed', { detail: { isBoss: false } }));
        expect(window.AudioManager.playVoiceCallout).not.toHaveBeenCalled();
    });
});
