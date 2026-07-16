import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STEAM_LEADERBOARD_DEFS } from '../server/leaderboardScoring.js';

const EXPECTED_STEAM_APPID = 1247290;
const REQUIRED_ENV_VARS = Object.freeze([
    'HB_STEAM_PUBLISHER_KEY',
    'HB_ALLOWED_ORIGINS',
    'HB_DB_STORAGE_PATH',
    'HB_SESSION_SECRET'
]);

function isEnabled(value) {
    return ['1', 'true', 'yes'].includes(String(value ?? '').trim().toLowerCase());
}

function getValue(env, keys) {
    for (const key of keys) {
        const value = String(env[key] ?? '').trim();
        if (value) return value;
    }
    return '';
}

function addIssue(list, code, message, detail = {}) {
    list.push({ code, message, ...detail });
}

function parseOrigins(raw) {
    return String(raw ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
}

function isLocalHostname(hostname) {
    const host = String(hostname ?? '').toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

function validateOrigins(origins, { strict, failures, warnings }) {
    if (origins.length === 0) {
        addIssue(strict ? failures : warnings, 'missing_allowed_origins', 'HB_ALLOWED_ORIGINS is empty; production CORS would allow every origin.');
        return;
    }

    for (const origin of origins) {
        if (origin === '*') {
            addIssue(failures, 'wildcard_origin', 'HB_ALLOWED_ORIGINS must not contain *.', { origin });
            continue;
        }

        let parsed;
        try {
            parsed = new URL(origin);
        } catch {
            addIssue(failures, 'invalid_origin', 'HB_ALLOWED_ORIGINS contains an invalid URL.', { origin });
            continue;
        }

        if (!['http:', 'https:'].includes(parsed.protocol)) {
            addIssue(failures, 'invalid_origin_protocol', 'HB_ALLOWED_ORIGINS origins must use http or https.', { origin });
        }
        if (strict && parsed.protocol !== 'https:') {
            addIssue(failures, 'non_https_origin', 'Strict backend deploys must use HTTPS origins.', { origin });
        }
        if (strict && isLocalHostname(parsed.hostname)) {
            addIssue(failures, 'local_origin', 'Strict backend deploys must not allow localhost origins.', { origin });
        }
    }
}

function parseLeaderboardIds(raw) {
    const configured = new Map();
    const source = String(raw ?? '').trim();
    if (!source) return configured;

    if (source.startsWith('{')) {
        try {
            for (const [name, value] of Object.entries(JSON.parse(source))) {
                const id = Number(value);
                if (name && Number.isFinite(id) && id > 0) configured.set(name, id);
            }
        } catch {
            return configured;
        }
        return configured;
    }

    for (const part of source.split(',')) {
        const [name, value] = part.split(':').map((piece) => piece?.trim());
        const id = Number(value);
        if (name && Number.isFinite(id) && id > 0) configured.set(name, id);
    }
    return configured;
}

function validateNumericEnv(env, key, { min = 0, max = Number.POSITIVE_INFINITY, integer = false } = {}, failures) {
    const raw = String(env[key] ?? '').trim();
    if (!raw) return;
    const value = Number(raw);
    const valid = Number.isFinite(value)
        && value >= min
        && value <= max
        && (!integer || Number.isInteger(value));
    if (!valid) {
        addIssue(failures, 'invalid_numeric_env', `${key} must be a${integer ? 'n integer' : ' number'} between ${min} and ${max}.`, { key, value: raw });
    }
}

export function auditSteamBackendEnv(env = process.env, { strict = isEnabled(env.HB_BACKEND_AUDIT_STRICT) || env.NODE_ENV === 'production' } = {}) {
    const failures = [];
    const warnings = [];
    const publisherKey = getValue(env, ['HB_STEAM_PUBLISHER_KEY', 'STEAM_PUBLISHER_KEY', 'STEAM_WEB_API_KEY']);
    const sessionSecret = getValue(env, ['HB_SESSION_SECRET', 'HB_STEAM_SESSION_SECRET']);
    const appId = Number(String(env.HB_STEAM_APPID ?? EXPECTED_STEAM_APPID).trim() || EXPECTED_STEAM_APPID);
    const origins = parseOrigins(env.HB_ALLOWED_ORIGINS);
    const dbPath = String(env.HB_DB_STORAGE_PATH ?? '').trim();
    const leaderboardIds = parseLeaderboardIds(env.HB_STEAM_LEADERBOARD_IDS);
    const autoCreateLeaderboards = isEnabled(env.HB_STEAM_LEADERBOARD_AUTO_CREATE);
    const microtxnEnabled = isEnabled(env.HB_STEAM_MICROTXN_ENABLED);
    const storeEnabled = isEnabled(env.HB_STEAM_STORE_ENABLED);
    const mockStorePurchases = isEnabled(env.HB_STEAM_STORE_MOCK_PURCHASES);

    if (!Number.isInteger(appId) || appId <= 0) {
        addIssue(failures, 'invalid_appid', 'HB_STEAM_APPID must be a positive integer.', { value: env.HB_STEAM_APPID });
    } else if (strict && appId !== EXPECTED_STEAM_APPID) {
        addIssue(failures, 'unexpected_appid', `Strict backend deploys must target Steam appid ${EXPECTED_STEAM_APPID}.`, { value: appId });
    }

    if (!publisherKey) {
        addIssue(strict ? failures : warnings, 'missing_publisher_key', 'HB_STEAM_PUBLISHER_KEY is required for live auth, inventory, and leaderboard writes.');
    }
    if (!sessionSecret) {
        addIssue(strict ? failures : warnings, 'missing_session_secret', 'HB_SESSION_SECRET should be explicit so session tokens are not signed with the publisher key or dev fallback.');
    }

    validateOrigins(origins, { strict, failures, warnings });

    if (!dbPath) {
        addIssue(strict ? failures : warnings, 'missing_db_storage_path', 'HB_DB_STORAGE_PATH is required for durable trusted backend state.');
    } else {
        if (!path.isAbsolute(dbPath)) {
            addIssue(failures, 'relative_db_storage_path', 'HB_DB_STORAGE_PATH must be an absolute path.', { value: dbPath });
        }
        if (strict && /(^|\/)server\/db_storage\.json$/.test(dbPath)) {
            addIssue(failures, 'default_db_storage_path', 'Strict deploys must not use the repo-local server/db_storage.json path.', { value: dbPath });
        }
    }

    const boardNames = Object.keys(STEAM_LEADERBOARD_DEFS);
    const missingBoards = boardNames.filter((name) => !leaderboardIds.has(name));
    if (missingBoards.length > 0 && !autoCreateLeaderboards) {
        addIssue(strict ? failures : warnings, 'missing_leaderboard_ids', 'HB_STEAM_LEADERBOARD_IDS does not cover every configured leaderboard and auto-create is off.', { missingBoards });
    }
    if (strict && autoCreateLeaderboards) {
        addIssue(warnings, 'leaderboard_auto_create_enabled', 'Leaderboard auto-create is enabled in strict mode; verify this is intentional for the target Steam app.');
    }

    if (storeEnabled && !microtxnEnabled) {
        addIssue(failures, 'store_without_microtxn', 'HB_STEAM_STORE_ENABLED=1 requires HB_STEAM_MICROTXN_ENABLED=1.');
    }
    if (microtxnEnabled && !publisherKey) {
        addIssue(failures, 'microtxn_without_publisher_key', 'HB_STEAM_MICROTXN_ENABLED=1 requires HB_STEAM_PUBLISHER_KEY.');
    }
    if (strict && mockStorePurchases) {
        addIssue(failures, 'mock_store_in_strict', 'HB_STEAM_STORE_MOCK_PURCHASES must not be enabled in strict production deploys.');
    }

    validateNumericEnv(env, 'HB_RATE_LIMIT_WINDOW_MS', { min: 1000, max: 3_600_000, integer: true }, failures);
    validateNumericEnv(env, 'HB_RATE_LIMIT_MAX', { min: 1, max: 10_000, integer: true }, failures);
    validateNumericEnv(env, 'HB_STEAM_DROP_COOLDOWN_SECONDS', { min: 0, max: 3600 }, failures);
    validateNumericEnv(env, 'HB_SESSION_TTL_SECONDS', { min: 60, max: 86_400, integer: true }, failures);

    return {
        ok: failures.length === 0,
        strict: Boolean(strict),
        appId: Number.isFinite(appId) ? appId : null,
        requiredEnv: REQUIRED_ENV_VARS,
        leaderboardCount: boardNames.length,
        configuredLeaderboardCount: leaderboardIds.size,
        failures,
        warnings
    };
}

function formatIssue(issue) {
    const detail = issue.origin ? ` (${issue.origin})`
        : issue.key ? ` (${issue.key}=${issue.value})`
            : issue.value ? ` (${issue.value})`
                : issue.missingBoards ? ` (${issue.missingBoards.join(', ')})`
                    : '';
    return `${issue.code}: ${issue.message}${detail}`;
}

async function main() {
    const strict = process.argv.includes('--strict')
        || isEnabled(process.env.HB_BACKEND_AUDIT_STRICT)
        || process.env.NODE_ENV === 'production';
    const result = auditSteamBackendEnv(process.env, { strict });

    for (const warning of result.warnings) {
        console.warn(`[backend-audit] warning: ${formatIssue(warning)}`);
    }

    if (!result.ok) {
        console.error(`[backend-audit] failed (${result.failures.length} issue(s), strict=${result.strict}):`);
        for (const failure of result.failures) {
            console.error(`- ${formatIssue(failure)}`);
        }
        process.exitCode = 1;
        return;
    }

    console.log(`[backend-audit] ok (strict=${result.strict}, appid=${result.appId}, leaderboards=${result.configuredLeaderboardCount}/${result.leaderboardCount})`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch((err) => {
        console.error(`[backend-audit] ${err?.message ?? err}`);
        process.exitCode = 1;
    });
}
