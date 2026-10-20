import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { perfilPublico } from "@/lib/prestadores";
import { nomeDaCategoria } from "@/lib/pedidos/formatar";
import { formatarPreco } from "@/lib/formatar";
import { Avatar } from "@/components/ui";
import { GaleriaFotos } from "@/components/publico/GaleriaFotos";
import { BotaoConversar } from "@/components/publico/BotaoConversar";

export const dynamic = "force-dynamic";

const mesAno = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

export default async function PerfilDoPrestador({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await perfilPublico(prisma, id);
  if (!p) notFound();
  const primeiroNome = p.nome.split(" ")[0];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-4">
        <Avatar nome={p.nome} fotoUrl={p.foto} tamanho={84} online={p.disponivelAgora} />
        <div className="min-w-0">
          <h1 className="text-2xl leading-tight font-black break-words">{p.nome}</h1>
          <p className="text-texto-suave">{p.categorias.map(nomeDaCategoria).join(", ")}</p>
          {p.disponivelAgora && <p className="font-extrabold text-sucesso">● Disponível agora</p>}
        </div>
      </header>

      <p className="flex items-start gap-2 text-texto-suave">
        <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-marca-texto" />
        <span>
          {p.bairro}, {p.cidade} · atende até {p.raioKm} km · no BicoJá desde {mesAno.format(p.membroDesde)}
        </span>
      </p>

      {p.bio && <p className="rounded-2xl bg-superficie-suave p-4 break-words whitespace-pre-line">{p.bio}</p>}

      <section aria-labelledby="titulo-servicos" className="flex flex-col gap-3">
        <h2 id="titulo-servicos" className="text-xl font-black">Serviços de {primeiroNome}</h2>
        {p.anuncios.length === 0 ? (
          <p className="text-texto-suave">
            {p.precoBase ? `Preço inicial: a partir de ${formatarPreco(p.precoBase)}. ` : ""}Ainda não tem anúncios publicados.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {p.anuncios.map((a) => (
              <li key={a.id} className="flex flex-col gap-3 rounded-2xl border border-borda p-4">
                <Link href={`/servicos/${a.id}`} className="rounded-lg font-black break-words hover:underline focus-visible:outline-3 focus-visible:outline-foco">
                  {a.titulo}
                </Link>
                <p className="text-sm text-texto-suave">
                  {nomeDaCategoria(a.categoria)} · {a.preco > 0 ? <>a partir de <b className="text-texto">{formatarPreco(a.preco)}</b></> : "Preço a combinar"}
                </p>
                <GaleriaFotos fotos={a.fotos.slice(0, 3)} titulo={a.titulo} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <BotaoConversar texto={`Conversar com ${primeiroNome}`} />
    </div>
  );
}
