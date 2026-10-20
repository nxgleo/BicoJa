import { Chip } from "@/components/ui";
import { CATEGORIAS, type CategoriaId } from "@/lib/categorias";

/** Categorias em fila, que a pessoa arrasta para o lado. */
export function ListaCategorias({ ativa }: { ativa?: CategoriaId }) {
  return (
    <ul className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-px-4 px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {CATEGORIAS.map((categoria) => (
        <li key={categoria.id} className="snap-start">
          <Chip href={`/buscar?categoria=${categoria.id}`} icone={categoria.icone} ativo={categoria.id === ativa}>
            {categoria.nome}
          </Chip>
        </li>
      ))}
    </ul>
  );
}
