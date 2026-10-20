// Preferência de tema (claro/escuro). É a única coisa que guardamos no localStorage.

export type PreferenciaTema = "sistema" | "claro" | "escuro";

export const CHAVE_TEMA = "bicoja-tema";

export function lerPreferenciaTema(): PreferenciaTema {
  try {
    const valor = localStorage.getItem(CHAVE_TEMA);
    if (valor === "claro" || valor === "escuro") return valor;
  } catch {
    // Navegador bloqueou o armazenamento: segue o celular
  }
  return "sistema";
}

export function salvarPreferenciaTema(preferencia: PreferenciaTema): void {
  try {
    if (preferencia === "sistema") localStorage.removeItem(CHAVE_TEMA);
    else localStorage.setItem(CHAVE_TEMA, preferencia);
  } catch {
    // Sem armazenamento: a escolha vale só até fechar a página
  }
}

export function aplicarTema(preferencia: PreferenciaTema): void {
  const sistemaEscuro =
    typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const escuro = preferencia === "escuro" || (preferencia === "sistema" && sistemaEscuro);
  document.documentElement.classList.toggle("escuro", escuro);
}
