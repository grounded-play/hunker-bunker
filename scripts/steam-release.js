/* global process, console */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const upload = args.has('--upload');
const skipBuild = args.has('--skip-build');
const skipTests = args.has('--skip-tests');
const allowDirty = args.has('--allow-dirty');

function readGit(gitArgs, fallback = 'unknown') {
    try {
        return execFileSync('git', gitArgs, {
            cwd: repoRoot,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore']
        }).trim() || fallback;
    } catch {
        return fallback;
    }
}

function run(command, commandArgs, env = process.env) {
    console.log(`[steam-release] ${command} ${commandArgs.join(' ')}`);
    const result = spawnSync(command, commandArgs, {
        cwd: repoRoot,
        env,
        stdio: 'inherit',
        shell: false
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
        throw new Error(`${command} exited with status ${result.status}`);
    }
}

function requirePath(relativePath, reason) {
    const absolutePath = path.join(repoRoot, relativePath);
    if (!fs.existsSync(absolutePath)) {
        throw new Error(`${reason}: ${relativePath}`);
    }
}

const commit = readGit(['rev-parse', '--short=12', 'HEAD']);
const branch = readGit(['branch', '--show-current']);
const dirty = Boolean(readGit(['status', '--porcelain'], ''));
const releaseEnv = {
    ...process.env,
    HB_BUILD_COMMIT: commit,
    HB_BUILD_BRANCH: branch,
    HB_BUILD_DIRTY: dirty ? '1' : '0',
    HB_BUILD_TIMESTAMP: new Date().toISOString()
};

console.log(
    `[steam-release] revision ${commit}${dirty ? '-dirty' : ''} on ${branch}`
);

if (upload && dirty && !allowDirty) {
    throw new Error(
        'Refusing to upload a dirty worktree. Commit the release or pass --allow-dirty explicitly.'
    );
}

if (!skipBuild) {
    if (!skipTests) run('npm', ['test'], releaseEnv);
    run('npm', ['run', 'electron:build'], releaseEnv);
}

run('npm', ['run', 'steam:audit-depot'], releaseEnv);

if (upload) {
    requirePath(
        'dist_electron/linux-unpacked',
        'Linux/Steam Deck depot output is missing'
    );
    requirePath(
        'dist_electron/win-unpacked',
        'Windows depot output is missing; build or download the Windows CI artifact before uploading'
    );

    const steamCmd = process.env.STEAMCMD_PATH || 'steamcmd';
    const account = process.env.STEAM_BUILD_ACCOUNT || 'TuesdayCinemaClub';
    const appBuild = path.join(repoRoot, 'steam', 'app_build.vdf');
    run(steamCmd, [
        '+login',
        account,
        '+run_app_build',
        appBuild,
        '+quit'
    ], releaseEnv);
}

console.log(
    upload
        ? `[steam-release] uploaded ${commit} through steam/app_build.vdf`
        : `[steam-release] prepared and audited ${commit}; no upload requested`
);
