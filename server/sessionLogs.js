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

// Optional shared secret. Unset means open, which is right for a LAN/dev box;
// set HB_LOG_UPLOAD_TOKEN on a public host.
function tokenGuard(req, res, next) {
    const expected = process.env.HB_LOG_UPLOAD_TOKEN;
    if (!expected) return next();
    const supplied = req.headers['x-hb-log-token'];
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
            const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from(String(req.body ?? ''));
            if (!body.length) {
                res.status(400).json({ ok: false, error: 'empty body' });
                return;
            }
            const dir = sessionLogDir();
            await fs.mkdir(dir, { recursive: true });
            const filename = safeLogName(req.headers['x-hb-log-name']);
            const target = path.join(dir, filename);
            if (!target.startsWith(dir)) throw new Error('path escape');
            await fs.writeFile(target, body);

            // Device/platform is free-form and only used to tell captures apart
            // in a listing; it is never trusted for anything else.
            const device = String(req.headers['x-hb-log-device'] ?? '').replace(/[^\w .:-]/g, '').slice(0, 64);
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
            const target = path.resolve(dir, path.basename(String(req.params.name)));
            if (!target.startsWith(path.resolve(dir))) {
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
