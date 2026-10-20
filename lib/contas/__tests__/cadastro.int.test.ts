import { afterAll, beforeEach, describe, expect, test } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { criarConta } from "@/lib/contas/cadastro";
import { esquemaCadastro } from "@/lib/contas/esquemas";

function dados(extra: Record<string, string> = {}) {
  return esquemaCadastro.parse({
    escolha: "CONTRATAR",
    nome: "Maria Silva",
    email: "maria@teste.test",
    telefone: "(91) 98888-7777",
    senha: "casa-amarela-7",
    ...extra,
  });
}

beforeEach(async () => {
  await prisma.user.deleteMany();
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("criarConta", () => {
  test("cria a conta guardando a senha embaralhada", async () => {
    const r = await criarConta(prisma, dados());
    expect(r.ok).toBe(true);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "maria@teste.test" } });
    expect(user.senha).not.toBe("casa-amarela-7");
    expect(await bcrypt.compare("casa-amarela-7", user.senha!)).toBe(true);
    expect(user.telefone).toBe("91988887777");
  });

  test("'os dois' grava AMBOS e começa no modo cliente", async () => {
    await criarConta(prisma, dados({ escolha: "OS_DOIS" }));
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "maria@teste.test" } });
    expect(user.role).toBe("AMBOS");
    expect(user.modoAtual).toBe("CLIENTE");
  });

  test("email repetido avisa no campo email", async () => {
    await criarConta(prisma, dados());
    const r = await criarConta(prisma, dados({ telefone: "91977776666" }));
    expect(r).toEqual({ ok: false, campo: "email", erro: "Esse email já tem conta. Quer entrar?" });
  });

  test("celular repetido com outra máscara avisa no campo telefone", async () => {
    await criarConta(prisma, dados());
    const r = await criarConta(prisma, dados({ email: "outra@teste.test", telefone: "+55 91 98888 7777" }));
    expect(r).toEqual({ ok: false, campo: "telefone", erro: "Esse celular já tem conta. Quer entrar?" });
  });

  test("dois cliques ao mesmo tempo criam uma conta só", async () => {
    const [a, b] = await Promise.all([criarConta(prisma, dados()), criarConta(prisma, dados())]);
    expect([a.ok, b.ok].sort()).toEqual([false, true]);
    const falhou = a.ok ? b : a;
    expect(falhou).toMatchObject({ ok: false, campo: "email" });
    expect(await prisma.user.count()).toBe(1);
  });
});
