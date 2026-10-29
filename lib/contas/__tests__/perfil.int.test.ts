import { afterAll, beforeEach, describe, expect, test, vi } from "vitest";

const geocode = vi.hoisted(() => vi.fn());
vi.mock("@/lib/maps", () => ({ geocodeEndereco: geocode }));

import { prisma } from "@/lib/prisma";
import { atualizarPerfil, trocarModo } from "@/lib/contas/perfil";
import { virarPrestador } from "@/lib/contas/prestador";

let userId: string;
const dadosPrestador = { categorias: ["pintura" as const], bairro: "Marco", cidade: "Belém", raioKm: 10, precoBase: 150 };

beforeEach(async () => {
  geocode.mockReset();
  await prisma.user.deleteMany();
  userId = (
    await prisma.user.create({ data: { nome: "Ana", email: "ana@teste.test", telefone: "91911112222", role: "CONTRATANTE" } })
  ).id;
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("trocarModo", () => {
  test("sem perfil de prestador, pede o 'Quero fazer bicos'", async () => {
    expect(await trocarModo(prisma, userId, "PRESTADOR")).toEqual({ ok: false, precisaVirarPrestador: true });
  });

  test("volta para cliente quando quiser", async () => {
    await prisma.user.update({ where: { id: userId }, data: { modoAtual: "PRESTADOR" } });
    expect(await trocarModo(prisma, userId, "CLIENTE")).toEqual({ ok: true });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).modoAtual).toBe("CLIENTE");
  });
});

describe("virarPrestador", () => {
  test("cria o perfil, vira 'os dois' e liga o modo prestador", async () => {
    geocode.mockResolvedValue({ latitude: -1.43, longitude: -48.47 });
    expect(await virarPrestador(prisma, userId, dadosPrestador)).toEqual({ ok: true });
    expect(geocode).toHaveBeenCalledWith("Marco, Belém");
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { perfilPrestador: true } });
    expect(user.role).toBe("AMBOS");
    expect(user.modoAtual).toBe("PRESTADOR");
    expect(user.perfilPrestador).toMatchObject({ categorias: ["pintura"], bairro: "Marco", latitude: -1.43, precoBase: 150 });
    expect(await trocarModo(prisma, userId, "PRESTADOR")).toEqual({ ok: true });
  });

  test("bairro que o mapa não acha dá erro no campo bairro", async () => {
    geocode.mockResolvedValue(null);
    expect(await virarPrestador(prisma, userId, dadosPrestador)).toEqual({
      ok: false,
      campo: "bairro",
      erro: "Não achamos esse bairro. Confira o nome e a cidade.",
    });
  });

  test("rodar de novo só atualiza o perfil", async () => {
    geocode.mockResolvedValue({ latitude: -1.43, longitude: -48.47 });
    await virarPrestador(prisma, userId, dadosPrestador);
    await virarPrestador(prisma, userId, { ...dadosPrestador, categorias: ["pintura", "limpeza"] });
    expect(await prisma.perfilPrestador.count()).toBe(1);
  });
});

describe("atualizarPerfil", () => {
  test("troca o nome", async () => {
    expect(await atualizarPerfil(prisma, userId, { nome: "Ana Souza" })).toEqual({ ok: true });
  });

  test("celular de outra conta dá erro no campo telefone", async () => {
    await prisma.user.create({ data: { nome: "B", email: "b@teste.test", telefone: "91933334444" } });
    expect(await atualizarPerfil(prisma, userId, { telefone: "91933334444" })).toEqual({
      ok: false,
      campo: "telefone",
      erro: "Esse celular já tem conta. Quer entrar?",
    });
  });
});
