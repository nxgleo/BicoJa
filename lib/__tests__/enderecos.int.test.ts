import { afterAll, beforeEach, describe, expect, test, vi } from "vitest";

const geocode = vi.hoisted(() => vi.fn());
vi.mock("@/lib/maps", () => ({ geocodeEndereco: geocode }));

import { prisma } from "@/lib/prisma";
import { enderecoDoUsuario, salvarEndereco } from "@/lib/enderecos";

let userId: string;
const dados = { rua: "Rua das Flores", numero: "123", complemento: undefined, bairro: "Marco", cidade: "Belém" };
const ERRO = "Não achamos esse endereço. Confira o bairro e a cidade.";

beforeEach(async () => {
  geocode.mockReset();
  await prisma.user.deleteMany();
  userId = (await prisma.user.create({ data: { nome: "Ana", email: "ana@teste.test" } })).id;
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("salvarEndereco", () => {
  test("se a rua não for achada, usa o centro do bairro", async () => {
    geocode.mockResolvedValueOnce(null).mockResolvedValueOnce({ latitude: -1.43, longitude: -48.47 });
    const r = await salvarEndereco(prisma, userId, dados);
    expect(r.ok).toBe(true);
    expect(geocode).toHaveBeenNthCalledWith(1, "Rua das Flores, 123, Marco, Belém");
    expect(geocode).toHaveBeenNthCalledWith(2, "Marco, Belém");
    expect(await enderecoDoUsuario(prisma, userId)).toMatchObject({ bairro: "Marco", latitude: -1.43 });
  });

  test("se nada for achado, avisa no campo bairro e não salva", async () => {
    geocode.mockResolvedValue(null);
    expect(await salvarEndereco(prisma, userId, dados)).toEqual({ ok: false, campo: "bairro", erro: ERRO });
    expect(await enderecoDoUsuario(prisma, userId)).toBeNull();
  });

  test("se o serviço de mapas cair, mostra o mesmo aviso amigável", async () => {
    geocode.mockRejectedValue(new Error("fora do ar"));
    expect(await salvarEndereco(prisma, userId, dados)).toEqual({ ok: false, campo: "bairro", erro: ERRO });
  });

  test("salvar de novo atualiza o mesmo endereço", async () => {
    geocode.mockResolvedValue({ latitude: -1.43, longitude: -48.47 });
    await salvarEndereco(prisma, userId, dados);
    await salvarEndereco(prisma, userId, { ...dados, numero: "456" });
    expect(await prisma.enderecoUsuario.count()).toBe(1);
    expect((await enderecoDoUsuario(prisma, userId))?.numero).toBe("456");
  });
});
