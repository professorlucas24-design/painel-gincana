const CACHE = "gincana-abcd-v8";
const BASE = self.registration.scope;

const ARQUIVOS = [
  "./",
  "./index.html",
  "./logo.png",
  "./manifest.webmanifest",
  "./icone.svg"
].map(caminho => new URL(caminho, BASE).href);

self.addEventListener("install", evento => {
  evento.waitUntil((async () => {
    const cache = await caches.open(CACHE);

    // Só conclui a preparação se todos os arquivos forem baixados.
    await cache.addAll(
      ARQUIVOS.map(url => new Request(url, { cache: "reload" }))
    );

    await self.skipWaiting();
  })());
});

self.addEventListener("activate", evento => {
  evento.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", evento => {
  const requisicao = evento.request;
  const url = new URL(requisicao.url);

  if (requisicao.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  if (!url.href.startsWith(BASE)) return;

  evento.respondWith((async () => {
    const cache = await caches.open(CACHE);

    if (requisicao.mode === "navigate") {
      const pagina = await cache.match(new URL("./index.html", BASE).href);
      if (pagina) return pagina;
      return fetch(requisicao);
    }

    const salvo = await cache.match(requisicao, { ignoreSearch: true });
    if (salvo) return salvo;

    return fetch(requisicao);
  })());
});

self.addEventListener("message", evento => {
  if (evento.data?.tipo !== "VERIFICAR_OFFLINE") return;

  evento.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE);
      const resultados = await Promise.all(
        ARQUIVOS.map(url => cache.match(url))
      );

      evento.ports[0]?.postMessage({
        pronto: resultados.every(Boolean)
      });
    } catch {
      evento.ports[0]?.postMessage({ pronto: false });
    }
  })());
});