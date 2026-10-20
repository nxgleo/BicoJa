import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { esquemaPerfil, primeiroErro } from "@/lib/contas/esquemas";
import { atualizarPerfil } from "@/lib/contas/perfil";
import { ERRO_LIMITE, lerJson, limitar, responderErro } from "@/lib/contas/requisicao";
import { idDaSessao } from "@/lib/contas/sessao";

// PATCH /api/contas/perfil — editar nome e celular
export async function PATCH(req: Request) {
  const userId = await idDaSessao();
  if (!userId) return responderErro(401, "Entre na sua conta para continuar.");
  if (!(await limitar(`perfil:${userId}`, 10, 600))) return responderErro(429, ERRO_LIMITE);

  const validado = esquemaPerfil.safeParse(await lerJson(req));
  if (!validado.success) {
    const { campo, erro } = primeiroErro(validado.error);
    return responderErro(400, erro, campo);
  }
  const r = await atualizarPerfil(prisma, userId, validado.data);
  if (!r.ok) return responderErro(409, r.erro, r.campo);
  return NextResponse.json({ ok: true });
}
