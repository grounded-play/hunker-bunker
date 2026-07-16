import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const DEFAULT_STEAM_CONFIG = Object.freeze({
    backendUrl: 'http://localhost:3001',
    appId: 1247290,
    authIdentity: 'hunker-bunker-backend'
});

function cleanString(value, fallback) {
    const cleaned = String(value ?? '').trim();
    return cleaned || fallback;
}

export function normalizeBackendUrl(value = DEFAULT_STEAM_CONFIG.backendUrl) {
    const raw = cleanString(value, DEFAULT_STEAM_CONFIG.backendUrl);
    let parsed;
    try {
        parsed = new URL(raw);
    } catch {
        throw new Error(`Invalid Steam backend URL: ${raw}`);
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error(`Steam backend URL must use http or https: ${raw}`);
    }

    return parsed.toString().replace(/\/$/, '');
}

export function normalizeSteamAppId(value = DEFAULT_STEAM_CONFIG.appId) {
    const appId = Number(cleanString(value, DEFAULT_STEAM_CONFIG.appId));
    if (!Number.isInteger(appId) || appId <= 0) {
        throw new Error(`Invalid Steam app id: ${value}`);
    }
    return appId;
}

function isEnabled(value) {
    return ['1', 'true', 'yes'].includes(String(value ?? '').trim().toLowerCase());
}

export function requireRemoteSteamBackend(config) {
    const url = new URL(config.backendUrl);
    const hostname = url.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
        throw new Error('Release Steam backend URL must not point at localhost.');
    }
    if (url.protocol !== 'https:') {
        throw new Error('Release Steam backend URL must use https.');
    }
    return config;
}

export function buildSteamConfig(env = process.env) {
    const config = {
        backendUrl: normalizeBackendUrl(env.HB_STEAM_BACKEND_URL),
        appId: normalizeSteamAppId(env.HB_STEAM_APPID),
        authIdentity: cleanString(env.HB_STEAM_AUTH_IDENTITY, DEFAULT_STEAM_CONFIG.authIdentity)
    };
    return isEnabled(env.HB_STEAM_CONFIG_REQUIRE_REMOTE)
        ? requireRemoteSteamBackend(config)
        : config;
}

export function writeSteamConfig({
    env = process.env,
    outFile = path.resolve('electron', 'steam-config.json')
} = {}) {
    const config = buildSteamConfig(env);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
    return { config, outFile };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try {
        const { config, outFile } = writeSteamConfig();
        console.log(`[steam-config] wrote ${outFile} -> ${config.backendUrl} (app ${config.appId})`);
    } catch (err) {
        console.error(`[steam-config] ${err?.message ?? err}`);
        process.exitCode = 1;
    }
}
