const XBOX_LABELS = Object.freeze({
    confirm: 'A',
    interact: 'A',
    back: 'B',
    reload: 'X',
    ability: 'Y',
    tabLeft: 'LB',
    tabRight: 'RB',
    sprint: 'LS',
    fire: 'RT',
    scan: 'B',
    pause: 'MENU',
    toggleMap: 'VIEW'
});

const PLAYSTATION_LABELS = Object.freeze({
    ...XBOX_LABELS,
    confirm: 'X',
    interact: 'X',
    back: 'O',
    reload: '□',
    ability: '△',
    tabLeft: 'L1',
    tabRight: 'R1',
    sprint: 'L3',
    fire: 'R2',
    scan: 'O',
    pause: 'OPTIONS',
    toggleMap: 'CREATE'
});

const SWITCH_LABELS = Object.freeze({
    ...XBOX_LABELS,
    confirm: 'B',
    interact: 'B',
    back: 'A',
    reload: 'Y',
    ability: 'X',
    tabLeft: 'L',
    tabRight: 'R',
    sprint: 'L STICK',
    fire: 'ZR',
    scan: 'A',
    pause: '+',
    toggleMap: '-'
});

const PLAYSTATION_TYPES = new Set(['PS3Controller', 'PS4Controller', 'PS5Controller']);
const SWITCH_TYPES = new Set(['SwitchProController', 'SwitchJoyConPair', 'SwitchJoyConSingle']);

export function getControllerGlyphLabel(action, controllerType, fallbackLabel = '') {
    const normalizedAction = String(action ?? '').trim();
    if (!normalizedAction) return String(fallbackLabel ?? '');

    const labels = PLAYSTATION_TYPES.has(controllerType)
        ? PLAYSTATION_LABELS
        : SWITCH_TYPES.has(controllerType)
            ? SWITCH_LABELS
            : XBOX_LABELS;

    return labels[normalizedAction]
        ?? String(fallbackLabel || normalizedAction.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase());
}

