import { afterAll, beforeEach, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { avisarPrestadoresDoUrgente } from "@/lib/pedidos/avisar-urgente";

const AGORA = new Date("2026-10-20T12:00:00Z");
const DEPOIS = new Date(AGORA.getTime() + 3600_000);
const CENTRO = { latitude: -1.43, longitude: -48.47 };

async function prestador(email: string, extra: { categorias?: string[]; latitude?: number; disponivelAte?: Date | null; raioKm?: number }) {
  const u = await prisma.user.create({ data: { nome: email, email } });
  await prisma.perfilPrestador.create({
    data: {
      userId: u.id,
      categorias: extra.categorias ?? ["encanamento"],
      bairro: "Marco",
      cidade: "Belém",
      latitude: extra.latitude ?? CENTRO.latitude,
      longitude: CENTRO.longitude,
      raioKm: extra.raioKm ?? 10,
      disponivel: extra.disponivelAte !== null,
      disponivelAte: extra.disponivelAte === undefined ? DEPOIS : extra.disponivelAte,
    },
  });
  return u.id;
}

beforeEach(async () => {
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe("avisar prestadores do pedido urgente", () => {
  test("só quem é da categoria, está disponível e atende até aquela distância", async () => {
    const certo = await prestador("certo@teste.test", {});
    await prestador("outra-categoria@teste.test", { categorias: ["pintura"] });
    await prestador("desligado@teste.test", { disponivelAte: null });
    await prestador("expirou@teste.test", { disponivelAte: new Date(AGORA.getTime() - 1000) });
    await prestador("longe@teste.test", { latitude: -1.6, raioKm: 5 }); // ~19 km

    const cliente = await prisma.user.create({ data: { nome: "Maria", email: "maria@teste.test" } });
    const pedido = await prisma.pedido.create({
      data: { clienteId: cliente.id, categoria: "encanamento", descricao: "Cano estourado", urgente: true, quandoTipo: "QUALQUER_DIA", rua: "R", numero: "1", bairro: "Marco", cidade: "Belém", ...CENTRO },
    });

    expect(await avisarPrestadoresDoUrgente(prisma, pedido.id, AGORA)).toEqual([certo]);
    const aviso = await prisma.aviso.findFirstOrThrow({ where: { userId: certo } });
    expect(aviso).toMatchObject({ href: `/pedidos/${pedido.id}` });
    expect(aviso.texto).toContain("Marco");
    expect(aviso.texto).not.toContain("R, 1"); // nunca manda a rua
  });
});
