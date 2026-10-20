import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { criarAnuncio, meusAnuncios } from "@/lib/anuncios/anuncios";
import { esquemaAnuncio } from "@/lib/anuncios/esquemas";
import { primeiroErro } from "@/lib/contas/esquemas";
import { ERRO_LIMITE, lerJson, limitar, responderErro } from "@/lib/contas/requisicao";
import { idDaSessao } from "@/lib/contas/sessao";

const SEM_PERFIL = "Primeiro conte o que você faz no \"Quero fazer bicos\".";

// POST /api/anuncios — criar anúncio
export async function POST(req: Request) {
  const userId = await idDaSessao();
  if (!userId) return responderErro(401, "Entre na sua conta para continuar.");

  const validado = esquemaAnuncio.safeParse(await lerJson(req));
  if (!validado.success) {
    const { campo, erro } = primeiroErro(validado.error);
    return responderErro(400, erro, campo);
  }
  if (!(await limitar(`anuncios:${userId}`, 30, 3600))) return responderErro(429, ERRO_LIMITE);

  const r = await criarAnuncio(prisma, userId, validado.data);
  if (!r.ok) {
    if ("semPerfil" in r) return responderErro(403, SEM_PERFIL, undefined, { semPerfil: true });
    return responderErro(400, r.erro, r.campo);
  }
  return NextResponse.json({ ok: true, id: r.id }, { status: 201 });
}

// GET /api/anuncios — meus anúncios
export async function GET() {
  const userId = await idDaSessao();
  if (!userId) return responderErro(401, "Entre na sua conta para continuar.");
  return NextResponse.json({ ok: true, anuncios: await meusAnuncios(prisma, userId) });
}
