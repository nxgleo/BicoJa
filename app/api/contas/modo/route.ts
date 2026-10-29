import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { esquemaModo } from "@/lib/contas/esquemas";
import { trocarModo } from "@/lib/contas/perfil";
import { ERRO_LIMITE, lerJson, limitar, responderErro } from "@/lib/contas/requisicao";
import { idDaSessao } from "@/lib/contas/sessao";

// PATCH /api/contas/modo — trocar entre modo cliente e modo prestador
export async function PATCH(req: Request) {
  const userId = await idDaSessao();
  if (!userId) return responderErro(401, "Entre na sua conta para continuar.");
  if (!(await limitar(`modo:${userId}`, 20, 600))) return responderErro(429, ERRO_LIMITE);

  const validado = esquemaModo.safeParse(await lerJson(req));
  if (!validado.success) return responderErro(400, "Modo inválido.");

  const r = await trocarModo(prisma, userId, validado.data.modo);
  if (!r.ok) {
    return responderErro(409, "Primeiro conte o que você faz no \"Quero fazer bicos\".", undefined, {
      precisaVirarPrestador: true,
    });
  }
  return NextResponse.json({ ok: true });
}
