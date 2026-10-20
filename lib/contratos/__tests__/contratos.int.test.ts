import { afterAll, beforeEach, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { enviarProposta, iniciarConversa, responderProposta } from "@/lib/chat/conversas";
import { decifrarCodigo } from "@/lib/contratos/codigo";
import {
  avaliar,
  cancelarContrato,
  concluirComCodigo,
  detalheContrato,
  escolherPagamento,
  ganhosDo,
  listarContratos,
  processarPrazos,
} from "@/lib/contratos/contratos";
import { notaDe } from "@/lib/avaliacoes";
import { contarAvisosNaoLidos } from "@/lib/avisos";

let clienteId: string;
let prestadorId: string;
let contratoId: string;
const LUGAR = { bairro: "Marco", cidade: "Belém", latitude: -1.43, longitude: -48.47 };
const DIA = 86_400_000;

async function combinar(quando: { tipo: "QUALQUER_DIA" } | { tipo: "DIA_CERTO"; dataInicio: string } = { tipo: "QUALQUER_DIA" }, pedidoId?: string) {
  const conversa = await iniciarConversa(prisma, pedidoId ? prestadorId : clienteId, pedidoId ? { pedidoId } : { prestadorId });
  if (!conversa.ok) throw new Error(conversa.erro);
  const p = await enviarProposta(prisma, conversa.id, prestadorId, { valor: 200, quando }, new Date("2026-10-20T12:00:00Z"));
  if (!p.ok) throw new Error(p.erro);
  const r = await responderProposta(prisma, conversa.id, p.mensagens[0].id, clienteId, "aceitar");
  if (!r.ok) throw new Error(r.erro);
  return (await prisma.contrato.findFirstOrThrow({ where: { conversaId: conversa.id }, orderBy: { createdAt: "desc" } })).id;
}

const codigoDe = async (id: string) => decifrarCodigo((await prisma.contrato.findUniqueOrThrow({ where: { id } })).codigoCifrado!)!;

beforeEach(async () => {
  await prisma.user.deleteMany();
  clienteId = (await prisma.user.create({ data: { nome: "Maria", email: "maria@teste.test" } })).id;
  prestadorId = (await prisma.user.create({ data: { nome: "João", email: "joao@teste.test" } })).id;
  await prisma.perfilPrestador.create({ data: { userId: prestadorId, categorias: ["encanamento"], raioKm: 10, ...LUGAR } });
  contratoId = await combinar();
});

afterAll(async () => {
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe("pagamento e código", () => {
  test("só o cliente paga, uma vez; o prestador é avisado; o código só aparece para o cliente", async () => {
    expect(await escolherPagamento(prisma, contratoId, prestadorId, "PIX")).toMatchObject({ ok: false, status: 403 });
    expect((await detalheContrato(prisma, contratoId, clienteId))?.codigo).toBeNull();

    expect(await escolherPagamento(prisma, contratoId, clienteId, "PIX")).toMatchObject({ ok: true, avisados: [prestadorId] });
    expect(await escolherPagamento(prisma, contratoId, clienteId, "CARTAO")).toMatchObject({ ok: false, status: 409 });
    expect(await contarAvisosNaoLidos(prisma, prestadorId)).toBe(1);

    const visaoCliente = await detalheContrato(prisma, contratoId, clienteId);
    expect(visaoCliente).toMatchObject({ statusPagamento: "RETIDO", taxaValor: 0 });
    expect(visaoCliente?.codigo).toMatch(/^\d{4}$/);
    expect((await detalheContrato(prisma, contratoId, prestadorId))?.codigo).toBeNull();
    // O banco não guarda o número aberto
    expect((await prisma.contrato.findUniqueOrThrow({ where: { id: contratoId } })).codigoCifrado).not.toContain(visaoCliente!.codigo!);
  });

  test("código certo conclui e libera; errado 5 vezes bloqueia", async () => {
    await escolherPagamento(prisma, contratoId, clienteId, "CARTAO");
    const certo = await codigoDe(contratoId);
    const errado = certo === "0000" ? "1111" : "0000";
    expect(await concluirComCodigo(prisma, contratoId, clienteId, certo)).toMatchObject({ ok: false, status: 403 });
    for (let i = 0; i < 4; i++) {
      expect(await concluirComCodigo(prisma, contratoId, prestadorId, errado)).toMatchObject({ ok: false, status: 400 });
    }
    expect(await concluirComCodigo(prisma, contratoId, prestadorId, errado)).toMatchObject({ ok: false, status: 429 });
    expect(await concluirComCodigo(prisma, contratoId, prestadorId, certo)).toMatchObject({ ok: false, status: 429 });

    const depois = new Date(Date.now() + 16 * 60_000);
    expect(await concluirComCodigo(prisma, contratoId, prestadorId, certo, depois)).toMatchObject({ ok: true });
    expect(await prisma.contrato.findUniqueOrThrow({ where: { id: contratoId } })).toMatchObject({ status: "CONCLUIDO", statusPagamento: "LIBERADO" });
    expect(await ganhosDo(prisma, prestadorId)).toMatchObject({ recebido: { valor: 200, quantidade: 1 }, guardado: { valor: 0 } });
  });
});

describe("cancelamento e prazos", () => {
  test("cancelar devolve o valor guardado e reabre o pedido", async () => {
    const pedidoId = (
      await prisma.pedido.create({ data: { clienteId, categoria: "encanamento", descricao: "Pia vazando", quandoTipo: "QUALQUER_DIA", rua: "R", numero: "1", ...LUGAR } })
    ).id;
    const id = await combinar({ tipo: "QUALQUER_DIA" }, pedidoId);
    expect((await prisma.pedido.findUniqueOrThrow({ where: { id: pedidoId } })).status).toBe("FECHADO");
    await escolherPagamento(prisma, id, clienteId, "PIX");

    expect(await cancelarContrato(prisma, id, prestadorId, "nao_consegui_ir")).toMatchObject({ ok: true, avisados: [clienteId] });
    expect(await prisma.contrato.findUniqueOrThrow({ where: { id } })).toMatchObject({ status: "CANCELADO", statusPagamento: "ESTORNADO", motivoCancelamento: "Não consegui ir" });
    expect((await prisma.pedido.findUniqueOrThrow({ where: { id: pedidoId } })).status).toBe("ABERTO");
    expect(await cancelarContrato(prisma, id, clienteId, "outro")).toMatchObject({ ok: false, status: 409 });
  });

  test("\"Não aconteceu\" só depois de 3 dias da data e só para o cliente", async () => {
    const id = await combinar({ tipo: "DIA_CERTO", dataInicio: "2026-10-25" });
    const dia25 = new Date("2026-10-25T15:00:00Z");
    expect(await cancelarContrato(prisma, id, clienteId, "nao_aconteceu", dia25)).toMatchObject({ ok: false, status: 409 });
    const dia28 = new Date("2026-10-28T04:00:00Z");
    expect(await cancelarContrato(prisma, id, prestadorId, "nao_aconteceu", dia28)).toMatchObject({ ok: false, status: 403 });
    expect(await cancelarContrato(prisma, id, clienteId, "nao_aconteceu", dia28)).toMatchObject({ ok: true });
  });

  test("prazos: avisa aos 3 e aos 6 dias e conclui sozinho aos 7 (só se já pagou)", async () => {
    const id = await combinar({ tipo: "DIA_CERTO", dataInicio: "2026-10-25" });
    await escolherPagamento(prisma, id, clienteId, "PIX");
    const base = new Date("2026-10-25T03:00:00Z").getTime();

    await processarPrazos(prisma, new Date(base + 3 * DIA + 60_000));
    expect((await prisma.contrato.findUniqueOrThrow({ where: { id } })).avisoTresDias).toBe(true);
    const avisosAntes = await contarAvisosNaoLidos(prisma, clienteId);
    await processarPrazos(prisma, new Date(base + 3 * DIA + 120_000)); // não repete o aviso
    expect(await contarAvisosNaoLidos(prisma, clienteId)).toBe(avisosAntes);

    await processarPrazos(prisma, new Date(base + 6 * DIA + 60_000));
    expect((await prisma.contrato.findUniqueOrThrow({ where: { id } })).avisoSeisDias).toBe(true);

    const r = await processarPrazos(prisma, new Date(base + 7 * DIA + 60_000));
    expect(r.contrato.map((x) => x.id)).toContain(id);
    expect(await prisma.contrato.findUniqueOrThrow({ where: { id } })).toMatchObject({ status: "CONCLUIDO", statusPagamento: "LIBERADO" });
    // O contrato do beforeEach não foi pago: continua esperando
    expect((await prisma.contrato.findUniqueOrThrow({ where: { id: contratoId } })).status).toBe("COMBINADO");
  });
});

describe("avaliações", () => {
  test("só depois de concluir, uma por pessoa, e entram na nota", async () => {
    expect(await avaliar(prisma, contratoId, clienteId, { nota: 5 })).toMatchObject({ ok: false, status: 409 });
    await escolherPagamento(prisma, contratoId, clienteId, "DIRETO");
    await concluirComCodigo(prisma, contratoId, prestadorId, await codigoDe(contratoId));

    expect(await avaliar(prisma, contratoId, clienteId, { nota: 5, comentario: "Ótimo!" })).toMatchObject({ ok: true, avaliadoId: prestadorId });
    expect(await avaliar(prisma, contratoId, clienteId, { nota: 1 })).toMatchObject({ ok: false, status: 409 });
    expect(await avaliar(prisma, contratoId, prestadorId, { nota: 4 })).toMatchObject({ ok: true, avaliadoId: clienteId });
    expect(await notaDe(prisma, prestadorId)).toEqual({ media: 5, total: 1 });

    const [item] = await listarContratos(prisma, clienteId, "cliente");
    expect(item).toMatchObject({ status: "CONCLUIDO", statusPagamento: "DIRETO", falta: null });
  });
});
