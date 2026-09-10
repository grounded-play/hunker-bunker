import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { attachSessionLogRoutes, isLogUploadOpen } from './sessionLogs.js';

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

// CodeQL's js/http-to-file-access exists because writing caller-supplied bytes
// to disk is an arbitrary-upload and disk-exhaustion surface. The endpoint is a
// deliberate log drop box, so the answer is not to stop writing files -- it is
// to make sure an anonymous stranger cannot, and that a few KB cannot become
// gigabytes on disk.
describe('upload access control', () => {
    it('stays open on a dev box with no token configured', () => {
        expect(isLogUploadOpen({ NODE_ENV: 'development' })).toBe(true);
        expect(isLogUploadOpen({})).toBe(true);
    });

    // Failing closed matters more than convenience: forgetting a variable must
    // not silently publish a public write endpoint.
    it('refuses to run open in production without a token', () => {
        expect(isLogUploadOpen({ NODE_ENV: 'production' })).toBe(false);
        expect(isLogUploadOpen({ NODE_ENV: 'PRODUCTION' })).toBe(false);
    });

    it('is closed whenever a token is configured, whatever the environment', () => {
        expect(isLogUploadOpen({ NODE_ENV: 'development', HB_LOG_UPLOAD_TOKEN: 's3cret' })).toBe(false);
    });
});

describe('POST /logs/session', () => {
    it('stores a capture without losing any of its content', async () => {
        const payload = '{"logs":[{"m":"hello"}]}';
        const res = await post(payload, { 'x-hb-log-name': 'session.json' });
        const data = await res.json();

        expect(data.ok).toBe(true);
        const written = await fs.readFile(path.join(dir, data.filename), 'utf8');
        expect(JSON.parse(written)).toEqual(JSON.parse(payload));
    });

    // The stored bytes are serialized by the route, never relayed from the
    // request object -- that is both the CodeQL taint barrier and a guarantee
    // that tooling can always parse what it reads back.
    it('normalizes a valid capture to parseable JSON', async () => {
        const res = await post('{  "logs" : [ {"m":"x"} ]  }', { 'x-hb-log-name': 'messy.json' });
        const data = await res.json();

        const written = await fs.readFile(path.join(dir, data.filename), 'utf8');
        expect(() => JSON.parse(written)).not.toThrow();
        expect(JSON.parse(written)).toEqual({ logs: [{ m: 'x' }] });
    });

    // A damaged log is often the interesting one, so keep it rather than drop
    // it -- but keep it inside an envelope so the file is still parseable.
    it('preserves a malformed body verbatim inside a JSON envelope', async () => {
        const res = await post('not json at all {{{', { 'x-hb-log-name': 'broken.json' });
        const data = await res.json();
        expect(data.ok).toBe(true);

        const written = JSON.parse(await fs.readFile(path.join(dir, data.filename), 'utf8'));
        expect(written.format).toBe('text');
        expect(written.content).toBe('not json at all {{{');
    });

    it('reports the stored byte count, not the received one', async () => {
        const res = await post('{  "a" :  1  }');
        const data = await res.json();
        const written = await fs.readFile(path.join(dir, data.filename), 'utf8');
        expect(data.bytes).toBe(Buffer.byteLength(written));
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
        expect(JSON.parse(body)).toEqual({ logs: [] });
    });

    // Real captures are tens of MB of repetitive JSON, well past any sane wire
    // limit, so the client gzips them.
    it('accepts a gzipped capture and stores the decompressed JSON', async () => {
        const payload = JSON.stringify({ logs: Array.from({ length: 500 }, (_, i) => ({ i })) });
        const gz = zlib.gzipSync(Buffer.from(payload, 'utf8'));
        expect(gz.length).toBeLessThan(Buffer.byteLength(payload));

        const res = await fetch(`${url}/logs/session`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'content-encoding': 'gzip', 'x-hb-log-name': 'gz.json' },
            body: gz
        });
        const data = await res.json();
        expect(data.ok).toBe(true);

        const written = JSON.parse(await fs.readFile(path.join(dir, data.filename), 'utf8'));
        expect(written.logs).toHaveLength(500);
    });

    it('rejects a body that claims gzip but is not', async () => {
        const res = await fetch(`${url}/logs/session`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'content-encoding': 'gzip' },
            body: 'definitely not gzip'
        });
        expect(res.ok).toBe(false);
        expect(await fs.readdir(dir)).toHaveLength(0);
    });

    it('refuses to read a traversal path back out', async () => {
        const res = await fetch(`${url}/logs/session/${encodeURIComponent('../../../etc/passwd')}`);
        expect(res.ok).toBe(false);
        expect(res.status).toBe(404);
    });
});
