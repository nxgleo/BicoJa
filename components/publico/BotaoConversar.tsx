"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { Botao } from "@/components/ui";
import { enviarJson } from "@/lib/cliente/api";

type Origem = { servicoId: string } | { pedidoId: string } | { prestadorId: string };

/** Abre (ou reabre) a conversa. Sem login, leva para entrar e volta para esta página depois. */
export function BotaoConversar({ origem, texto = "Conversar" }: { origem: Origem; texto?: string }) {
  const router = useRouter();
  const caminho = usePathname() ?? "/";
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function abrir() {
    setCarregando(true);
    setErro(null);
    const r = await enviarJson<{ id: string }>("/api/conversas", "POST", origem);
    if (r.ok) return router.push(`/conversas/${r.dados.id}`);
    setCarregando(false);
    if (r.status === 401) return router.push(`/entrar?voltar=${encodeURIComponent(caminho)}`);
    if (r.status === 403 && typeof r.extra.destino === "string") return router.push(r.extra.destino);
    setErro(r.erro);
  }

  return (
    <div className="flex flex-col gap-2">
      <Botao tamanho="grande" icone={MessageCircle} larguraTotal carregando={carregando} onClick={abrir}>
        {texto}
      </Botao>
      {erro && (
        <p role="alert" className="text-center font-bold text-urgencia">
          {erro}
        </p>
      )}
    </div>
  );
}
