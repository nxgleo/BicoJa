import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { esquemaConcluir } from "@/lib/contratos/esquemas";
import { concluirComCodigo } from "@/lib/contratos/contratos";
import { avisarEfeitos } from "@/lib/chat/tempo-real";
import { primeiroErro } from "@/lib/contas/esquemas";
import { idDaSessao } from "@/lib/contas/sessao";
import { ERRO_LIMITE, lerJson, limitar, responderErro } from "@/lib/contas/requisicao";

// POST /api/contratos/:id/concluir — { codigo } que o cliente mostrou
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await idDaSessao();
  if (!userId) return responderErro(401, "Entre na sua conta para continuar.");
  const validado = esquemaConcluir.safeParse(await lerJson(req));
  if (!validado.success) {
    const e = primeiroErro(validado.error);
    return responderErro(400, e.erro, e.campo);
  }
  // Além das 5 tentativas a cada 15 min por serviço, no máximo 30 por dia por pessoa (adivinhar 4 números fica inviável)
  if (!(await limitar(`concluir:${userId}`, 30, 86400))) return responderErro(429, ERRO_LIMITE, "codigo");

  const { id } = await params;
  const r = await concluirComCodigo(prisma, id, userId, validado.data.codigo);
  if (!r.ok) return responderErro(r.status, r.erro, r.campo);
  avisarEfeitos(r);
  return NextResponse.json({ ok: true });
}
