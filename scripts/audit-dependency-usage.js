#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_EXTENSIONS = new Set(['.js', '.cjs', '.mjs', '.ts', '.tsx', '.jsx']);
const SKIP_DIRECTORIES = new Set([
    '.git',
    'coverage',
    'dist',
    'dist_electron',
    'node_modules',
    'playwright-report',
    'test-results',
    'tests'
]);

export function packageNameFromSpecifier(specifier) {
    const value = String(specifier ?? '');
    if (!value || value.startsWith('.') || value.startsWith('/') || value.startsWith('node:')) return null;
    if (value.startsWith('@')) return value.split('/').slice(0, 2).join('/');
    return value.split('/')[0];
}

export function extractPackageReferences(sourceText) {
    const references = new Set();
    const source = String(sourceText ?? '');
    const patterns = [
        /\b(?:import|export)\s+(?:[^'"]*?\sfrom\s*)?['"]([^'"]+)['"]/g,
        /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
        /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g
    ];
    for (const pattern of patterns) {
        for (const match of source.matchAll(pattern)) {
            const packageName = packageNameFromSpecifier(match[1]);
            if (packageName) references.add(packageName);
        }
    }
    return references;
}

export function findUnusedDependencies(dependencies, sourceTexts) {
    const referenced = new Set();
    for (const sourceText of sourceTexts) {
        for (const packageName of extractPackageReferences(sourceText)) referenced.add(packageName);
    }
    return Object.keys(dependencies ?? {}).filter((name) => !referenced.has(name)).sort();
}

function collectSourceFiles(directory, files = []) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (!SKIP_DIRECTORIES.has(entry.name)) collectSourceFiles(path.join(directory, entry.name), files);
            continue;
        }
        if (entry.name.includes('.test.') || entry.name.includes('.spec.')) continue;
        if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) files.push(path.join(directory, entry.name));
    }
    return files;
}

export function auditDependencyUsage(root = ROOT) {
    const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const sourceTexts = collectSourceFiles(root).map((file) => fs.readFileSync(file, 'utf8'));
    return findUnusedDependencies(packageJson.dependencies, sourceTexts);
}

function main() {
    const unused = auditDependencyUsage();
    if (unused.length) {
        console.error(`[dependency-audit] unused production dependencies: ${unused.join(', ')}`);
        process.exitCode = 1;
        return;
    }
    console.log('[dependency-audit] ok (all production dependencies have source references)');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main();
}
