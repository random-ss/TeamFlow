const CACHE = 'teamflow-shell-v5'
const PRECACHE = [
  '/manifest.json',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
]

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return

  const url = new URL(e.request.url)
  if (url.origin !== self.location.origin) return

  // Always fetch the latest HTML/app shell when navigating.
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(fetch(e.request, { cache: 'no-store' }))
    return
  }

  const shouldCache =
    PRECACHE.includes(url.pathname) ||
    ['script', 'style', 'image', 'font', 'manifest'].includes(e.request.destination)

  if (!shouldCache) return

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetched = fetch(e.request).then((res) => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE).then((c) => c.put(e.request, clone))
        }
        return res
      })
      return cached || fetched
    })
  )
})
