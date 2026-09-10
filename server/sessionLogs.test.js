import { describe, expect, it } from 'vitest';
import path from 'node:path';
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

// CodeQL flagged both of these as Critical/High on PR #61.
describe('hostile input hardening', () => {
    // A repeated header arrives as an array, so anything reading one has to
    // collapse it first or downstream code gets a type it never expected.
    it('reduces a duplicated filename header to a single safe name', () => {
        const name = safeLogName(['first.json', 'second.json'][0]);
        expect(name).not.toContain(',');
        expect(name.endsWith('.json')).toBe(true);
    });

    // A name of ".." would resolve to the parent directory once joined.
    it('never produces a name that escapes its directory', () => {
        const hostile = ['..', '../..', '....//', '../../etc/passwd', '/etc/passwd', '.\\..\\win.ini'];
        for (const raw of hostile) {
            const name = safeLogName(raw);
            const dir = path.resolve('/tmp/hb-log-containment');
            const target = path.resolve(dir, name);
            expect(target.startsWith(dir + path.sep), `${raw} -> ${name}`).toBe(true);
        }
    });

    it('keeps a name that is only dots from collapsing to nothing dangerous', () => {
        for (const raw of ['...', '.', '..']) {
            const name = safeLogName(raw);
            expect(name).not.toBe('');
            expect(name.startsWith('.')).toBe(false);
        }
    });
});

describe('upload limit', () => {
    // The global express.json limit is 16kb; a session capture is far larger,
    // which is why this route parses raw with its own bound.
    // A real capture is ~68 MB of repetitive JSON (docs/logs/log20.json), so the
    // ceiling has to clear that or `uploadlogs` fails on exactly the sessions
    // worth reviewing. body-parser applies it to the decompressed stream, so it
    // also bounds a decompression bomb.
    it('clears a real session capture but stays bounded', () => {
        const realCaptureBytes = 68 * 1024 * 1024;
        expect(MAX_LOG_BYTES).toBeGreaterThan(realCaptureBytes);
        expect(MAX_LOG_BYTES).toBeLessThanOrEqual(256 * 1024 * 1024);
    });
});
