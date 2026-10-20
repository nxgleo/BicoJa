"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Botao } from "@/components/ui";
import { enviarJson } from "@/lib/cliente/api";

/** Cancelar em duas etapas, para ninguém cancelar sem querer. */
export function BotaoCancelarPedido({ id }: { id: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function cancelar() {
    setCancelando(true);
    const r = await enviarJson(`/api/pedidos/${id}`, "PATCH", { acao: "cancelar" });
    setCancelando(false);
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    router.refresh();
  }

  if (!confirmando) {
    return <Botao variante="secundario" larguraTotal onClick={() => setConfirmando(true)}>Cancelar pedido</Botao>;
  }
  return (
    <div role="group" aria-label="Confirmar cancelamento" className="flex flex-col gap-3 rounded-2xl bg-superficie-suave p-4">
      <p className="font-bold">Quer mesmo cancelar? Os prestadores deixam de ver este pedido.</p>
      {erro && <p role="alert" className="font-bold text-urgencia">{erro}</p>}
      <div className="grid grid-cols-2 gap-3">
        <Botao variante="urgente" onClick={cancelar} carregando={cancelando}>Sim, cancelar</Botao>
        <Botao variante="secundario" onClick={() => setConfirmando(false)}>Não</Botao>
      </div>
    </div>
  );
}
