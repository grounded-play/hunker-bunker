export const DEMO_BUILD = false;

export function isDemoBuild() {
    if (typeof window !== 'undefined' && typeof window.__DEMO_BUILD__ === 'boolean') {
        return window.__DEMO_BUILD__;
    }
    return DEMO_BUILD;
}
