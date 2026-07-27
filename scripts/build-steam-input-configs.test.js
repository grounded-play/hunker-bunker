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
        expect(deck).toContain('"name" "menu"');
        expect(deck).toContain('"name" "gameplay"');
        expect(deck).toContain('"name" "archive"');
        expect(deck).toContain('game_action gameplay fire');
        expect(deck).toContain('"gameplay" "move"');
        expect(deck).toContain('"archive" "archive_focus"');
    });
});
