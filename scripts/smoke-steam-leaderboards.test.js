import { describe, expect, it, vi } from 'vitest';
import { runLeaderboardSmoke, validateSmokeConfig } from './smoke-steam-leaderboards.js';

function response(body, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        text: async () => JSON.stringify(body)
    };
}

describe('production leaderboard smoke client', () => {
    it('requires HTTPS and a session token', () => {
        expect(() => validateSmokeConfig({
            backendUrl: 'http://backend.example.test',
            sessionToken: 'token'
        })).toThrow(/require HTTPS/);
        expect(() => validateSmokeConfig({
            backendUrl: 'https://backend.example.test',
            sessionToken: ''
        })).toThrow(/SESSION_TOKEN/);
    });

    it('reads global and around-user results for all canonical boards', async () => {
        const fetchImpl = vi.fn(async () => response({
            ok: true,
            mock: false,
            entries: [{ steamId64: '76561198000000000', score: 10 }]
        }));
        const result = await runLeaderboardSmoke({
            backendUrl: 'https://backend.example.test/',
            sessionToken: 'short-lived-token',
            steamId64: '76561198000000000',
            fetchImpl
        });

        expect(result).toMatchObject({ ok: true, boardCount: 5, readCount: 10 });
        expect(fetchImpl).toHaveBeenCalledTimes(10);
        for (const [, options] of fetchImpl.mock.calls) {
            expect(options.headers.authorization).toBe('Bearer short-lived-token');
        }
    });

    it('rejects mock responses and does not expose the token in its error', async () => {
        const fetchImpl = vi.fn(async () => response({ ok: true, mock: true, entries: [] }));
        await expect(runLeaderboardSmoke({
            backendUrl: 'https://backend.example.test',
            sessionToken: 'never-print-this',
            fetchImpl
        })).rejects.not.toThrow(/never-print-this/);
    });

    it('submits an explicit canonical payload before verifying reads', async () => {
        const fetchImpl = vi.fn(async (_url, options = {}) => {
            if (options.method === 'POST') {
                return response({
                    ok: true,
                    submitted: [{ ok: true, target: 'best_run_score' }]
                });
            }
            return response({
                ok: true,
                mock: false,
                entries: [{ steamId64: '76561198000000000', score: 10 }]
            });
        });
        const result = await runLeaderboardSmoke({
            backendUrl: 'https://backend.example.test',
            sessionToken: 'token',
            steamId64: '76561198000000000',
            submitPayload: { schemaVersion: 1 },
            fetchImpl
        });

        expect(fetchImpl.mock.calls[0][1].method).toBe('POST');
        expect(result.submittedTargets).toEqual(['best_run_score']);
        expect(fetchImpl).toHaveBeenCalledTimes(11);
    });
});
