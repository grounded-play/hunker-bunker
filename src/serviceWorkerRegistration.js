// Web build only: register public/sw.js so the game is an installable PWA
// (Lighthouse "registers a service worker that controls page and start_url").
// The Steam build runs from file:// under Electron, and the Vite dev server
// must stay worker-free so HMR and the e2e suite always see live files.

export function shouldRegisterServiceWorker({ production, protocol, hasServiceWorker, electron }) {
    return Boolean(production && hasServiceWorker && !electron && (protocol === 'https:' || protocol === 'http:'));
}

export async function registerServiceWorker(container, environment) {
    if (!container || !shouldRegisterServiceWorker(environment)) return null;
    try {
        return await container.register('/sw.js', { scope: '/' });
    } catch (err) {
        console.warn('[pwa] service worker registration failed:', err?.message ?? err);
        return null;
    }
}

export function registerWebServiceWorker() {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    const environment = {
        production: Boolean(import.meta.env?.PROD),
        protocol: window.location?.protocol,
        hasServiceWorker: 'serviceWorker' in navigator,
        electron: Boolean(window.electronAPI)
    };
    if (!shouldRegisterServiceWorker(environment)) return;
    // After load, so registration never competes with boot for bandwidth. The
    // game's modules start after the player's language loads (src/boot.js),
    // which can be after `load` has already fired.
    const register = () => { void registerServiceWorker(navigator.serviceWorker, environment); };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
}
