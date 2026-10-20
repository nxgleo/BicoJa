import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { marcarAvisosLidos } from "@/lib/avisos";
import { idDaSessao } from "@/lib/contas/sessao";
import { responderErro } from "@/lib/contas/requisicao";

// POST /api/avisos/lidos — marca todos os avisos como lidos
export async function POST() {
  const userId = await idDaSessao();
  if (!userId) return responderErro(401, "Entre na sua conta para continuar.");
  await marcarAvisosLidos(prisma, userId);
  return NextResponse.json({ ok: true });
}
