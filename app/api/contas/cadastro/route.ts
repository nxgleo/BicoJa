import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { criarConta } from "@/lib/contas/cadastro";
import { esquemaCadastro, primeiroErro } from "@/lib/contas/esquemas";
import { ERRO_LIMITE, ipDaRequisicao, lerJson, limitar, responderErro } from "@/lib/contas/requisicao";

// POST /api/contas/cadastro — passo "Seus dados". Depois do 201 a tela faz o login automático.
export async function POST(req: Request) {
  if (!(await limitar(`cadastro:${ipDaRequisicao(req)}`, 5, 600))) return responderErro(429, ERRO_LIMITE);

  const validado = esquemaCadastro.safeParse(await lerJson(req));
  if (!validado.success) {
    const { campo, erro } = primeiroErro(validado.error);
    return responderErro(400, erro, campo);
  }

  try {
    const resultado = await criarConta(prisma, validado.data);
    if (!resultado.ok) return responderErro(409, resultado.erro, resultado.campo);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (erro) {
    console.error("Erro ao criar conta:", erro);
    return responderErro(500, "Não conseguimos criar sua conta agora. Tente de novo em instantes.");
  }
}
