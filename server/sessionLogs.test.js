import { describe, expect, it } from 'vitest';
import { safeLogName, sessionLogDir, MAX_LOG_BYTES } from './sessionLogs.js';

describe('safeLogName', () => {
    const fixed = { now: 0, random: () => 0 };

    it('keeps a readable name and always adds a uniquifier', () => {
        const name = safeLogName('hunker-bunker-session-2026.json', fixed);
        expect(name.startsWith('hunker-bunker-session-2026-')).toBe(true);
        expect(name.endsWith('.json')).toBe(true);
    });

    // Two devices exporting in the same second must not overwrite each other,
    // which is the whole point of a shared drop box.
    it('does not collide for repeated identical names', () => {
        const a = safeLogName('same.json');
        const b = safeLogName('same.json');
        expect(a).not.toBe(b);
    });

    it('strips any path traversal or separators', () => {
        for (const hostile of ['../../etc/passwd', '/etc/passwd', 'a/b/c.json', '..\\\\win.ini']) {
            const name = safeLogName(hostile, fixed);
            expect(name).not.toContain('/');
            expect(name).not.toContain('\\');
            expect(name).not.toContain('..');
        }
    });

    it('falls back to a generated name when nothing usable survives', () => {
        expect(safeLogName('///', fixed)).toBe('session-0-0.json');
        expect(safeLogName('', fixed)).toBe('session-0-0.json');
        expect(safeLogName(undefined, fixed)).toBe('session-0-0.json');
    });

    it('bounds the length of an absurd name', () => {
        expect(safeLogName(`${'x'.repeat(5000)}.json`, fixed).length).toBeLessThan(200);
    });
});

describe('sessionLogDir', () => {
    it('honours HB_SESSION_LOG_DIR when set', () => {
        const prev = process.env.HB_SESSION_LOG_DIR;
        process.env.HB_SESSION_LOG_DIR = '/tmp/hb-logs-test';
        expect(sessionLogDir()).toBe('/tmp/hb-logs-test');
        if (prev === undefined) delete process.env.HB_SESSION_LOG_DIR;
        else process.env.HB_SESSION_LOG_DIR = prev;
    });

    it('defaults inside the server directory', () => {
        const prev = process.env.HB_SESSION_LOG_DIR;
        delete process.env.HB_SESSION_LOG_DIR;
        expect(sessionLogDir()).toMatch(/server[/\\]session-logs$/);
        if (prev !== undefined) process.env.HB_SESSION_LOG_DIR = prev;
    });
});

describe('upload limit', () => {
    // The global express.json limit is 16kb; a session capture is far larger,
    // which is why this route parses raw with its own bound.
    it('allows captures far larger than the 16kb API body limit', () => {
        expect(MAX_LOG_BYTES).toBeGreaterThan(16 * 1024);
        expect(MAX_LOG_BYTES).toBeLessThanOrEqual(64 * 1024 * 1024);
    });
});
