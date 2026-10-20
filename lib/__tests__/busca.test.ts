import { describe, expect, test } from "vitest";
import { interpretarBusca, normalizar } from "@/lib/busca";
import { CATEGORIAS } from "@/lib/categorias";

describe("interpretarBusca entende o problema da pessoa", () => {
  test.each([
    ["minha pia tá vazando", "encanamento"],
    ["CHUVEIRO QUEIMOU", "eletrica"],
    ["pintar a parede da sala", "pintura"],
    ["montar guarda roupa", "montagem"],
    ["faxina pos obra", "limpeza"],
    ["frete de geladeira", "mudanca"],
    ["cortar grama", "jardim"],
  ])('"%s" → %s', (texto, esperado) => {
    expect(interpretarBusca(texto)[0]).toBe(esperado);
  });

  test.each([
    ["vasamento", "encanamento"],
    ["tomada em curto", "eletrica"],
  ])('tolera erro de digitação: "%s" → %s', (texto, esperado) => {
    expect(interpretarBusca(texto)[0]).toBe(esperado);
  });

  test.each(["", "   ", "🔥🔥"])('busca vazia ou estranha "%s" não acha nada', (texto) => {
    expect(interpretarBusca(texto)).toEqual([]);
  });

  test("texto enorme não quebra", () => {
    expect(() => interpretarBusca("pia ".repeat(1000))).not.toThrow();
  });
});

describe("normalizar", () => {
  test("corta em 100 caracteres", () => {
    expect(normalizar("a".repeat(500)).length).toBe(100);
  });

  test("tira acento e deixa minúsculo", () => {
    expect(normalizar("Elétrica")).toBe("eletrica");
  });
});

describe("CATEGORIAS", () => {
  test("tem as 9 categorias combinadas, na ordem", () => {
    expect(CATEGORIAS.map((c) => c.nome)).toEqual([
      "Consertos",
      "Elétrica",
      "Encanamento",
      "Pintura",
      "Montagem",
      "Limpeza",
      "Mudança",
      "Jardim",
      "Outros",
    ]);
  });
});
