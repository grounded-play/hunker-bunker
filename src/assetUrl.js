/**
 * Resolve a public asset for both the web build and Electron's file:// build.
 *
 * Vite's dev server accepts root-absolute paths such as `/door.png`, but in a
 * packaged Electron renderer that URL means `file:///door.png`. Resolving
 * against document.baseURI keeps the same asset beside dist/index.html.
 */
export function assetUrl(path, base = globalThis.document?.baseURI) {
    if (typeof path !== 'string' || !path || !path.startsWith('/') || path.startsWith('//')) {
        return path;
    }
    if (!base) return path;
    return new URL(path.slice(1), base).href;
}
