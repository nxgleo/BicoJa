import { describe, expect, test } from "vitest";
import { criarEsquemaProposta, esquemaIniciarConversa, esquemaMensagem } from "@/lib/chat/esquemas";

const ID = "6f1c2b9e-1d2a-4c3b-9e8f-0a1b2c3d4e5f";

describe("esquemas do chat", () => {
  test("conversa começa de um lugar só", () => {
    expect(esquemaIniciarConversa.safeParse({ servicoId: ID }).success).toBe(true);
    expect(esquemaIniciarConversa.safeParse({ servicoId: ID, pedidoId: ID }).success).toBe(false);
    expect(esquemaIniciarConversa.safeParse({ servicoId: "abc" }).success).toBe(false);
  });

  test("mensagem precisa de texto ou foto e tem limite", () => {
    expect(esquemaMensagem.safeParse({ texto: "   " }).success).toBe(false);
    expect(esquemaMensagem.safeParse({ fotoUrl: "/api/arquivos/chat/x.webp" }).success).toBe(true);
    expect(esquemaMensagem.safeParse({ texto: "a".repeat(2001) }).success).toBe(false);
  });

  test("proposta confere valor e data", () => {
    const esquema = criarEsquemaProposta(new Date("2026-10-20T12:00:00Z"));
    expect(esquema.safeParse({ valor: 120, quando: { tipo: "QUALQUER_DIA" } }).success).toBe(true);
    expect(esquema.safeParse({ valor: 0, quando: { tipo: "QUALQUER_DIA" } }).success).toBe(false);
    const ontem = esquema.safeParse({ valor: 50, quando: { tipo: "DIA_CERTO", dataInicio: "2026-10-19" } });
    expect(ontem.success).toBe(false);
    expect(ontem.error?.issues[0].path).toEqual(["quando", "dataInicio"]);
  });
});
