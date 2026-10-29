import { afterAll, beforeEach, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";

let userId: string;

beforeEach(async () => {
  await prisma.user.deleteMany();
  userId = (await prisma.user.create({ data: { nome: "Cliente", email: "cliente@teste.test" } })).id;
});
afterAll(async () => {
  await prisma.$disconnect();
});

const endereco = { rua: "Rua A", numero: "10", bairro: "Marco", cidade: "Belém", latitude: -1.43, longitude: -48.47 };

describe("modelos da fase 3", () => {
  test("cada pessoa tem um endereço só", async () => {
    await prisma.enderecoUsuario.create({ data: { userId, ...endereco } });
    await expect(prisma.enderecoUsuario.create({ data: { userId, ...endereco } })).rejects.toMatchObject({ code: "P2002" });
  });

  test("pedido urgente com fotos é apagado junto com o cliente", async () => {
    const pedido = await prisma.pedido.create({
      data: {
        clienteId: userId,
        categoria: "encanamento",
        descricao: "Cano estourou na cozinha",
        fotos: ["/api/arquivos/pedidos/a.webp"],
        urgente: true,
        urgenteAte: new Date(Date.now() + 3 * 3600_000),
        quandoTipo: "QUALQUER_DIA",
        ...endereco,
      },
    });
    expect(pedido.status).toBe("ABERTO");
    await prisma.user.delete({ where: { id: userId } });
    expect(await prisma.pedido.count()).toBe(0);
  });

  test("anúncio novo nasce ativo, sem fotos e na categoria 'outros'", async () => {
    const s = await prisma.servico.create({
      data: { titulo: "Teste", descricao: "Descrição", preco: 10, latitude: 0, longitude: 0, prestadorId: userId },
    });
    expect(s).toMatchObject({ categoria: "outros", ativo: true, fotos: [] });
  });

  test("perfil de prestador guarda até quando está disponível", async () => {
    const ate = new Date();
    const p = await prisma.perfilPrestador.create({
      data: { userId, categorias: ["pintura"], bairro: "Marco", cidade: "Belém", latitude: 0, longitude: 0, disponivel: true, disponivelAte: ate },
    });
    expect(p.disponivelAte?.getTime()).toBe(ate.getTime());
  });
});
