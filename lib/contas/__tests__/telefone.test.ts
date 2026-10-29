import { describe, expect, test } from "vitest";
import { ehEmail, formatarTelefone, normalizarTelefone } from "@/lib/contas/telefone";

describe("normalizarTelefone", () => {
  test.each(["(91) 98888-7777", "91988887777", "+55 91 98888 7777", "55 (91) 98888-7777"])(
    '"%s" vira 91988887777',
    (entrada) => expect(normalizarTelefone(entrada)).toBe("91988887777")
  );
  test("fixo com 10 dígitos", () => expect(normalizarTelefone("9132221111")).toBe("9132221111"));
  test.each(["98888-7777", "00988887777", "abc", ""])('"%s" é inválido', (entrada) =>
    expect(normalizarTelefone(entrada)).toBeNull()
  );
});

describe("formatarTelefone", () => {
  test("celular", () => expect(formatarTelefone("91988887777")).toBe("(91) 98888-7777"));
  test("fixo", () => expect(formatarTelefone("9132221111")).toBe("(91) 3222-1111"));
  test("parcial enquanto digita", () => expect(formatarTelefone("919")).toBe("(91) 9"));
});

describe("ehEmail", () => {
  test("reconhece email e celular", () => {
    expect(ehEmail("maria@email.com")).toBe(true);
    expect(ehEmail("(91) 98888-7777")).toBe(false);
  });
});
