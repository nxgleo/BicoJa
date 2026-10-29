import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { esquemaAvaliacao } from "@/lib/contratos/esquemas";
import { avaliar } from "@/lib/contratos/contratos";
import { primeiroErro } from "@/lib/contas/esquemas";
import { idDaSessao } from "@/lib/contas/sessao";
import { ERRO_LIMITE, lerJson, limitar, responderErro } from "@/lib/contas/requisicao";

// POST /api/contratos/:id/avaliacao — { nota 1–5, comentario? } (uma por pessoa, só depois de concluir)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await idDaSessao();
  if (!userId) return responderErro(401, "Entre na sua conta para continuar.");
  const validado = esquemaAvaliacao.safeParse(await lerJson(req));
  if (!validado.success) {
    const e = primeiroErro(validado.error);
    return responderErro(400, e.erro, e.campo);
  }
  if (!(await limitar(`avaliacao:${userId}`, 30, 3600))) return responderErro(429, ERRO_LIMITE);

  const { id } = await params;
  const r = await avaliar(prisma, id, userId, validado.data);
  if (!r.ok) return responderErro(r.status, r.erro);
  return NextResponse.json({ ok: true }, { status: 201 });
}
