import { beforeEach, describe, expect, test, vi } from "vitest";

const findMany = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: { servico: { findMany } } }));

import { buscarServicos, listarServicosRecentes } from "@/lib/servicos";

function servico(id: string, titulo: string, descricao = "") {
  return { id, titulo, descricao, preco: 100, prestador: { id: "p" + id, nome: "Prestador " + id } };
}

beforeEach(() => findMany.mockReset());

describe("listarServicosRecentes", () => {
  test("busca os mais novos sem expor email ou telefone do prestador", async () => {
    findMany.mockResolvedValue([]);
    await listarServicosRecentes(6);
    const args = findMany.mock.calls[0][0];
    expect(args.take).toBe(6);
    expect(args.orderBy).toEqual({ createdAt: "desc" });
    expect(args.select.prestador).toEqual({ select: { id: true, nome: true } });
  });
});

describe("buscarServicos", () => {
  test("acha pelo texto ignorando maiúsculas, espaços e acentos", async () => {
    findMany.mockResolvedValue([servico("1", "Instalação Elétrica"), servico("2", "Pintura de muro")]);
    const achados = await buscarServicos({ texto: "  ELETRICA  " }, 20);
    expect(achados.map((s) => s.id)).toEqual(["1"]);
  });

  test("entende o problema: 'pia vazando' acha anúncio de encanador", async () => {
    findMany.mockResolvedValue([
      servico("1", "Pintura residencial"),
      servico("2", "Consertos de Encanamento", "Troca de torneiras e reparo em descargas"),
    ]);
    const achados = await buscarServicos({ texto: "minha pia tá vazando" }, 20);
    expect(achados.map((s) => s.id)).toEqual(["2"]);
  });

  test("filtra por categoria", async () => {
    findMany.mockResolvedValue([servico("1", "Faxina pós-obra"), servico("2", "Frete pequeno")]);
    const achados = await buscarServicos({ categoria: "limpeza" }, 20);
    expect(achados.map((s) => s.id)).toEqual(["1"]);
  });

  test("respeita o limite", async () => {
    findMany.mockResolvedValue([servico("1", "pintura"), servico("2", "pintura"), servico("3", "pintura")]);
    expect(await buscarServicos({ texto: "pintura" }, 2)).toHaveLength(2);
  });

  test("busca sem texto nem categoria devolve os mais recentes", async () => {
    findMany.mockResolvedValue([servico("1", "a"), servico("2", "b")]);
    expect((await buscarServicos({}, 20)).map((s) => s.id)).toEqual(["1", "2"]);
  });

  test("nunca pede email ou telefone do prestador", async () => {
    findMany.mockResolvedValue([]);
    await buscarServicos({ texto: "pia" }, 20);
    expect(findMany.mock.calls[0][0].select.prestador).toEqual({ select: { id: true, nome: true } });
  });
});
