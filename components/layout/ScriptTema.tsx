import { CHAVE_TEMA } from "@/lib/tema";

// Roda antes da página aparecer, para o tema escuro não "piscar" claro ao abrir.
// Conteúdo fixo, sem nenhum dado de usuário.
const codigo = `(function(){try{var p=localStorage.getItem("${CHAVE_TEMA}");var e=p==="escuro"||(p!=="claro"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(e)document.documentElement.classList.add("escuro")}catch(_){}})();`;

export function ScriptTema() {
  return <script dangerouslySetInnerHTML={{ __html: codigo }} />;
}
