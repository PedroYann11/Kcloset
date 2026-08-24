/**
 * Service worker do Kcloset.
 *
 * Serve para o app abrir mesmo sem internet e para não depender da rede a cada
 * toque. É deliberadamente conservador, porque service worker mal escrito é
 * pior que nenhum: ele consegue servir uma versão velha para sempre.
 *
 * Regras:
 *   - navegação vai na rede primeiro, então uma versão nova sempre chega;
 *   - arquivo estático com hash no nome vai no cache primeiro, porque o nome
 *     muda a cada build e nunca serve conteúdo velho;
 *   - nada de /api é cacheado, porque importar link tem que ser sempre ao vivo.
 */

const VERSION = "kcloset-v1";
const SHELL = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll([SHELL]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Abrir o app: tenta a rede, cai no cache quando estiver sem sinal.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put(SHELL, copy));
          return response;
        })
        .catch(() => caches.match(SHELL).then((cached) => cached ?? Response.error())),
    );
    return;
  }

  // Arquivo de build e ícone: o nome já identifica a versão, então cache primeiro.
  const isVersioned = url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icon");
  if (isVersioned) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(VERSION).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  event.respondWith(fetch(request).catch(() => caches.match(request).then((cached) => cached ?? Response.error())));
});
