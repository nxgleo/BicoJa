import { afterAll, beforeEach, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { anuncioPublico, criarAnuncio, editarAnuncio, meusAnuncios } from "@/lib/anuncios/anuncios";

let prestadorId: string;
let clienteId: string;
const anuncio = { titulo: "Conserto de torneiras", categoria: "encanamento" as const, descricao: "Troco torneiras e sifões", preco: 80, fotos: [] };

beforeEach(async () => {
  await prisma.user.deleteMany();
  prestadorId = (await prisma.user.create({ data: { nome: "João", email: "joao@teste.test", telefone: "91911112222" } })).id;
  await prisma.perfilPrestador.create({
    data: { userId: prestadorId, categorias: ["encanamento"], bairro: "Marco", cidade: "Belém", latitude: -1.43, longitude: -48.47 },
  });
  clienteId = (await prisma.user.create({ data: { nome: "Ana", email: "ana@teste.test" } })).id;
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("criarAnuncio", () => {
  test("quem não fez o 'Quero fazer bicos' não pode anunciar", async () => {
    expect(await criarAnuncio(prisma, clienteId, anuncio)).toEqual({ ok: false, semPerfil: true });
  });

  test("categoria fora do perfil dá erro no campo", async () => {
    expect(await criarAnuncio(prisma, prestadorId, { ...anuncio, categoria: "pintura" })).toMatchObject({ ok: false, campo: "categoria" });
  });

  test("usa a localização do perfil e nasce ativo", async () => {
    const r = await criarAnuncio(prisma, prestadorId, anuncio);
    if (!r.ok) throw new Error("falhou");
    const s = await prisma.servico.findUniqueOrThrow({ where: { id: r.id } });
    expect(s).toMatchObject({ latitude: -1.43, longitude: -48.47, ativo: true, categoria: "encanamento" });
    const [{ temLocal }] = await prisma.$queryRaw<{ temLocal: boolean }[]>`SELECT localizacao IS NOT NULL AS "temLocal" FROM "Servico" WHERE id = ${r.id}`;
    expect(temLocal).toBe(true);
  });

  test("sem preço vira 'a combinar' (0)", async () => {
    const r = await criarAnuncio(prisma, prestadorId, { ...anuncio, preco: undefined });
    if (!r.ok) throw new Error("falhou");
    expect((await prisma.servico.findUniqueOrThrow({ where: { id: r.id } })).preco).toBe(0);
  });
});

describe("editar, pausar e página pública", () => {
  test("só o dono edita", async () => {
    const r = await criarAnuncio(prisma, prestadorId, anuncio);
    if (!r.ok) throw new Error("falhou");
    expect((await editarAnuncio(prisma, r.id, clienteId, { ativo: false })).ok).toBe(false);
  });

  test("pausado some da página pública; ativo volta", async () => {
    const r = await criarAnuncio(prisma, prestadorId, anuncio);
    if (!r.ok) throw new Error("falhou");
    await editarAnuncio(prisma, r.id, prestadorId, { ativo: false });
    expect(await anuncioPublico(prisma, r.id)).toBeNull();
    await editarAnuncio(prisma, r.id, prestadorId, { ativo: true });
    expect(await anuncioPublico(prisma, r.id)).not.toBeNull();
    expect(await meusAnuncios(prisma, prestadorId)).toHaveLength(1);
  });

  test("página pública nunca mostra email ou telefone", async () => {
    const r = await criarAnuncio(prisma, prestadorId, anuncio);
    if (!r.ok) throw new Error("falhou");
    const texto = JSON.stringify(await anuncioPublico(prisma, r.id));
    expect(texto).not.toContain("joao@teste.test");
    expect(texto).not.toContain("91911112222");
    expect(texto).toContain("Conserto de torneiras");
  });

  test("editar troca o texto", async () => {
    const r = await criarAnuncio(prisma, prestadorId, anuncio);
    if (!r.ok) throw new Error("falhou");
    await editarAnuncio(prisma, r.id, prestadorId, { ...anuncio, titulo: "Torneiras e descargas" });
    expect((await anuncioPublico(prisma, r.id))?.titulo).toBe("Torneiras e descargas");
  });
});
