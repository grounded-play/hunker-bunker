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
    const groups = [
        faceGroup(0, 'menu', {
            a: ['menu_confirm', 'Confirm'],
            b: ['menu_back', 'Back'],
            x: ['menu_page_left', 'Page Left'],
            y: ['menu_page_right', 'Page Right']
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
        triggerGroup(3, 'menu', 'menu_page_left', 'Page Left'),
        triggerGroup(4, 'menu', 'menu_page_right', 'Page Right'),
        switchesGroup(5, 'menu', {
            button_escape: ['pause', 'Pause'],
            left_bumper: ['menu_tab_left', 'Previous Tab'],
            right_bumper: ['menu_tab_right', 'Next Tab']
        }),
        faceGroup(10, 'gameplay', {
            a: ['interact', 'Interact'],
            b: ['scan', 'Scan'],
            x: ['reload', 'Reload'],
            y: ['ability', 'Ability']
        }),
        analogGroup(11, 'gameplay', 'move'),
        analogGroup(12, 'gameplay', 'camera'),
        triggerGroup(13, 'gameplay', 'sprint', 'Sprint'),
        triggerGroup(14, 'gameplay', 'fire', 'Fire'),
        switchesGroup(15, 'gameplay', {
            button_escape: ['pause', 'Pause'],
            left_bumper: ['sprint', 'Sprint'],
            right_bumper: ['fire', 'Fire'],
            button_menu: ['pause', 'Pause'],
            button_select: ['toggle_map', 'Tactical Map'],
            button_back: ['toggle_map', 'Tactical Map'],
            button_back_left: ['sprint', 'Sprint'],
            button_back_right: ['interact', 'Interact']
        }),
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
            left_bumper: ['archive_inventory', 'Inventory'],
            right_bumper: ['archive_reveal', 'Reveal Hotspots']
        })
    ];

    const presets = [
        preset(0, 'menu', {
            0: 'button_diamond',
            1: 'dpad',
            2: 'joystick',
            3: 'left_trigger',
            4: 'right_trigger',
            5: 'switch'
        }),
        preset(1, 'gameplay', {
            10: 'button_diamond',
            11: 'joystick',
            12: 'right_joystick',
            13: 'left_trigger',
            14: 'right_trigger',
            15: 'switch'
        }),
        preset(2, 'archive', {
            20: 'button_diamond',
            21: 'joystick',
            22: 'dpad',
            23: 'left_trigger',
            24: 'right_trigger',
            25: 'switch'
        })
    ];

    return `"controller_mappings"
{
    "version" "3"
    "game" "Hunker Bunker"
    "title" "Official Hunker Bunker Layout"
    "description" "Official full-controller layout for menus, bunker runs, and archive simulations."
    "controller_type" "${controllerType}"
    "major_revision" "1"
    "minor_revision" "0"
    "localization"
    {
        "english"
        {
            "title" "Official Hunker Bunker Layout"
            "description" "Official full-controller layout for menus, bunker runs, and archive simulations."
        }
    }
    ${groups.join('\n    ')}
    ${presets.join('\n    ')}
    "settings"
    {
        "left_trackpad_mode" "0"
        "right_trackpad_mode" "0"
    }
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

    const manifestSrc = path.join(repo, 'steam', 'steam_input_manifest.vdf');
    if (fs.existsSync(manifestSrc)) {
        fs.copyFileSync(manifestSrc, path.join(distElectron, 'steam_input_manifest.vdf'));
    }
    const configsSrc = path.join(repo, 'steam', 'controller_configs');
    const configsDest = path.join(distElectron, 'controller_configs');
    if (fs.existsSync(configsSrc)) {
        fs.mkdirSync(configsDest, { recursive: true });
        for (const file of fs.readdirSync(configsSrc)) {
            if (file.endsWith('.vdf')) {
                fs.copyFileSync(path.join(configsSrc, file), path.join(configsDest, file));
            }
        }
    }
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
