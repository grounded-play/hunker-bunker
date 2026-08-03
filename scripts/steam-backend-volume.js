#!/usr/bin/env node
/* global process, console */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DEFAULT_VOLUME = 'hunker-bunker-data';
const ALPINE_IMAGE = 'alpine:3.20';
const NODE_IMAGE = 'node:22-slim';
const SAFE_NAME = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/;

export function assertSafeDockerVolumeName(value, label = 'volume') {
    const name = String(value ?? '');
    if (!SAFE_NAME.test(name)) {
        throw new Error(`${label} must contain only letters, numbers, dot, underscore, or dash (maximum 128 characters).`);
    }
    return name;
}

export function resolveArchivePath(value, cwd = process.cwd()) {
    if (!value) throw new Error('--archive is required.');
    const archive = path.resolve(cwd, value);
    if (!archive.endsWith('.tar.gz')) throw new Error('--archive must end in .tar.gz.');
    return archive;
}

export function buildBackupDockerArgs(volume, archive) {
    const outputDirectory = path.dirname(archive);
    const archiveName = path.basename(archive);
    return [
        'run', '--rm',
        '--mount', `type=volume,src=${assertSafeDockerVolumeName(volume)},dst=/data,readonly`,
        '--mount', `type=bind,src=${outputDirectory},dst=/backup`,
        ALPINE_IMAGE,
        'tar', 'czf', `/backup/${archiveName}`, '-C', '/data', '.'
    ];
}

export function buildVerifyDockerArgs(archive) {
    return [
        'run', '--rm',
        '--mount', `type=bind,src=${path.dirname(archive)},dst=/backup,readonly`,
        ALPINE_IMAGE,
        'tar', 'tzf', `/backup/${path.basename(archive)}`
    ];
}

export function buildRestoreDockerArgs(targetVolume, archive) {
    return [
        'run', '--rm',
        '--mount', `type=volume,src=${assertSafeDockerVolumeName(targetVolume, 'target volume')},dst=/restore`,
        '--mount', `type=bind,src=${path.dirname(archive)},dst=/backup,readonly`,
        ALPINE_IMAGE,
        'tar', 'xzf', `/backup/${path.basename(archive)}`, '-C', '/restore'
    ];
}

export function buildSqliteIntegrityDockerArgs(targetVolume, sqliteFile = 'db_storage.sqlite') {
    if (!SAFE_NAME.test(sqliteFile) || !sqliteFile.endsWith('.sqlite')) {
        throw new Error('--sqlite-file must be a simple .sqlite filename.');
    }
    const script = [
        "const { DatabaseSync } = require('node:sqlite');",
        `const db = new DatabaseSync('/restore/${sqliteFile}', { readOnly: true });`,
        "const rows = db.prepare('PRAGMA integrity_check').all();",
        "if (rows.length !== 1 || rows[0].integrity_check !== 'ok') throw new Error(JSON.stringify(rows));",
        "console.log('SQLite integrity_check: ok');"
    ].join('');
    return [
        'run', '--rm',
        '--mount', `type=volume,src=${assertSafeDockerVolumeName(targetVolume, 'target volume')},dst=/restore,readonly`,
        NODE_IMAGE,
        'node', '--experimental-sqlite', '-e', script
    ];
}

function runDocker(args, { capture = false, allowFailure = false } = {}) {
    const result = spawnSync('docker', args, {
        encoding: 'utf8',
        stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
        shell: false
    });
    if (result.error) throw result.error;
    if (result.status !== 0 && !allowFailure) {
        const detail = capture ? String(result.stderr ?? '').trim() : '';
        throw new Error(`docker ${args[0]} failed with status ${result.status}${detail ? `: ${detail}` : ''}`);
    }
    return result;
}

function assertVolumeIdle(volume) {
    const result = runDocker(['ps', '--quiet', '--filter', `volume=${volume}`], { capture: true });
    if (String(result.stdout ?? '').trim()) {
        throw new Error(`volume ${volume} is mounted by a running container; stop the backend before creating a filesystem backup.`);
    }
}

function sha256File(filename) {
    const hash = crypto.createHash('sha256');
    hash.update(fs.readFileSync(filename));
    return hash.digest('hex');
}

function checksumPath(archive) {
    return `${archive}.sha256`;
}

function writeChecksum(archive) {
    const checksum = sha256File(archive);
    fs.writeFileSync(checksumPath(archive), `${checksum}  ${path.basename(archive)}\n`, { mode: 0o600 });
    return checksum;
}

function verifyChecksum(archive) {
    const sidecar = checksumPath(archive);
    if (!fs.existsSync(sidecar)) throw new Error(`checksum sidecar is missing: ${sidecar}`);
    const expected = fs.readFileSync(sidecar, 'utf8').trim().split(/\s+/)[0];
    const actual = sha256File(archive);
    if (!/^[a-f0-9]{64}$/i.test(expected)
        || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) {
        throw new Error('archive SHA-256 checksum does not match its sidecar.');
    }
}

function assertArchiveExists(archive) {
    if (!fs.statSync(archive, { throwIfNoEntry: false })?.isFile()) {
        throw new Error(`archive does not exist: ${archive}`);
    }
}

export function parseVolumeCliArgs(argv) {
    const [command, ...tokens] = argv;
    const options = {};
    for (let index = 0; index < tokens.length; index += 1) {
        const token = tokens[index];
        if (!token.startsWith('--')) throw new Error(`unexpected argument: ${token}`);
        const key = token.slice(2);
        const value = tokens[index + 1];
        if (!value || value.startsWith('--')) throw new Error(`${token} requires a value.`);
        options[key] = value;
        index += 1;
    }
    return { command, options };
}

function backup({ volume = DEFAULT_VOLUME, archive }) {
    const sourceVolume = assertSafeDockerVolumeName(volume);
    const target = resolveArchivePath(archive);
    fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
    if (fs.existsSync(target) || fs.existsSync(checksumPath(target))) {
        throw new Error(`refusing to overwrite existing backup: ${target}`);
    }
    assertVolumeIdle(sourceVolume);
    runDocker(buildBackupDockerArgs(sourceVolume, target));
    assertArchiveExists(target);
    runDocker(buildVerifyDockerArgs(target), { capture: true });
    const checksum = writeChecksum(target);
    console.log(`[backend-volume] backup verified: ${target}`);
    console.log(`[backend-volume] sha256: ${checksum}`);
}

function verify({ archive }) {
    const target = resolveArchivePath(archive);
    assertArchiveExists(target);
    verifyChecksum(target);
    runDocker(buildVerifyDockerArgs(target), { capture: true });
    console.log(`[backend-volume] checksum and tar integrity verified: ${target}`);
}

function restoreDrill({ archive, 'target-volume': targetVolume, 'sqlite-file': sqliteFile = 'db_storage.sqlite' }) {
    const target = resolveArchivePath(archive);
    const restoreVolume = assertSafeDockerVolumeName(targetVolume, 'target volume');
    if (restoreVolume === DEFAULT_VOLUME) throw new Error('restore-drill must not target the live hunker-bunker-data volume.');
    assertArchiveExists(target);
    verifyChecksum(target);
    runDocker(buildVerifyDockerArgs(target), { capture: true });
    const existing = runDocker(['volume', 'inspect', restoreVolume], { capture: true, allowFailure: true });
    if (existing.status === 0) throw new Error(`target volume already exists; refusing to overwrite it: ${restoreVolume}`);
    runDocker(['volume', 'create', restoreVolume], { capture: true });
    try {
        runDocker(buildRestoreDockerArgs(restoreVolume, target));
        runDocker(buildSqliteIntegrityDockerArgs(restoreVolume, sqliteFile));
    } catch (error) {
        console.error(`[backend-volume] restore failed; inspect or remove the newly created volume manually: ${restoreVolume}`);
        throw error;
    }
    console.log(`[backend-volume] restore drill completed into new volume: ${restoreVolume}`);
    console.log(`[backend-volume] the volume was retained for inspection and was not attached to the live service.`);
}

function usage() {
    return [
        'Usage:',
        '  node scripts/steam-backend-volume.js backup --archive <file.tar.gz> [--volume hunker-bunker-data]',
        '  node scripts/steam-backend-volume.js verify --archive <file.tar.gz>',
        '  node scripts/steam-backend-volume.js restore-drill --archive <file.tar.gz> --target-volume <new-volume> [--sqlite-file db_storage.sqlite]'
    ].join('\n');
}

async function main() {
    const { command, options } = parseVolumeCliArgs(process.argv.slice(2));
    if (command === 'backup') backup(options);
    else if (command === 'verify') verify(options);
    else if (command === 'restore-drill') restoreDrill(options);
    else throw new Error(usage());
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch((error) => {
        console.error(`[backend-volume] ${error?.message ?? error}`);
        process.exitCode = 1;
    });
}
