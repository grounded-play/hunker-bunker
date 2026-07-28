// Semantic action routing per docs/steam-deck-first-display-and-input-spec.md.
// The game asks for actions inside an active action set (menu / gameplay /
// archive); the physical source — Steam Input natively, or a browser Gamepad
// snapshot from mapBrowserGamepad — stays behind this layer. Names mirror
// steam/steam_input_manifest.vdf.

export const ACTION_SETS = Object.freeze({
    MENU: 'menu',
    GAMEPLAY: 'gameplay',
    ARCHIVE: 'archive'
});

const VALID_SETS = new Set(Object.values(ACTION_SETS));

const NEUTRAL_PAD = Object.freeze({
    move: Object.freeze({ x: 0, y: 0 }),
    fire: false,
    interact: false,
    reload: false,
    ability: false,
    dash: false,
    scan: false,
    pause: false,
    toggleMap: false,
    menuUp: false,
    menuDown: false,
    menuLeft: false,
    menuRight: false,
    menuConfirm: false,
    menuBack: false,
    menuTabLeft: false,
    menuTabRight: false
});

export function createActionRouter() {
    let activeSet = ACTION_SETS.MENU;
    let previous = {};

    // Rising-edge detector for discrete presses so a held button fires once.
    function edge(name, level) {
        const fired = Boolean(level) && !previous[name];
        previous[name] = Boolean(level);
        return fired;
    }

    function deriveMenuActions(pad) {
        return {
            up: edge('menu_up', pad.menuUp),
            down: edge('menu_down', pad.menuDown),
            left: edge('menu_left', pad.menuLeft),
            right: edge('menu_right', pad.menuRight),
            confirm: edge('menu_confirm', pad.menuConfirm),
            back: edge('menu_back', pad.menuBack),
            // Dedicated bumper fields (kept separate from scan/fire/menuBack,
            // which share buttons with each other in the browser fallback).
            tabLeft: edge('menu_tab_left', pad.menuTabLeft),
            tabRight: edge('menu_tab_right', pad.menuTabRight),
            pause: edge('menu_pause', pad.pause)
        };
    }

    function deriveArchiveActions(pad) {
        const stickX = pad.move?.x ?? 0;
        const stickY = pad.move?.y ?? 0;
        const dpadX = (pad.menuRight ? 1 : 0) - (pad.menuLeft ? 1 : 0);
        const dpadY = (pad.menuDown ? 1 : 0) - (pad.menuUp ? 1 : 0);
        return {
            focus: {
                x: stickX || dpadX,
                y: stickY || dpadY
            },
            confirm: edge('archive_confirm', pad.interact || pad.menuConfirm),
            inventory: edge('archive_inventory', pad.ability),
            back: edge('archive_back', pad.menuBack),
            // Reveal is a hold, not a press.
            reveal: Boolean(pad.reload),
            pause: edge('archive_pause', pad.pause)
        };
    }

    return {
        getActionSet() {
            return activeSet;
        },
        setActionSet(name) {
            if (!VALID_SETS.has(name) || name === activeSet) return;
            activeSet = name;
            previous = {};
        },
        deriveActions(padSnapshot) {
            const pad = padSnapshot ?? NEUTRAL_PAD;
            if (activeSet === ACTION_SETS.GAMEPLAY) {
                // Field-play snapshots are already semantic (move/fire/...).
                return { set: activeSet, actions: pad };
            }
            const actions = activeSet === ACTION_SETS.ARCHIVE
                ? deriveArchiveActions(pad)
                : deriveMenuActions(pad);
            return { set: activeSet, actions };
        }
    };
}
