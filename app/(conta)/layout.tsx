import { Cabecalho } from "@/components/layout/Cabecalho";
import { PularParaConteudo } from "@/components/layout/PularParaConteudo";

// Telas de entrar e cadastro: sem menu inferior, conteúdo estreito e centralizado.
export default function LayoutConta({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <PularParaConteudo />
      <Cabecalho />
      <main id="conteudo" className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-6 pb-10">
        {children}
      </main>
    </div>
  );
}
