import { afterAll, beforeEach, describe, expect, test } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { caminhoDaFoto, salvarFotoPerfil } from "@/lib/contas/foto";

let userId: string;
const webp = () => sharp({ create: { width: 512, height: 512, channels: 3, background: "#fff" } }).webp().toBuffer();

beforeEach(async () => {
  await prisma.user.deleteMany();
  userId = (await prisma.user.create({ data: { nome: "Foto", email: "foto@teste.test" } })).id;
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("salvarFotoPerfil", () => {
  test("salva o arquivo e troca a foto do usuário, apagando a anterior", async () => {
    const url1 = await salvarFotoPerfil(prisma, userId, await webp());
    const arquivo1 = caminhoDaFoto(path.basename(url1))!;
    expect(existsSync(arquivo1)).toBe(true);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).image).toBe(url1);

    const url2 = await salvarFotoPerfil(prisma, userId, await webp());
    expect(url2).not.toBe(url1);
    expect(existsSync(arquivo1)).toBe(false);
    expect(existsSync(caminhoDaFoto(path.basename(url2))!)).toBe(true);
  });
});

describe("caminhoDaFoto", () => {
  test("não deixa sair da pasta de fotos", () => {
    expect(caminhoDaFoto("../../.env")).toBeNull();
    expect(caminhoDaFoto("foto.png")).toBeNull();
    expect(caminhoDaFoto("0b9f6d3e-1c2a-4f5b-9a8e-7d6c5b4a3f21.webp")).toBe(path.join(process.cwd(), "uploads", "fotos", "0b9f6d3e-1c2a-4f5b-9a8e-7d6c5b4a3f21.webp"));
  });
});
