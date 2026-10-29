import { describe, expect, it } from 'vitest';
import { describeSettingChange, selectPressNeedsInGamePicker } from './settingsInputRouting.js';

function selectTarget({ disabled = false, inPicker = false } = {}) {
    const select = { tagName: 'SELECT', disabled, closest: (q) => (q === '#select-picker-overlay' && inPicker ? {} : null) };
    return { closest: (q) => (q === 'select' ? select : null), select };
}

describe('dropdown presses on the Steam Deck', () => {
    // 2026-10-15: the camera dropdown never opened under Gaming Mode.
    it('sends a Deck touch or trackpad press on a dropdown to the in-game picker', () => {
        const target = selectTarget();
        expect(selectPressNeedsInGamePicker({ button: 0, target }, { isSteamDeck: true })).toBe(target.select);
    });

    it('leaves desktop, right clicks, disabled dropdowns and the picker itself alone', () => {
        const target = selectTarget();
        expect(selectPressNeedsInGamePicker({ button: 0, target }, { isSteamDeck: false })).toBeNull();
        expect(selectPressNeedsInGamePicker({ button: 2, target }, { isSteamDeck: true })).toBeNull();
        expect(selectPressNeedsInGamePicker({ button: 0, target: selectTarget({ disabled: true }) }, { isSteamDeck: true })).toBeNull();
        expect(selectPressNeedsInGamePicker({ button: 0, target: selectTarget({ inPicker: true }) }, { isSteamDeck: true })).toBeNull();
        expect(selectPressNeedsInGamePicker({ button: 0, target: { closest: () => null } }, { isSteamDeck: true })).toBeNull();
    });
});

describe('settings changes in the session log', () => {
    it('records the setting id and its new value', () => {
        expect(describeSettingChange({ id: 'setting-camera-mode', value: 'isometric' })).toEqual({ id: 'setting-camera-mode', value: 'isometric' });
        expect(describeSettingChange({ id: 'setting-screen-shake', type: 'checkbox', checked: false })).toEqual({ id: 'setting-screen-shake', value: false });
    });

    it('ignores controls that are not settings', () => {
        expect(describeSettingChange({ id: 'net-room-code', value: 'X' })).toBeNull();
        expect(describeSettingChange(null)).toBeNull();
    });
});
