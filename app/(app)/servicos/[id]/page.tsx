import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { anuncioPublico } from "@/lib/anuncios/anuncios";
import { nomeDaCategoria } from "@/lib/pedidos/formatar";
import { formatarPreco } from "@/lib/formatar";
import { Avatar } from "@/components/ui";
import { GaleriaFotos } from "@/components/publico/GaleriaFotos";
import { BotaoConversar } from "@/components/publico/BotaoConversar";
import { idDaSessao } from "@/lib/contas/sessao";

export const dynamic = "force-dynamic";

export default async function PaginaDoAnuncio({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await anuncioPublico(prisma, id);
  if (!a) notFound();
  const souEu = (await idDaSessao()) === a.prestador.id;

  return (
    <div className="flex flex-col gap-6">
      <GaleriaFotos fotos={a.fotos} titulo={a.titulo} />
      <div>
        <p className="font-bold text-marca-texto">{nomeDaCategoria(a.categoria)}</p>
        <h1 className="text-[1.6rem] leading-tight font-black break-words">{a.titulo}</h1>
        <p className="mt-1 text-lg">
          {a.preco > 0 ? <>a partir de <b>{formatarPreco(a.preco)}</b></> : <b>Preço a combinar</b>}
        </p>
      </div>
      <p className="break-words whitespace-pre-line">{a.descricao}</p>

      <Link
        href={`/prestadores/${a.prestador.id}`}
        className="flex items-center gap-3 rounded-2xl border border-borda p-4 transition-all duration-200 hover:border-marca active:scale-[0.99] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
      >
        <Avatar nome={a.prestador.nome} fotoUrl={a.prestador.foto} online={a.prestador.disponivelAgora} />
        <span className="min-w-0 flex-1">
          <span className="block font-black break-words">{a.prestador.nome}</span>
          <span className="block text-sm text-texto-suave">
            {a.prestador.bairro ? `${a.prestador.bairro}, ${a.prestador.cidade}` : "Ver perfil"}
            {a.prestador.disponivelAgora ? " · Disponível agora" : ""}
          </span>
        </span>
        <ChevronRight aria-hidden className="size-6 text-texto-suave" />
      </Link>

      {souEu ? null : <BotaoConversar origem={{ servicoId: a.id }} texto={`Conversar com ${a.prestador.nome.split(" ")[0]}`} />}
    </div>
  );
}
