import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processarPrazos } from "@/lib/contratos/contratos";
import { avisarEfeitos } from "@/lib/chat/tempo-real";

/** Chave que só o próprio servidor conhece (derivada do NEXTAUTH_SECRET). Mesma conta do server.js. */
function chaveInterna(): string {
  return createHash("sha256").update(`prazos:${process.env.NEXTAUTH_SECRET ?? ""}`).digest("hex");
}

// POST /api/interno/prazos — chamado pelo server.js a cada 15 minutos (avisos de 3/6 dias e liberação aos 7)
export async function POST(req: Request) {
  const recebida = Buffer.from(req.headers.get("x-chave-interna") ?? "");
  const certa = Buffer.from(chaveInterna());
  if (!process.env.NEXTAUTH_SECRET || recebida.length !== certa.length || !timingSafeEqual(recebida, certa)) {
    return new Response("Não encontrado", { status: 404 });
  }
  const efeitos = await processarPrazos(prisma);
  avisarEfeitos(efeitos);
  return NextResponse.json({ ok: true, alterados: efeitos.contrato.length });
}
