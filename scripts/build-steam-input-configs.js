/* global console, process */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(repoRoot, 'steam', 'controller_configs');

const controllerTypes = [
    'controller_neptune',
    'controller_xboxone',
    'controller_xbox360',
    'controller_ps4',
    'controller_ps5',
    'controller_switch_pro',
    'controller_generic'
];

// This text is shown by Valve's controller-layout UI before launch. Keep it
// aligned with the gameplay preset below instead of duplicating a device image
// inside the game's loading screen.
const OFFICIAL_LAYOUT_TITLE = 'Official Hunker Bunker Controls';
const OFFICIAL_LAYOUT_DESCRIPTION = 'Left Stick / D-Pad Move · Right Stick Aim/Pointer · A/RT Confirm menus · A Interact · B Dodge/Back · X Reload · Y Smash · LB Scan · RB Map · LT Sprint · RT Fire · Menu Pause.';

function binding(actionSet, action, title) {
    return `"binding" "game_action ${actionSet} ${action}, ${title}"`;
}

function activator(actionSet, action, title) {
    return `"activators"
                {
                    "Full_Press"
                    {
                        "bindings"
                        {
                            ${binding(actionSet, action, title)}
                        }
                    }
                }`;
}

function faceGroup(id, actionSet, actions) {
    return `"group"
    {
        "id" "${id}"
        "mode" "four_buttons"
        "inputs"
        {
            "button_a" { ${activator(actionSet, actions.a[0], actions.a[1])} }
            "button_b" { ${activator(actionSet, actions.b[0], actions.b[1])} }
            "button_x" { ${activator(actionSet, actions.x[0], actions.x[1])} }
            "button_y" { ${activator(actionSet, actions.y[0], actions.y[1])} }
        }
    }`;
}

function dpadGroup(id, actionSet, actions) {
    return `"group"
    {
        "id" "${id}"
        "mode" "dpad"
        "inputs"
        {
            "dpad_north" { ${activator(actionSet, actions.up[0], actions.up[1])} }
            "dpad_south" { ${activator(actionSet, actions.down[0], actions.down[1])} }
            "dpad_east" { ${activator(actionSet, actions.right[0], actions.right[1])} }
            "dpad_west" { ${activator(actionSet, actions.left[0], actions.left[1])} }
        }
    }`;
}

// Delta-style analog action used by Deck and PlayStation trackpads for the
// menu pointer and gameplay aim cursor.
function mouseGroup(id, actionSet, action, extraSettings = {}) {
    const settings = Object.entries({ sensitivity: '105', ...extraSettings })
        .map(([key, value]) => `"${key}" "${value}"`)
        .join('\n            ');
    return `"group"
    {
        "id" "${id}"
        "mode" "absolute_mouse"
        "inputs" { }
        "settings"
        {
            ${settings}
        }
        "gameactions"
        {
            "${actionSet}" "${action}"
        }
    }`;
}

function analogGroup(id, actionSet, action) {
    return `"group"
    {
        "id" "${id}"
        "mode" "joystick_move"
        "inputs" { }
        "settings"
        {
            "deadzone_inner_radius" "6000"
        }
        "gameactions"
        {
            "${actionSet}" "${action}"
        }
    }`;
}

function triggerGroup(id, actionSet, action, title) {
    return `"group"
    {
        "id" "${id}"
        "mode" "trigger"
        "inputs"
        {
            "edge" { ${activator(actionSet, action, title)} }
        }
    }`;
}

function switchesGroup(id, actionSet, actions) {
    const entries = Object.entries(actions)
        .map(([source, [action, title]]) => `"${source}" { ${activator(actionSet, action, title)} }`)
        .join('\n            ');
    return `"group"
    {
        "id" "${id}"
        "mode" "switches"
        "inputs"
        {
            ${entries}
        }
    }`;
}

function preset(id, name, groups) {
    const entries = Object.entries(groups)
        .map(([groupId, source]) => `"${groupId}" "${source} active"`)
        .join('\n            ');
    return `"preset"
    {
        "id" "${id}"
        "name" "${name}"
        "group_source_bindings"
        {
            ${entries}
        }
    }`;
}

function buildControllerConfig(controllerType) {
    const hasDualTrackpads = controllerType === 'controller_neptune';
    const hasCenterTrackpad = controllerType === 'controller_ps4' || controllerType === 'controller_ps5';
    const gameplaySwitches = {
        button_escape: ['pause', 'Pause'],
        left_bumper: ['scan', 'Scan'],
        right_bumper: ['toggle_map', 'Tactical Map'],
        button_menu: ['pause', 'Pause'],
        button_select: ['toggle_map', 'Tactical Map'],
        button_back: ['toggle_map', 'Tactical Map'],
        button_back_left: ['sprint', 'Sprint'],
        button_back_right: ['interact', 'Interact']
    };
    // L4 is a convenient dedicated map button on Steam Deck. Keep View/Back as
    // the universal fallback, and emit this extra source only for Deck hardware.
    if (controllerType === 'controller_neptune') {
        gameplaySwitches.button_back_left_upper = ['toggle_map', 'Tactical Map'];
    }
    const groups = [
        faceGroup(0, 'menu', {
            a: ['menu_confirm', 'Confirm'],
            b: ['menu_back', 'Back'],
            x: ['menu_tab_left', 'Previous Tab'],
            y: ['menu_tab_right', 'Next Tab']
        }),
        dpadGroup(1, 'menu', {
            up: ['menu_up', 'Up'],
            down: ['menu_down', 'Down'],
            left: ['menu_left', 'Left'],
            right: ['menu_right', 'Right']
        }),
        dpadGroup(2, 'menu', {
            up: ['menu_up', 'Up'],
            down: ['menu_down', 'Down'],
            left: ['menu_left', 'Left'],
            right: ['menu_right', 'Right']
        }),
        triggerGroup(3, 'menu', 'menu_tab_left', 'Previous Tab'),
        triggerGroup(4, 'menu', 'menu_confirm', 'Confirm'),
        switchesGroup(5, 'menu', {
            button_escape: ['pause', 'Pause'],
            button_menu: ['pause', 'Settings / Pause'],
            left_bumper: ['menu_tab_left', 'Previous Tab'],
            right_bumper: ['menu_tab_right', 'Next Tab']
        }),
        // Mouse-like menu cursor. The official preset binds this normalized
        // analog action to the right stick on every twin-stick controller.
        analogGroup(6, 'menu', 'menu_pointer'),
        faceGroup(10, 'gameplay', {
            a: ['interact', 'Interact'],
            b: ['dash', 'Dodge'],
            x: ['reload', 'Reload'],
            y: ['ability', 'Smash']
        }),
        analogGroup(11, 'gameplay', 'move'),
        analogGroup(12, 'gameplay', 'camera'),
        // Retained for custom trackpad/gyro layouts. The official preset uses
        // the right stick's direct aim vector below.
        mouseGroup(17, 'gameplay', 'camera_mouse'),
        // The D-pad walks the player exactly like the left stick. A digital
        // source feeding a joystick_move group is the same shape the archive
        // preset already uses for archive_focus.
        analogGroup(18, 'gameplay', 'move'),
        triggerGroup(13, 'gameplay', 'sprint', 'Sprint'),
        triggerGroup(14, 'gameplay', 'fire', 'Fire'),
        switchesGroup(15, 'gameplay', gameplaySwitches),
        faceGroup(20, 'archive', {
            a: ['archive_confirm', 'Inspect / Confirm'],
            b: ['archive_back', 'Back'],
            x: ['archive_reveal', 'Reveal Hotspots'],
            y: ['archive_inventory', 'Inventory']
        }),
        analogGroup(21, 'archive', 'archive_focus'),
        analogGroup(22, 'archive', 'archive_focus'),
        triggerGroup(23, 'archive', 'archive_reveal', 'Reveal Hotspots'),
        triggerGroup(24, 'archive', 'archive_confirm', 'Inspect / Confirm'),
        switchesGroup(25, 'archive', {
            button_escape: ['pause', 'Pause'],
            button_menu: ['pause', 'Settings / Pause'],
            left_bumper: ['archive_inventory', 'Inventory'],
            right_bumper: ['archive_reveal', 'Reveal Hotspots']
        })
    ];

    if (hasDualTrackpads) {
        groups.push(
            dpadGroup(7, 'menu', {
                up: ['menu_up', 'Up'],
                down: ['menu_down', 'Down'],
                left: ['menu_left', 'Left'],
                right: ['menu_right', 'Right']
            }),
            mouseGroup(8, 'menu', 'menu_pointer_mouse'),
            analogGroup(16, 'gameplay', 'move'),
            analogGroup(26, 'archive', 'archive_focus'),
            analogGroup(27, 'archive', 'archive_focus')
        );
    } else if (hasCenterTrackpad) {
        groups.push(
            mouseGroup(8, 'menu', 'menu_pointer_mouse'),
            analogGroup(27, 'archive', 'archive_focus')
        );
    }

    const menuSources = {
        0: 'button_diamond',
        1: 'dpad',
        2: 'joystick',
        3: 'left_trigger',
        4: 'right_trigger',
        5: 'switch',
        6: 'right_joystick'
    };
    const gameplaySources = {
        10: 'button_diamond',
        11: 'joystick',
        12: 'right_joystick',
        13: 'left_trigger',
        14: 'right_trigger',
        15: 'switch',
        18: 'dpad'
    };
    const archiveSources = {
        20: 'button_diamond',
        21: 'joystick',
        22: 'dpad',
        23: 'left_trigger',
        24: 'right_trigger',
        25: 'switch'
    };

    if (hasDualTrackpads) {
        menuSources[7] = 'left_trackpad';
        archiveSources[26] = 'left_trackpad';
        archiveSources[27] = 'right_trackpad';
    } else if (hasCenterTrackpad) {
        menuSources[8] = 'center_trackpad';
        archiveSources[27] = 'center_trackpad';
    }

    const presets = [
        preset(0, 'menu', menuSources),
        preset(1, 'gameplay', gameplaySources),
        preset(2, 'archive', archiveSources)
    ];

    return `"controller_mappings"
{
    "version" "3"
    "game" "Hunker Bunker"
    "title" "${OFFICIAL_LAYOUT_TITLE}"
    "description" "${OFFICIAL_LAYOUT_DESCRIPTION}"
    "controller_type" "${controllerType}"
    "major_revision" "10"
    "minor_revision" "0"
    "localization"
    {
        "english"
        {
            "title" "${OFFICIAL_LAYOUT_TITLE}"
            "description" "${OFFICIAL_LAYOUT_DESCRIPTION}"
        }
    }
    ${groups.join('\n    ')}
    ${presets.join('\n    ')}
}
`;
}

export function syncSteamInputToDepotRoot({ repo = repoRoot } = {}) {
    const distElectron = path.join(repo, 'dist_electron');
    if (!fs.existsSync(distElectron)) return;

    const linuxUnpacked = path.join(distElectron, 'linux-unpacked');
    if (fs.existsSync(linuxUnpacked)) {
        const electronBin = path.join(linuxUnpacked, 'electron');
        const targetBin = path.join(linuxUnpacked, 'hunker-bunker');
        if (fs.existsSync(electronBin) && !fs.existsSync(targetBin)) {
            try {
                fs.copyFileSync(electronBin, targetBin);
                fs.chmodSync(targetBin, 0o755);
            } catch (err) {
                console.warn('[steam-input] could not copy hunker-bunker binary:', err?.message ?? err);
            }
        }
    }

    // The manifest and controller_configs/ are placed inside each *-unpacked dir by
    // electron-builder's extraFiles, and both depots now map from those dirs, so a
    // copy at the dist_electron root would never be uploaded. Nothing to do here.
}

export function buildSteamInputConfigs({ destination = outputDir } = {}) {
    fs.mkdirSync(destination, { recursive: true });
    const outputs = [];
    for (const controllerType of controllerTypes) {
        const filename = `${controllerType}.vdf`;
        const outputPath = path.join(destination, filename);
        fs.writeFileSync(outputPath, buildControllerConfig(controllerType), 'utf8');
        outputs.push(outputPath);
    }
    syncSteamInputToDepotRoot();
    return outputs;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const outputs = buildSteamInputConfigs();
    console.log(`[steam-input] wrote ${outputs.length} bundled controller configurations`);
}
