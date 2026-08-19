// Persists the CPU-expensive result of chroma-keying a sprite (flood-fill
// pixel processing in textureKeying.js, run from threeGame.js's
// loadKeyedSpriteTexture) across browser sessions. Without this, the same
// ~2.6s of pixel work reruns on every single boot forever, since the only
// prior cache (keyedSpriteTextureCache in threeGame.js) is an in-memory Map
// that starts empty on every page load. Confirmed live via a CPU profile:
// applyBlackChromaKey/applyGreenChromaKey and their surrounding
// getImageData/drawImage/putImageData calls accounted for ~2.6s of every
// boot, matching a real session log's "28 long tasks, 2650ms total" almost
// exactly (docs/log1-perf-and-telemetry-followups-2026-08-18.md #2).
//
// Bump CACHE_VERSION to invalidate every stored entry if the keying
// algorithm (textureKeying.js) or this cache's storage format changes.
const DB_NAME = 'hb-keyed-textures';
const STORE_NAME = 'images';
const CACHE_VERSION = 1;

let dbPromise = null;

function openDb() {
    if (dbPromise) return dbPromise;
    if (typeof indexedDB === 'undefined') {
        dbPromise = Promise.resolve(null);
        return dbPromise;
    }
    dbPromise = new Promise((resolve) => {
        try {
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = () => {
                request.result.createObjectStore(STORE_NAME);
            };
            request.onsuccess = () => resolve(request.result);
            // A blocked/failed open shouldn't break texture loading -- just
            // means this session runs without the persistent cache.
            request.onerror = () => resolve(null);
            request.onblocked = () => resolve(null);
        } catch {
            resolve(null);
        }
    });
    return dbPromise;
}

function versionedKey(cacheKey) {
    return `v${CACHE_VERSION}::${cacheKey}`;
}

// Returns a Blob for a previously-cached keyed image, or null on any miss
// or failure (caller falls back to the normal fetch+key path either way).
export async function getCachedKeyedImage(cacheKey) {
    const db = await openDb();
    if (!db) return null;
    return new Promise((resolve) => {
        try {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const request = tx.objectStore(STORE_NAME).get(versionedKey(cacheKey));
            request.onsuccess = () => resolve(request.result ?? null);
            request.onerror = () => resolve(null);
        } catch {
            resolve(null);
        }
    });
}

// Fire-and-forget: stores the already-keyed canvas as a PNG blob. Failures
// (quota exceeded, DB unavailable) are swallowed -- this is a cache, not a
// requirement, and the in-memory cache + this session's rendering already
// succeeded regardless of whether the write lands.
export function putCachedKeyedImage(cacheKey, canvas) {
    canvas.toBlob((blob) => {
        if (!blob) return;
        openDb().then((db) => {
            if (!db) return;
            try {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).put(blob, versionedKey(cacheKey));
            } catch {
                // ignore
            }
        });
    }, 'image/png');
}
