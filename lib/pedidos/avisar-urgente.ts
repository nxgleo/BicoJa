// Pedido urgente: avisa os prestadores daquela categoria com "Estou disponível" ligado,
// que atendem até a distância do pedido. Roda só no servidor.
import type { PrismaClient } from "@prisma/client";
import { criarAviso } from "@/lib/avisos";
import { distanciaKm } from "@/lib/distancia";
import { nomeDaCategoria } from "@/lib/pedidos/formatar";
import { enviarPush } from "@/lib/push";

const MAX_AVISADOS = 50;

export async function avisarPrestadoresDoUrgente(prisma: PrismaClient, pedidoId: string, agora = new Date()): Promise<string[]> {
  const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
  if (!pedido?.urgente || pedido.status !== "ABERTO") return [];

  const perfis = await prisma.perfilPrestador.findMany({
    where: { categorias: { has: pedido.categoria }, disponivel: true, disponivelAte: { gt: agora }, userId: { not: pedido.clienteId } },
    select: { userId: true, latitude: true, longitude: true, raioKm: true },
    take: 500,
  });
  const perto = perfis
    .map((p) => ({ ...p, km: distanciaKm(p, pedido) }))
    .filter((p) => p.km <= p.raioKm)
    .sort((a, b) => a.km - b.km)
    .slice(0, MAX_AVISADOS);

  const texto = `Urgente perto de você: ${nomeDaCategoria(pedido.categoria)} no bairro ${pedido.bairro}.`;
  const href = `/pedidos/${pedido.id}`;
  for (const p of perto) {
    await criarAviso(prisma, p.userId, texto, href);
    void enviarPush(prisma, p.userId, { title: "Pedido urgente", body: texto, url: href });
  }
  return perto.map((p) => p.userId);
}
