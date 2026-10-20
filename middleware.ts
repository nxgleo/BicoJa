// Roda antes de cada página: pede login onde precisa e retoma o cadastro do passo que falta.
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { destinoParaPagina } from "@/lib/contas/etapa";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const destino = destinoParaPagina(req.nextUrl.pathname, token);
  if (!destino || destino === req.nextUrl.pathname) return NextResponse.next();
  return NextResponse.redirect(new URL(destino, req.url));
}

export const config = {
  // Não roda em API, arquivos do Next, ícones, logo, service worker e manifest
  matcher: ["/((?!api|_next|icones|logo.png|sw.js|manifest.webmanifest|favicon.ico).*)"],
};
