import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { criarEsquemaProposta } from "@/lib/chat/esquemas";
import { enviarProposta } from "@/lib/chat/conversas";
import { avisar } from "@/lib/chat/tempo-real";
import { exigirContaCompleta, pushParaOutro, responderFalha } from "@/lib/chat/requisicao";
import { primeiroErro } from "@/lib/contas/esquemas";
import { ERRO_LIMITE, lerJson, limitar, responderErro } from "@/lib/contas/requisicao";

// POST /api/conversas/:id/propostas — valor + quando (troca a proposta que estava esperando resposta)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const quem = await exigirContaCompleta();
  if ("resposta" in quem) return quem.resposta;
  const validado = criarEsquemaProposta(new Date()).safeParse(await lerJson(req));
  if (!validado.success) {
    const issue = validado.error.issues[0];
    const campo = issue?.path[0] === "quando" ? `quando.${String(issue.path[1])}` : primeiroErro(validado.error).campo;
    return responderErro(400, issue?.message ?? "Confira os dados.", campo);
  }
  if (!(await limitar(`propostas:${quem.userId}`, 30, 3600))) return responderErro(429, ERRO_LIMITE);

  const { id } = await params;
  const r = await enviarProposta(prisma, id, quem.userId, validado.data);
  if (!r.ok) return responderFalha(r);
  avisar(r.avisar, "chat:mensagens", { conversaId: id, mensagens: r.mensagens });
  pushParaOutro(r.avisar, quem.userId, id, `${quem.nome} mandou uma proposta`);
  return NextResponse.json({ ok: true, mensagens: r.mensagens }, { status: 201 });
}
