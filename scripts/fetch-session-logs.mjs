#!/usr/bin/env node
// Pull in-game session captures off the backend for review.
//
// Players export with `~` -> EXPORT SESSION (writes locally) or `uploadlogs`
// (pushes here). This lists what has arrived and downloads it, so a Steam Deck
// and a PC capture from the same session can be read side by side.
//
// Usage:
//   node scripts/fetch-session-logs.mjs                    # list
//   node scripts/fetch-session-logs.mjs --all              # download all
//   node scripts/fetch-session-logs.mjs --name <file>      # download one
//   node scripts/fetch-session-logs.mjs --latest 3         # newest N
//
// Env:
//   HB_STEAM_BACKEND_URL  backend base (default https://steam.tuesdaycinema.club)
//   HB_LOG_UPLOAD_TOKEN   sent as x-hb-log-token when the server requires one
//   HB_LOG_OUT_DIR        download directory (default ./logs)

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = (process.env.HB_STEAM_BACKEND_URL || 'https://steam.tuesdaycinema.club').replace(/\/+$/, '');
const TOKEN = process.env.HB_LOG_UPLOAD_TOKEN || '';
const OUT_DIR = process.env.HB_LOG_OUT_DIR || 'logs';
const args = process.argv.slice(2);

const flag = (name) => args.includes(name);
const value = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : null;
};

const headers = TOKEN ? { 'x-hb-log-token': TOKEN } : {};

async function listLogs() {
    const res = await fetch(`${BASE}/logs/session`, { headers });
    if (!res.ok) throw new Error(`list failed: HTTP ${res.status}`);
    const data = await res.json();
    if (!data?.ok) throw new Error(`list refused: ${data?.error ?? 'unknown'}`);
    return data;
}

async function download(name) {
    const res = await fetch(`${BASE}/logs/session/${encodeURIComponent(name)}`, { headers });
    if (!res.ok) throw new Error(`download failed for ${name}: HTTP ${res.status}`);
    const body = await res.text();
    await mkdir(OUT_DIR, { recursive: true });
    const target = path.join(OUT_DIR, name);
    await writeFile(target, body, 'utf8');
    return { target, bytes: Buffer.byteLength(body, 'utf8') };
}

const human = (bytes) => (bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${(bytes / 1024).toFixed(0)} KB`);

try {
    const listing = await listLogs();
    if (!listing.count) {
        console.log(`No session logs on ${BASE} yet.`);
        console.log('In game: press ~ then run `uploadlogs` to push one here.');
        process.exit(0);
    }

    const one = value('--name');
    const latest = Number(value('--latest'));
    let wanted = [];
    if (one) wanted = listing.entries.filter((e) => e.name === one);
    else if (Number.isFinite(latest) && latest > 0) wanted = listing.entries.slice(0, latest);
    else if (flag('--all')) wanted = listing.entries;

    if (!wanted.length) {
        console.log(`${listing.count} session log(s) on ${BASE} (server dir: ${listing.dir})\n`);
        for (const e of listing.entries) {
            console.log(`  ${e.modified}  ${human(e.bytes).padStart(8)}  ${e.name}`);
        }
        console.log('\nDownload with --all, --latest <n>, or --name <file>.');
        process.exit(0);
    }

    for (const entry of wanted) {
        const { target, bytes } = await download(entry.name);
        console.log(`saved ${target} (${human(bytes)})`);
    }
} catch (err) {
    console.error(`[fetch-session-logs] ${err.message}`);
    process.exit(1);
}
