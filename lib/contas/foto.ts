// Foto de perfil: confere se é mesmo uma foto, padroniza e tira os dados escondidos (EXIF/GPS).
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { PrismaClient } from "@prisma/client";

export const TAMANHO_MAXIMO_FOTO = 5 * 1024 * 1024;
const FORMATOS_ACEITOS = new Set(["jpeg", "png", "webp"]);
const PASTA_FOTOS = path.join(process.cwd(), "uploads", "fotos");
const PREFIXO_URL = "/api/arquivos/fotos/";
const NOME_VALIDO = /^[0-9a-f-]{36}\.webp$/;

const ERRO_TAMANHO = "A foto é muito grande. Escolha uma de até 5 MB.";
const ERRO_FORMATO = "Esse arquivo não é uma foto. Tente outra.";

export async function processarFoto(
  bytes: Buffer
): Promise<{ ok: true; webp: Buffer } | { ok: false; erro: string }> {
  if (bytes.length > TAMANHO_MAXIMO_FOTO) return { ok: false, erro: ERRO_TAMANHO };

  try {
    const meta = await sharp(bytes).metadata();
    if (!meta.format || !FORMATOS_ACEITOS.has(meta.format)) return { ok: false, erro: ERRO_FORMATO };

    // Regravar a imagem do zero descarta EXIF (localização, modelo do celular etc.)
    const webp = await sharp(bytes)
      .rotate() // deixa "de pé" fotos tiradas com o celular deitado
      .resize(512, 512, { fit: "cover" })
      .webp({ quality: 82 })
      .toBuffer();
    return { ok: true, webp };
  } catch {
    return { ok: false, erro: ERRO_FORMATO };
  }
}

/** Caminho no disco de uma foto pelo nome; null se o nome for suspeito (ex.: "../../.env"). */
export function caminhoDaFoto(nome: string): string | null {
  if (!NOME_VALIDO.test(nome)) return null;
  return path.join(PASTA_FOTOS, nome);
}

export async function salvarFotoPerfil(prisma: PrismaClient, userId: string, webp: Buffer): Promise<string> {
  await mkdir(PASTA_FOTOS, { recursive: true });
  const nome = `${randomUUID()}.webp`;
  await writeFile(path.join(PASTA_FOTOS, nome), webp);

  const url = `${PREFIXO_URL}${nome}`;
  const anterior = await prisma.user.findUnique({ where: { id: userId }, select: { image: true } });
  await prisma.user.update({ where: { id: userId }, data: { image: url } });

  // Apaga a foto antiga (só se for uma das nossas)
  if (anterior?.image?.startsWith(PREFIXO_URL)) {
    const caminho = caminhoDaFoto(anterior.image.slice(PREFIXO_URL.length));
    if (caminho) await unlink(caminho).catch(() => {});
  }
  return url;
}
