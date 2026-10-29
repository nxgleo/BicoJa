// @vitest-environment node
import { describe, expect, test } from "vitest";
import sharp from "sharp";
import { processarFoto } from "@/lib/contas/foto";

function imagem(largura: number, altura: number) {
  return sharp({ create: { width: largura, height: altura, channels: 3, background: { r: 232, g: 119, b: 12 } } });
}

describe("processarFoto", () => {
  test("transforma em WEBP 512x512", async () => {
    const r = await processarFoto(await imagem(800, 600).png().toBuffer());
    expect(r.ok).toBe(true);
    if (r.ok) {
      const meta = await sharp(r.webp).metadata();
      expect(meta.format).toBe("webp");
      expect([meta.width, meta.height]).toEqual([512, 512]);
    }
  });

  test("remove os dados escondidos da foto (EXIF, como GPS)", async () => {
    const comExif = await imagem(400, 400).jpeg().withExif({ IFD0: { Copyright: "dados privados" } }).toBuffer();
    expect((await sharp(comExif).metadata()).exif).toBeDefined();
    const r = await processarFoto(comExif);
    expect(r.ok).toBe(true);
    if (r.ok) expect((await sharp(r.webp).metadata()).exif).toBeUndefined();
  });

  test("recusa arquivo que não é foto", async () => {
    expect(await processarFoto(Buffer.from("isso não é imagem"))).toEqual({
      ok: false,
      erro: "Esse arquivo não é uma foto. Tente outra.",
    });
  });

  test("recusa foto maior que 5 MB", async () => {
    expect(await processarFoto(Buffer.alloc(5 * 1024 * 1024 + 1))).toEqual({
      ok: false,
      erro: "A foto é muito grande. Escolha uma de até 5 MB.",
    });
  });

  test("recusa formato fora de JPG, PNG e WEBP (ex.: GIF)", async () => {
    const gif = await imagem(10, 10).gif().toBuffer();
    expect((await processarFoto(gif)).ok).toBe(false);
  });
});
