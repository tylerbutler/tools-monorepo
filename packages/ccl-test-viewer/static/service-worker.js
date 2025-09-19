const CACHE_NAME = "ccl-test-viewer-v1";
const STATIC_CACHE_URLS = ["/", "/browse", "/manifest.json"];

// Install event - cache static assets
self.addEventListener("install", (event) => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => {
				return cache.addAll(STATIC_CACHE_URLS);
			})
			.then(() => {
				return self.skipWaiting();
			}),
	);
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((cacheNames) => {
				return Promise.all(
					cacheNames
						.filter((cacheName) => cacheName !== CACHE_NAME)
						.map((cacheName) => caches.delete(cacheName)),
				);
			})
			.then(() => {
				return self.clients.claim();
			}),
	);
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
	// Skip non-GET requests
	if (event.request.method !== "GET") {
		return;
	}

	// Skip external requests
	if (!event.request.url.startsWith(self.location.origin)) {
		return;
	}

	event.respondWith(
		caches.match(event.request).then((response) => {
			// Return cached version if available
			if (response) {
				return response;
			}

			// Otherwise fetch from network
			return fetch(event.request)
				.then((response) => {
					// Don't cache if not a valid response
					if (
						!response ||
						response.status !== 200 ||
						response.type !== "basic"
					) {
						return response;
					}

					// Clone the response as it's a stream
					const responseToCache = response.clone();

					// Cache static assets
					if (
						event.request.url.includes("/assets/") ||
						event.request.url.includes("/data/") ||
						event.request.url.endsWith(".json") ||
						event.request.url.endsWith(".css") ||
						event.request.url.endsWith(".js")
					) {
						caches.open(CACHE_NAME).then((cache) => {
							cache.put(event.request, responseToCache);
						});
					}

					return response;
				})
				.catch(() => {
					// Return offline page for navigation requests
					if (event.request.mode === "navigate") {
						return caches.match("/");
					}
				});
		}),
	);
});
