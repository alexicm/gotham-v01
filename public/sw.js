// Service worker do Gotham — invalidar caches antigos quando a versão muda.
// Bump CACHE para forçar reload total no cliente.
const CACHE = 'gotham-v3'
const STATIC = ['/manifest.json']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  )
})

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)

  // Bypass API calls — sempre rede
  if (url.pathname.startsWith('/api/')) return

  // Bypass HTML / navegação — sempre rede (evita servir a app cacheada antiga)
  if (e.request.mode === 'navigate' || (e.request.headers.get('accept') || '').includes('text/html')) {
    return
  }

  // Bypass arquivos do Next.js — sempre rede (chunks com hash já têm cache busting)
  if (url.pathname.startsWith('/_next/')) return

  // Cache-first apenas para estáticos do public/
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type !== 'basic') return res
        const clone = res.clone()
        caches.open(CACHE).then(c => c.put(e.request, clone))
        return res
      }).catch(() => cached)
    })
  )
})
