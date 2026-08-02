/* global process, console */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const DEFAULT_DEPOT_ROOTS = [
    'dist_electron'
];

const FORBIDDEN_BASENAMES = new Map([
    ['steam_appid.txt', 'Dev appid file must not ship in a retail Steam depot.'],
    ['db_storage.json', 'Local backend JSON database must stay server-side.'],
    ['db_storage.json.tmp', 'Temporary backend JSON database file must not ship.']
]);

const FORBIDDEN_EXTENSIONS = new Map([
    ['.pem', 'Private key/certificate material must not ship in the depot.'],
    ['.p12', 'Private key/certificate material must not ship in the depot.'],
    ['.pfx', 'Private key/certificate material must not ship in the depot.'],
    ['.key', 'Private key material must not ship in the depot.']
]);

const STORE_ONLY_BASENAMES = [
    /^steam_(?:header|small|main|vertical)_capsule(?:_v2)?_en\.png$/i,
    /^(?:header|small|main|vertical)_capsule_\d+x\d+\.png$/i,
    /^game_key_art_v2\.png$/i,
    /^soundtrack_key_art_v2\.png$/i,
    /^screenshot_soundtrack_1920x1080\.png$/i,
    /^store-page-description\.md$/i
];

function isEnvFile(basename) {
    return basename === '.env' || basename.startsWith('.env.');
}

async function walkFiles(root) {
    const files = [];
    const pending = [root];

    while (pending.length > 0) {
        const dir = pending.pop();
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const entryPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                pending.push(entryPath);
            } else if (entry.isFile()) {
                files.push(entryPath);
            }
        }
    }

    return files;
}

function auditFile(filePath, root) {
    const basename = path.basename(filePath).toLowerCase();
    const extension = path.extname(basename);
    const relativePath = path.relative(root, filePath).split(path.sep).join('/');

    if (STORE_ONLY_BASENAMES.some((pattern) => pattern.test(basename))) {
        return {
            file: relativePath,
            reason: 'Steam store-only artwork must not ship in a customer depot.'
        };
    }

    if (FORBIDDEN_BASENAMES.has(basename)) {
        return {
            file: relativePath,
            reason: FORBIDDEN_BASENAMES.get(basename)
        };
    }

    if (isEnvFile(basename)) {
        return {
            file: relativePath,
            reason: 'Environment files may contain backend URLs, keys, or secrets.'
        };
    }

    if (FORBIDDEN_EXTENSIONS.has(extension)) {
        return {
            file: relativePath,
            reason: FORBIDDEN_EXTENSIONS.get(extension)
        };
    }

    return null;
}

export function auditLinuxLauncher(root) {
    const failures = [];
    const launcher = path.join(root, 'hunker-bunker');
    const binary = path.join(root, 'hunker-bunker-bin');
    if (!fs.existsSync(launcher)) {
        failures.push({ file: 'hunker-bunker', reason: 'SteamOS launcher is missing.' });
    } else {
        const body = fs.readFileSync(launcher, 'utf8');
        if (!body.includes('hunker-bunker-bin') || !body.includes('--no-sandbox')) {
            failures.push({
                file: 'hunker-bunker',
                reason: 'SteamOS launcher must start the Electron binary with --no-sandbox.'
            });
        }
        if ((fs.statSync(launcher).mode & 0o111) === 0) {
            failures.push({ file: 'hunker-bunker', reason: 'SteamOS launcher is not executable.' });
        }
    }
    if (!fs.existsSync(binary)) {
        failures.push({ file: 'hunker-bunker-bin', reason: 'Linux Electron binary is missing.' });
    }
    return failures;
}

function readTextIfExists(filePath) {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf8');
}

function stripVdfComments(text) {
    return String(text ?? '')
        .split('\n')
        .map((line) => line.replace(/\/\/.*$/, ''))
        .join('\n');
}

export function auditSteamVdfs({ steamDir = path.join(repoRoot, 'steam') } = {}) {
    const failures = [];
    const appBuild = readTextIfExists(path.join(steamDir, 'app_build.vdf'));
    const contentDepot = readTextIfExists(path.join(steamDir, 'depot_build_content.vdf'));
    const winDepot = readTextIfExists(path.join(steamDir, 'depot_build_win.vdf'));
    const inputManifest = readTextIfExists(path.join(steamDir, 'steam_input_manifest.vdf'));

    if (!appBuild) {
        failures.push({ file: 'steam/app_build.vdf', reason: 'Missing Steam app build VDF.' });
    } else {
        const appBuildBody = stripVdfComments(appBuild);
        if (/__APPID__|__DEPOT_/.test(appBuildBody)) {
            failures.push({ file: 'steam/app_build.vdf', reason: 'Steam VDF still contains upload placeholders.' });
        }
        if (!/"AppID"\s+"4957040"/.test(appBuildBody)) {
            failures.push({ file: 'steam/app_build.vdf', reason: 'Steam appid 4957040 is not pinned.' });
        }
        if (!/"4957041"\s+"depot_build_content\.vdf"/.test(appBuildBody)) {
            failures.push({ file: 'steam/app_build.vdf', reason: 'Content depot 4957041 is not wired.' });
        }
    }

    const platformDepots = [
        ['steam/depot_build_content.vdf', contentDepot, '4957041'],
        ['steam/depot_build_win.vdf', winDepot, '4957042']
    ];

    for (const [label, text, depotId] of platformDepots) {
        if (!text) {
            failures.push({ file: label, reason: 'Missing Steam depot VDF.' });
            continue;
        }
        const depotBody = stripVdfComments(text);
        if (/__DEPOT_/.test(depotBody)) {
            failures.push({ file: label, reason: 'Depot VDF still contains upload placeholders.' });
        }
        if (!new RegExp(`"DepotID"\\s+"${depotId}"`).test(depotBody)) {
            failures.push({ file: label, reason: `Depot ${depotId} is not pinned.` });
        }
        if (!/"FileExclusion"\s+"steam_appid\.txt"/.test(depotBody)) {
            failures.push({ file: label, reason: 'Depot VDF must exclude steam_appid.txt.' });
        }
        // The Steamworks dashboard accepts one Steam Input manifest path for every
        // platform, so each depot must land its build at the install root. Mapping a
        // platform into a subdirectory silently breaks Steam Input on that platform
        // only — the manifest is present in the depot but not where Steam looks.
        if (!/"DepotPath"\s+"\."/.test(depotBody)) {
            failures.push({
                file: label,
                reason: 'Depot must map its build to DepotPath "." so the Steam Input manifest path is identical on every platform.'
            });
        }
    }

    if (!inputManifest) {
        failures.push({ file: 'steam/steam_input_manifest.vdf', reason: 'Missing bundled Steam Input action manifest.' });
    } else {
        const manifestBody = stripVdfComments(inputManifest);
        const configPaths = [...manifestBody.matchAll(/"path"\s+"([^"]+\.vdf)"/g)]
            .map((match) => match[1]);
        const requiredTypes = ['controller_neptune', 'controller_xboxone', 'controller_ps5'];

        if (configPaths.length === 0) {
            failures.push({
                file: 'steam/steam_input_manifest.vdf',
                reason: 'Steam Input manifest has no bundled default controller configurations.'
            });
        }
        for (const controllerType of requiredTypes) {
            if (!new RegExp(`"${controllerType}"\\s*\\{`).test(manifestBody)) {
                failures.push({
                    file: 'steam/steam_input_manifest.vdf',
                    reason: `Steam Input manifest must provide a ${controllerType} configuration.`
                });
            }
        }

        for (const relativeConfigPath of configPaths) {
            const configPath = path.resolve(steamDir, relativeConfigPath);
            const configBody = readTextIfExists(configPath);
            const relativeLabel = `steam/${relativeConfigPath.split(path.sep).join('/')}`;
            if (!configBody) {
                failures.push({ file: relativeLabel, reason: 'Referenced Steam Input controller configuration is missing.' });
                continue;
            }
            for (const actionSet of ['menu', 'gameplay', 'archive']) {
                if (!new RegExp(`"name"\\s+"${actionSet}"`).test(configBody)) {
                    failures.push({
                        file: relativeLabel,
                        reason: `Controller configuration is missing the ${actionSet} action-set preset.`
                    });
                }
                if (!new RegExp(`game_action\\s+${actionSet}\\s+`).test(configBody)
                    && !new RegExp(`"${actionSet}"\\s+"[^"]+"`).test(configBody)) {
                    failures.push({
                        file: relativeLabel,
                        reason: `Controller configuration has no native bindings for the ${actionSet} action set.`
                    });
                }
            }
        }
    }

    return failures;
}

export async function auditSteamDepot({
    roots = DEFAULT_DEPOT_ROOTS,
    cwd = repoRoot
} = {}) {
    const failures = auditSteamVdfs();
    const warnings = [];
    let scannedFiles = 0;
    let scannedRoots = 0;

    for (const root of roots) {
        const absoluteRoot = path.resolve(cwd, root);
        if (!fs.existsSync(absoluteRoot)) {
            warnings.push({ root, reason: 'Depot output directory does not exist; skipped.' });
            continue;
        }

        scannedRoots += 1;
        const files = await walkFiles(absoluteRoot);
        scannedFiles += files.length;
        if (path.basename(absoluteRoot) === 'linux-unpacked') {
            failures.push(...auditLinuxLauncher(absoluteRoot).map((failure) => ({ root, ...failure })));
        }
        for (const file of files) {
            const failure = auditFile(file, absoluteRoot);
            if (failure) {
                failures.push({
                    root,
                    ...failure
                });
            }
        }
    }

    return {
        ok: failures.length === 0,
        scannedRoots,
        scannedFiles,
        failures,
        warnings
    };
}

async function main() {
    const roots = process.argv.slice(2);
    const result = await auditSteamDepot({ roots: roots.length > 0 ? roots : DEFAULT_DEPOT_ROOTS });

    for (const warning of result.warnings) {
        console.warn(`[steam-audit] warning: ${warning.root}: ${warning.reason}`);
    }

    if (!result.ok) {
        console.error('[steam-audit] depot audit failed:');
        for (const failure of result.failures) {
            const prefix = failure.root ? `${failure.root}/${failure.file}` : failure.file;
            console.error(`- ${prefix}: ${failure.reason}`);
        }
        process.exitCode = 1;
        return;
    }

    console.log(`[steam-audit] ok (${result.scannedFiles} files across ${result.scannedRoots} depot root(s))`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch((err) => {
        console.error(`[steam-audit] ${err?.message ?? err}`);
        process.exitCode = 1;
    });
}
