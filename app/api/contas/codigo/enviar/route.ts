import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enviarCodigo } from "@/lib/contas/codigos";
import { ERRO_LIMITE, ipDaRequisicao, limitar, responderErro } from "@/lib/contas/requisicao";
import { idDaSessao } from "@/lib/contas/sessao";

// POST /api/contas/codigo/enviar — manda (de novo) o código de confirmação do email
export async function POST(req: Request) {
  const userId = await idDaSessao();
  if (!userId) return responderErro(401, "Entre na sua conta para continuar.");

  const ip = ipDaRequisicao(req);
  if (!(await limitar(`codigo-enviar:${userId}`, 5, 600)) || !(await limitar(`codigo-enviar-ip:${ip}`, 5, 600))) {
    return responderErro(429, ERRO_LIMITE);
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true } });
  if (user?.emailVerified) return NextResponse.json({ ok: true, jaConfirmado: true });

  const r = await enviarCodigo(prisma, userId, "EMAIL_CADASTRO");
  if (!r.ok) {
    return responderErro(429, `Espere ${r.esperarSegundos} segundos para pedir outro código.`, undefined, {
      esperarSegundos: r.esperarSegundos,
    });
  }
  return NextResponse.json({ ok: true });
}
