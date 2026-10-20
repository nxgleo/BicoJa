import { describe, expect, test } from "vitest";
import { problemaNaSenha } from "@/lib/contas/senha";

describe("problemaNaSenha", () => {
  test("pede pelo menos 8 caracteres", () => expect(problemaNaSenha("1234567", {})).toMatch(/8/));
  test.each(["12345678", "senha123", "SENHA123"])("bloqueia senha óbvia %s", (s) =>
    expect(problemaNaSenha(s, {})).toMatch(/fácil de adivinhar/)
  );
  test("bloqueia senha com o nome", () =>
    expect(problemaNaSenha("mariasilva1", { nome: "Maria Silva" })).toMatch(/nome/)
  );
  test("bloqueia senha com o email", () =>
    expect(problemaNaSenha("joaozinho99", { email: "joaozinho@x.com" })).toMatch(/email/)
  );
  test("limite máximo", () => expect(problemaNaSenha("a".repeat(73), {})).toMatch(/72/));
  test("senha boa passa", () => expect(problemaNaSenha("casa-amarela-7", { nome: "Maria", email: "m@x.com" })).toBeNull());
});
