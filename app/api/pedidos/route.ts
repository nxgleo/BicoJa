import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { criarEsquemaPedido } from "@/lib/pedidos/esquemas";
import { criarPedido, meusPedidos } from "@/lib/pedidos/pedidos";
import { primeiroErro } from "@/lib/contas/esquemas";
import { ERRO_LIMITE, lerJson, limitar, responderErro } from "@/lib/contas/requisicao";
import { idDaSessao } from "@/lib/contas/sessao";
import { avisarPrestadoresDoUrgente } from "@/lib/pedidos/avisar-urgente";
import { avisar } from "@/lib/chat/tempo-real";

// POST /api/pedidos — publicar pedido (normal ou urgente)
export async function POST(req: Request) {
  const userId = await idDaSessao();
  if (!userId) return responderErro(401, "Entre na sua conta para continuar.");

  const validado = criarEsquemaPedido(new Date()).safeParse(await lerJson(req));
  if (!validado.success) {
    const issue = validado.error.issues[0];
    // Erros do "quando" vêm como quando.dataFim etc.; a tela usa o nome do campo de dentro
    const campo = issue?.path[0] === "quando" ? `quando.${String(issue.path[1])}` : primeiroErro(validado.error).campo;
    return responderErro(400, issue?.message ?? "Confira os dados.", campo);
  }
  if (!(await limitar(`pedidos:${userId}`, 10, 3600))) return responderErro(429, ERRO_LIMITE);

  const r = await criarPedido(prisma, userId, validado.data);
  if (!r.ok) return responderErro(400, r.erro, r.campo);
  if (validado.data.urgente) {
    // Não faz a pessoa esperar: avisa os prestadores em segundo plano
    void avisarPrestadoresDoUrgente(prisma, r.id)
      .then((avisados) => avisar(avisados, "aviso:novo", {}))
      .catch(() => {});
  }
  return NextResponse.json({ ok: true, id: r.id }, { status: 201 });
}

// GET /api/pedidos — meus pedidos
export async function GET() {
  const userId = await idDaSessao();
  if (!userId) return responderErro(401, "Entre na sua conta para continuar.");
  return NextResponse.json({ ok: true, pedidos: await meusPedidos(prisma, userId) });
}
