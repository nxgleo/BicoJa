import { afterAll, beforeEach, describe, expect, test } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { autenticar } from "@/lib/contas/entrar";

beforeEach(async () => {
  await prisma.user.deleteMany();
  await prisma.user.create({
    data: { nome: "Maria", email: "maria@teste.test", telefone: "91988887777", senha: await bcrypt.hash("casa-amarela-7", 4) },
  });
  await prisma.user.create({ data: { nome: "Antigo", email: "antigo@teste.test" } });
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("autenticar", () => {
  test("entra com email em maiúsculas", async () => {
    expect(await autenticar(prisma, "MARIA@Teste.test", "casa-amarela-7")).toMatchObject({ email: "maria@teste.test" });
  });

  test("entra com celular digitado com máscara", async () => {
    expect(await autenticar(prisma, "(91) 98888-7777", "casa-amarela-7")).toMatchObject({ name: "Maria" });
  });

  test("senha errada não entra", async () => {
    expect(await autenticar(prisma, "maria@teste.test", "outra-coisa-1")).toBeNull();
  });

  test("quem não existe não entra", async () => {
    expect(await autenticar(prisma, "ninguem@teste.test", "casa-amarela-7")).toBeNull();
  });

  test("conta antiga sem senha não entra", async () => {
    expect(await autenticar(prisma, "antigo@teste.test", "qualquer-coisa")).toBeNull();
  });
});
