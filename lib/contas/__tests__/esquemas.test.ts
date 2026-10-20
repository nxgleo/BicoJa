import { describe, expect, test } from "vitest";
import { escolhaParaPapel, esquemaCadastro, esquemaPrestador } from "@/lib/contas/esquemas";

const valido = { escolha: "CONTRATAR", nome: "Maria Silva", email: " Maria@Email.COM ", telefone: "(91) 98888-7777", senha: "casa-amarela-7" };

describe("esquemaCadastro", () => {
  test("limpa email e celular", () => {
    const r = esquemaCadastro.safeParse(valido);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.email).toBe("maria@email.com");
      expect(r.data.telefone).toBe("91988887777");
    }
  });

  test("nome curto dá erro no campo nome", () => {
    const r = esquemaCadastro.safeParse({ ...valido, nome: "M" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(["nome"]);
  });

  test("celular sem DDD dá erro no campo telefone", () => {
    const r = esquemaCadastro.safeParse({ ...valido, telefone: "98888-7777" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]).toMatchObject({ path: ["telefone"], message: "Celular inválido. Use DDD + número." });
  });

  test("senha com o nome dá erro no campo senha", () => {
    const r = esquemaCadastro.safeParse({ ...valido, senha: "mariasilva1" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(["senha"]);
  });
});

describe("escolhaParaPapel", () => {
  test("os dois começa como cliente", () =>
    expect(escolhaParaPapel("OS_DOIS")).toEqual({ role: "AMBOS", modoAtual: "CLIENTE" })
  );
  test("fazer bicos fica como cliente até terminar o 'Quero fazer bicos'", () =>
    expect(escolhaParaPapel("FAZER_BICOS")).toEqual({ role: "PRESTADOR", modoAtual: "CLIENTE" })
  );
});

describe("esquemaPrestador", () => {
  test("exige de 1 a 5 categorias válidas", () => {
    const base = { bairro: "Marco", cidade: "Belém", raioKm: 10 };
    expect(esquemaPrestador.safeParse({ ...base, categorias: [] }).success).toBe(false);
    expect(esquemaPrestador.safeParse({ ...base, categorias: ["voar"] }).success).toBe(false);
    expect(esquemaPrestador.safeParse({ ...base, categorias: ["pintura"] }).success).toBe(true);
  });
});
