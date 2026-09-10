import { describe, expect, it, vi } from 'vitest';
import { deliverSessionLog, uploadSessionLog } from './sessionLogSink.js';

const BODY = '{"logs":[]}';
const NAME = 'hunker-bunker-session-x.json';

describe('deliverSessionLog', () => {
    // Steam Deck / packaged: the blob + <a download> path raises a native save
    // dialog, which is what made Deck log capture impractical. When the
    // Electron bridge is present it must win, and no dialog is involved.
    it('writes straight to disk under Electron and reports the path', async () => {
        const writeSessionLog = vi.fn().mockResolvedValue({ ok: true, path: '/u/logs/x.json', bytes: 11 });
        const result = await deliverSessionLog(BODY, NAME, { electronAPI: { writeSessionLog } });

        expect(writeSessionLog).toHaveBeenCalledWith(NAME, BODY);
        expect(result).toMatchObject({ ok: true, method: 'electron', path: '/u/logs/x.json' });
    });

    it('falls back to the browser download when Electron write fails', async () => {
        const writeSessionLog = vi.fn().mockResolvedValue({ ok: false, error: 'EACCES' });
        const result = await deliverSessionLog(BODY, NAME, { electronAPI: { writeSessionLog } });
        expect(result).toMatchObject({ ok: false, method: 'download' });
        expect(result.error).toContain('EACCES');
    });

    it('falls back to the browser download when the bridge throws', async () => {
        const writeSessionLog = vi.fn().mockRejectedValue(new Error('ipc gone'));
        const result = await deliverSessionLog(BODY, NAME, { electronAPI: { writeSessionLog } });
        expect(result.method).toBe('download');
    });

    // `npm run dev`: a browser download lands in Downloads under a name you
    // then have to hunt for. The dev sink writes into ./logs in the repo.
    it('posts to the dev sink when running under the dev server', async () => {
        const fetchImpl = vi.fn().mockResolvedValue({
            ok: true, json: async () => ({ ok: true, path: 'logs/x.json', bytes: 11 })
        });
        const result = await deliverSessionLog(BODY, NAME, { isDev: true, fetchImpl });

        expect(fetchImpl).toHaveBeenCalledOnce();
        const [url, init] = fetchImpl.mock.calls[0];
        expect(url).toBe('/__hb/logs');
        expect(init.method).toBe('POST');
        expect(init.headers['x-hb-log-name']).toBe(NAME);
        expect(init.body).toBe(BODY);
        expect(result).toMatchObject({ ok: true, method: 'dev-server', path: 'logs/x.json' });
    });

    it('falls back to download when the dev sink is unreachable', async () => {
        const fetchImpl = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
        const result = await deliverSessionLog(BODY, NAME, { isDev: true, fetchImpl });
        expect(result.method).toBe('download');
    });

    it('asks for a browser download when nothing better exists', async () => {
        const result = await deliverSessionLog(BODY, NAME, {});
        expect(result).toMatchObject({ ok: false, method: 'download' });
    });
});

describe('uploadSessionLog', () => {
    it('posts the capture to the shared server with device metadata', async () => {
        const fetchImpl = vi.fn().mockResolvedValue({
            ok: true, json: async () => ({ ok: true, filename: 'session-a.json', bytes: 11 })
        });
        const result = await uploadSessionLog(BODY, NAME, {
            backendUrl: 'https://steam.example.club', fetchImpl, device: 'steam-deck'
        });

        const [url, init] = fetchImpl.mock.calls[0];
        expect(url).toBe('https://steam.example.club/logs/session');
        expect(init.headers['x-hb-log-device']).toBe('steam-deck');
        expect(init.headers['x-hb-log-name']).toBe(NAME);
        expect(result).toMatchObject({ ok: true, filename: 'session-a.json' });
    });

    it('joins the path correctly when the backend url has a trailing slash', async () => {
        const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
        await uploadSessionLog(BODY, NAME, { backendUrl: 'https://x.club/', fetchImpl });
        expect(fetchImpl.mock.calls[0][0]).toBe('https://x.club/logs/session');
    });

    it('sends the shared token only when one is configured', async () => {
        const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
        await uploadSessionLog(BODY, NAME, { backendUrl: 'https://x.club', fetchImpl });
        expect(fetchImpl.mock.calls[0][1].headers['x-hb-log-token']).toBeUndefined();

        await uploadSessionLog(BODY, NAME, { backendUrl: 'https://x.club', fetchImpl, token: 's3cret' });
        expect(fetchImpl.mock.calls[1][1].headers['x-hb-log-token']).toBe('s3cret');
    });

    it('reports a refusal instead of throwing', async () => {
        const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: 'bad token' }) });
        const result = await uploadSessionLog(BODY, NAME, { backendUrl: 'https://x.club', fetchImpl });
        expect(result.ok).toBe(false);
        expect(result.error).toContain('401');
    });

    it('needs a backend url', async () => {
        const result = await uploadSessionLog(BODY, NAME, { fetchImpl: vi.fn() });
        expect(result.ok).toBe(false);
        expect(result.error).toMatch(/backend/i);
    });
});
