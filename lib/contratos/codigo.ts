// Código de conclusão de 4 dígitos (estilo iFood).
// Fica guardado cifrado no banco: o cliente pode ver de novo, mas quem olhar o banco não lê o número.
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

function chave(): Buffer {
  const segredo = process.env.NEXTAUTH_SECRET;
  if (!segredo) throw new Error("NEXTAUTH_SECRET não configurado");
  return createHash("sha256").update(`codigo-conclusao:${segredo}`).digest();
}

export function gerarCodigo(): string {
  return String(randomInt(0, 10_000)).padStart(4, "0");
}

/** "1234" → "iv.tag.texto" (AES-256-GCM, em base64url) */
export function cifrarCodigo(codigo: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave(), iv);
  const texto = Buffer.concat([c.update(codigo, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), texto].map((b) => b.toString("base64url")).join(".");
}

export function decifrarCodigo(cifrado: string): string | null {
  try {
    const [iv, tag, texto] = cifrado.split(".").map((p) => Buffer.from(p, "base64url"));
    const d = createDecipheriv("aes-256-gcm", chave(), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(texto), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** Compara sem dar pista pelo tempo de resposta. */
export function codigoConfere(digitado: string, cifrado: string): boolean {
  const certo = decifrarCodigo(cifrado);
  if (!certo || !/^\d{4}$/.test(digitado)) return false;
  return timingSafeEqual(Buffer.from(digitado), Buffer.from(certo));
}
