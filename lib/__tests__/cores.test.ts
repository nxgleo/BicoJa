import { describe, expect, test } from "vitest";
import { razaoContraste, tokens } from "@/lib/cores";

describe("razaoContraste", () => {
  test("branco contra preto é 21:1", () => {
    expect(razaoContraste("#FFFFFF", "#000000")).toBeCloseTo(21, 1);
  });
});

describe("tokens de cor", () => {
  test("tema claro usa as cores da marca", () => {
    expect(tokens.claro.marca).toBe("#E8770C");
    expect(tokens.claro.urgencia).toBe("#DC2626");
    expect(tokens.claro.fundo).toBe("#FFFFFF");
  });

  for (const nome of ["claro", "escuro"] as const) {
    describe(`tema ${nome} passa no contraste AA`, () => {
      const t = tokens[nome];
      test("texto no fundo", () => expect(razaoContraste(t.texto, t.fundo)).toBeGreaterThanOrEqual(4.5));
      test("texto suave no fundo", () => expect(razaoContraste(t.textoSuave, t.fundo)).toBeGreaterThanOrEqual(4.5));
      test("texto da marca no fundo", () => expect(razaoContraste(t.marcaTexto, t.fundo)).toBeGreaterThanOrEqual(4.5));
      test("branco no botão de urgência", () => expect(razaoContraste("#FFFFFF", t.urgencia)).toBeGreaterThanOrEqual(4.5));
      test("texto no bloco laranja-claro", () => expect(razaoContraste(t.texto, t.marcaSuave)).toBeGreaterThanOrEqual(4.5));
      test("texto da marca no bloco laranja-claro", () => expect(razaoContraste(t.marcaTexto, t.marcaSuave)).toBeGreaterThanOrEqual(4.5));
      test("texto no botão principal", () => expect(razaoContraste(t.textoSobreMarca, t.botao)).toBeGreaterThanOrEqual(4.5));
    });
  }
});
