import { Megaphone, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { meusAnuncios } from "@/lib/anuncios/anuncios";
import { nomeDaCategoria } from "@/lib/pedidos/formatar";
import { formatarPreco } from "@/lib/formatar";
import { exigirPrestador } from "@/lib/prestador-pagina";
import { Botao, EstadoVazio } from "@/components/ui";
import { Voltar } from "@/components/conta/Voltar";
import { BotaoPausarAnuncio } from "@/components/prestador/BotaoPausarAnuncio";

export const dynamic = "force-dynamic";

export default async function MeusAnuncios() {
  const { userId } = await exigirPrestador("/prestador/anuncios");
  const anuncios = await meusAnuncios(prisma, userId);

  return (
    <div className="flex flex-col gap-5">
      <Voltar href="/prestador" />
      <h1 className="text-[1.6rem] leading-tight font-black">Meus anúncios</h1>
      <Botao href="/prestador/anuncios/novo" icone={Plus} larguraTotal>Criar anúncio</Botao>

      {anuncios.length === 0 ? (
        <EstadoVazio icone={Megaphone} titulo="Nenhum anúncio ainda" texto="Anuncie o que você faz para os clientes acharem você na busca." />
      ) : (
        <ul className="flex flex-col gap-3">
          {anuncios.map((a) => (
            <li key={a.id} className={`flex flex-col gap-3 rounded-2xl border border-borda p-4 ${a.ativo ? "" : "opacity-75"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-black break-words">{a.titulo}</p>
                  <p className="text-sm text-texto-suave">
                    {nomeDaCategoria(a.categoria)} · {a.preco > 0 ? `a partir de ${formatarPreco(a.preco)}` : "Preço a combinar"}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-0.5 text-sm font-extrabold ${a.ativo ? "bg-sucesso/15 text-texto" : "bg-superficie-suave text-texto-suave"}`}>
                  {a.ativo ? "Ativo" : "Pausado"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Botao href={`/prestador/anuncios/${a.id}`} variante="secundario">Editar</Botao>
                <BotaoPausarAnuncio id={a.id} ativo={a.ativo} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
