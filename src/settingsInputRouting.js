// Steam Deck Gaming Mode runs under gamescope, which does not show Chromium's
// native <select> popup: it opens as a separate window the compositor never
// presents. On 2026-10-15 two Deck players tapped the camera-mode dropdown
// (one three times in a second) and nothing opened. Controller A already
// routes dropdowns to the in-game picker (#select-picker-overlay); a touch or
// trackpad press on the Deck now does the same. Desktop keeps its native
// popup.
export function selectPressNeedsInGamePicker(event, { isSteamDeck = false } = {}) {
    if (!isSteamDeck || !event || event.button !== 0) return null;
    const select = event.target?.closest?.('select');
    if (!select || select.disabled) return null;
    if (select.closest?.('#select-picker-overlay')) return null;
    return select;
}

// Settings changes go to the session log, so a playtest log shows what a
// player changed and not only that they opened the panel.
export function describeSettingChange(target) {
    const id = typeof target?.id === 'string' ? target.id : '';
    if (!id.startsWith('setting-')) return null;
    const value = target.type === 'checkbox' ? Boolean(target.checked) : String(target.value ?? '');
    return { id, value };
}
