import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { criarConta } from "@/lib/contas/cadastro";
import { enviarCodigo } from "@/lib/contas/codigos";
import { confirmarEmailLigado } from "@/lib/contas/config";
import { esquemaCadastro, primeiroErro } from "@/lib/contas/esquemas";
import { ERRO_LIMITE, ipDaRequisicao, lerJson, limitar, responderErro } from "@/lib/contas/requisicao";

// POST /api/contas/cadastro — passo "Seus dados". Depois do 201 a tela faz o login automático.
export async function POST(req: Request) {
  const validado = esquemaCadastro.safeParse(await lerJson(req));
  if (!validado.success) {
    const { campo, erro } = primeiroErro(validado.error);
    return responderErro(400, erro, campo);
  }

  // Só conta no limite depois de passar na validação: errar a digitação não bloqueia ninguém.
  // 20 por IP em 10 minutos (várias pessoas podem dividir o mesmo IP da operadora).
  if (!(await limitar(`cadastro:${ipDaRequisicao(req)}`, 20, 600))) return responderErro(429, ERRO_LIMITE);

  try {
    const resultado = await criarConta(prisma, validado.data);
    if (!resultado.ok) return responderErro(409, resultado.erro, resultado.campo);
    // Já manda o código para o email. Se falhar, a tela do código tem "Mandar de novo".
    if (confirmarEmailLigado()) {
      await enviarCodigo(prisma, resultado.userId, "EMAIL_CADASTRO").catch((erro) => {
        console.error("Erro ao enviar código do cadastro:", erro);
      });
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (erro) {
    console.error("Erro ao criar conta:", erro);
    return responderErro(500, "Não conseguimos criar sua conta agora. Tente de novo em instantes.");
  }
}
