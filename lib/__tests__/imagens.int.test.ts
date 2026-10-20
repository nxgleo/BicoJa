import { describe, expect, test } from "vitest";
import { existsSync } from "node:fs";
import sharp from "sharp";
import { apagarImagem, caminhoDaImagem, salvarImagem, urlDeImagemValida } from "@/lib/imagens";

const webp = () => sharp({ create: { width: 100, height: 100, channels: 3, background: "#fff" } }).webp().toBuffer();

describe("salvarImagem e urlDeImagemValida", () => {
  test("salva na pasta certa e só aceita URL de arquivo que existe na mesma pasta", async () => {
    const url = await salvarImagem("pedidos", await webp());
    expect(url).toMatch(/^\/api\/arquivos\/pedidos\/[0-9a-f-]{36}\.webp$/);
    expect(urlDeImagemValida(url, "pedidos")).toBe(true);
    expect(urlDeImagemValida(url, "anuncios")).toBe(false);
    expect(urlDeImagemValida("/api/arquivos/pedidos/0b9f6d3e-1c2a-4f5b-9a8e-7d6c5b4a3f21.webp", "pedidos")).toBe(false);
    expect(urlDeImagemValida("https://site.com/x.webp", "pedidos")).toBe(false);

    await apagarImagem(url);
    const nome = url.split("/").pop()!;
    expect(existsSync(caminhoDaImagem("pedidos", nome)!)).toBe(false);
  });
});
