import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Cabecalho } from "@/components/layout/Cabecalho";
import { MenuInferior } from "@/components/layout/MenuInferior";
import { PularParaConteudo } from "@/components/layout/PularParaConteudo";

// Estrutura comum das telas: logo em cima, conteúdo no meio, menu embaixo (no celular).
// O menu muda conforme o modo da pessoa (cliente ou prestador).
export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const sessao = await getServerSession(authOptions);
  const modo = sessao?.user?.modoAtual === "PRESTADOR" ? "prestador" : "cliente";

  return (
    <div className="flex min-h-screen flex-col md:flex-col-reverse md:justify-end">
      <PularParaConteudo />
      <div className="flex flex-1 flex-col">
        <Cabecalho logado={Boolean(sessao?.user?.id)} />
        <main id="conteudo" className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-28 md:pb-10">
          {children}
        </main>
      </div>
      <MenuInferior modo={modo} />
    </div>
  );
}
