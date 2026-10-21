import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
    auditLinuxLauncher,
    auditPackagedSteamRuntime,
    auditSteamDepot,
    auditSteamVdfs
} from './audit-steam-depot.js';

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
        fs.writeFileSync(path.join(depot, 'resources', 'backend.env'), 'HB_SESSION_SECRET=secret');
        fs.writeFileSync(path.join(depot, 'resources', 'db_storage.json'), '{}');
        fs.writeFileSync(path.join(depot, 'resources', 'hunker-bunker.sqlite'), 'database');
        fs.writeFileSync(path.join(depot, 'resources', 'hunker-bunker.sqlite-wal'), 'database wal');

        const result = await auditSteamDepot({
            cwd: dir,
            roots: ['dist_electron/linux-unpacked']
        });

        expect(result.ok).toBe(false);
        expect(result.failures.map((failure) => failure.file)).toEqual(expect.arrayContaining([
            'steam_appid.txt',
            'resources/.env',
            'resources/backend.env',
            'resources/db_storage.json',
            'resources/hunker-bunker.sqlite',
            'resources/hunker-bunker.sqlite-wal'
        ]));
    });

    it('flags Steam store-only artwork in depot output', async () => {
        const dir = makeTempDir();
        const depot = path.join(dir, 'dist_electron', 'linux-unpacked');
        fs.mkdirSync(depot, { recursive: true });
        fs.writeFileSync(path.join(depot, 'steam_header_capsule_v2_en.png'), 'store art');

        const result = await auditSteamDepot({
            cwd: dir,
            roots: ['dist_electron/linux-unpacked']
        });

        expect(result.ok).toBe(false);
        expect(result.failures).toEqual(expect.arrayContaining([
            expect.objectContaining({
                file: 'steam_header_capsule_v2_en.png',
                reason: expect.stringContaining('store-only artwork')
            })
        ]));
    });

    it('passes a clean depot root while warning about missing optional roots', async () => {
        const dir = makeTempDir();
        const depot = path.join(dir, 'dist_electron', 'linux-unpacked');
        fs.mkdirSync(depot, { recursive: true });
        fs.writeFileSync(path.join(depot, 'hunker-bunker'), '#!/bin/sh\nexec ./hunker-bunker-bin --no-sandbox "$@"\n', { mode: 0o755 });
        fs.writeFileSync(path.join(depot, 'hunker-bunker-bin'), 'binary', { mode: 0o755 });

        const result = await auditSteamDepot({
            cwd: dir,
            roots: ['dist_electron/linux-unpacked', 'dist_electron/win-unpacked']
        });

        expect(result.ok).toBe(true);
        expect(result.scannedFiles).toBe(2);
        expect(result.warnings).toHaveLength(1);
    });

    it('rejects a raw Linux Electron binary that can crash before app startup', () => {
        const dir = makeTempDir();
        fs.writeFileSync(path.join(dir, 'hunker-bunker'), 'raw electron binary', { mode: 0o755 });

        expect(auditLinuxLauncher(dir, { platform: 'linux' })).toEqual(expect.arrayContaining([
            expect.objectContaining({ file: 'hunker-bunker' }),
            expect.objectContaining({ file: 'hunker-bunker-bin' })
        ]));
    });

    it('rejects a Linux Electron binary whose executable mode was stripped', () => {
        const dir = makeTempDir();
        fs.writeFileSync(path.join(dir, 'hunker-bunker'), '#!/bin/sh\nexec ./hunker-bunker-bin --no-sandbox "$@"\n', { mode: 0o755 });
        fs.writeFileSync(path.join(dir, 'hunker-bunker-bin'), 'binary', { mode: 0o644 });

        expect(auditLinuxLauncher(dir, { platform: 'linux' })).toEqual(expect.arrayContaining([
            expect.objectContaining({
                file: 'hunker-bunker-bin',
                reason: 'Linux Electron binary is not executable.'
            })
        ]));
    });
});

describe('auditSteamVdfs', () => {
    it('requires app/depot ids and steam_appid exclusions', () => {
        expect(auditSteamVdfs()).toEqual([]);
    });

    it('rejects an action manifest without bundled controller configurations', () => {
        const dir = makeTempDir();
        fs.cpSync(path.join(process.cwd(), 'steam'), dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'steam_input_manifest.vdf'), '"Action Manifest" { "configurations" { } }');

        expect(auditSteamVdfs({ steamDir: dir })).toEqual(expect.arrayContaining([
            expect.objectContaining({
                file: 'steam/steam_input_manifest.vdf',
                reason: 'Steam Input manifest has no bundled default controller configurations.'
            })
        ]));
    });
});

describe('auditPackagedSteamRuntime', () => {
    it('accepts the early overlay hook, Wallet callback, bridge, and native runtime', () => {
        const unpackedRoot = makeTempDir();
        for (const relativePath of [
            'node_modules/steamworks.js/dist/win64/steam_api64.dll',
            'node_modules/steamworks.js/dist/win64/steamworksjs.win32-x64-msvc.node'
        ]) {
            const target = path.join(unpackedRoot, relativePath);
            fs.mkdirSync(path.dirname(target), { recursive: true });
            fs.writeFileSync(target, 'runtime');
        }

        expect(auditPackagedSteamRuntime({
            mainSource: [
                'steamworksEarly.electronEnableSteamOverlay(false);',
                'app.whenReady().then(() => {});',
                'steamClient.callback.register(steam.SteamCallback.MicroTxnAuthorizationResponse, () => {});'
            ].join('\n'),
            preloadSource: "activateSteamOverlay: (dialog = 'friends') => ipcRenderer.invoke('hb:activateSteamOverlay', dialog)",
            unpackedRoot
        })).toEqual([]);
    });

    it('rejects the post-ready hook and disabled frame invalidation', () => {
        const failures = auditPackagedSteamRuntime({
            mainSource: [
                'app.whenReady().then(() => {});',
                'steamworksEarly.electronEnableSteamOverlay(false);',
                'steam.electronEnableSteamOverlay(true);'
            ].join('\n'),
            preloadSource: '',
            unpackedRoot: makeTempDir()
        });

        expect(failures.map(({ reason }) => reason)).toEqual(expect.arrayContaining([
            expect.stringContaining('before app.whenReady()'),
            expect.stringContaining('disables Steam overlay frame invalidation'),
            expect.stringContaining('Steam Wallet authorization callback'),
            expect.stringContaining('overlay bridge'),
            expect.stringContaining('Steamworks Windows runtime')
        ]));
    });
});
