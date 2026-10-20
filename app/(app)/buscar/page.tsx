import { SearchX } from "lucide-react";
import { BuscaPrincipal } from "@/components/inicio/BuscaPrincipal";
import { ListaCategorias } from "@/components/inicio/ListaCategorias";
import { CartaoServico, Chip, EstadoVazio } from "@/components/ui";
import { interpretarBusca, normalizar } from "@/lib/busca";
import { CATEGORIAS, type CategoriaId } from "@/lib/categorias";
import { buscarServicos, type ServicoResumo } from "@/lib/servicos";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string | string[]; categoria?: string | string[] }> };

function primeiro(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

export default async function Buscar({ searchParams }: Props) {
  const parametros = await searchParams;
  const texto = primeiro(parametros.q).slice(0, 100);
  const pedida = primeiro(parametros.categoria);
  const categoria = CATEGORIAS.find((c) => c.id === pedida)?.id as CategoriaId | undefined;
  const entendidas = categoria ? [categoria] : interpretarBusca(texto);
  const nomeCategoria = (id: CategoriaId) => CATEGORIAS.find((c) => c.id === id)!;

  let servicos: ServicoResumo[] = [];
  let erro = false;
  try {
    servicos = await buscarServicos({ texto, categoria }, 30);
  } catch (e) {
    console.error("Erro na busca:", e);
    erro = true;
  }

  const titulo = categoria
    ? nomeCategoria(categoria).nome
    : normalizar(texto)
      ? `Resultados para "${texto}"`
      : "Todos os serviços";

  return (
    <div className="flex flex-col gap-5">
      <BuscaPrincipal valorInicial={texto} />

      {entendidas.length > 0 && !categoria && (
        <section aria-labelledby="titulo-entendemos">
          <h2 id="titulo-entendemos" className="mb-2 font-bold text-texto-suave">
            Entendemos que você precisa de:
          </h2>
          <div className="flex flex-wrap gap-2">
            {entendidas.slice(0, 3).map((id) => (
              <Chip key={id} href={`/buscar?categoria=${id}`} icone={nomeCategoria(id).icone}>
                {nomeCategoria(id).nome}
              </Chip>
            ))}
          </div>
        </section>
      )}

      {(categoria || !normalizar(texto)) && <ListaCategorias ativa={categoria} />}

      <section aria-labelledby="titulo-resultados" className="flex flex-col gap-3">
        <h1 id="titulo-resultados" className="text-2xl font-black break-words">
          {titulo}
        </h1>
        {erro ? (
          <p role="status" className="rounded-2xl bg-superficie-suave p-5 font-bold">
            Não conseguimos buscar agora. Tente de novo em instantes.
          </p>
        ) : servicos.length === 0 ? (
          <EstadoVazio
            icone={SearchX}
            titulo="Não achamos ninguém para isso ainda"
            texto="Publique seu pedido: os prestadores perto de você recebem e mandam propostas."
            acao={{ rotulo: "Publicar meu pedido", href: "/pedidos/novo" }}
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {servicos.map((s) => (
              <li key={s.id}>
                <CartaoServico
                  titulo={s.titulo}
                  nomePrestador={s.prestador.nome ?? "Prestador"}
                  precoAPartirDe={s.preco}
                  href={`/servicos/${s.id}`}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
