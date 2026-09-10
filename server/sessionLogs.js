// Shared session-log drop box.
//
// The in-game console can export a session capture, but every delivery path it
// had was local to the machine that produced it: a browser blob download on PC
// and a native save dialog under Electron, which is close to unusable on a
// Steam Deck in Gaming Mode. That makes collecting a Deck log and a PC log for
// the same play session unnecessarily manual.
//
// This gives both a single destination on the server the group already plays
// on, so logs from every device land in one directory and can be listed and
// read back for review.
//
// Storage is plain files on disk, deliberately: a session log is write-once,
// read-rarely, and useful to `scp` or `cat` directly. It does not belong in the
// game database.

import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRateLimitMiddleware } from './rateLimit.js';

const here = path.dirname(fileURLToPath(import.meta.url));

// Cap a single upload. Session captures are capped at 2500 entries client-side,
// so this is generous; it exists to stop a broken client filling the disk.
export const MAX_LOG_BYTES = 32 * 1024 * 1024;

export function sessionLogDir() {
    return process.env.HB_SESSION_LOG_DIR || path.join(here, 'session-logs');
}

// Client-supplied names are untrusted. Keep a readable name where possible,
// but never let one escape the log directory or collide destructively.
export function safeLogName(rawName, { now = Date.now(), random = Math.random } = {}) {
    const cleaned = String(rawName ?? '')
        .replace(/[^a-zA-Z0-9._-]/g, '')
        // Collapse dot runs and strip leading dots. Separators are already gone
        // by this point, but a name of ".." would still resolve to the parent
        // directory once joined, and a leading dot only makes a hidden file.
        .replace(/\.{2,}/g, '.')
        .replace(/^\.+/, '')
        .slice(0, 120);
    const suffix = `${now.toString(36)}-${Math.floor(random() * 1e6).toString(36)}`;
    if (!cleaned) return `session-${suffix}.json`;
    const dot = cleaned.lastIndexOf('.');
    const stem = dot > 0 ? cleaned.slice(0, dot) : cleaned;
    const ext = dot > 0 ? cleaned.slice(dot) : '.json';
    return `${stem}-${suffix}${ext}`;
}

// Node gives a repeated header as an array, so every header read here has to
// collapse to a single string first. Without this a client could send
// `x-hb-log-name` twice and hand downstream code an array where it expects text.
function headerValue(raw) {
    const value = Array.isArray(raw) ? raw[0] : raw;
    return typeof value === 'string' ? value : '';
}

// Optional shared secret. Unset means open, which is right for a LAN/dev box;
// set HB_LOG_UPLOAD_TOKEN on a public host.
function tokenGuard(req, res, next) {
    const expected = process.env.HB_LOG_UPLOAD_TOKEN;
    if (!expected) return next();
    const supplied = headerValue(req.headers['x-hb-log-token']);
    if (supplied === expected) return next();
    res.status(401).json({ ok: false, error: 'bad or missing log token' });
}

export function attachSessionLogRoutes(app) {
    const limiter = createRateLimitMiddleware({ windowMs: 60_000, max: 30 });

    // Raw parser: the body is already-serialized JSON or text from the game.
    // Re-parsing it would only risk rejecting a capture we still want to keep.
    const raw = express.raw({ type: '*/*', limit: MAX_LOG_BYTES });

    app.post('/logs/session', limiter, tokenGuard, raw, async (req, res) => {
        try {
            // express.raw() always yields a Buffer for a body it parsed. Anything
            // else means a different parser ran first (or none did), and coercing
            // an object or array with String() would silently persist garbage
            // like "[object Object]" instead of the capture.
            const body = req.body;
            if (!Buffer.isBuffer(body)) {
                res.status(400).json({ ok: false, error: 'expected a raw body' });
                return;
            }
            if (!body.length) {
                res.status(400).json({ ok: false, error: 'empty body' });
                return;
            }
            const dir = path.resolve(sessionLogDir());
            await fs.mkdir(dir, { recursive: true });
            const filename = safeLogName(headerValue(req.headers['x-hb-log-name']));
            // safeLogName already strips separators and dot segments; resolving
            // and re-checking against dir + separator is the belt-and-braces
            // containment check, since this writes attacker-influenced bytes to
            // an attacker-influenced name.
            const target = path.resolve(dir, filename);
            if (target !== dir && !target.startsWith(dir + path.sep)) {
                res.status(400).json({ ok: false, error: 'bad name' });
                return;
            }
            await fs.writeFile(target, body);

            // Device/platform is free-form and only used to tell captures apart
            // in a listing; it is never trusted for anything else.
            const device = headerValue(req.headers['x-hb-log-device']).replace(/[^\w .:-]/g, '').slice(0, 64);
            console.info('[hb-session-log]', JSON.stringify({
                filename, bytes: body.length, device: device || undefined
            }));
            res.json({ ok: true, filename, bytes: body.length, path: `/logs/session/${filename}` });
        } catch (err) {
            res.status(500).json({ ok: false, error: String(err?.message ?? err) });
        }
    });

    app.get('/logs/session', limiter, async (_req, res) => {
        try {
            const dir = sessionLogDir();
            await fs.mkdir(dir, { recursive: true });
            const names = await fs.readdir(dir);
            const entries = await Promise.all(names.map(async (name) => {
                const stat = await fs.stat(path.join(dir, name));
                return { name, bytes: stat.size, modified: stat.mtime.toISOString() };
            }));
            entries.sort((a, b) => b.modified.localeCompare(a.modified));
            res.json({ ok: true, dir, count: entries.length, entries });
        } catch (err) {
            res.status(500).json({ ok: false, error: String(err?.message ?? err) });
        }
    });

    app.get('/logs/session/:name', limiter, async (req, res) => {
        try {
            const dir = sessionLogDir();
            // Resolve then confirm containment, so ../ cannot read outside dir.
            const resolvedDir = path.resolve(dir);
            const target = path.resolve(resolvedDir, path.basename(String(req.params.name)));
            if (target !== resolvedDir && !target.startsWith(resolvedDir + path.sep)) {
                res.status(400).json({ ok: false, error: 'bad name' });
                return;
            }
            const body = await fs.readFile(target, 'utf8');
            res.type('application/json').send(body);
        } catch {
            res.status(404).json({ ok: false, error: 'not found' });
        }
    });
}
