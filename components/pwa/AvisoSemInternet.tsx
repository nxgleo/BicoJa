"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/** Faixa no topo quando o celular perde a internet. */
export function AvisoSemInternet() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const atualizar = () => setOffline(!navigator.onLine);
    atualizar();
    window.addEventListener("online", atualizar);
    window.addEventListener("offline", atualizar);
    return () => {
      window.removeEventListener("online", atualizar);
      window.removeEventListener("offline", atualizar);
    };
  }, []);

  if (!offline) return null;
  return (
    <p role="status" className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-texto px-4 py-2 text-center font-bold text-fundo">
      <WifiOff aria-hidden className="size-5 shrink-0" />
      Sem internet. Você pode ver o que já abriu, mas não dá para mandar nada agora.
    </p>
  );
}
