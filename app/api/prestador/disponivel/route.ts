import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mudarDisponibilidade } from "@/lib/prestadores";
import { ERRO_LIMITE, lerJson, limitar, responderErro } from "@/lib/contas/requisicao";
import { idDaSessao } from "@/lib/contas/sessao";

// PATCH /api/prestador/disponivel { ligado: boolean } — "Estou disponível agora" (desliga sozinho em 8 horas)
export async function PATCH(req: Request) {
  const userId = await idDaSessao();
  if (!userId) return responderErro(401, "Entre na sua conta para continuar.");
  if (!(await limitar(`disponivel:${userId}`, 30, 600))) return responderErro(429, ERRO_LIMITE);

  const corpo = (await lerJson(req)) as { ligado?: unknown } | null;
  if (typeof corpo?.ligado !== "boolean") return responderErro(400, "Pedido inválido.");

  const r = await mudarDisponibilidade(prisma, userId, corpo.ligado);
  if (!r.ok) return responderErro(403, "Primeiro faça o \"Quero fazer bicos\".", undefined, { semPerfil: true });
  return NextResponse.json({ ok: true, disponivelAte: r.disponivelAte });
}
