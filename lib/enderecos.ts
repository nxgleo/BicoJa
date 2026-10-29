// "Meu endereço": salvo uma vez no perfil, preenche os pedidos e calcula as distâncias.
import type { PrismaClient } from "@prisma/client";
import type { z } from "zod";
import { geocodeEndereco } from "@/lib/maps";
import type { esquemaEndereco } from "@/lib/contas/esquemas";

export type EnderecoCompleto = {
  rua: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  latitude: number;
  longitude: number;
};

const ERRO_ENDERECO = "Não achamos esse endereço. Confira o bairro e a cidade.";

/** Tenta o endereço completo; se o mapa não achar, usa o centro do bairro. */
export async function geocodificarEndereco(e: { rua: string; numero: string; bairro: string; cidade: string }) {
  try {
    return (
      (await geocodeEndereco(`${e.rua}, ${e.numero}, ${e.bairro}, ${e.cidade}`)) ??
      (await geocodeEndereco(`${e.bairro}, ${e.cidade}`))
    );
  } catch (erro) {
    console.error("Erro ao buscar endereço no mapa:", erro);
    return null;
  }
}

export async function salvarEndereco(
  prisma: PrismaClient,
  userId: string,
  dados: z.infer<typeof esquemaEndereco>
): Promise<{ ok: true; endereco: EnderecoCompleto } | { ok: false; campo: "bairro"; erro: string }> {
  const coordenadas = await geocodificarEndereco(dados);
  if (!coordenadas) return { ok: false, campo: "bairro", erro: ERRO_ENDERECO };

  const valores = {
    rua: dados.rua,
    numero: dados.numero,
    complemento: dados.complemento ?? null,
    bairro: dados.bairro,
    cidade: dados.cidade,
    latitude: coordenadas.latitude,
    longitude: coordenadas.longitude,
  };
  await prisma.enderecoUsuario.upsert({ where: { userId }, create: { userId, ...valores }, update: valores });
  return { ok: true, endereco: valores };
}

export async function enderecoDoUsuario(prisma: PrismaClient, userId: string): Promise<EnderecoCompleto | null> {
  return prisma.enderecoUsuario.findUnique({
    where: { userId },
    select: { rua: true, numero: true, complemento: true, bairro: true, cidade: true, latitude: true, longitude: true },
  });
}
