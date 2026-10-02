import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { builtinModules } from 'node:module';
import { fileURLToPath } from 'node:url';

// 2026-10-01: the backend image crash-looped in production with
// ERR_MODULE_NOT_FOUND /app/src/chatFilter.js. server/chatPolicy.js imports
// the shared chat filter from src/, but deploy/Dockerfile copied only server/.
// Unit tests run against the whole repository, so nothing caught it. This
// walks the same import graph the container runs and checks the image has
// every file it reaches, and every package is installed by `npm ci --omit=dev`.

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMPORT_RE = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]/g;

function traceServer() {
    const seen = new Set();
    const outside = new Set();
    const packages = new Set();
    const walk = (file) => {
        if (seen.has(file)) return;
        seen.add(file);
        for (const match of fs.readFileSync(file, 'utf8').matchAll(IMPORT_RE)) {
            const spec = match[1] || match[2] || match[3];
            if (spec.startsWith('.')) {
                const target = path.resolve(path.dirname(file), spec);
                const rel = path.relative(repo, target).split(path.sep).join('/');
                if (!target.startsWith(path.join(repo, 'server') + path.sep)) outside.add(rel);
                walk(target);
            } else {
                const name = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
                packages.add(name.replace(/^node:/, ''));
            }
        }
    };
    walk(path.join(repo, 'server/index.js'));
    for (const file of fs.readdirSync(path.join(repo, 'server/scripts'))) {
        if (file.endsWith('.js')) walk(path.join(repo, 'server/scripts', file));
    }
    return { outside: [...outside].sort(), packages: [...packages].sort() };
}

// Paths `COPY <src> <dest>` puts in the image, relative to WORKDIR /app.
function copiedPaths() {
    const dockerfile = fs.readFileSync(path.join(repo, 'deploy/Dockerfile'), 'utf8');
    return dockerfile.split('\n')
        .map((line) => line.trim().match(/^COPY\s+(?!--from)(.+)$/))
        .filter(Boolean)
        .flatMap(([, args]) => {
            const parts = args.split(/\s+/);
            const sources = parts.slice(0, -1);
            const dest = parts.at(-1).replace(/^\.\/?/, '').replace(/\/$/, '');
            return sources.map((src) => (sources.length === 1 && !dest.endsWith('/') && dest && dest !== '.'
                ? dest
                : path.posix.join(dest, path.posix.basename(src))));
        });
}

describe('backend image contents', () => {
    const { outside, packages } = traceServer();

    it('copies every file outside server/ that the server imports', () => {
        const copied = copiedPaths();
        const missing = outside.filter((file) => !copied.some((dest) => file === dest || file.startsWith(`${dest}/`)));
        expect(missing).toEqual([]);
    });

    it('installs every package the server imports as a production dependency', () => {
        const pkg = JSON.parse(fs.readFileSync(path.join(repo, 'package.json'), 'utf8'));
        const builtins = new Set(builtinModules);
        const missing = packages.filter((name) => !builtins.has(name) && !(name in (pkg.dependencies ?? {})));
        expect(missing).toEqual([]);
    });
});
