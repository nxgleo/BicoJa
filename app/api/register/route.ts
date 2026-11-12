import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { criarConta } from "@/lib/contas/cadastro";
import { enviarCodigo } from "@/lib/contas/codigos";
import { confirmarEmailLigado } from "@/lib/contas/config";
import { esquemaCadastro, primeiroErro } from "@/lib/contas/esquemas";
import { ERRO_LIMITE, ipDaRequisicao, lerJson, limitar, responderErro } from "@/lib/contas/requisicao";

export async function POST(req: Request) {
  const validado = esquemaCadastro.safeParse(await lerJson(req));
  if (!validado.success) {
    const { campo, erro } = primeiroErro(validado.error);
    return responderErro(400, erro, campo);
  }

  if (!(await limitar(`cadastro:${ipDaRequisicao(req)}`, 20, 600)))
    return responderErro(429, ERRO_LIMITE);

  try {
    const resultado = await criarConta(prisma, validado.data);
    if (!resultado.ok) return responderErro(409, resultado.erro, resultado.campo);

    if (confirmarEmailLigado()) {
      await enviarCodigo(prisma, resultado.userId, "EMAIL_CADASTRO").catch((erro) => {
        console.error("Erro ao enviar código do cadastro:", erro);
      });
    }

    return NextResponse.json({ ok: true, data: { userId: resultado.userId } }, { status: 201 });
  } catch (erro) {
    console.error("Erro ao criar conta via /api/register:", erro);
    return responderErro(500, "Não conseguimos criar sua conta agora. Tente de novo em instantes.");
  }
}
