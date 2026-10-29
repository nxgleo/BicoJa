import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { conferirCodigo, mensagemDoCodigo } from "@/lib/contas/codigos";
import { esquemaCodigo, primeiroErro } from "@/lib/contas/esquemas";
import { ERRO_LIMITE, lerJson, limitar, responderErro } from "@/lib/contas/requisicao";
import { idDaSessao } from "@/lib/contas/sessao";

// POST /api/contas/codigo/confirmar — confere o código e marca o email como confirmado
export async function POST(req: Request) {
  const userId = await idDaSessao();
  if (!userId) return responderErro(401, "Entre na sua conta para continuar.");
  if (!(await limitar(`codigo-confirmar:${userId}`, 10, 600))) return responderErro(429, ERRO_LIMITE);

  const validado = esquemaCodigo.safeParse(await lerJson(req));
  if (!validado.success) return responderErro(400, primeiroErro(validado.error).erro, "codigo");

  const r = await conferirCodigo(prisma, userId, "EMAIL_CADASTRO", validado.data.codigo);
  if (!r.ok) return responderErro(400, mensagemDoCodigo(r), "codigo", { motivo: r.motivo });
  return NextResponse.json({ ok: true });
}
