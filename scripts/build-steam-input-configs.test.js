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
        expect(deck).toContain('"major_revision" "2"');
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
    });

    // A config that binds an action the manifest doesn't declare is silently dead
    // in-game, and a declared action nothing binds is an input the player can never
    // reach. Both directions have to stay closed.
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
            expect([...declared].filter((action) => !bound.has(action))).toEqual([]);
        }
    });
});
