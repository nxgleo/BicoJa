import { notFound } from "next/navigation";
import { CalendarDays, CircleCheck, MapPin, Siren } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { detalhePedido } from "@/lib/pedidos/pedidos";
import { haQuantoTempo, nomeDaCategoria, textoQuando } from "@/lib/pedidos/formatar";
import { formatarDistancia } from "@/lib/formatar";
import { exigirLogin } from "@/lib/sessao-pagina";
import { Avatar } from "@/components/ui";
import { Voltar } from "@/components/conta/Voltar";
import { GaleriaFotos } from "@/components/publico/GaleriaFotos";
import { BotaoConversar } from "@/components/publico/BotaoConversar";
import { BotaoCancelarPedido } from "@/components/pedidos/BotaoCancelarPedido";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ novo?: string }> };

const STATUS = { ABERTO: "Aberto", FECHADO: "Fechado", CANCELADO: "Cancelado" } as const;

export default async function DetalhePedido({ params, searchParams }: Props) {
  const { id } = await params;
  const { novo } = await searchParams;
  const userId = await exigirLogin(`/pedidos/${id}`);
  const r = await detalhePedido(prisma, id, { userId });
  if (!r) notFound();
  const p = r.pedido;
  const urgente = r.doDono ? r.pedido.urgenteAgora : r.pedido.urgente;
  const titulo = nomeDaCategoria(p.categoria);

  return (
    <div className="flex flex-col gap-5">
      <Voltar href={r.doDono ? "/pedidos" : "/prestador"} />

      {r.doDono && novo && (
        <p role="status" className="flex items-center gap-2 rounded-2xl bg-sucesso/15 p-4 font-bold">
          <CircleCheck aria-hidden className="size-6 text-sucesso" />
          {urgente ? "Pedido urgente enviado! Avisamos quem está perto." : "Pedido publicado! Os prestadores perto de você já podem ver."}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-[1.6rem] leading-tight font-black">{titulo}</h1>
        {urgente && (
          <span className="inline-flex items-center gap-1 rounded-full bg-urgencia px-3 py-0.5 text-sm font-extrabold text-white">
            <Siren aria-hidden className="size-4" />Urgente
          </span>
        )}
        {r.doDono && !urgente && (
          <span className="rounded-full bg-marca-suave px-3 py-0.5 text-sm font-extrabold text-marca-texto">{STATUS[r.pedido.status]}</span>
        )}
      </div>

      <p className="text-lg break-words whitespace-pre-line">{p.descricao}</p>
      <GaleriaFotos fotos={p.fotos} titulo={titulo} />

      <dl className="flex flex-col gap-3 rounded-2xl border border-borda p-4">
        <div className="flex items-start gap-2">
          <CalendarDays aria-hidden className="mt-0.5 size-5 text-marca-texto" />
          <div><dt className="text-sm font-bold text-texto-suave">Quando</dt><dd className="font-bold">{p.urgente ? "Agora (urgente)" : textoQuando(p)}</dd></div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin aria-hidden className="mt-0.5 size-5 text-marca-texto" />
          <div>
            <dt className="text-sm font-bold text-texto-suave">Onde</dt>
            {r.doDono ? (
              <dd className="font-bold break-words">
                {r.pedido.rua}, {r.pedido.numero}{r.pedido.complemento ? ` · ${r.pedido.complemento}` : ""}
                <span className="block font-normal text-texto-suave">{p.bairro}, {p.cidade}</span>
              </dd>
            ) : (
              <dd className="font-bold">
                {p.bairro}, {p.cidade}
                {r.pedido.distanciaKm != null && <span className="font-normal text-texto-suave"> · {formatarDistancia(r.pedido.distanciaKm)}</span>}
              </dd>
            )}
          </div>
        </div>
      </dl>

      <p className="text-sm text-texto-suave">Publicado {haQuantoTempo(p.createdAt)}</p>

      {r.doDono ? (
        r.pedido.status === "ABERTO" && <BotaoCancelarPedido id={p.id} />
      ) : (
        <>
          <div className="flex items-center gap-3 rounded-2xl bg-superficie-suave p-4">
            <Avatar nome={r.pedido.cliente.nome} fotoUrl={r.pedido.cliente.foto} />
            <p><b>{r.pedido.cliente.nome}</b><span className="block text-sm text-texto-suave">quem pediu</span></p>
          </div>
          <BotaoConversar origem={{ pedidoId: p.id }} texto="Quero atender" />
        </>
      )}
    </div>
  );
}
