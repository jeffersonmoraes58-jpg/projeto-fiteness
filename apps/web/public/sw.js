const CACHE_NAME = 'fitlynutri-v1';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/logo.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Skip API calls — always go to network
  if (url.pathname.startsWith('/api/')) return;

  // Cache-first for static assets, network-first for pages
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/logo.png'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
        }
        return res;
      }))
    );
  } else {
    // Network-first for pages
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
  }
});

// ─── Push Notifications ──────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  let data: { title: string; body: string; icon?: string; badge?: string; url?: string; tag?: string } = {
    title: 'FitlyNutri',
    body: 'Você tem uma nova notificação',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch {
      data.body = event.data.text();
    }
  }

  const options: NotificationOptions = {
    body: data.body,
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/icon-192.png',
    tag: data.tag || 'fitlynutri-default',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    silent: false,
    data: { url: data.url || '/' },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(urlToOpen);
          return;
        }
      }
      // Otherwise open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// ─── Background Audio Keep-Alive ─────────────────────────────────────────────
// Mantém o áudio do YouTube tocando mesmo com a tela bloqueada no TWA.
// O Service Worker atua como um "proxy" que impede o navegador de pausar
// a reprodução quando a tela desliga.

self.addEventListener('message', (event) => {
  const data = event.data;

  if (!data || !data.type) return;

  switch (data.type) {
    case 'AUDIO_PLAYING':
      // Cliente informou que está reproduzindo áudio
      // Mantém o service worker "acordado" para evitar que o navegador
      // suspenda a página quando a tela bloquear
      keepAlive();
      break;

    case 'AUDIO_PAUSED':
      // Áudio pausado, pode liberar
      break;

    case 'AUDIO_KEEPALIVE':
      // Heartbeat do cliente — responde para manter a conexão ativa
      event.source?.postMessage({ type: 'KEEPALIVE_ACK' });
      break;
  }
});

function keepAlive() {
  // Cria um ciclo de keepalive: registra um timer periódico
  // que impede o navegador de suspender o service worker
  const interval = setInterval(() => {
    // Verifica se ainda há clientes conectados
    self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
      if (clients.length === 0) {
        clearInterval(interval);
      }
    });
  }, 20000); // 20 segundos
}
