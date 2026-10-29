import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { esquemaPagamento } from "@/lib/contratos/esquemas";
import { escolherPagamento } from "@/lib/contratos/contratos";
import { entregarEfeitos } from "@/lib/contratos/efeitos";
import { idDaSessao } from "@/lib/contas/sessao";
import { ERRO_LIMITE, lerJson, limitar, responderErro } from "@/lib/contas/requisicao";

// POST /api/contratos/:id/pagamento — { metodo: PIX | CARTAO | DIRETO } (simulado: nada de dinheiro de verdade)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await idDaSessao();
  if (!userId) return responderErro(401, "Entre na sua conta para continuar.");
  const validado = esquemaPagamento.safeParse(await lerJson(req));
  if (!validado.success) return responderErro(400, "Escolha como pagar.");
  if (!(await limitar(`pagamento:${userId}`, 20, 3600))) return responderErro(429, ERRO_LIMITE);

  const { id } = await params;
  const r = await escolherPagamento(prisma, id, userId, validado.data.metodo);
  if (!r.ok) return responderErro(r.status, r.erro);
  entregarEfeitos(r);
  return NextResponse.json({ ok: true });
}
