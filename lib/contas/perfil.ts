// Editar dados do perfil e trocar entre modo cliente e modo prestador.
import { Prisma, type Modo, type PrismaClient } from "@prisma/client";

const ERRO_TELEFONE = "Esse celular já tem conta. Quer entrar?";

export async function atualizarPerfil(
  prisma: PrismaClient,
  userId: string,
  dados: { nome?: string; telefone?: string }
): Promise<{ ok: true } | { ok: false; campo: "telefone"; erro: string }> {
  if (dados.telefone) {
    const dono = await prisma.user.findUnique({ where: { telefone: dados.telefone }, select: { id: true } });
    if (dono && dono.id !== userId) return { ok: false, campo: "telefone", erro: ERRO_TELEFONE };
  }
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { ...(dados.nome && { nome: dados.nome }), ...(dados.telefone && { telefone: dados.telefone }) },
    });
    return { ok: true };
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      return { ok: false, campo: "telefone", erro: ERRO_TELEFONE };
    }
    throw erro;
  }
}

/** Modo prestador só existe para quem já fez o "Quero fazer bicos". */
export async function trocarModo(
  prisma: PrismaClient,
  userId: string,
  modo: Modo
): Promise<{ ok: true } | { ok: false; precisaVirarPrestador: true }> {
  if (modo === "PRESTADOR") {
    const perfil = await prisma.perfilPrestador.findUnique({ where: { userId }, select: { id: true } });
    if (!perfil) return { ok: false, precisaVirarPrestador: true };
  }
  await prisma.user.update({ where: { id: userId }, data: { modoAtual: modo } });
  return { ok: true };
}
