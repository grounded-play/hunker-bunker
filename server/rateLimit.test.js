import express from 'express';
import { describe, expect, it } from 'vitest';
import { createRateLimitMiddleware } from './rateLimit.js';

describe('createRateLimitMiddleware', () => {
    it('returns 429 after the configured bucket is exhausted', async () => {
        let now = 1000;
        const app = express();
        app.use(createRateLimitMiddleware({
            max: 2,
            windowMs: 10_000,
            now: () => now,
            keyFn: () => 'same-client'
        }));
        app.get('/steam/ping', (_req, res) => res.json({ ok: true }));

        const server = await new Promise((resolve) => {
            const s = app.listen(0, '127.0.0.1', () => resolve(s));
        });

        try {
            const addr = server.address();
            const url = `http://127.0.0.1:${addr.port}/steam/ping`;
            expect((await fetch(url)).status).toBe(200);
            expect((await fetch(url)).status).toBe(200);

            const limited = await fetch(url);
            expect(limited.status).toBe(429);
            expect(await limited.json()).toMatchObject({ ok: false, reason: 'rate_limited' });

            now += 10_001;
            expect((await fetch(url)).status).toBe(200);
        } finally {
            await new Promise((resolve) => server.close(resolve));
        }
    });
});
