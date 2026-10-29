import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processarPrazos } from "@/lib/contratos/contratos";
import { entregarEfeitos } from "@/lib/contratos/efeitos";
import { temChaveInterna } from "@/lib/chave-interna";

// POST /api/interno/prazos — chamado pelo server.js a cada 15 minutos (avisos de 3/6 dias e liberação aos 7).
// A chave é a mesma conta feita no server.js: sha256("prazos:" + NEXTAUTH_SECRET).
export async function POST(req: Request) {
  if (!temChaveInterna(req, "prazos")) return new Response("Não encontrado", { status: 404 });
  const efeitos = await processarPrazos(prisma);
  entregarEfeitos(efeitos);
  return NextResponse.json({ ok: true, alterados: efeitos.contrato.length });
}
