"use client";

import { useState } from "react";
import { ClipboardList, Siren } from "lucide-react";
import { EstadoVazio } from "@/components/ui";
import { CartaoPedido } from "@/components/pedidos/CartaoPedido";
import { formatarDistancia } from "@/lib/formatar";
import { haQuantoTempo, textoQuando } from "@/lib/pedidos/formatar";
import type { PedidoParaPrestador } from "@/lib/pedidos/pedidos";

type Aba = "urgentes" | "pedidos";

/** Pedidos perto do prestador em duas abas separadas (urgentes não ficam sempre na frente). */
export function AbasPedidos({ urgentes, pedidos }: { urgentes: PedidoParaPrestador[]; pedidos: PedidoParaPrestador[] }) {
  const [aba, setAba] = useState<Aba>(urgentes.length > 0 ? "urgentes" : "pedidos");
  const lista = aba === "urgentes" ? urgentes : pedidos;

  const abas: { id: Aba; rotulo: string; contador?: number }[] = [
    { id: "urgentes", rotulo: "Urgentes", contador: urgentes.length },
    { id: "pedidos", rotulo: "Pedidos", contador: pedidos.length },
  ];

  return (
    <section aria-label="Pedidos perto de você" className="flex flex-col gap-3">
      <div role="tablist" aria-label="Tipo de pedido" className="grid grid-cols-2 gap-1 rounded-2xl bg-superficie-suave p-1">
        {abas.map(({ id, rotulo, contador }) => {
          const ativa = aba === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`aba-${id}`}
              aria-selected={ativa}
              aria-controls={`painel-${id}`}
              onClick={() => setAba(id)}
              className={`flex min-h-12 items-center justify-center gap-2 rounded-xl font-extrabold transition-all duration-200 focus-visible:outline-3 focus-visible:outline-foco ${
                ativa ? "bg-superficie text-texto shadow-sm" : "text-texto-suave"
              }`}
            >
              {id === "urgentes" && <Siren aria-hidden className="size-5 text-urgencia" />}
              {rotulo}
              {contador ? (
                <span className={`rounded-full px-2 text-sm text-white ${id === "urgentes" ? "bg-urgencia" : "bg-botao"}`}>{contador}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`painel-${aba}`} aria-labelledby={`aba-${aba}`}>
        {lista.length === 0 ? (
          <EstadoVazio
            icone={aba === "urgentes" ? Siren : ClipboardList}
            titulo={aba === "urgentes" ? "Nenhum pedido urgente perto agora" : "Nenhum pedido perto agora"}
            texto="Quando alguém perto de você pedir um dos seus serviços, aparece aqui."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {lista.map((p) => (
              <li key={p.id}>
                <CartaoPedido
                  href={`/pedidos/${p.id}`}
                  categoria={p.categoria}
                  descricao={p.descricao}
                  selo={p.urgente ? "URGENTE" : "ABERTO"}
                  bairro={p.bairro}
                  quando={p.urgente ? "Agora" : textoQuando(p)}
                  extra={[p.distanciaKm != null && formatarDistancia(p.distanciaKm), haQuantoTempo(new Date(p.createdAt))].filter(Boolean).join(" · ")}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
