const CACHE_NAME = 'warpshare-v3';
const ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon.png',
    '/icon-512.png'
];

// Install Event
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// Activate Event
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event
let sharedFiles = null;

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Handle PWA Share Target (POST /share)
    if (event.request.method === 'POST' && url.pathname === '/share') {
        event.respondWith((async () => {
            try {
                const formData = await event.request.formData();
                sharedFiles = formData.getAll('files');
                // Redirect to homepage with a flag to trigger retrieval
                return Response.redirect('/?shared=1', 303);
            } catch (err) {
                return Response.redirect('/', 303);
            }
        })());
        return;
    }

    // Network first for the main HTML to avoid caching errors
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match('/');
            })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

// Communication with the App
self.addEventListener('message', (event) => {
    if (event.data === 'GET_SHARED_FILES') {
        if (sharedFiles) {
            event.source.postMessage({ 
                type: 'SHARED_FILES', 
                files: sharedFiles 
            });
            sharedFiles = null; // Consume
        }
    }
});
