import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { conferirCodigo, enviarCodigo, gerarCodigo, redefinirSenha } from "@/lib/contas/codigos";

let userId: string;
let emails: string[] = [];

/** Lê o último código "enviado" (sem SMTP o email vai para o console.log). */
function ultimoCodigo(): string {
  const texto = emails.at(-1) ?? "";
  return texto.match(/\b(\d{6})\b/)?.[1] ?? "";
}

beforeEach(async () => {
  vi.stubEnv("SMTP_HOST", "");
  emails = [];
  vi.spyOn(console, "log").mockImplementation((...partes) => {
    emails.push(partes.join(" "));
  });
  await prisma.user.deleteMany();
  const user = await prisma.user.create({
    data: { nome: "Maria", email: "maria@teste.test", senha: await bcrypt.hash("senha-antiga-9", 4) },
  });
  userId = user.id;
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await prisma.$disconnect();
});

describe("gerarCodigo", () => {
  test("sempre 6 números", () => {
    for (let i = 0; i < 100; i++) expect(gerarCodigo()).toMatch(/^\d{6}$/);
  });
});

describe("enviarCodigo e conferirCodigo", () => {
  test("código certo confirma o email e o banco não guarda o número", async () => {
    expect(await enviarCodigo(prisma, userId, "EMAIL_CADASTRO")).toEqual({ ok: true });
    const codigo = ultimoCodigo();
    const salvo = await prisma.codigoVerificacao.findFirstOrThrow({ where: { userId } });
    expect(salvo.codigoHash).not.toContain(codigo);

    expect(await conferirCodigo(prisma, userId, "EMAIL_CADASTRO", codigo)).toEqual({ ok: true });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.emailVerified).toBeInstanceOf(Date);
  });

  test("não deixa pedir de novo antes de 60 segundos", async () => {
    const agora = new Date();
    await enviarCodigo(prisma, userId, "EMAIL_CADASTRO", agora);
    const r = await enviarCodigo(prisma, userId, "EMAIL_CADASTRO", new Date(agora.getTime() + 15_000));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.esperarSegundos).toBeGreaterThanOrEqual(1);
      expect(r.esperarSegundos).toBeLessThanOrEqual(60);
    }
  });

  test("o mesmo código não serve duas vezes", async () => {
    await enviarCodigo(prisma, userId, "EMAIL_CADASTRO");
    const codigo = ultimoCodigo();
    await conferirCodigo(prisma, userId, "EMAIL_CADASTRO", codigo);
    expect(await conferirCodigo(prisma, userId, "EMAIL_CADASTRO", codigo)).toMatchObject({ ok: false, motivo: "inexistente" });
  });

  test("código vence em 10 minutos", async () => {
    const antes = new Date(Date.now() - 11 * 60_000);
    await enviarCodigo(prisma, userId, "EMAIL_CADASTRO", antes);
    expect(await conferirCodigo(prisma, userId, "EMAIL_CADASTRO", ultimoCodigo())).toMatchObject({ ok: false, motivo: "expirado" });
  });

  test("5 erros bloqueiam o código, mesmo depois acertando", async () => {
    await enviarCodigo(prisma, userId, "EMAIL_CADASTRO");
    const certo = ultimoCodigo();
    const errado = certo === "000000" ? "111111" : "000000";
    const respostas = [];
    for (let i = 0; i < 5; i++) respostas.push(await conferirCodigo(prisma, userId, "EMAIL_CADASTRO", errado));
    expect(respostas[0]).toEqual({ ok: false, motivo: "errado", restantes: 4 });
    expect(respostas[4]).toMatchObject({ ok: false, motivo: "tentativas" });
    expect((await conferirCodigo(prisma, userId, "EMAIL_CADASTRO", certo)).ok).toBe(false);
  });

  test("pedir um código novo cancela o anterior", async () => {
    const t0 = new Date(Date.now() - 2 * 60_000);
    await enviarCodigo(prisma, userId, "EMAIL_CADASTRO", t0);
    const primeiro = ultimoCodigo();
    await enviarCodigo(prisma, userId, "EMAIL_CADASTRO");
    const segundo = ultimoCodigo();
    if (primeiro !== segundo) {
      expect((await conferirCodigo(prisma, userId, "EMAIL_CADASTRO", primeiro)).ok).toBe(false);
    }
    expect((await conferirCodigo(prisma, userId, "EMAIL_CADASTRO", segundo)).ok).toBe(true);
  });
});

describe("redefinirSenha", () => {
  test("código certo troca a senha", async () => {
    await enviarCodigo(prisma, userId, "RECUPERAR_SENHA");
    const r = await redefinirSenha(prisma, "maria@teste.test", ultimoCodigo(), "nova-senha-boa-3");
    expect(r).toEqual({ ok: true });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(await bcrypt.compare("nova-senha-boa-3", user.senha!)).toBe(true);
  });

  test("email que não existe responde igual a código errado", async () => {
    await enviarCodigo(prisma, userId, "RECUPERAR_SENHA");
    const certo = ultimoCodigo();
    const naoExiste = await redefinirSenha(prisma, "ninguem@teste.test", certo, "nova-senha-boa-3");
    const errado = await redefinirSenha(prisma, "maria@teste.test", certo === "000000" ? "111111" : "000000", "nova-senha-boa-3");
    expect(naoExiste).toEqual(errado);
    expect(naoExiste.ok).toBe(false);
  });
});
