self.addEventListener('install', event => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (url.origin === location.origin) {
    event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)))
  }
})
