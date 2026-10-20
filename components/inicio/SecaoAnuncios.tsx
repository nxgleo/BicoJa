import Link from "next/link";
import { CartaoServico } from "@/components/ui";
import type { ServicoResumo } from "@/lib/servicos";

/** "Anúncios perto de você" (ou os mais novos, para quem não salvou endereço). */
export function SecaoAnuncios({ titulo, anuncios }: { titulo: string; anuncios: ServicoResumo[] }) {
  if (anuncios.length === 0) return null;
  return (
    <section aria-labelledby="titulo-anuncios" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 id="titulo-anuncios" className="text-xl font-black">{titulo}</h2>
        <Link href="/buscar" className="rounded-lg px-1 font-extrabold text-marca-texto hover:underline focus-visible:outline-3 focus-visible:outline-foco">
          Ver todos
        </Link>
      </div>
      <ul className="flex flex-col gap-3">
        {anuncios.map((s) => (
          <li key={s.id}>
            <CartaoServico
              titulo={s.titulo}
              nomePrestador={s.prestador.nome ?? "Prestador"}
              precoAPartirDe={s.preco}
              distanciaKm={s.distanciaKm}
              href={`/servicos/${s.id}`}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
