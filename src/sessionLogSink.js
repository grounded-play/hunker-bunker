// Where a session capture actually goes.
//
// The console's export had exactly one delivery mechanism: a Blob plus an
// `<a download>` click. That is the worst option on both platforms we
// actually play on:
//   - PC via `npm run dev`: the file lands in the browser's Downloads folder
//     under a timestamped name, which is awkward to find and hand to someone.
//   - Steam Deck (Electron): the same anchor raises a native save dialog,
//     which in Gaming Mode is close to unusable.
//
// So delivery is chosen by environment instead, best-available first, and the
// browser download survives only as the last resort. Every path reports where
// the file went so the console can print a real location rather than "saved".
//
// Pure and injectable: `debugConsole.js` is DOM-bound and awkward to test, and
// a log exporter that only works in a real browser is one that gets verified
// by hand, i.e. rarely.

const DEV_SINK_PATH = '/__hb/logs';

function resolveFetch(fetchImpl) {
    if (fetchImpl) return fetchImpl;
    if (typeof globalThis.fetch === 'function') return globalThis.fetch.bind(globalThis);
    return null;
}

/**
 * Deliver a capture to the best local destination available.
 * Returns { ok, method, path?, error? }. `method: 'download'` means the caller
 * should fall back to the browser blob download.
 */
export async function deliverSessionLog(body, filename, {
    electronAPI = null,
    fetchImpl = null,
    isDev = false
} = {}) {
    // 1. Packaged / Steam Deck: write to disk, no dialog.
    if (typeof electronAPI?.writeSessionLog === 'function') {
        try {
            const res = await electronAPI.writeSessionLog(filename, body);
            if (res?.ok) {
                return { ok: true, method: 'electron', path: res.path, bytes: res.bytes };
            }
            return { ok: false, method: 'download', error: `electron write failed: ${res?.error ?? 'unknown'}` };
        } catch (err) {
            return { ok: false, method: 'download', error: `electron write threw: ${String(err?.message ?? err)}` };
        }
    }

    // 2. `npm run dev`: the Vite middleware writes into ./logs in the repo.
    if (isDev) {
        const doFetch = resolveFetch(fetchImpl);
        if (doFetch) {
            try {
                const res = await doFetch(DEV_SINK_PATH, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json', 'x-hb-log-name': filename },
                    body
                });
                const data = res?.ok ? await res.json() : null;
                if (data?.ok) return { ok: true, method: 'dev-server', path: data.path, bytes: data.bytes };
                return { ok: false, method: 'download', error: `dev sink refused (${res?.status ?? '?'})` };
            } catch (err) {
                return { ok: false, method: 'download', error: `dev sink unreachable: ${String(err?.message ?? err)}` };
            }
        }
    }

    // 3. Plain browser build: nothing better exists.
    return { ok: false, method: 'download' };
}

/**
 * Push a capture to the shared backend, so Deck and PC logs from the same
 * session land in one place. Explicit rather than automatic -- uploading play
 * telemetry off-device should be something a person asks for.
 */
export async function uploadSessionLog(body, filename, {
    backendUrl = '',
    fetchImpl = null,
    token = '',
    device = ''
} = {}) {
    const base = String(backendUrl ?? '').trim();
    if (!base) return { ok: false, error: 'no backend url configured for log upload' };

    const doFetch = resolveFetch(fetchImpl);
    if (!doFetch) return { ok: false, error: 'no fetch available' };

    const url = `${base.replace(/\/+$/, '')}/logs/session`;
    const headers = { 'content-type': 'application/json', 'x-hb-log-name': filename };
    if (token) headers['x-hb-log-token'] = token;
    if (device) headers['x-hb-log-device'] = device;

    // A real session capture is tens of megabytes of highly repetitive JSON.
    // Sending it raw would blow past any sane server limit, so compress when the
    // browser can -- and fall back to the raw body when it cannot, rather than
    // failing the upload.
    let payload = body;
    const compressed = await gzipIfPossible(body);
    if (compressed) {
        payload = compressed;
        headers['content-encoding'] = 'gzip';
    }

    try {
        const res = await doFetch(url, { method: 'POST', headers, body: payload });
        if (!res?.ok) {
            let detail = '';
            try { detail = JSON.stringify(await res.json()); } catch { /* body may be empty */ }
            return { ok: false, error: `upload refused (${res?.status ?? '?'}) ${detail}`.trim() };
        }
        const data = await res.json();
        return { ok: Boolean(data?.ok), ...data, url };
    } catch (err) {
        return { ok: false, error: `upload failed: ${String(err?.message ?? err)}` };
    }
}

// CompressionStream is available in every browser and Electron build we ship
// to; returning null when it is not lets the caller send the capture uncompressed.
export async function gzipIfPossible(text, { CompressionStreamImpl = globalThis.CompressionStream, ResponseImpl = globalThis.Response } = {}) {
    if (typeof CompressionStreamImpl !== 'function' || typeof ResponseImpl !== 'function') return null;
    try {
        const stream = new ResponseImpl(text).body?.pipeThrough(new CompressionStreamImpl('gzip'));
        if (!stream) return null;
        return await new ResponseImpl(stream).blob();
    } catch {
        return null;
    }
}

/** Best-effort device label, used only to tell captures apart in a listing. */
export function describeDevice(win = globalThis) {
    const parts = [];
    if (win?.electronAPI) parts.push('electron');
    const ua = win?.navigator?.userAgent ?? '';
    if (/SteamDeck|Steam Deck/i.test(ua)) parts.push('steam-deck');
    else if (/Linux/i.test(ua)) parts.push('linux');
    else if (/Windows/i.test(ua)) parts.push('windows');
    else if (/Mac OS/i.test(ua)) parts.push('mac');
    return parts.join('-') || 'unknown';
}
