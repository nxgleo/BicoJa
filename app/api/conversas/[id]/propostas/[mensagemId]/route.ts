import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { esquemaResposta } from "@/lib/chat/esquemas";
import { responderProposta } from "@/lib/chat/conversas";
import { avisar } from "@/lib/chat/tempo-real";
import { exigirContaCompleta, responderFalha } from "@/lib/chat/requisicao";
import { ERRO_LIMITE, lerJson, limitar, responderErro } from "@/lib/contas/requisicao";

type Params = { params: Promise<{ id: string; mensagemId: string }> };

// POST /api/conversas/:id/propostas/:mensagemId — { acao: "aceitar" | "recusar" }
export async function POST(req: Request, { params }: Params) {
  const quem = await exigirContaCompleta();
  if ("resposta" in quem) return quem.resposta;
  const validado = esquemaResposta.safeParse(await lerJson(req));
  if (!validado.success) return responderErro(400, "Escolha aceitar ou recusar.");
  if (!(await limitar(`respostas:${quem.userId}`, 30, 3600))) return responderErro(429, ERRO_LIMITE);

  const { id, mensagemId } = await params;
  const r = await responderProposta(prisma, id, mensagemId, quem.userId, validado.data.acao);
  if (!r.ok) return responderFalha(r);
  avisar(r.avisar, "chat:mensagens", { conversaId: id, mensagens: r.mensagens });
  for (const o of r.conversasAvisadas ?? []) {
    avisar(o.avisar, "chat:mensagens", { conversaId: o.conversaId, mensagens: o.mensagens });
  }
  return NextResponse.json({ ok: true, mensagens: r.mensagens });
}
