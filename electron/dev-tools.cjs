// Debugging aids for `npm run electron:dev` (ELECTRON_DEV=1). Packaged and
// Steam builds never load either package.
//
// electron-debug: DevTools opens detached on every window (as before; set
// HB_DEVTOOLS_OPEN=0 to keep it closed) and adds the usual shortcuts --
// F12 / Ctrl+Shift+I toggle DevTools, F5 / Ctrl+R reload.
//
// electron-devtools-installer: installs the Chrome Web Store extensions whose
// IDs are listed in HB_DEVTOOLS_EXTENSIONS (comma-separated). Nothing is
// downloaded when it is unset. Installation runs in the background so a
// missing network never holds up the window.

const EXTENSION_ID_PATTERN = /^[a-p]{32}$/;

function parseExtensionIds(value) {
    return [...new Set(String(value ?? '')
        .split(',')
        .map((id) => id.trim())
        .filter((id) => EXTENSION_ID_PATTERN.test(id)))];
}

async function enableDevTooling({
    dev,
    env = process.env,
    log = console,
    loadDebug = () => import('electron-debug'),
    loadInstaller = () => require('electron-devtools-installer')
} = {}) {
    if (!dev) return { debug: false, extensions: null };
    const { default: debug } = await loadDebug();
    debug({
        isEnabled: true,
        showDevTools: env.HB_DEVTOOLS_OPEN !== '0',
        devToolsMode: 'detach'
    });

    const ids = parseExtensionIds(env.HB_DEVTOOLS_EXTENSIONS);
    if (!ids.length) return { debug: true, extensions: null };
    const { installExtension } = loadInstaller();
    const extensions = installExtension(ids, { loadExtensionOptions: { allowFileAccess: true } })
        .then((installed) => {
            log.info?.(`[dev-tools] installed ${installed.map((entry) => entry.name).join(', ')}`);
            return installed;
        })
        .catch((error) => {
            log.warn?.(`[dev-tools] extension install failed: ${error?.message ?? error}`);
            return [];
        });
    return { debug: true, extensions };
}

module.exports = { enableDevTooling, parseExtensionIds };
