const fs = require('node:fs');
const path = require('node:path');

/**
 * Electron's Linux sandbox is initialized before the application main script.
 * A raw `dir` build cannot make chrome-sandbox root-owned/setuid, so adding the
 * switch in main.cjs is too late and Chromium aborts on SteamOS. Keep Steam's
 * configured launch path stable and put the real Electron binary behind a
 * tiny launcher that supplies --no-sandbox at process startup.
 */
module.exports = async function afterPack(context) {
    if (context.electronPlatformName !== 'linux') return;

    const appOutDir = context.appOutDir;
    const launcherPath = path.join(appOutDir, 'hunker-bunker');
    const binaryPath = path.join(appOutDir, 'hunker-bunker-bin');

    try {
        fs.renameSync(launcherPath, binaryPath);
    } catch (err) {
        if (err && err.code === 'ENOENT') {
            throw new Error(`Linux Electron executable is missing: ${launcherPath}`);
        }
        throw err;
    }
    fs.writeFileSync(launcherPath, `#!/bin/sh
set -eu
app_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec "$app_dir/hunker-bunker-bin" --no-sandbox "$@"
`, { encoding: 'utf8', mode: 0o755 });
    fs.chmodSync(binaryPath, 0o755);
}
