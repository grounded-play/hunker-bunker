import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { auditSteamDepot, auditSteamVdfs } from './audit-steam-depot.js';

const tempDirs = [];

function makeTempDir() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-steam-audit-'));
    tempDirs.push(dir);
    return dir;
}

afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

describe('auditSteamDepot', () => {
    it('flags dev-only and secret-shaped files in depot output', async () => {
        const dir = makeTempDir();
        const depot = path.join(dir, 'dist_electron', 'linux-unpacked');
        fs.mkdirSync(path.join(depot, 'resources'), { recursive: true });
        fs.writeFileSync(path.join(depot, 'steam_appid.txt'), '4957040');
        fs.writeFileSync(path.join(depot, 'resources', '.env'), 'HB_STEAM_PUBLISHER_KEY=secret');
        fs.writeFileSync(path.join(depot, 'resources', 'db_storage.json'), '{}');

        const result = await auditSteamDepot({
            cwd: dir,
            roots: ['dist_electron/linux-unpacked']
        });

        expect(result.ok).toBe(false);
        expect(result.failures.map((failure) => failure.file)).toEqual(expect.arrayContaining([
            'steam_appid.txt',
            'resources/.env',
            'resources/db_storage.json'
        ]));
    });

    it('passes a clean depot root while warning about missing optional roots', async () => {
        const dir = makeTempDir();
        const depot = path.join(dir, 'dist_electron', 'linux-unpacked');
        fs.mkdirSync(depot, { recursive: true });
        fs.writeFileSync(path.join(depot, 'Hunker Bunker'), 'binary');

        const result = await auditSteamDepot({
            cwd: dir,
            roots: ['dist_electron/linux-unpacked', 'dist_electron/win-unpacked']
        });

        expect(result.ok).toBe(true);
        expect(result.scannedFiles).toBe(1);
        expect(result.warnings).toHaveLength(1);
    });
});

describe('auditSteamVdfs', () => {
    it('requires app/depot ids and steam_appid exclusions', () => {
        expect(auditSteamVdfs()).toEqual([]);
    });
});
