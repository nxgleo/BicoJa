/** Primeiro item do teclado: leva direto ao conteúdo, pulando o menu. */
export function PularParaConteudo() {
  return (
    <a
      href="#conteudo"
      className="sr-only z-50 rounded-2xl bg-botao px-4 py-3 font-extrabold text-texto-sobre-marca focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >
      Pular para o conteúdo
    </a>
  );
}
