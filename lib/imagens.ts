// Imagens enviadas pelas pessoas (foto de perfil, fotos de pedidos e de anúncios).
// Toda imagem é conferida e regravada do zero: isso descarta dados escondidos (EXIF, como o GPS).
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export type PastaImagem = "fotos" | "pedidos" | "anuncios";
const PASTAS: PastaImagem[] = ["fotos", "pedidos", "anuncios"];

export const TAMANHO_MAXIMO_IMAGEM = 5 * 1024 * 1024;
const FORMATOS_ACEITOS = new Set(["jpeg", "png", "webp"]);
const NOME_VALIDO = /^[0-9a-f-]{36}\.webp$/;
const PASTA_RAIZ = path.join(process.cwd(), "uploads");
const PREFIXO_URL = "/api/arquivos/";

const ERRO_TAMANHO = "A foto é muito grande. Escolha uma de até 5 MB.";
const ERRO_FORMATO = "Esse arquivo não é uma foto. Tente outra.";

/** avatar = quadrada 512×512 (perfil); galeria = mantém a proporção, lado maior até 1280. */
export async function processarImagem(
  bytes: Buffer,
  modo: "avatar" | "galeria"
): Promise<{ ok: true; webp: Buffer } | { ok: false; erro: string }> {
  if (bytes.length > TAMANHO_MAXIMO_IMAGEM) return { ok: false, erro: ERRO_TAMANHO };
  try {
    const meta = await sharp(bytes).metadata();
    if (!meta.format || !FORMATOS_ACEITOS.has(meta.format)) return { ok: false, erro: ERRO_FORMATO };

    const base = sharp(bytes).rotate(); // deixa "de pé" fotos tiradas com o celular deitado
    const redimensionada =
      modo === "avatar"
        ? base.resize(512, 512, { fit: "cover" })
        : base.resize(1280, 1280, { fit: "inside", withoutEnlargement: true });
    return { ok: true, webp: await redimensionada.webp({ quality: 82 }).toBuffer() };
  } catch {
    return { ok: false, erro: ERRO_FORMATO };
  }
}

/** Caminho no disco; null se a pasta ou o nome forem suspeitos (ex.: "../../.env"). */
export function caminhoDaImagem(pasta: string, nome: string): string | null {
  if (!PASTAS.includes(pasta as PastaImagem) || !NOME_VALIDO.test(nome)) return null;
  return path.join(PASTA_RAIZ, pasta, nome);
}

export async function salvarImagem(pasta: PastaImagem, webp: Buffer): Promise<string> {
  await mkdir(path.join(PASTA_RAIZ, pasta), { recursive: true });
  const nome = `${randomUUID()}.webp`;
  await writeFile(path.join(PASTA_RAIZ, pasta, nome), webp);
  return `${PREFIXO_URL}${pasta}/${nome}`;
}

function partesDaUrl(url: string): { pasta: string; nome: string } | null {
  if (!url.startsWith(PREFIXO_URL)) return null;
  const [pasta, nome, ...resto] = url.slice(PREFIXO_URL.length).split("/");
  if (!pasta || !nome || resto.length > 0) return null;
  return { pasta, nome };
}

/** A URL é de uma imagem nossa, dessa pasta, e o arquivo existe? */
export function urlDeImagemValida(url: string, pasta: PastaImagem): boolean {
  const partes = partesDaUrl(url);
  if (!partes || partes.pasta !== pasta) return false;
  const caminho = caminhoDaImagem(partes.pasta, partes.nome);
  return Boolean(caminho && existsSync(caminho));
}

export async function apagarImagem(url: string): Promise<void> {
  const partes = partesDaUrl(url);
  const caminho = partes && caminhoDaImagem(partes.pasta, partes.nome);
  if (caminho) await unlink(caminho).catch(() => {});
}
