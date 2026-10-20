import { afterAll, beforeEach, describe, expect, test } from "vitest";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { salvarImagem } from "@/lib/imagens";
import {
  abrirConversa,
  bloquear,
  denunciar,
  enviarMensagem,
  enviarProposta,
  iniciarConversa,
  listarConversas,
  marcarLida,
  podeVerFotoDoChat,
  responderProposta,
  totalNaoLidas,
} from "@/lib/chat/conversas";
import type { DadosProposta } from "@/lib/chat/esquemas";

let clienteId: string;
let prestadorId: string;
let outroPrestadorId: string;
let servicoId: string;
const LUGAR = { bairro: "Marco", cidade: "Belém", latitude: -1.43, longitude: -48.47 };
const proposta = (valor = 120): DadosProposta => ({ valor, quando: { tipo: "QUALQUER_DIA" } });

async function prestador(nome: string, email: string) {
  const u = await prisma.user.create({ data: { nome, email, telefone: `9199${Math.floor(Math.random() * 1e7)}` } });
  await prisma.perfilPrestador.create({ data: { userId: u.id, categorias: ["encanamento"], raioKm: 10, ...LUGAR } });
  return u.id;
}

beforeEach(async () => {
  await prisma.user.deleteMany();
  const cliente = await prisma.user.create({ data: { nome: "Maria", email: "maria@teste.test", telefone: "91900000001" } });
  clienteId = cliente.id;
  await prisma.enderecoUsuario.create({ data: { userId: clienteId, rua: "Rua Secreta", numero: "77", ...LUGAR } });
  prestadorId = await prestador("João", "joao@teste.test");
  outroPrestadorId = await prestador("Ana", "ana@teste.test");
  servicoId = (
    await prisma.servico.create({
      data: { titulo: "Conserto de pia", descricao: "Troca de sifão", preco: 80, latitude: -1.43, longitude: -48.47, prestadorId },
    })
  ).id;
});

afterAll(async () => {
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

async function conversaPeloAnuncio() {
  const r = await iniciarConversa(prisma, clienteId, { servicoId });
  if (!r.ok) throw new Error(r.erro);
  return r.id;
}

async function pedidoAberto() {
  return (
    await prisma.pedido.create({
      data: { clienteId, categoria: "encanamento", descricao: "Pia vazando", quandoTipo: "QUALQUER_DIA", rua: "Rua do Pedido", numero: "10", ...LUGAR },
    })
  ).id;
}

describe("começar conversa", () => {
  test("pelo anúncio: quem toca é o cliente; tocar de novo reabre a mesma conversa", async () => {
    const id = await conversaPeloAnuncio();
    const c = await prisma.conversa.findUniqueOrThrow({ where: { id } });
    expect([c.clienteId, c.prestadorId, c.servicoId]).toEqual([clienteId, prestadorId, servicoId]);
    expect(await conversaPeloAnuncio()).toBe(id);
  });

  test("pelo pedido: quem toca é o prestador; quem não é prestador não pode", async () => {
    const pedidoId = await pedidoAberto();
    const r = await iniciarConversa(prisma, prestadorId, { pedidoId });
    expect(r.ok).toBe(true);
    const semPerfil = await prisma.user.create({ data: { nome: "Zé", email: "ze@teste.test" } });
    expect(await iniciarConversa(prisma, semPerfil.id, { pedidoId })).toMatchObject({ ok: false, status: 403 });
  });

  test("não conversa consigo mesmo nem com quem bloqueou", async () => {
    expect(await iniciarConversa(prisma, prestadorId, { servicoId })).toMatchObject({ ok: false, status: 400 });
    const id = await conversaPeloAnuncio();
    await bloquear(prisma, id, prestadorId, true);
    expect(await iniciarConversa(prisma, clienteId, { servicoId })).toMatchObject({ ok: false, status: 403 });
  });
});

describe("mensagens", () => {
  test("só quem participa lê e escreve; não lidas e visto", async () => {
    const id = await conversaPeloAnuncio();
    expect(await abrirConversa(prisma, id, outroPrestadorId)).toBeNull();
    expect(await enviarMensagem(prisma, id, outroPrestadorId, { texto: "oi" })).toMatchObject({ ok: false, status: 404 });

    const r = await enviarMensagem(prisma, id, clienteId, { texto: "Oi, João!" });
    expect(r).toMatchObject({ ok: true, avisar: [clienteId, prestadorId] });
    expect(await totalNaoLidas(prisma, prestadorId)).toBe(1);
    expect(await totalNaoLidas(prisma, clienteId)).toBe(0);

    const [item] = await listarConversas(prisma, prestadorId);
    expect(item).toMatchObject({ previa: "Oi, João!", naoLidas: 1, outro: { nome: "Maria" } });

    const lida = await marcarLida(prisma, id, prestadorId);
    expect(lida?.outroId).toBe(clienteId);
    expect(await totalNaoLidas(prisma, prestadorId)).toBe(0);
    const vista = await abrirConversa(prisma, id, clienteId);
    expect(vista?.lidaPeloOutroEm).toBe(lida?.em);
  });

  test("foto do chat precisa ser de quem mandou e só abre para a conversa", async () => {
    const id = await conversaPeloAnuncio();
    const webp = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#fff" } }).webp().toBuffer();
    const daAna = await salvarImagem("chat", webp, outroPrestadorId);
    expect(await enviarMensagem(prisma, id, clienteId, { fotoUrl: daAna })).toMatchObject({ ok: false, campo: "foto" });

    const url = await salvarImagem("chat", webp, clienteId);
    expect(await enviarMensagem(prisma, id, clienteId, { fotoUrl: url })).toMatchObject({ ok: true });
    const nome = url.split("/").pop()!;
    expect(await podeVerFotoDoChat(prisma, url, nome, prestadorId)).toBe(true);
    expect(await podeVerFotoDoChat(prisma, url, nome, outroPrestadorId)).toBe(false);
  });

  test("bloqueio impede mensagens dos dois lados até desbloquear", async () => {
    const id = await conversaPeloAnuncio();
    await bloquear(prisma, id, clienteId, true);
    expect(await enviarMensagem(prisma, id, prestadorId, { texto: "oi" })).toMatchObject({ ok: false, status: 403 });
    expect(await enviarMensagem(prisma, id, clienteId, { texto: "oi" })).toMatchObject({ ok: false, status: 403 });
    expect((await abrirConversa(prisma, id, clienteId))?.bloqueadoPorMim).toBe(true);
    await bloquear(prisma, id, clienteId, false);
    expect(await enviarMensagem(prisma, id, prestadorId, { texto: "oi" })).toMatchObject({ ok: true });
  });

  test("denúncia fica guardada", async () => {
    const id = await conversaPeloAnuncio();
    await denunciar(prisma, id, clienteId, { motivo: "golpe", detalhe: "Pediu PIX adiantado" });
    expect(await prisma.denuncia.count({ where: { denunciadoId: prestadorId, motivo: "golpe" } })).toBe(1);
  });
});

describe("propostas", () => {
  test("negociar troca a proposta pendente; quem mandou não pode aceitar", async () => {
    const id = await conversaPeloAnuncio();
    const p1 = await enviarProposta(prisma, id, prestadorId, proposta(150));
    if (!p1.ok) throw new Error();
    const primeira = p1.mensagens[0].id;
    expect(await responderProposta(prisma, id, primeira, prestadorId, "aceitar")).toMatchObject({ ok: false, status: 400 });

    const p2 = await enviarProposta(prisma, id, clienteId, proposta(120));
    if (!p2.ok) throw new Error();
    expect(p2.mensagens.map((m) => m.proposta?.status)).toEqual(["SUBSTITUIDA", "PENDENTE"]);
    expect(await responderProposta(prisma, id, primeira, clienteId, "aceitar")).toMatchObject({ ok: false, status: 409 });
  });

  test("recusar mantém a conversa aberta", async () => {
    const id = await conversaPeloAnuncio();
    const p = await enviarProposta(prisma, id, prestadorId, proposta());
    if (!p.ok) throw new Error();
    expect(await responderProposta(prisma, id, p.mensagens[0].id, clienteId, "recusar")).toMatchObject({ ok: true });
    expect(await enviarMensagem(prisma, id, clienteId, { texto: "Pode fazer por 100?" })).toMatchObject({ ok: true });
  });

  test("aceitar cria contrato, mostra contato e fecha o pedido para os outros", async () => {
    const pedidoId = await pedidoAberto();
    const comJoao = await iniciarConversa(prisma, prestadorId, { pedidoId });
    const comAna = await iniciarConversa(prisma, outroPrestadorId, { pedidoId });
    if (!comJoao.ok || !comAna.ok) throw new Error();

    const daAna = await enviarProposta(prisma, comAna.id, outroPrestadorId, proposta(200));
    const doJoao = await enviarProposta(prisma, comJoao.id, prestadorId, proposta(120));
    if (!daAna.ok || !doJoao.ok) throw new Error();
    expect((await abrirConversa(prisma, comJoao.id, prestadorId))?.contato).toBeNull();

    const r = await responderProposta(prisma, comJoao.id, doJoao.mensagens[0].id, clienteId, "aceitar");
    expect(r).toMatchObject({ ok: true });
    expect(await prisma.contrato.count({ where: { conversaId: comJoao.id, valor: 120, status: "COMBINADO" } })).toBe(1);
    expect((await prisma.pedido.findUniqueOrThrow({ where: { id: pedidoId } })).status).toBe("FECHADO");

    // Prestador vê celular e endereço do pedido; cliente vê só o celular
    const visaoJoao = await abrirConversa(prisma, comJoao.id, prestadorId);
    expect(visaoJoao?.contato).toMatchObject({ telefone: "91900000001", endereco: expect.stringContaining("Rua do Pedido, 10") });
    expect((await abrirConversa(prisma, comJoao.id, clienteId))?.contato?.endereco).toBeNull();

    // A conversa com a Ana recebe o aviso e a proposta dela fica recusada
    const visaoAna = await abrirConversa(prisma, comAna.id, outroPrestadorId);
    expect(visaoAna?.mensagens.at(-1)?.texto).toContain("já foi fechado");
    expect(visaoAna?.mensagens.find((m) => m.tipo === "PROPOSTA")?.proposta?.status).toBe("RECUSADA");
    expect(visaoAna?.contato).toBeNull();

    // Tocar "Aceitar" de novo não cria outro contrato
    expect(await responderProposta(prisma, comJoao.id, doJoao.mensagens[0].id, clienteId, "aceitar")).toMatchObject({ status: 409 });
  });
});
