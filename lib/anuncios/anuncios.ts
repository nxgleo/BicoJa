// Anúncios do prestador ("faço isso, a partir de tal preço"). Usam o modelo Servico do back end.
import type { PrismaClient } from "@prisma/client";
import { apagarImagem, urlDeImagemValida } from "@/lib/imagens";
import { estaDisponivel } from "@/lib/prestadores";
import type { DadosAnuncio } from "./esquemas";

type Resultado = { ok: true; id: string } | { ok: false; semPerfil: true } | { ok: false; campo: string; erro: string };

const ERRO_FOTOS = "Uma das fotos não foi enviada direito. Mande de novo.";

async function validar(prisma: PrismaClient, prestadorId: string, dados: DadosAnuncio) {
  const perfil = await prisma.perfilPrestador.findUnique({ where: { userId: prestadorId } });
  if (!perfil) return { erro: { ok: false as const, semPerfil: true as const } };
  if (!perfil.categorias.includes(dados.categoria)) {
    return {
      erro: {
        ok: false as const,
        campo: "categoria",
        erro: "Essa categoria não está no seu perfil. Mude em 'Mudar o que eu faço'.",
      },
    };
  }
  if (dados.fotos.some((url) => !urlDeImagemValida(url, "anuncios", prestadorId))) {
    return { erro: { ok: false as const, campo: "fotos", erro: ERRO_FOTOS } };
  }
  return { perfil };
}

export async function criarAnuncio(prisma: PrismaClient, prestadorId: string, dados: DadosAnuncio): Promise<Resultado> {
  const { perfil, erro } = await validar(prisma, prestadorId, dados);
  if (erro) return erro;

  const servico = await prisma.servico.create({
    data: {
      titulo: dados.titulo,
      categoria: dados.categoria,
      descricao: dados.descricao,
      // O modelo do back end exige preço: 0 aparece como "Preço a combinar"
      preco: dados.preco ?? 0,
      fotos: dados.fotos,
      latitude: perfil.latitude,
      longitude: perfil.longitude,
      prestadorId,
    },
    select: { id: true },
  });
  // Mesmo ponto geográfico que a rota antiga /api/servicos grava, para a busca por raio dela continuar funcionando
  await prisma.$executeRaw`
    UPDATE "Servico" SET localizacao = ST_SetSRID(ST_MakePoint(${perfil.longitude}, ${perfil.latitude}), 4326)
    WHERE id = ${servico.id}
  `;
  return { ok: true, id: servico.id };
}

export async function editarAnuncio(
  prisma: PrismaClient,
  id: string,
  prestadorId: string,
  dados: DadosAnuncio | { ativo: boolean }
): Promise<Resultado> {
  const atual = await prisma.servico.findFirst({ where: { id, prestadorId } });
  if (!atual) return { ok: false, campo: "id", erro: "Anúncio não encontrado." };

  if ("ativo" in dados && Object.keys(dados).length === 1) {
    await prisma.servico.update({ where: { id }, data: { ativo: dados.ativo } });
    return { ok: true, id };
  }

  const completo = dados as DadosAnuncio;
  const { erro } = await validar(prisma, prestadorId, completo);
  if (erro) return erro;

  await prisma.servico.update({
    where: { id },
    data: {
      titulo: completo.titulo,
      categoria: completo.categoria,
      descricao: completo.descricao,
      preco: completo.preco ?? 0,
      fotos: completo.fotos,
    },
  });
  // Fotos que saíram do anúncio são apagadas do disco
  await Promise.all(atual.fotos.filter((f) => !completo.fotos.includes(f)).map((f) => apagarImagem(f, prestadorId)));
  return { ok: true, id };
}

export async function meusAnuncios(prisma: PrismaClient, prestadorId: string) {
  return prisma.servico.findMany({
    where: { prestadorId },
    orderBy: [{ ativo: "desc" }, { createdAt: "desc" }],
    select: { id: true, titulo: true, categoria: true, descricao: true, preco: true, fotos: true, ativo: true },
  });
}

/** Anúncio para qualquer pessoa ver. Nunca inclui email ou telefone. */
export async function anuncioPublico(prisma: PrismaClient, id: string, agora = new Date()) {
  const s = await prisma.servico.findFirst({
    where: { id, ativo: true },
    select: {
      id: true,
      titulo: true,
      categoria: true,
      descricao: true,
      preco: true,
      fotos: true,
      prestador: {
        select: {
          id: true,
          nome: true,
          image: true,
          perfilPrestador: { select: { bairro: true, cidade: true, disponivel: true, disponivelAte: true } },
        },
      },
    },
  });
  if (!s) return null;
  const perfil = s.prestador.perfilPrestador;
  return {
    id: s.id,
    titulo: s.titulo,
    categoria: s.categoria,
    descricao: s.descricao,
    preco: s.preco,
    fotos: s.fotos,
    prestador: {
      id: s.prestador.id,
      nome: s.prestador.nome ?? "Prestador",
      foto: s.prestador.image,
      bairro: perfil?.bairro ?? null,
      cidade: perfil?.cidade ?? null,
      disponivelAgora: perfil ? estaDisponivel(perfil, agora) : false,
    },
  };
}
