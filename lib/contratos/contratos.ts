// Regras do serviço combinado (Contrato): pagamento simulado, código de conclusão,
// cancelamento, prazos de 3 e 7 dias e avaliações. Roda só no servidor.
// Cada função confere quem pode fazer o quê e devolve os "efeitos" para as rotas avisarem pelo socket.
import type { Contrato, Prisma, PrismaClient } from "@prisma/client";
import { criarAviso } from "@/lib/avisos";
import { processarPagamentoSimulado } from "@/lib/payments";
import { formatarPreco } from "@/lib/formatar";
import { paraMensagemChat, type MensagemChat } from "@/lib/chat/conversas";
import { cifrarCodigo, codigoConfere, decifrarCodigo, gerarCodigo } from "@/lib/contratos/codigo";
import {
  DIAS_PARA_LIBERAR,
  DIAS_PARA_NAO_ACONTECEU,
  MAX_TENTATIVAS_CODIGO,
  MINUTOS_BLOQUEIO_CODIGO,
  MOTIVOS_CANCELAMENTO,
  TAXA_PLATAFORMA_PERCENTUAL,
} from "@/lib/contratos/esquemas";

const DIA_MS = 86_400_000;
const BRASIL_MS = 3 * 3600_000; // datas do banco são meia-noite UTC; no Brasil a meia-noite é 3h depois

export type Efeitos = {
  /** Mensagens do sistema que entraram no chat */
  chat: { conversaId: string; mensagens: MensagemChat[]; avisar: string[] }[];
  /** Quem ganhou aviso novo no sininho */
  avisados: string[];
  /** Quem deve recarregar a tela do serviço */
  contrato: { id: string; avisar: string[] }[];
};

type Erro = { ok: false; status: number; erro: string; campo?: string };
const erro = (status: number, texto: string, campo?: string): Erro => ({ ok: false, status, erro: texto, campo });
const NAO_ENCONTRADO = erro(404, "Serviço não encontrado.");

const primeiroNome = (nome: string | null) => (nome ?? "Usuário").split(" ")[0];

/** Dia que vale para os prazos: o último dia combinado, ou o dia do "Combinado" quando é "qualquer dia". */
export function dataDeReferencia(c: Pick<Contrato, "dataInicio" | "dataFim" | "createdAt">): Date {
  const dia = c.dataFim ?? c.dataInicio;
  return dia ? new Date(dia.getTime() + BRASIL_MS) : c.createdAt;
}

export function prazosDo(c: Pick<Contrato, "dataInicio" | "dataFim" | "createdAt">) {
  const ref = dataDeReferencia(c).getTime();
  return {
    naoAconteceuEm: new Date(ref + DIAS_PARA_NAO_ACONTECEU * DIA_MS),
    liberaEm: new Date(ref + DIAS_PARA_LIBERAR * DIA_MS),
  };
}

async function contratoDe(prisma: PrismaClient, id: string, userId: string) {
  const c = await prisma.contrato.findFirst({
    where: { id, OR: [{ clienteId: userId }, { prestadorId: userId }] },
    include: { cliente: { select: { nome: true } }, prestador: { select: { nome: true } } },
  });
  if (!c) return null;
  return { c, papel: c.clienteId === userId ? ("cliente" as const) : ("prestador" as const) };
}

/** Escreve um aviso do sistema no chat do serviço e devolve para avisar em tempo real. */
async function avisoNoChat(tx: Prisma.TransactionClient, c: Contrato, texto: string, agora: Date, quemFez?: string) {
  const m = await tx.mensagem.create({ data: { conversaId: c.conversaId, tipo: "SISTEMA", texto, createdAt: agora } });
  // Quem fez a ação já sabe dela: não conta como mensagem nova para essa pessoa
  const lida = quemFez === c.clienteId ? { lidaClienteEm: agora } : quemFez === c.prestadorId ? { lidaPrestadorEm: agora } : {};
  await tx.conversa.update({ where: { id: c.conversaId }, data: { ultimaMensagemEm: agora, ...lida } });
  return { conversaId: c.conversaId, mensagens: [paraMensagemChat(m)], avisar: [c.clienteId, c.prestadorId] };
}

const dia = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const quandoDo = (c: Contrato) => ({
  quandoTipo: c.quandoTipo,
  dataInicio: dia(c.dataInicio),
  dataFim: dia(c.dataFim),
  horaInicio: c.horaInicio,
  horaFim: c.horaFim,
});

const linkDo = (c: Pick<Contrato, "id">) => `/contratos/${c.id}`;

// ---------- Pagamento ----------

export async function escolherPagamento(
  prisma: PrismaClient,
  id: string,
  userId: string,
  metodo: "PIX" | "CARTAO" | "DIRETO",
  agora = new Date()
): Promise<({ ok: true } & Efeitos) | Erro> {
  const achado = await contratoDe(prisma, id, userId);
  if (!achado) return NAO_ENCONTRADO;
  const { c, papel } = achado;
  if (papel !== "cliente") return erro(403, "Quem escolhe como pagar é o cliente.");
  if (c.status !== "COMBINADO" || c.statusPagamento !== "PENDENTE") return erro(409, "O pagamento desse serviço já foi resolvido.");

  const peloApp = metodo !== "DIRETO";
  const taxaValor = peloApp ? Math.round(c.valor * TAXA_PLATAFORMA_PERCENTUAL) / 100 : 0;

  // Pix/cartão passam pelo simulador de pagamento do back end (lib/payments.ts).
  // Quando o Mercado Pago entrar, é só trocar essa chamada.
  if (peloApp) {
    const pagamento = await processarPagamentoSimulado({ propostaId: c.id, valor: c.valor, metodoPagamento: metodo });
    if (!pagamento.sucesso) return erro(402, "O pagamento não passou. Tente de novo ou escolha outro jeito de pagar.");
  }

  const efeitos = await prisma.$transaction(async (tx) => {
    // Só muda se ainda estiver pendente (dois toques ao mesmo tempo não pagam duas vezes)
    const r = await tx.contrato.updateMany({
      where: { id, statusPagamento: "PENDENTE", status: "COMBINADO" },
      data: {
        metodoPagamento: metodo,
        statusPagamento: peloApp ? "RETIDO" : "DIRETO",
        taxaPercentual: peloApp ? TAXA_PLATAFORMA_PERCENTUAL : 0,
        taxaValor,
        pagoEm: peloApp ? agora : null,
        codigoCifrado: cifrarCodigo(gerarCodigo()),
      },
    });
    if (r.count === 0) return null;
    const nome = primeiroNome(c.cliente.nome);
    const texto = peloApp
      ? `${nome} pagou ${formatarPreco(c.valor)} pelo app. O valor fica guardado e é liberado quando o serviço terminar.`
      : `${nome} vai pagar ${formatarPreco(c.valor)} direto para ${primeiroNome(c.prestador.nome)}.`;
    const chat = await avisoNoChat(tx, c, texto, agora, userId);
    await criarAviso(tx, c.prestadorId, texto, linkDo(c));
    return chat;
  });
  if (!efeitos) return erro(409, "O pagamento desse serviço já foi resolvido.");
  return { ok: true, chat: [efeitos], avisados: [c.prestadorId], contrato: [{ id, avisar: [c.clienteId, c.prestadorId] }] };
}

// ---------- Conclusão pelo código ----------

export async function concluirComCodigo(
  prisma: PrismaClient,
  id: string,
  userId: string,
  codigo: string,
  agora = new Date()
): Promise<({ ok: true } & Efeitos) | Erro> {
  const achado = await contratoDe(prisma, id, userId);
  if (!achado) return NAO_ENCONTRADO;
  const { c, papel } = achado;
  if (papel !== "prestador") return erro(403, "Quem digita o código é o prestador.");
  if (c.status !== "COMBINADO") return erro(409, "Esse serviço já foi concluído ou cancelado.");
  if (!c.codigoCifrado) return erro(409, `${primeiroNome(c.cliente.nome)} ainda não escolheu como pagar. Peça para escolher no app.`);
  if (c.codigoBloqueadoAte && c.codigoBloqueadoAte > agora) {
    return erro(429, `Muitos códigos errados. Espere ${MINUTOS_BLOQUEIO_CODIGO} minutos e tente de novo.`, "codigo");
  }

  if (!codigoConfere(codigo, c.codigoCifrado)) {
    const tentativas = c.tentativasCodigo + 1;
    const bloquear = tentativas >= MAX_TENTATIVAS_CODIGO;
    await prisma.contrato.update({
      where: { id },
      data: {
        tentativasCodigo: bloquear ? 0 : tentativas,
        codigoBloqueadoAte: bloquear ? new Date(agora.getTime() + MINUTOS_BLOQUEIO_CODIGO * 60_000) : c.codigoBloqueadoAte,
      },
    });
    return bloquear
      ? erro(429, `Muitos códigos errados. Espere ${MINUTOS_BLOQUEIO_CODIGO} minutos e tente de novo.`, "codigo")
      : erro(400, "Código errado. Confira com o cliente e tente de novo.", "codigo");
  }

  const chat = await prisma.$transaction(async (tx) => {
    const r = await tx.contrato.updateMany({
      where: { id, status: "COMBINADO" },
      data: {
        status: "CONCLUIDO",
        concluidoEm: agora,
        tentativasCodigo: 0,
        ...(c.statusPagamento === "RETIDO" && { statusPagamento: "LIBERADO", liberadoEm: agora }),
      },
    });
    if (r.count === 0) return null;
    const texto = "Serviço concluído ✔ Agora vocês podem avaliar um ao outro.";
    const m = await avisoNoChat(tx, c, texto, agora, userId);
    await criarAviso(tx, c.clienteId, `Serviço com ${primeiroNome(c.prestador.nome)} concluído. Conte como foi!`, linkDo(c));
    await criarAviso(tx, c.prestadorId, `Serviço com ${primeiroNome(c.cliente.nome)} concluído. Avalie o cliente.`, linkDo(c));
    return m;
  });
  if (!chat) return erro(409, "Esse serviço já foi concluído ou cancelado.");
  const todos = [c.clienteId, c.prestadorId];
  return { ok: true, chat: [chat], avisados: todos, contrato: [{ id, avisar: todos }] };
}

/** O código só aparece para o cliente, depois de escolher como pagar. */
export function codigoParaCliente(c: Pick<Contrato, "codigoCifrado" | "status">): string | null {
  if (c.status !== "COMBINADO" || !c.codigoCifrado) return null;
  return decifrarCodigo(c.codigoCifrado);
}

// ---------- Cancelamento ----------

export async function cancelarContrato(
  prisma: PrismaClient,
  id: string,
  userId: string,
  motivo: keyof typeof MOTIVOS_CANCELAMENTO | "nao_aconteceu",
  agora = new Date()
): Promise<({ ok: true } & Efeitos) | Erro> {
  const achado = await contratoDe(prisma, id, userId);
  if (!achado) return NAO_ENCONTRADO;
  const { c, papel } = achado;
  if (c.status !== "COMBINADO") return erro(409, "Esse serviço já foi concluído ou cancelado.");
  if (motivo === "nao_aconteceu") {
    if (papel !== "cliente") return erro(403, "Só o cliente pode marcar que o serviço não aconteceu.");
    if (agora < prazosDo(c).naoAconteceuEm) return erro(409, "Ainda não dá para marcar \"Não aconteceu\".");
  }

  const textoMotivo = motivo === "nao_aconteceu" ? "O serviço não aconteceu" : MOTIVOS_CANCELAMENTO[motivo];
  const quem = primeiroNome(papel === "cliente" ? c.cliente.nome : c.prestador.nome);
  const outroId = papel === "cliente" ? c.prestadorId : c.clienteId;

  const chat = await prisma.$transaction(async (tx) => {
    const r = await tx.contrato.updateMany({
      where: { id, status: "COMBINADO" },
      data: {
        status: "CANCELADO",
        canceladoEm: agora,
        canceladoPorId: userId,
        motivoCancelamento: textoMotivo,
        // Dinheiro guardado volta para o cliente
        ...(c.statusPagamento === "RETIDO" && { statusPagamento: "ESTORNADO" }),
      },
    });
    if (r.count === 0) return null;
    // Serviço que veio de pedido: o pedido volta a ficar aberto para outros prestadores
    if (c.pedidoId) await tx.pedido.updateMany({ where: { id: c.pedidoId, status: "FECHADO" }, data: { status: "ABERTO" } });
    const devolve = c.statusPagamento === "RETIDO" ? ` O valor de ${formatarPreco(c.valor)} volta para ${primeiroNome(c.cliente.nome)}.` : "";
    const texto = `${quem} cancelou o serviço. Motivo: ${textoMotivo}.${devolve}`;
    const m = await avisoNoChat(tx, c, texto, agora, userId);
    await criarAviso(tx, outroId, texto, linkDo(c));
    return m;
  });
  if (!chat) return erro(409, "Esse serviço já foi concluído ou cancelado.");
  return { ok: true, chat: [chat], avisados: [outroId], contrato: [{ id, avisar: [c.clienteId, c.prestadorId] }] };
}

// ---------- Prazos (rodam a cada 15 minutos) ----------

export async function processarPrazos(prisma: PrismaClient, agora = new Date()): Promise<Efeitos> {
  const efeitos: Efeitos = { chat: [], avisados: [], contrato: [] };
  const abertos = await prisma.contrato.findMany({
    where: { status: "COMBINADO", OR: [{ avisoTresDias: false }, { avisoSeisDias: false }, { statusPagamento: { in: ["RETIDO", "DIRETO"] } }] },
    include: { cliente: { select: { nome: true } }, prestador: { select: { nome: true } } },
    take: 500,
  });

  for (const c of abertos) {
    const { naoAconteceuEm, liberaEm } = prazosDo(c);
    const pago = c.statusPagamento === "RETIDO" || c.statusPagamento === "DIRETO";

    // 7 dias sem ninguém agir: conclui sozinho e libera o valor
    if (pago && agora >= liberaEm) {
      const chat = await prisma.$transaction(async (tx) => {
        const r = await tx.contrato.updateMany({
          where: { id: c.id, status: "COMBINADO" },
          data: {
            status: "CONCLUIDO",
            concluidoEm: agora,
            ...(c.statusPagamento === "RETIDO" && { statusPagamento: "LIBERADO", liberadoEm: agora }),
          },
        });
        if (r.count === 0) return null;
        const texto = `Passaram ${DIAS_PARA_LIBERAR} dias da data combinada: o serviço foi dado como concluído.`;
        const m = await avisoNoChat(tx, c, texto, agora);
        await criarAviso(tx, c.clienteId, texto, linkDo(c));
        await criarAviso(tx, c.prestadorId, texto, linkDo(c));
        return m;
      });
      if (chat) {
        efeitos.chat.push(chat);
        efeitos.avisados.push(c.clienteId, c.prestadorId);
        efeitos.contrato.push({ id: c.id, avisar: [c.clienteId, c.prestadorId] });
      }
      continue;
    }

    // 1 dia antes dos 7 dias: avisa os dois
    if (pago && !c.avisoSeisDias && agora.getTime() >= liberaEm.getTime() - DIA_MS) {
      const marcou = await prisma.contrato.updateMany({ where: { id: c.id, avisoSeisDias: false }, data: { avisoSeisDias: true } });
      if (marcou.count > 0) {
        await criarAviso(prisma, c.clienteId, `Amanhã o serviço com ${primeiroNome(c.prestador.nome)} é dado como concluído. Se não aconteceu, avise hoje.`, linkDo(c));
        await criarAviso(prisma, c.prestadorId, `Amanhã o serviço com ${primeiroNome(c.cliente.nome)} é dado como concluído.`, linkDo(c));
        efeitos.avisados.push(c.clienteId, c.prestadorId);
      }
    }

    // 3 dias: o cliente já pode marcar "Não aconteceu"
    if (!c.avisoTresDias && agora >= naoAconteceuEm) {
      const marcou = await prisma.contrato.updateMany({ where: { id: c.id, avisoTresDias: false }, data: { avisoTresDias: true } });
      if (marcou.count > 0) {
        await criarAviso(prisma, c.clienteId, `O serviço com ${primeiroNome(c.prestador.nome)} não aconteceu? Agora você pode marcar "Não aconteceu".`, linkDo(c));
        efeitos.avisados.push(c.clienteId);
        efeitos.contrato.push({ id: c.id, avisar: [c.clienteId] });
      }
    }
  }
  return efeitos;
}

// ---------- Avaliações ----------

export async function avaliar(
  prisma: PrismaClient,
  id: string,
  userId: string,
  dados: { nota: number; comentario?: string }
): Promise<{ ok: true; avaliadoId: string } | Erro> {
  const achado = await contratoDe(prisma, id, userId);
  if (!achado) return NAO_ENCONTRADO;
  const { c, papel } = achado;
  if (c.status !== "CONCLUIDO") return erro(409, "Dá para avaliar depois que o serviço for concluído.");
  const avaliadoId = papel === "cliente" ? c.prestadorId : c.clienteId;
  try {
    await prisma.avaliacao.create({
      data: { contratoId: id, autorId: userId, avaliadoId, nota: dados.nota, comentario: dados.comentario || null },
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return erro(409, "Você já avaliou esse serviço.");
    throw e;
  }
  return { ok: true, avaliadoId };
}

// ---------- Telas ----------

export async function detalheContrato(prisma: PrismaClient, id: string, userId: string, agora = new Date()) {
  const c = await prisma.contrato.findFirst({
    where: { id, OR: [{ clienteId: userId }, { prestadorId: userId }] },
    include: {
      cliente: { select: { id: true, nome: true, image: true } },
      prestador: { select: { id: true, nome: true, image: true } },
      avaliacoes: { where: { autorId: userId }, select: { nota: true, comentario: true } },
    },
  });
  if (!c) return null;
  const papel = c.clienteId === userId ? ("cliente" as const) : ("prestador" as const);
  const outro = papel === "cliente" ? c.prestador : c.cliente;
  const { naoAconteceuEm, liberaEm } = prazosDo(c);
  const combinado = c.status === "COMBINADO";
  const pago = c.statusPagamento === "RETIDO" || c.statusPagamento === "DIRETO";
  return {
    id: c.id,
    papel,
    conversaId: c.conversaId,
    outro: { id: outro.id, nome: outro.nome ?? "Usuário", foto: outro.image },
    valor: c.valor,
    quando: quandoDo(c),
    status: c.status,
    metodoPagamento: c.metodoPagamento,
    statusPagamento: c.statusPagamento,
    taxaValor: c.taxaValor,
    motivoCancelamento: c.motivoCancelamento,
    canceladoPorMim: c.canceladoPorId === userId,
    codigo: papel === "cliente" ? codigoParaCliente(c) : null,
    podeNaoAconteceu: papel === "cliente" && combinado && agora >= naoAconteceuEm,
    naoAconteceuEm: naoAconteceuEm.toISOString(),
    liberaEm: combinado && pago ? liberaEm.toISOString() : null,
    minhaAvaliacao: c.avaliacoes.at(0) ?? null,
  };
}
export type DetalheContrato = NonNullable<Awaited<ReturnType<typeof detalheContrato>>>;

export async function listarContratos(prisma: PrismaClient, userId: string, papel: "cliente" | "prestador") {
  const lista = await prisma.contrato.findMany({
    where: papel === "cliente" ? { clienteId: userId } : { prestadorId: userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      cliente: { select: { nome: true, image: true } },
      prestador: { select: { nome: true, image: true } },
      avaliacoes: { where: { autorId: userId }, select: { id: true } },
    },
  });
  return lista.map((c) => {
    const outro = papel === "cliente" ? c.prestador : c.cliente;
    return {
      id: c.id,
      outro: { nome: outro.nome ?? "Usuário", foto: outro.image },
      valor: c.valor,
      quando: quandoDo(c),
      status: c.status,
      statusPagamento: c.statusPagamento,
      falta: c.status === "COMBINADO" && c.statusPagamento === "PENDENTE" ? ("pagar" as const) : c.status === "CONCLUIDO" && c.avaliacoes.length === 0 ? ("avaliar" as const) : null,
    };
  });
}

/** Quanto o prestador recebeu pelo app, quanto está guardado e quanto combinou direto. */
export async function ganhosDo(prisma: PrismaClient, prestadorId: string) {
  const grupos = await prisma.contrato.groupBy({
    by: ["statusPagamento"],
    where: { prestadorId, status: { not: "CANCELADO" } },
    _sum: { valor: true, taxaValor: true },
    _count: true,
  });
  const soma = (s: string) => {
    const g = grupos.find((x) => x.statusPagamento === s);
    return { valor: (g?._sum.valor ?? 0) - (g?._sum.taxaValor ?? 0), quantidade: g?._count ?? 0 };
  };
  return { recebido: soma("LIBERADO"), guardado: soma("RETIDO"), direto: soma("DIRETO") };
}
