import { describe, expect, test } from "vitest";
import { criarEsquemaPedido } from "@/lib/pedidos/esquemas";

const hoje = new Date(2026, 9, 20); // 20/10/2026
const esquema = criarEsquemaPedido(hoje);
const base = { categoria: "encanamento", descricao: "A pia da cozinha está vazando", fotos: [], urgente: false };

function erro(quando: Record<string, string>, extra: Record<string, unknown> = {}) {
  const r = esquema.safeParse({ ...base, ...extra, quando });
  if (r.success) return null;
  return { path: r.error.issues[0].path, message: r.error.issues[0].message };
}

describe("quando", () => {
  test("data final antes da inicial", () => {
    expect(erro({ tipo: "ENTRE_DIAS", dataInicio: "2026-10-23", dataFim: "2026-10-20" })).toEqual({
      path: ["quando", "dataFim"],
      message: "A data final vem depois da inicial.",
    });
  });
  test("dia no passado", () => {
    expect(erro({ tipo: "DIA_CERTO", dataInicio: "2026-10-19" })).toEqual({
      path: ["quando", "dataInicio"],
      message: "Escolha hoje ou um dia depois.",
    });
  });
  test("janela maior que 60 dias", () => {
    expect(erro({ tipo: "ENTRE_DIAS", dataInicio: "2026-10-20", dataFim: "2026-12-30" })?.message).toBe(
      "Escolha um período de até 60 dias."
    );
  });
  test("hora inválida", () => {
    expect(erro({ tipo: "QUALQUER_DIA", horaInicio: "25:99" })?.path).toEqual(["quando", "horaInicio"]);
  });
  test("hora final antes da inicial", () => {
    expect(erro({ tipo: "QUALQUER_DIA", horaInicio: "18:00", horaFim: "08:00" })).toEqual({
      path: ["quando", "horaFim"],
      message: "O horário final vem depois do inicial.",
    });
  });
  test("dia certo sem data", () => {
    expect(erro({ tipo: "DIA_CERTO" })?.path).toEqual(["quando", "dataInicio"]);
  });
  test("hoje é aceito e janela válida passa", () => {
    expect(erro({ tipo: "DIA_CERTO", dataInicio: "2026-10-20" })).toBeNull();
    expect(erro({ tipo: "ENTRE_DIAS", dataInicio: "2026-10-20", dataFim: "2026-10-23", horaInicio: "08:00", horaFim: "18:00" })).toBeNull();
  });
});

describe("pedido", () => {
  test("descrição curta", () => {
    expect(erro({ tipo: "QUALQUER_DIA" }, { descricao: "pia" })?.path).toEqual(["descricao"]);
  });
  test("mais de 3 fotos", () => {
    expect(erro({ tipo: "QUALQUER_DIA" }, { fotos: ["a", "b", "c", "d"] })?.path).toEqual(["fotos"]);
  });
  test("urgente vira 'qualquer dia' sozinho", () => {
    const r = esquema.safeParse({ ...base, urgente: true, quando: { tipo: "DIA_CERTO", dataInicio: "2026-11-01" } });
    expect(r.success && r.data.quando).toEqual({ tipo: "QUALQUER_DIA" });
  });
});
