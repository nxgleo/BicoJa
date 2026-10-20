"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Botao } from "@/components/ui";
import { desconectarChat } from "@/lib/cliente/socket";
import { desligarNotificacoes } from "@/components/notificacoes/BotaoNotificacoes";
import { apagarPaginasGuardadas } from "@/components/pwa/RegistrarServiceWorker";

/** Sair: desliga o chat e as notificações deste celular e apaga as páginas guardadas sem internet. */
export function BotaoSair() {
  const [saindo, setSaindo] = useState(false);
  return (
    <Botao
      variante="secundario"
      icone={LogOut}
      larguraTotal
      carregando={saindo}
      onClick={async () => {
        setSaindo(true);
        desconectarChat();
        await Promise.all([desligarNotificacoes(), apagarPaginasGuardadas()]);
        try {
          sessionStorage.clear();
        } catch {
          // navegador sem armazenamento
        }
        signOut({ callbackUrl: "/" });
      }}
    >
      Sair da conta
    </Botao>
  );
}
