import { ClipboardList, Siren } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { meusPedidos } from "@/lib/pedidos/pedidos";
import { haQuantoTempo, textoQuando } from "@/lib/pedidos/formatar";
import { exigirLogin } from "@/lib/sessao-pagina";
import { Botao, EstadoVazio } from "@/components/ui";
import { CartaoPedido, type Selo } from "@/components/pedidos/CartaoPedido";

export const dynamic = "force-dynamic";

export default async function MeusPedidos() {
  const userId = await exigirLogin("/pedidos");
  const pedidos = await meusPedidos(prisma, userId);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[1.6rem] leading-tight font-black">Meus pedidos</h1>
      <div className="grid grid-cols-2 gap-3">
        <Botao href="/pedidos/novo" variante="principal">Novo pedido</Botao>
        <Botao href="/pedidos/urgente" variante="urgente" icone={Siren}>Urgente</Botao>
      </div>

      {pedidos.length === 0 ? (
        <EstadoVazio icone={ClipboardList} titulo="Você ainda não publicou pedidos" texto="Conte o que você precisa e os prestadores perto de você recebem." />
      ) : (
        <ul className="flex flex-col gap-3">
          {pedidos.map((p) => {
            const selo: Selo = p.status !== "ABERTO" ? p.status : p.urgenteAgora ? "URGENTE" : "ABERTO";
            return (
              <li key={p.id}>
                <CartaoPedido
                  href={`/pedidos/${p.id}`}
                  categoria={p.categoria}
                  descricao={p.descricao}
                  selo={selo}
                  bairro={p.bairro}
                  quando={p.urgente ? "Urgente" : textoQuando(p)}
                  extra={`Publicado ${haQuantoTempo(p.createdAt)}`}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
