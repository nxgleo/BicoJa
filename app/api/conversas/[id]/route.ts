import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { abrirConversa } from "@/lib/chat/conversas";
import { exigirContaCompleta } from "@/lib/chat/requisicao";
import { responderErro } from "@/lib/contas/requisicao";

type Params = { params: Promise<{ id: string }> };

// GET /api/conversas/:id?antes=<data> — conversa e mensagens (50 por vez)
export async function GET(req: Request, { params }: Params) {
  const quem = await exigirContaCompleta();
  if ("resposta" in quem) return quem.resposta;
  const { id } = await params;
  const antes = new URL(req.url).searchParams.get("antes") ?? undefined;
  const conversa = await abrirConversa(prisma, id, quem.userId, antes);
  if (!conversa) return responderErro(404, "Conversa não encontrada.");
  return NextResponse.json({ ok: true, conversa });
}
