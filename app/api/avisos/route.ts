import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contarAvisosNaoLidos, listarAvisos } from "@/lib/avisos";
import { idDaSessao } from "@/lib/contas/sessao";

// GET /api/avisos — os avisos do sininho; ?contar=1 devolve só quantos não foram lidos
export async function GET(req: Request) {
  const userId = await idDaSessao();
  if (!userId) return NextResponse.json({ ok: true, naoLidos: 0, avisos: [] });
  if (new URL(req.url).searchParams.get("contar")) {
    return NextResponse.json({ ok: true, naoLidos: await contarAvisosNaoLidos(prisma, userId) });
  }
  return NextResponse.json({ ok: true, avisos: await listarAvisos(prisma, userId) });
}
