import { afterAll, beforeEach, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { mudarDisponibilidade, perfilPublico, prestadoresDisponiveis } from "@/lib/prestadores";

let a: string;
let b: string;
const perfil = (userId: string, latitude: number) =>
  prisma.perfilPrestador.create({ data: { userId, categorias: ["pintura"], bairro: "Marco", cidade: "Belém", raioKm: 10, latitude, longitude: -48.47 } });

beforeEach(async () => {
  await prisma.user.deleteMany();
  a = (await prisma.user.create({ data: { nome: "Ana", email: "a@teste.test", telefone: "91911112222" } })).id;
  b = (await prisma.user.create({ data: { nome: "Bia", email: "b@teste.test" } })).id;
  await perfil(a, -1.43);
  await perfil(b, -1.45);
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("disponibilidade", () => {
  test("ligar vale por 8 horas", async () => {
    const agora = new Date();
    const r = await mudarDisponibilidade(prisma, a, true, agora);
    expect(r).toEqual({ ok: true, disponivelAte: new Date(agora.getTime() + 8 * 3600_000) });
    expect(await prestadoresDisponiveis(prisma, null, 10, agora)).toHaveLength(1);
    expect(await prestadoresDisponiveis(prisma, null, 10, new Date(agora.getTime() + 8 * 3600_000 + 60_000))).toHaveLength(0);
  });

  test("desligar some na hora; cliente sem perfil não pode", async () => {
    await mudarDisponibilidade(prisma, a, true);
    await mudarDisponibilidade(prisma, a, false);
    expect(await prestadoresDisponiveis(prisma, null, 10)).toHaveLength(0);
    const c = (await prisma.user.create({ data: { nome: "C", email: "c@teste.test" } })).id;
    expect(await mudarDisponibilidade(prisma, c, true)).toEqual({ ok: false, semPerfil: true });
  });

  test("perto: ordena por distância e respeita o raio", async () => {
    await mudarDisponibilidade(prisma, a, true);
    await mudarDisponibilidade(prisma, b, true);
    const lista = await prestadoresDisponiveis(prisma, { latitude: -1.425, longitude: -48.47 }, 10);
    expect(lista.map((p) => p.nome)).toEqual(["Ana", "Bia"]);
    expect(await prestadoresDisponiveis(prisma, { latitude: -1.7, longitude: -48.47 }, 10)).toHaveLength(0);
  });

  test("perfil público sem email e telefone", async () => {
    const p = await perfilPublico(prisma, a);
    expect(p?.nome).toBe("Ana");
    expect(JSON.stringify(p)).not.toContain("91911112222");
    expect(JSON.stringify(p)).not.toContain("a@teste.test");
  });
});
