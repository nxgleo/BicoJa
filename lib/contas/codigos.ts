// Códigos de 6 números enviados por email: confirmar cadastro e recuperar senha.
// Regras: valem 10 minutos, 5 tentativas, novo só depois de 60 segundos, banco guarda só o hash.
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import type { PrismaClient, TipoCodigo } from "@prisma/client";
import { enviarEmail } from "@/lib/email";

const VALIDADE_MS = 10 * 60_000;
const ESPERA_MS = 60_000;
const MAX_TENTATIVAS = 5;

export function gerarCodigo(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function hashDoCodigo(userId: string, tipo: TipoCodigo, codigo: string): string {
  const segredo = process.env.NEXTAUTH_SECRET;
  if (!segredo) throw new Error("NEXTAUTH_SECRET não configurado no .env");
  return createHmac("sha256", segredo).update(`${userId}:${tipo}:${codigo}`).digest("hex");
}

const TEXTOS: Record<TipoCodigo, { assunto: string; frase: string }> = {
  EMAIL_CADASTRO: { assunto: "Seu código do BicoJá", frase: "Use este código para confirmar seu email no BicoJá:" },
  RECUPERAR_SENHA: { assunto: "Código para criar uma senha nova", frase: "Use este código para criar uma senha nova no BicoJá:" },
};

export async function enviarCodigo(
  prisma: PrismaClient,
  userId: string,
  tipo: TipoCodigo,
  agora = new Date()
): Promise<{ ok: true } | { ok: false; esperarSegundos: number }> {
  const ultimo = await prisma.codigoVerificacao.findFirst({
    where: { userId, tipo },
    orderBy: { createdAt: "desc" },
  });
  if (ultimo) {
    const passou = agora.getTime() - ultimo.createdAt.getTime();
    if (passou >= 0 && passou < ESPERA_MS) {
      return { ok: false, esperarSegundos: Math.ceil((ESPERA_MS - passou) / 1000) };
    }
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
  const codigo = gerarCodigo();

  await prisma.$transaction([
    // Só o código mais novo vale
    prisma.codigoVerificacao.updateMany({ where: { userId, tipo, usadoEm: null }, data: { usadoEm: agora } }),
    prisma.codigoVerificacao.create({
      data: {
        userId,
        tipo,
        codigoHash: hashDoCodigo(userId, tipo, codigo),
        expiraEm: new Date(agora.getTime() + VALIDADE_MS),
        createdAt: agora,
      },
    }),
  ]);

  const { assunto, frase } = TEXTOS[tipo];
  await enviarEmail(
    user.email!,
    assunto,
    `${frase}\n\n${codigo}\n\nEle vale por 10 minutos. Se não foi você que pediu, pode ignorar este email.`
  );
  return { ok: true };
}

export type ResultadoConferir =
  | { ok: true }
  | { ok: false; motivo: "errado" | "expirado" | "tentativas" | "inexistente"; restantes?: number };

export async function conferirCodigo(
  prisma: PrismaClient,
  userId: string,
  tipo: TipoCodigo,
  codigo: string,
  agora = new Date()
): Promise<ResultadoConferir> {
  const atual = await prisma.codigoVerificacao.findFirst({
    where: { userId, tipo, usadoEm: null },
    orderBy: { createdAt: "desc" },
  });
  if (!atual) return { ok: false, motivo: "inexistente" };
  if (atual.tentativas >= MAX_TENTATIVAS) return { ok: false, motivo: "tentativas" };
  if (atual.expiraEm.getTime() < agora.getTime()) return { ok: false, motivo: "expirado" };

  // Gasta a tentativa ANTES de conferir, numa operação só do banco:
  // assim vários pedidos ao mesmo tempo não conseguem passar do limite de 5.
  const reservada = await prisma.codigoVerificacao.updateMany({
    where: { id: atual.id, usadoEm: null, tentativas: { lt: MAX_TENTATIVAS } },
    data: { tentativas: { increment: 1 } },
  });
  if (reservada.count === 0) return { ok: false, motivo: "tentativas" };

  const esperado = Buffer.from(atual.codigoHash, "hex");
  const recebido = Buffer.from(hashDoCodigo(userId, tipo, codigo), "hex");
  const confere = esperado.length === recebido.length && timingSafeEqual(esperado, recebido);

  if (!confere) {
    const { tentativas } = await prisma.codigoVerificacao.findUniqueOrThrow({
      where: { id: atual.id },
      select: { tentativas: true },
    });
    if (tentativas >= MAX_TENTATIVAS) return { ok: false, motivo: "tentativas" };
    return { ok: false, motivo: "errado", restantes: MAX_TENTATIVAS - tentativas };
  }

  // Código certo: marca como usado só se ninguém usou antes (dois pedidos ao mesmo tempo)
  const usado = await prisma.codigoVerificacao.updateMany({
    where: { id: atual.id, usadoEm: null },
    data: { usadoEm: agora },
  });
  if (usado.count === 0) return { ok: false, motivo: "inexistente" };
  if (tipo === "EMAIL_CADASTRO") {
    await prisma.user.update({ where: { id: userId }, data: { emailVerified: agora } });
  }
  return { ok: true };
}

/** Texto para a tela, conforme o motivo. */
export function mensagemDoCodigo(r: Exclude<ResultadoConferir, { ok: true }>): string {
  if (r.motivo === "errado") {
    return r.restantes === 1 ? "Código errado. Você tem só mais 1 tentativa." : `Código errado. Você ainda tem ${r.restantes} tentativas.`;
  }
  if (r.motivo === "expirado") return "Esse código venceu. Peça um novo.";
  if (r.motivo === "tentativas") return "Muitas tentativas. Peça um novo código.";
  return "Esse código não vale mais. Peça um novo.";
}

const ERRO_REDEFINIR = "Código errado ou vencido. Confira o email ou peça um novo código.";

export async function redefinirSenha(
  prisma: PrismaClient,
  email: string,
  codigo: string,
  novaSenha: string
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  // Mesma resposta para email inexistente e código errado: não revela quem tem conta
  if (!user) return { ok: false, erro: ERRO_REDEFINIR };

  const r = await conferirCodigo(prisma, user.id, "RECUPERAR_SENHA", codigo);
  if (!r.ok) return { ok: false, erro: ERRO_REDEFINIR };

  // Quem recebeu o código no email também provou que o email é dele
  await prisma.user.update({
    where: { id: user.id },
    data: { senha: await bcrypt.hash(novaSenha, 10), emailVerified: new Date() },
  });
  return { ok: true };
}
