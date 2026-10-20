import Link from "next/link";
import { RefreshCw, UserRoundSearch, WifiOff } from "lucide-react";
import { CartaoServico, EstadoVazio } from "@/components/ui";
import { CATEGORIAS } from "@/lib/categorias";
import type { PrestadorResumo } from "@/lib/prestadores";

type Props = { prestadores: PrestadorResumo[]; erro?: boolean };

function nomesCategorias(ids: string[]): string {
  return ids
    .map((id) => CATEGORIAS.find((c) => c.id === id)?.nome)
    .filter(Boolean)
    .join(", ");
}

/** Prestadores com "Estou disponível agora" ligado (perto do cliente, quando ele tem endereço). */
export function SecaoDisponiveis({ prestadores, erro = false }: Props) {
  return (
    <section aria-labelledby="titulo-disponiveis" className="flex flex-col gap-3">
      <h2 id="titulo-disponiveis" className="text-xl font-black">
        Disponíveis agora
      </h2>

      {erro ? (
        <div role="status" className="flex flex-col items-center gap-3 rounded-2xl bg-superficie-suave px-5 py-8 text-center">
          <WifiOff aria-hidden className="size-8 text-texto-suave" />
          <p className="font-extrabold">Não conseguimos carregar agora.</p>
          <Link
            href="/"
            className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-superficie px-5 font-extrabold text-texto shadow-sm focus-visible:outline-3 focus-visible:outline-foco"
          >
            <RefreshCw aria-hidden className="size-5" />
            Tentar de novo
          </Link>
        </div>
      ) : prestadores.length === 0 ? (
        <EstadoVazio
          icone={UserRoundSearch}
          titulo="Ninguém disponível agora"
          texto="Publique seu pedido: os prestadores perto de você recebem e mandam propostas."
          acao={{ rotulo: "Publicar meu pedido", href: "/pedidos/novo" }}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {prestadores.map((p) => (
            <li key={p.id}>
              <CartaoServico
                titulo={p.nome}
                nomePrestador={nomesCategorias(p.categorias)}
                fotoUrl={p.foto}
                distanciaKm={p.distanciaKm}
                precoAPartirDe={p.precoBase}
                online={p.disponivelAgora}
                href={`/prestadores/${p.id}`}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
