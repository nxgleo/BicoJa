// Roda antes de cada página: pede login onde precisa, retoma o cadastro do passo que falta
// e encerra a sessão de quem saiu do cadastro antes de confirmar o email.
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { destinoParaPagina, deveEncerrarSessao } from "@/lib/contas/etapa";

// Cookie do login do NextAuth (com "__Secure-" no https; pode vir dividido em .0, .1…)
const COOKIE_SESSAO = /^(__Secure-)?next-auth\.session-token(\.\d+)?$/;

export async function middleware(req: NextRequest) {
  let token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const caminho = req.nextUrl.pathname;

  // Pré-carregamento de links não é a pessoa saindo: não encerra nada
  const preCarregando = req.headers.has("next-router-prefetch") || req.headers.get("purpose") === "prefetch";
  const encerrar = !preCarregando && deveEncerrarSessao(caminho, token);
  const cookies = encerrar ? req.cookies.getAll().filter((c) => COOKIE_SESSAO.test(c.name)) : [];
  if (encerrar) {
    token = null;
    for (const c of cookies) req.cookies.delete(c.name); // a própria página já abre deslogada
  }

  const destino = destinoParaPagina(caminho, token);
  const res =
    !destino || destino === caminho
      ? NextResponse.next({ request: { headers: req.headers } })
      : NextResponse.redirect(new URL(destino, req.url));
  for (const c of cookies) res.cookies.delete(c.name);
  return res;
}

export const config = {
  // Não roda em API, arquivos do Next, ícones, logo, service worker e manifest
  matcher: ["/((?!api|_next|icones|logo.png|sw.js|manifest.webmanifest|favicon.ico).*)"],
};
