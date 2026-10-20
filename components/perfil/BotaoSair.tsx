"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Botao } from "@/components/ui";
import { desconectarChat } from "@/lib/cliente/socket";

export function BotaoSair() {
  return (
    <Botao
      variante="secundario"
      icone={LogOut}
      larguraTotal
      onClick={() => {
        desconectarChat();
        signOut({ callbackUrl: "/" });
      }}
    >
      Sair da conta
    </Botao>
  );
}
