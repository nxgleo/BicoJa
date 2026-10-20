import { Cabecalho } from "@/components/layout/Cabecalho";
import { MenuInferior } from "@/components/layout/MenuInferior";
import { PularParaConteudo } from "@/components/layout/PularParaConteudo";

// Estrutura comum das telas: logo em cima, conteúdo no meio, menu embaixo (no celular).
// Na Fase 2 o modo virá da conta da pessoa; por enquanto é sempre "cliente".
export default function LayoutApp({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-col-reverse md:justify-end">
      <PularParaConteudo />
      <div className="flex flex-1 flex-col">
        <Cabecalho />
        <main id="conteudo" className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-28 md:pb-10">
          {children}
        </main>
      </div>
      <MenuInferior modo="cliente" />
    </div>
  );
}
