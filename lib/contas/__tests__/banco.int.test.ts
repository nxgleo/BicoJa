import { afterAll, beforeEach, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";

beforeEach(async () => {
  await prisma.user.deleteMany();
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("modelos de contas", () => {
  test("não deixa dois usuários com o mesmo celular", async () => {
    await prisma.user.create({ data: { nome: "A", email: "a@teste.test", telefone: "91988887777" } });
    await expect(
      prisma.user.create({ data: { nome: "B", email: "b@teste.test", telefone: "91988887777" } })
    ).rejects.toMatchObject({ code: "P2002" });
  });

  test("código e perfil de prestador são apagados junto com o usuário", async () => {
    const user = await prisma.user.create({ data: { nome: "C", email: "c@teste.test" } });
    await prisma.codigoVerificacao.create({
      data: { userId: user.id, tipo: "EMAIL_CADASTRO", codigoHash: "x", expiraEm: new Date() },
    });
    await prisma.perfilPrestador.create({
      data: { userId: user.id, categorias: ["pintura"], bairro: "Marco", cidade: "Belém", latitude: -1.4, longitude: -48.4 },
    });
    expect(user).toBeTruthy();
    await prisma.user.delete({ where: { id: user.id } });
    expect(await prisma.codigoVerificacao.count()).toBe(0);
    expect(await prisma.perfilPrestador.count()).toBe(0);
  });

  test("conta nova começa no modo cliente", async () => {
    const user = await prisma.user.create({ data: { nome: "D", email: "d@teste.test" } });
    expect(user.modoAtual).toBe("CLIENTE");
  });
});
