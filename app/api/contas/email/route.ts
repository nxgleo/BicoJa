import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { trocarEmailNaoConfirmado } from "@/lib/contas/cadastro";
import { enviarCodigo } from "@/lib/contas/codigos";
import { esquemaTrocarEmail, primeiroErro } from "@/lib/contas/esquemas";
import { ERRO_LIMITE, lerJson, limitar, responderErro } from "@/lib/contas/requisicao";
import { idDaSessao } from "@/lib/contas/sessao";

// PATCH /api/contas/email — "Corrigir o email" antes de confirmar; manda código para o novo
export async function PATCH(req: Request) {
  const userId = await idDaSessao();
  if (!userId) return responderErro(401, "Entre na sua conta para continuar.");
  if (!(await limitar(`trocar-email:${userId}`, 5, 600))) return responderErro(429, ERRO_LIMITE);

  const validado = esquemaTrocarEmail.safeParse(await lerJson(req));
  if (!validado.success) return responderErro(400, primeiroErro(validado.error).erro, "email");

  const r = await trocarEmailNaoConfirmado(prisma, userId, validado.data.email);
  if (!r.ok) return responderErro(409, r.erro, "email");

  await enviarCodigo(prisma, userId, "EMAIL_CADASTRO").catch((erro) => console.error("Erro ao enviar código:", erro));
  return NextResponse.json({ ok: true });
}
