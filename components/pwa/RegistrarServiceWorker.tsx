"use client";

import { useEffect } from "react";

/** Registra o service worker (notificações push e, na Fase 6, funcionamento offline). */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((erro) => {
      console.error("Não foi possível registrar o service worker:", erro);
    });
  }, []);
  return null;
}
