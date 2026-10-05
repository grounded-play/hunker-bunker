// Player-facing build labels (title screen, loading panel) from the
// compile-time __HB_BUILD_INFO__ that vite.config.js stamps from package.json.

export function versionLabel(info) {
    const version = String(info?.version ?? '').trim();
    if (!version) return '';
    if (/^v?\d/i.test(version)) return version.startsWith('v') ? version : `v${version}`;
    return version.toUpperCase();
}

function branchLabel(branch) {
    const name = String(branch ?? '').replace(/^dev\//i, '').toUpperCase();
    return name.startsWith('SPRINT') ? name.replace('-', ' ') : name;
}

export function loaderBuildLabel(info) {
    const commit = `${info?.commit ?? 'unknown'}${info?.dirty ? '-dirty' : ''}`;
    return [
        versionLabel(info),
        branchLabel(info?.branch),
        commit,
        info?.steamBuild ? `PIPELINE ${info.steamBuild}` : ''
    ].filter(Boolean).join(' // ');
}
