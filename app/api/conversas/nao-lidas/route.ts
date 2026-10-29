import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { totalNaoLidas } from "@/lib/chat/conversas";
import { idDaSessao } from "@/lib/contas/sessao";

// GET /api/conversas/nao-lidas — número para o menu e a bolha
export async function GET() {
  const userId = await idDaSessao();
  if (!userId) return NextResponse.json({ ok: true, total: 0 });
  return NextResponse.json({ ok: true, total: await totalNaoLidas(prisma, userId) });
}
