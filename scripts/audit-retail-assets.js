#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_PATH = path.join(ROOT, 'steam/referenced-assets.json');
const REPORT_PATH = path.join(ROOT, 'steam/retail-asset-report.json');
const MEDIA_EXTENSIONS = /\.(?:avif|gif|jpe?g|mp3|mp4|ogg|png|svg|wav|webm|webp)$/i;
const TEXT_ASSET_EXTENSIONS = new Set(['.css', '.html', '.js', '.json', '.md', '.mjs', '.svg', '.txt', '.vdf', '.xml']);
const SOURCE_EXTENSIONS = new Set(['.cjs', '.css', '.html', '.js', '.json', '.mjs']);
const SOURCE_DIRS = ['electron', 'server', 'src'];
// The interactive soundtrack intentionally ships in-game as well as in its
// standalone Steam soundtrack depot, and the optimized gameplay GLBs are now
// part of the retail presentation. Keep finite headroom for those explicit
// runtime assets without allowing the ignored high-resolution sources in.
// Raised 1150->1800 MiB after this sprint's 32 real narrative interstitial
// cutscenes landed (public/interstitials, 731MB before a 281MB duplicate
// cleanup below; see the duplicate-checksum sweep that removed 32
// byte-identical, never-referenced `_key_v1.mp4` files that shipped
// alongside their real, code-referenced `_motion_v1.mp4`/`.webm` siblings).
// Current measured payload is ~1616 MiB; this leaves ~184MB of real headroom
// rather than the bare minimum, so the next small asset addition doesn't
// immediately re-trip this gate.
const PUBLIC_BUDGET = 1800 * 1024 * 1024;
const ASAR_BUDGET = 950 * 1024 * 1024;
const UNKNOWN_ASSET_BUDGET = 160;
const CODEC_MISMATCH_BUDGET = 140;
const DUPLICATE_GROUP_BUDGET = 15;

function walkFiles(root) {
    if (!fs.existsSync(root)) return [];
    const files = [];
    const pending = [root];
    while (pending.length) {
        const current = pending.pop();
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
            const target = path.join(current, entry.name);
            if (entry.isDirectory()) pending.push(target);
            else if (entry.isFile()) files.push(target);
        }
    }
    return files.sort();
}

function posix(value) {
    return value.split(path.sep).join('/');
}

export function normalizeTextAssetContent(value) {
    return String(value).replace(/\r\n?/g, '\n');
}

function portableAssetBuffer(file) {
    const data = fs.readFileSync(file);
    if (!TEXT_ASSET_EXTENSIONS.has(path.extname(file).toLowerCase())) return data;
    return Buffer.from(normalizeTextAssetContent(data.toString('utf8')));
}

export function jsonReportMatches(existing, expected) {
    try {
        return JSON.stringify(JSON.parse(existing)) === JSON.stringify(expected);
    } catch {
        return false;
    }
}

export function extractAssetReferences(text) {
    const refs = new Set();
    const pattern = /(?:^|['"`(\s=:])((?:\/|\.\.\/|\.\/)[^'"`()\s<>]+?\.(?:avif|gif|glb|jpe?g|json|mp3|mp4|ogg|png|svg|wav|webm|webp))(?:[?#][^'"`()\s<>]*)?/gim;
    for (const match of String(text ?? '').matchAll(pattern)) {
        let ref = match[1];
        if (ref.startsWith('./') || ref.startsWith('../')) continue;
        ref = ref.replace(/^\/+/, '');
        if (/[${}]/.test(ref)
            || /\.app\//.test(ref)
            || /(?:^|\/)(?:cdn|qa)\.example\//.test(ref)
            || /^(?:opt|tmp)\//.test(ref)) continue;
        refs.add(ref);
    }
    return [...refs].sort();
}

function collectSourceTexts(root) {
    const files = [
        path.join(root, 'index.html'),
        path.join(root, 'main.js'),
        path.join(root, 'style.css')
    ];
    for (const directory of SOURCE_DIRS) files.push(...walkFiles(path.join(root, directory)));
    return files
        .filter((file) => fs.existsSync(file)
            && SOURCE_EXTENSIONS.has(path.extname(file))
            && !path.basename(file).includes('.test.')
            && !path.basename(file).includes('.spec.'))
        .map((file) => fs.readFileSync(file, 'utf8'));
}

export function classifyPublicAsset(relativePath, referenced) {
    const lower = relativePath.toLowerCase();
    if (referenced.has(relativePath)) return 'runtime-required';
    // Several world-dressing families are selected by data key and resolved
    // to filenames at runtime, so no literal `/asset.png` string exists for
    // the static reference scanner to discover.
    if (/^(?:door|decal|prop|scatter)_[^/]+\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(relativePath)) {
        return 'runtime-required';
    }
    if (/(?:^|\/)(?:concepts?|references?|rejected-candidates|sources-keyed|strips|identity)(?:\/|$)/.test(lower)
        || /(?:contact[_-]?sheet|preview|attempt|rejected|master-keyed|source-row)/.test(lower)) {
        return 'source-reference';
    }
    if (/(?:^|\/)(?:generated|frames)(?:\/|$)/.test(lower)) return 'generated-intermediate';
    if (/^(?:audio|cutscenes|economy|interstitials|lore_portraits|minigames\/rgb|schematics)\//.test(lower)) {
        return 'runtime-required';
    }
    return 'unknown';
}

function detectMediaType(file) {
    const extension = path.extname(file).toLowerCase();
    const data = fs.readFileSync(file);
    if (data.length >= 24 && data.subarray(1, 4).toString('ascii') === 'PNG'
        && data.readUInt32BE(16) > 0 && data.readUInt32BE(20) > 0) return '.png';
    if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return '.jpg';
    if (data.length >= 44 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WAVE') return '.wav';
    if (data.length >= 12 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') return '.webp';
    if (data.length >= 12 && data.toString('ascii', 4, 8) === 'ftyp') return '.mp4';
    if (data.length >= 4 && data.readUInt32BE(0) === 0x1a45dfa3) return '.webm';
    if (data.length >= 3 && (data.toString('ascii', 0, 3) === 'ID3' || (data[0] === 0xff && (data[1] & 0xe0) === 0xe0))) return '.mp3';
    if (['.gif', '.ogg', '.svg'].includes(extension)) return extension;
    return null;
}

function summarizeDuplicates(files, root) {
    const byHash = new Map();
    for (const file of files) {
        const digest = crypto.createHash('sha256').update(portableAssetBuffer(file)).digest('hex');
        const entries = byHash.get(digest) ?? [];
        entries.push(posix(path.relative(root, file)));
        byHash.set(digest, entries);
    }
    return [...byHash.entries()]
        .filter(([, entries]) => entries.length > 1)
        .map(([sha256, entries]) => ({ sha256, files: entries }))
        .sort((a, b) => a.files[0].localeCompare(b.files[0]));
}

function fileSizeTotal(files) {
    return files.reduce((total, file) => total + portableAssetBuffer(file).byteLength, 0);
}

export function buildRetailAssetAudit(root = ROOT) {
    const publicRoot = path.join(root, 'public');
    const publicFiles = walkFiles(publicRoot);
    const references = new Set(collectSourceTexts(root).flatMap(extractAssetReferences));
    const missingReferences = [...references].filter((ref) => !fs.existsSync(path.join(publicRoot, ref)));
    const assets = publicFiles.map((file) => {
        const relativePath = posix(path.relative(publicRoot, file));
        return {
            path: relativePath,
            bytes: portableAssetBuffer(file).byteLength,
            classification: classifyPublicAsset(relativePath, references)
        };
    });
    const inspectedMedia = publicFiles
        .filter((file) => MEDIA_EXTENSIONS.test(file))
        .map((file) => ({ file, detected: detectMediaType(file), extension: path.extname(file).toLowerCase() }));
    const invalidMedia = inspectedMedia
        .filter((entry) => !entry.detected)
        .map((entry) => posix(path.relative(publicRoot, entry.file)));
    const codecMismatches = inspectedMedia
        .filter((entry) => entry.detected && entry.extension !== entry.detected
            && !(entry.extension === '.jpeg' && entry.detected === '.jpg'))
        .map((entry) => ({
            path: posix(path.relative(publicRoot, entry.file)),
            extension: entry.extension,
            detected: entry.detected
        }));
    const publicBytes = fileSizeTotal(publicFiles);
    const unknownAssetCount = assets.filter((asset) => asset.classification === 'unknown').length;
    const duplicateChecksums = summarizeDuplicates(publicFiles, publicRoot);
    const failures = [];
    if (missingReferences.length) failures.push(`missing runtime assets: ${missingReferences.length}`);
    if (invalidMedia.length) failures.push(`invalid media files: ${invalidMedia.length}`);
    if (publicBytes > PUBLIC_BUDGET) failures.push(`public payload exceeds ${PUBLIC_BUDGET} bytes`);
    if (unknownAssetCount > UNKNOWN_ASSET_BUDGET) failures.push(`unknown assets exceed ${UNKNOWN_ASSET_BUDGET}`);
    if (codecMismatches.length > CODEC_MISMATCH_BUDGET) failures.push(`codec mismatches exceed ${CODEC_MISMATCH_BUDGET}`);
    if (duplicateChecksums.length > DUPLICATE_GROUP_BUDGET) failures.push(`duplicate groups exceed ${DUPLICATE_GROUP_BUDGET}`);

    return {
        manifest: {
            version: 1,
            references: [...references].sort(),
            assets
        },
        report: {
            version: 1,
            budgets: {
                publicBytes: PUBLIC_BUDGET,
                appAsarBytes: ASAR_BUDGET,
                unknownAssets: UNKNOWN_ASSET_BUDGET,
                codecMismatches: CODEC_MISMATCH_BUDGET,
                duplicateGroups: DUPLICATE_GROUP_BUDGET
            },
            measured: {
                publicBytes,
                publicFileCount: publicFiles.length
            },
            classifications: Object.fromEntries(
                ['runtime-required', 'source-reference', 'generated-intermediate', 'unknown'].map((classification) => [
                    classification,
                    assets.filter((asset) => asset.classification === classification).length
                ])
            ),
            missingReferences,
            invalidMedia,
            codecMismatches,
            duplicateChecksums,
            failures
        }
    };
}

function main() {
    const check = process.argv.includes('--check');
    const packageCheck = process.argv.includes('--package');
    if (packageCheck) {
        const asarFiles = walkFiles(path.join(ROOT, 'dist_electron')).filter((file) => path.basename(file) === 'app.asar');
        if (!asarFiles.length) {
            console.error('[retail-assets] no app.asar found; package before running --package');
            process.exitCode = 1;
            return;
        }
        const largest = Math.max(...asarFiles.map((file) => fs.statSync(file).size));
        if (largest > ASAR_BUDGET) {
            console.error(`[retail-assets] app.asar ${largest} exceeds ${ASAR_BUDGET} bytes`);
            process.exitCode = 1;
            return;
        }
        console.log(`[retail-assets] package ok (${asarFiles.length} app.asar files, largest ${largest} bytes)`);
        return;
    }
    const { manifest, report } = buildRetailAssetAudit();
    const outputs = [
        [MANIFEST_PATH, manifest],
        [REPORT_PATH, report]
    ];
    if (check) {
        for (const [target, expected] of outputs) {
            const existing = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
            if (!jsonReportMatches(existing, expected)) {
                console.error(`[retail-assets] stale report: ${posix(path.relative(ROOT, target))}`);
                process.exitCode = 1;
            }
        }
    } else {
        for (const [target, value] of outputs) fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
    }
    if (report.failures.length) {
        report.failures.forEach((failure) => console.error(`[retail-assets] ${failure}`));
        process.exitCode = 1;
        return;
    }
    console.log(`[retail-assets] ok (${report.measured.publicFileCount} files, ${report.measured.publicBytes} public bytes, ${report.duplicateChecksums.length} duplicate groups)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
