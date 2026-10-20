"use client";

import { useEffect } from "react";

/** Registra o service worker (funcionamento sem internet e notificações push). */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Em desenvolvimento o service worker não guarda os arquivos do Next (eles mudam a cada edição)
    const url = process.env.NODE_ENV === "development" ? "/sw.js?dev=1" : "/sw.js";
    navigator.serviceWorker.register(url).catch((erro) => {
      console.error("Não foi possível registrar o service worker:", erro);
    });
  }, []);
  return null;
}

/** Ao sair da conta: apaga as páginas guardadas para outra pessoa não ver nada no mesmo celular. */
export async function apagarPaginasGuardadas() {
  try {
    const nomes = await caches.keys();
    await Promise.all(nomes.filter((n) => n.startsWith("bicoja-paginas")).map((n) => caches.delete(n)));
  } catch {
    // navegador sem cache: nada a apagar
  }
}
