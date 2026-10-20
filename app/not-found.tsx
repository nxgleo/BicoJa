import { SearchX } from "lucide-react";
import { Botao } from "@/components/ui";

export default function NaoEncontrado() {
  return (
    <main id="conteudo" className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-marca-suave">
        <SearchX aria-hidden className="size-8 text-marca-texto" />
      </span>
      <h1 className="text-2xl font-black">Não achamos essa página</h1>
      <p className="text-texto-suave">Ela pode ter sido removida, ou o endereço está errado.</p>
      <Botao href="/" tamanho="grande">Voltar ao início</Botao>
    </main>
  );
}
