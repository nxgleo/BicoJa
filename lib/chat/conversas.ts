// Regras do chat. Roda só no servidor; as rotas chamam estas funções e depois avisam pelo socket.
// Segurança: toda função confere se quem pede participa da conversa e se ninguém bloqueou ninguém.
import { Prisma, type Mensagem, type PrismaClient } from "@prisma/client";
import { urlDeImagemValida } from "@/lib/imagens";
import { formatarPreco } from "@/lib/formatar";
import type { DadosMensagem, DadosProposta, OrigemConversa } from "@/lib/chat/esquemas";

export type Papel = "cliente" | "prestador";

export type MensagemChat = {
  id: string;
  tipo: "TEXTO" | "PROPOSTA" | "SISTEMA";
  autorId: string | null;
  texto: string | null;
  fotoUrl: string | null;
  criadaEm: string;
  proposta: {
    valor: number;
    quandoTipo: "DIA_CERTO" | "ENTRE_DIAS" | "QUALQUER_DIA";
    dataInicio: string | null;
    dataFim: string | null;
    horaInicio: string | null;
    horaFim: string | null;
    status: "PENDENTE" | "ACEITA" | "RECUSADA" | "SUBSTITUIDA";
  } | null;
};

type Erro = { ok: false; status: number; erro: string; campo?: string };
const erro = (status: number, texto: string, campo?: string): Erro => ({ ok: false, status, erro: texto, campo });

const NAO_ENCONTRADA = erro(404, "Conversa não encontrada.");
const BLOQUEADA = erro(403, "Não é possível mandar mensagem nessa conversa.");
const POR_PAGINA = 50;

const dia = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const dataDoTexto = (t?: string) => (t ? new Date(`${t}T00:00:00Z`) : null);

export function paraMensagemChat(m: Mensagem): MensagemChat {
  return {
    id: m.id,
    tipo: m.tipo,
    autorId: m.autorId,
    texto: m.texto,
    fotoUrl: m.fotoUrl,
    criadaEm: m.createdAt.toISOString(),
    proposta:
      m.tipo === "PROPOSTA" && m.valor != null && m.quandoTipo && m.statusProposta
        ? {
            valor: m.valor,
            quandoTipo: m.quandoTipo,
            dataInicio: dia(m.dataInicio),
            dataFim: dia(m.dataFim),
            horaInicio: m.horaInicio,
            horaFim: m.horaFim,
            status: m.statusProposta,
          }
        : null,
  };
}

/** Alguém dos dois bloqueou o outro? */
export async function haBloqueio(prisma: PrismaClient, a: string, b: string): Promise<boolean> {
  const n = await prisma.bloqueio.count({
    where: { OR: [{ autorId: a, bloqueadoId: b }, { autorId: b, bloqueadoId: a }] },
  });
  return n > 0;
}

/** A conversa, se essa pessoa participa dela; com o papel dela e o id do outro lado. */
export async function participacao(prisma: PrismaClient, conversaId: string, userId: string) {
  const c = await prisma.conversa.findFirst({
    where: { id: conversaId, OR: [{ clienteId: userId }, { prestadorId: userId }] },
  });
  if (!c) return null;
  const papel: Papel = c.clienteId === userId ? "cliente" : "prestador";
  return { conversa: c, papel, outroId: papel === "cliente" ? c.prestadorId : c.clienteId };
}

// ---------- Começar conversa ----------

export async function iniciarConversa(
  prisma: PrismaClient,
  userId: string,
  origem: OrigemConversa
): Promise<{ ok: true; id: string } | Erro> {
  let clienteId: string;
  let prestadorId: string;
  let servicoId: string | null = null;
  let pedidoId: string | null = null;

  if ("servicoId" in origem) {
    const s = await prisma.servico.findFirst({ where: { id: origem.servicoId, ativo: true }, select: { prestadorId: true } });
    if (!s) return erro(404, "Esse anúncio não está mais disponível.");
    [clienteId, prestadorId, servicoId] = [userId, s.prestadorId, origem.servicoId];
  } else if ("prestadorId" in origem) {
    const p = await prisma.perfilPrestador.findUnique({ where: { userId: origem.prestadorId }, select: { userId: true } });
    if (!p) return erro(404, "Prestador não encontrado.");
    [clienteId, prestadorId] = [userId, p.userId];
  } else {
    const pedido = await prisma.pedido.findFirst({ where: { id: origem.pedidoId, status: "ABERTO" }, select: { clienteId: true } });
    if (!pedido) return erro(404, "Esse pedido já foi fechado ou cancelado.");
    const souPrestador = await prisma.perfilPrestador.findUnique({ where: { userId }, select: { userId: true } });
    if (!souPrestador) return erro(403, "Ative o modo \"Quero fazer bicos\" para atender pedidos.");
    [clienteId, prestadorId, pedidoId] = [pedido.clienteId, userId, origem.pedidoId];
  }

  if (clienteId === prestadorId) return erro(400, "Você não pode conversar com você mesmo.");
  if (await haBloqueio(prisma, clienteId, prestadorId)) return erro(403, "Não é possível conversar com essa pessoa.");

  // Uma conversa por dupla; guarda a origem mais recente (se veio de algum lugar)
  const origemNova = servicoId || pedidoId ? { servicoId, pedidoId } : {};
  const c = await prisma.conversa.upsert({
    where: { clienteId_prestadorId: { clienteId, prestadorId } },
    update: origemNova,
    create: { clienteId, prestadorId, ...origemNova },
    select: { id: true },
  });
  return { ok: true, id: c.id };
}

// ---------- Listas ----------

/** Quantas mensagens não lidas por conversa (mensagens do outro lado e do sistema, depois da última leitura). */
async function naoLidasPorConversa(prisma: PrismaClient, userId: string): Promise<Map<string, number>> {
  const linhas = await prisma.$queryRaw<{ conversaId: string; n: number }[]>(Prisma.sql`
    SELECT m."conversaId", COUNT(*)::int AS n
    FROM "Mensagem" m JOIN "Conversa" c ON c.id = m."conversaId"
    WHERE (c."clienteId" = ${userId} OR c."prestadorId" = ${userId})
      AND m."autorId" IS DISTINCT FROM ${userId}
      AND m."createdAt" > COALESCE(CASE WHEN c."clienteId" = ${userId} THEN c."lidaClienteEm" ELSE c."lidaPrestadorEm" END, 'epoch'::timestamp)
    GROUP BY m."conversaId"`);
  return new Map(linhas.map((l) => [l.conversaId, l.n]));
}

export async function totalNaoLidas(prisma: PrismaClient, userId: string): Promise<number> {
  let total = 0;
  for (const n of (await naoLidasPorConversa(prisma, userId)).values()) total += n;
  return total;
}

/** Texto curto da última mensagem, para a lista de conversas. */
export function previaDaMensagem(m: Pick<Mensagem, "tipo" | "texto" | "fotoUrl" | "valor"> | undefined): string {
  if (!m) return "Conversa nova";
  if (m.tipo === "PROPOSTA") return `Proposta: ${formatarPreco(m.valor ?? 0)}`;
  if (m.texto) return m.texto.length > 80 ? `${m.texto.slice(0, 80)}…` : m.texto;
  if (m.fotoUrl) return "📷 Foto";
  return "";
}

export async function listarConversas(prisma: PrismaClient, userId: string) {
  const [conversas, naoLidas] = await Promise.all([
    prisma.conversa.findMany({
      where: { OR: [{ clienteId: userId }, { prestadorId: userId }] },
      orderBy: { ultimaMensagemEm: "desc" },
      take: 100,
      include: {
        cliente: { select: { id: true, nome: true, image: true } },
        prestador: { select: { id: true, nome: true, image: true } },
        mensagens: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    naoLidasPorConversa(prisma, userId),
  ]);
  return conversas.map((c) => {
    const outro = c.clienteId === userId ? c.prestador : c.cliente;
    return {
      id: c.id,
      outro: { id: outro.id, nome: outro.nome ?? "Usuário", foto: outro.image },
      previa: previaDaMensagem(c.mensagens[0]),
      ultimaEm: c.ultimaMensagemEm.toISOString(),
      naoLidas: naoLidas.get(c.id) ?? 0,
    };
  });
}

// ---------- Abrir uma conversa ----------

export async function abrirConversa(prisma: PrismaClient, conversaId: string, userId: string, antes?: string) {
  const p = await participacao(prisma, conversaId, userId);
  if (!p) return null;
  const { conversa: c, papel, outroId } = p;

  const limite = antes ? new Date(antes) : null;
  const [outro, lista, bloqueioMeu, bloqueioDele, contrato, servico, pedido] = await Promise.all([
    prisma.user.findUnique({ where: { id: outroId }, select: { id: true, nome: true, image: true, telefone: true, email: true } }),
    prisma.mensagem.findMany({
      where: { conversaId, ...(limite && !Number.isNaN(limite.getTime()) && { createdAt: { lt: limite } }) },
      orderBy: { createdAt: "desc" },
      take: POR_PAGINA + 1,
    }),
    prisma.bloqueio.findUnique({ where: { autorId_bloqueadoId: { autorId: userId, bloqueadoId: outroId } } }),
    prisma.bloqueio.findUnique({ where: { autorId_bloqueadoId: { autorId: outroId, bloqueadoId: userId } } }),
    prisma.contrato.findFirst({
      where: { conversaId, status: { in: ["COMBINADO", "CONCLUIDO"] } },
      orderBy: { createdAt: "desc" },
    }),
    c.servicoId ? prisma.servico.findUnique({ where: { id: c.servicoId }, select: { id: true, titulo: true } }) : null,
    c.pedidoId ? prisma.pedido.findUnique({ where: { id: c.pedidoId }, select: { id: true, descricao: true } }) : null,
  ]);
  if (!outro) return null;

  // Celular e endereço só depois de "Combinado". O endereço só vai para o prestador.
  let contato: { telefone: string | null; email: string | null; endereco: string | null } | null = null;
  if (contrato) {
    let endereco: string | null = null;
    if (papel === "prestador") {
      const lugar = contrato.pedidoId
        ? await prisma.pedido.findUnique({ where: { id: contrato.pedidoId } })
        : await prisma.enderecoUsuario.findUnique({ where: { userId: c.clienteId } });
      if (lugar) {
        endereco = `${lugar.rua}, ${lugar.numero}${lugar.complemento ? ` (${lugar.complemento})` : ""} — ${lugar.bairro}, ${lugar.cidade}`;
      }
    }
    contato = { telefone: outro.telefone, email: outro.telefone ? null : outro.email, endereco };
  }

  const temMais = lista.length > POR_PAGINA;
  const lidaPeloOutro = papel === "cliente" ? c.lidaPrestadorEm : c.lidaClienteEm;
  return {
    id: c.id,
    papel,
    outro: { id: outro.id, nome: outro.nome ?? "Usuário", foto: outro.image },
    // Link do perfil público só quando o outro lado é o prestador
    perfilDoOutro: papel === "cliente" ? `/prestadores/${outro.id}` : null,
    origem: servico
      ? { tipo: "anuncio" as const, titulo: servico.titulo, href: `/servicos/${servico.id}` }
      : pedido
        ? { tipo: "pedido" as const, titulo: pedido.descricao, href: `/pedidos/${pedido.id}` }
        : null,
    lidaPeloOutroEm: lidaPeloOutro?.toISOString() ?? null,
    bloqueadoPorMim: Boolean(bloqueioMeu),
    podeEnviar: !bloqueioMeu && !bloqueioDele,
    contato,
    mensagens: lista.slice(0, POR_PAGINA).reverse().map(paraMensagemChat),
    temMais,
  };
}
export type ConversaAberta = NonNullable<Awaited<ReturnType<typeof abrirConversa>>>;

// ---------- Escrever ----------

type Envio = { ok: true; mensagens: MensagemChat[]; avisar: string[] } | Erro;

async function podeEscrever(prisma: PrismaClient, conversaId: string, userId: string) {
  const p = await participacao(prisma, conversaId, userId);
  if (!p) return { ok: false as const, falha: NAO_ENCONTRADA };
  if (await haBloqueio(prisma, userId, p.outroId)) return { ok: false as const, falha: BLOQUEADA };
  return { ok: true as const, ...p };
}

/** Marca que chegou mensagem nova e que quem escreveu já leu tudo até aqui. */
function aposEscrever(prisma: PrismaClient, conversaId: string, papel: Papel, agora: Date) {
  return prisma.conversa.update({
    where: { id: conversaId },
    data: { ultimaMensagemEm: agora, ...(papel === "cliente" ? { lidaClienteEm: agora } : { lidaPrestadorEm: agora }) },
  });
}

export async function enviarMensagem(
  prisma: PrismaClient,
  conversaId: string,
  userId: string,
  dados: DadosMensagem,
  agora = new Date()
): Promise<Envio> {
  const p = await podeEscrever(prisma, conversaId, userId);
  if (!p.ok) return p.falha;
  if (dados.fotoUrl && !urlDeImagemValida(dados.fotoUrl, "chat", userId)) {
    return erro(400, "A foto não foi enviada direito. Tente de novo.", "foto");
  }
  const m = await prisma.mensagem.create({
    data: { conversaId, autorId: userId, tipo: "TEXTO", texto: dados.texto || null, fotoUrl: dados.fotoUrl ?? null, createdAt: agora },
  });
  await aposEscrever(prisma, conversaId, p.papel, agora);
  return { ok: true, mensagens: [paraMensagemChat(m)], avisar: [userId, p.outroId] };
}

/** Manda uma proposta. Se já havia uma esperando resposta, ela é trocada por esta ("Negociar"). */
export async function enviarProposta(
  prisma: PrismaClient,
  conversaId: string,
  userId: string,
  dados: DadosProposta,
  agora = new Date()
): Promise<Envio> {
  const p = await podeEscrever(prisma, conversaId, userId);
  if (!p.ok) return p.falha;
  const q = dados.quando;

  const resultado = await prisma.$transaction(async (tx) => {
    const pendentes = await tx.mensagem.findMany({ where: { conversaId, tipo: "PROPOSTA", statusProposta: "PENDENTE" } });
    await tx.mensagem.updateMany({
      where: { id: { in: pendentes.map((m) => m.id) } },
      data: { statusProposta: "SUBSTITUIDA" },
    });
    const nova = await tx.mensagem.create({
      data: {
        conversaId,
        autorId: userId,
        tipo: "PROPOSTA",
        valor: Math.round(dados.valor * 100) / 100,
        quandoTipo: q.tipo,
        dataInicio: dataDoTexto(q.tipo === "QUALQUER_DIA" ? undefined : q.dataInicio),
        dataFim: dataDoTexto(q.tipo === "ENTRE_DIAS" ? q.dataFim : undefined),
        horaInicio: q.horaInicio ?? null,
        horaFim: q.horaFim ?? null,
        pedidoId: p.conversa.pedidoId,
        statusProposta: "PENDENTE",
        propostaAnteriorId: pendentes[0]?.id ?? null,
        createdAt: agora,
      },
    });
    const trocadas = pendentes.map((m) => ({ ...m, statusProposta: "SUBSTITUIDA" as const }));
    return [...trocadas, nova];
  });
  await aposEscrever(prisma, conversaId, p.papel, agora);
  return { ok: true, mensagens: resultado.map(paraMensagemChat), avisar: [userId, p.outroId] };
}

/**
 * Aceitar ou recusar a proposta do outro lado.
 * Aceitar cria o Contrato ("Combinado ✔"); se veio de um pedido, o pedido fecha e
 * as outras conversas daquele pedido recebem um aviso.
 */
export async function responderProposta(
  prisma: PrismaClient,
  conversaId: string,
  mensagemId: string,
  userId: string,
  acao: "aceitar" | "recusar",
  agora = new Date()
): Promise<Envio & { conversasAvisadas?: { conversaId: string; mensagens: MensagemChat[]; avisar: string[] }[] }> {
  const p = await podeEscrever(prisma, conversaId, userId);
  if (!p.ok) return p.falha;

  const proposta = await prisma.mensagem.findFirst({ where: { id: mensagemId, conversaId, tipo: "PROPOSTA" } });
  if (!proposta) return erro(404, "Proposta não encontrada.");
  if (proposta.autorId === userId) return erro(400, "Quem responde a proposta é a outra pessoa.");
  if (proposta.statusProposta !== "PENDENTE") return erro(409, "Essa proposta já foi respondida.");

  const avisar = [userId, p.outroId];

  if (acao === "recusar") {
    const r = await prisma.mensagem.updateMany({ where: { id: mensagemId, statusProposta: "PENDENTE" }, data: { statusProposta: "RECUSADA" } });
    if (r.count === 0) return erro(409, "Essa proposta já foi respondida.");
    return { ok: true, mensagens: [paraMensagemChat({ ...proposta, statusProposta: "RECUSADA" })], avisar };
  }

  try {
    const r = await prisma.$transaction(async (tx) => {
      // Só um aceite vence, mesmo se tocarem duas vezes ao mesmo tempo
      const marcada = await tx.mensagem.updateMany({ where: { id: mensagemId, statusProposta: "PENDENTE" }, data: { statusProposta: "ACEITA" } });
      if (marcada.count === 0) throw new Error("JA_RESPONDIDA");

      if (proposta.pedidoId) {
        const fechou = await tx.pedido.updateMany({ where: { id: proposta.pedidoId, status: "ABERTO" }, data: { status: "FECHADO" } });
        if (fechou.count === 0) throw new Error("PEDIDO_FECHADO");
      }

      await tx.contrato.create({
        data: {
          conversaId,
          propostaId: proposta.id,
          clienteId: p.conversa.clienteId,
          prestadorId: p.conversa.prestadorId,
          pedidoId: proposta.pedidoId,
          servicoId: p.conversa.servicoId,
          valor: proposta.valor ?? 0,
          quandoTipo: proposta.quandoTipo ?? "QUALQUER_DIA",
          dataInicio: proposta.dataInicio,
          dataFim: proposta.dataFim,
          horaInicio: proposta.horaInicio,
          horaFim: proposta.horaFim,
        },
      });
      const aviso = await tx.mensagem.create({
        data: { conversaId, tipo: "SISTEMA", texto: "Combinado ✔ Agora vocês podem ver o contato um do outro.", createdAt: agora },
      });

      // Outras conversas do mesmo pedido: avisa que fechou e encerra as propostas de lá
      const outras = proposta.pedidoId
        ? await tx.conversa.findMany({ where: { pedidoId: proposta.pedidoId, id: { not: conversaId } } })
        : [];
      const conversasAvisadas = [];
      for (const o of outras) {
        const pendentes = await tx.mensagem.findMany({
          where: { conversaId: o.id, tipo: "PROPOSTA", statusProposta: "PENDENTE", pedidoId: proposta.pedidoId },
        });
        await tx.mensagem.updateMany({ where: { id: { in: pendentes.map((m) => m.id) } }, data: { statusProposta: "RECUSADA" } });
        const sistema = await tx.mensagem.create({
          data: { conversaId: o.id, tipo: "SISTEMA", texto: "Esse pedido já foi fechado com outra pessoa.", createdAt: agora },
        });
        await tx.conversa.update({ where: { id: o.id }, data: { ultimaMensagemEm: agora } });
        conversasAvisadas.push({
          conversaId: o.id,
          mensagens: [...pendentes.map((m) => paraMensagemChat({ ...m, statusProposta: "RECUSADA" })), paraMensagemChat(sistema)],
          avisar: [o.clienteId, o.prestadorId],
        });
      }
      return { aviso, conversasAvisadas };
    });
    await prisma.conversa.update({ where: { id: conversaId }, data: { ultimaMensagemEm: agora } });
    return {
      ok: true,
      mensagens: [paraMensagemChat({ ...proposta, statusProposta: "ACEITA" }), paraMensagemChat(r.aviso)],
      avisar,
      conversasAvisadas: r.conversasAvisadas,
    };
  } catch (e) {
    if (e instanceof Error && e.message === "JA_RESPONDIDA") return erro(409, "Essa proposta já foi respondida.");
    if (e instanceof Error && e.message === "PEDIDO_FECHADO") return erro(409, "Esse pedido já foi fechado ou cancelado.");
    throw e;
  }
}

// ---------- Leitura, bloqueio e denúncia ----------

export async function marcarLida(prisma: PrismaClient, conversaId: string, userId: string, agora = new Date()) {
  const p = await participacao(prisma, conversaId, userId);
  if (!p) return null;
  await prisma.conversa.update({
    where: { id: conversaId },
    data: p.papel === "cliente" ? { lidaClienteEm: agora } : { lidaPrestadorEm: agora },
  });
  // Quem bloqueou não fica sabendo que a outra pessoa leu (e vice-versa)
  const avisarOutro = !(await haBloqueio(prisma, userId, p.outroId));
  return { outroId: avisarOutro ? p.outroId : null, em: agora.toISOString() };
}

export async function bloquear(prisma: PrismaClient, conversaId: string, userId: string, bloquear: boolean) {
  const p = await participacao(prisma, conversaId, userId);
  if (!p) return null;
  const chave = { autorId: userId, bloqueadoId: p.outroId };
  if (bloquear) {
    await prisma.bloqueio.upsert({ where: { autorId_bloqueadoId: chave }, update: {}, create: chave });
  } else {
    await prisma.bloqueio.deleteMany({ where: chave });
  }
  return { outroId: p.outroId };
}

export async function denunciar(
  prisma: PrismaClient,
  conversaId: string,
  userId: string,
  dados: { motivo: string; detalhe?: string }
) {
  const p = await participacao(prisma, conversaId, userId);
  if (!p) return null;
  await prisma.denuncia.create({
    data: { autorId: userId, denunciadoId: p.outroId, conversaId, motivo: dados.motivo, detalhe: dados.detalhe || null },
  });
  return { ok: true };
}

/** Uma foto do chat só abre para quem mandou ou para quem está na conversa onde ela foi enviada. */
export async function podeVerFotoDoChat(prisma: PrismaClient, url: string, nome: string, userId: string): Promise<boolean> {
  if (nome.startsWith(`${userId}_`)) return true;
  const n = await prisma.mensagem.count({
    where: { fotoUrl: url, conversa: { OR: [{ clienteId: userId }, { prestadorId: userId }] } },
  });
  return n > 0;
}
