// Chaves que só o próprio servidor conhece (derivadas do NEXTAUTH_SECRET), para rotas internas.
import { createHash, timingSafeEqual } from "node:crypto";

export function chaveInterna(uso: "prazos" | "push"): string {
  return createHash("sha256").update(`${uso}:${process.env.NEXTAUTH_SECRET ?? ""}`).digest("hex");
}

/** A requisição trouxe a chave certa no cabeçalho x-chave-interna? */
export function temChaveInterna(req: Request, uso: "prazos" | "push"): boolean {
  if (!process.env.NEXTAUTH_SECRET) return false;
  const recebida = Buffer.from(req.headers.get("x-chave-interna") ?? "");
  const certa = Buffer.from(chaveInterna(uso));
  return recebida.length === certa.length && timingSafeEqual(recebida, certa);
}
