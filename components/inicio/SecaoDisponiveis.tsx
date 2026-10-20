import Link from "next/link";
import { RefreshCw, SearchX, WifiOff } from "lucide-react";
import { CartaoServico, EstadoVazio } from "@/components/ui";
import type { ServicoResumo } from "@/lib/servicos";

type Props = { servicos: ServicoResumo[]; erro?: boolean };

// Fase 1: mostra os anúncios mais recentes. Na Fase 3 passa a mostrar quem está com "Estou disponível" ligado.
export function SecaoDisponiveis({ servicos, erro = false }: Props) {
  return (
    <section aria-labelledby="titulo-disponiveis" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 id="titulo-disponiveis" className="text-xl font-black">
          Disponíveis agora
        </h2>
        {!erro && servicos.length > 0 && (
          <Link href="/buscar" className="rounded-lg px-1 font-extrabold text-marca-texto hover:underline focus-visible:outline-3 focus-visible:outline-marca">
            Ver todos
          </Link>
        )}
      </div>

      {erro ? (
        <div role="status" className="flex flex-col items-center gap-3 rounded-2xl bg-superficie-suave px-5 py-8 text-center">
          <WifiOff aria-hidden className="size-8 text-texto-suave" />
          <p className="font-extrabold">Não conseguimos carregar agora.</p>
          <Link
            href="/"
            className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-superficie px-5 font-extrabold text-texto shadow-sm focus-visible:outline-3 focus-visible:outline-marca"
          >
            <RefreshCw aria-hidden className="size-5" />
            Tentar de novo
          </Link>
        </div>
      ) : servicos.length === 0 ? (
        <EstadoVazio
          icone={SearchX}
          titulo="Ainda não tem ninguém por aqui"
          texto="Conte o que você precisa e os prestadores mandam propostas."
          acao={{ rotulo: "Publicar meu pedido", href: "/pedidos/novo" }}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {servicos.map((servico) => (
            <li key={servico.id}>
              <CartaoServico
                titulo={servico.titulo}
                nomePrestador={servico.prestador.nome ?? "Prestador"}
                precoAPartirDe={servico.preco}
                href={`/servicos/${servico.id}`}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
