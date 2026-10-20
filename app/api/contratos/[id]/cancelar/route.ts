import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { esquemaCancelar } from "@/lib/contratos/esquemas";
import { cancelarContrato } from "@/lib/contratos/contratos";
import { avisarEfeitos } from "@/lib/chat/tempo-real";
import { idDaSessao } from "@/lib/contas/sessao";
import { ERRO_LIMITE, lerJson, limitar, responderErro } from "@/lib/contas/requisicao";

const esquema = z.union([esquemaCancelar, z.object({ motivo: z.literal("nao_aconteceu") })]);

// POST /api/contratos/:id/cancelar — { motivo } (ou "nao_aconteceu", só para o cliente depois de 3 dias)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await idDaSessao();
  if (!userId) return responderErro(401, "Entre na sua conta para continuar.");
  const validado = esquema.safeParse(await lerJson(req));
  if (!validado.success) return responderErro(400, "Escolha o motivo.", "motivo");
  if (!(await limitar(`cancelar:${userId}`, 20, 3600))) return responderErro(429, ERRO_LIMITE);

  const { id } = await params;
  const r = await cancelarContrato(prisma, id, userId, validado.data.motivo);
  if (!r.ok) return responderErro(r.status, r.erro);
  avisarEfeitos(r);
  return NextResponse.json({ ok: true });
}
