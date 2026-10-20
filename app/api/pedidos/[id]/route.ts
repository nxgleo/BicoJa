import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cancelarPedido, detalhePedido } from "@/lib/pedidos/pedidos";
import { lerJson, responderErro } from "@/lib/contas/requisicao";
import { idDaSessao } from "@/lib/contas/sessao";

type Contexto = { params: Promise<{ id: string }> };

// GET /api/pedidos/<id> — o dono vê tudo; os outros veem sem o endereço
export async function GET(_req: Request, { params }: Contexto) {
  const { id } = await params;
  const userId = await idDaSessao();
  const r = await detalhePedido(prisma, id, { userId: userId ?? undefined });
  if (!r) return responderErro(404, "Pedido não encontrado.");
  return NextResponse.json({ ok: true, ...r });
}

// PATCH /api/pedidos/<id> { acao: "cancelar" } — só o dono
export async function PATCH(req: Request, { params }: Contexto) {
  const { id } = await params;
  const userId = await idDaSessao();
  if (!userId) return responderErro(401, "Entre na sua conta para continuar.");
  const corpo = (await lerJson(req)) as { acao?: string } | null;
  if (corpo?.acao !== "cancelar") return responderErro(400, "Ação inválida.");

  const r = await cancelarPedido(prisma, id, userId);
  if (!r.ok) return responderErro(403, "Você não pode cancelar esse pedido.");
  return NextResponse.json({ ok: true });
}
