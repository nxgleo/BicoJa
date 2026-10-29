import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { esquemaPrestador, primeiroErro } from "@/lib/contas/esquemas";
import { virarPrestador } from "@/lib/contas/prestador";
import { ERRO_LIMITE, lerJson, limitar, responderErro } from "@/lib/contas/requisicao";
import { idDaSessao } from "@/lib/contas/sessao";

// PUT /api/contas/prestador — "Quero fazer bicos" (criar ou atualizar o perfil de prestador)
export async function PUT(req: Request) {
  const userId = await idDaSessao();
  if (!userId) return responderErro(401, "Entre na sua conta para continuar.");
  if (!(await limitar(`prestador:${userId}`, 10, 600))) return responderErro(429, ERRO_LIMITE);

  const validado = esquemaPrestador.safeParse(await lerJson(req));
  if (!validado.success) {
    const { campo, erro } = primeiroErro(validado.error);
    return responderErro(400, erro, campo);
  }
  try {
    const r = await virarPrestador(prisma, userId, validado.data);
    if (!r.ok) return responderErro(400, r.erro, r.campo);
    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("Erro ao salvar perfil de prestador:", erro);
    return responderErro(500, "Não conseguimos salvar agora. Tente de novo em instantes.");
  }
}
