// On-screen hints that name keyboard keys get a controller version (Sprint
// 51: "Radar Scan [Q]" and "[M] / [ESC] CLOSE" on a Steam Deck). Elements
// keep the keyboard key in their data-i18n attribute; in controller mode it
// is swapped for the pad key, so locale changes re-translate the right one.

export const PAD_HINT_KEYS = Object.freeze({
    'ui.tactical_map.drag_wasd_l_stick_pan': 'ui.input_hint.pad.map_pan',
    'ui.tactical_map.scroll_lb_rb_zoom': 'ui.input_hint.pad.map_zoom',
    'ui.tactical_map.h_x_home_p_y': 'ui.input_hint.pad.map_operator',
    'ui.tactical_map.m_select_esc_close': 'ui.input_hint.pad.map_close',
    'ui.desktop_compass.map_m': 'ui.input_hint.pad.compass_map',
    'ui.radar_scan.title_radar_scan_q': 'ui.input_hint.pad.radar_scan',
    'ui.armory.cycle_hint': 'ui.input_hint.pad.armory_cycle',
    'ui.menu.esc': 'ui.input_hint.pad.menu_back'
});

const KEYBOARD_BY_PAD = Object.freeze(Object.fromEntries(Object.entries(PAD_HINT_KEYS).map(([kb, pad]) => [pad, kb])));
const ATTRIBUTES = Object.freeze([
    ['data-i18n', (element, text) => { element.textContent = text; }],
    ['data-i18n-title', (element, text) => element.setAttribute('title', text)],
    ['data-i18n-aria-label', (element, text) => element.setAttribute('aria-label', text)]
]);

/** The key a hint should show for the current input device. */
export function hintKeyFor(key, controller) {
    const keyboard = KEYBOARD_BY_PAD[key] ?? key;
    return controller ? (PAD_HINT_KEYS[keyboard] ?? keyboard) : keyboard;
}

/** Swap every keyboard/pad hint under `root` to the current device. */
export function applyInputHints(root, controller, translate) {
    if (!root?.querySelectorAll) return 0;
    let changed = 0;
    for (const [attribute, write] of ATTRIBUTES) {
        for (const element of root.querySelectorAll(`[${attribute}]`)) {
            const current = element.getAttribute(attribute);
            if (!PAD_HINT_KEYS[current] && !KEYBOARD_BY_PAD[current]) continue;
            const next = hintKeyFor(current, controller);
            if (next === current) continue;
            element.setAttribute(attribute, next);
            write(element, translate(next));
            changed += 1;
        }
    }
    return changed;
}
