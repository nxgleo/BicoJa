// Prestadores: "Estou disponível agora" e o que aparece para os clientes.
// Nunca devolve email ou telefone.
import type { PrismaClient } from "@prisma/client";
import { distanciaKm } from "@/lib/distancia";
import type { CategoriaId } from "@/lib/categorias";

const DURACAO_MS = 8 * 3600_000;

/** Disponível de verdade = ligado e ainda dentro das 8 horas. */
export function estaDisponivel(p: { disponivel: boolean; disponivelAte: Date | null }, agora = new Date()): boolean {
  return p.disponivel && Boolean(p.disponivelAte && p.disponivelAte > agora);
}

export async function mudarDisponibilidade(
  prisma: PrismaClient,
  userId: string,
  ligado: boolean,
  agora = new Date()
): Promise<{ ok: true; disponivelAte: Date | null } | { ok: false; semPerfil: true }> {
  const disponivelAte = ligado ? new Date(agora.getTime() + DURACAO_MS) : null;
  const r = await prisma.perfilPrestador.updateMany({ where: { userId }, data: { disponivel: ligado, disponivelAte } });
  if (r.count === 0) return { ok: false, semPerfil: true };
  return { ok: true, disponivelAte };
}

export type PrestadorResumo = {
  id: string;
  nome: string;
  foto: string | null;
  categorias: CategoriaId[];
  bairro: string;
  cidade: string;
  precoBase: number | null;
  distanciaKm: number | null;
  disponivelAgora: boolean;
};

export async function prestadoresDisponiveis(
  prisma: PrismaClient,
  perto: { latitude: number; longitude: number } | null,
  limite: number,
  agora = new Date(),
  /** Quem está vendo a tela não aparece para si mesmo */
  excluirUserId?: string
): Promise<PrestadorResumo[]> {
  const perfis = await prisma.perfilPrestador.findMany({
    where: { disponivel: true, disponivelAte: { gt: agora }, ...(excluirUserId && { userId: { not: excluirUserId } }) },
    orderBy: { disponivelAte: "desc" },
    take: 200,
    include: { user: { select: { id: true, nome: true, image: true } } },
  });
  const lista = perfis
    .map((p) => ({ p, km: perto ? distanciaKm(perto, p) : null }))
    .filter(({ p, km }) => km === null || km <= p.raioKm)
    .sort((x, y) => (x.km ?? 0) - (y.km ?? 0));
  return lista.slice(0, limite).map(({ p, km }) => ({
    id: p.user.id,
    nome: p.user.nome ?? "Prestador",
    foto: p.user.image,
    categorias: p.categorias as CategoriaId[],
    bairro: p.bairro,
    cidade: p.cidade,
    precoBase: p.precoBase,
    distanciaKm: km,
    disponivelAgora: true,
  }));
}

export async function perfilPublico(prisma: PrismaClient, prestadorId: string, agora = new Date()) {
  const user = await prisma.user.findUnique({
    where: { id: prestadorId },
    select: {
      id: true,
      nome: true,
      image: true,
      createdAt: true,
      perfilPrestador: true,
      servicosOferecidos: {
        where: { ativo: true },
        orderBy: { createdAt: "desc" },
        select: { id: true, titulo: true, categoria: true, descricao: true, preco: true, fotos: true },
      },
    },
  });
  const p = user?.perfilPrestador;
  if (!user || !p) return null;
  return {
    id: user.id,
    nome: user.nome ?? "Prestador",
    foto: user.image,
    membroDesde: user.createdAt,
    bairro: p.bairro,
    cidade: p.cidade,
    raioKm: p.raioKm,
    categorias: p.categorias as CategoriaId[],
    bio: p.bio,
    precoBase: p.precoBase,
    disponivelAgora: estaDisponivel(p, agora),
    anuncios: user.servicosOferecidos,
  };
}
