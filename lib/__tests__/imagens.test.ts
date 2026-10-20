// @vitest-environment node
import { describe, expect, test } from "vitest";
import sharp from "sharp";
import { caminhoDaImagem, processarImagem } from "@/lib/imagens";

const imagem = (w: number, h: number) =>
  sharp({ create: { width: w, height: h, channels: 3, background: "#E8770C" } });

describe("processarImagem (galeria)", () => {
  test("diminui mantendo a proporção e tira EXIF", async () => {
    const entrada = await imagem(3000, 1000).jpeg().withExif({ IFD0: { Copyright: "x" } }).toBuffer();
    const r = await processarImagem(entrada, "galeria");
    expect(r.ok).toBe(true);
    if (r.ok) {
      const meta = await sharp(r.webp).metadata();
      expect(meta.format).toBe("webp");
      expect(meta.width).toBe(1280);
      expect(meta.height).toBeGreaterThanOrEqual(426);
      expect(meta.height).toBeLessThanOrEqual(427);
      expect(meta.exif).toBeUndefined();
    }
  });

  test("não aumenta imagem pequena", async () => {
    const r = await processarImagem(await imagem(400, 300).png().toBuffer(), "galeria");
    if (!r.ok) throw new Error(r.erro);
    expect((await sharp(r.webp).metadata()).width).toBe(400);
  });

  test("avatar continua quadrado 512", async () => {
    const r = await processarImagem(await imagem(800, 600).png().toBuffer(), "avatar");
    if (!r.ok) throw new Error(r.erro);
    const meta = await sharp(r.webp).metadata();
    expect([meta.width, meta.height]).toEqual([512, 512]);
  });
});

describe("caminhoDaImagem", () => {
  test("recusa pasta ou nome suspeito", () => {
    expect(caminhoDaImagem("../x", "0b9f6d3e-1c2a-4f5b-9a8e-7d6c5b4a3f21.webp")).toBeNull();
    expect(caminhoDaImagem("pedidos", "../../.env")).toBeNull();
    expect(caminhoDaImagem("pedidos", "0b9f6d3e-1c2a-4f5b-9a8e-7d6c5b4a3f21.webp")).not.toBeNull();
  });
});
