import { describe, expect, it } from 'vitest';
import { auditSteamBackendEnv } from '../server/backendEnvAudit.js';

const VALID_LEADERBOARD_IDS = [
    'best_run_score:101',
    'survival_time_seconds:102',
    'deepest_depth_score:103',
    'daily_ops_score:104',
    'fastest_extraction_ms:105'
].join(',');

function validStrictEnv(overrides = {}) {
    return {
        NODE_ENV: 'production',
        HB_STEAM_APPID: '4957040',
        HB_STEAM_PUBLISHER_KEY: 'publisher-key',
        HB_SESSION_SECRET: 'session-secret',
        HB_ALLOWED_ORIGINS: 'https://hunker-bunker.example.test',
        HB_DB_STORAGE_PATH: '/app/server/data/db_storage.json',
        HB_STEAM_LEADERBOARD_IDS: VALID_LEADERBOARD_IDS,
        HB_STEAM_MICROTXN_ENABLED: '0',
        HB_STEAM_STORE_ENABLED: '0',
        ...overrides
    };
}

describe('auditSteamBackendEnv', () => {
    it('passes a production-ready strict backend config', () => {
        const result = auditSteamBackendEnv(validStrictEnv(), { strict: true });

        expect(result.ok).toBe(true);
        expect(result.failures).toEqual([]);
        expect(result.configuredLeaderboardCount).toBe(5);
    });

    it('fails strict mode when required production trust settings are missing', () => {
        const result = auditSteamBackendEnv({ NODE_ENV: 'production' }, { strict: true });

        expect(result.ok).toBe(false);
        expect(result.failures.map((failure) => failure.code)).toEqual(expect.arrayContaining([
            'missing_publisher_key',
            'missing_session_secret',
            'missing_allowed_origins',
            'missing_db_storage_path',
            'missing_leaderboard_ids'
        ]));
    });

    it('rejects localhost and non-HTTPS origins in strict mode', () => {
        const result = auditSteamBackendEnv(validStrictEnv({
            HB_ALLOWED_ORIGINS: 'http://localhost:5173'
        }), { strict: true });

        expect(result.ok).toBe(false);
        expect(result.failures.map((failure) => failure.code)).toEqual(expect.arrayContaining([
            'non_https_origin',
            'local_origin'
        ]));
    });

    it('rejects unsafe Store commerce combinations', () => {
        const result = auditSteamBackendEnv(validStrictEnv({
            HB_STEAM_STORE_ENABLED: '1',
            HB_STEAM_MICROTXN_ENABLED: '0'
        }), { strict: true });

        expect(result.ok).toBe(false);
        expect(result.failures.map((failure) => failure.code)).toContain('store_without_microtxn');
    });

    it('allows local non-strict development while surfacing warnings', () => {
        const result = auditSteamBackendEnv({
            HB_ALLOWED_ORIGINS: 'http://localhost:5173',
            HB_STEAM_APPID: '4957040'
        }, { strict: false });

        expect(result.ok).toBe(true);
        expect(result.warnings.map((warning) => warning.code)).toEqual(expect.arrayContaining([
            'missing_publisher_key',
            'missing_session_secret',
            'missing_db_storage_path',
            'missing_leaderboard_ids'
        ]));
    });
});
