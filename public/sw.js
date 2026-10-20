// Service worker do BicoJá: funcionamento sem internet e notificações push.
//
// O que fica guardado no celular:
// - a tela "Sem internet", o logo e os ícones;
// - os arquivos do site (_next/static), que nunca mudam de nome;
// - fotos públicas (perfil, anúncios, pedidos) — nunca as fotos do chat;
// - as últimas páginas abertas, MENOS as que têm dados particulares
//   (conversas, serviço combinado com o código, perfil, avisos, entrar/cadastro).
// Nada da API é guardado. Ao sair da conta, as páginas guardadas são apagadas.

const VERSAO = "v1";
const CACHE_BASE = `bicoja-base-${VERSAO}`;
const CACHE_ARQUIVOS = `bicoja-arquivos-${VERSAO}`;
const CACHE_IMAGENS = `bicoja-imagens-${VERSAO}`;
const CACHE_PAGINAS = `bicoja-paginas-${VERSAO}`;
const MAX_PAGINAS = 20;
const MAX_IMAGENS = 60;

const DEV = new URL(self.location.href).searchParams.has("dev");
const BASE = ["/offline", "/logo.png", "/icones/icone-192.png", "/manifest.webmanifest"];
const PAGINAS_PARTICULARES = ["/conversas", "/contratos", "/perfil", "/avisos", "/entrar", "/cadastro", "/esqueci-senha"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_BASE)
      .then((cache) => cache.addAll(BASE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  const atuais = [CACHE_BASE, CACHE_ARQUIVOS, CACHE_IMAGENS, CACHE_PAGINAS];
  event.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n.startsWith("bicoja-") && !atuais.includes(n)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

async function limitar(nomeCache, maximo) {
  const cache = await caches.open(nomeCache);
  const chaves = await cache.keys();
  for (const chave of chaves.slice(0, Math.max(0, chaves.length - maximo))) await cache.delete(chave);
}

const particular = (caminho) => PAGINAS_PARTICULARES.some((p) => caminho === p || caminho.startsWith(`${p}/`));

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Arquivos do site: primeiro o guardado (nunca mudam de nome em produção)
  if (url.pathname.startsWith("/_next/static/")) {
    if (DEV) return;
    event.respondWith(
      caches.match(req).then(
        (guardado) =>
          guardado ||
          fetch(req).then((resp) => {
            if (resp.ok) {
              const copia = resp.clone();
              caches.open(CACHE_ARQUIVOS).then((c) => c.put(req, copia));
            }
            return resp;
          })
      )
    );
    return;
  }

  // Fotos públicas: guardadas para aparecer sem internet. Fotos do chat são particulares.
  const foto = url.pathname.match(/^\/api\/arquivos\/(fotos|anuncios|pedidos)\//);
  if (foto) {
    event.respondWith(
      caches.match(req).then(
        (guardado) =>
          guardado ||
          fetch(req).then((resp) => {
            if (resp.ok) {
              const copia = resp.clone();
              caches.open(CACHE_IMAGENS).then((c) => c.put(req, copia).then(() => limitar(CACHE_IMAGENS, MAX_IMAGENS)));
            }
            return resp;
          })
      )
    );
    return;
  }

  // Páginas: tenta a internet; sem internet, mostra a última versão guardada ou a tela "Sem internet"
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const html = resp.headers.get("content-type")?.includes("text/html");
          if (resp.ok && html && !particular(url.pathname) && !resp.redirected) {
            const copia = resp.clone();
            caches.open(CACHE_PAGINAS).then((c) => c.put(req, copia).then(() => limitar(CACHE_PAGINAS, MAX_PAGINAS)));
          }
          return resp;
        })
        .catch(async () => (particular(url.pathname) ? null : await caches.match(req)) || caches.match("/offline"))
    );
  }
});

// ---------- Notificações push ----------

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let dados = {};
  try {
    dados = event.data.json();
  } catch {
    return;
  }
  const destino = typeof dados.url === "string" && dados.url.startsWith("/") ? dados.url : "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      // Se a pessoa já está olhando essa tela, não precisa de notificação
      const olhando = janelas.some((j) => j.focused && new URL(j.url).pathname === destino);
      if (olhando) return;
      return self.registration.showNotification(dados.title || "BicoJá", {
        body: dados.body || "Você tem uma novidade no BicoJá.",
        icon: "/icones/icone-192.png",
        badge: "/icones/icone-192.png",
        tag: destino, // várias mensagens da mesma conversa viram uma notificação só
        data: { url: destino },
      });
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      for (const j of janelas) {
        if (j.url === destino && "focus" in j) return j.focus();
      }
      return self.clients.openWindow ? self.clients.openWindow(destino) : undefined;
    })
  );
});
