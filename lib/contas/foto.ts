// Foto de perfil: usa o mesmo cuidado de todas as imagens (lib/imagens.ts).
import type { PrismaClient } from "@prisma/client";
import { apagarImagem, caminhoDaImagem, processarImagem, salvarImagem, TAMANHO_MAXIMO_IMAGEM } from "@/lib/imagens";

export const TAMANHO_MAXIMO_FOTO = TAMANHO_MAXIMO_IMAGEM;

export function processarFoto(bytes: Buffer) {
  return processarImagem(bytes, "avatar");
}

/** Caminho no disco de uma foto de perfil pelo nome; null se o nome for suspeito. */
export function caminhoDaFoto(nome: string): string | null {
  return caminhoDaImagem("fotos", nome);
}

export async function salvarFotoPerfil(prisma: PrismaClient, userId: string, webp: Buffer): Promise<string> {
  const url = await salvarImagem("fotos", webp);
  const anterior = await prisma.user.findUnique({ where: { id: userId }, select: { image: true } });
  await prisma.user.update({ where: { id: userId }, data: { image: url } });
  // Apaga a foto antiga (só se for uma das nossas)
  if (anterior?.image) await apagarImagem(anterior.image);
  return url;
}
