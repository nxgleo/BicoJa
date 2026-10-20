import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { esquemaMensagem } from "@/lib/chat/esquemas";
import { enviarMensagem } from "@/lib/chat/conversas";
import { avisar } from "@/lib/chat/tempo-real";
import { exigirContaCompleta, pushParaOutro, responderFalha } from "@/lib/chat/requisicao";
import { primeiroErro } from "@/lib/contas/esquemas";
import { lerJson, limitar, responderErro } from "@/lib/contas/requisicao";

// POST /api/conversas/:id/mensagens — texto e/ou 1 foto
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const quem = await exigirContaCompleta();
  if ("resposta" in quem) return quem.resposta;
  const validado = esquemaMensagem.safeParse(await lerJson(req));
  if (!validado.success) {
    const e = primeiroErro(validado.error);
    return responderErro(400, e.erro, e.campo);
  }
  if (!(await limitar(`mensagens:${quem.userId}`, 40, 60))) return responderErro(429, "Você está mandando muitas mensagens seguidas. Espere um pouco.");

  const { id } = await params;
  const r = await enviarMensagem(prisma, id, quem.userId, validado.data);
  if (!r.ok) return responderFalha(r);
  avisar(r.avisar, "chat:mensagens", { conversaId: id, mensagens: r.mensagens });
  pushParaOutro(r.avisar, quem.userId, id, validado.data.fotoUrl ? `${quem.nome} mandou uma foto` : `${quem.nome} mandou uma mensagem`);
  return NextResponse.json({ ok: true, mensagens: r.mensagens }, { status: 201 });
}
