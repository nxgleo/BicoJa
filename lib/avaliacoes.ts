// Notas e avaliações recebidas (aparecem no perfil e no chat). Roda só no servidor.
import type { PrismaClient } from "@prisma/client";

const primeiroNome = (nome: string | null) => (nome ?? "Usuário").split(" ")[0];

/** Nota média e quantidade de avaliações recebidas. */
export async function notaDe(prisma: PrismaClient, userId: string): Promise<{ media: number | null; total: number }> {
  const r = await prisma.avaliacao.aggregate({ where: { avaliadoId: userId }, _avg: { nota: true }, _count: true });
  return { media: r._avg.nota ? Math.round(r._avg.nota * 10) / 10 : null, total: r._count };
}

export async function avaliacoesRecebidas(prisma: PrismaClient, userId: string, limite = 10) {
  const lista = await prisma.avaliacao.findMany({
    where: { avaliadoId: userId },
    orderBy: { createdAt: "desc" },
    take: limite,
    include: { autor: { select: { nome: true, image: true } } },
  });
  return lista.map((a) => ({
    id: a.id,
    nota: a.nota,
    comentario: a.comentario,
    criadaEm: a.createdAt.toISOString(),
    autor: { nome: primeiroNome(a.autor.nome), foto: a.autor.image },
  }));
}
