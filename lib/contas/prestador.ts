// "Quero fazer bicos": cria (ou atualiza) o perfil de prestador e liga o modo prestador.
import type { PrismaClient } from "@prisma/client";
import type { z } from "zod";
import { geocodeEndereco } from "@/lib/maps";
import type { esquemaPrestador } from "./esquemas";

export async function virarPrestador(
  prisma: PrismaClient,
  userId: string,
  dados: z.infer<typeof esquemaPrestador>
): Promise<{ ok: true } | { ok: false; campo: "bairro"; erro: string }> {
  const coordenadas = await geocodeEndereco(`${dados.bairro}, ${dados.cidade}`);
  if (!coordenadas) {
    return { ok: false, campo: "bairro", erro: "Não achamos esse bairro. Confira o nome e a cidade." };
  }

  const perfil = {
    categorias: dados.categorias,
    bairro: dados.bairro,
    cidade: dados.cidade,
    raioKm: dados.raioKm,
    precoBase: dados.precoBase ?? null,
    bio: dados.bio || null,
    latitude: coordenadas.latitude,
    longitude: coordenadas.longitude,
  };

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { role: true } });
  await prisma.$transaction([
    prisma.perfilPrestador.upsert({ where: { userId }, create: { userId, ...perfil }, update: perfil }),
    prisma.user.update({
      where: { id: userId },
      data: { modoAtual: "PRESTADOR", ...(user.role === "CONTRATANTE" && { role: "AMBOS" }) },
    }),
  ]);
  return { ok: true };
}
