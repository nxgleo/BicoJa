import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { detalheContrato } from "@/lib/contratos/contratos";
import { idDaSessao } from "@/lib/contas/sessao";
import { responderErro } from "@/lib/contas/requisicao";

// GET /api/contratos/:id — o serviço combinado (o código só vem para o cliente)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await idDaSessao();
  if (!userId) return responderErro(401, "Entre na sua conta para continuar.");
  const { id } = await params;
  const contrato = await detalheContrato(prisma, id, userId);
  if (!contrato) return responderErro(404, "Serviço não encontrado.");
  return NextResponse.json({ ok: true, contrato }, { headers: { "Cache-Control": "no-store" } });
}
