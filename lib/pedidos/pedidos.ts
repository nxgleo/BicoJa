// Pedidos dos clientes: criar, listar para prestadores (perto e da categoria dele), detalhe e cancelar.
// PRIVACIDADE: para quem não é o dono, um pedido mostra só bairro, cidade e distância —
// nunca rua, número, complemento, coordenadas, email ou telefone.
import { Prisma, type PrismaClient } from "@prisma/client";
import { urlDeImagemValida } from "@/lib/imagens";
import { distanciaAproximada, distanciaKm } from "@/lib/distancia";
import type { DadosPedido } from "./esquemas";

const JANELA_URGENTE_MS = 3 * 3600_000;

export type PedidoParaPrestador = {
  id: string;
  categoria: string;
  descricao: string;
  fotos: string[];
  urgente: boolean; // ainda dentro das 3 horas
  quandoTipo: "DIA_CERTO" | "ENTRE_DIAS" | "QUALQUER_DIA";
  dataInicio: Date | null;
  dataFim: Date | null;
  horaInicio: string | null;
  horaFim: string | null;
  bairro: string;
  cidade: string;
  distanciaKm: number | null;
  createdAt: Date;
  cliente: { nome: string; foto: string | null };
};

function dataDoTexto(texto?: string): Date | null {
  return texto ? new Date(`${texto}T00:00:00Z`) : null;
}

function primeiroNome(nome: string | null): string {
  return (nome ?? "").trim().split(/\s+/)[0] || "Cliente";
}

export function urgenteAgora(p: { urgente: boolean; urgenteAte: Date | null }, agora = new Date()): boolean {
  return p.urgente && Boolean(p.urgenteAte && p.urgenteAte > agora);
}

export async function criarPedido(
  prisma: PrismaClient,
  clienteId: string,
  dados: DadosPedido,
  agora = new Date()
): Promise<{ ok: true; id: string } | { ok: false; campo: string; erro: string }> {
  const endereco = await prisma.enderecoUsuario.findUnique({ where: { userId: clienteId } });
  if (!endereco) return { ok: false, campo: "endereco", erro: "Salve seu endereço primeiro." };

  if (dados.fotos.some((url) => !urlDeImagemValida(url, "pedidos", clienteId))) {
    return { ok: false, campo: "fotos", erro: "Uma das fotos não foi enviada direito. Tire e mande de novo." };
  }

  const q = dados.quando;
  const pedido = await prisma.pedido.create({
    data: {
      clienteId,
      categoria: dados.categoria,
      descricao: dados.descricao,
      fotos: dados.fotos,
      urgente: dados.urgente,
      urgenteAte: dados.urgente ? new Date(agora.getTime() + JANELA_URGENTE_MS) : null,
      quandoTipo: q.tipo,
      dataInicio: dataDoTexto(q.dataInicio),
      dataFim: dataDoTexto(q.tipo === "ENTRE_DIAS" ? q.dataFim : undefined),
      horaInicio: q.horaInicio ?? null,
      horaFim: q.horaFim ?? null,
      rua: endereco.rua,
      numero: endereco.numero,
      complemento: endereco.complemento,
      bairro: endereco.bairro,
      cidade: endereco.cidade,
      latitude: endereco.latitude,
      longitude: endereco.longitude,
      createdAt: agora,
    },
    select: { id: true },
  });
  return { ok: true, id: pedido.id };
}

type LinhaPedido = Omit<PedidoParaPrestador, "cliente"> & { clienteNome: string | null; clienteFoto: string | null };

/** Pedidos abertos perto do prestador e nas categorias dele, separados em duas abas. */
export async function pedidosParaPrestador(
  prisma: PrismaClient,
  prestadorId: string,
  aba: "urgentes" | "pedidos",
  agora = new Date()
): Promise<PedidoParaPrestador[]> {
  const perfil = await prisma.perfilPrestador.findUnique({ where: { userId: prestadorId } });
  if (!perfil || perfil.categorias.length === 0) return [];

  const ponto = Prisma.sql`ST_MakePoint(${perfil.longitude}, ${perfil.latitude})`;
  const distancia = Prisma.sql`ST_DistanceSphere(ST_MakePoint(p.longitude, p.latitude), ${ponto})`;
  const ehUrgente = Prisma.sql`(p.urgente AND p."urgenteAte" > ${agora})`;
  const filtroAba = aba === "urgentes" ? ehUrgente : Prisma.sql`NOT ${ehUrgente}`;
  const ordem =
    aba === "urgentes" ? Prisma.sql`p."createdAt" DESC` : Prisma.sql`"distanciaKm" ASC, p."createdAt" DESC`;

  // Atenção: este SELECT não pega rua, número, complemento nem coordenadas (privacidade do cliente)
  const linhas = await prisma.$queryRaw<LinhaPedido[]>`
    SELECT p.id, p.categoria, p.descricao, p.fotos, ${ehUrgente} AS urgente,
           p."quandoTipo"::text AS "quandoTipo", p."dataInicio", p."dataFim", p."horaInicio", p."horaFim",
           p.bairro, p.cidade, p."createdAt",
           ${distancia} / 1000 AS "distanciaKm",
           u.nome AS "clienteNome", u.image AS "clienteFoto"
    FROM "Pedido" p
    JOIN "User" u ON u.id = p."clienteId"
    WHERE p.status = 'ABERTO'
      AND p.categoria = ANY(${perfil.categorias})
      AND p."clienteId" <> ${prestadorId}
      AND ${distancia} <= ${perfil.raioKm * 1000}
      AND ${filtroAba}
    ORDER BY ${ordem}
    LIMIT 50
  `;

  return linhas.map(({ clienteNome, clienteFoto, ...resto }) => ({
    ...resto,
    distanciaKm: distanciaAproximada(Number(resto.distanciaKm)),
    cliente: { nome: primeiroNome(clienteNome), foto: clienteFoto },
  }));
}

export async function contarUrgentes(prisma: PrismaClient, prestadorId: string, agora = new Date()) {
  return (await pedidosParaPrestador(prisma, prestadorId, "urgentes", agora)).length;
}

export async function meusPedidos(prisma: PrismaClient, clienteId: string, agora = new Date()) {
  const pedidos = await prisma.pedido.findMany({ where: { clienteId }, orderBy: { createdAt: "desc" } });
  const ordem = { ABERTO: 0, FECHADO: 1, CANCELADO: 2 } as const;
  return pedidos
    .map((p) => ({ ...p, urgenteAgora: urgenteAgora(p, agora) }))
    .sort((a, b) => ordem[a.status] - ordem[b.status]);
}

export type PedidoDoDono = Awaited<ReturnType<typeof meusPedidos>>[number];

/** Dono vê tudo; outras pessoas veem a versão sem endereço (e só de pedido aberto). */
export async function detalhePedido(
  prisma: PrismaClient,
  id: string,
  quemVe: { userId?: string },
  agora = new Date()
): Promise<{ doDono: true; pedido: PedidoDoDono } | { doDono: false; pedido: PedidoParaPrestador } | null> {
  const p = await prisma.pedido.findUnique({
    where: { id },
    include: { cliente: { select: { nome: true, image: true } } },
  });
  if (!p) return null;

  if (quemVe.userId && quemVe.userId === p.clienteId) {
    const { cliente: _cliente, ...pedido } = p;
    return { doDono: true, pedido: { ...pedido, urgenteAgora: urgenteAgora(p, agora) } };
  }
  if (p.status !== "ABERTO") return null;

  let referencia: { latitude: number; longitude: number } | null = null;
  if (quemVe.userId) {
    referencia =
      (await prisma.perfilPrestador.findUnique({ where: { userId: quemVe.userId }, select: { latitude: true, longitude: true } })) ??
      (await prisma.enderecoUsuario.findUnique({ where: { userId: quemVe.userId }, select: { latitude: true, longitude: true } }));
  }

  return {
    doDono: false,
    pedido: {
      id: p.id,
      categoria: p.categoria,
      descricao: p.descricao,
      fotos: p.fotos,
      urgente: urgenteAgora(p, agora),
      quandoTipo: p.quandoTipo,
      dataInicio: p.dataInicio,
      dataFim: p.dataFim,
      horaInicio: p.horaInicio,
      horaFim: p.horaFim,
      bairro: p.bairro,
      cidade: p.cidade,
      distanciaKm: referencia ? distanciaAproximada(distanciaKm(referencia, p)) : null,
      createdAt: p.createdAt,
      cliente: { nome: primeiroNome(p.cliente.nome), foto: p.cliente.image },
    },
  };
}

export async function cancelarPedido(prisma: PrismaClient, id: string, clienteId: string): Promise<{ ok: boolean }> {
  const r = await prisma.pedido.updateMany({ where: { id, clienteId, status: "ABERTO" }, data: { status: "CANCELADO" } });
  return { ok: r.count === 1 };
}
