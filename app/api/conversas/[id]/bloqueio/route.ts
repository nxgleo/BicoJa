import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bloquear } from "@/lib/chat/conversas";
import { idDaSessao } from "@/lib/contas/sessao";
import { responderErro } from "@/lib/contas/requisicao";

type Params = { params: Promise<{ id: string }> };

async function mudar(params: Params["params"], bloqueado: boolean) {
  const userId = await idDaSessao();
  if (!userId) return responderErro(401, "Entre na sua conta para continuar.");
  const { id } = await params;
  if (!(await bloquear(prisma, id, userId, bloqueado))) return responderErro(404, "Conversa não encontrada.");
  return NextResponse.json({ ok: true, bloqueado });
}

// POST bloqueia a outra pessoa; DELETE desbloqueia
export async function POST(_req: Request, { params }: Params) {
  return mudar(params, true);
}

export async function DELETE(_req: Request, { params }: Params) {
  return mudar(params, false);
}
