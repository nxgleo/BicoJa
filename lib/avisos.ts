// Avisos dentro do app (o sininho). Roda só no servidor.
import type { Prisma, PrismaClient } from "@prisma/client";

type Banco = PrismaClient | Prisma.TransactionClient;

export async function criarAviso(prisma: Banco, userId: string, texto: string, href: string) {
  await prisma.aviso.create({ data: { userId, texto, href } });
}

export function contarAvisosNaoLidos(prisma: PrismaClient, userId: string) {
  return prisma.aviso.count({ where: { userId, lido: false } });
}

export async function listarAvisos(prisma: PrismaClient, userId: string) {
  const avisos = await prisma.aviso.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 });
  return avisos.map((a) => ({ id: a.id, texto: a.texto, href: a.href, lido: a.lido, criadoEm: a.createdAt.toISOString() }));
}

export function marcarAvisosLidos(prisma: PrismaClient, userId: string) {
  return prisma.aviso.updateMany({ where: { userId, lido: false }, data: { lido: true } });
}
