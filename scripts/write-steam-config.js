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
    const appId = Number(value);
    if (!Number.isInteger(appId) || appId <= 0) {
        throw new Error(`Invalid Steam app id: ${value}`);
    }
    return appId;
}

export function buildSteamConfig(env = process.env) {
    return {
        backendUrl: normalizeBackendUrl(env.HB_STEAM_BACKEND_URL),
        appId: normalizeSteamAppId(env.HB_STEAM_APPID),
        authIdentity: cleanString(env.HB_STEAM_AUTH_IDENTITY, DEFAULT_STEAM_CONFIG.authIdentity)
    };
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
