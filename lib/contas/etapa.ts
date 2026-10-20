// Decide para onde mandar a pessoa conforme o login e a etapa do cadastro.
// Usado pelo middleware.ts (roda antes de cada página).

export type Etapa = "codigo" | "foto" | "completo";
type Token = { emailVerificado?: boolean; temFoto?: boolean } | null;

const PAGINAS_COM_LOGIN = ["/perfil", "/pedidos", "/conversas", "/prestador", "/quero-fazer-bicos"];
const TELA_DA_ETAPA: Record<Exclude<Etapa, "completo">, string> = {
  codigo: "/cadastro/codigo",
  foto: "/cadastro/foto",
};

export function etapaDoCadastro(t: { emailVerificado?: boolean; temFoto?: boolean }): Etapa {
  if (!t.emailVerificado) return "codigo";
  if (!t.temFoto) return "foto";
  return "completo";
}

function dentro(caminho: string, base: string): boolean {
  return caminho === base || caminho.startsWith(`${base}/`);
}

function paraEntrar(caminho: string): string {
  return `/entrar?voltar=${encodeURIComponent(caminho)}`;
}

/** Endereço para onde redirecionar, ou null para deixar abrir a página. */
export function destinoParaPagina(caminho: string, token: Token): string | null {
  const etapa = token ? etapaDoCadastro(token) : null;
  const telaQueFalta = etapa && etapa !== "completo" ? TELA_DA_ETAPA[etapa] : null;

  // Entrar / começar cadastro
  if (caminho === "/entrar" || caminho === "/cadastro") {
    if (!token) return null;
    return telaQueFalta ?? "/";
  }

  // Passos do cadastro depois de criar a conta
  if (dentro(caminho, "/cadastro")) {
    if (!token) return paraEntrar(caminho);
    if (caminho === "/cadastro/pronto") return telaQueFalta;
    if (caminho === telaQueFalta) return null;
    return telaQueFalta ?? "/cadastro/pronto";
  }

  // Páginas que só abrem com conta completa
  if (PAGINAS_COM_LOGIN.some((base) => dentro(caminho, base))) {
    if (!token) return paraEntrar(caminho);
    return telaQueFalta;
  }

  return null;
}

/** Só aceita voltar para páginas do próprio BicoJá (evita mandar a pessoa para site falso). */
export function caminhoSeguro(voltar: string | null | undefined): string {
  if (!voltar || !voltar.startsWith("/") || voltar.startsWith("//") || voltar.includes("\\")) return "/";
  return voltar;
}
