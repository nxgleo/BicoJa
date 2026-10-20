import { beforeAll, describe, expect, test } from "vitest";
import { cifrarCodigo, codigoConfere, decifrarCodigo, gerarCodigo } from "@/lib/contratos/codigo";

beforeAll(() => {
  process.env.NEXTAUTH_SECRET ??= "segredo-de-teste";
});

describe("código de conclusão", () => {
  test("tem 4 números e volta igual depois de cifrado", () => {
    const codigo = gerarCodigo();
    expect(codigo).toMatch(/^\d{4}$/);
    const cifrado = cifrarCodigo(codigo);
    expect(cifrado).not.toContain(codigo);
    expect(decifrarCodigo(cifrado)).toBe(codigo);
    expect(codigoConfere(codigo, cifrado)).toBe(true);
    expect(codigoConfere(codigo === "0000" ? "1111" : "0000", cifrado)).toBe(false);
  });

  test("texto adulterado não é aceito", () => {
    const cifrado = cifrarCodigo("1234");
    const [iv, tag] = cifrado.split(".");
    expect(decifrarCodigo(`${iv}.${tag}.AAAA`)).toBeNull();
    expect(codigoConfere("12345", cifrado)).toBe(false);
  });
});
