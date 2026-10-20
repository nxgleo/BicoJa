import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { editarAnuncio } from "@/lib/anuncios/anuncios";
import { esquemaEditarAnuncio } from "@/lib/anuncios/esquemas";
import { primeiroErro } from "@/lib/contas/esquemas";
import { ERRO_LIMITE, lerJson, limitar, responderErro } from "@/lib/contas/requisicao";
import { idDaSessao } from "@/lib/contas/sessao";

// PATCH /api/anuncios/<id> — editar, pausar ({ ativo: false }) ou ativar ({ ativo: true })
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await idDaSessao();
  if (!userId) return responderErro(401, "Entre na sua conta para continuar.");
  if (!(await limitar(`anuncios:${userId}`, 30, 3600))) return responderErro(429, ERRO_LIMITE);

  const validado = esquemaEditarAnuncio.safeParse(await lerJson(req));
  if (!validado.success) {
    const { campo, erro } = primeiroErro(validado.error);
    return responderErro(400, erro, campo);
  }
  const r = await editarAnuncio(prisma, id, userId, validado.data);
  if (!r.ok) {
    if ("semPerfil" in r) return responderErro(403, "Primeiro faça o \"Quero fazer bicos\".", undefined, { semPerfil: true });
    if (r.campo === "id") return responderErro(404, r.erro);
    return responderErro(400, r.erro, r.campo);
  }
  return NextResponse.json({ ok: true });
}
