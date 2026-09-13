import { describe, expect, it, vi } from 'vitest';
import { handleSettingsWheel, shouldBlockWheel } from './settingsWheelGuard.js';

const fakeTarget = (match) => ({
    closest: (sel) => (sel === 'select' && match ? { tagName: 'SELECT' } : null),
    blur: vi.fn()
});

describe('settings wheel guard', () => {
    it('blocks a wheel event landing on a select', () => {
        const event = { target: fakeTarget(true), preventDefault: vi.fn() };
        expect(handleSettingsWheel(event)).toBe(true);
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('leaves a wheel event over ordinary content alone so the panel still scrolls', () => {
        const event = { target: fakeTarget(false), preventDefault: vi.fn() };
        expect(handleSettingsWheel(event)).toBe(false);
        expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('treats a child of a select as the select', () => {
        expect(shouldBlockWheel(fakeTarget(true))).toBe(true);
    });

    it('tolerates a missing or malformed target', () => {
        expect(shouldBlockWheel(null)).toBe(false);
        expect(shouldBlockWheel({})).toBe(false);
        expect(handleSettingsWheel({})).toBe(false);
    });
});
