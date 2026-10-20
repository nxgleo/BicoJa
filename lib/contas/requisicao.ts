// Ajudantes comuns das rotas de conta.
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

export function ipDaRequisicao(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

/** true = pode seguir; false = passou do limite. */
export async function limitar(chave: string, limite: number, janelaSeg: number): Promise<boolean> {
  const resultado = await checkRateLimit(chave, limite, janelaSeg);
  return resultado.success;
}

export function responderErro(status: number, erro: string, campo?: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, erro, campo, ...extra }, { status });
}

export const ERRO_LIMITE = "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.";

/** Lê o corpo JSON sem quebrar se vier vazio ou inválido. */
export async function lerJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
