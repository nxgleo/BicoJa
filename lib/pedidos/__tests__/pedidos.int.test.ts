import { afterAll, beforeEach, describe, expect, test } from "vitest";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { salvarImagem } from "@/lib/imagens";
import {
  cancelarPedido,
  contarUrgentes,
  criarPedido,
  detalhePedido,
  meusPedidos,
  pedidosParaPrestador,
} from "@/lib/pedidos/pedidos";
import type { DadosPedido } from "@/lib/pedidos/esquemas";

let prestadorId: string;
let clienteId: string;
const CENTRO = { latitude: -1.43, longitude: -48.47 };

async function criarCliente(email: string, latitude: number) {
  const user = await prisma.user.create({ data: { nome: "Maria da Silva", email } });
  await prisma.enderecoUsuario.create({
    data: { userId: user.id, rua: "Rua Secreta", numero: "77", complemento: "casa B", bairro: "Marco", cidade: "Belém", latitude, longitude: CENTRO.longitude },
  });
  return user.id;
}

function pedido(extra: Partial<DadosPedido> = {}): DadosPedido {
  return { categoria: "encanamento", descricao: "A pia está vazando muito", fotos: [], urgente: false, quando: { tipo: "QUALQUER_DIA" }, ...extra } as DadosPedido;
}

beforeEach(async () => {
  await prisma.user.deleteMany();
  const prestador = await prisma.user.create({ data: { nome: "João", email: "joao@teste.test" } });
  prestadorId = prestador.id;
  await prisma.perfilPrestador.create({
    data: { userId: prestadorId, categorias: ["encanamento"], bairro: "Marco", cidade: "Belém", raioKm: 10, ...CENTRO },
  });
  await prisma.enderecoUsuario.create({ data: { userId: prestadorId, rua: "R", numero: "1", bairro: "Marco", cidade: "Belém", ...CENTRO } });
  clienteId = await criarCliente("maria@teste.test", -1.439); // ~1 km do prestador
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("criarPedido", () => {
  test("sem endereço salvo pede para salvar primeiro", async () => {
    const semEndereco = (await prisma.user.create({ data: { nome: "X", email: "x@teste.test" } })).id;
    expect(await criarPedido(prisma, semEndereco, pedido())).toEqual({ ok: false, campo: "endereco", erro: "Salve seu endereço primeiro." });
  });

  test("foto inventada é recusada", async () => {
    const r = await criarPedido(prisma, clienteId, pedido({ fotos: ["/api/arquivos/pedidos/0b9f6d3e-1c2a-4f5b-9a8e-7d6c5b4a3f21.webp"] }));
    expect(r).toMatchObject({ ok: false, campo: "fotos" });
  });

  test("foto enviada de verdade é aceita", async () => {
    const webp = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#fff" } }).webp().toBuffer();
    const url = await salvarImagem("pedidos", webp, clienteId);
    expect((await criarPedido(prisma, clienteId, pedido({ fotos: [url] }))).ok).toBe(true);
  });
});

describe("pedidosParaPrestador", () => {
  test("mostra pedidos da categoria dele, perto, e não os dele", async () => {
    await criarPedido(prisma, clienteId, pedido());
    await criarPedido(prisma, clienteId, pedido({ categoria: "pintura" }));
    const longe = await criarCliente("longe@teste.test", -1.7); // ~30 km
    await criarPedido(prisma, longe, pedido());
    await criarPedido(prisma, prestadorId, pedido());

    const lista = await pedidosParaPrestador(prisma, prestadorId, "pedidos");
    expect(lista).toHaveLength(1);
    expect(lista[0].distanciaKm).toBeGreaterThan(0.5);
    expect(lista[0].distanciaKm).toBeLessThan(1.5);
  });

  test("urgente fica 3 horas na aba Urgentes e depois passa para Pedidos", async () => {
    const agora = new Date();
    await criarPedido(prisma, clienteId, pedido({ urgente: true }), agora);
    expect(await pedidosParaPrestador(prisma, prestadorId, "urgentes", agora)).toHaveLength(1);
    expect(await pedidosParaPrestador(prisma, prestadorId, "pedidos", agora)).toHaveLength(0);
    expect(await contarUrgentes(prisma, prestadorId, agora)).toBe(1);

    const depois = new Date(agora.getTime() + 3 * 3600_000 + 60_000);
    expect(await pedidosParaPrestador(prisma, prestadorId, "urgentes", depois)).toHaveLength(0);
    const normais = await pedidosParaPrestador(prisma, prestadorId, "pedidos", depois);
    expect(normais).toHaveLength(1);
    expect(normais[0].urgente).toBe(false);
  });

  test("distância vai arredondada de meio em meio km (não dá para achar a casa por triangulação)", async () => {
    await criarPedido(prisma, clienteId, pedido());
    const [item] = await pedidosParaPrestador(prisma, prestadorId, "pedidos");
    expect((item.distanciaKm! * 2) % 1).toBe(0);
    const r = await detalhePedido(prisma, item.id, { userId: prestadorId });
    expect(r && !r.doDono && (r.pedido.distanciaKm! * 2) % 1).toBe(0);
  });

  test("nunca mostra rua, número, complemento ou coordenadas do cliente", async () => {
    await criarPedido(prisma, clienteId, pedido());
    const [item] = await pedidosParaPrestador(prisma, prestadorId, "pedidos");
    for (const campo of ["rua", "numero", "complemento", "latitude", "longitude", "email", "telefone"]) {
      expect(Object.keys(item)).not.toContain(campo);
    }
    expect(JSON.stringify(item)).not.toContain("Rua Secreta");
    expect(item.cliente.nome).toBe("Maria");
    expect(item.bairro).toBe("Marco");
  });
});

describe("detalhe, meus pedidos e cancelar", () => {
  test("outra pessoa não vê o endereço; o dono vê", async () => {
    const r = await criarPedido(prisma, clienteId, pedido());
    if (!r.ok) throw new Error("falhou");
    const visto = await detalhePedido(prisma, r.id, { userId: prestadorId });
    expect(JSON.stringify(visto)).not.toContain("Rua Secreta");
    const doDono = await detalhePedido(prisma, r.id, { userId: clienteId });
    expect(JSON.stringify(doDono)).toContain("Rua Secreta");
  });

  test("só o dono cancela, e o pedido some da lista do prestador", async () => {
    const r = await criarPedido(prisma, clienteId, pedido());
    if (!r.ok) throw new Error("falhou");
    expect((await cancelarPedido(prisma, r.id, prestadorId)).ok).toBe(false);
    expect((await cancelarPedido(prisma, r.id, clienteId)).ok).toBe(true);
    expect(await pedidosParaPrestador(prisma, prestadorId, "pedidos")).toHaveLength(0);
    expect((await meusPedidos(prisma, clienteId))[0].status).toBe("CANCELADO");
  });
});
