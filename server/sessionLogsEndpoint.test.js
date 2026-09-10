import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { attachSessionLogRoutes } from './sessionLogs.js';

// End-to-end over a real HTTP server: the upload route takes attacker-influenced
// bytes under an attacker-influenced name, so the guards are worth exercising
// through the actual middleware stack rather than only unit-testing the helper.

let server; let url; let dir; let prevDir;

beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hb-logs-'));
    prevDir = process.env.HB_SESSION_LOG_DIR;
    process.env.HB_SESSION_LOG_DIR = dir;

    const app = express();
    attachSessionLogRoutes(app);
    // Mirrors server/index.js: the global JSON parser is registered *after* the
    // log routes, so the raw body reaches them intact.
    app.use(express.json({ limit: '16kb' }));

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    url = `http://localhost:${server.address().port}`;
});

afterEach(async () => {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(dir, { recursive: true, force: true });
    if (prevDir === undefined) delete process.env.HB_SESSION_LOG_DIR;
    else process.env.HB_SESSION_LOG_DIR = prevDir;
});

const post = (body, headers = {}) => fetch(`${url}/logs/session`, {
    method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body
});

describe('POST /logs/session', () => {
    it('stores a capture byte-for-byte', async () => {
        const payload = '{"logs":[{"m":"hello"}]}';
        const res = await post(payload, { 'x-hb-log-name': 'session.json' });
        const data = await res.json();

        expect(data.ok).toBe(true);
        expect(data.bytes).toBe(Buffer.byteLength(payload));
        const written = await fs.readFile(path.join(dir, data.filename), 'utf8');
        expect(written).toBe(payload);
    });

    it('rejects an empty body instead of writing a stub file', async () => {
        const res = await post('');
        expect(res.status).toBe(400);
        expect(await fs.readdir(dir)).toHaveLength(0);
    });

    // The containment guard: a traversal name must not escape the log dir.
    it('cannot be made to write outside the log directory', async () => {
        const res = await post('{"x":1}', { 'x-hb-log-name': '../../escaped.json' });
        const data = await res.json();

        expect(data.ok).toBe(true); // sanitized, not refused
        const entries = await fs.readdir(dir);
        expect(entries).toHaveLength(1);
        expect(entries[0]).not.toContain('..');

        const parent = await fs.readdir(path.dirname(dir));
        expect(parent.some((e) => e === 'escaped.json')).toBe(false);
    });

    it('survives a duplicated filename header', async () => {
        // fetch collapses repeats into "a, b"; the route must still land inside.
        const res = await post('{"x":1}', { 'x-hb-log-name': 'a.json, b.json' });
        const data = await res.json();
        expect(data.ok).toBe(true);
        expect(data.filename).not.toContain(',');
        expect(data.filename).not.toContain(' ');
    });

    it('round-trips through list and read-back', async () => {
        await post('{"logs":[]}', { 'x-hb-log-name': 'round.json' });

        const listing = await (await fetch(`${url}/logs/session`)).json();
        expect(listing.count).toBe(1);

        const body = await (await fetch(`${url}/logs/session/${listing.entries[0].name}`)).text();
        expect(body).toBe('{"logs":[]}');
    });

    it('refuses to read a traversal path back out', async () => {
        const res = await fetch(`${url}/logs/session/${encodeURIComponent('../../../etc/passwd')}`);
        expect(res.ok).toBe(false);
        expect(res.status).toBe(404);
    });
});
