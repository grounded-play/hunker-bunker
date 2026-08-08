import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Sprint 22 B3 (docs/sprint-22-systems-breakdown/08-engineering-act2-state-schema.md,
// "Sprint 22 Work" item 1: "verify every choice surface mutates state
// through the manager"). Act2Manager.getState() already returns a freshly
// normalized copy on every call (normalizeAct2State rebuilds camps/hives/
// manifest arrays, so a caller mutating the returned object can't corrupt
// persisted state by accident) -- but a caller reaching into the *live*
// `.state` field directly (e.g. `this.act2.state.camps[0].bond = 9`) bypasses
// save(), phase-transition callbacks, and manifest rebuilding entirely, and
// nothing in the type system stops that. This test makes the "nobody does
// that" audit finding a standing, automated guard instead of a one-time
// read-through, so a future edit can't silently reintroduce it.

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_ROOTS = ['src', 'main.js'];
const SKIP_DIR_NAMES = new Set(['node_modules', 'dist', 'dist_soundtrack', '.git', 'coverage']);

// The manager's own internal reads/writes of `this.state` are the sanctioned
// implementation, not a violation -- everything else in the tree must go
// through getState()/the named mutator methods instead.
const EXEMPT_FILES = new Set(['src/act2.js', 'src/act2StateSurfaceAudit.test.js']);

// Matches direct live-state field access through any variable name ending in
// "act2" or "act2Manager" (this.act2, window.act2, act2Manager, ...),
// followed by `.state.` and then a further property -- e.g.
// `this.act2.state.camps` or `act2Manager.state.queenStatus`. Reading
// `.state` alone isn't matched (only `.state.<something>`), since the audit
// cares about reaching *through* the live object, not merely naming it.
const FORBIDDEN_PATTERN = /\bact2(?:Manager)?\.state\.[A-Za-z_]/;

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

describe('Act2 state-surface audit (Sprint 22 B3)', () => {
    it('scans at least the known source tree (sanity check the walker itself works)', () => {
        const files = listScannedFiles();
        expect(files.length).toBeGreaterThan(50);
        expect(files.some((f) => f.endsWith(path.join('src', 'act2.js')))).toBe(true);
        expect(files.some((f) => f.endsWith('main.js'))).toBe(true);
    });

    it('never reaches into a live Act2Manager.state field from outside act2.js', () => {
        const offenders = [];
        for (const filePath of listScannedFiles()) {
            const relative = path.relative(REPO_ROOT, filePath).split(path.sep).join('/');
            if (EXEMPT_FILES.has(relative)) continue;
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
