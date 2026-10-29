import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { esquemaDenuncia } from "@/lib/chat/esquemas";
import { denunciar } from "@/lib/chat/conversas";
import { idDaSessao } from "@/lib/contas/sessao";
import { primeiroErro } from "@/lib/contas/esquemas";
import { ERRO_LIMITE, lerJson, limitar, responderErro } from "@/lib/contas/requisicao";

// POST /api/conversas/:id/denuncia — guarda a denúncia para a equipe revisar
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await idDaSessao();
  if (!userId) return responderErro(401, "Entre na sua conta para continuar.");
  const validado = esquemaDenuncia.safeParse(await lerJson(req));
  if (!validado.success) {
    const e = primeiroErro(validado.error);
    return responderErro(400, e.erro, e.campo);
  }
  if (!(await limitar(`denuncias:${userId}`, 10, 86400))) return responderErro(429, ERRO_LIMITE);
  const { id } = await params;
  if (!(await denunciar(prisma, id, userId, validado.data))) return responderErro(404, "Conversa não encontrada.");
  return NextResponse.json({ ok: true }, { status: 201 });
}
