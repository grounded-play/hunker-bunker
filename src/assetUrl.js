const UNPACKED_EXTENSIONS = new Set(['.mp4', '.webm', '.glb', '.mp3', '.wav', '.ogg']);

/**
 * Resolve a public asset for both the web build and Electron's file:// build.
 *
 * Vite's dev server accepts root-absolute paths such as `/door.png`, but in a
 * packaged Electron renderer that URL means `file:///door.png`. Resolving
 * against document.baseURI keeps the same asset beside dist/index.html.
 * Heavy media assets unpacked via asarUnpack are routed to app.asar.unpacked.
 */
export function assetUrl(path, base = globalThis.document?.baseURI) {
    if (typeof path !== 'string' || !path || !path.startsWith('/') || path.startsWith('//')) {
        return path;
    }
    if (!base) return path;
    const resolved = new URL(path.slice(1), base).href;
    if (base.includes('app.asar')) {
        const dotIndex = path.lastIndexOf('.');
        const ext = dotIndex !== -1 ? path.slice(dotIndex).toLowerCase() : '';
        if (UNPACKED_EXTENSIONS.has(ext)) {
            return resolved.replace('/app.asar/', '/app.asar.unpacked/');
        }
    }
    return resolved;
}

