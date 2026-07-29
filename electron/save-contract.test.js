import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
    KNOWN_SAVE_KEYS,
    loadSaveWithBackup,
    migrateSaveDocument,
    parseSaveText,
    sanitizeSaveData,
    writeSaveAtomic
} = require('./save-contract.cjs');

const tempDirs = [];
function tempSavePath() {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-save-contract-'));
    tempDirs.push(directory);
    return path.join(directory, 'save.json');
}

afterEach(() => {
    for (const directory of tempDirs.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe('Electron save contract', () => {
    it('documents every current save-key family', () => {
        expect(KNOWN_SAVE_KEYS).toContain('hb_profile_v1');
        expect(KNOWN_SAVE_KEYS).toContain('hb_minigame_rgb_v1');
        expect(KNOWN_SAVE_KEYS).toContain('hb_daily_v1_*');
    });

    it('migrates legacy flat saves while dropping foreign and malformed values', () => {
        const result = migrateSaveDocument({
            hb_profile_v1: '{"callsign":"ICE"}',
            hb_act2_v1: '{broken',
            external_token: 'do-not-restore',
            hb_active_class_v1: 'SCOUT'
        });
        expect(result).toMatchObject({
            schemaVersion: 1,
            migrated: true,
            data: {
                hb_profile_v1: '{"callsign":"ICE"}',
                hb_active_class_v1: 'SCOUT'
            }
        });
    });

    it('rejects non-string and oversized values', () => {
        expect(sanitizeSaveData({
            hb_profile_v1: { callsign: 'not serialized' },
            hb_active_class_v1: 'x'.repeat(1024 * 1024 + 1)
        })).toEqual({});
    });

    it('writes a versioned document atomically and retains the prior valid backup', () => {
        const filename = tempSavePath();
        writeSaveAtomic(fs, filename, { hb_active_class_v1: 'SCOUT' }, new Date('2026-07-28T00:00:00Z'));
        writeSaveAtomic(fs, filename, { hb_active_class_v1: 'ENGINEER' }, new Date('2026-07-29T00:00:00Z'));

        expect(parseSaveText(fs.readFileSync(filename, 'utf8')).data.hb_active_class_v1).toBe('ENGINEER');
        expect(parseSaveText(fs.readFileSync(`${filename}.bak`, 'utf8')).data.hb_active_class_v1).toBe('SCOUT');
        expect(fs.existsSync(`${filename}.tmp`)).toBe(false);
    });

    it('recovers from a corrupt primary using the last-known-good backup', () => {
        const filename = tempSavePath();
        writeSaveAtomic(fs, filename, { hb_active_class_v1: 'SCOUT' });
        fs.copyFileSync(filename, `${filename}.bak`);
        fs.writeFileSync(filename, '{corrupt');

        expect(loadSaveWithBackup(fs, filename)).toMatchObject({
            source: 'backup',
            data: { hb_active_class_v1: 'SCOUT' }
        });
    });
});
