"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Botao } from "@/components/ui";
import { enviarJson } from "@/lib/cliente/api";

/** Pausar (some para os clientes) ou ativar de novo. */
export function BotaoPausarAnuncio({ id, ativo }: { id: string; ativo: boolean }) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  async function alternar() {
    setSalvando(true);
    await enviarJson(`/api/anuncios/${id}`, "PATCH", { ativo: !ativo });
    setSalvando(false);
    router.refresh();
  }
  return (
    <Botao variante="secundario" onClick={alternar} carregando={salvando}>
      {ativo ? "Pausar" : "Ativar"}
    </Botao>
  );
}
