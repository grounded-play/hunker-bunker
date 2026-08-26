import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildSteamInputConfigs } from './build-steam-input-configs.js';

const tempDirs = [];

afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

describe('buildSteamInputConfigs', () => {
    it('generates official native-action layouts for common controllers', () => {
        const destination = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-input-configs-'));
        tempDirs.push(destination);

        const outputs = buildSteamInputConfigs({ destination });

        expect(outputs).toHaveLength(7);
        const deck = fs.readFileSync(path.join(destination, 'controller_neptune.vdf'), 'utf8');
        expect(deck).toContain('"controller_type" "controller_neptune"');
        expect(deck).toContain('"major_revision" "8"');
        expect(deck).toContain('"minor_revision" "1"');
        expect(deck).toContain('"title" "Official Hunker Bunker Controls"');
        expect(deck).toContain('LB Scan · RB Map · LT Sprint · RT Fire · Menu Pause.');
        expect(deck).toContain('"name" "menu"');
        expect(deck).toContain('"name" "gameplay"');
        expect(deck).toContain('"name" "archive"');
        const xbox = fs.readFileSync(path.join(destination, 'controller_xboxone.vdf'), 'utf8');
        expect(xbox).toContain('game_action gameplay fire');
        expect(xbox).toContain('"gameplay" "move"');
        expect(xbox).toContain('"archive" "archive_focus"');
    });

    // The Deck used to ship a hand-written keyboard-emulation config, which meant
    // Deck players never reached the Steam Input action path at all: no action
    // origins, so no glyphs, and toggle_map plus every archive_* verb was
    // unreachable. It must be generated natively like every other controller.
    it('drives the Steam Deck through native actions, not keyboard emulation', () => {
        const destination = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-input-configs-'));
        tempDirs.push(destination);

        buildSteamInputConfigs({ destination });
        const deck = fs.readFileSync(path.join(destination, 'controller_neptune.vdf'), 'utf8');

        expect(deck).not.toMatch(/key_press|mouse_button/);
        expect(deck).toContain('game_action gameplay fire');
        expect(deck).toContain('game_action gameplay toggle_map');
        expect(deck).toMatch(/"button_back_left_upper"[\s\S]*?game_action gameplay toggle_map/);
        expect(deck).toContain('game_action archive archive_reveal');
        expect(deck).toContain('"gameplay" "move"');
        expect(deck).toContain('"gameplay" "camera"');
        expect(deck).toContain('"menu" "menu_pointer"');
        expect(deck).toContain('"6" "right_joystick active"');
        expect(deck).toContain('"12" "right_joystick active"');
        expect(deck).not.toContain('"17" "right_joystick active"');
        expect(deck).toContain('"7" "left_trackpad active"');
        expect(deck).not.toContain('"8" "right_trackpad active"');
        expect(deck).not.toContain('"16" "left_trackpad active"');
        expect(deck).not.toContain('"17" "right_trackpad active"');
        expect(deck).toContain('"26" "left_trackpad active"');
        expect(deck).toContain('"27" "right_trackpad active"');
        expect(deck).not.toContain('gyro active');
        expect(deck).toMatch(/"left_bumper"[\s\S]*?game_action gameplay scan/);
        expect(deck).toMatch(/"right_bumper"[\s\S]*?game_action gameplay toggle_map/);
        expect(deck).toMatch(/"edge"[\s\S]*?game_action gameplay sprint, Sprint/);
        expect(deck).toMatch(/"edge"[\s\S]*?game_action gameplay fire, Fire/);
        expect(deck).toMatch(/"button_x"[\s\S]*?game_action gameplay reload, Reload/);
        expect(deck).toMatch(/"button_y"[\s\S]*?game_action gameplay ability, Smash/);
        expect(deck).toMatch(/"button_b"[\s\S]*?game_action gameplay dash, Dodge/);
        expect(deck).toMatch(/"button_a"[\s\S]*?game_action gameplay interact, Interact/);
        expect(deck).toMatch(/"button_menu"[\s\S]*?game_action menu pause, Settings \/ Pause/);
    });

    it('maps PlayStation touchpads in menu and archive without inventing pads for Xbox', () => {
        const destination = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-input-configs-'));
        tempDirs.push(destination);

        buildSteamInputConfigs({ destination });
        for (const controller of ['controller_ps4', 'controller_ps5']) {
            const config = fs.readFileSync(path.join(destination, `${controller}.vdf`), 'utf8');
            expect(config).toContain('"8" "center_trackpad active"');
            expect(config).not.toContain('"17" "center_trackpad active"');
            expect(config).toContain('"27" "center_trackpad active"');
        }

        const xbox = fs.readFileSync(path.join(destination, 'controller_xboxone.vdf'), 'utf8');
        expect(xbox).not.toContain('trackpad active');
    });

    // A config that binds an action the manifest doesn't declare is silently dead
    // in-game. Every generally applicable declared action must also be reachable;
    // hardware-specific pointer actions are required only on pad-equipped devices.
    it('binds exactly the action set the manifest declares, on every controller', () => {
        const destination = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-input-configs-'));
        tempDirs.push(destination);

        const outputs = buildSteamInputConfigs({ destination });
        const manifest = fs.readFileSync(
            path.join(import.meta.dirname, '..', 'steam', 'steam_input_manifest.vdf'),
            'utf8'
        );
        // Digital actions are `"fire" "#ActionFire"`; analog actions are a block with a
        // nested title. #ActionSet* keys name the action sets themselves, not actions.
        const declared = new Set(
            [
                ...manifest.matchAll(/"(\w+)"\s+"#(Action\w+)"/g),
                ...manifest.matchAll(/"(\w+)"\s*\{\s*"title"\s+"#(Action\w+)"/g)
            ]
                .filter(([, key, locKey]) => key !== 'title' && !locKey.startsWith('ActionSet'))
                .map(([, key]) => key)
        );
        expect(declared.size).toBeGreaterThan(0);

        for (const output of outputs) {
            const config = fs.readFileSync(output, 'utf8');
            const bound = new Set([
                ...[...config.matchAll(/game_action \w+ (\w+),/g)].map((match) => match[1]),
                ...[...config.matchAll(/"gameactions"\s*\{\s*"\w+"\s+"(\w+)"/g)].map((match) => match[1])
            ]);
            expect([...bound].filter((action) => !declared.has(action))).toEqual([]);
            const controllerHasTrackpad = /controller_(neptune|ps4|ps5)\.vdf$/.test(output);
            const required = [...declared].filter((action) => action !== 'menu_pointer_mouse' || controllerHasTrackpad);
            expect(required.filter((action) => !bound.has(action))).toEqual([]);
        }
    });
});
