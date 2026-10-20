"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Botao } from "@/components/ui";

export function BotaoSair() {
  return (
    <Botao variante="secundario" icone={LogOut} larguraTotal onClick={() => signOut({ callbackUrl: "/" })}>
      Sair da conta
    </Botao>
  );
}
