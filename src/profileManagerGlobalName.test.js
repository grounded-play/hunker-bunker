import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// docs/multiplayer-flow-and-lobby-bugs-2026-08-20.md: main.js:2138-2139
// creates the one real ProfileManager instance and assigns it to
// `window.profile` -- that's the only name ever assigned. Five call sites
// (three in multiplayerLobby.js, one each in main.js and playerTrade.js)
// had drifted to reading `window.profileManager` instead, a name that was
// never assigned anywhere. Every one of those reads silently no-op'd via
// optional chaining, so the multiplayer roster always fell back to the
// hardcoded 'AGENT' string regardless of the player's real callsign, and
// recordMultiplayerRun()/recordTradeCompleted() never actually ran --
// confirmed live via docs/logs/log9.json entry 51 ("AGENT (HOST)" in the
// roster) and the resulting per-machine stat drift the user reported.
// This is a standing guard against the same typo/drift reappearing, not a
// one-time read-through -- same pattern as act2StateSurfaceAudit.test.js.

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_ROOTS = ['src', 'main.js'];
const SKIP_DIR_NAMES = new Set(['node_modules', 'dist', 'dist_soundtrack', '.git', 'coverage']);
const FORBIDDEN_PATTERN = /window\.profileManager\b/;
const THIS_FILE = 'src/profileManagerGlobalName.test.js';

function collectJsFiles(startDir) {
    const results = [];
    const stack = [startDir];
    while (stack.length > 0) {
        const current = stack.pop();
        const entries = fs.readdirSync(current, { withFileTypes: true });
        for (const entry of entries) {
            if (SKIP_DIR_NAMES.has(entry.name)) continue;
            const fullPath = path.join(current, entry.name);
            if (entry.isDirectory()) {
                stack.push(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.js')) {
                results.push(fullPath);
            }
        }
    }
    return results;
}

function listScannedFiles() {
    const files = [];
    for (const root of SCAN_ROOTS) {
        const fullRoot = path.join(REPO_ROOT, root);
        const stat = fs.statSync(fullRoot);
        if (stat.isDirectory()) {
            files.push(...collectJsFiles(fullRoot));
        } else {
            files.push(fullRoot);
        }
    }
    return files;
}

describe('window.profileManager never reappears (it was never assigned -- window.profile is the real global)', () => {
    it('finds no reference to the dead window.profileManager global anywhere in src/ or main.js', () => {
        const offenders = [];
        for (const filePath of listScannedFiles()) {
            const relative = path.relative(REPO_ROOT, filePath).split(path.sep).join('/');
            if (relative === THIS_FILE) continue;
            const contents = fs.readFileSync(filePath, 'utf8');
            const lines = contents.split('\n');
            lines.forEach((line, index) => {
                if (FORBIDDEN_PATTERN.test(line)) {
                    offenders.push(`${relative}:${index + 1}: ${line.trim()}`);
                }
            });
        }
        expect(offenders).toEqual([]);
    });
});
