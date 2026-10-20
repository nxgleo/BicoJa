import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redefinirSenha } from "@/lib/contas/codigos";
import { esquemaRedefinirSenha, primeiroErro } from "@/lib/contas/esquemas";
import { ERRO_LIMITE, ipDaRequisicao, lerJson, limitar, responderErro } from "@/lib/contas/requisicao";

// POST /api/contas/senha/redefinir — código do email + senha nova
export async function POST(req: Request) {
  if (!(await limitar(`senha-redefinir:${ipDaRequisicao(req)}`, 10, 600))) return responderErro(429, ERRO_LIMITE);

  const validado = esquemaRedefinirSenha.safeParse(await lerJson(req));
  if (!validado.success) {
    const { campo, erro } = primeiroErro(validado.error);
    return responderErro(400, erro, campo);
  }

  const { email, codigo, novaSenha } = validado.data;
  const r = await redefinirSenha(prisma, email, codigo, novaSenha);
  if (!r.ok) return responderErro(400, r.erro, "codigo");
  return NextResponse.json({ ok: true });
}
