import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
    buildSteamConfig,
    DEFAULT_STEAM_CONFIG,
    normalizeBackendUrl,
    normalizeSteamAppId,
    requireRemoteSteamBackend,
    writeSteamConfig
} from './write-steam-config.js';

const tempDirs = [];

afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
        fs.rmSync(dir, { force: true, recursive: true });
    }
});

function makeTempDir() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-steam-config-'));
    tempDirs.push(dir);
    return dir;
}

describe('write-steam-config', () => {
    it('builds the dev-safe default config', () => {
        expect(buildSteamConfig({})).toEqual(DEFAULT_STEAM_CONFIG);
        expect(buildSteamConfig({ HB_STEAM_APPID: '' })).toEqual(DEFAULT_STEAM_CONFIG);
    });

    it('normalizes release config from env', () => {
        expect(buildSteamConfig({
            HB_STEAM_BACKEND_URL: 'https://steam.example.test/',
            HB_STEAM_APPID: '4957040',
            HB_STEAM_AUTH_IDENTITY: ' release-identity '
        })).toEqual({
            backendUrl: 'https://steam.example.test',
            appId: 4957040,
            authIdentity: 'release-identity'
        });
    });

    it('can require a non-local HTTPS backend for release packaging', () => {
        expect(buildSteamConfig({
            HB_STEAM_BACKEND_URL: 'https://steam.example.test',
            HB_STEAM_CONFIG_REQUIRE_REMOTE: '1'
        }).backendUrl).toBe('https://steam.example.test');

        expect(() => buildSteamConfig({
            HB_STEAM_BACKEND_URL: 'http://localhost:3001',
            HB_STEAM_CONFIG_REQUIRE_REMOTE: '1'
        })).toThrow(/localhost/);

        expect(() => requireRemoteSteamBackend({
            backendUrl: 'http://steam.example.test',
            appId: 4957040,
            authIdentity: 'hunker-bunker-backend'
        })).toThrow(/https/);
    });

    it('rejects invalid backend URLs and app ids', () => {
        expect(() => normalizeBackendUrl('file:///tmp/backend.sock')).toThrow(/http or https/);
        expect(() => normalizeBackendUrl('not a url')).toThrow(/Invalid Steam backend URL/);
        expect(() => normalizeSteamAppId('0')).toThrow(/Invalid Steam app id/);
    });

    it('writes electron steam-config JSON', () => {
        const outFile = path.join(makeTempDir(), 'electron', 'steam-config.json');

        const result = writeSteamConfig({
            outFile,
            env: {
                HB_STEAM_BACKEND_URL: 'https://backend.example.test',
                HB_STEAM_APPID: '4957040',
                HB_STEAM_AUTH_IDENTITY: 'hunker-bunker-release'
            }
        });

        expect(result).toMatchObject({
            outFile,
            config: {
                backendUrl: 'https://backend.example.test',
                appId: 4957040,
                authIdentity: 'hunker-bunker-release'
            }
        });
        expect(JSON.parse(fs.readFileSync(outFile, 'utf8'))).toEqual(result.config);
    });
});
