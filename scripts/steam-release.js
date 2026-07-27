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
const packageJson = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')
);

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

function run(command, commandArgs, env = process.env, label = 'release subprocess') {
    // Do not log the executable or arguments here. The Steam upload command
    // can originate in environment configuration and its arguments may
    // contain credentials or other sensitive values.
    console.log(`[steam-release] starting ${label}`);
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
const buildId = process.env.HB_STEAM_BUILD_ID || `v${packageJson.version}-${commit}`;
const releaseEnv = {
    ...process.env,
    HB_BUILD_COMMIT: commit,
    HB_BUILD_BRANCH: branch,
    HB_BUILD_DIRTY: dirty ? '1' : '0',
    HB_BUILD_VERSION: packageJson.version,
    HB_STEAM_BUILD_ID: buildId,
    // A Steam-uploadable build must never silently bake localhost into the
    // preload bridge. Local steam:prepare remains usable for offline QA.
    HB_STEAM_CONFIG_REQUIRE_REMOTE: upload ? '1' : (process.env.HB_STEAM_CONFIG_REQUIRE_REMOTE ?? '0'),
    HB_BUILD_TIMESTAMP: new Date().toISOString()
};

console.log(
    `[steam-release] build ${buildId} from ${commit}${dirty ? '-dirty' : ''} on ${branch}`
);

if (upload && dirty && !allowDirty) {
    throw new Error(
        'Refusing to upload a dirty worktree. Commit the release or pass --allow-dirty explicitly.'
    );
}

if (!skipBuild) {
    if (!skipTests) run('npm', ['test'], releaseEnv, 'test suite');
    run('npm', ['run', 'package-soundtrack'], releaseEnv, 'Soundtrack packaging');
    run('npm', ['run', 'electron:build'], releaseEnv, 'Electron build');
}

const builtInfoPath = path.join(repoRoot, 'dist', 'build-info.json');
requirePath('dist/build-info.json', 'Build metadata is missing');
const builtInfo = JSON.parse(fs.readFileSync(builtInfoPath, 'utf8'));
for (const [key, expected] of Object.entries({
    version: packageJson.version,
    commit,
    branch,
    dirty,
    steamBuild: buildId
})) {
    if (builtInfo[key] !== expected) {
        throw new Error(
            `Build metadata mismatch for ${key}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(builtInfo[key])}`
        );
    }
}
console.log(`[steam-release] verified dist/build-info.json (${buildId})`);

run('npm', ['run', 'steam:audit-depot'], releaseEnv, 'Steam depot audit');

if (upload) {
    if (Boolean(readGit(['status', '--porcelain'], ''))) {
        throw new Error('Refusing to upload because the worktree changed during the release build.');
    }
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
    const appBuildTemplate = path.join(repoRoot, 'steam', 'app_build.vdf');
    const generatedAppBuild = path.join(repoRoot, 'steam', 'app_build.generated.vdf');
    const safeDescription = `Hunker Bunker ${buildId} ${branch}`.replace(/["\r\n]/g, '-');
    const generatedBody = fs.readFileSync(appBuildTemplate, 'utf8').replace(
        /"Desc"\s+"[^"]*"/,
        `"Desc" "${safeDescription}"`
    );
    fs.writeFileSync(generatedAppBuild, generatedBody, 'utf8');
    console.log(`[steam-release] Steam build description: ${safeDescription}`);
    try {
        run(steamCmd, [
            '+login',
            account,
            '+run_app_build',
            generatedAppBuild,
            '+quit'
        ], releaseEnv, 'Steam upload');
    } finally {
        fs.rmSync(generatedAppBuild, { force: true });
    }

    const soundtrackTemplate = path.join(repoRoot, 'steam', 'soundtrack_app_build.vdf');
    if (fs.existsSync(soundtrackTemplate) && process.env.HB_STEAM_SKIP_SOUNDTRACK !== '1') {
        const generatedSoundtrackBuild = path.join(repoRoot, 'steam', 'soundtrack_app_build.generated.vdf');
        const soundtrackDesc = `Hunker Bunker Soundtrack ${buildId} ${branch}`.replace(/["\r\n]/g, '-');
        const generatedSoundtrackBody = fs.readFileSync(soundtrackTemplate, 'utf8').replace(
            /"Desc"\s+"[^"]*"/,
            `"Desc" "${soundtrackDesc}"`
        );
        fs.writeFileSync(generatedSoundtrackBuild, generatedSoundtrackBody, 'utf8');
        console.log(`[steam-release] Soundtrack build description: ${soundtrackDesc}`);
        try {
            run(steamCmd, [
                '+login',
                account,
                '+run_app_build',
                generatedSoundtrackBuild,
                '+quit'
            ], releaseEnv, 'Steam soundtrack upload');
            console.log(`[steam-release] uploaded soundtrack ${commit} through steam/soundtrack_app_build.vdf`);
        } catch (err) {
            console.error(`\n[steam-release] WARNING: Soundtrack upload failed for AppID 4957680.`);
            console.error(`To fix this in Steamworks:`);
            console.error(`  1. Ensure account '${account}' has 'Edit App Metadata' & 'SteamPipe Upload' permissions granted for AppID 4957680.`);
            console.error(`  2. In Steamworks (App 4957680 > SteamPipe > Depots), verify Depot 4957681 is added and click 'Save'.`);
            console.error(`  3. Click 'Publishing' -> 'Publish Changes' on App 4957680 in Steamworks at least once.\n`);
            if (process.env.HB_STEAM_REQUIRE_SOUNDTRACK === '1') {
                throw err;
            }
        } finally {
            fs.rmSync(generatedSoundtrackBuild, { force: true });
        }
    }
}

console.log(
    upload
        ? `[steam-release] uploaded ${commit} through steam/app_build.vdf`
        : `[steam-release] prepared and audited ${commit}; no upload requested`
);
