// Hunker Bunker web build service worker (src/serviceWorkerRegistration.js).
//
// Deliberately small: it makes the site an installable PWA and keeps the page
// shell reachable offline, without ever serving a stale build. Page loads go
// to the network first (falling back to the last good copy when offline);
// every other request (game assets, the relay, the backend) passes straight
// through untouched, so the HTTP cache and Netlify headers stay in charge.
const SHELL_CACHE = 'hb-shell-v1';

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names.filter((name) => name.startsWith('hb-shell-') && name !== SHELL_CACHE).map((name) => caches.delete(name)));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET' || request.mode !== 'navigate') return;
    event.respondWith((async () => {
        try {
            const response = await fetch(request);
            if (response.ok) {
                const cache = await caches.open(SHELL_CACHE);
                await cache.put('/', response.clone());
            }
            return response;
        } catch (err) {
            const cached = await caches.match('/');
            if (cached) return cached;
            throw err;
        }
    })());
});
