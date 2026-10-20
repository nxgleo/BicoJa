import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { esquemaIniciarConversa } from "@/lib/chat/esquemas";
import { iniciarConversa, listarConversas } from "@/lib/chat/conversas";
import { exigirContaCompleta, responderFalha } from "@/lib/chat/requisicao";
import { ERRO_LIMITE, lerJson, limitar, responderErro } from "@/lib/contas/requisicao";

// GET /api/conversas — minhas conversas
export async function GET() {
  const quem = await exigirContaCompleta();
  if ("resposta" in quem) return quem.resposta;
  return NextResponse.json({ ok: true, conversas: await listarConversas(prisma, quem.userId) });
}

// POST /api/conversas — começar (ou reabrir) conversa a partir de anúncio, pedido ou perfil
export async function POST(req: Request) {
  const quem = await exigirContaCompleta();
  if ("resposta" in quem) return quem.resposta;
  const validado = esquemaIniciarConversa.safeParse(await lerJson(req));
  if (!validado.success) return responderErro(400, "Não deu para abrir a conversa.");
  if (!(await limitar(`conversas:${quem.userId}`, 30, 3600))) return responderErro(429, ERRO_LIMITE);

  const r = await iniciarConversa(prisma, quem.userId, validado.data);
  if (!r.ok) return responderFalha(r);
  return NextResponse.json({ ok: true, id: r.id });
}
