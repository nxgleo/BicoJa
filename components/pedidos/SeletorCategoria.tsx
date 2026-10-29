"use client";

import { CATEGORIAS, type CategoriaId } from "@/lib/categorias";

type Props = {
  valor: CategoriaId | null;
  onChange: (id: CategoriaId) => void;
  erro?: string;
  /** Só estas categorias (ex.: as do perfil do prestador). */
  apenas?: string[];
  rotulo?: string;
};

export function SeletorCategoria({ valor, onChange, erro, apenas, rotulo = "Que tipo de serviço?" }: Props) {
  const opcoes = apenas ? CATEGORIAS.filter((c) => apenas.includes(c.id)) : CATEGORIAS;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-bold">{rotulo}</legend>
      <div role="radiogroup" aria-label={rotulo} className="flex flex-wrap gap-2">
        {opcoes.map(({ id, nome, icone: Icone }) => {
          const marcado = valor === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={marcado}
              onClick={() => onChange(id)}
              className={`inline-flex min-h-12 items-center gap-2 rounded-full border-2 px-4 font-extrabold transition-all duration-200 active:scale-[0.97] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco ${
                marcado ? "border-botao bg-botao text-texto-sobre-marca" : "border-transparent bg-marca-suave text-marca-texto"
              }`}
            >
              <Icone aria-hidden className="size-5" />
              {nome}
            </button>
          );
        })}
      </div>
      {erro && <p role="alert" className="text-sm font-bold text-urgencia">{erro}</p>}
    </fieldset>
  );
}
