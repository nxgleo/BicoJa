import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enviarCodigo } from "@/lib/contas/codigos";
import { esquemaRecuperar, primeiroErro } from "@/lib/contas/esquemas";
import { ERRO_LIMITE, ipDaRequisicao, lerJson, limitar, responderErro } from "@/lib/contas/requisicao";

// POST /api/contas/senha/recuperar — "Esqueci minha senha".
// Sempre responde ok: não contamos para ninguém se um email tem conta ou não.
export async function POST(req: Request) {
  if (!(await limitar(`senha-recuperar:${ipDaRequisicao(req)}`, 5, 600))) return responderErro(429, ERRO_LIMITE);

  const validado = esquemaRecuperar.safeParse(await lerJson(req));
  if (!validado.success) return responderErro(400, primeiroErro(validado.error).erro, "email");

  const user = await prisma.user.findUnique({ where: { email: validado.data.email }, select: { id: true } });
  if (user) {
    await enviarCodigo(prisma, user.id, "RECUPERAR_SENHA").catch((erro) => {
      console.error("Erro ao enviar código de recuperação:", erro);
    });
  }
  return NextResponse.json({ ok: true });
}
