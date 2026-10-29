import { Search } from "lucide-react";

export function BuscaPrincipal({ valorInicial = "" }: { valorInicial?: string }) {
  return (
    <form action="/buscar" method="get" role="search" className="relative">
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-texto-suave" />
      <input
        type="search"
        name="q"
        aria-label="O que você precisa?"
        placeholder="Ex: pia vazando, montar armário…"
        defaultValue={valorInicial}
        maxLength={100}
        enterKeyHint="search"
        autoComplete="off"
        className="min-h-14 w-full rounded-2xl border-2 border-transparent bg-superficie-suave py-3 pr-24 pl-12 text-base text-texto placeholder:text-texto-suave transition-colors duration-200 focus:border-foco focus:bg-superficie focus:outline-none"
      />
      <button
        type="submit"
        className="absolute top-1/2 right-1.5 min-h-11 -translate-y-1/2 rounded-xl bg-botao px-4 font-extrabold text-texto-sobre-marca transition-all duration-200 active:scale-[0.97] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
      >
        Buscar
      </button>
    </form>
  );
}
